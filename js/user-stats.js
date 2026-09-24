/**
 * Kredora — shared user statistics module
 * ----------------------------------------------------------------------------
 * Single source of truth for every user-facing number that describes the
 * signed-in developer's real activity: streak, verified points, solved
 * counts, recent activity, achievements, and evidence totals.
 *
 * Used by: dashboard (js/main.js), problems.html, profile.html, skill.html,
 * and evidence.html — so every page shows the same numbers.
 *
 * Data sources, in priority order:
 *   1. Supabase `problem_submissions` (server-graded, tamper-evident rows)
 *   2. localStorage `skillproof_problem_submissions` (offline/local runs)
 *
 * Every statistic is derived from actual submission records. Nothing here is
 * marketing sample data — that stays on the landing page, clearly labeled.
 * ----------------------------------------------------------------------------
 */

// Also expose on window for classic inline scripts that run before the
// module graph finishes loading (import side effects register it early).
if (typeof window !== "undefined") {
  window.__userStatsReady = new Promise((resolve) => {
    window.__userStatsResolve = resolve;
  });
}

import { getSupabase } from "./supabase-client.js";
import { SKILLS, skillByName } from "./skills.js";

// Points awarded per accepted submission, by difficulty. Mirrors the
// `points` field on each problem in js/problems-data.js.
const DIFFICULTY_POINTS = { Easy: 2, Medium: 4, Hard: 8 };

