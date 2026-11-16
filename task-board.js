const BD=(()=>{
const $=id=>document.getElementById(id);
const el=$("bd"),cv=$("bdCv"),ctx=cv.getContext("2d"),main=$("bdMain");
const COLORS=["#E9EEFF","#3BE3FF","#FF5FD2","#FFBE55","#35F2A2","#FF5C7A"];
const WIDTHS=[2,4,8];
const CID=Math.random().toString(36).slice(2,8);
let S={tid:null,row:null,objs:[],tool:"pen",color:COLORS[0],w:4,grid:true,ox:0,oy:0,z:1};
let undo=[],redo=[],draft=null,remote={},cursors={},dirty=true,dpr=1,W=0,H=0;
const imgCache=new Map();
const uid=()=>CID+Math.random().toString(36).slice(2,8);
const r1=v=>Math.round(v*10)/10;
/* ---------- toolbar ---------- */
$("bdColors").innerHTML=COLORS.map(c=>`<button class="bd-sw" data-c="${c}" style="background:${c};color:${c}" aria-label="Цвет"></button>`).join("");
$("bdWidths").innerHTML=WIDTHS.map(w=>`<button class="bd-b bd-w" data-w="${w}" aria-label="Толщина ${w}"><i style="width:${w+8}px;height:${w}px"></i></button>`).join("");
function syncBar(){el.querySelectorAll("[data-tool]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.tool===S.tool));
 el.querySelectorAll("[data-c]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.c===S.color));
 el.querySelectorAll("[data-w]").forEach(b=>{b.setAttribute("aria-pressed",+b.dataset.w===S.w);b.style.color=S.color});
 $("bdGrid").setAttribute("aria-pressed",S.grid);
 cv.className="bd-cv"+(S.tool==="hand"?" hand":S.tool==="erase"?" erase":S.tool==="text"?" text":"");
 $("bdZr").textContent=Math.round(S.z*100)+"%";
 $("bdUndo").disabled=!undo.length;$("bdRedo").disabled=!redo.length;$("bdUndo").style.opacity=undo.length?1:.4;$("bdRedo").style.opacity=redo.length?1:.4}
el.addEventListener("click",e=>{const t=e.target.closest("[data-tool]");if(t){commitText();S.tool=t.dataset.tool;syncBar()}
 const c=e.target.closest("[data-c]");if(c){S.color=c.dataset.c;if(S.tool==="erase"||S.tool==="hand")S.tool="pen";syncBar()}
 const w=e.target.closest("[data-w]");if(w){S.w=+w.dataset.w;syncBar()}});
/* ---------- geometry / drawing ---------- */
const toW=(sx,sy)=>[sx/S.z+S.ox,sy/S.z+S.oy];
function pos(e){const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*(W/(r.width||W)),(e.clientY-r.top)*(H/(r.height||H))]}
function chk(){if(Math.abs(main.clientWidth-W)>0.5||Math.abs(main.clientHeight-H)>0.5||(window.devicePixelRatio||1)!==dpr)resize()}
function resize(){dpr=window.devicePixelRatio||1;W=main.clientWidth;H=main.clientHeight;if(!W||!H)return;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);dirty=true}
function arrowHead(c,x1,y1,x2,y2,w){const a=Math.atan2(y2-y1,x2-x1),L=Math.max(12,w*3.6);c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-L*Math.cos(a-0.42),y2-L*Math.sin(a-0.42));c.lineTo(x2-L*Math.cos(a+0.42),y2-L*Math.sin(a+0.42));c.closePath();c.fill()}
function fontOf(o){return `500 ${o.s}px Onest, system-ui, sans-serif`}
function textBox(o){ctx.save();ctx.font=fontOf(o);const lines=o.txt.split("\n");const w=Math.max(...lines.map(l=>ctx.measureText(l).width));ctx.restore();return [o.x,o.y,w,lines.length*o.s*1.25]}
function figSrc(o){const row=S.row;return row&&row[7]?row[7][o.k]:null}
function getImg(src){if(!src)return null;let im=imgCache.get(src);if(!im){im=new Image();im.onload=()=>{dirty=true};im.src=src;imgCache.set(src,im)}return im.complete&&im.naturalWidth?im:null}
function drawObj(c,o){c.strokeStyle=c.fillStyle=o.c||"#fff";c.lineWidth=o.w||2;c.lineCap="round";c.lineJoin="round";
 if(o.t==="pen"){const p=o.p;if(p.length<4){c.beginPath();c.arc(p[0],p[1],(o.w||2)/2,0,7);c.fill();return}
   c.beginPath();c.moveTo(p[0],p[1]);for(let i=2;i<p.length-2;i+=2){const mx=(p[i]+p[i+2])/2,my=(p[i+1]+p[i+3])/2;c.quadraticCurveTo(p[i],p[i+1],mx,my)}c.lineTo(p[p.length-2],p[p.length-1]);c.stroke();return}
 if(o.t==="img"){const im=getImg(figSrc(o));c.save();c.fillStyle="#fff";c.beginPath();c.roundRect?c.roundRect(o.x-6,o.y-6,o.w+12,o.h+12,10):c.rect(o.x-6,o.y-6,o.w+12,o.h+12);c.fill();if(im)c.drawImage(im,o.x,o.y,o.w,o.h);c.restore();return}
 if(o.t==="text"){c.font=fontOf(o);c.textBaseline="top";o.txt.split("\n").forEach((l,i)=>c.fillText(l,o.x,o.y+o.s*0.125+i*o.s*1.25));return}
 const [x1,y1,x2,y2]=o.a;c.beginPath();
 if(o.t==="line"||o.t==="arrow"){c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();if(o.t==="arrow")arrowHead(c,x1,y1,x2,y2,o.w)}
 else if(o.t==="rect"){c.strokeRect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1))}
 else if(o.t==="ell"){c.ellipse((x1+x2)/2,(y1+y2)/2,Math.abs(x2-x1)/2||.5,Math.abs(y2-y1)/2||.5,0,0,7);c.stroke()}
 else if(o.t==="axes"){c.moveTo(x1,y1);c.lineTo(x2,y1);c.moveTo(x1,y1);c.lineTo(x1,y2);c.stroke();if(x2!==x1)arrowHead(c,x1,y1,x2,y1,o.w);if(y2!==y1)arrowHead(c,x1,y1,x1,y2,o.w);
   c.font=`600 ${Math.max(14,o.w*4)}px JetBrains Mono, monospace`;c.textBaseline="middle";c.fillText("0",x1-(x2>=x1?16:-8),y1+(y2<=y1?14:-14))}}
