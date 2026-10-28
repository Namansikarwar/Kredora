/**
 * Dev-time generator: emits supabase/seed-tests.sql from js/problems-data.js.
 *
 * The seed SQL inserts every sample AND hidden test case into
 * public.problem_tests (the server-only table the run-submission Edge
 * Function reads with the service role). Run this only when the problem
 * set changes:
 *
 *   node scripts/generate-seed-tests.mjs
 *   # then run supabase/seed-tests.sql in the Supabase SQL editor
 *
 * Sample cases come from js/problems-data.js (they are shown in the browser).
 * HIDDEN cases live in supabase/hidden-tests.json — a server-side file that is
 * never imported by browser code, so hidden inputs/expected outputs cannot leak
 * into the client bundle.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

// problems-data.js assigns to window.CODING_PROBLEMS; emulate the browser.
// The file is an ES module (trailing `export {}`), so strip module syntax
// and evaluate it as a classic script against a fake window.
const window = {};
const src = readFileSync(resolve(root, "js/problems-data.js"), "utf8")
  .replace(/^\s*export\s*\{\s*\}\s*;?\s*$/m, "")
  // Reach the in-module array directly (window.CODING_PROBLEMS is the client
  // copy, and the module scope also holds everything the browser never gets).
  + "\nwindow.__ALL_PROBLEMS = CODING_PROBLEMS;\n";
new Function("window", src)(window);
const problems = window.__ALL_PROBLEMS || window.CODING_PROBLEMS;
if (!Array.isArray(problems) || problems.length === 0) {
  console.error("Could not load CODING_PROBLEMS from js/problems-data.js");
  process.exit(1);
}

// Leak guard: anything declared inline in the client module ships to the browser.
if (/hiddenTestCases\s*:\s*\[\s*\{/.test(src)) {
  console.error(
    "js/problems-data.js still declares hidden test cases inline. Move them to " +
      "supabase/hidden-tests.json: everything in that module is bundled into the " +
      "browser build, which would leak the graded cases."
  );
  process.exit(1);
}

const hiddenPath = resolve(root, "supabase/hidden-tests.json");
let hiddenTests;
try {
  hiddenTests = JSON.parse(readFileSync(hiddenPath, "utf8")).problems;
} catch (e) {
  console.error(`Could not read ${hiddenPath}: ${e.message}`);
  process.exit(1);
}
if (!hiddenTests || typeof hiddenTests !== "object") {
  console.error(`${hiddenPath} must contain a "problems" object of id -> test cases`);
  process.exit(1);
}

const hiddenFor = (id) => {
  const cases = hiddenTests[id];
  if (!Array.isArray(cases) || cases.length === 0) {
    console.error(`No hidden test cases in supabase/hidden-tests.json for problem "${id}"`);
    process.exit(1);
  }
  return cases;
};

const knownIds = new Set(problems.map((p) => p.id));
const orphanIds = Object.keys(hiddenTests).filter((id) => !knownIds.has(id));
if (orphanIds.length) {
  console.error(`supabase/hidden-tests.json has entries for unknown problems: ${orphanIds.join(", ")}`);
  process.exit(1);
}

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const j = (v) => q(JSON.stringify(v)) + "::jsonb";

let sql = `-- ============================================================================
-- Kredora — seed problem_tests (server-side hidden + sample test cases)
-- ============================================================================
-- GENERATED FILE — do not edit by hand. Regenerate with:
--   node scripts/generate-seed-tests.mjs
--
-- Run in Supabase Dashboard -> SQL Editor after supabase/schema.sql.
-- Idempotent: wipes and re-seeds all test rows for every known problem.
-- ============================================================================

delete from public.problem_tests
where problem_id in (
`;

sql += problems.map((p) => `  ${q(p.id)}`).join(",\n") + "\n);\n\n";

sql += "insert into public.problem_tests (problem_id, kind, input, expected) values\n";
const rows = [];
for (const p of problems) {
  for (const t of p.sampleTestCases ?? []) {
    rows.push(`  (${q(p.id)}, 'sample', ${j({ input: t.input, inputDisplay: t.inputDisplay ?? null })}, ${j(t.expected)})`);
  }
  for (const t of hiddenFor(p.id)) {
    rows.push(`  (${q(p.id)}, 'hidden', ${j({ input: t.input })}, ${j(t.expected)})`);
  }
}
sql += rows.join(",\n") + ";\n\n";

sql += `-- Sanity checks
select problem_id, kind, count(*) from public.problem_tests group by 1, 2 order by 1, 2;
`;

const outPath = resolve(root, "supabase/seed-tests.sql");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, sql);
const hiddenCount = problems.reduce((a, p) => a + hiddenFor(p.id).length, 0);
const sampleCount = problems.reduce((a, p) => a + (p.sampleTestCases?.length ?? 0), 0);
console.log(`Wrote ${outPath}: ${rows.length} rows (${sampleCount} sample, ${hiddenCount} hidden) across ${problems.length} problems.`);
