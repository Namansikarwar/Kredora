function h(){const o=document.getElementById("nav-toggle"),a=document.getElementById("mobile-menu"),t=document.getElementById("icon-open"),r=document.getElementById("icon-close");!o||!a||(o.addEventListener("click",()=>{const s=a.classList.toggle("open");o.setAttribute("aria-expanded",String(s)),t&&t.classList.toggle("hidden",s),r&&r.classList.toggle("hidden",!s)}),a.querySelectorAll("a").forEach(s=>{s.addEventListener("click",()=>{a.classList.remove("open"),o.setAttribute("aria-expanded","false"),t&&t.classList.remove("hidden"),r&&r.classList.add("hidden")})}))}function y(){const o=document.querySelectorAll(".reveal");if(!("IntersectionObserver"in window)||o.length===0){o.forEach(t=>t.classList.add("is-visible"));return}const a=new IntersectionObserver(t=>{t.forEach(r=>{r.isIntersecting&&(r.target.classList.add("is-visible"),a.unobserve(r.target))})},{threshold:.15,rootMargin:"0px 0px -40px 0px"});o.forEach(t=>a.observe(t))}function w(){const o=document.querySelectorAll("[data-score-ring]");if(o.length===0)return;const a=r=>{const s=Number(r.dataset.scoreRing)||0;requestAnimationFrame(()=>{r.style.setProperty("--pct",String(s))})};if(!("IntersectionObserver"in window)){o.forEach(a);return}const t=new IntersectionObserver(r=>{r.forEach(s=>{s.isIntersecting&&(a(s.target),t.unobserve(s.target))})},{threshold:.2});o.forEach(r=>t.observe(r))}function E(){document.querySelectorAll('a[href^="#"]').forEach(o=>{o.addEventListener("click",a=>{const t=o.getAttribute("href");if(t.length<=1)return;const r=document.querySelector(t);r&&(a.preventDefault(),r.scrollIntoView({behavior:"smooth",block:"start"}))})})}function x(o,a,t=1100){if(!o)return;const r=performance.now(),s=e=>1-Math.pow(1-e,3);function p(e){const i=Math.min((e-r)/t,1),l=Math.round(a*s(i));o.textContent=l,i<1&&requestAnimationFrame(p)}requestAnimationFrame(p)}function g(){const o=e=>{if(!e)return;const i=window.UserStats.getEvidenceTotals(e),l={"coding-problems":i.problems,projects:i.projects,assessments:i.assessments,activity:i.activity};for(const[c,d]of Object.entries(l)){const n=document.querySelector(`[data-evidence-total="${c}"]`);n&&x(n,d)}},a=e=>{if(!e)return;const i=document.getElementById("stat-points");i&&x(i,e.points);const l=document.getElementById("stat-streak");l&&(l.textContent=e.streakDays);const c=document.getElementById("stat-solved");c&&x(c,e.solvedTotal);const d=document.getElementById("stat-solved-total");d&&(d.textContent=` / ${e.total}`)};window.UserStats&&window.UserStats.getUserStats().then(e=>{o(e),a(e)});const t=e=>{const i=e.skillsProgress||[];document.querySelectorAll("[data-ring-slot]").forEach(d=>{const n=Number(d.getAttribute("data-ring-slot")),m=i[n];if(!m){d.style.display="none";return}d.style.display="";const v=d.querySelector(".score-ring"),u=d.querySelector("[data-skill-score]"),f=d.querySelector("[data-ring-label]");v&&(v.setAttribute("data-score-ring",m.score),v.style.setProperty("--pct",m.score)),u&&x(u,m.score),f&&(f.textContent=m.name)});const l=document.getElementById("ring-slots-mobile");l&&(l.innerHTML=i.map(d=>`
            <div class="flex flex-col items-center">
              <div class="score-ring w-16 h-16 rounded-full grid place-items-center" data-score-ring="${d.score}" style="--pct:${d.score}">
                <div class="score-ring-inner w-[52px] h-[52px] rounded-full grid place-items-center">
                  <span class="font-display font-semibold text-sm text-white" data-skill-score>${d.score}</span>
                </div>
              </div>
              <p class="text-xs text-inkdim mt-2">${d.name}</p>
            </div>`).join(""));const c=Math.min(100,e.solvedTotal*5);document.querySelectorAll("[data-overall-ring]").forEach(d=>{d.setAttribute("data-score-ring",c),d.style.setProperty("--pct",c)}),document.querySelectorAll("[data-overall-score]").forEach(d=>x(d,c))},r=e=>{const i=document.getElementById("skill-cards-grid");if(!i)return;const l=e.skillsProgress||[];if(l.length===0){i.innerHTML=`
        <div class="glass-card rounded-2xl p-5 text-xs text-inkdim font-mono sm:col-span-2 lg:col-span-4">
          Skills config is empty — add entries in js/skills.js.
        </div>`;return}const c=n=>{if(n.solved>0)return`${n.solved} solved${n.attempts>n.solved?` · ${n.attempts} attempted`:""}`;const m=[];return n.projects>0&&m.push(`${n.projects} project${n.projects===1?"":"s"}`),n.assessments>0&&m.push(`${n.assessments} assessment${n.assessments===1?"":"s"}`),m.length?m.join(" · "):n.evidenceTypes.includes("problems")?"No evidence yet":"Projects & assessments only"},d=n=>n.score>=60?"Strong":n.score>0?"Building":"No evidence yet";i.innerHTML=l.map(n=>`
      <a href="skill.html#${n.id}" class="glass-card lift-on-hover rounded-2xl p-5 block transition-colors hover:border-brand/50 group">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-display font-semibold text-white group-hover:text-brand-bright transition-colors">${n.name}</h3>
            <p class="text-xs text-inkdim font-mono">${c(n)}</p>
          </div>
          <span class="font-display font-semibold text-2xl ${n.score>0?"text-brand-bright":"text-white/30"}">${n.score}</span>
        </div>
        <div class="h-1.5 rounded-full bg-white/5 overflow-hidden mb-4">
          <div class="h-full rounded-full bg-gradient-to-r from-cyan to-brand" style="width:${n.score}%"></div>
        </div>
        <div class="flex items-center justify-between text-xs text-inkdim font-mono">
          <span>${d(n)}</span>
          <span>${n.score}/100</span>
        </div>
      </a>`).join("")};window.UserStats&&window.UserStats.getUserStats().then(e=>{o(e),a(e),t(e),r(e),S(e)});const s=document.getElementById("recent-activity-list");if(s){const e=i=>{const l=window.UserStats?window.UserStats.getRecentActivity(i.submissions,4):[];if(l.length===0){s.innerHTML=`
          <p class="text-xs text-inkdim font-mono">No submissions yet — solve a problem and it shows up here.</p>`;return}s.innerHTML=l.map(c=>`
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 frosted-panel text-sm">
        <div class="truncate mr-2">
          <p class="text-ink text-xs font-medium truncate">${c.text}</p>
          <span class="text-[10px] text-inkdim font-mono">${c.time}</span>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-brand/10 text-brand-bright border border-brand/20 shrink-0">${c.badge}</span>
      </div>`).join("")};window.UserStats?window.UserStats.getUserStats().then(e):s.innerHTML='<p class="text-xs text-inkdim font-mono">No submissions yet — solve a problem and it shows up here.</p>'}const p=document.getElementById("recent-achievements-list");if(p){const e=i=>{const l=window.UserStats?window.UserStats.getAchievements(i):[];p.innerHTML=l.map(c=>`
      <li class="flex items-start gap-3 text-sm">
        <span class="w-5 h-5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 grid place-items-center text-xs shrink-0 mt-0.5">✓</span>
        <div>
          <p class="text-ink text-xs sm:text-sm font-medium">${c.label}</p>
          <p class="text-[11px] text-inkdim font-mono mt-0.5">${c.date}</p>
        </div>
      </li>`).join("")};window.UserStats?window.UserStats.getUserStats().then(e):p.innerHTML='<li class="text-xs text-inkdim font-mono">Solve a problem to start earning achievements.</li>'}$()}function S(o){const a=document.getElementById("weak-area-content");if(!a)return;const r=(o.skillsProgress||[]).filter(e=>e.score<100);if(r.length===0){a.innerHTML=`
      <div class="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 frosted-panel">
        <div class="flex items-center justify-between mb-2">
          <span class="font-display font-semibold text-white">All caught up</span>
          <span class="font-mono text-sm text-emerald-400">100/100</span>
        </div>
        <p class="text-xs text-inkdim leading-relaxed">
          Every tracked skill is maxed out. Add new evidence to keep the streak going.
        </p>
      </div>`;return}const s=[...r].sort((e,i)=>e.score-i.score||e.solved-i.solved)[0],p=s.evidenceTypes.includes("problems")?`${s.solved} accepted problem${s.solved===1?"":"s"} in ${s.name} so far. More accepted submissions here raise this score the fastest.`:"SQL and MongoDB skills are proven through projects and assessments — add evidence from the Evidence page.";a.innerHTML=`
    <div class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 frosted-panel">
      <div class="flex items-center justify-between mb-2">
        <span class="font-display font-semibold text-white">${s.name}</span>
        <span class="font-mono text-sm text-brand-bright">${s.score}/100</span>
      </div>
      <p class="text-xs text-inkdim leading-relaxed mb-4">
        ${p}
      </p>
      <a href="${s.evidenceTypes.includes("problems")?"problem-list.html":"evidence.html"}" class="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-amber-300 font-mono">
        + ${s.evidenceTypes.includes("problems")?`Practice ${s.name}`:`Log ${s.name} evidence`} →
      </a>
    </div>`}function $(){if(!document.getElementById("dashSolvedCount")||!window.ProgressTracker)return;const a=window.ProgressTracker;a.getStats().then(t=>{const r=a.getSolvedMap(),s=Object.values(r),p=window.CODING_PROBLEMS||[],e=document.getElementById("dashSolvedCount");if(!e)return;e.textContent=t.solvedTotal;const i=document.getElementById("dashTotalCount");i&&(i.textContent=`/ ${t.total} Problems`);const l=document.getElementById("dashEasyStats");l&&(l.textContent=`${t.easy.solved} / ${t.easy.total} Easy`);const c=document.getElementById("dashMediumStats");c&&(c.textContent=`${t.medium.solved} / ${t.medium.total} Med`);const d=document.getElementById("dashHardStats");d&&(d.textContent=`${t.hard.solved} / ${t.hard.total} Hard`);const n=document.getElementById("dashStreak");n&&(n.textContent=`${t.streakDays} Days`);const m=document.getElementById("dashPoints");m&&(m.textContent=`${t.points} pts`);const v=document.getElementById("dashRecentSolvedList");if(v)if(s.length>0)v.innerHTML=s.slice(0,3).map(u=>{let f="text-emerald-400 border-emerald-500/30 bg-emerald-500/10";u.difficulty==="Medium"&&(f="text-medium border-medium/30 bg-medium/10"),u.difficulty==="Hard"&&(f="text-hard border-hard/30 bg-hard/10");const b=u.runtime?`✓ ${u.runtime}`:"✓ Solved";return`
          <div class="rounded-xl border border-white/5 bg-white/[0.02] frosted-panel p-3 flex flex-col justify-between hover:border-brand/30 transition">
            <div class="flex items-start justify-between gap-2">
              <span class="font-display font-semibold text-sm text-white">${u.title}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono border ${f}">${u.difficulty}</span>
            </div>
            <div class="flex items-center justify-between mt-3 text-xs">
              <span class="text-white/40 font-mono text-[11px]">${b}</span>
              <a href="problem.html?id=${u.id}" class="text-brand-bright hover:underline font-mono text-xs">Review Code →</a>
            </div>
          </div>
        `}).join("");else{const u=p.slice(0,3);v.innerHTML=u.map(f=>`
        <div class="rounded-xl border border-white/5 bg-white/[0.02] frosted-panel p-3 flex flex-col justify-between hover:border-brand/30 transition">
          <div class="flex items-start justify-between gap-2">
            <span class="font-display font-semibold text-sm text-white">${f.number}. ${f.title}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono border text-easy border-easy/30 bg-easy/10">${f.difficulty}</span>
          </div>
          <div class="flex items-center justify-between mt-3 text-xs">
            <span class="text-white/40 font-mono text-[11px]">${f.category}</span>
            <a href="problem.html?id=${f.id}" class="text-brand-bright hover:underline font-mono text-xs">Solve Now →</a>
          </div>
        </div>
      `).join("")}})}document.addEventListener("DOMContentLoaded",()=>{const o=document.getElementById("current-year");o&&(o.textContent=new Date().getFullYear()),h(),y(),w(),E(),g()});window.addEventListener("load",()=>{g()});
