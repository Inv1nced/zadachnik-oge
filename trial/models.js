import { svg, arrow, plot, samples, carExam, format } from './graphics.js';
import { motion, route, fall, incline, staticContact, circuit } from './physics.js';

const ink = '#334259', accent = '#4436aa', teal = '#16706d', orange = '#9c4f25';
const text = (x, y, label, align = 'start', color = ink) => `<text x="${x}" y="${y}" fill="${color}" text-anchor="${align}" font-size="13">${label}</text>`;
const line = (x, y, xx, yy, paint = ink, dash = '') => `<path d="M${x} ${y}L${xx} ${yy}" stroke="${paint}" stroke-width="2" fill="none" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const ball = (x, y, color = accent, size = 7) => `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}"/>`;
const cart = (x, y, color = accent) => `<rect x="${x - 15}" y="${y - 12}" width="30" height="15" rx="4" fill="${color}"/>${ball(x - 9,y + 5,ink,3)}${ball(x + 9,y + 5,ink,3)}`;
const control = (key, label, min, max, step) => ({key, label, min, max, step});
const result = (scene, readings, graphs = []) => ({scene, readings, graphs});
const v = (label, n, unit = '') => [label, n, unit];

function axisScale(all, left = 45, right = 415) {
  const min = Math.min(0, ...all);
  const max = Math.max(1, ...all);
  return value => left + (right - left) * (value - min) / (max - min);
}
function track(x, y, caption) {
  return line(30,y + 9,432,y + 9) + text(32,y - 22,caption) + line(x,y + 9,x,y + 15) + cart(x,y);
}
function graph(points, end, label, cursor, secondary) {
  return plot([{points, label:'Автомобиль'}, ...(secondary ? [{label:'Камера', points:secondary}] : [])], {domain:[0,end],yLabel:label,cursor});
}

function car(task) {
  const exam = task.model === 'ege-car';
  const p = task.params;
  const defaults = exam ? {x0:10, a:4} : {x0:0, v0:p.v0 ?? p.v, a:p.a ?? 0};
  return {
    title:'Движение и три графика', defaults,
    controls: exam ? [control('x0','Начальная координата, м',-15,30,1),control('a','Модуль ускорения, м/с²',1,8,.5)]
      : [control('x0','Начальная координата, м',-20,20,1),control('v0','Начальная скорость, м/с',-20,20,.5),control('a','Ускорение, м/с²',-5,5,.5)],
    note: exam ? '0–2 с · разгон. 2–4 с · равномерное движение. 4–8 с · ускорение направлено влево.' : 'Модель с постоянным ускорением вдоль прямой.',
    duration: () => exam ? 8 : p.endTime,
    frame(t, values, end) {
      const evaluate = u => {
        if (exam) return carExam(u,values.x0,values.a);
        const m = motion(u,values.x0,values.v0,values.a);
        return [m.x, m.v, m.a];
      };
      const series = [0, 1, 2].map(i => samples(end,u => evaluate(u)[i],48));
      if (exam) series[2] = [[0,values.a],[2,values.a],[2,0],[4,0],[4,-values.a],[8,-values.a]];
      const camera = exam ? [[0,22],[8,38]] : null;
      const x = axisScale([...series[0].map(point => point[1]), ...(exam ? [22, 38] : [])]);
      const [position, speed, a] = evaluate(t);
      const figure = track(x(position),65,'Автомобиль') + arrow(x(position),87,x(position) + Math.sign(speed) * Math.min(44,4 * Math.abs(speed)),87);
      const second = exam ? track(x(22 + 2 * t),135,'Камера') : '';
      return result(svg(figure + second,'Движение по прямой',460,exam ? 170 : 105),
        [v('x',position,'м'),v('vₓ',speed,'м/с'),v('aₓ',a,'м/с²')],
        ['x, м','vₓ, м/с','aₓ, м/с²'].map((label,i) => graph(series[i],end,label,t,i === 0 && camera)));
    }
  };
}

