// ============================================================================
// Kredora — run-submission Edge Function (THE authoritative submission path)
// ============================================================================
// Browser → authenticated Supabase session (Bearer JWT) → this function →
// server-side validation → hidden tests (service-role) → Judge0 → grading →
// database (service-role insert) → evidence. The verdict, counts, runtime,
// memory and status are ALL computed here — nothing from the browser is
// trusted. Anonymous (no JWT) requests are rejected 401.
//
// Receives { problemId, language, code, fnName }, validates against the
// server-side catalog allowlist, runs the code against the HIDDEN test cases
// stored in public.problem_tests (service-role read, invisible to clients),
// and writes an append-only row into public.problem_submissions
// (service-role insert — clients have no INSERT policy).
//
// Sandbox: Judge0 CE (self-hosted OR RapidAPI-hosted — configure via env).
//   JUDGE0_URL   e.g. https://judge0-ce.p.rapidapi.com  or http://your-host:2358
//   JUDGE0_KEY   RapidAPI key (omit for unauthenticated self-hosted)
//   JUDGE0_HOST  RapidAPI host header (RapidAPI only)
//   Optional: JUDGE0_AUTH_HEADER to override the auth header name
//
// Deploy:
//   supabase secrets set JUDGE0_URL=... JUDGE0_KEY=...
//   supabase functions deploy run-submission
//
// Languages: JavaScript (Node 18), Python 3.10, Java (OpenJDK 13).
// All harnesses receive stdin = JSON array of positional args, and print one
// "__KREDORA_RESULT__:{...}" line with { ok, value, logs } or { ok, error }.
// ============================================================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// WHAT THE HASH CHAIN DOES AND DOES NOT PROTECT AGAINST
// ============================================================================
// On every ACCEPTED submission this function computes (v2 chain)
//   record_hash = sha256(canonical-json({code_hash, language, passed_tests,
//     previous_record_hash, problem_id, status, submitted_at, tests_summary,
//     total_tests, user_id}))
// where submitted_at is the DATABASE-stamped timestamp read back from the
// inserted row, code_hash = sha256(source), tests_summary is the compact
// pass/fail map, and previous_record_hash is the record_hash of the user's
// previous accepted row ("" for the first). The row is written in TWO phases
// (status 'submitted' -> flip to 'accepted' together with the hash in one
// UPDATE), so an accepted row without a complete chain cannot exist at any
// instant; schema.sql enforces both invariants at the storage layer.
//
// DETECTS (tamper-EVIDENT):
//  - editing any chained field of an accepted row (code, user, problem,
//    timestamp...) -> recomputed hash no longer matches record_hash
//  - deleting an accepted row inside a chain -> the next row's stored
//    previous_record_hash points at a hash that no longer terminates any
//    verifiable chain, and every later link fails recomputation
//  - inserting a fake accepted row after the fact -> its previous_record_hash
//    does not continue a real chain (or its hash was never computed under
//    this scheme and the chain walk fails)
//
// DOES NOT PROTECT AGAINST:
//  - the service role key holder / DBA rewriting the entire chain
//    consistently (they can recompute all hashes and delete history) —
//    mitigated only by keeping hashes mirrored OFF the database (an
//    auditor/export could store every record_hash externally)
//  - a legitimate user submitting wrong-but-passing code: the chain pins
//    what was RECORDED, not whether the solution is good
//  - the grading sandbox itself being compromised
//  - denial-of-service or history truncation (deleting everything)
//
// Therefore: never describe this in the UI as "cryptographic proof" or
// "immutable". Honest framing: "each record is hash-chained to the previous
// one, so silent edits or deletions can be detected" — an integrity CHECK,
// not a guarantee.
// ============================================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- Limits ----------------------------------------------------------------
const MAX_CODE_BYTES = 64 * 1024; // 64 KB source limit
// ---- Rate limiting configuration (never hardcoded at call sites) ------------
// Resolution order inside the atomic DB limiter: the explicit args passed
// from here -> the per-kind row in public.submission_rate_limit_config ->
// built-in SQL fallbacks. Tune live via the config table, or per-deploy via
// these Edge Function secrets.
const RATE_LIMIT_USER = Math.max(1, Number(Deno.env.get("RATE_LIMIT_USER") ?? "20"));
const RATE_WINDOW_S_USER = Math.max(1, Number(Deno.env.get("RATE_WINDOW_S_USER") ?? "60"));
const RATE_LIMIT_IP = Math.max(1, Number(Deno.env.get("RATE_LIMIT_IP") ?? "60"));
const RATE_WINDOW_S_IP = Math.max(1, Number(Deno.env.get("RATE_WINDOW_S_IP") ?? "60"));
const MAX_TESTS_PER_RUN = 20; // hard cap on Judge0 batch size
const POLL_TIMEOUT_MS = 25_000;

