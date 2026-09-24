/**
 * Kredora — Landing Page and Dashboard Interactivity
 */

function initMobileNav() {
  const toggle = document.getElementById("nav-toggle");
  const menu = document.getElementById("mobile-menu");
  const iconOpen = document.getElementById("icon-open");
  const iconClose = document.getElementById("icon-close");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (iconOpen) iconOpen.classList.toggle("hidden", isOpen);
    if (iconClose) iconClose.classList.toggle("hidden", !isOpen);
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      if (iconOpen) iconOpen.classList.remove("hidden");
      if (iconClose) iconClose.classList.add("hidden");
    });
  });
}

function initScrollReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || targets.length === 0) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

function initScoreRings() {
  const rings = document.querySelectorAll("[data-score-ring]");
  if (rings.length === 0) return;

  const animateRing = (el) => {
    const pct = Number(el.dataset.scoreRing) || 0;
    requestAnimationFrame(() => {
      el.style.setProperty("--pct", String(pct));
    });
  };

  if (!("IntersectionObserver" in window)) {
    rings.forEach(animateRing);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateRing(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  rings.forEach((el) => observer.observe(el));
}

function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function animateCounter(el, target, duration = 1100) {
  if (!el) return;
  const start = performance.now();
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.round(target * easeOutCubic(progress));
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderScoreBreakdown() {
  const list = document.getElementById("score-factor-list");
  const DATA = window.SKILLPROOF_DATA;
  if (!list || !DATA) return;
  const { factors } = DATA.scoreBreakdown;

  list.innerHTML = factors
    .map(
      (factor) => `
      <div class="factor-row" data-points="${factor.points}" data-max="${factor.max}">
        <div class="flex items-baseline justify-between mb-2">
          <p class="text-sm text-ink font-medium">${factor.label}</p>
          <p class="font-mono text-sm text-inkdim">
            <span class="factor-counter text-gold">0</span>/${factor.max}
          </p>
        </div>
        <div class="h-2 rounded-full bg-white/5 overflow-hidden">
          <div class="factor-bar h-full rounded-full bg-gradient-to-r from-cyan to-brand"></div>
        </div>
        <p class="mt-1.5 text-xs text-inkdim font-mono">${factor.detail}</p>
      </div>`
    )
    .join("");

  const section = document.getElementById("score-breakdown");
  const totalCounter = document.getElementById("breakdown-total-counter");
  if (!section) return;

  const runAnimation = () => {
    list.querySelectorAll(".factor-row").forEach((row, i) => {
      const points = Number(row.dataset.points);
      const max = Number(row.dataset.max);
      const bar = row.querySelector(".factor-bar");
      const counter = row.querySelector(".factor-counter");

      setTimeout(() => {
        if (bar) bar.style.width = `${(points / max) * 100}%`;
        if (counter) animateCounter(counter, points);
      }, i * 110);
    });

    if (totalCounter) {
      animateCounter(totalCounter, DATA.scoreBreakdown.total, 1300);
    }
  };

  if (!("IntersectionObserver" in window)) {
    runAnimation();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runAnimation();
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.35 }
  );
  observer.observe(section);
}

function renderExampleSkills() {
  const container = document.getElementById("example-skill-list");
  const DATA = window.SKILLPROOF_DATA;
  if (!container || !DATA) return;

  container.innerHTML = DATA.skills
    .map(
      (skill) => `
      <li class="flex items-center gap-4 py-3 border-b border-white/5 last:border-b-0">
        <span class="w-24 shrink-0 font-display text-sm text-slate-200">${skill.name}</span>
        <span class="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <span class="block h-full rounded-full bg-gradient-to-r from-cyan to-brand" style="width:${skill.score}%"></span>
        </span>
        <span class="w-10 shrink-0 text-right font-mono text-sm text-brand-bright">${skill.score}</span>
      </li>`
    )
    .join("");
}

// Dashboard specific rendering
function renderDashboard() {
  const DATA = window.SKILLPROOF_DATA;
  if (!DATA) return;

  // Evidence-graph totals: real counts from the user's own records
  // (accepted submissions + saved evidence). No connected-account source
  // exists, so activity stays 0 — shown as an honest zero, not a sample.
  const renderEvidenceTotals = (stats) => {
    if (!stats) return;
    const totals = window.UserStats.getEvidenceTotals(stats);
    const map = {
      "coding-problems": totals.problems,
      "projects": totals.projects,
      "assessments": totals.assessments,
      "activity": totals.activity,
    };
    for (const [key, value] of Object.entries(map)) {
      const el = document.querySelector(`[data-evidence-total="${key}"]`);
      if (el) animateCounter(el, value);
    }
  };
  const renderUserStats = (stats) => {
    if (!stats) return;
    const statPoints = document.getElementById("stat-points");
    if (statPoints) animateCounter(statPoints, stats.points);
    const statStreak = document.getElementById("stat-streak");
    if (statStreak) statStreak.textContent = stats.streakDays;
    const statSolved = document.getElementById("stat-solved");
    if (statSolved) animateCounter(statSolved, stats.solvedTotal);
    const statSolvedTotal = document.getElementById("stat-solved-total");
    if (statSolvedTotal) statSolvedTotal.textContent = ` / ${stats.total}`;
  };
  if (window.UserStats) {
    window.UserStats.getUserStats().then((stats) => {
      renderEvidenceTotals(stats);
      renderUserStats(stats);
    });
  }

  // NOTE: the score breakdown card and the example skills list on the
  // landing page are sample-profile visuals (SKILLPROOF_DATA) — labeled
  // as an example in the markup. Everything below renders REAL per-user
  // values from the user's actual submissions (skillBreakdown is computed
  // in js/user-stats.js from submissions × problem categories).

  // Skill rings in evidence graph — the four tracked skills from
  // js/skills.js, at their real scores. A zero ring means "no evidence
  // yet", which is the honest number for a tracked skill.
  const renderSkillRings = (stats) => {
    const skills = stats.skillsProgress || [];

    document.querySelectorAll("[data-ring-slot]").forEach((slot) => {
      const i = Number(slot.getAttribute("data-ring-slot"));
      const skill = skills[i];
      if (!skill) {
        slot.style.display = "none";
        return;
      }
      slot.style.display = "";
      const ring = slot.querySelector(".score-ring");
      const scoreEl = slot.querySelector("[data-skill-score]");
      const labelEl = slot.querySelector("[data-ring-label]");
      if (ring) {
        ring.setAttribute("data-score-ring", skill.score);
        ring.style.setProperty("--pct", skill.score);
      }
      if (scoreEl) animateCounter(scoreEl, skill.score);
      if (labelEl) labelEl.textContent = skill.name;
    });

    // Mobile fallback grid — generated from the same tracked skills.
    const mobile = document.getElementById("ring-slots-mobile");
    if (mobile) {
      mobile.innerHTML = skills
        .map(
          (s) => `
            <div class="flex flex-col items-center">
              <div class="score-ring w-16 h-16 rounded-full grid place-items-center" data-score-ring="${s.score}" style="--pct:${s.score}">
                <div class="score-ring-inner w-[52px] h-[52px] rounded-full grid place-items-center">
                  <span class="font-display font-semibold text-sm text-white" data-skill-score>${s.score}</span>
                </div>
              </div>
              <p class="text-xs text-inkdim mt-2">${s.name}</p>
            </div>`
        )
        .join("");
    }

    const overall = Math.min(100, stats.solvedTotal * 5);
    document.querySelectorAll("[data-overall-ring]").forEach((r) => {
      r.setAttribute("data-score-ring", overall);
      r.style.setProperty("--pct", overall);
    });
    document.querySelectorAll("[data-overall-score]").forEach((s) => animateCounter(s, overall));
  };

  // Skill cards grid — the four tracked skills from js/skills.js, each at
  // its real score. Card copy adapts to the skill's evidence types.
  const renderSkillCards = (stats) => {
    const cardsGrid = document.getElementById("skill-cards-grid");
    if (!cardsGrid) return;
    const skills = stats.skillsProgress || [];
    if (skills.length === 0) {
      cardsGrid.innerHTML = `
        <div class="glass-card rounded-2xl p-5 text-xs text-inkdim font-mono sm:col-span-2 lg:col-span-4">
          Skills config is empty — add entries in js/skills.js.
        </div>`;
      return;
    }
    const meta = (s) => {
      if (s.solved > 0) return `${s.solved} solved${s.attempts > s.solved ? ` · ${s.attempts} attempted` : ""}`;
      const extras = [];
      if (s.projects > 0) extras.push(`${s.projects} project${s.projects === 1 ? "" : "s"}`);
      if (s.assessments > 0) extras.push(`${s.assessments} assessment${s.assessments === 1 ? "" : "s"}`);
      return extras.length ? extras.join(" · ") : s.evidenceTypes.includes("problems") ? "No evidence yet" : "Projects & assessments only";
    };
    const status = (s) => (s.score >= 60 ? "Strong" : s.score > 0 ? "Building" : "No evidence yet");
    cardsGrid.innerHTML = skills
      .map(
        (s) => `
      <a href="skill.html#${s.id}" class="glass-card lift-on-hover rounded-2xl p-5 block transition-colors hover:border-brand/50 group">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-display font-semibold text-white group-hover:text-brand-bright transition-colors">${s.name}</h3>
            <p class="text-xs text-inkdim font-mono">${meta(s)}</p>
          </div>
          <span class="font-display font-semibold text-2xl ${s.score > 0 ? "text-brand-bright" : "text-white/30"}">${s.score}</span>
        </div>
        <div class="h-1.5 rounded-full bg-white/5 overflow-hidden mb-4">
          <div class="h-full rounded-full bg-gradient-to-r from-cyan to-brand" style="width:${s.score}%"></div>
        </div>
        <div class="flex items-center justify-between text-xs text-inkdim font-mono">
          <span>${status(s)}</span>
          <span>${s.score}/100</span>
        </div>
      </a>`
      )
      .join("");
  };

  if (window.UserStats) {
    window.UserStats.getUserStats().then((stats) => {
      renderEvidenceTotals(stats);
      renderUserStats(stats);
      renderSkillRings(stats);
      renderSkillCards(stats);
      renderWeakArea(stats);
    });
  }

  // Recent Activity — real submissions (falls back to an honest empty state)
  const activityList = document.getElementById("recent-activity-list");
  if (activityList) {
    const renderActivity = (stats) => {
      const items = window.UserStats
        ? window.UserStats.getRecentActivity(stats.submissions, 4)
        : [];
      if (items.length === 0) {
        activityList.innerHTML = `
          <p class="text-xs text-inkdim font-mono">No submissions yet — solve a problem and it shows up here.</p>`;
        return;
      }
      activityList.innerHTML = items
        .map(
          (a) => `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 frosted-panel text-sm">
        <div class="truncate mr-2">
          <p class="text-ink text-xs font-medium truncate">${a.text}</p>
          <span class="text-[10px] text-inkdim font-mono">${a.time}</span>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-brand/10 text-brand-bright border border-brand/20 shrink-0">${a.badge}</span>
      </div>`
        )
        .join("");
    };

    if (window.UserStats) {
      window.UserStats.getUserStats().then(renderActivity);
    } else {
      activityList.innerHTML = `<p class="text-xs text-inkdim font-mono">No submissions yet — solve a problem and it shows up here.</p>`;
    }
  }

  // Achievements — real milestones from the user's own record
  const achievementsList = document.getElementById("recent-achievements-list");
  if (achievementsList) {
    const renderAchievements = (stats) => {
      const achievements = window.UserStats
        ? window.UserStats.getAchievements(stats)
        : [];
      achievementsList.innerHTML = achievements
        .map(
          (ach) => `
      <li class="flex items-start gap-3 text-sm">
        <span class="w-5 h-5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 grid place-items-center text-xs shrink-0 mt-0.5">✓</span>
        <div>
          <p class="text-ink text-xs sm:text-sm font-medium">${ach.label}</p>
          <p class="text-[11px] text-inkdim font-mono mt-0.5">${ach.date}</p>
        </div>
      </li>`
        )
        .join("");
    };

    if (window.UserStats) {
      window.UserStats.getUserStats().then(renderAchievements);
    } else {
      achievementsList.innerHTML = `<li class="text-xs text-inkdim font-mono">Solve a problem to start earning achievements.</li>`;
    }
  }

  // Coding Arena Progress (LeetCode / HackerRank style)
  renderArenaProgress();
}

// "Needs More Evidence" — the weakest tracked skill (js/skills.js) by real
// score, so the call to action points at a skill the app actually tracks.
function renderWeakArea(stats) {
  const weakArea = document.getElementById("weak-area-content");
  if (!weakArea) return;
  const skills = stats.skillsProgress || [];
  const candidates = skills.filter((s) => s.score < 100);
  if (candidates.length === 0) {
    weakArea.innerHTML = `
      <div class="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 frosted-panel">
        <div class="flex items-center justify-between mb-2">
          <span class="font-display font-semibold text-white">All caught up</span>
          <span class="font-mono text-sm text-emerald-400">100/100</span>
        </div>
        <p class="text-xs text-inkdim leading-relaxed">
          Every tracked skill is maxed out. Add new evidence to keep the streak going.
        </p>
      </div>`;
    return;
  }
  const weakest = [...candidates].sort((a, b) => a.score - b.score || a.solved - b.solved)[0];
  const evidenceHint = weakest.evidenceTypes.includes("problems")
    ? `${weakest.solved} accepted problem${weakest.solved === 1 ? "" : "s"} in ${weakest.name} so far. More accepted submissions here raise this score the fastest.`
    : `SQL and MongoDB skills are proven through projects and assessments — add evidence from the Evidence page.`;
  weakArea.innerHTML = `
    <div class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 frosted-panel">
      <div class="flex items-center justify-between mb-2">
        <span class="font-display font-semibold text-white">${weakest.name}</span>
        <span class="font-mono text-sm text-brand-bright">${weakest.score}/100</span>
      </div>
      <p class="text-xs text-inkdim leading-relaxed mb-4">
        ${evidenceHint}
      </p>
      <a href="${weakest.evidenceTypes.includes("problems") ? "problems.html" : "evidence.html"}" class="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-amber-300 font-mono">
        + ${weakest.evidenceTypes.includes("problems") ? `Practice ${weakest.name}` : `Log ${weakest.name} evidence`} →
      </a>
    </div>`;
}

function renderArenaProgress() {
  const solvedCountEl = document.getElementById("dashSolvedCount");
  if (!solvedCountEl || !window.ProgressTracker) return;

  const tracker = window.ProgressTracker;
  tracker.getStats().then((stats) => {
    const solvedMap = tracker.getSolvedMap();
    const solvedItems = Object.values(solvedMap);
    const allProblems = window.CODING_PROBLEMS || [];

    const solvedCountEl = document.getElementById("dashSolvedCount");
    if (!solvedCountEl) return;

    solvedCountEl.textContent = stats.solvedTotal;
    const totalEl = document.getElementById("dashTotalCount");
    if (totalEl) totalEl.textContent = `/ ${stats.total} Problems`;

    const easyEl = document.getElementById("dashEasyStats");
    if (easyEl) easyEl.textContent = `${stats.easy.solved} / ${stats.easy.total} Easy`;

    const medEl = document.getElementById("dashMediumStats");
    if (medEl) medEl.textContent = `${stats.medium.solved} / ${stats.medium.total} Med`;

    const hardEl = document.getElementById("dashHardStats");
    if (hardEl) hardEl.textContent = `${stats.hard.solved} / ${stats.hard.total} Hard`;

    const streakEl = document.getElementById("dashStreak");
    if (streakEl) streakEl.textContent = `${stats.streakDays} Days`;

    const pointsEl = document.getElementById("dashPoints");
    if (pointsEl) pointsEl.textContent = `${stats.points} pts`;

  // Render recent questions solved
  const recentList = document.getElementById("dashRecentSolvedList");
  if (recentList) {
    if (solvedItems.length > 0) {
      recentList.innerHTML = solvedItems.slice(0, 3).map(item => {
        let diffColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
        if (item.difficulty === "Medium") diffColor = "text-medium border-medium/30 bg-medium/10";
        if (item.difficulty === "Hard") diffColor = "text-hard border-hard/30 bg-hard/10";
        const acceptedBadge = item.runtime ? `✓ ${item.runtime}` : "✓ Solved";

        return `
          <div class="rounded-xl border border-white/5 bg-white/[0.02] frosted-panel p-3 flex flex-col justify-between hover:border-brand/30 transition">
            <div class="flex items-start justify-between gap-2">
              <span class="font-display font-semibold text-sm text-white">${item.title}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono border ${diffColor}">${item.difficulty}</span>
            </div>
            <div class="flex items-center justify-between mt-3 text-xs">
              <span class="text-white/40 font-mono text-[11px]">${acceptedBadge}</span>
              <a href="problem.html?id=${item.id}" class="text-brand-bright hover:underline font-mono text-xs">Review Code →</a>
            </div>
          </div>
        `;
      }).join("");
    } else {
      // Show recommendations if none yet
      const recommendations = allProblems.slice(0, 3);
      recentList.innerHTML = recommendations.map(p => `
        <div class="rounded-xl border border-white/5 bg-white/[0.02] frosted-panel p-3 flex flex-col justify-between hover:border-brand/30 transition">
          <div class="flex items-start justify-between gap-2">
            <span class="font-display font-semibold text-sm text-white">${p.number}. ${p.title}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono border text-easy border-easy/30 bg-easy/10">${p.difficulty}</span>
          </div>
          <div class="flex items-center justify-between mt-3 text-xs">
            <span class="text-white/40 font-mono text-[11px]">${p.category}</span>
            <a href="problem.html?id=${p.id}" class="text-brand-bright hover:underline font-mono text-xs">Solve Now →</a>
          </div>
        </div>
      `).join("");
    }
  }
});
}

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initMobileNav();
  initScrollReveal();
  initScoreRings();
  initSmoothAnchors();
  renderScoreBreakdown();
  renderDashboard();
});

// Module execution order can vary in dev; re-render real stats once the
// window has fully loaded so numbers never stick at their placeholder.
window.addEventListener("load", () => {
  renderDashboard();
});

export {};
