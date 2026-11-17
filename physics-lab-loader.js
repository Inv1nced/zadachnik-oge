(() => {
  'use strict';
  const entry = document.currentScript;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const logoUrl = new URL('assets/invariant-wordmark.svg', entry.src).href;
  const logoStill = new URL('assets/invariant-wordmark-still.png', entry.src).href;
  const pixel = (x,y) => 'M'+x+' '+y+'h1v1h-1z';

  function orbit(angle) {
    const points=new Set(), cos=Math.cos(angle), sin=Math.sin(angle);
    for(let i=0;i<144;i++){
      const t=i*Math.PI/72, x=16*Math.cos(t), y=6*Math.sin(t);
      points.add(pixel(Math.round(19+x*cos-y*sin),Math.round(19+x*sin+y*cos)));
    }
    return [...points].join('');
  }

  function atom() {
    const paths=[0,Math.PI/3,-Math.PI/3].map(angle=>`<path d="${orbit(angle)}"/>`).join('');
    return `<svg class="physics-lab-atom" viewBox="0 0 40 40" aria-hidden="true" shape-rendering="crispEdges">
      <g class="physics-lab-orbits">${paths}<path class="physics-lab-electrons" d="M34 18h3v3h-3zM10 31h3v3h-3zM25 5h3v3h-3z"/></g>
      <path class="physics-lab-nucleus" d="M18 17h4v1h1v4h-1v1h-4v-1h-1v-4h1z"/>
    </svg>`;
  }

  function start(label, {delay=0, minimum=360, timeout=3200}={}) {
    if (!document.body || window.self!==window.top) return ()=>{};
    const theme=()=>{
      try{return localStorage.getItem('oge-theme')==='light'?'light':'dark'}
      catch{return 'dark'}
    };
    let overlay, shownAt=0, finished=false, closeTimer;
    const show=()=>{
      overlay=document.createElement('div');
      overlay.className='physics-lab-overlay';
      overlay.dataset.labTheme=theme();
      overlay.innerHTML=`<section class="physics-lab-window">
        <div class="physics-lab-titlebar" aria-hidden="true"><span>INVARIANT</span><span class="physics-lab-indicator"></span></div>
        <div class="physics-lab-body">
          <div role="img" aria-label="INVARIANT">${atom()}<picture><source media="(prefers-reduced-motion: reduce)" srcset="${logoStill}"><img class="physics-lab-wordmark" src="${logoUrl}" alt="" width="288" height="38"></picture></div>
          <p class="physics-lab-status" role="status"></p>
          <div class="physics-lab-progress" aria-hidden="true">${'<span></span>'.repeat(12)}</div>
        </div>
      </section>`;
      overlay.querySelector('.physics-lab-status').textContent=label;
      document.body.append(overlay);
      shownAt=performance.now();
    };
    const showTimer=delay?setTimeout(show,delay):0;
    if(!delay)show();
    const deadline=setTimeout(()=>finish(true),timeout);
    function finish(now=false){
      if(finished)return;
      finished=true;
      clearTimeout(showTimer);
      clearTimeout(deadline);
      if(!overlay)return;
      const remaining=reducedMotion.matches||now?0:Math.max(0,minimum-(performance.now()-shownAt));
      if(remaining)closeTimer=setTimeout(remove,remaining);
      else remove();
    }
    function remove(){
      clearTimeout(showTimer);
      clearTimeout(deadline);
      clearTimeout(closeTimer);
      overlay?.remove();
      window.removeEventListener('pagehide',remove);
    }
    window.addEventListener('pagehide',remove,{once:true});
    return finish;
  }

  window.PhysicsLabLoader={start};
  if(entry?.hasAttribute('data-lab-entry') && !new URLSearchParams(location.search).has('workspace')){
    const label=entry.dataset.labEntry;
    const finish=start(label||'Загружаем задачник…',label?{delay:125,minimum:180}:{});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>finish(),{once:true});
    else finish();
  }
})();
