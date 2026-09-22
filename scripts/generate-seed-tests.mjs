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
 * Hidden test cases are REMOVED from the client bundle automatically
 * (see js/problems-data.js footer) — this file is the single source of
 * truth for them.
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
  .replace(/^\s*export\s*\{\s*\}\s*;?\s*$/m, "");
new Function("window", src)(window);
const problems = window.CODING_PROBLEMS;
if (!Array.isArray(problems) || problems.length === 0) {
  console.error("Could not load CODING_PROBLEMS from js/problems-data.js");
  process.exit(1);
}

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const j = (v) => q(JSON.stringify(v) + "::jsonb");

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

for (const p of problems) sql += `  ${q(p.id)},\n`;
sql = sql.replace(/, $/, "\n") + ");\n\n";

sql += "insert into public.problem_tests (problem_id, kind, input, expected) values\n";
const rows = [];
for (const p of problems) {
  for (const t of p.sampleTestCases ?? []) {
    rows.push(`  (${q(p.id)}, 'sample', ${j({ input: t.input, inputDisplay: t.inputDisplay ?? null })}, ${j(t.expected)})`);
  }
  for (const t of p.hiddenTestCases ?? []) {
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
const hiddenCount = problems.reduce((a, p) => a + (p.hiddenTestCases?.length ?? 0), 0);
const sampleCount = problems.reduce((a, p) => a + (p.sampleTestCases?.length ?? 0), 0);
console.log(`Wrote ${outPath}: ${rows.length} rows (${sampleCount} sample, ${hiddenCount} hidden) across ${problems.length} problems.`);