// ---- Problem validation (DB is authoritative) -------------------------------
// The client's catalog is NOT trusted: problem existence, difficulty and
// points are validated against the public.problems table (service-role read)
// in validateProblem() below. Add new problems there AND seed their hidden
// tests via scripts/generate-seed-tests.mjs.

const LANGS: Record<string, { judge0Id: number; cpu: number }> = {
  javascript: { judge0Id: 93, cpu: 5 }, // Node.js 18.15.0
  python: { judge0Id: 71, cpu: 5 }, // Python 3.10.0
  java: { judge0Id: 62, cpu: 10 }, // OpenJDK 13.0.1 (incl. compile time)
};

const MARKER = "__KREDORA_RESULT__:";
const FN_NAME_RE = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;

interface TestCaseRow {
  kind: string;
  input: { input?: unknown[]; inputDisplay?: string } | unknown[];
  expected: unknown;
}

interface TestOutcome {
  index: number;
  hidden: boolean;
  passed: boolean;
  status: string; // Accepted | Wrong Answer | Runtime Error | Time Limit Exceeded | Compilation Error
  runtimeMs: number;
  memoryMb: number;
  error?: string;
  inputDisplay?: string; // sample tests only
  userOutputDisplay?: string; // sample tests only
  expectedDisplay?: string; // sample tests only
  logs?: string[]; // sample tests only
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function fail(message: string, status = 400) {
  return json({ ok: false, error: message }, status);
}

// Canonical JSON comparison — mirrors the client's deepEqual semantics
// (arrays order-sensitive, object keys order-insensitive).
function canon(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return "{" + Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(",") + "}";
  }
  return JSON.stringify(v);
}

async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface ProblemRow {
  id: string;
  difficulty: string;
  points: number;
}

// The database is the authoritative problem record: an id must exist in
// public.problems with active = true to be gradeable at all. Returns null
// when the problem is unknown/retired so the caller rejects before any work.
async function validateProblem(sb: SupabaseClient, problemId: string): Promise<ProblemRow | null> {
  const { data, error } = await sb
    .from("problems")
    .select("id, difficulty, points")
    .eq("id", problemId)
    .eq("active", true)
    .maybeSingle<ProblemRow>();
  if (error) {
    console.error("problem lookup failed:", error.message);
    return null;
  }
  return data ?? null;
}

// ---- Language harnesses ------------------------------------------------------
// stdin is a JSON array of positional args. Each harness prints exactly one
// marker line: {"ok":true,"value":...,"logs":[...]} or {"ok":false,"error":...}.
// All other stdout lines are user logs (captured, never parsed).

function jsHarness(fn: string, argsJson: string): string {
  return `${fn};
const __args = ${argsJson};
const __logs = [];
const __origLog = console.log.bind(console);
console.log = console.info = console.warn = console.error = (...a) => { __logs.push(a.map(x => String(x)).join(" ")); };
try {
  const __fn = typeof ${fn} === "function" ? ${fn} : null;
  if (!__fn) throw new Error("Function ${fn} is not defined");
  const __result = __fn(...__args);
  __origLog(${JSON.stringify(MARKER)} + JSON.stringify({ ok: true, value: __result === undefined ? null : __result, logs: __logs }));
} catch (__e) {
  __origLog(${JSON.stringify(MARKER)} + JSON.stringify({ ok: false, error: String((__e && __e.message) || __e), logs: __logs }));
}
`;
}