function render(){dirty=false;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#070B18";ctx.fillRect(0,0,W,H);
 ctx.setTransform(dpr*S.z,0,0,dpr*S.z,-S.ox*S.z*dpr,-S.oy*S.z*dpr);
 if(S.grid){const g=40,x0=Math.floor(S.ox/g)*g,y0=Math.floor(S.oy/g)*g,x1=S.ox+W/S.z,y1=S.oy+H/S.z;ctx.lineWidth=1/S.z;ctx.strokeStyle="rgba(59,227,255,.07)";ctx.beginPath();for(let x=x0;x<x1;x+=g){ctx.moveTo(x,y0);ctx.lineTo(x,y1)}for(let y=y0;y<y1;y+=g){ctx.moveTo(x0,y);ctx.lineTo(x1,y)}ctx.stroke()}
 for(const o of S.objs)if(o.t==="img")drawObj(ctx,o);
 for(const o of S.objs)if(o.t!=="img")drawObj(ctx,o);
 for(const k in remote)if(remote[k])drawObj(ctx,remote[k]);
 if(draft)drawObj(ctx,draft);
 const now=Date.now();for(const k in cursors){const q=cursors[k];if(now-q.t>4000)continue;ctx.fillStyle="#FF5FD2";ctx.beginPath();ctx.arc(q.x,q.y,5/S.z,0,7);ctx.fill();ctx.font=`600 ${11/S.z}px JetBrains Mono, monospace`;ctx.fillText(q.n||"гость",q.x+8/S.z,q.y-8/S.z)}}
(function loop(){if(!el.hidden&&dirty)render();requestAnimationFrame(loop)})();
setInterval(()=>{if(Object.keys(cursors).length)dirty=true},1000);
/* ---------- hit test (ластик) ---------- */
function dSeg(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy;let t=l?((px-x1)*dx+(py-y1)*dy)/l:0;t=Math.max(0,Math.min(1,t));return Math.hypot(px-x1-t*dx,py-y1-t*dy)}
function hit(o,x,y,r){const R=r+(o.w||2)/2;
 if(o.t==="pen"){const p=o.p;if(p.length<4)return Math.hypot(x-p[0],y-p[1])<R;for(let i=0;i<p.length-2;i+=2)if(dSeg(x,y,p[i],p[i+1],p[i+2],p[i+3])<R)return true;return false}
 if(o.t==="img"){return x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h}
 if(o.t==="text"){const [bx,by,bw,bh]=textBox(o);return x>=bx-r&&x<=bx+bw+r&&y>=by-r&&y<=by+bh+r}
 const [x1,y1,x2,y2]=o.a;
 if(o.t==="line"||o.t==="arrow")return dSeg(x,y,x1,y1,x2,y2)<R;
 if(o.t==="axes")return dSeg(x,y,x1,y1,x2,y1)<R||dSeg(x,y,x1,y1,x1,y2)<R;
 if(o.t==="rect")return dSeg(x,y,x1,y1,x2,y1)<R||dSeg(x,y,x2,y1,x2,y2)<R||dSeg(x,y,x2,y2,x1,y2)<R||dSeg(x,y,x1,y2,x1,y1)<R;
 if(o.t==="ell"){const cx=(x1+x2)/2,cy=(y1+y2)/2,rx=Math.abs(x2-x1)/2||1,ry=Math.abs(y2-y1)/2||1;const d=Math.hypot((x-cx)/rx,(y-cy)/ry);return Math.abs(d-1)*Math.min(rx,ry)<R}
 return false}