function displacement({params}) {
  const {segments, endTime} = params;
  return {
    title:'Путь и перемещение', defaults:{out:segments[0].to, back:segments[1].to},
    controls:[control('out','Координата разворота, м',10,160,1),control('back','Координата финиша, м',0,150,1)],
    note:'Фиолетовая стрелка соединяет старт с текущим положением. Путь складывается из длин пройденных отрезков.',
    duration: () => endTime,
    frame(t,{out,back}) {
      const trip = [{...segments[0],to:out},{...segments[1],from:out,to:back},...segments.slice(2).map(s => ({...s,from:back,to:back}))];
      const {x, distance, displacement: dx} = route(t,trip);
      const scale = axisScale([out,back]);
      const marks = [[0, 'Старт'], [out, 'Разворот'], [back, 'Финиш']].map(([point,name],i) => line(scale(point),91,scale(point),102) + text(scale(point),i === 2 ? 145 : 125,`${name} · ${point} м`,'middle')).join('');
      return result(svg(track(scale(x),80,'Положение на оси x') + marks + arrow(scale(0),52,scale(x),52),'Положение и вектор перемещения',460,159),
        [v('Путь',distance,'м'),v('Δx',dx,'м'),v('Путь / t',t ? distance / t : '—','м/с'),v('Δx / t',t ? dx / t : '—','м/с')]);
    }
  };
}

function falling(task) {
  const compare = task.id === 'KIN-06';
  const defaults = compare ? {h:45,g:10,a:6,b:14} : {h:20,g:10,a:0,b:15};
  return {
    title:compare ? 'Два горизонтальных броска' : 'Свободное падение и горизонтальный бросок',
    defaults, duration:p => fall(0,p.h,p.g,p.b).duration,
    note:'Без сопротивления воздуха. Оба тела стартуют с одной высоты. Модель останавливается у поверхности.',
    controls:[control('h','Высота, м',5,50,1),control('g','g, м/с²',1,16,.1),...(compare ? [control('a','Скорость первого запуска, м/с',0,24,1)] : []),control('b','Горизонтальная скорость Б, м/с',0,24,1)],
    frame(t,p,end) {
      const first = fall(t,p.h,p.g,p.a), second = fall(t,p.h,p.g,p.b);
      const extent = Math.max(p.h,p.a * end,p.b * end,1);
      const factor = Math.min(340 / extent, 126 / p.h);
      const x = k => 52 + k * factor;
      const y = k => 163 - k * factor;
      const path = speed => samples(t,u => fall(u,p.h,p.g,speed).y,26).map(([u,height]) => `${x(speed * u)},${y(height)}`).join(' ');
      const shapes = line(52,163,433,163) + line(52,27,52,163) + text(33,32,'y, м') + text(425,186,'x, м') +
        line(52,y(second.y),430,y(second.y),'#adb5c5','5 4') +
        `<polyline points="${path(p.a)}" fill="none" stroke="${teal}" stroke-width="2" stroke-dasharray="4 3"/><polyline points="${path(p.b)}" fill="none" stroke="${accent}" stroke-width="2"/>` +
        ball(x(first.x),y(first.y),teal,9) + ball(x(second.x),y(second.y),accent,5) + text(281,25,'А', 'start',teal) + text(325,25,'Б','start',accent);
      return result(svg(shapes,'Траектории в общем масштабе по x и y',460,198),[v('Высота обоих',second.y,'м'),v('x А',first.x,'м'),v('x Б',second.x,'м'),v('v А',first.speed,'м/с'),v('v Б',second.speed,'м/с')]);
    }
  };
}