function pyHarness(fn: string, argsJson: string): string {
  return `import sys, json as __json, builtins
${fn}
__args = __json.loads(sys.stdin.read() or "[]")
__logs = []
def __log(*a):
    __logs.append(" ".join(str(x) for x in a))
builtins.print = __log
try:
    __fn = globals()["${fn}"]
    __result = __fn(*__args)
    sys.stdout.write("\\n${MARKER}" + __json.dumps({"ok": True, "value": __result, "logs": __logs}, default=str) + "\\n")
except Exception as __e:
    sys.stdout.write("\\n${MARKER}" + __json.dumps({"ok": False, "error": str(__e), "logs": __logs}) + "\\n")
`;
}

// Java: the user code defines `class Solution { public static <T> fn(...) }`
// in the same source file as our `public class Main`. Main reads the args
// array from stdin (minimal JSON parser, no external deps), invokes the
// method reflectively with primitive/array coercion, and prints the marker.
function javaHarness(fn: string, argsJson: string): string {
  const marker = MARKER;
  return `${fn}

public class Main {
  static int pos;
  static String src;
  static Object parse(String s) { src = s; pos = 0; Object v = value(); return v; }
  static void skip() { while (pos < src.length() && Character.isWhitespace(src.charAt(pos))) pos++; }
  static Object value() {
    skip();
    char c = src.charAt(pos);
    if (c == '{') return obj();
    if (c == '[') return arr();
    if (c == '"') return str();
    if (c == 't') { pos += 4; return Boolean.TRUE; }
    if (c == 'f') { pos += 5; return Boolean.FALSE; }
    if (c == 'n') { pos += 4; return null; }
    int st = pos;
    while (pos < src.length() && "-+.eE0123456789".indexOf(src.charAt(pos)) >= 0) pos++;
    return Double.parseDouble(src.substring(st, pos));
  }
  static java.util.List<Object> arr() {
    java.util.List<Object> l = new java.util.ArrayList<>(); pos++;
    skip(); if (pos < src.length() && src.charAt(pos) == ']') { pos++; return l; }
    while (true) { l.add(value()); skip(); char c = src.charAt(pos); pos++; if (c == ']') return l; }
  }
  static java.util.LinkedHashMap<String, Object> obj() {
    java.util.LinkedHashMap<String, Object> m = new java.util.LinkedHashMap<>(); pos++;
    skip(); if (pos < src.length() && src.charAt(pos) == '}') { pos++; return m; }
    while (true) { skip(); String k = str(); skip(); pos++; m.put(k, value()); skip();
      char c = src.charAt(pos); pos++; if (c == '}') return m; }
  }
  static String str() {
    StringBuilder sb = new StringBuilder(); pos++;
    while (src.charAt(pos) != '"') {
      char c = src.charAt(pos);
      if (c == '\\\\') { pos++; sb.append(src.charAt(pos)); }
      else sb.append(c);
      pos++;
    }
    pos++; return sb.toString();
  }
  static String toJson(Object o) {
    if (o == null) return "null";
    if (o instanceof String s) return "\\"" + s.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"";
    if (o instanceof Double || o instanceof Float) {
      double d = ((Number) o).doubleValue();
      if (d == Math.floor(d) && !Double.isInfinite(d) && Math.abs(d) < 1e15) return String.valueOf((long) d);
      return String.valueOf(d);
    }
    if (o instanceof Number || o instanceof Boolean) return String.valueOf(o);
    if (o.getClass().isArray()) {
      StringBuilder sb = new StringBuilder("[");
      int n = java.lang.reflect.Array.getLength(o);
      for (int i = 0; i < n; i++) { if (i > 0) sb.append(","); sb.append(toJson(java.lang.reflect.Array.get(o, i))); }
      return sb.append("]").toString();
    }
    if (o instanceof java.util.List) {
      StringBuilder sb = new StringBuilder("[");
      java.util.List<?> l = (java.util.List<?>) o;
      for (int i = 0; i < l.size(); i++) { if (i > 0) sb.append(","); sb.append(toJson(l.get(i))); }
      return sb.append("]").toString();
    }
    if (o instanceof java.util.Map) {
      java.util.TreeMap<?, ?> t = new java.util.TreeMap<>((java.util.Map<?, ?>) o);
      StringBuilder sb = new StringBuilder("{");
      boolean first = true;
      for (java.util.Map.Entry<?, ?> e : t.entrySet()) {
        if (!first) sb.append(","); first = false;
        sb.append(toJson(String.valueOf(e.getKey()))).append(":").append(toJson(e.getValue()));
      }
      return sb.append("}").toString();
    }
    return "\\"" + String.valueOf(o).replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"";
  }
  static Object coerce(Object v, Class<?> t) {
    if (v == null) return null;
    if (t == int.class) return (int) Math.round(((Number) v).doubleValue());
    if (t == long.class) return (long) Math.round(((Number) v).doubleValue());
    if (t == double.class) return ((Number) v).doubleValue();
    if (t == float.class) return (float) ((Number) v).doubleValue();
    if (t == String.class) return String.valueOf(v);
    if (t.isArray()) {
      java.util.List<?> l = (java.util.List<?>) v;
      Object a = java.lang.reflect.Array.newInstance(t.getComponentType(), l.size());
      for (int i = 0; i < l.size(); i++) java.lang.reflect.Array.set(a, i, coerce(l.get(i), t.getComponentType()));
      return a;
    }
    return v;
  }
  public static void main(String[] args) throws Exception {
    java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder(); String line;
    while ((line = br.readLine()) != null) sb.append(line.trim());
    java.util.List<Object> payload = (java.util.List<Object>) parse(sb.toString());
    java.util.List<String> logs = new java.util.ArrayList<>();
    java.io.PrintStream orig = System.out;
    System.setOut(new java.io.PrintStream(java.io.OutputStream.nullOutputStream()));
    try {
      Class<?> cls = Class.forName("Solution");
      java.lang.reflect.Method target = null;
      for (java.lang.reflect.Method m : cls.getDeclaredMethods()) {
        if (m.getName().equals("${fn}") && m.getParameterCount() == payload.size()) { target = m; break; }
      }
      if (target == null) throw new NoSuchMethodException("${fn} not found in Solution");
      Object[] argv = new Object[payload.size()];
      for (int i = 0; i < payload.size(); i++) argv[i] = coerce(payload.get(i), target.getParameterTypes()[i]);
      Object result = target.invoke(null, argv);
      System.setOut(orig);
      System.out.println("${marker}" + "{\\"ok\\":true,\\"value\\":" + toJson(result) + ",\\"logs\\":" + toJson(logs) + "}");
    } catch (Exception e) {
      System.setOut(orig);
      String msg = e instanceof java.lang.reflect.InvocationTargetException && e.getCause() != null ? String.valueOf(e.getCause()) : e.toString();
      System.out.println("${marker}" + "{\\"ok\\":false,\\"error\\":" + toJson(msg) + ",\\"logs\\":" + toJson(logs) + "}");
    }
  }
}
`;
}