/* ---------- actions (общие для своих и чужих) ---------- */
function apply(a){if(a.k==="add"){const have=new Set(S.objs.map(o=>o.id));a.o.forEach(o=>{if(!have.has(o.id))S.objs.push(o)})}
 else if(a.k==="del"){const s=new Set(a.ids);S.objs=S.objs.filter(o=>!s.has(o.id))}
 else if(a.k==="clr"){S.objs=[]}
 dirty=true;save()}
function doAct(a,inv){apply(a);undo.push([a,inv]);if(undo.length>200)undo.shift();redo=[];send(a);syncBar()}
function addObj(o){doAct({k:"add",o:[o]},{k:"del",ids:[o.id]})}
function doUndo(){const e=undo.pop();if(!e)return;apply(e[1]);send(e[1]);redo.push(e);syncBar()}
function doRedo(){const e=redo.pop();if(!e)return;apply(e[0]);send(e[0]);undo.push(e);syncBar()}
let saveT=0;const pendingWrites=new Map();
function flushSave(){clearTimeout(saveT);for(const [key,value] of pendingWrites){try{localStorage.setItem(key,value);pendingWrites.delete(key)}catch(e){toast("Доска не сохранилась: память браузера заполнена. Скачай PNG перед закрытием.")}}}
function save(){if(S.tid==null)return;pendingWrites.set("mk_bd_"+S.tid,JSON.stringify(S.objs));clearTimeout(saveT);saveT=setTimeout(flushSave,250)}
window.addEventListener('pagehide',()=>{endPtr();commitText();flushSave()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){endPtr();commitText();flushSave()}});
/* ---------- pointer ---------- */
let act=null,space=false,lastDraftSend=0,lastCurSend=0;
function sendDraft(force){const n=Date.now();if(!force&&n-lastDraftSend<45)return;lastDraftSend=n;send({k:"draft",o:draft})}
cv.addEventListener("pointerdown",e=>{if(e.button===2)return;e.preventDefault();cv.setPointerCapture(e.pointerId);chk();const [sx,sy]=pos(e);const [x,y]=toW(sx,sy);
 $("bdHint").style.display="none";if(!$("bdPop").hidden&&!$("bdPop").dataset.keep)$("bdPop").hidden=true;
 if(S.tool==="hand"||space||e.button===1){act={m:"pan",sx,sy,ox:S.ox,oy:S.oy};cv.classList.add("drag");return}
 if(S.tool==="text"){if(txtEl){commitText();return}openText(x,y);return}
 if(S.tool==="erase"){act={m:"erase",ids:[]};eraseAt(x,y);return}
 if(S.tool==="pen"){draft={id:uid(),t:"pen",c:S.color,w:S.w,p:[r1(x),r1(y)]}}
 else draft={id:uid(),t:S.tool,c:S.color,w:S.w,a:[r1(x),r1(y),r1(x),r1(y)]};
 act={m:"draw"};dirty=true});
cv.addEventListener("pointermove",e=>{const [sx,sy]=pos(e);const [x,y]=toW(sx,sy);
 const n=Date.now();if(conns().length&&n-lastCurSend>70){lastCurSend=n;send({k:"cur",x:r1(x),y:r1(y),n:NAME})}
 if(!act)return;
 if(act.m==="pan"){S.ox=act.ox-(sx-act.sx)/S.z;S.oy=act.oy-(sy-act.sy)/S.z;dirty=true;return}
 if(act.m==="erase"){const ev=e.getCoalescedEvents?e.getCoalescedEvents():[e];ev.forEach(q=>{const [qx,qy]=toW(...pos(q));eraseAt(qx,qy)});return}
 if(act.m==="draw"&&draft){if(draft.t==="pen"){const ev=e.getCoalescedEvents?e.getCoalescedEvents():[e];ev.forEach(q=>{const [qx,qy]=toW(...pos(q));const p=draft.p;if(Math.hypot(qx-p[p.length-2],qy-p[p.length-1])>1.2/S.z)p.push(r1(qx),r1(qy))})}
   else{let X=x,Y=y;if(e.shiftKey&&(draft.t==="rect"||draft.t==="ell")){const d=Math.max(Math.abs(x-draft.a[0]),Math.abs(y-draft.a[1]));X=draft.a[0]+Math.sign(x-draft.a[0]||1)*d;Y=draft.a[1]+Math.sign(y-draft.a[1]||1)*d}
     if(e.shiftKey&&(draft.t==="line"||draft.t==="arrow")){const a=Math.round(Math.atan2(y-draft.a[1],x-draft.a[0])/(Math.PI/4))*(Math.PI/4),L=Math.hypot(x-draft.a[0],y-draft.a[1]);X=draft.a[0]+L*Math.cos(a);Y=draft.a[1]+L*Math.sin(a)}
     draft.a[2]=r1(X);draft.a[3]=r1(Y)}
   dirty=true;sendDraft()}});
function endPtr(){if(!act)return;cv.classList.remove("drag");
 if(act.m==="erase"&&act.ids.length){const gone=act.gone;undo.push([{k:"del",ids:act.ids},{k:"add",o:gone}]);redo=[];syncBar()}
 if(act.m==="draw"&&draft){const d=draft;draft=null;const ok=d.t==="pen"||Math.hypot(d.a[2]-d.a[0],d.a[3]-d.a[1])>3;send({k:"draft",o:null});if(ok)addObj(d);dirty=true}
 act=null}
