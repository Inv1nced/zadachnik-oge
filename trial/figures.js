import {svg, arrow, plot, samples, carExam, svgUrl} from './graphics.js';
import {circuitScene} from './models.js';

const escape = value => OgeCore.escapeHtml(value);
const ink = '#334259', accent = '#4436aa', teal = '#16706d';
const path = (points, color = ink, dash = '') => `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" ${dash ? 'stroke-dasharray="5 4"' : ''}/>`;
const point = (x,y,color = accent) => `<circle cx="${x}" cy="${y}" r="5" fill="${color}"/>`;
const text = (x,y,label) => `<text x="${x}" y="${y}" fill="${ink}" text-anchor="middle" font-size="14">${escape(label)}</text>`;
const box = (x,y,label='') => `<rect x="${x-25}" y="${y-28}" width="50" height="28" rx="5" fill="#eeecfa" stroke="${accent}" stroke-width="2"/>`+text(x,y-9,label);

function electric(task) {
  const f=task.figure;
  if (task.id==='ELC-02') {
    const meter = (x,y,label) => `<circle cx="${x}" cy="${y}" r="16" fill="white" stroke="${ink}" stroke-width="2"/>`+text(x,y+5,label);
    return svg(path('66,100 66,54 385,54 385,142 66,142 66,124') + path('47,100 85,100') + path('55,124 77,124') +
      path('256,54 256,102 352,102 352,54') + meter(160,54,'A') + meter(305,102,'V') + text(160,27,'0,4 А') + text(305,130,'6 В') +
      meter(305,54,'×'), 'Амперметр последовательно с лампой, вольтметр параллельно лампе',460,164);
  }
  if (task.id==='ELC-04') {
    const compare = (offset,r) => `<g transform="translate(${offset},0)">`+path('22,86 22,49 192,49 192,119 22,119 22,102')+
      path('10,86 34,86')+path('15,102 29,102')+text(49,79,'12 В')+box(86,63,`r = ${r}`)+
      `<circle cx="150" cy="49" r="13" fill="white" stroke="${ink}" stroke-width="2"/>`+text(150,54,'×')+text(150,28,'6 Ом')+'</g>';
    return svg(compare(13,2)+compare(237,6), 'Два источника с разным внутренним сопротивлением',460,143);
  }
  const elements = f.elements.filter(item => item.type !== 'switch');
  const parallel = elements.length===3, lamp=elements[0].type==='lamp', switched=Boolean(f.switchInitialState);
  const p = {U:f.source.emfV ?? f.source.voltageV ?? 12, r:f.source.internalResistanceOhm ?? 0,
    Rseries:parallel ? elements[0].resistanceOhm : 0,
    Rbranch1:elements[parallel?1:0].resistanceOhm, Rbranch2:elements[2]?.resistanceOhm,
    closed:switched ? f.switchInitialState['К']==='closed' : undefined};
  return circuitScene({p,lamp,parallel,exam:switched,labels:elements.map(item=>`${item.id} · ${item.resistanceOhm} Ом`)});
}