function forces(task) {
  const p = task.params;
  const defaults = {m:p.m, right:p.forces.filter(f => f > 0).reduce((a,b) => a+b,0), left:-p.forces.filter(f => f < 0).reduce((a,b) => a+b,0), v0:p.v0};
  return {
    title:'Действие сил',defaults,duration: () => p.endTime,
    controls:[control('m','Масса, кг',.5,12,.5),control('right','Сила вправо, Н',0,24,.5),control('left','Сила влево, Н',0,24,.5),control('v0','Начальная скорость, м/с',-12,12,.5)],
    note:'Постоянные горизонтальные силы. Ускорение задаётся их суммой независимо от направления скорости.',
    frame(t,{m,right,left,v0},end) {
      const force = right-left, state = motion(t,0,v0,force/m);
      const path = samples(end,u => motion(u,0,v0,force/m).x);
      const x = axisScale(path.map(point => point[1]),105,355)(state.x);
      const scale = 65 / Math.max(1,right,left);
      const graphics = track(x,104,'Тележка на горизонтальной дорожке') + arrow(x,63,x+right*scale,63,accent) + arrow(x,63,x-left*scale,63,orange) +
        text(33,24,`Вправо ${format(right)} Н`,'start',accent) + text(428,24,`Влево ${format(left)} Н`,'end',orange);
      return result(svg(graphics,'Силы вправо и влево пропорциональны длинам стрелок',460,139),
        [v('ΣFₓ',force,'Н'),v('aₓ',state.a,'м/с²'),v('vₓ',state.v,'м/с'),v('x',state.x,'м')]);
    }
  };
}

function crates() {
  const defaults = {m:2,fx:6.5,fy:8,mus:.4,muk:.25,g:10};
  return {
    title:'Когда ящик сдвинется',defaults,duration: () => 1,
    controls:[control('fx','Горизонтальная тяга, Н',0,15,.5),control('fy','Вертикальная составляющая, Н',0,15,.5),control('mus','Коэффициент трения покоя',.25,.8,.05)],
    note:'Ящики стартуют из покоя. Трение покоя компенсирует тягу до своего предельного значения. Коэффициент трения скольжения равен 0,25.',
    frame(t, p, end) {
      const contacts = [1,-1].map(sign => staticContact({...p,fy:sign*p.fy}));
      const x = axisScale(contacts.map(q => q.a * end**2/2),108,334);
      const body = contacts.map((q,i) => {
        const origin = x(q.a*t*t/2), y = 79 + i*79, dy = i ? 1 : -1;
        return track(origin,y,i ? 'Б' : 'А') + arrow(origin,y-6,origin+4*p.fx,y-6+4*p.fy*dy) +
          arrow(origin,y-4,origin-4*q.friction,y-4,orange) + arrow(origin,y,origin,y-q.normal*1.1,teal);
      }).join('');
      return result(svg(body,'Два ящика с противоположными вертикальными составляющими тяги',460,181),
        contacts.flatMap((q,i) => [v(`N ${i?'Б':'А'}`,q.normal,'Н'),v(`Fтр ${i?'Б':'А'}`,q.friction,'Н'),v(`aₓ ${i?'Б':'А'}`,q.a,'м/с²')]));
    }
  };
}

function energy({params:p}) {
  return {
    title:'Баланс энергии на склоне',defaults:{...p},duration: values => incline(0,values).duration,
    controls:[control('m','Масса, кг',.5,4,.1),control('H','Высота, м',1,Math.min(9,p.L-1),.1),control('Ff','Сила трения, Н',0,12,.5)],
    note:'Нулевой уровень на нижнем конце. При трении часть механической энергии переходит во внутреннюю.',
    frame(t,values) {
      const state = incline(t,values);
      const width = Math.sqrt(values.L ** 2 - values.H ** 2);
      const scale = Math.min(330/width,110/values.H);
      const x = 61 + state.s/values.L*width*scale, y = 141-state.h*scale;
      const track = line(38,141,422,141,'#adb5c5') + line(61,141-values.H*scale,61+width*scale,141) +
        (p.compareHeight < values.H ? line(52,141-p.compareHeight*scale,61+width*scale,141-p.compareHeight*scale,'#adb5c5','5 4') + text(427,137-p.compareHeight*scale,`${format(p.compareHeight)} м`,'end') : '') +
        ball(x,y,accent,9) + text(37,164,'Нулевой уровень');
      const energies = [state.ep,state.ek,state.thermal];
      const bars = energies.map((e,i) => `<rect x="${67+114*i}" y="${110-e/state.total*80}" width="69" height="${e/state.total*80}" rx="4" fill="${[teal,accent,orange][i]}"/>${text(102+114*i,131,['Eₚ','Eₖ','ΔU'][i],'middle')}`).join('');
      return result(svg(track,'Движение по наклонной в общем масштабе по обеим осям',460,180),
        [v('h',state.h,'м'),v('v',state.v,'м/с'),v('Eₚ',state.ep,'Дж'),v('Eₖ',state.ek,'Дж'),v('ΔU',state.thermal,'Дж'),v('Сумма',state.total,'Дж')],
        [svg(line(42,110,428,110,'#adb5c5')+bars,'Превращение энергий',460,148)]);
    }
  };
}