cv.addEventListener("pointerup",endPtr);cv.addEventListener("pointercancel",endPtr);cv.addEventListener("lostpointercapture",endPtr);
function eraseAt(x,y){const r=9/S.z;const hitO=S.objs.filter(o=>hit(o,x,y,r));if(!hitO.length)return;const ids=hitO.map(o=>o.id);act.ids.push(...ids);(act.gone=act.gone||[]).push(...hitO);apply({k:"del",ids});send({k:"del",ids})}
cv.addEventListener("wheel",e=>{e.preventDefault();if(e.ctrlKey||e.metaKey){const [zx,zy]=pos(e);zoomAt(zx,zy,Math.exp(-e.deltaY*0.0022))}else{S.ox+=e.deltaX/S.z;S.oy+=e.deltaY/S.z;dirty=true}},{passive:false});
cv.addEventListener("contextmenu",e=>e.preventDefault());
function zoomAt(sx,sy,f){const [wx,wy]=toW(sx,sy);S.z=Math.min(4,Math.max(0.25,S.z*f));S.ox=wx-sx/S.z;S.oy=wy-sy/S.z;dirty=true;syncBar()}
$("bdZi").onclick=()=>zoomAt(W/2,H/2,1.25);$("bdZo").onclick=()=>zoomAt(W/2,H/2,0.8);$("bdZr").onclick=()=>zoomAt(W/2,H/2,1/S.z);
/* ---------- text ---------- */
let txtEl=null;
function openText(x,y){const t=document.createElement("textarea");t.className="bd-txt";const size=[20,28,40][WIDTHS.indexOf(S.w)]||28;
 t.style.left=((x-S.ox)*S.z-7)+"px";t.style.top=((y-S.oy)*S.z-3)+"px";t.style.color=S.color;t.style.fontSize=size*S.z+"px";t.rows=1;t.placeholder="текст…";
 t.dataset.x=x;t.dataset.y=y;t.dataset.s=size;main.appendChild(t);txtEl=t;setTimeout(()=>t.focus(),0);
 t.addEventListener("input",()=>{t.style.height="auto";t.style.height=t.scrollHeight+"px";t.style.width=Math.max(120,t.scrollWidth+4)+"px"});
 t.addEventListener("keydown",e=>{e.stopPropagation();if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();commitText()}if(e.key==="Escape"){t.value="";commitText()}});
 t.addEventListener("blur",()=>setTimeout(commitText,0))}
function commitText(){const t=txtEl;if(!t)return;txtEl=null;const v=t.value.replace(/\s+$/,"");t.remove();if(v)addObj({id:uid(),t:"text",c:t.style.color||S.color,s:+t.dataset.s,x:r1(+t.dataset.x),y:r1(+t.dataset.y),txt:v})}
/* ---------- keys ---------- */
const KEYS={p:"pen",l:"line",a:"arrow",r:"rect",o:"ell",g:"axes",t:"text",e:"erase",h:"hand","з":"pen","д":"line","ф":"arrow","к":"rect","щ":"ell","п":"axes","е":"text","у":"erase","р":"hand"};
document.addEventListener("keydown",e=>{if(el.hidden||txtEl)return;if(e.target.matches&&e.target.matches("input,textarea"))return;
 const k=e.key.toLowerCase();
 if((e.ctrlKey||e.metaKey)&&(k==="z"||k==="я")){e.preventDefault();e.shiftKey?doRedo():doUndo();return}
 if((e.ctrlKey||e.metaKey)&&(k==="y"||k==="н")){e.preventDefault();doRedo();return}
 if(e.key==="Escape"){if(!document.getElementById("lb").hidden)return;if(!$("bdPop").hidden){$("bdPop").hidden=true;return}close();return}
 if(e.key===" "){e.preventDefault();space=true;cv.classList.add("hand");return}
 if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&KEYS[k]){S.tool=KEYS[k];syncBar()}});
