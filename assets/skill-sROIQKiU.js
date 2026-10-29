import"./auth-Mq3JVvbZ.js";import"./user-stats-DeqBXm8I.js";import"./preload-helper-DFLZRFHf.js";function k(){window.UserStats&&window.UserStats.getUserStats().then(n=>{const m=n.skillsProgress||[],p=n.submissions||[],u=(location.hash||"").replace("#",""),f=document.getElementById("chip-evidence");f&&(f.textContent=`${p.filter(e=>e.status==="accepted"||e.status==="Accepted").length} accepted submissions`);const h=document.getElementById("chip-streak");h&&(h.textContent=`${n.streakDays}-day streak`);const $=Math.min(100,n.solvedTotal*5),v=document.getElementById("skill-score-value");v&&(v.textContent=$);const b=document.getElementById("skill-score-note");b&&(b.textContent=`${n.solvedTotal} accepted problem${n.solvedTotal===1?"":"s"} × 5, capped at 100`);const o=u?m.find(e=>e.id===u):null,i=o?[o]:m,l=document.getElementById("skill-hero-name"),y=document.getElementById("skill-hero-initial"),g=document.getElementById("skill-hero-copy"),d=o||i[0];d&&l?(l.textContent=d.name,y&&(y.textContent=d.name.charAt(0).toUpperCase()),g&&(g.textContent=o?`${d.category} — evidence types: ${d.evidenceTypes.join(", ")}. Every number below is computed from your own records.`:"Every score on this page is computed from your own records — accepted submissions and evidence you add. No self-reported ratings. The tracked skills come from the skills config.")):l&&(l.textContent="No skills configured");const r=document.getElementById("skill-breakdown-grid");r&&(i.length===0?r.innerHTML=`
              <div class="rounded-2xl border border-white/10 bg-[#111827]/80 frosted-panel p-6 text-xs text-inkdim font-mono md:col-span-2 lg:col-span-3">
                Skills config is empty — add entries in js/skills.js.
              </div>`:r.innerHTML=i.map(e=>{const s=e.solved>0?`${e.solved} solved${e.attempts>e.solved?` · ${e.attempts} attempted`:""}`:e.evidenceTypes.includes("problems")?"No evidence yet":"Proven via projects & assessments";return`
            <div class="rounded-2xl border ${o&&o.id!==e.id?"border-white/10":"border-brand/30"} bg-[#111827]/80 frosted-panel p-6" id="${e.id}">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-white">${e.name}</span>
                <span class="font-mono ${e.score>=60?"text-brand-bright":"text-cyan"} font-bold">${e.score}%</span>
              </div>
              <div class="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                <div class="h-full rounded-full bg-brand" style="width:${e.score}%"></div>
              </div>
              <p class="mt-3 text-xs text-white/40 font-mono">
                ${s}
              </p>
            </div>`}).join(""));const a=document.getElementById("skill-timeline");if(a){const e=p.filter(s=>s.status==="accepted"||s.status==="Accepted").sort((s,t)=>new Date(t.submittedAt)-new Date(s.submittedAt)).slice(0,5);if(e.length===0)a.innerHTML='<p class="text-xs text-inkdim font-mono">No accepted submissions yet — your solved problems appear here.</p>';else{const s=t=>t%2===0?"bg-brand":"bg-cyan";a.innerHTML=e.map((t,E)=>{var w;const C=t.problemTitle||t.problemId,I=t.difficulty?`${t.difficulty} · accepted`:"accepted",T=((w=window.UserStats.getRecentActivity([t],1)[0])==null?void 0:w.time)||"";return`
            <div class="flex gap-4">
              <div class="mt-1.5 h-3 w-3 rounded-full ${s(E)} shrink-0"></div>
              <div>
                <h3 class="font-semibold text-white">${C}</h3>
                <p class="mt-1 text-sm text-white/40">
                  Coding problem · ${I}
                </p>
                <p class="mt-2 font-mono text-xs text-white/25">
                  ${T}
                </p>
              </div>
            </div>`}).join("")}}const x=document.getElementById("skill-next-step-copy"),c=document.getElementById("skill-next-step-btn");if(i.length>0){const e=[...i].sort((s,t)=>s.score-t.score||s.solved-t.solved)[0];x&&(x.textContent=e.evidenceTypes.includes("problems")?`${e.solved} accepted problem${e.solved===1?"":"s"} in ${e.name} so far. More accepted submissions here raise this score the fastest.`:`${e.name} is proven through projects and assessments — add evidence to raise its score.`),c&&(c.href=e.evidenceTypes.includes("problems")?"problem-list.html":"evidence.html"),c&&(c.textContent=e.evidenceTypes.includes("problems")?"Practice in the Arena":"+ Add Evidence")}})}k();window.addEventListener("load",k);
