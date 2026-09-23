// ============================================================================
// Kredora — verify-record Edge Function
// ============================================================================
// POST { recordId } or { latestForUser: true } ->
//   checks that a problem_submissions row still fits an unbroken hash chain.
//   With latestForUser, the row is the caller's newest accepted, chained
//   record (resolved from their Supabase Auth JWT, service-role read).
//
// WHAT THIS PROVES (and what it does NOT — do not oversell in UI copy):
//  - "valid" means: this row's stored hash still matches a recomputation of
//    sha256(canonical({user_id, problem_id, language, code, timestamp,
//    previous_record_hash})), AND every accepted ancestor row it chains
//    through recomputes cleanly back to a chain root, AND every accepted row
//    of that user interleaved by time belongs to the same chain.
//    I.e. nothing touching this record's history has been silently edited
//    or deleted after the fact.
//  - It does NOT prove the solution is good, that the grader wasn't
//    compromised at submit time, or that a DBA/service-role holder did not
//    rewrite history consistently and re-mint every hash. It is a tamper
//    DETECTOR, not "cryptographic proof" and not immutability.
// ============================================================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A user's accepted-row chain could grow large; walk at most this many links.
const MAX_CHAIN_WALK = 500;

interface SubRow {
  id: string;
  user_id: string | null;
  problem_id: string;
  language: string;
  code: string | null;
  status: string;
  submitted_at: string;
  record_hash: string | null;
  previous_record_hash: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function fail(message: string, status = 400) {
  return json({ ok: false, error: message }, status);
}

// Recompute record_hash for a row. Must match run-submission byte for byte:
// same key order (sorted), same timestamp format.
async function computeHash(row: {
  user_id: string;
  problem_id: string;
  language: string;
  code: string;
  timestamp: string;
  previous_record_hash: string;
}): Promise<string> {
  const payload = JSON.stringify({
    code: row.code,
    language: row.language,
    previous_record_hash: row.previous_record_hash,
    problem_id: row.problem_id,
    timestamp: row.timestamp,
    user_id: row.user_id,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("POST only", 405);

  let body: { recordId?: string; latestForUser?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  let sb: SupabaseClient;
  try {
    sb = serviceClient();
  } catch (e) {
    return fail((e as Error).message, 500);
  }

  // Resolve which record to verify. Either an explicit recordId, or the
  // caller's newest accepted chained record (requires a valid Auth JWT so
  // one user can never verify against another user's history). When
  // latestForUser is set, the JWT is mandatory.
  let recordId = String(body.recordId ?? "").trim();
  if (!recordId && body.latestForUser) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ") || authHeader.length <= 20) {
      return fail("Sign in to verify your evidence chain.", 401);
    }
    let userId: string | null = null;
    try {
      const { data } = await sb.auth.getUser(authHeader.slice(7));
      userId = data?.user?.id ?? null;
    } catch {
      userId = null;
    }
    if (!userId) return fail("Invalid or expired session.", 401);

    const { data: latest, error: latestErr } = await sb
      .from("problem_submissions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "accepted")
      .not("record_hash", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (latestErr) return fail("Lookup failed: " + latestErr.message, 500);
    if (!latest) {
      return json({
        ok: true,
        valid: null,
        checkable: false,
        reason: "No server-graded submissions exist for this profile yet.",
      });
    }
    recordId = latest.id;
  }
  if (!recordId) return fail("recordId is required");

  // Load the row in question (service role — clients cannot select this table).
  const { data: target, error: targetErr } = await sb
    .from("problem_submissions")
    .select("id, user_id, problem_id, language, code, status, submitted_at, record_hash, previous_record_hash")
    .eq("id", recordId)
    .maybeSingle<SubRow>();
  if (targetErr) return fail("Lookup failed: " + targetErr.message, 500);
  if (!target) return fail("Record not found", 404);

  // Only accepted, user-attributed rows carry a chain.
  if (target.status !== "accepted" || !target.user_id || !target.record_hash) {
    return json({
      ok: true,
      valid: false,
      checkable: false,
      reason: target.status !== "accepted"
        ? "Only accepted submissions are hash-chained; this record has no chain to verify."
        : "This record has no hash chain (anonymous submission).",
      recordId,
    });
  }

  // Load the user's full accepted history, oldest -> newest, and walk the
  // chain forward. Every accepted row must either start a new chain (root:
  // previous_record_hash = "") or continue the one built so far.
  const { data: history, error: histErr } = await sb
    .from("problem_submissions")
    .select("id, user_id, problem_id, language, code, status, submitted_at, record_hash, previous_record_hash")
    .eq("user_id", target.user_id)
    .eq("status", "accepted")
    .not("record_hash", "is", null)
    .order("submitted_at", { ascending: true })
    .limit(MAX_CHAIN_WALK + 1);
  if (histErr) return fail("History load failed: " + histErr.message, 500);

  const chainRows = (history ?? []) as SubRow[];
  if (chainRows.length > MAX_CHAIN_WALK) {
    // Very old rows beyond the walk limit: report honestly that we checked
    // a bounded window rather than claiming validity we can't establish.
    return json({
      ok: true,
      valid: null,
      checkable: true,
      reason: `User has more than ${MAX_CHAIN_WALK} accepted records; chain walk is bounded. Verification inconclusive for this row.`,
      recordId,
    });
  }

  let chainHash = ""; // root's expected previous_record_hash
  let brokenAt: string | null = null;
  let targetValid = false;

  for (const row of chainRows) {
    // (1) Link integrity: the row must claim the previous hash the chain has
    // built so far. Deletions inside the chain or spliced-in fakes fail here.
    if ((row.previous_record_hash ?? "") !== chainHash) {
      brokenAt = row.id;
      if (row.id === recordId) {
        targetValid = false;
        break;
      }
      // A broken link before the target poisons everything downstream of it
      // — but a later row could be a legitimate NEW chain root only if its
      // stored previous is "". Treat anything else as invalid lineage.
      if ((row.previous_record_hash ?? "") !== "") {
        if (chainRows.some((r) => r.id === recordId) && chainRows.indexOf(row) < chainRows.findIndex((r) => r.id === recordId)) {
          // target is downstream of the break -> invalid
          break;
        }
      }
      continue;
    }

    // (2) Content integrity: recompute the row's own hash from its fields.
    const recomputed = await computeHash({
      user_id: row.user_id as string,
      problem_id: row.problem_id,
      language: row.language,
      code: row.code ?? "",
      timestamp: row.submitted_at,
      previous_record_hash: row.previous_record_hash ?? "",
    });
    if (recomputed !== row.record_hash) {
      brokenAt = row.id;
      if (row.id === recordId) {
        targetValid = false;
        break;
      }
      // Ancestor edited -> every later link inherits the corruption.
      break;
    }

    // (3) Advance the chain.
    chainHash = row.record_hash;
    if (row.id === recordId) {
      targetValid = true;
      break;
    }
  }

  if (brokenAt && !targetValid) {
    return json({
      ok: true,
      valid: false,
      checkable: true,
      reason: brokenAt === recordId
        ? "This record's stored hash no longer matches its contents or its chain link."
        : "An earlier record in this user's chain was modified or deleted; this record's lineage can no longer be verified.",
      brokenAt,
      recordId,
    });
  }

  return json({
    ok: true,
    valid: targetValid,
    checkable: true,
    recordId,
    recordHash: target.record_hash,
    // Honest framing — clients must not upgrade this wording to "proof".
    note: "Hash chain check: detects edits or deletions in the recorded history. It is not a guarantee of correctness or immutability.",
  });
});
