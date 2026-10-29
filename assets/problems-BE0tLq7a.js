import"./auth-Mq3JVvbZ.js";import"./problems-data-DvvjgIGS.js";import"./preload-helper-DFLZRFHf.js";document.addEventListener("DOMContentLoaded",()=>{let n="all",i="all",c="all",s="";const f=window.CODING_PROBLEMS||[],m=window.ProgressTracker;function y(){m.getStats().then(e=>{g(e)}).catch(()=>{})}function g(e){document.getElementById("solvedTotalDisplay").textContent=e.solvedTotal,document.getElementById("totalProblemDisplay").textContent=`/ ${e.total} Solved`;const t=document.getElementById("progressCircle"),o=251.2-251.2*e.completionRate/100;t.style.strokeDashoffset=o,document.getElementById("easyStats").textContent=`${e.easy.solved} / ${e.easy.total}`,document.getElementById("easyBar").style.width=e.easy.total>0?`${e.easy.solved/e.easy.total*100}%`:"0%",document.getElementById("mediumStats").textContent=`${e.medium.solved} / ${e.medium.total}`,document.getElementById("mediumBar").style.width=e.medium.total>0?`${e.medium.solved/e.medium.total*100}%`:"0%",document.getElementById("hardStats").textContent=`${e.hard.solved} / ${e.hard.total}`,document.getElementById("hardBar").style.width=e.hard.total>0?`${e.hard.solved/e.hard.total*100}%`:"0%",document.getElementById("streakDisplay").textContent=`${e.streakDays} Days`,document.getElementById("pointsDisplay").textContent=`${e.points} pts`}function p(){return f.filter(e=>{const t=m.isSolved(e.id);if(n!=="all"&&e.difficulty!==n||i==="solved"&&!t||i==="unsolved"&&t||c!=="all"&&e.category!==c)return!1;if(s.trim()){const o=s.toLowerCase(),l=e.title.toLowerCase().includes(o),r=e.category.toLowerCase().includes(o),a=String(e.number)===o;if(!l&&!r&&!a)return!1}return!0})}function d(){const e=document.getElementById("problemsTableBody"),t=document.getElementById("emptyState"),o=p();if(e.innerHTML="",o.length===0){t.classList.remove("hidden");return}t.classList.add("hidden"),o.forEach(l=>{const r=m.isSolved(l.id);let a="text-emerald-400 bg-emerald-500/10 border-emerald-500/20";l.difficulty==="Medium"&&(a="text-amber-400 bg-amber-500/10 border-amber-500/20"),l.difficulty==="Hard"&&(a="text-danger bg-danger/10 border-danger/20");const u=document.createElement("tr");u.className="hover:bg-white/[0.02] transition-colors group cursor-pointer",u.onclick=h=>{h.target.tagName!=="A"&&h.target.tagName!=="BUTTON"&&(window.location.href=`problem.html?id=${l.id}`)},u.innerHTML=`
            <td class="py-4 pl-6 pr-3 text-center">
              ${r?`
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs" title="Solved">
                  ✓
                </span>
              `:`
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-white/20 text-xs">
                  •
                </span>
              `}
            </td>
            <td class="py-4 px-4 font-medium">
              <a href="problem.html?id=${l.id}" class="text-white group-hover:text-gold transition font-display flex items-center gap-2">
                <span class="text-white/40 font-mono text-xs">${l.number}.</span>
                <span>${l.title}</span>
              </a>
            </td>
            <td class="py-4 px-4 text-xs">
              <span class="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm text-white/70 font-mono">
                ${l.category}
              </span>
            </td>
            <td class="py-4 px-4 text-xs font-mono text-white/50">
              ${l.acceptance}
            </td>
            <td class="py-4 px-4 text-xs">
              <span class="px-2.5 py-1 rounded-full border text-xs font-medium ${a}">
                ${l.difficulty}
              </span>
            </td>
            <td class="py-4 pr-6 pl-4 text-right">
              <a href="problem.html?id=${l.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${r?"border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20":"border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"} text-xs font-medium transition">
                ${r?"Review":"Solve"} →
              </a>
            </td>
          `,e.appendChild(u)})}document.querySelectorAll(".filter-diff").forEach(e=>{e.addEventListener("click",()=>{document.querySelectorAll(".filter-diff").forEach(t=>{t.classList.remove("bg-white/10","text-white")}),e.classList.add("bg-white/10","text-white"),n=e.dataset.diff,d()})}),document.querySelectorAll(".filter-status").forEach(e=>{e.addEventListener("click",()=>{document.querySelectorAll(".filter-status").forEach(t=>{t.classList.remove("bg-white/10","text-white"),t.classList.add("text-white/60")}),e.classList.add("bg-white/10","text-white"),e.classList.remove("text-white/60"),i=e.dataset.status,d()})}),document.querySelectorAll(".cat-chip").forEach(e=>{e.addEventListener("click",()=>{document.querySelectorAll(".cat-chip").forEach(t=>{t.className="cat-chip px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 hover:text-white whitespace-nowrap transition"}),e.className="cat-chip px-3 py-1.5 rounded-full border border-gold/40 bg-gold/10 text-gold whitespace-nowrap font-medium transition",c=e.dataset.cat,d()})}),document.getElementById("searchInput").addEventListener("input",e=>{s=e.target.value,d()}),document.getElementById("resetFiltersBtn").addEventListener("click",()=>{n="all",i="all",c="all",s="",document.getElementById("searchInput").value="",document.querySelector('.filter-diff[data-diff="all"]').click(),document.querySelector('.filter-status[data-status="all"]').click(),document.querySelector('.cat-chip[data-cat="all"]').click()}),document.getElementById("pickRandomBtn").addEventListener("click",()=>{const e=f.filter(l=>!m.isSolved(l.id)),t=e.length>0?e:f,o=t[Math.floor(Math.random()*t.length)];o&&(window.location.href=`problem.html?id=${o.id}`)}),y(),d()});
