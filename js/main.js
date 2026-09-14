/**
 * SkillProof — Landing Page and Dashboard Interactivity
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
  if (!list || typeof SKILLPROOF_DATA === "undefined") return;

  const { factors } = SKILLPROOF_DATA.scoreBreakdown;

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
          <div class="factor-bar h-full rounded-full bg-gradient-to-r from-cyan to-gold"></div>
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
      animateCounter(totalCounter, SKILLPROOF_DATA.scoreBreakdown.total, 1300);
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
  if (!container || typeof SKILLPROOF_DATA === "undefined") return;

  container.innerHTML = SKILLPROOF_DATA.skills
    .map(
      (skill) => `
      <li class="flex items-center gap-4 py-3 border-b border-white/5 last:border-b-0">
        <span class="w-24 shrink-0 font-display text-sm text-slate-200">${skill.name}</span>
        <span class="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <span class="block h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300" style="width:${skill.score}%"></span>
        </span>
        <span class="w-10 shrink-0 text-right font-mono text-sm text-amber-300">${skill.score}</span>
      </li>`
    )
    .join("");
}

// Dashboard specific rendering
function renderDashboard() {
  if (typeof SKILLPROOF_DATA === "undefined") return;

  // Stats strip
  const statOverall = document.getElementById("stat-overall-score");
  if (statOverall) animateCounter(statOverall, SKILLPROOF_DATA.student.overallScore);

  const statSkills = document.getElementById("stat-total-skills");
  if (statSkills) statSkills.textContent = SKILLPROOF_DATA.skills.length;

  const statEvidence = document.getElementById("stat-total-evidence");
  if (statEvidence) {
    const totalEv = SKILLPROOF_DATA.skills.reduce((sum, s) => sum + s.evidenceCount, 0);
    animateCounter(statEvidence, totalEv);
  }

  // Evidence source totals
  SKILLPROOF_DATA.evidenceTypes.forEach((type) => {
    const el = document.querySelector(`[data-evidence-total="${type.id}"]`);
    if (el) animateCounter(el, type.count);
  });

  // Skill rings in evidence graph
  SKILLPROOF_DATA.skills.forEach((skill) => {
    const ringParent = document.querySelector(`[data-skill-ring="${skill.id}"]`);
    if (ringParent) {
      const ring = ringParent.querySelector(".score-ring");
      const score = ringParent.querySelector("[data-skill-score]");
      if (ring) {
        ring.setAttribute("data-score-ring", skill.score);
        ring.style.setProperty("--pct", skill.score);
      }
      if (score) animateCounter(score, skill.score);
    }
  });

  const overallRings = document.querySelectorAll("[data-overall-ring]");
  overallRings.forEach((r) => {
    r.setAttribute("data-score-ring", SKILLPROOF_DATA.student.overallScore);
    r.style.setProperty("--pct", SKILLPROOF_DATA.student.overallScore);
  });
  const overallScores = document.querySelectorAll("[data-overall-score]");
  overallScores.forEach((s) => animateCounter(s, SKILLPROOF_DATA.student.overallScore));

  // Skill cards grid
  const cardsGrid = document.getElementById("skill-cards-grid");
  if (cardsGrid) {
    cardsGrid.innerHTML = SKILLPROOF_DATA.skills
      .map(
        (s) => `
      <a href="skill.html" class="glass-card lift-on-hover rounded-2xl p-5 block transition-colors hover:border-gold/50 group">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-display font-semibold text-white group-hover:text-gold transition-colors">${s.name}</h3>
            <p class="text-xs text-inkdim font-mono">${s.confidence} confidence</p>
          </div>
          <span class="font-display font-semibold text-2xl text-gold">${s.score}</span>
        </div>
        <div class="h-1.5 rounded-full bg-white/5 overflow-hidden mb-4">
          <div class="h-full rounded-full bg-gradient-to-r from-cyan to-gold" style="width:${s.score}%"></div>
        </div>
        <div class="flex items-center justify-between text-xs text-inkdim font-mono">
          <span>${s.problems} problems</span>
          <span>${s.projects} projects</span>
          <span>${s.assessments} tests</span>
        </div>
      </a>`
      )
      .join("");
  }

  // Recent Activity
  const activityList = document.getElementById("recent-activity-list");
  if (activityList) {
    const sampleActivities = [
      { text: "Solved 'Merge K Sorted Lists'", time: "2h ago", badge: "Java" },
      { text: "Pushed 3 commits to library-mgmt", time: "1d ago", badge: "SQL" },
      { text: "Completed OOP Assessment (88%)", time: "3d ago", badge: "Java" },
      { text: "Added unit tests for auth middleware", time: "5d ago", badge: "JS" },
    ];
    activityList.innerHTML = sampleActivities
      .map(
        (a) => `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-sm">
        <div class="truncate mr-2">
          <p class="text-ink text-xs font-medium truncate">${a.text}</p>
          <span class="text-[10px] text-inkdim font-mono">${a.time}</span>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gold/10 text-gold border border-gold/20 shrink-0">${a.badge}</span>
      </div>`
      )
      .join("");
  }

  // Achievements
  const achievementsList = document.getElementById("recent-achievements-list");
  if (achievementsList) {
    achievementsList.innerHTML = SKILLPROOF_DATA.recentAchievements
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
  }

  // Weak area content
  const weakArea = document.getElementById("weak-area-content");
  if (weakArea) {
    const weakest = [...SKILLPROOF_DATA.skills].sort((a, b) => a.score - b.score)[0];
    if (weakest) {
      weakArea.innerHTML = `
        <div class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div class="flex items-center justify-between mb-2">
            <span class="font-display font-semibold text-white">${weakest.name}</span>
            <span class="font-mono text-sm text-gold">${weakest.score}/100</span>
          </div>
          <p class="text-xs text-inkdim leading-relaxed mb-4">
            Only ${weakest.evidenceCount} verified evidence records logged so far. Recommended to add project demonstrations or index queries to boost confidence.
          </p>
          <a href="evidence.html" class="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-amber-300 font-mono">
            + Log ${weakest.name} evidence →
          </a>
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initMobileNav();
  initScrollReveal();
  initScoreRings();
  initSmoothAnchors();
  renderExampleSkills();
  renderScoreBreakdown();
  renderDashboard();
});