// ---- Supabase service client -------------------------------------------------
function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---- Rate limiting (atomic, fail-closed, DB-clock sliding window) -----------
// consume_rate_limit() (see supabase/schema.sql) increments AND checks in ONE
// statement against the DATABASE clock — safe under concurrent requests and
// immune to client-supplied timestamps or counters (it has no parameters for
// them). It is executable by the service role only, so a browser cannot call,
// reset, or probe it. ANY failure here throws: callers must fail CLOSED — a
// broken limiter must never degrade into unlimited submissions.
interface RateDecision {
  allowed: boolean;
  currentHits: number;
  limitValue: number;
  retryAfterS: number;
}

async function consumeRateLimit(
  sb: SupabaseClient,
  identity: string,
  kind: "user" | "ip",
  limit: number,
  windowS: number,
): Promise<RateDecision> {
  const { data, error } = await sb.rpc("consume_rate_limit", {
    p_identity: identity,
    p_kind: kind,
    p_limit: limit,
    p_window_s: windowS,
  });
  if (error) {
    // Fail CLOSED: no admission without a working limiter.
    throw new Error(`rate limiter unavailable: ${error.message}`);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    currentHits: Number(row?.current_hits ?? 0),
    limitValue: Number(row?.limit_value ?? limit),
    retryAfterS: Math.max(1, Number(row?.retry_after_s ?? windowS)),
  };
}

