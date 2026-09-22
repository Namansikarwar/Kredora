// ============================================================================
// Kredora — run-submission Edge Function
// ============================================================================
// Receives { problemId, language, code, fnName }, runs the code against the
// test cases stored in public.problem_tests (service-role read, invisible to
// clients), and writes an immutable row into public.problem_submissions
// (service-role insert — clients can no longer INSERT by policy).
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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- Limits ----------------------------------------------------------------
const MAX_CODE_BYTES = 64 * 1024; // 64 KB source limit
const RATE_LIMIT = 20; // submissions per sliding window
const RATE_WINDOW_S = 60; // per user (or per IP for anon)
const MAX_TESTS_PER_RUN = 20; // hard cap on Judge0 batch size
const POLL_TIMEOUT_MS = 25_000;

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

// ---- Rate limiting (sliding window via submission_rate_limits) ---------------
async function checkRateLimit(sb: SupabaseClient, identity: string) {
  const nowIso = new Date().toISOString();
  const windowStart = new Date(Date.now() - RATE_WINDOW_S * 1000).toISOString();
  const { data, error } = await sb
    .from("submission_rate_limits")
    .select("window_start, hit_count")
    .eq("identity", identity)
    .gte("window_start", windowStart)
    .maybeSingle();
  if (error) {
    console.warn("rate-limit read failed, failing open:", error.message);
    return { allowed: true };
  }
  if (data && Number(data.hit_count) >= RATE_LIMIT) return { allowed: false };
  const { error: upErr } = await sb.from("submission_rate_limits").upsert(
    { identity, window_start: data?.window_start ?? nowIso, hit_count: Number(data?.hit_count ?? 0) + 1 },
    { onConflict: "identity" },
  );
  if (upErr) console.warn("rate-limit upsert failed:", upErr.message);
  return { allowed: true };
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
  if (!LANGS[language]) return fail("Unsupported language (javascript | python | java)");
  if (!FN_NAME_RE.test(fnName)) return fail("fnName must be a valid identifier");

  const codeBytes = new TextEncoder().encode(code).length;
  if (codeBytes > MAX_CODE_BYTES) return fail(`Code too large (${codeBytes} bytes; limit ${MAX_CODE_BYTES})`, 413);

  let sb: SupabaseClient;
  try {
    sb = serviceClient();
  } catch (e) {
    return fail((e as Error).message, 500);
  }

  // Identity: Supabase Auth JWT if present, else client-IP bucket.
  let userId: string | null = null;
  let identity = "anon";
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ") && authHeader.length > 20) {
    try {
      const { data } = await sb.auth.getUser(authHeader.slice(7));
      if (data?.user) {
        userId = data.user.id;
        identity = `user:${data.user.id}`;
      }
    } catch {
      /* invalid token -> anon */
    }
  }
  if (identity === "anon") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";
    identity = `ip:${ip}`;
  }

  const rate = await checkRateLimit(sb, identity);
  if (!rate.allowed) {
    return fail(`Rate limit exceeded: max ${RATE_LIMIT} submissions per ${RATE_WINDOW_S}s`, 429);
  }

  // Load ALL tests for this problem — service role bypasses RLS on problem_tests.
  const { data: tests, error: testsErr } = await sb
    .from("problem_tests")
    .select("kind, input, expected")
    .eq("problem_id", problemId)
    .order("created_at", { ascending: true });
  if (testsErr) return fail("Could not load tests: " + testsErr.message, 500);
  if (!tests || tests.length === 0) return fail("No test cases registered for this problem", 404);
  if (tests.length > MAX_TESTS_PER_RUN) return fail("Problem has too many registered tests", 500);

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

  // Interpret results; hide expected values and inputs for hidden tests.
  const outcomes: TestOutcome[] = tests.map((t: TestCaseRow, i: number) => {
    const j = judgeResults[i];
    const hidden = t.kind !== "sample";
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
    const logs = (parsed.logs ?? []).slice(0, 50);
    if (hidden) return { ...base, passed, status: passed ? "Accepted" : "Wrong Answer" };

    const raw = t.input as { input?: unknown[]; inputDisplay?: string } | unknown[];
    const args = Array.isArray(raw) ? raw : Array.isArray(raw.input) ? raw.input : [];
    const inputDisplay = !Array.isArray(raw) && typeof raw.inputDisplay === "string" ? raw.inputDisplay : JSON.stringify(args);
    return {
      ...base,
      passed,
      status: passed ? "Accepted" : "Wrong Answer",
      inputDisplay,
      userOutputDisplay: JSON.stringify(parsed.value ?? null),
      expectedDisplay: JSON.stringify(t.expected ?? null),
      logs,
    };
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

  // Immutable evidence row — service-role insert (clients have NO insert policy).
  const { error: insertErr } = await sb.from("problem_submissions").insert({
    user_id: userId,
    problem_id: problemId,
    language,
    code,
    status: dbStatus,
    runtime: `${totalRuntimeMs} ms`,
    memory: `${maxMemoryMb} MB`,
    passed_tests: passedCount,
    total_tests: totalCount,
  });
  if (insertErr) console.warn("submission insert failed:", insertErr.message);

  return json({
    ok: true,
    status: overallStatus,
    allPassed,
    passedCount,
    totalCount,
    runtime: `${totalRuntimeMs} ms`,
    memory: `${maxMemoryMb} MB`,
    testResults: outcomes,
  });
});