document.addEventListener("keyup",e=>{if(e.key===" "){space=false;syncBar()}});
/* ---------- buttons ---------- */
$("bdUndo").onclick=doUndo;$("bdRedo").onclick=doRedo;
$("bdGrid").onclick=()=>{S.grid=!S.grid;dirty=true;syncBar()};
$("bdClear").onclick=()=>{if(!S.objs.length)return;const all=S.objs.slice();doAct({k:"clr"},{k:"add",o:all});toast("Доска очищена · Ctrl+Z — вернуть")};
$("bdTmin").onclick=()=>$("bdTask").classList.toggle("min");
$("bdTaskBtn").onclick=()=>{const t=$("bdTask");if(!S.row){toast("Это чистая доска — без условия");return}if(t.hidden){t.hidden=false;t.classList.remove("min")}else t.classList.toggle("min")};
$("bdClose").onclick=()=>close();
$("bdPng").onclick=()=>{const objs=S.objs;if(!objs.length){toast("Доска пустая");return}
 let bx=[1e9,1e9,-1e9,-1e9];const ext=(x,y)=>{bx[0]=Math.min(bx[0],x);bx[1]=Math.min(bx[1],y);bx[2]=Math.max(bx[2],x);bx[3]=Math.max(bx[3],y)};
 objs.forEach(o=>{if(o.p)for(let i=0;i<o.p.length;i+=2)ext(o.p[i],o.p[i+1]);else if(o.a){ext(o.a[0],o.a[1]);ext(o.a[2],o.a[3])}else if(o.t==="text"){const b=textBox(o);ext(b[0],b[1]);ext(b[0]+b[2],b[1]+b[3])}else{ext(o.x-6,o.y-6);ext(o.x+o.w+6,o.y+o.h+6)}});
 const pad=40,w=bx[2]-bx[0]+pad*2,h=bx[3]-bx[1]+pad*2,k=Math.min(2,8000/w,8000/h);const c=document.createElement("canvas");c.width=Math.min(8000,w*k);c.height=Math.min(8000,h*k);const g=c.getContext("2d");g.fillStyle="#070B18";g.fillRect(0,0,c.width,c.height);g.setTransform(k,0,0,k,(-bx[0]+pad)*k,(-bx[1]+pad)*k);
 objs.filter(o=>o.t==="img").forEach(o=>drawObj(g,o));objs.filter(o=>o.t!=="img").forEach(o=>drawObj(g,o));
 const a=document.createElement("a");a.download=`доска-${S.tid==="free"?"чистая":"задача-"+S.tid}.png`;a.href=c.toDataURL("image/png");a.click()};
/* ---------- task panel ---------- */
function placeFig(k){const row=S.row;const src=row&&row[7]&&row[7][k];if(!src)return;const im=new Image();im.onload=()=>{let w=im.naturalWidth,h=im.naturalHeight;const m=Math.min(1,360/w,280/h);w*=m;h*=m;
  const x=S.ox+Math.max(W/S.z-w-40,Math.min(W/S.z/2,480)),y=S.oy+30+S.objs.filter(o=>o.t==="img").length*20;addObj({id:uid(),t:"img",k,x:r1(x),y:r1(y),w:r1(w),h:r1(h)})};im.src=src}
function setRow(row,label){S.row=row;const t=$("bdTask");t.classList.toggle("fipi-board",!!row?.[8]?.fipi);if(!row){t.hidden=true;$("bdTb").replaceChildren();return}
 t.hidden=false;t.classList.remove("min");$("bdTn").textContent=label||("Задача · урок "+row[2]);
 const n=(row[7]||[]).length;$("bdTb").innerHTML=fmtRow(row)+(n?`<div class="bd-tact">${row[7].map((_,k)=>`<button class="bd-chip" data-fig="${k}">⇲ рисунок${n>1?" "+(k+1):""} на доску</button>`).join("")}</div>`:"");}
$("bdTb").addEventListener("click",e=>{const b=e.target.closest("[data-fig]");if(b)placeFig(+b.dataset.fig)});
/* ---------- open / close ---------- */
function open(tid,row,label,opts={}){endPtr();commitText();flushSave();endSession();S.tid=tid;S.ox=0;S.oy=0;S.z=1;undo=[];redo=[];remote={};cursors={};draft=null;
 let saved=null;try{saved=JSON.parse(localStorage.getItem("mk_bd_"+tid)||"null")}catch(e){}
 S.objs=Array.isArray(saved)?saved:[];el.hidden=false;document.body.classList.add("bd-open");resize();setRow(row,label);
 $("bdPop").hidden=true;$("bdHint").style.display="";setStatus("solo");syncBar();
 if(!opts.join&&row&&row[7]&&row[7].length&&!S.objs.length)setTimeout(()=>placeFig(0),30);
 dirty=true;if(!opts.join)window.history.replaceState(null,"",location.pathname+location.search)}