const component = (x,y,label,lamp,power = 0) => lamp
  ? `<circle cx="${x}" cy="${y}" r="14" stroke="${ink}" stroke-width="2" fill="${power > 0 ? `rgba(255,175,50,${Math.min(.84,.18+.65*power/15)})` : '#fff'}"/>${line(x-8,y-8,x+8,y+8)}${line(x-8,y+8,x+8,y-8)}${text(x,y-20,label,'middle')}`
  : `<rect x="${x-21}" y="${y-8}" width="42" height="16" stroke="${ink}" stroke-width="2" fill="#fff"/>${text(x,y-15,label,'middle')}`;
const switchSymbol = (x,y,closed) => `<path d="M${x-15} ${y}H${x+15}" stroke="#f6f7fb" stroke-width="6"/>${line(x-14,y,x+14,y-(closed?0:12))}${ball(x-14,y,ink,2.5)}${ball(x+14,y,ink,2.5)}`;
export function circuitScene({p, lamp, parallel, exam, t = 0, live = false, labels}) {
  const {current,i1,i2} = live ? circuit(p) : {current:0,i1:0,i2:0};
  const power = (i,R) => i*i*R;
  let body = `<path d="M55 67H399V150H55Z" fill="none" stroke="${ink}" stroke-width="2"/>` +
    `<path d="M55 130V103" stroke="#f6f7fb" stroke-width="6"/>${line(40,105,70,105)}${line(47,125,63,125)}${text(82,108,`+ ${format(p.U)} В`)}`;
  if (parallel) {
    body += line(232,67,232,120)+line(232,120,399,120);
    // The right-hand vertical conductor is the return. The lower branch ends at y = 120.
    body += component(144,67,labels?.[0] ?? `R₀ · ${format(p.Rseries)} Ом`,lamp,power(current,p.Rseries)) +
      component(303,67,labels?.[1] ?? `R₁ · ${format(p.Rbranch1)} Ом`,lamp,power(i1,p.Rbranch1)) +
      component(303,120,labels?.[2] ?? `R₂ · ${format(p.Rbranch2)} Ом`,lamp,power(i2,p.Rbranch2)) + ball(232,67,ink,3) + ball(399,120,ink,3);
    if (exam) body += switchSymbol(363,120,p.closed) + text(363,144,'К','middle') + text(75,174,`r = ${format(p.r)} Ом`);
  } else {
    body += component(245,67,labels?.[0] ?? `R · ${format(p.Rbranch1)} Ом`,lamp,power(current,p.Rbranch1));
    if (p.closed !== undefined) body += switchSymbol(347,67,p.closed) + text(347,49,'К','middle');
  }
  if (live) {
    const dots = (start,end,y,i) => {
      if (i <= 0) return '';
      const length = end-start;
      return [0,.33,.67].map(phase => ball(start + ((t*i*29+phase*length)%length),y,accent,2.8)).join('');
    };
    body += parallel ? dots(76,115,67,current)+dots(241,274,67,i1)+dots(241,274,120,i2) : dots(79,205,67,current);
  }
  return svg(body,'Электрическая схема. Батарея слева, нагрузка справа.',460,187);
}

