/* Educational SVG motion. No dependencies, network requests or background loops. */
(()=>{
'use strict';
const fmt=n=>Number(n.toFixed(2)).toLocaleString('ru-RU');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let key='',n=1,root,raf=0,last=0,time=0,running=false,changeSetting;
const $=s=>root.querySelector(s);
const arrow=(x,y,d,label)=>`<g transform="translate(${x} ${y})"><path class="accent" d="M0 0H${d}l${d>0?-9:9} -5m${d>0?9:-9} 5l${d>0?-9:9} 5"/><text x="${d/2}" y="-9" text-anchor="middle">${label}</text></g>`;
function scene(){
if(key==='spring')return `<path class="wire" d="M80 35H335M110 35V245M65 245H165"/><g id="spring-coil"><path class="accent" d="M220 45V51l-14 3 28 6-28 6 28 6-28 6 28 6-28 6 28 6-28 6 14 3V110"/></g><g id="spring-load"><rect class="solid" x="202" y="110" width="36" height="40" rx="3"/><text id="load-label" x="220" y="136" text-anchor="middle" font-size="12"></text></g><path class="wire" d="M310 45V210"/><path class="reference" d="M185 110H305"/><text x="325" y="70">l₀ = 10 см</text><text id="length-label" x="325" y="140"></text><text x="180" y="237">Груз в равновесии</text>`;
if(key==='friction')return `<path class="wire" d="M20 210H480"/>${Array.from({length:23},(_,i)=>`<path class="reference" d="M${i*20+12} 212l-8 10"/>`).join('')}<g id="friction-rig"><rect class="solid" x="105" y="145" width="100" height="63" rx="3"/><g id="friction-loads"></g><path class="wire" d="M205 172H240M355 172H388"/><rect class="solid" x="240" y="153" width="115" height="38" rx="10"/><text id="force-label" x="297" y="178" text-anchor="middle"></text>${arrow(205,128,70,'Fтяги')}${arrow(105,180,-65,'Fтр')}</g><text x="180" y="75">v = const →</text><text x="100" y="252">Силы равны по модулю · a = 0</text>`;
return `<path class="wire" d="M75 185V70H140M180 70H260M350 70H435V185H270M230 185H75M265 70V135H287M323 135H350V70"/><g id="current-dots">${Array.from({length:12},()=>'<circle r="4" class="charge"/>').join('')}</g><circle class="solid" cx="160" cy="70" r="20"/><text x="160" y="76" text-anchor="middle">A</text><rect class="solid" x="260" y="58" width="90" height="24"/><text x="305" y="47" text-anchor="middle">R</text><circle class="solid" cx="305" cy="135" r="18"/><text x="305" y="141" text-anchor="middle">V</text><path class="wire" d="M230 169V201M244 176V194M256 169V201M270 176V194"/><text x="213" y="164">+</text><text x="275" y="164">−</text><text id="ammeter-label" x="160" y="112" text-anchor="middle"></text><text id="voltmeter-label" x="305" y="175" text-anchor="middle"></text><text x="250" y="242" text-anchor="middle">Условное направление тока: от + к −</text>`;
}
function status(){const b=document.getElementById('motion-toggle');b.textContent=running?'Пауза':'▶ Запустить опыт';b.setAttribute('aria-pressed',String(running));document.getElementById('motion-status').textContent=reduce.matches?'Включено уменьшение движения: схема обновляется без перемещений.':running?(key==='spring'?'Показываем три нагрузки по очереди.':key==='friction'?'Брусок скользит равномерно. Скорость постоянна при любой нагрузке.':'Маркеры показывают направление и величину тока. Их скорость условная: это не отдельные электроны.'):time?'Пауза. Показания можно записать в таблицу.':'Нажми «Запустить опыт» или измени ползунок.';}
function stop(){if(root)root.getAnimations({subtree:true}).forEach(a=>a.pause());running=false;cancelAnimationFrame(raf);raf=0;last=0;status();}
function frame(now){if(!running)return;const dt=last?Math.min(now-last,50):0;last=now;time+=dt;
if(key==='spring'){const target=Math.min(3,1+Math.floor(time/2200));if(n!==target)changeSetting(target);if(time>=6600){stop();return}}
if(key==='friction'){const x=-55+Math.min(time/6000,1)*110;$('#friction-rig').style.transform=`translateX(${x}px)`;if(time>=6000){stop();return}}
if(key==='ohm')drawCurrent();
raf=requestAnimationFrame(frame);
}
function drawCurrent(){const points=[[230,185],[75,185],[75,70],[435,70],[435,185],[270,185]],length=910;const phase=time*.000045*n;[...$('#current-dots').children].forEach((dot,i)=>{let d=((i/12+phase)%1)*length;for(let j=0;j<points.length-1;j++){const a=points[j],b=points[j+1],len=Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]);if(d<=len){dot.style.transform=`translate(${a[0]+(b[0]-a[0])*d/len}px,${a[1]+(b[1]-a[1])*d/len}px)`;break}d-=len;}});}
function set(value){n=value;if(key==='spring'){$('#spring-coil').style.transform=`translateY(45px) scaleY(${1+20*n/65}) translateY(-45px)`;$('#spring-load').style.transform=`translateY(${20*n}px)`;$('#load-label').textContent=`${n*100} г`;$('#length-label').textContent=`l = ${10+2*n} см`;}
else if(key==='friction'){$('#friction-loads').innerHTML=Array.from({length:n-1},(_,i)=>`<rect class="solid" x="${120+i*32}" y="125" width="27" height="20"/>`).join('');$('#force-label').textContent=`${fmt(.6*n)} Н`;}
else{$('#ammeter-label').textContent=`${fmt(.1*n)} А`;$('#voltmeter-label').textContent=`${2*n} В`;drawCurrent();}}
function mount(type,value,onChange){if(root)stop();key=type;n=value;time=0;root=document.getElementById('scene');changeSetting=onChange;root.innerHTML=`<svg viewBox="0 0 500 270" role="img" aria-label="${key==='spring'?'Растяжение пружины грузом':key==='friction'?'Равномерное скольжение бруска с динамометром':'Направление тока в цепи с резистором'}">${scene()}</svg>`;set(value);if(key==='friction')$('#friction-rig').style.transform='translateX(-55px)';status();}
function toggle(){if(running){stop();return}if(reduce.matches){if(key==='spring')changeSetting(n===3?1:n+1);status();return}if((key==='friction'&&time>=6000)||(key==='spring'&&time>=6600)){time=0;if(key==='spring')changeSetting(1)}root.getAnimations({subtree:true}).forEach(a=>a.play());running=true;last=0;status();raf=requestAnimationFrame(frame);}
function replay(){stop();time=0;changeSetting(1);if(key==='friction')$('#friction-rig').style.transform='translateX(-55px)';toggle();}
document.getElementById('motion-toggle').onclick=toggle;document.getElementById('motion-replay').onclick=replay;
document.addEventListener('visibilitychange',()=>{if(document.hidden&&root)stop()});addEventListener('pagehide',()=>{if(root)stop()});reduce.addEventListener('change',()=>{if(root)stop()});
window.OgeLabMotion={mount,set,interrupt:stop};
})();