function close(){endPtr();commitText();flushSave();endSession();el.hidden=true;if(S.row?.[8]?.fipi)setRow(null);document.body.classList.remove("bd-open");window.history.replaceState(null,"",location.pathname+location.search);if(typeof render==="function"&&window.__bdRerender)window.__bdRerender()}
window.addEventListener("resize",()=>{if(!el.hidden)resize()});
if(window.ResizeObserver)new ResizeObserver(()=>{if(!el.hidden)resize()}).observe(main);
/* мини-клиент MQTT 3.1.1 поверх WebSocket (QoS 0) */
function MQ(url,onMsg,onState){const te=new TextEncoder(),td=new TextDecoder();let ws,buf=new Uint8Array(0),ping=0,subs=[],alive=false,closed=false;
 const str=s=>{const b=te.encode(s);return [b.length>>8,b.length&255,...b]};
 const len=n=>{const o=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;o.push(d)}while(n>0);return o};
 const pkt=(h,body)=>{const b=body instanceof Uint8Array?body:Uint8Array.from(body);const L=len(b.length);const o=new Uint8Array(1+L.length+b.length);o[0]=h;o.set(L,1);o.set(b,1+L.length);return o};
 const out=p=>{if(ws&&ws.readyState===1)ws.send(p)};
 function parse(){while(buf.length>=2){let m=1,v=0,i=1,d;do{if(i>=buf.length)return;d=buf[i++];v+=(d&127)*m;m*=128}while(d&128);if(buf.length<i+v)return;
   const h=buf[0],body=buf.slice(i,i+v);buf=buf.slice(i+v);const t=h>>4;
   if(t===2){alive=true;onState("up");subs.forEach(s=>sub(s,true))}
   else if(t===3){const tl=(body[0]<<8)|body[1];const topic=td.decode(body.slice(2,2+tl));let off=2+tl;if((h>>1)&3)off+=2;try{onMsg(topic,td.decode(body.slice(off)))}catch(e){}}}}
 function sub(topic,re){if(!re&&!subs.includes(topic))subs.push(topic);if(!alive)return;const id=1+Math.floor(Math.random()*60000);out(pkt(0x82,[id>>8,id&255,...str(topic),0]))}
 function pub(topic,msg){if(!alive)return false;const t=str(topic),p=te.encode(msg);const b=new Uint8Array(t.length+p.length);b.set(t);b.set(p,t.length);out(pkt(0x30,b));return true}
 function connect(){ws=new WebSocket(url,"mqtt");ws.binaryType="arraybuffer";
  ws.onopen=()=>{out(pkt(0x10,[...str("MQTT"),4,2,0,60,...str("mk"+Math.random().toString(36).slice(2,12))]));clearInterval(ping);ping=setInterval(()=>out(Uint8Array.from([0xC0,0])),25000)};
  ws.onmessage=e=>{const d=new Uint8Array(e.data);const n=new Uint8Array(buf.length+d.length);n.set(buf);n.set(d,buf.length);buf=n;parse()};
  ws.onclose=ws.onerror=()=>{if(!alive&&!closed){closed=true;onState("fail");return}if(alive){alive=false;onState("down");clearInterval(ping);if(!closed)setTimeout(connect,1500)}}}
 connect();
 return {sub,pub,close(){closed=true;alive=false;clearInterval(ping);try{ws.close()}catch(e){}},get up(){return alive}}}


/* ---------- совместная работа: несколько каналов одновременно ----------
   MQTT-серверы (3 шт., разные порты) + ретранслятор на обычном порту 443.
   Каждое сообщение уходит по всем живым каналам; получатель склеивает их по номеру (без дублей и в правильном порядке). */
const NAME=(()=>{try{return JSON.parse(localStorage.getItem("mk_name")||'""')||""}catch(e){return ""}})();
const BROKERS=[["HiveMQ","wss://broker.hivemq.com:8884/mqtt"],["EMQX","wss://broker.emqx.io:8084/mqtt"],["Mosquitto","wss://test.mosquitto.org:8081/mqtt"]];
function mqttT(name,url,topic,onMsg,onCh){const T={name,state:"…"};const c=MQ(url,(tp,s)=>{if(tp===topic)onMsg(s)},st=>{T.state=st==="up"?"ok":st==="fail"?"нет":"…";onCh()});c.sub(topic);
 T.up=()=>c.up;T.send=s=>c.pub(topic,s);T.close=()=>c.close();return T}
/* ретранслятор через сигнальный сервер PeerJS (wss://0.peerjs.com, порт 443) */
function relayT(room,isHost,onMsg,onCh){const T={name:"Порт 443",state:"…"};const hid="ogemk-"+room+"-h";let ws=null,up=false,closed=false,hb=0,jt=0,guests=new Set(),tries=0;
 const myId=()=>isHost?hid:"ogemk-"+room+"-"+Math.random().toString(36).slice(2,8);
 function raw(o){try{ws.send(JSON.stringify(o))}catch(e){}}
 const pk=(dst,meta)=>({type:"OFFER",dst,payload:{sdp:{type:"offer",sdp:"v=0\r\n"},type:"data",connectionId:"dc_mk",label:"dc_mk",reliable:true,serialization:"json",metadata:meta}});
 function connect(){const id=myId();try{ws=new WebSocket("wss://0.peerjs.com/peerjs?key=peerjs&id="+id+"&token="+Math.random().toString(36).slice(2,10))}catch(e){T.state="нет";onCh();return}
  const failT=setTimeout(()=>{if(!up){T.state="нет";onCh();try{ws.close()}catch(e){}}},9000);
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}
   if(m.type==="OPEN"){clearTimeout(failT);up=true;tries=0;T.state="ok";onCh();clearInterval(hb);hb=setInterval(()=>raw({type:"HEARTBEAT"}),5000);if(!isHost){raw(pk(hid,{mk:"join"}));clearInterval(jt);jt=setInterval(()=>raw(pk(hid,{mk:"join"})),8000)}return}
   if(m.type==="ID-TAKEN"){if(!isHost){try{ws.close()}catch(x){}}else{T.state="занят";onCh()}return}
   if((m.type==="EXPIRE"||m.type==="LEAVE")&&m.src){guests.delete(m.src);return}
   if(m.type==="OFFER"&&m.payload&&m.payload.metadata&&m.payload.metadata.mk){const p=m.payload.metadata;
    if(isHost){guests.add(m.src);if(p.mk==="d"){onMsg(p.s);guests.forEach(g=>{if(g!==m.src)raw(pk(g,{mk:"d",s:p.s}))})}}
    else if(p.mk==="d")onMsg(p.s)}};
  ws.onclose=()=>{clearTimeout(failT);const was=up;up=false;clearInterval(hb);clearInterval(jt);if(closed)return;T.state=was?"…":"нет";onCh();tries++;if(tries<30)setTimeout(connect,was?1000:Math.min(15000,2000*tries))}}
 connect();
 T.up=()=>up;T.send=s=>{if(!up)return false;if(isHost)guests.forEach(g=>raw(pk(g,{mk:"d",s})));else raw(pk(hid,{mk:"d",s}));return true};
 T.close=()=>{closed=true;up=false;clearInterval(hb);clearInterval(jt);try{ws.close()}catch(e){}};return T}

