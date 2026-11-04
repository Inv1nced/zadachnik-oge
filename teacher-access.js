/* Password-gated, authenticated decryption. No plaintext password is stored. */
(async()=>{
'use strict';
const SESSION='oge-teacher-session-v1',DEVICE='oge-teacher-device-v1',root=document.getElementById('teacher-access'),form=document.getElementById('teacher-login'),input=document.getElementById('teacher-password'),error=document.getElementById('teacher-access-error'),button=form.querySelector('button');
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
let encrypted;
async function load(){if(encrypted)return encrypted;const response=await fetch(root.dataset.bundle+'?v=20261103privacy',{cache:'no-store'});if(!response.ok)throw new Error('load');encrypted=await response.json();if(encrypted.version!==1||encrypted.algorithm!=='AES-GCM')throw new Error('load');return encrypted;}
async function derive(password,data){const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(data.salt),iterations:data.iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['decrypt']);}
async function decrypt(key,data){const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(data.iv)},key,bytes(data.data));const payload=JSON.parse(new TextDecoder().decode(decoded));if(typeof payload.body!=='string'||!Array.isArray(payload.scripts))throw new Error('format');return payload;}
let mounted=false;
addEventListener('pageshow',e=>{if(e.persisted&&mounted){try{if(!sessionStorage.getItem(SESSION)&&!localStorage.getItem(DEVICE))location.reload()}catch{location.reload()}}});
addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='teacher-logout'&&[...document.querySelectorAll('iframe')].some(f=>f.contentWindow===e.source)){sessionClear();location.reload()}});
addEventListener('storage',e=>{if([SESSION,DEVICE].includes(e.key)&&!e.newValue){sessionClear();if(mounted)location.reload()}});
function sessionClear(){try{sessionStorage.removeItem(SESSION)}catch{}try{localStorage.removeItem(DEVICE)}catch{}}
function appendScript(item){return new Promise((resolve,reject)=>{const script=document.createElement('script');if(item.src){script.src=item.src.includes('site-shell.js')?item.src.replace(/\?.*$/,'')+'?v=20261105cute':item.src;script.onload=resolve;script.onerror=reject;}else{script.textContent=item.inline;resolve();}document.body.appendChild(script);});}
async function mount(payload){
 document.title=payload.title;document.documentElement.dataset.theme='light';
 for(const href of payload.styles){const link=document.createElement('link');link.rel='stylesheet';link.href=/site-shell\.css/.test(href)?href.replace(/\?.*$/,'')+'?v=20261105cute':href;document.head.appendChild(link);}
 window.__OGE_TEACHER_BANK=payload.bank||null;
 document.body.innerHTML=payload.body;mounted=true;
 for(const script of payload.scripts)await appendScript(script);
 const exit=document.createElement('button');exit.id='teacher-signout';exit.type='button';exit.textContent='Выйти из кабинета';exit.onclick=()=>{if(parent!==window)parent.postMessage({type:'teacher-logout'},location.origin);sessionClear();try{localStorage.removeItem('jr_pw')}catch{}location.reload();};(document.querySelector('.teacher-header')||document.querySelector('.topbar')||document.body).appendChild(exit);
 if(window.parent!==window)window.parent.postMessage({type:'teacher-unlocked'},location.origin);
}
form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;error.textContent='Открываю кабинет…';try{const data=await load(),key=await derive(input.value,data),payload=await decrypt(key,data);input.value='';try{const saved=JSON.stringify({salt:data.salt,key:b64(await crypto.subtle.exportKey('raw',key))});sessionStorage.setItem(SESSION,saved);if(document.getElementById('teacher-remember').checked)localStorage.setItem(DEVICE,saved);else localStorage.removeItem(DEVICE)}catch{}await mount(payload);}catch(e){input.value='';input.focus();error.textContent=e.message==='load'?'Не удалось загрузить кабинет. Обнови страницу и попробуй снова.':'Пароль не подошёл. Используй пароль журнала репетитора.';button.disabled=false;}});
try{const saved=JSON.parse(sessionStorage.getItem(SESSION)||localStorage.getItem(DEVICE)||'null');if(saved){button.disabled=true;error.textContent='Открываю кабинет…';const data=await load();if(saved.salt!==data.salt)throw new Error('session');const key=await crypto.subtle.importKey('raw',bytes(saved.key),'AES-GCM',false,['decrypt']);const payload=await decrypt(key,data);try{sessionStorage.setItem(SESSION,JSON.stringify(saved))}catch{}await mount(payload);}}catch{sessionClear();button.disabled=false;error.textContent='Введи пароль для входа.';}
})();
