// ============================================================================
// Kredora — verify-record Edge Function (hash chain v2)
// ============================================================================
// POST { recordId } or { latestForUser: true } ->
//   checks that a problem_submissions row still fits an unbroken, correctly
//   ordered v2 hash chain. With latestForUser, the row is the caller's newest
//   accepted, chained record (resolved from the Supabase Auth JWT).
//
// DETECTS (recomputing every link, oldest -> newest):
//   - modified records: any chained field (code hash, verdict, test summary,
//     counts, language, user, problem, DB-stamped submitted_at) edited after
//     the fact no longer reproduces the stored record_hash
//   - broken previous-hash links: a record's previous_record_hash does not
//     match the hash built so far (deletion or spliced-in fake)
//   - incorrect hashes: stored record_hash was never minted by run-submission
//     (or the row was altered and re-hashed inconsistently)
//   - missing records: a removed chain row breaks every later link
//   - invalid chain ordering: links that skip backwards, restart mid-history,
//     or attach to a foreign chain fail the walk
//
// WHAT THIS PROVES (and what it does NOT — do not oversell in UI copy):
//   "valid" means the record's history is intact as recorded. It does NOT
//   prove the solution is good, that the grader wasn't compromised at submit
//   time, or that a DBA/service-role holder did not rewrite history
//   consistently and re-mint every hash. It is a tamper DETECTOR, not
//   "cryptographic proof" and not immutability.
//
// PRIVACY: responses expose verification information only (ids, verdict,
// counts, hashes, timestamp) — never the user's source code.
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
  passed_tests: number;
  total_tests: number;
  code_hash: string | null;
  tests_summary: string | null;
  record_version: number;
  record_hash: string | null;
  previous_record_hash: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function fail(message: string, status = 400) {
  return json({ ok: false, error: message }, status);
}

async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Recompute record_hash (v2) for a row. Must match run-submission's chain
// stamp byte for byte: same keys, same sorted order, DB-stamped submitted_at.
async function computeHash(row: {
  user_id: string;
  problem_id: string;
  language: string;
  status: string;
  submitted_at: string;
  passed_tests: number;
  total_tests: number;
  code_hash: string | null;
  tests_summary: string | null;
  previous_record_hash: string | null;
}): Promise<string> {
  const payload = JSON.stringify({
    code_hash: row.code_hash ?? "",
    language: row.language,
    passed_tests: row.passed_tests,
    previous_record_hash: row.previous_record_hash ?? "",
    problem_id: row.problem_id,
    status: row.status,
    submitted_at: row.submitted_at,
    tests_summary: row.tests_summary ?? "",
    total_tests: row.total_tests,
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
      .eq("record_version", 2)
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
    .select("id, user_id, problem_id, language, code, status, submitted_at, passed_tests, total_tests, code_hash, tests_summary, record_version, record_hash, previous_record_hash")
    .eq("id", recordId)
    .maybeSingle<SubRow>();
  if (targetErr) return fail("Lookup failed: " + targetErr.message, 500);
  if (!target) return fail("Record not found", 404);

  // Only accepted, user-attributed v2 rows carry a verifiable chain.
  if (target.status !== "accepted" || !target.user_id || !target.record_hash) {
    return json({
      ok: true,
      valid: false,
      checkable: false,
      reason: target.status !== "accepted"
        ? "Only accepted submissions are hash-chained; this record has no chain to verify."
        : "This record has no hash chain.",
      recordId,
    });
  }
  if ((target.record_version ?? 1) < 2) {
    return json({
      ok: true,
      valid: false,
      checkable: false,
      reason: "This record predates the v2 evidence chain and cannot be verified.",
      recordId,
    });
  }

  // Load the user's full accepted v2 history, oldest -> newest, and walk the
  // chain forward. Every accepted row must continue the one chain built so
  // far — restarts, skips, and foreign links are invalid ordering.
  const { data: history, error: histErr } = await sb
    .from("problem_submissions")
    .select("id, user_id, problem_id, language, code, status, submitted_at, passed_tests, total_tests, code_hash, tests_summary, record_version, record_hash, previous_record_hash")
    .eq("user_id", target.user_id)
    .eq("status", "accepted")
    .eq("record_version", 2)
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

  const seenRecordHashes = new Set<string>();
  let chainHash = ""; // root's expected previous_record_hash
  let brokenAt: string | null = null;
  let failureReason: string | null = null;
  let targetValid = false;

  for (const row of chainRows) {
    // (1) Link integrity: the row must claim the previous hash the chain has
    // built so far. Deletions, spliced-in fakes, restarts mid-history, and
    // skips backwards are all caught here.
    if ((row.previous_record_hash ?? "") !== chainHash) {
      brokenAt = row.id;
      failureReason = (row.previous_record_hash ?? "") === ""
        ? "Chain ordering invalid: a record restarts the chain mid-history."
        : "Chain link broken: a record's previous-hash does not match the chain built so far (record deleted, reordered, or spliced in).";
      break;
    }

    // (2) Duplicate hash: two rows claiming the same record_hash is invalid
    // ordering/linkage.
    if (seenRecordHashes.has(row.record_hash as string)) {
      brokenAt = row.id;
      failureReason = "Chain ordering invalid: the same record hash appears twice.";
      break;
    }
    seenRecordHashes.add(row.record_hash as string);

    // (3) Code-pin integrity: the stored code must still hash to the pinned
    // code_hash. Catches source edits even if every hash were re-minted.
    const actualCodeHash = await sha256Hex(row.code ?? "");
    if (actualCodeHash !== (row.code_hash ?? "")) {
      brokenAt = row.id;
      failureReason = "Record modified: the stored source code no longer matches its pinned code hash.";
      break;
    }

    // (4) Content integrity: recompute the row's own hash from its pinned
    // fields (DB-stamped timestamp, verdict, counts, summary, links).
    const recomputed = await computeHash({
      user_id: row.user_id as string,
      problem_id: row.problem_id,
      language: row.language,
      status: row.status,
      submitted_at: row.submitted_at,
      passed_tests: row.passed_tests,
      total_tests: row.total_tests,
      code_hash: row.code_hash,
      tests_summary: row.tests_summary,
      previous_record_hash: row.previous_record_hash,
    });
    if (recomputed !== row.record_hash) {
      brokenAt = row.id;
      failureReason = row.id === recordId
        ? "Record modified: stored hash no longer matches its contents."
        : "An earlier record was modified or deleted; this record's lineage can no longer be verified.";
      break;
    }

    // (5) Advance the chain.
    chainHash = row.record_hash as string;
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
      reason: failureReason ?? "Chain verification failed.",
      brokenAt,
      recordId,
    });
  }

  return json({
    ok: true,
    valid: targetValid,
    checkable: true,
    // Verification information only — no source code, no test payloads.
    record: {
      id: target.id,
      problemId: target.problem_id,
      language: target.language,
      status: target.status,
      submittedAt: target.submitted_at,
      passedTests: target.passed_tests,
      totalTests: target.total_tests,
      testsSummary: target.tests_summary,
      codeHash: target.code_hash,
      previousRecordHash: target.previous_record_hash,
      recordHash: target.record_hash,
    },
    // Honest framing — clients must not upgrade this wording to "proof".
    note: "Hash chain check: detects edits, deletions, or reordering in the recorded history. It is not a guarantee of correctness or immutability.",
  });
});
