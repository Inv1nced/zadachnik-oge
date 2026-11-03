(()=>{
const script=document.currentScript,base=new URL('.',script.src);let theme='dark';try{theme=localStorage.getItem('oge-theme')||'dark'}catch{}
document.documentElement.dataset.theme=theme;
if(new URLSearchParams(location.search).has('workspace'))document.documentElement.classList.add('workspace-embed');
const nav=document.createElement('nav');nav.className='site-nav';nav.setAttribute('aria-label','Материалы и кабинет');
let teacher=false;try{teacher=!!sessionStorage.getItem('oge-teacher-session-v1')}catch{}
const items=[...(teacher?[['teach.html','Вести урок']]:[]),['index.html','Задачник'],['grafiki.html','Графики'],['forces.html','Силы'],['experiment-density.html','Лаборатория'],...(teacher?[['tutor-plan/','Маршрут ОГЭ']]:[])];
nav.innerHTML=items.map(([url,text])=>`<a href="${new URL(url,base).href}" ${location.pathname===new URL(url,base).pathname?'aria-current="page"':''}>${text}</a>`).join('')+'<button type="button" aria-label="Переключить светлую и тёмную тему"></button>';
document.body.prepend(nav);const button=nav.querySelector('button');function paint(){button.textContent=document.documentElement.dataset.theme==='light'?'Тёмная тема':'Светлая тема'}paint();button.onclick=()=>{const t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;try{localStorage.setItem('oge-theme',t)}catch{}paint()};
})();
