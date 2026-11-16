const LESSONS={"1":["Путь, перемещение, равномерное движение",["v = s / t","x = x₀ + vₓt","1 м/с = 3,6 км/ч","|перемещение| ≤ путь"]],"2":["Урок закрыт",[]],"3":["Урок закрыт",[]],"4":["Урок закрыт",[]],"5":["Урок закрыт",[]],"6":["Урок закрыт",[]],"7":["Урок закрыт",[]],"8":["Урок закрыт",[]],"9":["Урок закрыт",[]],"10":["Урок закрыт",[]],"11":["Урок закрыт",[]],"12":["Урок закрыт",[]],"13":["Урок закрыт",[]],"14":["Урок закрыт",[]],"15":["Урок закрыт",[]],"16":["Урок закрыт",[]],"17":["Урок закрыт",[]],"18":["Урок закрыт",[]],"19":["Урок закрыт",[]],"20":["Урок закрыт",[]],"21":["Урок закрыт",[]],"22":["Урок закрыт",[]],"23":["Урок закрыт",[]],"X":["Урок закрыт",[]]};
const MODULES=[
 {n:"Кинематика",s:"как движутся тела",l:["1","2","3","4","5"]},
 {n:"Динамика",s:"почему движутся",l:["6","7","8","9","10","11"]},
 {n:"Законы сохранения",s:"импульс, работа, энергия",l:["12","13","14","15"]},
 {n:"Давление и Архимед",s:"жидкости, газы, механизмы",l:["16","17","18","19","20"]},
 {n:"Колебания и итог",s:"маятники, звук, повторение",l:["21","22","23","X"]}
];
const TYPES={b:"Базовые",m:"Соответствие и утверждения",r:"Развёрнутые",e:"Эксперимент",q:"Качественные и текст"};
const SRC={F:"ФИПИ",D:"ДЕМО",K:"К-2026",S:"ШКОЛКОВО",A:"АВТОРСКАЯ"};
const byId={},byL={};
function addRows(rows,temp){const ordered=Object.keys(TYPES).flatMap(t=>rows.filter(r=>r[3]===t));const ord=new Map(ordered.map((r,i)=>[r[0],i+1]));rows.forEach(r=>{r[8]={...(r[8]||{}),number:ord.get(r[0])};byId[r[0]]=r;if(!temp){(byL[r[2]]=byL[r[2]]||[]).push(r)}});if(!temp)DATA=DATA.concat(rows)}
addRows(DATA.splice(0),false);
const isOpen=l=>!!byL[l];
let keys=LS0("mk_keys",{});
function LS0(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
const lessonDownloads = new Map();
const lockedLesson = l => l !== '1' && Object.hasOwn(LESSONS, l);
function loadLesson(l) {
 if (!lockedLesson(l)) throw new Error('Такого урока нет');
 if (!lessonDownloads.has(l)) {
  const request = fetch(`bank/${l}.json`).then(r => {
   if (!r.ok) throw new Error('Не удалось загрузить блок. Проверь интернет и попробуй снова.');
   return r.json();
  }).catch(error => { lessonDownloads.delete(l); throw error; });
  lessonDownloads.set(l, request);
 }
 return lessonDownloads.get(l);
}
async function decryptLesson(l, code) {
 const [encrypted, hash] = await Promise.all([loadLesson(l), crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))]);
 const key = await crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['decrypt']);
 const raw = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
 const text = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0,12) }, key, raw.slice(12));
 return JSON.parse(new TextDecoder().decode(text));
}
function openLesson(l, data) {
 if (isOpen(l)) return;
 LESSONS[l] = [data.t, data.f];
 addRows(data.r, false);
}
const CODE_RE=/(?:^|[^A-Za-z0-9])((?:\d{1,2}|X)-[A-Za-z0-9]{6})(?![A-Za-z0-9])/;
async function unlockCode(text){const m=String(text).toUpperCase().match(CODE_RE);if(!m)return {err:"Не вижу код — он выглядит так: 3-AB12CD"};const code=m[1];const l=code.split("-")[0];
 if(!lockedLesson(l))return {err:"Такого урока нет"};if(isOpen(l))return {l,already:true};
 try{const p=await decryptLesson(l,code);openLesson(l,p);keys[l]=code;try{localStorage.setItem("mk_keys",JSON.stringify(keys))}catch(e){}return {l}}catch(e){return {err:e.name === "OperationError" ? "Код не подошёл. Проверь буквы и цифры." : "Не удалось загрузить блок. Проверь интернет и попробуй снова."}}}
const checkable=OgeCore.checkable;
const norm=OgeCore.norm;
const isRight=OgeCore.correct;
function taskNumber(r){if(r[8]?.label)return r[8].label;if(r[8]?.number)return r[8].number;const rows=(byL[r[2]]||[]);const ordered=Object.keys(TYPES).flatMap(t=>rows.filter(x=>x[3]===t));return ordered.findIndex(x=>x[0]===r[0])+1||"?"}
function taskLabel(r){return r[8]?.label||`Блок ${r[2]} · №${taskNumber(r)}`}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtText=t=>esc(t).replace(/\[рисунок\]/g,'<span class="pic">рисунок</span>').replace(/\[формула\]/g,'<span class="pic">формула</span>');
function fmtRow(r){let k=0;const imgs=r[7]||[];let body=r[6];
 if([80176,35380,38211].includes(r[0])){body=body.split("|")[0].trim();if(r[0]===35380)body=body.replace("2t2","2t²");body+="\nВ ответе запиши сначала номер изменения "+(r[0]===38211?"модуля скорости, затем — модуля ускорения.":"модуля ускорения, затем — модуля скорости.")}
 return esc(body).replace(/\[рисунок\]/g,()=>{const src=imgs[k++];return src?`<img class="fig" src="${src}" alt="Рисунок к задаче" loading="lazy">`:'<span class="pic">рисунок</span>'}).replace(/\[формула\]/g,'<span class="pic">формула</span>')}