function examFigure(task) {
  const id = task.id;
  const ground=path('32,127 426,127');
  if (id.startsWith('ELC')) return electric(task);
  if (id==='KIN-05' || id==='KIN-06') {
    const both = id==='KIN-06';
    const body=path('43,25 43,133 425,133')+text(33,25,'y')+text(431,136,'x')+path('43,51 420,51','#adb5c5',true)+text(105,45,both?'45 м':'20 м')+
      point(149,51,teal)+point(150,51)+arrow(150,51,275,51)+text(216,39,both?'v₂ = 14 м/с':'v₀ Б = 15 м/с')+
      (both ? arrow(150,64,204,64,teal)+text(184,85,'v₁ = 6 м/с') : text(145,78,'v₀ А = 0'))+
      arrow(386,74,386,111,teal)+text(407,96,'g');
    return svg(body,'Стартовые положения и скорости',460,156);
  }
  if (id.startsWith('DYN')) {
    if (id==='DYN-01' || id==='DYN-02') {
      const two=id==='DYN-01';
      return svg(ground+box(230,127)+arrow(258,105,368,105)+text(317,90,two?'12 Н':'4 Н')+
        (two?arrow(202,105,140,105,teal)+text(170,90,'6 Н'):'')+arrow(330,55,403,55,teal)+text(416,59,'x'), 'Ящик и приложенные силы',460,151);
    }
    if (id==='DYN-04') return svg(ground+box(176,127)+arrow(176,98,322,36)+path('176,98 322,98 322,36','#a5aec1',true)+text(252,117,'Fₓ = 13 Н')+text(368,71,'Fᵧ = 10 Н'), 'Проекции силы тяги',460,151);
    const a=id==='DYN-05';
    return svg(ground+box(85,127,a?'А':'1')+box(311,127,a?'Б':'2')+arrow(85,a?94:69,159,a?43:111)+arrow(311,a?69:94,385,a?111:43,teal)+
      text(115,27,a?'Fₓ = 6,5 Н, Fᵧ = +8 Н':'Fₓ = 10 Н, Fᵧ = −10 Н')+
      text(342,27,a?'Fₓ = 6,5 Н, Fᵧ = −8 Н':'Fₓ = 10 Н, Fᵧ = +10 Н'), 'Противоположные вертикальные составляющие тяги',460,151);
  }
  if (id==='CON-01') {
    const curve='<path d="M65 32 Q148 33 215 93 T410 124" fill="none" stroke="#334259" stroke-width="2"/>';
    return svg(curve+path('64,32 373,32','#a5aec1',true)+path('193,112 373,112','#a5aec1',true)+point(65,32)+point(263,112,teal)+path('371,32 371,112')+text(395,78,'5 м')+text(255,139,'Датчик'), 'Разность высот между стартом и датчиком',460,154);
  }
  if (id==='CON-02' || id==='CON-04') {
    const pair=id==='CON-04';
    return svg(ground+box(pair?125:225,127,pair?'1,5 кг':'0,5 кг')+
      (pair?box(337,127,'0,5 кг')+arrow(119,74,189,74)+arrow(342,74,272,74,teal)+text(145,60,'4 м/с')+text(318,60,'4 м/с')
        :arrow(224,76,143,76)+text(180,61,'6 м/с'))+arrow(345,34,414,34,teal)+text(428,39,'x'), 'Направления скоростей и ось x',460,149);
  }
  if (id==='CON-03') {
    return svg(path('33,38 420,38','#a5aec1',true)+path('33,107 420,107','#a5aec1',true)+
      '<path d="M45 38 Q56 131 188 130 M246 38 Q368 42 388 130" fill="none" stroke="#334259" stroke-width="2"/>'+
      point(45,38)+point(246,38,teal)+text(414,33,'3,2 м')+text(414,101,'1,4 м')+text(72,63,'А')+text(269,61,'Б'),'Два профиля с одинаковыми уровнями высоты',460,151);
  }
  return svg(path('42,44 157,123 304,123 419,31')+box(66,60,'А')+box(221,123,'Б')+
    path('40,45 40,123','#a5aec1',true)+text(82,105,id==='CON-05'?'3,2 м':'1,8 м')+text(383,78,'h')+text(229,144,'Горизонтальный участок'),
    'Спуск, горизонтальный участок и подъём',460,158);
}

export function figureImages(task) {
  const f = task.figure;
  if (!f) return [];
  if (f.type === 'svg') return [f.svg];
  if (f.type === 'diagram' || f.type === 'circuit') return [examFigure(task)];
  if (f.type !== 'graphs') return [];
  return f.graphs.map(g => plot(g.series.map(s => ({
    label: s.label,
    points: s.points ?? samples(g.timeDomain[1], task.id === 'KIN-03' ? t => carExam(t)[0] : t => 6 * t - t ** 2)
  })), {domain: g.timeDomain, xLabel: g.xAxis, yLabel: g.yAxis}));
}

export function figureMarkup(task) {
  const f = task.figure;
  if (!f) return '';
  const images = figureImages(task);
  let body = images.map((image, i) => {
    const match = image.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const size = match ? `width="${match[1]}" height="${match[2]}"` : '';
    return `<img src="${svgUrl(image)}" ${size} alt="${escape(f.alt ?? f.graphs?.[i]?.yAxis ?? 'Схема к задаче')}">`;
  }).join('');
  if (f.type === 'table') {
    body = `<table aria-label="Данные задачи"><thead><tr>${f.columns.map(c => `<th scope="col">${escape(c)}</th>`).join('')}</tr></thead><tbody>${f.rows.map(row => `<tr>${row.map(v => `<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  const label = f.description?.replace(/ При разборе.*| В разборе.*| На схеме для разбора.*| Второй кадр для разбора.*/s, '');
  return `<figure class="figure">${body}${label ? `<figcaption>${f.type === 'graphs' ? `<details><summary>Текстовое описание графика</summary><p>${escape(label)}</p></details>` : escape(label)}</figcaption>` : ''}</figure>`;
}