function circuits(task) {
  const exam = task.model === 'branch-switch';
  const p = task.params;
  const parallel = exam || p.topology === 'series-parallel';
  const lamp = exam || p.load === 'lamp';
  const defaults = exam ? {U:18,r:3,Rseries:6,Rbranch1:6,Rbranch2:6,closed:false,branchSwitch:true}
    : {...p,Rbranch1:p.Rbranch1 ?? p.R};
  const resistance = parallel
    ? [control('Rseries','Общий резистор, Ом',1,24,1),control('Rbranch1','Первая ветвь, Ом',1,24,1),control('Rbranch2','Вторая ветвь, Ом',1,24,1)]
    : [control('Rbranch1','Сопротивление, Ом',1,24,1)];
  return {
    title:'Ток в цепи', defaults, duration: () => 8,
    note:'Установившийся режим. Движение точек показывает направление условного тока. Скорость точек пропорциональна силе тока.',
    controls:[{key:'closed',label:exam?'Замкнуть ключ во второй ветви':'Замкнуть цепь',checkbox:true},control('U',exam?'ЭДС, В':'Напряжение, В',1,24,.5),...resistance],
    frame(t,p) {
      const {current,i1,i2} = circuit(p);
      const labels = exam ? [`А · ${format(p.Rseries)} Ом`,`Б · ${format(p.Rbranch1)} Ом`,`В · ${format(p.Rbranch2)} Ом`] : undefined;
      const readings = [v('Ток источника',current,'А')];
      if (parallel) readings.push(v('Первая ветвь',i1,'А'),v('Вторая ветвь',i2,'А'));
      if (exam) readings.push(v('P А',current**2*p.Rseries,'Вт'),v('P Б',i1**2*p.Rbranch1,'Вт'),v('P В',i2**2*p.Rbranch2,'Вт'));
      return result(circuitScene({p,lamp,parallel,exam,t,live:true,labels}),readings);
    }
  };
}

function twoTracks() {
  const defaults = {H:3.2,g:10};
  return {
    title:'Одинаковая высота на двух дорожках',defaults,duration:p => p.H,
    timelineLabel:'Вертикальный спуск Δh',timeUnit:'м',playbackRate:.7,
    controls:[control('H','Начальная высота, м',2,6,.1),control('g','g, м/с²',2,15,.1)],
    note:'Кадры синхронизированы по высоте. Время движения по разным профилям может отличаться.',
    frame(drop,p) {
      const progress = drop/p.H, h = p.H-drop;
      const u = 1-Math.sqrt(1-progress), w = Math.sqrt(progress);
      const x = [45+158*u*u,248+158*(2*w-w*w)];
      const y = 24+progress*112;
      const target = 24+(1-1.4/p.H)*112;
      const shapes = line(29,136,431,136,'#adb5c5') + line(29,target,431,target,'#adb5c5','5 4') +
        '<path d="M45 24 Q45 136 203 136 M248 24 Q406 24 406 136" fill="none" stroke="#334259" stroke-width="2"/>' +
        ball(x[0],y,teal)+ball(x[1],y,accent)+text(59,19,'А','start',teal)+text(262,19,'Б','start',accent) +
        text(430,target-4,'1,4 м','end');
      return result(svg(shapes,'Две гладкие дорожки на общей высоте',460,157),
        [v('h',h,'м'),v('v А',Math.sqrt(2*p.g*drop),'м/с'),v('v Б',Math.sqrt(2*p.g*drop),'м/с'),v('Eₚ/m',p.g*h,'Дж/кг'),v('Eₖ/m',p.g*drop,'Дж/кг')]);
    }
  };
}