// Labels for difficulty stat rows, shared by dashboard and problems pages.
export const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayDiff(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

function relTime(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

/** Flatten local submission storage ({ problemId: [records] }) to a list. */
function flattenLocalSubmissions(raw) {
  const out = [];
  if (!raw) return out;
  try {
    const subs = JSON.parse(raw);
    for (const [problemId, records] of Object.entries(subs)) {
      if (!Array.isArray(records)) continue;
      for (const r of records) {
        out.push({
          problemId,
          problemTitle: r.problemTitle || problemId,
          difficulty: r.difficulty || null,
          language: r.language || null,
          status: r.status || null,
          runtime: r.runtime || null,
          submittedAt: r.timestamp || r.submittedAt || null,
        });
      }
    }
  } catch {
    /* corrupted storage — treat as empty */
  }
  return out;
}

/**
 * Collect all known submissions for the current user: server rows (when
 * Supabase is configured and a session exists) plus local records. Server
 * rows are preferred for the same logical submission; local fallback keeps
 * every page working with no backend configured.
 */
export async function getSubmissions() {
  const local = flattenLocalSubmissions(
    localStorage.getItem("skillproof_problem_submissions")
  );

  try {
    const db = getSupabase();
    if (!db) return local;

    const userId = await db.getAuthUserId();
    if (!userId) return local; // RLS scoping requires a Supabase Auth session

    const { data, error } = await db
      .from("problem_submissions")
      .select("id, problem_id, language, status, runtime, submitted_at")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(500);
    if (error || !data) return local;

    const byKey = new Map();
    for (const row of data) {
      byKey.set(`${row.problem_id}|${row.language}|${row.submitted_at}`, {
        problemId: row.problem_id,
        problemTitle: row.problem_id,
        difficulty: null, // joined client-side against the catalog
        language: row.language,
        status: row.status,
        runtime: row.runtime,
        submittedAt: row.submitted_at,
        serverRow: true,
      });
    }
    for (const l of local) {
      const key = `${l.problemId}|${l.language}|${l.submittedAt}`;
      if (!byKey.has(key)) byKey.set(key, l);
    }
    return [...byKey.values()];
  } catch {
    return local;
  }
}

/** Distinct problems with at least one accepted submission. */
function acceptedProblemIds(subs) {
  const ids = new Set();
  for (const s of subs) {
    if (s.status === "accepted" || s.status === "Accepted") ids.add(s.problemId);
  }
  return ids;
}

/**
 * Consecutive-day streak: the number of day boundaries (ending today or
 * yesterday) covered by at least one submission each day, counting backward
 * from the most recent activity day. A gap of 2+ days resets the chain.
 */
export function computeStreak(subs) {
  const days = [
    ...new Set(
      subs
        .map((s) => s.submittedAt)
        .filter(Boolean)
        .map((iso) => startOfDay(new Date(iso).getTime()))
    ),
  ].sort((a, b) => b - a); // newest first

  if (days.length === 0) return 0;

  const today = startOfDay(Date.now());
  // Chain must be live: most recent submission today or yesterday.
  if (dayDiff(days[0], today) > 1) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = dayDiff(days[i], days[i - 1]);
    if (gap === 1) streak++;
    else if (gap > 1) break;
    // gap === 0 can't happen (deduped)
  }
  return streak;
}

/** Verified points: sum of per-difficulty points over accepted submissions. */
export function computePoints(subs) {
  return subs.reduce((sum, s) => {
    if (!(s.status === "accepted" || s.status === "Accepted")) return sum;
    const pts = DIFFICULTY_POINTS[s.difficulty];
    return sum + (Number.isFinite(pts) ? pts : DIFFICULTY_POINTS.Easy);
  }, 0);
}

/** Per-difficulty solved/total against the visible problem catalog. */
export function computeSolvedByDifficulty(subs, catalog) {
  const accepted = acceptedProblemIds(subs);
  const totals = { easy: 0, medium: 0, hard: 0 };
  const solved = { easy: 0, medium: 0, hard: 0 };
  for (const p of catalog) {
    const key = (p.difficulty || "").toLowerCase();
    if (!(key in totals)) continue;
    totals[key]++;
    if (accepted.has(p.id)) solved[key]++;
  }
  return { easy: { solved: solved.easy, total: totals.easy }, medium: { solved: solved.medium, total: totals.medium }, hard: { solved: solved.hard, total: totals.hard } };
}

/**
 * The headline snapshot. `catalog` is the visible problem list
 * (window.CODING_PROBLEMS) used for difficulty totals.
 */
let catalogPromise = null;

/** Load the problem catalog once (pages may not include problems-data.js). */
function loadCatalog() {
  if (window.CODING_PROBLEMS && window.CODING_PROBLEMS.length > 0) {
    return Promise.resolve(window.CODING_PROBLEMS);
  }
  if (!catalogPromise) {
    catalogPromise = import("./problems-data.js")
      .then(() => {
        // problems-data.js may itself still be initializing on first load;
        // poll briefly until the global is populated.
        return new Promise((resolve) => {
          const started = Date.now();
          const check = () => {
            if (window.CODING_PROBLEMS && window.CODING_PROBLEMS.length > 0) {
              resolve(window.CODING_PROBLEMS);
            } else if (Date.now() - started > 4000) {
              resolve(window.CODING_PROBLEMS || []); // give up honestly
            } else {
              setTimeout(check, 60);
            }
          };
          check();
        });
      })
      .catch(() => []);
  }
  return catalogPromise;
}

export async function getUserStats(catalog) {
  if (!catalog) {
    // Problems-data isn't loaded on every page; load it on demand so
    // solved counts and difficulty points are correct everywhere.
    catalog = await loadCatalog();
  }
  const subs = await getSubmissions();

  // Enrich with catalog metadata (difficulty/title) for local records too.
  const byId = new Map(catalog.map((p) => [p.id, p]));
  for (const s of subs) {
    const p = byId.get(s.problemId);
    if (p) {
      if (!s.difficulty) s.difficulty = p.difficulty;
      if (!s.problemTitle || s.problemTitle === s.problemId) s.problemTitle = p.title;
    }
  }

  const acceptedIds = acceptedProblemIds(subs);
  const byDifficulty = computeSolvedByDifficulty(subs, catalog);
  const acceptedSubs = subs.filter((s) => acceptedIds.has(s.problemId));

  // User-added evidence (projects/assessments) for the tracked-skills view.
  let userEvidence = [];
  try {
    userEvidence = JSON.parse(localStorage.getItem("skillproof_user_evidence") || "[]");
  } catch {
    userEvidence = [];
  }

  const lastAccepted = acceptedSubs
    .map((s) => s.submittedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return {
    total: catalog.length,
    solvedTotal: acceptedIds.size,
    completionRate: catalog.length ? Math.round((acceptedIds.size / catalog.length) * 100) : 0,
    easy: byDifficulty.easy,
    medium: byDifficulty.medium,
    hard: byDifficulty.hard,
    streakDays: computeStreak(subs),
    points: computePoints(subs),
    lastActiveAt: lastAccepted || null,
    skillBreakdown: getSkillBreakdown(subs, catalog),
    skillsProgress: getSkillsProgress(subs, userEvidence),
    submissions: subs,
  };
}

/** Recent activity feed built from actual submissions (newest first). */
export function getRecentActivity(subs, limit = 4) {
  return [...subs]
    .filter((s) => s.submittedAt)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, limit)
    .map((s) => {
      const accepted = s.status === "accepted" || s.status === "Accepted";
      const title = s.problemTitle || s.problemId;
      const verb = accepted ? "Solved" : "Attempted";
      const lang = s.language ? ` · ${s.language}` : "";
      return {
        text: `${verb} '${title}'${lang}`,
        time: relTime(s.submittedAt),
        badge: s.language || (s.difficulty || "Code"),
        accepted,
      };
    });
}

/** Achievement milestones derived from real counts. */
export function getAchievements(stats) {
  const out = [];
  const { solvedTotal, points, streakDays } = stats;
  const milestones = [
    { n: 1, label: "First problem solved" },
    { n: 5, label: "5-problem milestone" },
    { n: 10, label: "10-problem milestone" },
    { n: 20, label: "20-problem milestone" },
    { n: 50, label: "50-problem milestone" },
  ];
  for (const m of milestones) {
    if (solvedTotal >= m.n) out.push({ label: m.label, date: `${solvedTotal} solved so far` });
  }
  if (points >= 50) out.push({ label: "50 verified points earned", date: `${points} pts` });
  if (streakDays >= 3) out.push({ label: "3-day solving streak", date: `${streakDays} days` });
  if (out.length === 0) {
    out.push({ label: "Solve your first problem to start earning achievements", date: "0 / 21 solved" });
  }
  return out.slice(-3).reverse(); // newest milestone first, max 3
}

/** Evidence totals for the dashboard's evidence graph. */
export function getEvidenceTotals(stats) {
  const accepted = acceptedProblemIds(stats.submissions);
  let problems = 0;
  for (const s of stats.submissions) {
    if (accepted.has(s.problemId)) {
      problems++;
      break; // distinct problems, not rows
    }
  }
  problems = accepted.size;

  let userEvidence = [];
  try {
    userEvidence = JSON.parse(localStorage.getItem("skillproof_user_evidence") || "[]");
  } catch {
    userEvidence = [];
  }
  const projects = userEvidence.filter((e) => e.type === "project").length;
  const assessments = userEvidence.filter((e) => e.type === "assessment").length;

  // No connected-account source exists yet — 0 is the honest number.
  const activity = 0;

  return { problems, projects, assessments, activity };
}

/**
 * Per-skill progress for the four TRACKED skills from js/skills.js (Java,
 * JavaScript, SQL, MongoDB) — the config-driven view that dashboard,
 * profile, skill.html and evidence.html render. For every skill:
 *
 *   score        — accepted problems × 5 per skill, capped at 100 (same
 *                  heuristic as profile_summaries; skill-problem evidence
 *                  counts via the skill's `language`, so pages agree)
 *   solved       — distinct accepted problems submitted in that language
 *   attempts     — distinct problems attempted in that language
 *   evidence     — counts of the user's own projects/assessments tagged
 *                  with this skill
 *   hasEvidence  — true when any of the skill's evidence types has a count
 *
 * Skills with zero evidence are still returned (with 0s), so all four
 * tracked skills always render — config, not user activity, decides the
 * list. Per-CATEGORY scores (a different, dynamic view) remain available
 * via getSkillBreakdown/getUserStats().skillBreakdown.
 */
export function getSkillsProgress(subs, userEvidence) {
  const langToSkill = new Map(
    SKILLS.filter((s) => s.language).map((s) => [s.language.toLowerCase(), s.id])
  );

  const out = new Map(SKILLS.map((s) => [s.id, {
    id: s.id,
    name: s.name,
    category: s.category,
    evidenceTypes: [...s.evidence],
    score: 0,
    solved: 0,
    attempts: 0,
    problems: 0,
    projects: 0,
    assessments: 0,
    lastAcceptedAt: null,
    hasEvidence: false,
  }]));

  const attemptedIds = new Set();
  for (const s of subs) {
    attemptedIds.add(s.problemId);
    const skillId = langToSkill.get(String(s.language || "").toLowerCase());
    if (!skillId) continue;
    const skill = out.get(skillId);
    skill.attempts += 1;
    if (s.status === "accepted" || s.status === "Accepted") {
      skill.solved += 1;
      skill.score = Math.min(100, skill.score + 5);
      const t = new Date(s.submittedAt).getTime();
      if (Number.isFinite(t) && (!skill.lastAcceptedAt || t > new Date(skill.lastAcceptedAt).getTime())) {
        skill.lastAcceptedAt = new Date(t).toISOString();
      }
    }
  }

  for (const e of userEvidence || []) {
    const skill = skillByName(e.skill);
    if (!skill) continue;
    const row = out.get(skill.id);
    if (e.type === "project") row.projects += 1;
    else if (e.type === "assessment") row.assessments += 1;
  }

  for (const row of out.values()) {
    row.hasEvidence = row.solved > 0 || row.projects > 0 || row.assessments > 0;
  }

  return SKILLS.map((s) => out.get(s.id));
}

/**
 * Per-skill breakdown computed from the user's actual submissions mapped
 * against problem categories in the catalog. A skill here is a problem
 * category (Arrays & Hashing, Two Pointers, ...), not a self-reported rating.
 *
 *   score    — accepted problems × 5 per skill, capped at 100 (same heuristic
 *              as profile_summaries / profile score, so pages agree)
 *   solved   — distinct accepted problems in this category
 *   attempts — distinct problems in this category with any submission
 *
 * The submitted-language sample ("Your Java skill...") on skill.html keeps
 * working: a synthetic "Java" entry is only added when at least one accepted
 * submission exists, so an empty account stays empty.
 */
export function getSkillBreakdown(subs, catalog) {
  const accepted = acceptedProblemIds(subs);
  const attempted = new Set(subs.map((s) => s.problemId));
  const byCategory = new Map();
  for (const p of catalog) {
    const key = p.category || "General";
    if (!byCategory.has(key)) {
      byCategory.set(key, { id: slugify(key), name: key, score: 0, solved: 0, attempted: 0, lastAcceptedAt: null });
    }
    const skill = byCategory.get(key);
    if (accepted.has(p.id)) {
      skill.solved += 1;
      skill.score = Math.min(100, skill.score + 5);
    }
    if (attempted.has(p.id)) skill.attempted += 1;
  }

  // Last accepted timestamp per category, from the user's submissions.
  for (const s of subs) {
    if (!(s.status === "accepted" || s.status === "Accepted")) continue;
    const p = catalog.find((c) => c.id === s.problemId);
    if (!p) continue;
    const skill = byCategory.get(p.category || "General");
    if (!skill) continue;
    const t = new Date(s.submittedAt).getTime();
    if (Number.isFinite(t) && (!skill.lastAcceptedAt || t > new Date(skill.lastAcceptedAt).getTime())) {
      skill.lastAcceptedAt = new Date(t).toISOString();
    }
  }

  // Only surface skills the user has actually touched.
  return [...byCategory.values()]
    .filter((s) => s.attempted > 0)
    .sort((a, b) => b.score - a.score || b.solved - a.solved);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** All evidence records (server-derived problems + user-added items). */
// (see bottom of file for the window registration)
export function getUserEvidence(stats) {
  let userEvidence = [];
  try {
    userEvidence = JSON.parse(localStorage.getItem("skillproof_user_evidence") || "[]");
  } catch {
    userEvidence = [];
  }
  const accepted = acceptedProblemIds(stats.submissions);
  const problemEvidence = stats.submissions
    .filter((s) => accepted.has(s.problemId))
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .map((s, i) => ({
      id: `srv_${s.problemId}_${i}`,
      type: "problem",
      name: s.problemTitle || s.problemId,
      skill: s.language || "Code",
      detail: `Accepted on the server · ${s.difficulty || "problem"}${s.runtime ? ` · ${s.runtime}` : ""}`,
      timestamp: relTime(s.submittedAt),
      recordId: s.recordId || null,
    }));
  return [...problemEvidence, ...userEvidence];
}

// Expose on window so pages (including inline scripts) share one instance.
const UserStats = {
  getSubmissions,
  getUserStats,
  getSkillBreakdown,
  getSkillsProgress,
  computeStreak,
  computePoints,
  computeSolvedByDifficulty,
  getRecentActivity,
  getAchievements,
  getEvidenceTotals,
  getUserEvidence,
};

if (typeof window !== "undefined") {
  window.UserStats = UserStats;
  if (window.__userStatsResolve) window.__userStatsResolve(UserStats);
}

export { UserStats };