const link=r=>`https://3.shkolkovo.online/catalog/${r[1]}/${r[0]}`;
/* storage */
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let solved=new Set(LS.get("mk_solved",[]));      // ids solved correctly (or marked)
let tries=LS.get("mk_tries",{});                  // id -> [attempts, correct]
let history=LS.get("mk_hist",[]);                 // results
let myName=LS.get("mk_name","");
const saveAll=()=>{LS.set("mk_solved",[...solved]);LS.set("mk_tries",tries);LS.set("mk_hist",history)};
/* codes */
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("show"),2200)}
async function copy(text,ta){try{await navigator.clipboard.writeText(text);toast("Скопировано")}catch(e){if(ta){ta.focus();ta.select()}toast("Выдели текст и скопируй вручную")}}
/* ====== state ====== */
let view = 'bank';
const bank = { mod: LS.get('mk_mod', 0), type: 'all', q: '', open: new Set() };
const runs = { test: null, hw: null };
const drafts = OgeDrafts.store({
 getItem:key=>localStorage.getItem(key), setItem:(key,value)=>localStorage.setItem(key,value), removeItem:key=>localStorage.removeItem(key),
});
let testTimer;

let boardRequest;
function loadBoard() {
 if (!boardRequest) boardRequest = new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = 'task-board.js?v=20261116';
  script.onload = () => resolve(BD);
  script.onerror = () => { script.remove(); boardRequest = null; reject(new Error('Доска не загрузилась. Проверь интернет и попробуй ещё раз.')); };
  document.body.append(script);
 });
 return boardRequest;
}
function openBoard(...args) { loadBoard().then(board => board.open(...args)).catch(error => toast(error.message)); }
const V=document.getElementById("view");
function setView(v){view=v;document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected",t.dataset.v===v));render();window.scrollTo({top:0,behavior:"smooth"})}
document.getElementById("tabs").addEventListener("click",e=>{const t=e.target.closest(".tab");if(t)setView(t.dataset.v)});
function render(){document.body.dataset.frogAssessment=Object.values(runs).some(run => run && !run.done)?"active":"inactive";window.dispatchEvent(new Event("oge-study-state"));({bank:renderBank,test:renderTest,hw:renderHw,prog:renderProg})[view]()}
/* ====== BANK ====== */
function lessonStats(l){const a=byL[l]||[];return [a.filter(r=>solved.has(r[0])).length,a.length]}
function modStats(m){let s=0,n=0;m.l.forEach(l=>{const [a,b]=lessonStats(l);s+=a;n+=b});return [s,n]}
function renderBank(){
  const total=Object.values(COUNTS).reduce((a,b)=>a+b,0),ns=solved.size,openN=Object.keys(LESSONS).filter(isOpen).length;
  V.innerHTML=`<section class="view">
  <div class="hero"><div class="kicker">Банк задач · <b>${total}</b> задач · открыто уроков: <b>${openN}</b> из ${Object.keys(LESSONS).length}</div>
  <h1>Задачи по физике</h1>
  <p class="lead">Уроки открываются по мере занятий: после урока репетитор присылает код — вставь его ниже. Вписывай ответ — сайт сразу проверит. Нужен рисунок — жми «Условие ↗».</p>
  ${runs.hw && !runs.hw.done ? `<p><button class="btn primary" data-continue="hw">Продолжить домашку</button></p>` : ''}
  <p><a class="btn small board" href="fipi-mechanics.html" style="text-decoration:none">↗ Все задания ФИПИ по механике</a></p>
  <div class="unlock"><span class="lockico" aria-hidden="true">⌁</span><input type="text" id="uc" placeholder="Код урока, например 3-AB12CD" autocomplete="off" aria-label="Код урока"><button class="btn primary" id="ub">Открыть урок</button><span id="um" class="t2"></span></div>
  <div class="stats"><span class="stat"><b>${ns}</b>решено</span><span class="stat"><b>${DATA.filter(checkable).length}</b>с автопроверкой</span><span class="stat"><b>5</b>модулей</span><a class="btn small board" href="forces.html" style="text-decoration:none">↗ Силы и векторы</a><a class="btn small board" href="grafiki.html" style="margin-left:auto;text-decoration:none">📈 Тренажёр графиков</a><button class="btn small board" id="freeBd">✎ Чистая доска</button></div></div>
  <div class="mods" id="mods">${MODULES.map((m,i)=>{const [s,n]=modStats(m);return `<button class="mod" data-i="${i}" aria-pressed="${i===bank.mod}"><div class="mi">МОДУЛЬ ${i+1}</div><div class="mn">${m.n}</div><div class="ms">${m.s} · открыто ${m.l.filter(isOpen).length}/${m.l.length}</div><div class="meter"><i style="width:${n?s/n*100:0}%"></i></div></button>`}).join("")}</div>
  <div class="tools"><input type="search" id="bq" placeholder="Поиск по условию: «плотность», «маятник»…" value="${esc(bank.q)}" autocomplete="off">
  <div id="bt" style="display:flex;flex-wrap:wrap;gap:6px">${[["all","Все"],...Object.entries(TYPES)].map(([k,v])=>`<button class="chip" data-t="${k}" aria-pressed="${bank.type===k}">${v}</button>`).join("")}</div></div>
  <div id="lessons"></div></section>`;
  renderLessons();
  V.querySelector('[data-continue="hw"]')?.addEventListener('click', () => setView('hw'));
  V.querySelector("#mods").onclick=e=>{const b=e.target.closest(".mod");if(!b)return;bank.mod=+b.dataset.i;LS.set("mk_mod",bank.mod);V.querySelectorAll(".mod").forEach(x=>x.setAttribute("aria-pressed",x===b));bank.open.clear();renderLessons()};
  const doUnlock=async()=>{const um=V.querySelector("#um");um.textContent="Проверяю…";um.style.color="";const r=await unlockCode(V.querySelector("#uc").value);if(view!=="bank"||!um.isConnected)return;
    if(r.err){um.textContent=r.err;um.style.color="var(--err)";const u=V.querySelector(".unlock");u.classList.remove("bad");void u.offsetWidth;u.classList.add("bad");return}
    const mi=MODULES.findIndex(m=>m.l.includes(r.l));bank.mod=mi;LS.set("mk_mod",mi);bank.open=new Set([r.l]);renderBank();toast(r.already?"Этот урок уже открыт":(r.l==="X"?"Бонус открыт!":"Урок "+r.l+" открыт!"));if(!r.already)confetti();
    setTimeout(()=>{const d=V.querySelector(`.lesson[data-l="${r.l}"]`);if(d)d.scrollIntoView({behavior:"smooth",block:"start"})},250)};
  V.querySelector("#ub").onclick=doUnlock;V.querySelector("#uc").onkeydown=e=>{if(e.key==="Enter")doUnlock()};
  V.querySelector("#bq").oninput=e=>{bank.q=e.target.value.trim();renderLessons()};
  V.querySelector("#bt").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;bank.type=c.dataset.t;V.querySelectorAll("#bt .chip").forEach(x=>x.setAttribute("aria-pressed",x===c));renderLessons()};
}
function filtered(l){if(!isOpen(l))return [];const q=bank.q.toLowerCase();return (byL[l]||[]).filter(r=>(bank.type==="all"||r[3]===bank.type)&&(!q||r[6].toLowerCase().includes(q)))}
function taskCard(r,i){const ok=solved.has(r[0]);const chk=checkable(r);
 return `<li class="task${ok?" ok":""}" data-id="${r[0]}"><p class="tt"><span class="tn">${i}.</span>${fmtRow(r)}</p><div class="tr"><b class="src ${r[5]}">${SRC[r[5]]}</b>${r[1]?`<a href="${link(r)}" target="_blank" rel="noopener">Условие ↗</a>`:""}
 ${chk?`<span class="ansbox"><input type="text" inputmode="${r[3]==='m'?'text':'decimal'}" placeholder="ответ" aria-label="Ответ к задаче ${i}" id="a${r[0]}"><button class="btn small" data-act="check">Проверить</button></span><button class="linkbtn" data-act="show">показать ответ</button>`
 :(r[4]&&r[4].length<14?`<button class="linkbtn" data-act="show">показать ответ</button>`:`<span class="muted" style="font-size:12.5px">ответ — в решении по ссылке</span>`)}
 <button class="btn small board" data-act="board" data-n="${i}">✎ Решить на доске</button><button class="linkbtn" data-act="mark">${ok?"снять отметку":"отметить решённой"}</button><span class="vslot"></span></div></li>`}
