(()=>{
const script=document.currentScript,base=new URL('.',script.src);let theme='dark';try{theme=localStorage.getItem('oge-theme')||'dark'}catch{}
document.documentElement.dataset.theme=theme;
if(new URLSearchParams(location.search).has('workspace'))document.documentElement.classList.add('workspace-embed');
const nav=document.createElement('nav');nav.className='site-nav';nav.setAttribute('aria-label','Материалы и кабинет');
let teacher=false;try{teacher=!!(sessionStorage.getItem('oge-teacher-session-v1')||localStorage.getItem('oge-teacher-device-v1'))}catch{}
const items=[['teach.html','🔒 Журнал репетитора'],['index.html','Задачник'],['grafiki.html','Графики'],['forces.html','Силы'],['laboratory.html','Лаборатория'],...(teacher?[['tutor-plan/','Маршрут ОГЭ']]:[])];
nav.innerHTML=items.map(([url,text])=>`<a href="${new URL(url,base).href}" ${location.pathname===new URL(url,base).pathname?'aria-current="page"':''}>${text}</a>`).join('')+'<button type="button" aria-label="Переключить светлую и тёмную тему"></button>';
document.body.prepend(nav);const button=nav.querySelector('button');function paint(){button.textContent=document.documentElement.dataset.theme==='light'?'Тёмная тема':'Светлая тема'}paint();button.onclick=()=>{const t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;try{localStorage.setItem('oge-theme',t)}catch{}paint()};
if(!document.documentElement.classList.contains('workspace-embed')){
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('frog-helper.css?v=20261105cute',base).href;document.head.append(css);
const helper=document.createElement('script');helper.src=new URL('frog-helper.js?v=20261105cute',base).href;const hints=document.createElement('script');hints.src=new URL('frog-blocks.js?v=20261105cute',base).href;hints.onload=()=>document.body.append(helper);hints.onerror=()=>document.body.append(helper);document.body.append(hints);
}
})();