// ---- Judge0 ------------------------------------------------------------------
interface Judge0Sub {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null; // KB
}

function judge0Headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const key = Deno.env.get("JUDGE0_KEY") ?? "";
  const host = Deno.env.get("JUDGE0_HOST") ?? "";
  const name = Deno.env.get("JUDGE0_AUTH_HEADER") ?? "X-RapidAPI-Key";
  if (key) h[name] = key;
  if (host) h["X-RapidAPI-Host"] = host;
  return h;
}

async function judge0RunBatch(submissions: unknown[]): Promise<Judge0Sub[]> {
  const base = (Deno.env.get("JUDGE0_URL") ?? "").replace(/\/$/, "");
  if (!base) throw new Error("Sandbox not configured (JUDGE0_URL missing)");

  const postRes = await fetch(`${base}/submissions/batch?base64_encoded=false`, {
    method: "POST",
    headers: judge0Headers(),
    body: JSON.stringify({ submissions }),
  });
  if (!postRes.ok) throw new Error(`Judge0 submit failed: ${postRes.status}`);
  const tokens: { token: string }[] = await postRes.json();

  const fields = "stdout,stderr,compile_output,status,time,memory";
  const started = Date.now();
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 1500));
    const getRes = await fetch(
      `${base}/submissions/batch?tokens=${tokens.map((t) => t.token).join(",")}&base64_encoded=false&fields=${fields}`,
      { headers: judge0Headers() },
    );
    if (!getRes.ok) throw new Error(`Judge0 poll failed: ${getRes.status}`);
    const body = await getRes.json();
    const subs: Judge0Sub[] = (body.submissions ?? []).map((s: { submission?: Judge0Sub }) => s.submission ?? s);
    if (subs.length > 0 && subs.every((s) => s && s.status && s.status.id > 2)) return subs;
  }
  throw new Error("Judge0 polling timed out");
}