function renderLessons(){const box=V.querySelector("#lessons");const m=MODULES[bank.mod];const q=bank.q;
 const parts=m.l.map(l=>{if(!isOpen(l)){if(q||bank.type!=="all")return "";return `<div class="lesson locked"><div class="lsum"><span class="ln">${l==="X"?"БОНУС":"УРОК "+l}</span><span class="lt">Закрыто · откроется после занятия</span><span class="lm">${COUNTS[l]||0} задач</span></div></div>`}const list=filtered(l);if(!list.length&&(q||bank.type!=="all"))return "";const [s,n]=lessonStats(l);const open=bank.open.has(l)||!!q;
   return `<details class="lesson" data-l="${l}" ${open?"open":""}><summary><span class="ln">${l==="X"?"БОНУС":"УРОК "+l}</span><span class="lt">${LESSONS[l][0]}<span class="chev">›</span></span><span class="lm"><span class="lmt">${s} / ${n}</span><div class="meter"><i style="width:${n?s/n*100:0}%"></i></div></span></summary><div class="lb">${open?lessonBody(l):""}</div></details>`}).join("");
 box.innerHTML=parts||`<div class="panel t2">${q||bank.type!=="all"?"Ничего не нашлось в открытых уроках.":"В этом модуле пока нет открытых уроков."}</div>`;
 box.querySelectorAll(".lesson").forEach(d=>d.addEventListener("toggle",()=>{const l=d.dataset.l;if(d.open){bank.open.add(l);const b=d.querySelector(".lb");if(!b.innerHTML)b.innerHTML=lessonBody(l)}else bank.open.delete(l)}));
}
function lessonBody(l){const list=filtered(l);let k=0,h=`<div class="formulas">${LESSONS[l][1].map(f=>`<span>${esc(l==="4"&&f.startsWith("s =")?f.replace(/^s =/,"Δx ="):f)}</span>`).join("")}${l==="4"?"<p>По оси формулы дают перемещение Δx. Путь s равен |Δx| только без разворота; при развороте сложи пути отдельных участков.</p>":""}</div>`;
 for(const t of Object.keys(TYPES)){const g=list.filter(r=>r[3]===t);if(!g.length)continue;h+=`<div class="gh">${TYPES[t]} · ${g.length}</div><ol class="tasks">${g.map(r=>taskCard(r,taskNumber(r))).join("")}</ol>`}
 return h||`<p class="t2">Нет задач по фильтру.</p>`}
function refreshLessonMeta(l){V.querySelector(".stats .stat b").textContent=solved.size;const d=V.querySelector(`.lesson[data-l="${l}"]`);if(!d)return;const [s,n]=lessonStats(l);d.querySelector(".lmt").textContent=`${s} / ${n}`;d.querySelector(".lm .meter i").style.width=(n?s/n*100:0)+"%";
 V.querySelectorAll(".mod").forEach((b,i)=>{const [a,c]=modStats(MODULES[i]);b.querySelector(".meter i").style.width=(c?a/c*100:0)+"%"})}