let chans=[],role=null,room=null,seq=0,inq={},peers={},joinTimer=0,hbT=0,inited=false,chT=0;
const conns=()=>Object.keys(peers).filter(k=>Date.now()-peers[k].t<15000);
const upCount=()=>chans.filter(c=>c.up()).length;
function setStatus(k,txt){const s=$("bdSt");s.className="bd-st"+(k==="on"?" on":k==="wait"?" wait":k==="err"?" err":"");
 s.lastChild.textContent=txt||({solo:"одна",wait:"ждём…",on:"вместе",err:"нет связи"})[k];
 $("bdInv").textContent=role?"Связь":"Позвать на доску"}
function send(m){if(!role||!chans.length)return false;m.from=CID;m.q=++seq;if(!m.n)m.n=NAME||(role==="host"?"репетитор":"ученик");const s=JSON.stringify(m);let ok=false;chans.forEach(c=>{if(c.up()&&c.send(s))ok=true});return ok}
/* приём: без дублей, строго по порядку от каждого отправителя */
function onRaw(s){let m;try{m=JSON.parse(s)}catch(e){return}if(!m||m.from===CID||typeof m.q!=="number")return;
 let st=inq[m.from];if(!st)st=inq[m.from]={exp:m.q,buf:new Map(),gap:0};
 if(m.q<st.exp||st.buf.has(m.q))return;
 if(m.q===st.exp){handle(m);st.exp++;flush(st)}
 else{st.buf.set(m.q,m);if(!st.gap)st.gap=setTimeout(()=>{st.gap=0;if(st.buf.size){st.exp=Math.min(...st.buf.keys());flush(st)}},1500)}}
function flush(st){while(st.buf.has(st.exp)){const x=st.buf.get(st.exp);st.buf.delete(st.exp);st.exp++;handle(x)}if(!st.buf.size&&st.gap){clearTimeout(st.gap);st.gap=0}}
function handle(m){const known=conns().includes(m.from);peers[m.from]={t:Date.now(),n:m.n||"гость"};
 if(m.k==="bye"){delete peers[m.from];remote[m.from]=null;delete cursors[m.from];dirty=true;refreshCount();return}
 if(!known)refreshCount();
 if(m.k==="hello"){if(role==="host"){sendInit();if(!known)toast((m.n&&m.n!=="ученик"?m.n:"Ученик")+" на доске ✓")}return}
 if(m.k==="hb")return;
 if(m.k==="init"){if(role!=="guest")return;S.objs=m.objs||[];setRow(m.row||null,m.label);inited=true;save();dirty=true;clearTimeout(joinTimer);refreshCount();if($("bdPop").dataset.fail||$("bdPop").dataset.join)$("bdPop").hidden=true;toast("Подключились к доске ✓");return}
 if(m.k==="draft"){remote[m.from]=m.o;dirty=true;return}
 if(m.k==="cur"){cursors[m.from]={x:m.x,y:m.y,n:m.n,t:Date.now()};dirty=true;return}
 if(m.k==="add"||m.k==="del"||m.k==="clr"){if(m.k==="add")remote[m.from]=null;apply(m)}}
function sendInit(){const chunks=[];let cur=[],sz=0;for(const o of S.objs){const l=JSON.stringify(o).length;if(sz+l>40000&&cur.length){chunks.push(cur);cur=[];sz=0}cur.push(o);sz+=l}chunks.push(cur);
 send({k:"init",row:S.row,label:$("bdTn").textContent,objs:chunks[0]});chunks.slice(1).forEach(c=>send({k:"add",o:c}))}
function chanList(){return `<div class="bd-ch">${chans.map(c=>{const s=c.up()?"ok":c.state;return `<span class="${s==="ok"?"ok":s==="…"?"w":"no"}"><i></i>${esc(c.name)}</span>`}).join("")}</div>`}
function onCh(){clearTimeout(chT);chT=setTimeout(()=>{refreshCount();const p=$("bdPop");if(!p.hidden&&p.dataset.v==="inv")showInvite();
 if(role&&chans.length&&chans.every(c=>!c.up()&&c.state!=="…"))fail(role==="guest"?"Твой интернет не пускает ни к одному серверу связи.":"Интернет не пускает ни к одному серверу связи.")},120)}
