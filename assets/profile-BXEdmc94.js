import"./auth-Mq3JVvbZ.js";import"./user-stats-DeqBXm8I.js";import"./preload-helper-DFLZRFHf.js";(async()=>{try{const s=await window.UserStats.getUserStats(),n=(o,e)=>{const t=document.getElementById(o);t&&(t.textContent=e)};n("stat-problems",s.solvedTotal),n("stat-submissions",s.submissions.length),n("stat-streak",s.streakDays),n("stat-points",s.points),n("profile-score",Math.min(100,s.solvedTotal*5));const r=document.getElementById("profile-score-note");r&&(r.textContent=`/ 100 · ${s.solvedTotal} accepted problem${s.solvedTotal===1?"":"s"} × 5`);const i=document.getElementById("profile-skills-list");if(i){const o=s.skillsProgress||[];o.length===0?i.innerHTML=`
                <p class="text-xs text-inkdim font-mono">Skills config is empty — add entries in js/skills.js.</p>`:i.innerHTML=o.map(e=>`
              <a
                href="skill.html#${e.id}"
                class="block rounded-2xl border ${e.hasEvidence?"border-white/10":"border-white/5"} bg-white/[0.02] frosted-panel p-5 transition hover:border-brand/50 group"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-semibold group-hover:text-brand-bright transition-colors font-display text-lg">${e.name}</h3>
                    <p class="mt-1 text-sm text-white/40 font-mono">
                      ${e.solved>0?`${e.solved} solved${e.attempts>e.solved?` · ${e.attempts} attempted`:""}`:e.projects+e.assessments>0?`${e.projects} project${e.projects===1?"":"s"} · ${e.assessments} assessment${e.assessments===1?"":"s"}`:e.evidenceTypes.includes("problems")?"No evidence yet":"Proven via projects & assessments"}
                    </p>
                  </div>
                  <span class="font-mono text-2xl font-bold ${e.score>=60?"text-brand-bright":e.score>0?"text-cyan":"text-white/30"}> ${e.score} </span>
                </div>
                <div class="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div class="h-full rounded-full bg-gradient-to-r from-cyan to-brand" style="width:${e.score}%"></div>
                </div>
              </a>`).join("")}const l=document.getElementById("profile-projects-grid");if(l){const o=window.UserStats.getUserEvidence(s).filter(e=>e.type==="project"||e.type==="assessment");if(o.length===0)l.innerHTML=`
                <p class="text-xs text-inkdim font-mono md:col-span-2">No projects or assessments logged yet — add them from the Evidence page and they appear here.</p>`;else{const e=t=>t==="project"?"bg-cyan/10 text-cyan border-cyan/20":"bg-gold/10 text-gold border-gold/20";l.innerHTML=o.map(t=>`
              <div class="rounded-2xl border border-white/10 p-5 bg-white/[0.01] frosted-panel">
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold font-display text-base">${t.name}</h3>
                  <span class="text-xs font-mono px-2 py-0.5 rounded border ${e(t.type)}">${t.skill||t.type}</span>
                </div>
                <p class="mt-3 text-sm leading-6 text-white/40">${t.detail||""}</p>
                <p class="mt-2 font-mono text-[11px] text-white/25">${t.timestamp||""}</p>
              </div>`).join("")}}}catch{}})();
