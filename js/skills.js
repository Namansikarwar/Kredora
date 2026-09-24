/**
 * Kredora — skills config (single source of truth)
 * ------------------------------------------------------------------------------
 * The skills Kredora tracks, and the evidence types that can back each one.
 * Every page that names a skill (dashboard, skill.html, evidence.html,
 * profile.html) must read from this file instead of hardcoding names — change
 * it here and the whole app follows.
 *
 * This file is CONFIG ONLY. It holds no numbers: scores, solved counts, and
 * streaks are computed from the user's real records in js/user-stats.js
 * (getSkillsProgress), which maps submissions and evidence onto the skills
 * defined here.
 * ------------------------------------------------------------------------------
 */

/**
 * The four tracked skills.
 *   id       — stable slug, used in URLs (skill.html#java) and as a key
 *   name     — display name shown in the UI (also the value stored on
 *              user-added evidence records)
 *   category — what kind of skill this is, for grouping/copy
 *   evidence — which evidence types can feed this skill's score:
 *              "problems" (accepted coding submissions), "projects",
 *              "assessments", "activity"
 *   language — submission language (js/problems-data.js runner ids) that
 *              counts as problem evidence for this skill, or null when the
 *              skill has no coding-problem track (SQL/MongoDB prove
 *              themselves through projects and assessments instead).
 */
export const SKILLS = [
  {
    id: "java",
    name: "Java",
    category: "Programming Language",
    evidence: ["problems", "projects", "assessments"],
    language: "Java",
  },
  {
    id: "javascript",
    name: "JavaScript",
    category: "Programming Language",
    evidence: ["problems", "projects", "assessments"],
    language: "JavaScript",
  },
  {
    id: "sql",
    name: "SQL",
    category: "Database",
    evidence: ["projects", "assessments"],
    language: null,
  },
  {
    id: "mongodb",
    name: "MongoDB",
    category: "Database",
    evidence: ["projects", "assessments"],
    language: null,
  },
];

/**
 * Evidence sources the platform can verify, in dashboard display order.
 *   id        — stable key (matches data-evidence-total attributes)
 *   label     — display name
 *   countable — whether a per-user number can exist today. "Activity" has no
 *               connected-account source yet, so it renders as an honest 0.
 */
export const EVIDENCE_TYPES = [
  { id: "coding-problems", label: "Coding Problems", countable: true },
  { id: "projects", label: "Projects", countable: true },
  { id: "assessments", label: "Assessments", countable: true },
  { id: "activity", label: "Activity", countable: false },
];

/** Skill by id (case-sensitive slug). */
export function getSkill(id) {
  return SKILLS.find((s) => s.id === id) || null;
}

/** Skill whose name matches (used to bucket evidence records). */
export function skillByName(name) {
  if (!name) return null;
  const lower = String(name).toLowerCase();
  return SKILLS.find((s) => s.name.toLowerCase() === lower) || null;
}

/** Options markup for <select> dropdowns (evidence form). */
export function skillOptions(selectedName) {
  return SKILLS.map(
    (s) => `<option value="${s.name}"${s.name === selectedName ? " selected" : ""}>${s.name}</option>`
  ).join("");
}

// Expose for classic inline scripts that run before the module graph loads.
const SkillsConfig = { SKILLS, EVIDENCE_TYPES, getSkill, skillByName, skillOptions };
if (typeof window !== "undefined") {
  window.KredoraSkills = SkillsConfig;
}

export { SkillsConfig };