function refreshCount(){if(!role)return;const n=conns().length,u=upCount();
 if(!u){setStatus("wait","соединяюсь…");return}
 if(role==="host"){n?setStatus("on",`вместе · ${n+1}`):setStatus("wait","ждём ученика…")}
 else{if(!inited){setStatus("wait","ищу доску…");return}setStatus(n?"on":"wait",n?"вместе":"репетитор не на связи…")}}
function linkFor(){return location.origin+location.pathname+`#board=${encodeURIComponent(S.tid)}&room=${room}`}
function showInvite(){const p=$("bdPop");delete p.dataset.fail;delete p.dataset.join;p.dataset.v="inv";const n=conns().length;p.hidden=false;
 p.innerHTML=`<h3>${role==="guest"?"Вы на общей доске":"Общая доска"}</h3>
 <p>${role==="guest"?(inited?"Рисуйте вместе — всё видно обоим.":"Ищу доску репетитора…"):n?`<b style="color:var(--ok)">На доске: ${n+1}</b> — рисуйте вместе, всё видно сразу.`:"Отправь эту ссылку ученику в чат звонка. Он откроет — и вы на одной доске."}</p>
 ${role==="host"?`<div class="row"><input readonly value="${linkFor()}" id="bdLink" aria-label="Ссылка на доску"><button class="bd-b go" id="bdCopy">Копировать</button></div>`:""}
 <div class="bd-chh">Каналы связи — хватит одного зелёного у обоих:</div>${chanList()}
 <div class="row" style="margin-top:10px"><button class="bd-chip" id="bdEnd">${role==="guest"?"Выйти из общей доски":"Закончить совместную работу"}</button><button class="bd-chip" id="bdHide" style="margin-left:auto">Скрыть</button></div>`;
 const cp=$("bdCopy");if(cp)cp.onclick=()=>copy(linkFor(),$("bdLink"));$("bdHide").onclick=()=>{p.hidden=true};$("bdEnd").onclick=()=>{endSession();p.hidden=true;setStatus("solo")}}
function start(){const topic="ogemk/v2/"+room;inq={};peers={};
 let only="";try{only=localStorage.getItem("mk_only")||""}catch(e){}
 chans=only==="443"?[]:BROKERS.map(([n,u])=>mqttT(n,u,topic,onRaw,onCh));chans.push(relayT(room,role==="host",onRaw,onCh));
 clearInterval(hbT);hbT=setInterval(()=>{send({k:"hb"});refreshCount()},4000);refreshCount()}
function host(){role="host";room=Math.random().toString(36).slice(2,8)+Math.random().toString(36).slice(2,4);start();showInvite()}
function join(r){role="guest";room=r;inited=false;start();showInvite();$("bdPop").dataset.join=1;
 let tries=0;const again=()=>{if(inited||role!=="guest")return;tries++;if(upCount())send({k:"hello"});
  if(tries<10)joinTimer=setTimeout(again,3000);else fail(upCount()?"Связь есть, но доска репетитора не отвечает. Пусть он откроет доску, нажмёт «Позвать на доску» и пришлёт новую ссылку.":"Твой интернет не пускает ни к одному серверу связи.")};
 joinTimer=setTimeout(again,1500)}
function fail(msg){const wasGuest=role==="guest",r=room;const list=chans.length?chanList():"";endSession(true);setStatus("err");const p=$("bdPop");p.hidden=false;p.dataset.fail=1;delete p.dataset.v;
 p.innerHTML=`<h3>Нет связи</h3><p>${esc(msg)}</p>${list?`<div class="bd-chh">Что проверили:</div>${list}`:""}<small>Попробуй другой интернет (например, раздать с телефона) или выключить VPN/блокировщики. Доска при этом работает — можно рисовать самому и показывать экран в звонке.</small><div class="row" style="margin-top:10px"><button class="bd-chip" id="bdRetry">Попробовать снова</button><button class="bd-chip" id="bdHide" style="margin-left:auto">Скрыть</button></div>`;
 $("bdHide").onclick=()=>{p.hidden=true};$("bdRetry").onclick=()=>{p.hidden=true;wasGuest?join(r):host()}}
function endSession(keepStatus){clearTimeout(joinTimer);clearInterval(hbT);clearTimeout(chT);if(role)send({k:"bye"});const old=chans;chans=[];setTimeout(()=>old.forEach(c=>c.close()),200);role=null;peers={};inq={};remote={};cursors={};inited=false;dirty=true;if(!keepStatus&&!el.hidden)setStatus("solo")}
window.addEventListener("pagehide",()=>{if(role)send({k:"bye"})});
$("bdInv").onclick=()=>{if(role){const p=$("bdPop");if(p.hidden)showInvite();else p.hidden=true;return}host()};
/* вход по ссылке #board=..&room=.. */
function fromHash(){const h=new URLSearchParams(location.hash.slice(1));const r=h.get("room"),t=h.get("board");if(!r||!t)return false;
 const id=/^-?\d+$/.test(t)?+t:t;open(id,null,null,{join:true});$("bdTask").hidden=true;join(r);return true}
return {open,close,fromHash,_S:()=>S,_send:send,_B:BROKERS,_ch:()=>chans.map(c=>c.name+":"+(c.up()?"ok":c.state))};
})();
