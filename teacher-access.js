/* Password-gated, authenticated decryption. No plaintext password is stored. */
(async()=>{
'use strict';
const auth=OgeTeacherSession,SESSION=auth.session,DEVICE=auth.device,root=document.getElementById('teacher-access'),form=document.getElementById('teacher-login'),input=document.getElementById('teacher-password'),error=document.getElementById('teacher-access-error'),button=form.querySelector('button');
let encrypted;
async function load(){if(encrypted)return encrypted;const response=await fetch(root.dataset.bundle+'?v=20261103privacy',{cache:'no-store'});if(!response.ok)throw new Error('load');encrypted=await response.json();if(encrypted.version!==1||encrypted.algorithm!=='AES-GCM')throw new Error('load');return encrypted;}
async function decrypt(key,data){const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:auth.bytes(data.iv)},key,auth.bytes(data.data));const payload=JSON.parse(new TextDecoder().decode(decoded));if(typeof payload.body!=='string'||!Array.isArray(payload.scripts))throw new Error('format');return payload;}
let mounted=false;
addEventListener('pageshow',e=>{if(e.persisted&&mounted){try{if(!sessionStorage.getItem(SESSION)&&!localStorage.getItem(DEVICE))location.reload()}catch{location.reload()}}});
addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='teacher-logout'&&[...document.querySelectorAll('iframe')].some(f=>f.contentWindow===e.source)){sessionClear();location.reload()}});
addEventListener('storage',e=>{if([SESSION,DEVICE].includes(e.key)&&!e.newValue){sessionClear();if(mounted)location.reload()}});
const sessionClear=()=>auth.clear();
function appendScript(item){return new Promise((resolve,reject)=>{const script=document.createElement('script');if(item.src){script.src=item.src.includes('site-shell.js')?item.src.replace(/\?.*$/,'')+'?v=invariant-1':item.src;script.onload=resolve;script.onerror=reject;}else{script.textContent=item.inline;resolve();}document.body.appendChild(script);});}
function extendBank(bank){
 if(!bank)return null;
 const extra=window.OGE_EXTRA_PHYSICS;
 const coverage=window.OgeBlockPractice;
 const publicRows=[
  ...Object.values(extra?.rows||{}).flat(),
  ...Object.values(coverage?.rows||{}).flat(),
  ...(coverage?coverage.nativeRows(window.OGE_FIPI_NATIVE||{}):[]),
 ];
 const all=coverage?coverage.numberLegacy(bank.ALL):bank.ALL;
 const rows=new Map(all.map(row=>[row[0],row]));
 for(const row of publicRows)if(!rows.has(row[0]))rows.set(row[0],row);
 const titles=Object.fromEntries(Object.entries(coverage?.titles||{}).map(([id,title])=>[id,[title,[]]]));
 return {...bank,ALL:[...rows.values()],LT:{...extra?.lessons,...bank.LT,...titles}};
}
window.OGE_EXTEND_BANK=extendBank;
async function includeOpenPractice(bank){
 if(!bank)return null;
 await Promise.all([
  'bank/extra-physics.js?v=all-physics-1',
  'bank/fipi-native.js?v=bank-coverage-1',
  'bank/block-practice.js?v=1',
 ].map(src=>appendScript({src}).catch(()=>{})));
 return extendBank(bank);
}
async function mount(payload){
 document.title=payload.title;document.documentElement.dataset.theme='light';
 for(const href of payload.styles){
  const link=document.createElement('link');
  link.rel='stylesheet';
  const file=href.split('?')[0];
  const filename=file.split('/').at(-1);
  const oldTeacherStyle=filename==='teach.css'&&href===file+'?v=invariant-1';
  link.href=(oldTeacherStyle||filename==='site-shell.css')?file+'?v=interface-1':href;
  document.head.appendChild(link);
 }
 window.__OGE_TEACHER_BANK=await includeOpenPractice(payload.bank);
 root.insertAdjacentHTML('afterend',payload.body);
 root.remove();mounted=true;
 for(const script of payload.scripts)await appendScript(script);
 const exit=document.createElement('button');exit.id='teacher-signout';exit.type='button';exit.textContent='Выйти из кабинета';exit.onclick=()=>{if(parent!==window)parent.postMessage({type:'teacher-logout'},location.origin);sessionClear();location.reload();};(document.getElementById('teacher-session-actions')||document.querySelector('.teacher-header')||document.querySelector('.topbar')||document.body).appendChild(exit);
 if(document.getElementById('teacher-view')&&!document.querySelector('.teacher-app--compact')) {
  document.body.classList.add('teacher-interface');
  await appendScript({src:'teacher-interface.js?v=interface-1'}).catch(()=>{});
 }
 if(window.parent!==window)window.parent.postMessage({type:'teacher-unlocked'},location.origin);
}
form.addEventListener('submit',async event=>{
 event.preventDefault();button.disabled=true;error.textContent='Открываю кабинет…';
 const finish=window.PhysicsLabLoader?.start('Открываем кабинет…',{delay:100,minimum:260});
 try {
  const data=await load(),key=await auth.derive(input.value,data.salt,data.iterations),payload=await decrypt(key,data);
  input.value='';await auth.save(key,data.salt,document.getElementById('teacher-remember').checked);await mount(payload);
 } catch (failure) {
  input.value='';input.focus();error.textContent=failure.message==='load'?'Не удалось загрузить кабинет. Обнови страницу и попробуй снова.':'Пароль не подошёл. Используй пароль журнала репетитора.';button.disabled=false;
 } finally {finish?.()}
});
let finishSavedSession;
try {
 if(sessionStorage.getItem(SESSION)||localStorage.getItem(DEVICE)){
  button.disabled=true;error.textContent='Открываю кабинет…';
  finishSavedSession=window.PhysicsLabLoader?.start('Открываем кабинет…',{delay:100,minimum:260});
  const data=await load(),key=await auth.read(data.salt);
  if(!key)throw new Error('session');
  const payload=await decrypt(key,data);await auth.save(key,data.salt);await mount(payload);
 }
} catch {sessionClear();button.disabled=false;error.textContent='Введи пароль для входа.';}
finally {finishSavedSession?.()}
})();