function verdict(li,cls,txt){const v=li.querySelector(".vslot");v.innerHTML=`<span class="verdict ${cls} pop">${txt}</span>`}
V.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b||view!=="bank")return;const li=b.closest(".task");const id=+li.dataset.id;const r=byId[id];const act=b.dataset.act;
 if(act==="check"){const inp=li.querySelector("input");const val=inp.value;if(!val.trim()){inp.focus();return}const t=tries[id]||[0,0];t[0]++;
   if(isRight(r,val)){t[1]++;solved.add(id);li.classList.add("ok");verdict(li,"ok","✓ верно");b.closest(".tr").querySelector('[data-act="mark"]').textContent="снять отметку";burst(b)}
   else{li.classList.remove("bad");void li.offsetWidth;li.classList.add("bad");verdict(li,"no","✗ пока нет")}
   tries[id]=t;saveAll();refreshLessonMeta(r[2])}
 if(act==="show"){const seen=LS.get("mk_seen_answers",{});seen[id]=Date.now();LS.set("mk_seen_answers",seen);verdict(li,"show","ответ: "+r[4])}
 if(act==="board"){openBoard(id,r,(r[2]==="X"?"Бонус":"Блок "+r[2])+" · задача "+b.dataset.n)}
 if(act==="mark"){if(solved.has(id)){solved.delete(id);li.classList.remove("ok");b.textContent="отметить решённой"}else{solved.add(id);li.classList.add("ok");b.textContent="снять отметку"}saveAll();refreshLessonMeta(r[2])}
});
V.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches(".ansbox input")){e.preventDefault();e.target.parentElement.querySelector('[data-act="check"]').click()}});
/* ====== TEST ENGINE (test + homework) ====== */
let testCfg={lessons:new Set(["1"]),count:10,timer:true};
function renderTest(){const run=runs.test;if(run)return run.done?renderResult(run):renderRun(run);
 testCfg.lessons=new Set([...testCfg.lessons].filter(isOpen));if(!testCfg.lessons.size)Object.keys(LESSONS).filter(isOpen).forEach(l=>testCfg.lessons.add(l));
 const avail=[...testCfg.lessons].reduce((a,l)=>a+(byL[l]||[]).filter(checkable).length,0);
 V.innerHTML=`<section class="view"><div class="hero"><div class="kicker">Режим · <b>тестовый вариант</b></div><h1>Собери <span class="grad">вариант</span></h1><p class="lead">Выбери уроки — сайт наберёт случайные задачи с автопроверкой. В конце — оценка, разбор ошибок и код результата для репетитора.</p></div>
 <div class="panel" style="display:grid;gap:16px">
  <div class="field"><label for="nm">Как тебя зовут?</label><input type="text" id="nm" value="${esc(myName)}" placeholder="Имя" maxlength="40"></div>
  <div class="field"><label>Уроки</label>${MODULES.map((m,i)=>`<div style="display:grid;gap:6px"><span class="muted" style="font-size:12px;font-family:var(--f-m);letter-spacing:.1em">МОДУЛЬ ${i+1} · ${m.n.toUpperCase()} <button class="linkbtn" data-mod="${i}">выбрать весь</button></span><div class="lessonpick">${m.l.map(l=>isOpen(l)?((byL[l]||[]).some(checkable)?`<button class="chip" data-l="${l}" aria-pressed="${testCfg.lessons.has(l)}">${l==="X"?"Бонус":"Урок "+l}</button>`:""):`<span class="chip" style="opacity:.45;cursor:default">🔒 ${l==="X"?"Бонус":"Урок "+l}</span>`).join("")}</div></div>`).join("")}</div>
  <div class="grid2"><div class="field"><label>Сколько задач</label><div class="seg" id="cnt">${[5,10,15,20].map(n=>`<button data-n="${n}" aria-pressed="${testCfg.count===n}">${n}</button>`).join("")}</div></div>
  <div class="field"><label>Таймер</label><div class="seg" id="tm"><button data-t="1" aria-pressed="${testCfg.timer}">2 мин / задача</button><button data-t="0" aria-pressed="${!testCfg.timer}">без таймера</button></div></div></div>
  <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button class="btn primary" id="go" ${avail?"":"disabled"}>Начать вариант →</button><span class="muted num">в выбранных уроках: ${avail} задач с автопроверкой</span></div>
 </div></section>`;
 V.querySelector("#nm").onchange=e=>{myName=e.target.value.trim();LS.set("mk_name",myName)};
 V.querySelectorAll(".lessonpick .chip").forEach(c=>c.onclick=()=>{const l=c.dataset.l;testCfg.lessons.has(l)?testCfg.lessons.delete(l):testCfg.lessons.add(l);renderTest()});
 V.querySelectorAll("[data-mod]").forEach(b=>b.onclick=()=>{MODULES[+b.dataset.mod].l.forEach(l=>{if(isOpen(l)&&(byL[l]||[]).some(checkable))testCfg.lessons.add(l)});renderTest()});
 V.querySelectorAll("#cnt button").forEach(b=>b.onclick=()=>{testCfg.count=+b.dataset.n;renderTest()});
 V.querySelectorAll("#tm button").forEach(b=>b.onclick=()=>{testCfg.timer=b.dataset.t==="1";renderTest()});
 V.querySelector("#go").onclick=()=>{myName=V.querySelector("#nm").value.trim();LS.set("mk_name",myName);
   const pool=DATA.filter(r=>testCfg.lessons.has(r[2])&&checkable(r));
   for (let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
   // prefer not-yet-solved
   pool.sort((a,b)=>solved.has(a[0])-solved.has(b[0]));
   const ids=pool.slice(0,testCfg.count).map(r=>r[0]).sort((a,b)=>Object.keys(LESSONS).indexOf(byId[a][2])-Object.keys(LESSONS).indexOf(byId[b][2]));
   startTest(ids,testCfg.timer?ids.length*120:0)}}
function saveRun(run) {
 try {
  drafts.save(run);
  run.persistError = false;
  return true;
 } catch {
  run.persistError = true;
  return false;
 }
}
function startTest(ids, limit) {
 const run = { kind:'test', title:'Тестовый вариант', ids, answers:{}, unsaved:{}, start:Date.now(), limit, done:false, draftId:crypto.randomUUID() };
 runs.test = run;
 saveRun(run);
 updateTimer();
 render();
}
function updateTimer() {
 clearInterval(testTimer);
 if (runs.test?.limit && !runs.test.done) testTimer = setInterval(tick, 1000);
}
function tick() {
 const run = runs.test;
 if (!run || run.done) return updateTimer();
 const left = timeLeft(run);
 if (view === 'test') {
  const timer = document.getElementById('timer');
  if (timer) timer.textContent = fmtTime(left);
 }
 if (!left) { finish(run); toast('Время вышло. Вариант сдан.'); }
}
const timeLeft = run => Math.max(0, run.limit - Math.floor((Date.now() - run.start) / 1000));
const fmtTime = seconds => `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
const answer = (run, id) => run.answers[id] || '';
const savedNotice = run => run.persistError ? 'Браузер не сохранил все ответы. Оставь страницу открытой и скопируй результат после сдачи.' : 'Ответы сохраняются в этом браузере.';
function syncAnswers(run) {
 try {
  drafts.restoreAnswers(run);
  Object.assign(run.answers, run.unsaved);
 } catch {
  run.persistError = true;
 }
}
function updateFilled(run) {
 const filled = run.ids.filter(id => answer(run,id).trim()).length;
 V.querySelector('#bp').style.width = `${filled/run.ids.length*100}%`;
 V.querySelector('#fc').textContent = `${filled}/${run.ids.length}`;
 V.querySelector('#save-run').textContent = savedNotice(run);
}
function renderRun(run) {
 syncAnswers(run);
 V.innerHTML = `<section class="view study-run">
  <div class="hero study-heading"><div class="kicker">${run.kind==='hw'?'Домашка':'Вариант'} · <b>${run.ids.length}</b> задач</div>
  <h1>${esc(run.title)}</h1><p class="lead">В коротких заданиях введи число без единиц или номера утверждений. В развёрнутых запиши ход решения. Если решаешь на бумаге, укажи «решение на фото».</p></div>
  ${run.kind==='hw' ? `<label class="study-name" for="study-name">Твоё имя<input id="study-name" maxlength="40" value="${esc(myName)}" autocomplete="given-name"></label>` : ''}
  <p id="save-run" class="study-save" role="status"></p>
  <div class="testhead"><span class="timer" id="timer" aria-label="Оставшееся время">${run.limit?fmtTime(timeLeft(run)):'∞'}</span><div class="bigprog"><i id="bp"></i></div><span class="muted num" id="fc"></span><button class="btn primary small" id="fin">Сдать</button></div>
  <p id="submit-top" class="study-warning" role="status" hidden></p>
  <div class="study-questions">${run.ids.map((id,i)=>{
   const row = byId[id], value = answer(run,id), title = `№${i+1} · ${taskLabel(row)}`;
   return `<div class="q${value.trim()?' filled':''}" data-id="${id}"><div class="qn">${esc(title)}</div><p class="tt">${fmtRow(row)}</p><div class="tr">${checkable(row)?`<input type="text" inputmode="${row[3]==='m'?'text':'decimal'}" maxlength="150" placeholder="ответ" value="${esc(value)}" aria-label="Ответ к задаче ${i+1}" id="q${id}">`:`<label class="study-written">Решение — проверит преподаватель<textarea rows="4" maxlength="2000" placeholder="Рисунок словами, закон, вычисления и вывод" aria-label="Решение задачи ${i+1}" id="q${id}">${esc(value)}</textarea></label>`}${row[1]?`<a href="${link(row)}" target="_blank" rel="noopener">Условие ↗</a>`:''}<b class="src ${row[5]}">${SRC[row[5]]}</b></div></div>`;
  }).join('')}</div>
  <p id="submit-bottom" class="study-warning" role="status" hidden></p>
  <div class="study-actions"><button class="btn primary" id="fin2">Сдать и проверить</button><button class="btn ghost" id="quit">${run.kind==='hw'?'Сменить домашку':'Закончить без сдачи'}</button></div>
 </section>`;
 const name = V.querySelector('#study-name');
 if (name) name.oninput = () => { myName=name.value.trim(); LS.set('mk_name',myName); };
 V.querySelectorAll('.q input,.q textarea').forEach(input => input.oninput = () => {
  const question = input.closest('.q'), id = Number(question.dataset.id);
  run.answers[id] = input.value;
  try {
   drafts.write(run,id,input.value);
   delete run.unsaved[id];
   if (run.persistError && !Object.keys(run.unsaved).length) saveRun(run);
  } catch { run.unsaved[id] = input.value; run.persistError = true; }
  question.classList.toggle('filled',!!input.value.trim());
  clearConfirmation();
  updateFilled(run);
 });
 for (const [id, noticeId] of [['fin','submit-top'],['fin2','submit-bottom']]) {
  const button = V.querySelector(`#${id}`), warning = V.querySelector(`#${noticeId}`);
  button.dataset.label = button.textContent;
  button.onclick = () => {
   syncAnswers(run);
   const blanks = run.ids.flatMap((taskId,i) => answer(run,taskId).trim() ? [] : [i+1]);
   const signature = blanks.join(', ');
   if (blanks.length && button.dataset.confirm !== signature) {
    clearConfirmation();
    button.dataset.confirm = signature;
    warning.textContent = `Без ответа ${blanks.length===1?'задание':'задания'} № ${signature}.`;
    warning.hidden = false;
    button.textContent = 'Всё равно сдать';
    return;
   }
   finish(run);
  };
 }
 V.querySelector('#quit').onclick = event => {
  if (run.kind === 'test' && !event.currentTarget.dataset.confirm) {
   event.currentTarget.dataset.confirm = 'yes';
   event.currentTarget.textContent = 'Сбросить этот вариант';
   return;
  }
  leaveRun(run);
 };
 updateFilled(run);
}
function clearConfirmation() {
 for (const button of V.querySelectorAll('#fin,#fin2')) {
  delete button.dataset.confirm;
  button.textContent = button.dataset.label;
 }
 for (const warning of V.querySelectorAll('.study-warning')) warning.hidden = true;
}
function finish(run) {
 if (run.done) return;
 const previous = run.kind === 'hw' && drafts.homework(run.draftId);
 if (previous?.done) {
  runs.hw = previous;
  if (view === 'hw') render();
  return;
 }
 syncAnswers(run);
 run.done = true;
 run.name = myName;
 run.dur = Math.round((Date.now()-run.start)/1000);
 run.res = run.ids.map(id => {
  const value = answer(run,id), ok = isRight(byId[id],value);
  if (ok !== null && value.trim()) {
   const attempt = tries[id] || [0,0];
   attempt[0]++;
   if (ok) { attempt[1]++; solved.add(id); }
   tries[id] = attempt;
  }
  return [id,value,ok===null?null:ok?1:0];
 });
 const stats = OgeCore.summary(run.res);
 run.code = OgeAssignments.encode('RES-', {v:3,n:run.name,k:run.kind,t:run.title,s:run.start,d:run.dur,h:run.assignment||undefined,
  r:run.res.map(([id,value,ok])=>[id.toString(36),value.slice(0,2000),ok])});
 history = LS.get('mk_hist', history);
 if (!history.some(record => record.code === run.code)) history.unshift({k:run.kind,t:run.title,s:run.start,d:run.dur,sc:stats.correct,n:stats.automatic,pending:stats.pending,code:run.code});
 history = history.slice(0,60);
 if (saveRun(run)) {
  try { drafts.discardAnswers(run); } catch {}
 }
 saveAll();
 if (run.kind === 'test') updateTimer();
 if (view !== run.kind) document.body.dataset.frogAssessment = Object.values(runs).some(item=>item&&!item.done)?'active':'inactive';
 if (view === run.kind) {
  render();
  V.querySelector('h1')?.focus({preventScroll:true});
  window.scrollTo(0,0);
  if (stats.automatic && stats.correct/stats.automatic>=.8 && !stats.pending) setTimeout(confetti,300);
 }
}
function grade(p){return p>=.85?["5","отлично","var(--ok)"]:p>=.65?["4","хорошо","var(--cyan)"]:p>=.4?["3","есть над чем поработать","var(--amber)"]:["2","разберём ошибки","var(--err)"]}
function renderResult(run) {
 const stats=OgeCore.summary(run.res||[]), blanks=(run.res||[]).filter(([,value])=>!String(value||'').trim()).length;
 const msg=`${run.name||myName||'Ученик'}: ${run.title}. Автопроверка: ${stats.correct}/${stats.automatic}. На проверке у преподавателя: ${stats.pending}. Пропущено: ${blanks}. Время ${fmtTime(run.dur)}.\nКод результата: ${run.code}`;
 V.innerHTML=`<section class="view"><div class="hero"><h1 tabindex="-1">${esc(run.title)}</h1><p class="lead">Автопроверка: <b>${stats.correct} из ${stats.automatic}</b>. ${stats.pending?`Ожидают проверки: ${stats.pending}. `:''}${blanks?`Пропущено: ${blanks}.`:''}</p></div>
 <div class="panel"><h2>Отправь преподавателю</h2><p>${run.persistError?'Браузер не сохранил результат. Скопируй сообщение сейчас.':'Скопируй сообщение и приложи фотографии бумажных решений.'}</p><textarea id="msg" rows="4" aria-label="Сообщение преподавателю" readonly>${esc(msg)}</textarea><button class="btn primary" id="cp">Скопировать сообщение</button></div>
 <div class="rlist">${(run.res||[]).map(([id,value,ok],i)=>{
  const row=byId[id], empty=!String(value||'').trim();
  return `<div class="ri ${empty||ok===null?'':ok?'ok':'no'}"><span class="mk">${empty?'—':ok===null?'◷':ok?'✓':'✗'}</span><div><b>№${i+1} · ${esc(row?taskLabel(row):'Задание')}</b>${row?`<p>${fmtText(row[6].slice(0,220))}</p>`:''}<p style="white-space:pre-wrap">Твой ответ: ${esc(value||'—')}</p>${empty?'<p>Без ответа</p>':ok===null?'<p>Ожидает проверки преподавателя</p>':ok||!row?'':`<p>Ответ: ${esc(row[4])}</p>`}${row?.[1]?`<a href="${link(row)}" target="_blank" rel="noopener">Разбор ↗</a>`:''}</div></div>`;
 }).join('')}</div>
 <div class="study-actions"><button class="btn" id="again">${run.kind==='hw'?'К домашкам':'Новый вариант'}</button><button class="btn" id="toprog">Мой прогресс</button></div></section>`;
 V.querySelector('#cp').onclick=()=>copy(msg,V.querySelector('#msg'));
 V.querySelector('#again').onclick=()=>leaveRun(run);
 V.querySelector('#toprog').onclick=()=>leaveRun(run,'prog');
}
function leaveRun(run, target) {
 try {
  if (run.kind==='test'&&!run.done) drafts.discardTest(run);
  else drafts.detach(run);
 } catch {}
 runs[run.kind] = null;
 if (run.kind === 'test') updateTimer();
 if (run.kind === 'hw' && ['hw','set'].some(key => new URLSearchParams(location.hash.slice(1)).has(key))) {
  historyReplace();
 }
 if (target) setView(target);
 else render();
}
function historyReplace() { window.history.replaceState(null,'',location.pathname+location.search); }
async function parseHomework(text) {
 const hw = OgeAssignments.homework(text);
 const lessons = new Set(hw.keys.map(code=>code.split('-')[0]));
 await Promise.all(hw.keys.map(async code => {
  const l = code.split('-')[0];
  if (!lockedLesson(l) || isOpen(l)) return;
  try { addRows((await decryptLesson(l,code)).r,true); }
  catch { throw new Error(`Не удалось загрузить блок ${l}. Проверь интернет и попроси преподавателя проверить ссылку.`); }
 }));
 for (const row of hw.rows) byId[row[0]] = row;
 if (hw.ids.some(id => !byId[id] || (id>=-100000 && !isOpen(byId[id][2]) && !lessons.has(byId[id][2])))) {
  throw new Error('Загрузились не все задания. Попроси преподавателя обновить ссылку.');
 }
 return hw;
}
async function openHomework(text) {
 const hw = await parseHomework(text);
 const draftId = await OgeDrafts.homeworkId(hw.code);
 const legacy = drafts.legacyHomework(hw.code);
 const active = drafts.active('hw');
 const saved = drafts.homework(draftId) || (active?.hw === hw.code ? active : null);
 const run = {kind:'hw',title:hw.title,ids:hw.ids,answers:{},start:legacy?.start||Date.now(),limit:0,done:false,...saved,
  hw:hw.code,draftId,assignment:hw.assignment,unsaved:{}};
 if (!saved && legacy?.answers) run.answers = {...legacy.answers};
 syncAnswers(run);
 runs.hw = run;
 saveRun(run);
 return run;
}
function renderHw() {
 const run = runs.hw;
 if (run) {
  const saved = !run.done && drafts.homework(run.draftId);
  if (saved?.done) {runs.hw=saved;return renderResult(saved);}
  return run.done ? renderResult(run) : renderRun(run);
 }
 V.innerHTML=`<section class="view"><div class="hero"><h1>Твоя домашка</h1><p class="lead">Открой ссылку от репетитора или вставь присланный код. После сдачи скопируй сообщение с результатом.</p></div>
 <form id="homework-form" class="panel study-form"><div class="field"><label for="nm2">Твоё имя</label><input type="text" id="nm2" value="${esc(myName)}" placeholder="Имя" maxlength="40" autocomplete="given-name"></div>
 <div class="field"><label for="hwc">Код домашки</label><textarea id="hwc" rows="3" placeholder="Код, ссылка или всё сообщение от репетитора" required></textarea></div><div><button class="btn primary" id="open">Открыть домашку</button></div><p id="herr" class="study-warning" role="status"></p></form></section>`;
 const form = V.querySelector('#homework-form');
 form.onsubmit = async event => {
  event.preventDefault();
  const button = form.querySelector('#open'), status = form.querySelector('#herr');
  button.disabled = true;
  status.textContent = 'Загружаем задания…';
  myName = form.querySelector('#nm2').value.trim();
  LS.set('mk_name',myName);
  try {
   await openHomework(form.querySelector('#hwc').value);
   if (form.isConnected) setView('hw');
  } catch (error) { status.textContent=error.message; button.disabled=false; }
 };
}
/* ====== PROGRESS ====== */
function renderProg(){const att=Object.values(tries).reduce((a,t)=>a+t[0],0),cor=Object.values(tries).reduce((a,t)=>a+t[1],0);
 V.innerHTML=`<section class="view"><div class="hero"><div class="kicker">Статистика · <b>этот браузер</b></div><h1>Мой <span class="grad">прогресс</span></h1>
 <div class="stats"><span class="stat"><b>${solved.size}</b>задач решено</span><span class="stat"><b>${att}</b>попыток</span><span class="stat"><b>${att?Math.round(cor/att*100):0}%</b>точность</span><span class="stat"><b>${history.length}</b>вариантов и домашек</span></div></div>
 <div class="grid2"><div class="panel"><div class="h2" style="font-size:18px;margin-bottom:8px">По урокам</div>${Object.keys(LESSONS).map(l=>{if(!isOpen(l))return `<div class="prow" style="opacity:.5"><span>🔒 ${l==="X"?"Бонус":"Урок "+l} · закрыт</span><span></span><span></span></div>`;const [s,n]=lessonStats(l);return `<div class="prow"><span>${l==="X"?"Бонус":"У"+l} · ${LESSONS[l][0]}</span><div class="meter"><i style="width:${n?s/n*100:0}%"></i></div><span class="num muted" style="text-align:right">${s}/${n}</span></div>`}).join("")}</div>
 <div class="panel"><div class="h2" style="font-size:18px;margin-bottom:8px">История</div>${history.length?`<div class="tablewrap"><table><thead><tr><th>Дата</th><th>Что</th><th>Итог</th><th></th></tr></thead><tbody>${history.map((h,i)=>`<tr><td class="num">${new Date(h.s).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"})}</td><td>${esc(h.t)}</td><td class="num" style="color:${grade(h.sc/h.n)[2]}">${h.n?`${h.sc}/${h.n}`:"ручная проверка"}${h.pending?` · ждут: ${h.pending}`:""}</td><td><button class="linkbtn" data-code="${i}">код</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="t2">Пока пусто. Реши тестовый вариант или домашку — результат появится здесь.</p>`}
 <div id="codebox"></div></div></div>
 <div style="margin-top:18px"><button class="btn ghost small pink" id="reset">Сбросить прогресс в этом браузере</button></div></section>`;
 V.querySelectorAll("[data-code]").forEach(b=>b.onclick=()=>{const h=history[+b.dataset.code];V.querySelector("#codebox").innerHTML=`<textarea rows="3" readonly style="margin-top:10px">${esc(h.code)}</textarea>`;copy(h.code,V.querySelector("#codebox textarea"))});
 V.querySelector("#reset").onclick=e=>{const b=e.currentTarget;if(!b.dataset.sure){b.dataset.sure=1;b.textContent="Точно сбросить? Нажми ещё раз";return}solved=new Set();tries={};history=[];saveAll();renderProg();toast("Прогресс сброшен")}}
/* ====== effects ====== */
function burst(el){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;const r=el.getBoundingClientRect();for(let i=0;i<10;i++){const s=document.createElement("span");s.style.cssText=`position:fixed;left:${r.left+r.width/2}px;top:${r.top+r.height/2}px;width:6px;height:6px;border-radius:50%;background:${["#3BE3FF","#35F2A2","#8E72FF","#FF5FD2"][i%4]};pointer-events:none;z-index:60;transition:transform .6s cubic-bezier(.2,.8,.2,1),opacity .6s`;document.body.appendChild(s);const a=Math.PI*2*i/10,d=30+Math.random()*24;requestAnimationFrame(()=>{s.style.transform=`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px)`;s.style.opacity="0"});setTimeout(()=>s.remove(),650)}}
function confetti(){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;const c=document.createElement("canvas");c.className="confetti";document.body.appendChild(c);const x=c.getContext("2d");c.width=innerWidth;c.height=innerHeight;const P=Array.from({length:120},()=>({x:innerWidth/2,y:innerHeight/3,vx:(Math.random()-.5)*14,vy:Math.random()*-12-3,s:4+Math.random()*5,c:["#3BE3FF","#35F2A2","#8E72FF","#FF5FD2","#FFBE55"][Math.floor(Math.random()*5)],r:Math.random()*6}));let f=0;(function loop(){x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.r+=.2;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);x.restore()});if(++f<110)requestAnimationFrame(loop);else c.remove()})()}
document.addEventListener("click",e=>{const im=e.target.closest("img.fig");const lb=document.getElementById("lb");if(im){lb.querySelector("img").src=im.src;lb.hidden=false;return}if(e.target.closest("#lb"))lb.hidden=true});
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.getElementById("lb").hidden=true});
function openLinkedBoard() {
 const params = new URLSearchParams(location.hash.slice(1));
 if (params.has('board') && params.has('room')) loadBoard().then(board => board.fromHash()).catch(error => toast(error.message));
}
document.addEventListener('click', event => { if (event.target.closest('#freeBd')) openBoard('free',null); });
async function openLinkedHomework() {
 const params = new URLSearchParams(location.hash.slice(1));
 const code = params.get('hw'), preset = params.get('set');
 if (!code && !preset) return false;
 setView('hw');
 V.innerHTML='<section class="view"><div class="hero"><h1>Домашка</h1></div><div class="panel study-form"><p id="study-loading" role="status">Загружаем задания…</p><div><button class="btn primary" id="retry-homework" hidden>Попробовать снова</button></div></div></section>';
 const status = V.querySelector('#study-loading'), retry=V.querySelector('#retry-homework');
 try {
  await openHomework(code || (await OgePublished.load(preset)).code);
  if (status.isConnected) render();
 } catch (error) {
  if (status.isConnected) {status.textContent=error.message;retry.hidden=false;retry.onclick=openLinkedHomework;}
 }
 return true;
}
window.addEventListener('hashchange', () => { openLinkedBoard(); openLinkedHomework(); });
window.addEventListener('storage', event => {
 const run = runs[view];
 if (!run || run.done || !event.key) return;
 if (run.kind === 'hw' && event.key === `mk_hwa_${run.draftId}`) {
  const saved = drafts.homework(run.draftId);
  if (saved?.done) { runs.hw = saved; render(); return; }
 }
 const id = run.ids.find(id => drafts.answerKey(run,id) === event.key);
 if (id === undefined || event.newValue === null || Object.hasOwn(run.unsaved,id)) return;
 run.answers[id] = event.newValue;
 const input = document.getElementById(`q${id}`);
 if (input && document.activeElement !== input) {
  input.value = event.newValue;
  input.closest('.q').classList.toggle('filled',!!input.value.trim());
 }
 clearConfirmation();
 updateFilled(run);
});

render();
openLinkedBoard();
const embedded = new URLSearchParams(location.search).has('workspace');
if (!embedded) (async () => {
 const savedLessons = Promise.all(Object.entries(keys).map(async ([l,code]) => {
  if (!lockedLesson(l) || isOpen(l)) return;
  try { openLesson(l,await decryptLesson(l,code)); } catch (error) { console.warn(`Блок ${l} недоступен`,error.name); }
 }));
 const savedTest = drafts.active('test');
 await Promise.all([
  savedLessons.then(() => {
   if (!runs.test && savedTest && !savedTest.done && Array.isArray(savedTest.ids) && savedTest.ids.length) {
    if (savedTest.ids.every(id => byId[id])) {
     runs.test = {...savedTest,answers:savedTest.answers||{},unsaved:{},draftId:savedTest.draftId||crypto.randomUUID()};
     syncAnswers(runs.test);
     if (!savedTest.draftId) saveRun(runs.test);
     updateTimer();
    } else toast('Часть заданий варианта недоступна. Обнови страницу, когда появится интернет.');
   }
  }),
  (async () => {
   if (await openLinkedHomework()) return;
   const saved = drafts.active('hw');
   if (!runs.hw && saved?.hw && !saved.done) {
    try { await openHomework(saved.hw); }
    catch (error) { toast(error.message); }
   }
  })(),
 ]);
 if (view === 'bank' && !new URLSearchParams(location.hash.slice(1)).has('board')) {
  if (runs.hw && !runs.hw.done) setView('hw');
  else if (runs.test && !runs.test.done) setView('test');
  else render();
 } else if (view==='test' && runs.test) render();
})().catch(error=>toast(error.message));
