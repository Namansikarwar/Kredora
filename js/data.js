/**
 * SkillProof — dummy data layer
 * -----------------------------
 * This file stands in for a future backend. Every other script reads
 * from SKILLPROOF_DATA instead of hardcoding numbers, so swapping this
 * file for real API calls later should not require touching the UI code.
 */

const SKILLPROOF_DATA = {
  student: {
    name: "Naman Rathi",
    handle: "naman",
    title: "Full-Stack Developer, in progress",
    bio: "Third-year CS student who'd rather show you a solved problem than tell you a percentage. Building proof, one commit at a time.",
    overallScore: 79,
    location: "Indore, India",
  },

  skills: [
    {
      id: "java",
      name: "Java",
      score: 82,
      confidence: "High",
      evidenceCount: 63,
      problems: 41,
      projects: 3,
      assessments: 4,
      trend: "up",
    },
    {
      id: "javascript",
      name: "JavaScript",
      score: 76,
      confidence: "High",
      evidenceCount: 58,
      problems: 33,
      projects: 4,
      assessments: 3,
      trend: "up",
    },
    {
      id: "sql",
      name: "SQL",
      score: 88,
      confidence: "Very High",
      evidenceCount: 47,
      problems: 29,
      projects: 2,
      assessments: 5,
      trend: "steady",
    },
    {
      id: "mongodb",
      name: "MongoDB",
      score: 71,
      confidence: "Moderate",
      evidenceCount: 22,
      problems: 12,
      projects: 2,
      assessments: 2,
      trend: "up",
    },
  ],

  evidenceTypes: [
    {
      id: "coding-problems",
      label: "Coding Problems",
      description:
        "Every solved problem is logged with language, difficulty, and time to solve — not just a pass or fail.",
      sample: "Solved: Merge K Sorted Lists · Java · Hard · 14m 22s",
      count: 115,
    },
    {
      id: "projects",
      label: "Projects",
      description:
        "Real repositories, reviewed for code quality, test coverage, and consistency of contribution over time.",
      sample: "Repo: inventory-tracker · 340 commits · 84% test coverage",
      count: 11,
    },
    {
      id: "assessments",
      label: "Assessments",
      description:
        "Timed, proctored-style assessments that verify a skill actually holds up under pressure.",
      sample: "Assessment: SQL Query Optimization · Score 91/100",
      count: 14,
    },
    {
      id: "activity",
      label: "Activity",
      description:
        "Ongoing signal from connected accounts — commit frequency, streaks, and review participation.",
      sample: "GitHub: 6-week streak · 212 commits · 9 PRs merged",
      count: 340,
    },
  ],

  scoreBreakdown: {
    skill: "Java",
    total: 82,
    confidence: "High",
    factors: [
      { label: "Coding Problems", detail: "41 problems solved", points: 28, max: 30 },
      { label: "Projects", detail: "3 projects reviewed", points: 18, max: 20 },
      { label: "Assessments", detail: "4 assessments passed", points: 20, max: 25 },
      { label: "Concepts Demonstrated", detail: "9 core concepts shown", points: 10, max: 15 },
      { label: "GitHub Activity", detail: "6-week commit streak", points: 6, max: 10 },
    ],
  },

  recentAchievements: [
    { label: "SQL score crossed 85%", date: "2 days ago" },
    { label: "Completed 'REST APIs with Java' assessment", date: "5 days ago" },
    { label: "40-problem milestone in JavaScript", date: "1 week ago" },
  ],
};