// ---- Main ---------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("POST only", 405);

  let body: { problemId?: string; language?: string; code?: string; fnName?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const problemId = String(body.problemId ?? "").trim();
  const language = String(body.language ?? "").trim().toLowerCase();
  const code = String(body.code ?? "");
  const fnName = String(body.fnName ?? "").trim();

  if (!problemId) return fail("problemId is required");
  if (!code.trim()) return fail("code is required");
  if (!FN_NAME_RE.test(fnName)) return fail("fnName must be a valid identifier");

  const codeBytes = new TextEncoder().encode(code).length;
  if (codeBytes > MAX_CODE_BYTES) return fail(`Code too large (${codeBytes} bytes; limit ${MAX_CODE_BYTES})`, 413);

  let sb: SupabaseClient;
  try {
    sb = serviceClient();
  } catch (e) {
    return fail((e as Error).message, 500);
  }

  // Identity: derived ONLY from the Supabase Auth JWT, server-side. Body
  // fields (userId, user_id, email...) are never trusted. Anonymous requests
  // are rejected — there is no client-IP fallback identity.
  let userId: string;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ") || authHeader.length <= 20) {
    return fail("Sign in to submit: submissions require an authenticated Supabase session.", 401);
  }
  try {
    const { data: userData, error: userErr } = await sb.auth.getUser(authHeader.slice(7));
    if (userErr || !userData?.user) {
      return fail("Invalid or expired session.", 401);
    }
    userId = userData.user.id;
  } catch {
    return fail("Invalid or expired session.", 401);
  }

  // Two independent layers, both atomic and fail-closed:
  //   1. per authenticated user (primary — JWT-derived identity, so changing
  //      any browser storage value cannot influence it)
  //   2. per client IP (secondary — many accounts or token replay from one
  //      host). Proxy headers are advisory for limiting ONLY; they never
  //      identify the submitter.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";

  let userRate: RateDecision;
  let ipRate: RateDecision;
  try {
    userRate = await consumeRateLimit(sb, `user:${userId}`, "user", RATE_LIMIT_USER, RATE_WINDOW_S_USER);
    ipRate = await consumeRateLimit(sb, `ip:${ip}`, "ip", RATE_LIMIT_IP, RATE_WINDOW_S_IP);
  } catch (e) {
    console.error("rate limiter failure — failing closed:", (e as Error).message);
    return fail("Submission temporarily unavailable; please retry shortly.", 503);
  }

  if (!userRate.allowed || !ipRate.allowed) {
    const exceeded = !userRate.allowed ? userRate : ipRate;
    const scope = !userRate.allowed ? "user" : "ip";
    console.warn(`rate limit hit (${scope})`, { userId, ip, hits: exceeded.currentHits, limit: exceeded.limitValue });
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Rate limit exceeded: max ${exceeded.limitValue} submissions in the current window — try again in ${exceeded.retryAfterS}s.`,
      }),
      { status: 429, headers: { ...CORS, "Content-Type": "application/json", "Retry-After": String(exceeded.retryAfterS) } },
    );
  }

  // Problem validation: the DATABASE record is authoritative. Existence,
  // difficulty and points come from public.problems — the frontend problem
  // definition, expected outputs, difficulty, scores and test counts are
  // never trusted. Unknown or retired problems are rejected here.
  const problem = await validateProblem(sb, problemId);
  if (!problem) {
    return fail("Unknown or inactive problem", 404);
  }

  // Language validation: must be a server-supported language.
  if (!LANGS[language]) {
    return fail("Unsupported language (javascript | python | java)");
  }

  // Load HIDDEN tests only — service role bypasses RLS on problem_tests.
  // The kind='hidden' filter is a second guard on top of the CHECK constraint
  // in schema.sql: sample rows exist for seeding but are never graded here,
  // and no request field can widen the graded set.
  const { data: tests, error: testsErr } = await sb
    .from("problem_tests")
    .select("kind, input, expected")
    .eq("problem_id", problemId)
    .eq("kind", "hidden")
    .order("created_at", { ascending: true });
  if (testsErr) return fail("Could not load tests: " + testsErr.message, 500);
  if (!tests || tests.length === 0) return fail("No hidden test cases registered for this problem", 404);
  if (tests.length > MAX_TESTS_PER_RUN) return fail("Problem has too many registered hidden tests", 500);

  // One Judge0 submission per test; stdin = JSON args array.
  const lang = LANGS[language];
  const submissions = tests.map((t: TestCaseRow) => {
    const raw = t.input as { input?: unknown[] } | unknown[];
    const args = Array.isArray(raw) ? raw : Array.isArray(raw.input) ? raw.input : [];
    const argsJson = JSON.stringify(args);
    const source =
      language === "javascript" ? jsHarness(fnName, argsJson)
      : language === "python" ? pyHarness(fnName, argsJson)
      : javaHarness(fnName, argsJson);
    return {
      language_id: lang.judge0Id,
      source_code: source,
      stdin: argsJson,
      cpu_time_limit: lang.cpu,
      cpu_extra_time: 2,
      memory_limit: 256000, // KB
    };
  });

  let judgeResults: Judge0Sub[];
  try {
    judgeResults = await judge0RunBatch(submissions);
  } catch (e) {
    return fail((e as Error).message, 502);
  }

  // Interpret results. Only hidden tests are graded; verdicts are echoed to
  // the browser WITHOUT inputs, expected values or logs.
  const outcomes: TestOutcome[] = tests.map((t: TestCaseRow, i: number) => {
    const j = judgeResults[i];
    const hidden = true; // only hidden tests are fetched/graded server-side
    const runtimeMs = j.time ? Math.round(parseFloat(j.time) * 1000) : 0;
    const memoryMb = j.memory ? Math.round((j.memory / 1024) * 10) / 10 : 0;
    const base: TestOutcome = { index: i, hidden, passed: false, status: "Runtime Error", runtimeMs, memoryMb };

    if (j.status.id === 6) {
      return { ...base, status: "Compilation Error", error: (j.compile_output || "Compilation failed").slice(0, 800) };
    }
    if (j.status.id === 5) return { ...base, status: "Time Limit Exceeded" };
    if (j.status.id >= 7) {
      return { ...base, status: "Runtime Error", error: (j.stderr || j.status.description || "Runtime error").slice(0, 800) };
    }
    if (j.status.id !== 3) {
      return { ...base, status: "Runtime Error", error: `Sandbox status: ${j.status.description}` };
    }

    const markerLines = (j.stdout || "").split("\n").filter((l) => l.startsWith(MARKER));
    if (markerLines.length === 0) {
      return { ...base, status: "Runtime Error", error: (j.stderr || "No result produced").slice(0, 800) };
    }
    let parsed: { ok: boolean; value?: unknown; error?: string; logs?: string[] };
    try {
      parsed = JSON.parse(markerLines[0].slice(MARKER.length));
    } catch {
      return { ...base, status: "Runtime Error", error: "Unparseable harness output" };
    }
    if (!parsed.ok) {
      return { ...base, status: "Runtime Error", error: String(parsed.error || "Runtime error").slice(0, 800) };
    }

    const passed = canon(parsed.value) === canon(t.expected);
    // Hidden tests: verdict only. Inputs, expected values and logs are never
    // echoed to the browser — they exist server-side only.
    return { ...base, passed, status: passed ? "Accepted" : "Wrong Answer" };
  });

  const passedCount = outcomes.filter((o) => o.passed).length;
  const totalCount = outcomes.length;
  const allPassed = passedCount === totalCount;
  const totalRuntimeMs = outcomes.reduce((a, o) => a + o.runtimeMs, 0);
  const maxMemoryMb = Math.max(0, ...outcomes.map((o) => o.memoryMb));

  const compileErr = outcomes.find((o) => o.status === "Compilation Error");
  const tle = outcomes.find((o) => o.status === "Time Limit Exceeded");
  const rte = outcomes.find((o) => o.status === "Runtime Error");
  const overallStatus = allPassed ? "Accepted"
    : compileErr ? "Compilation Error"
    : tle ? "Time Limit Exceeded"
    : rte ? "Runtime Error"
    : "Wrong Answer";
  const dbStatus = allPassed ? "accepted" : compileErr || rte ? "error" : "failed";

  // ---- Evidence integrity fields (ALL computed server-side) ----------------
  // codeHash and testsSummary pin the graded content for every submission;
  // the record hash itself is stamped post-insert below (accepted only). The
  // browser can never choose or modify previous_record_hash, record_hash,
  // verification state, timestamps, scores, or test results.
  const testsSummary = outcomes.map((o) => (o.passed ? "1" : "0")).join("");
  const codeHash = await sha256Hex(code);

  // The user's previous ACCEPTED v2 row's record_hash is what we chain onto
  // ("" for a first link). Two concurrent submissions could otherwise read
  // the SAME predecessor and fork the chain, so any ambiguity at the chain
  // head (two accepted rows sharing the newest submitted_at) fails closed
  // here rather than guessing — the retry sees a settled history. The
  // partial unique index uq_submissions_user_prev_hash (schema.sql)
  // additionally makes it impossible for two accepted rows ever to claim
  // the same predecessor.
  let previousRecordHash: string | null = null;
  if (allPassed) {
    try {
      const { data: preds, error: predErr } = await sb
        .from("problem_submissions")
        .select("id, record_hash, submitted_at")
        .eq("user_id", userId)
        .eq("status", "accepted")
        .eq("record_version", 2)
        .not("record_hash", "is", null)
        .order("submitted_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(2);
      if (predErr) throw new Error("could not read chain predecessor: " + predErr.message);
      if (preds && preds.length === 2 && preds[0].submitted_at === preds[1].submitted_at) {
        // Unresolvable fork window: two accepted rows share the newest
        // timestamp, so a new link could attach to either. Fail closed
        // rather than guess — the retry will see a settled history.
        throw new Error("concurrent submissions detected; please retry in a moment");
      }
      previousRecordHash = preds && preds.length > 0 ? (preds[0].record_hash as string) : "";
    } catch (e) {
      console.error("chain predecessor failed — failing closed:", (e as Error).message);
      return fail("Submission could not be recorded: " + (e as Error).message, 503);
    }
  }

  // Evidence row — service-role insert (clients have NO insert policy and no
  // UPDATE/DELETE path). The row exists only if THIS function wrote it.
  // INSERT ... .single() under PostgREST is atomic: if it returns a row, the
  // row exists exactly once. We rely on that below: from here on, EVERY exit
  // path either finishes the chain stamp or removes the partial row, so an
  // accepted submission can never persist unhashed (schema.sql's
  // submissions_accepted_must_be_chained constraint is the backstop).
  const { data: inserted, error: insertErr } = await sb.from("problem_submissions").insert({
    user_id: userId,
    problem_id: problemId,
    language,
    code,
    // Two-phase evidence write: every row enters as 'submitted' (a state with
    // no chain obligations) and atomically flips to accepted/failed/error in
    // the UPDATEs below — together with the hash stamp for accepted rows.
    // schema.sql's submissions_accepted_must_be_chained constraint makes an
    // accepted row without a complete chain impossible at any instant.
    status: "submitted",
    runtime: `${totalRuntimeMs} ms`,
    memory: `${maxMemoryMb} MB`,
    passed_tests: passedCount,
    total_tests: totalCount,
    code_hash: codeHash,
    tests_summary: testsSummary,
    previous_record_hash: previousRecordHash,
  }).select("id, submitted_at").single();
  if (insertErr || !inserted) {
    console.error("submission insert failed:", insertErr?.message);
    return fail("Could not record submission evidence: " + (insertErr?.message ?? "no row returned"), 500);
  }

  // Chain stamp: compute record_hash over the DB-stamped submitted_at that
  // this exact row now carries (database clock, not a JS clock), then pin
  // it. Canonical JSON — keys sorted; MUST match verify-record's computeHash
  // byte for byte. A failure here is hard: the row stays unverified rather
  // than half-chained.
  let recordHash: string | null = null;
  if (allPassed) {
    const payload = JSON.stringify({
      code_hash: codeHash,
      language,
      passed_tests: passedCount,
      previous_record_hash: previousRecordHash,
      problem_id: problemId,
      status: dbStatus,
      submitted_at: inserted.submitted_at,
      tests_summary: testsSummary,
      total_tests: totalCount,
      user_id: userId,
    });
    try {
      recordHash = await sha256Hex(payload);
      // Phase 2 for accepted rows: flip status AND pin the hash in ONE atomic
      // UPDATE. The partial unique index uq_submissions_user_prev_hash
      // enforces fork-freedom at exactly this moment: a concurrent twin
      // claiming the same predecessor loses this race (unique violation),
      // deletes its pending row below, and the user retries — the chain
      // never forks.
      const { error: stampErr } = await sb
        .from("problem_submissions")
        .update({ status: "accepted", record_hash: recordHash })
        .eq("id", inserted.id)
        .eq("status", "submitted"); // only a pending row may flip
      if (stampErr) throw new Error(stampErr.message);
    } catch (e) {
      // FAIL CLOSED: never leave an accepted row without its record_hash —
      // that row would look VERIFIED to clients yet be unverifiable forever.
      // Delete the pending row (service role) and reject the submission; the
      // user retries against the settled chain head.
      console.error("chain stamp failed — removing pending row:", (e as Error).message);
      await sb.from("problem_submissions").delete().eq("id", inserted.id);
      return fail("Could not finalize submission evidence; please retry.", 500);
    }
  } else {
    // Phase 2 for non-accepted outcomes: finalize the verdict (no chain, no
    // hash — the schema forbids record_hash on non-accepted rows). Same
    // fail-closed cleanup if the flip fails.
    const { error: finErr } = await sb
      .from("problem_submissions")
      .update({ status: dbStatus })
      .eq("id", inserted.id)
      .eq("status", "submitted");
    if (finErr) {
      console.error("status finalize failed — removing pending row:", finErr.message);
      await sb.from("problem_submissions").delete().eq("id", inserted.id);
      return fail("Could not finalize submission record; please retry.", 500);
    }
  }

  return json({
    ok: true,
    status: overallStatus,
    allPassed,
    passedCount,
    totalCount,
    runtime: `${totalRuntimeMs} ms`,
    memory: `${maxMemoryMb} MB`,
    // Id + chain hash of the stored evidence row. Clients may display them
    // and hand them to verify-record; they can neither forge nor alter the
    // row they refer to.
    recordId: inserted.id,
    recordHash,
    testResults: outcomes, // hidden verdicts only — no inputs/expected/logs
  });
});