function collision() {
  const defaults = {a:1,b:3,H:3.2};
  const stages = ['На вершине', 'Перед ударом', 'После удара', 'Верхняя точка подъёма'];
  return {
    title:'Спуск, удар и подъём',defaults,duration:() => 3.99,timelineLabel:'Этап',timeUnit:'',
    describeTime:t => stages[Math.floor(t)],playbackRate:.9,
    controls:[control('a','Масса А, кг',.5,5,.5),control('b','Масса Б, кг',.5,5,.5),control('H','Начальная высота, м',1,5,.1)],
    note:'Контрольные кадры. Импульс сохраняется за короткое время удара. Механическая энергия сохраняется на гладких участках.',
    frame(t,p) {
      const stage = Math.floor(t), g = 10;
      const startEnergy = p.a*g*p.H, speed = Math.sqrt(2*g*p.H);
      const momentum = p.a*speed, totalMass = p.a+p.b, after = momentum**2/(2*totalMass);
      const h = after/(totalMass*g), y = 126-84*h/5;
      const scene = '<path d="M45 42L160 126H270L415 42" fill="none" stroke="#334259" stroke-width="2"/>';
      const startY = 126-84*p.H/5;
      const startX = 160-(126-startY)*115/84;
      const positions = [[startX,startY],[179,126],[224,126],[260+(126-y)*145/84,y]];
      const [x, height] = positions[stage];
      const shapes = scene + cart(x,height-10) + (stage < 2 ? cart(217,116,teal) : cart(x+19,stage===3 ? Math.min(116,height-10-9*84/145) : height-10,teal)) + text(36,163,stages[stage]);
      const ep = [startEnergy,0,0,after][stage], ek = [0,startEnergy,after,0][stage];
      return result(svg(shapes,'Четыре контрольных положения тележек',460,180),
        [v('Высота',[p.H,0,0,h][stage],'м'),v('Eₚ',ep,'Дж'),v('Eₖ',ek,'Дж'),v('Потери при ударе',stage>=2?startEnergy-after:0,'Дж'),...(stage===1||stage===2?[v('pₓ',momentum,'кг·м/с')]:[])]);
    }
  };
}

function gas({params:p}) {
  const reflect = (n,length) => {
    const phase = ((n%(2*length))+2*length)%(2*length);
    return phase > length ? 2*length-phase : phase;
  };
  return {
    title:'Движение частиц газа',defaults:{T:p.compareT},duration:() => p.endTime,timeUnit:'пс',playbackRate:p.playbackPsPerSecond,
    controls:[control('T','Температура второго состояния, К',200,750,1)],
    note:'Два равновесных состояния. Частицы показаны условно и упруго отражаются от стенок. Межчастичные столкновения в модели опущены.',
    frame(t,{T}) {
      const [width,height] = p.boxNm, factor=13;
      const body = [p.referenceT,T].map((temperature,i) => {
        const x0=53+i*215, y0=35, color=i?accent:teal;
        const particles = p.particles.map(particle => {
          const angle=particle.directionDeg*Math.PI/180;
          const speed=p.referenceRmsSpeed*Math.sqrt(temperature/p.referenceT)*particle.speedFactor;
          const [x,y]=particle.initialNm;
          return ball(x0+factor*reflect(x+t*speed*Math.cos(angle)*.001,width),y0+factor*reflect(y+t*speed*Math.sin(angle)*.001,height),color,3.5);
        }).join('');
        return '<rect x="'+x0+'" y="'+y0+'" width="'+factor*width+'" height="'+factor*height+'" fill="#fff" stroke="#adb5c5"/>'+particles+text(x0,23,temperature+' К');
      }).join('');
      return result(svg(body,'Движение частиц при двух температурах',460,157),
        [v('⟨E₂⟩ / ⟨E₁⟩',T/p.referenceT),v('v₂ / v₁',Math.sqrt(T/p.referenceT)),v('v₂ (среднеквадр.)',p.referenceRmsSpeed*Math.sqrt(T/p.referenceT),'м/с')]);
    }
  };
}

const definitions = {
  'ege-car':car, 'uniform-car':car, 'constant-acceleration':car, 'route-vs-displacement':displacement,
  fall:falling, 'net-force':forces, crates, 'hill-energy':energy, 'ohm-circuit':circuits, 'branch-switch':circuits,
  'two-tracks':twoTracks, collision, 'molecular-heating':gas
};
export const createModel = task => definitions[task.model]?.(task);
