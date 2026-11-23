const ink = '#26358f';
const faint = '#7784a8';
const warm = '#995026';

function diagram(label, body, height = 164) {
  return `<svg viewBox="0 0 360 ${height}" role="img" aria-label="${label}">
    <g font-size="15" stroke-linejoin="round" stroke-linecap="round">${body}</g>
  </svg>`;
}

function line(x1, y1, x2, y2, color = ink, dash = '') {
  return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="2" fill="none" ${dash ? 'stroke-dasharray="4 5"' : ''}/>`;
}

function dot(x, y, color = ink, radius = 5) {
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/>`;
}

function label(x, y, text, anchor = 'start') {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
}

function arrow(x1, y1, x2, y2, color = ink) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const end = delta => [x2 - 8 * Math.cos(angle + delta), y2 - 8 * Math.sin(angle + delta)];
  return line(x1,y1,x2,y2,color) + line(...end(.52),x2,y2,color) + line(...end(-.52),x2,y2,color);
}

const plots = {
  'projectile-circle': {
    title: 'Траектория горизонтального броска', axes: ['x, м', 'y, м'], bounds: [0, 12, 0, 20], positions: [[0,20],[6,15],[12,0]],
    curve: Array.from({length: 25}, (_, i) => [i / 2, 20 - 5 * (i / 12) ** 2]),
  },
  'oscillations-waves': {
    title: 'Координата маятника', axes: ['t, с', 'x, м'], bounds: [0, 1, -.1, .1], positions: [[0,.1],[.25,0],[.5,-.1]],
    curve: Array.from({length: 41}, (_, i) => [i / 40, Math.cos(i * Math.PI / 20) / 10]),
  },
  'gas-mkt': {
    title: 'Изотерма идеального газа', axes: ['V, л', 'p, кПа'], bounds: [0, 6, 0, 300], positions: [[6,100],[4,150],[2,300]],
    curve: Array.from({length: 21}, (_, i) => [2 + i / 5, 600 / (2 + i / 5)]),
  },
  'thermodynamic-work': {
    title: 'Работа есть площадь под графиком', axes: ['V, л', 'p, кПа'], bounds: [0, 4, 0, 150], positions: [[2,100],[3,100],[4,100]],
    curve: [[2,100],[4,100]], area: true,
  },
  'thermal-balance': {
    title: 'Плато плавления на графике температуры', axes: ['Q, кДж', 't, °C'], bounds: [0, 40, 0, 12], positions: [[16.5,0],[33,0],[37.2,10]],
    curve: [[0,0],[33,0],[37.2,10]],
  },
  'electric-field': {
    title: 'Напряжённость от точечного заряда', axes: ['r, м', 'E, В/м'], bounds: [0, .4, 0, 3600], positions: [[.1,3600],[.2,900],[.4,225]],
    curve: Array.from({length: 25}, (_, i) => [.1 + i / 80, 36 / (.1 + i / 80) ** 2]),
  },
  'dc-circuits': {
    title: 'Внешнее напряжение источника', axes: ['I, А', 'U, В'], bounds: [0, 12, 0, 12], positions: [[1,11],[2,10],[6,6],[10,2]],
    curve: [[0,12],[12,0]],
  },
  'magnetic-forces': {
    title: 'Зависимость силы Ампера от угла', axes: ['α, °', 'F, Н'], bounds: [0, 90, 0, .3], positions: [[0,0],[30,.15],[90,.3]],
    curve: Array.from({length: 19}, (_, i) => [i * 5, .3 * Math.sin(i * Math.PI / 36)]),
  },
  'induction': {
    title: 'Рост, постоянство и спад магнитной индукции', axes: ['t, с', 'B, Тл'], bounds: [0, 3, 0, .4], positions: [[.5,.2],[1.5,.4],[2.5,.2]],
    curve: [[0,0],[1,.4],[2,.4],[3,0]],
  },
  'photons-photoeffect': {
    title: 'Максимальная кинетическая энергия при фотоэффекте', axes: ['Eф, эВ', 'Kₘ, эВ'], bounds: [0, 3, 0, 1], positions: [null,[2,0],[3,1]],
    curve: [[2,0],[3,1]],
  },
  'nuclear-decay': {
    title: 'Число нераспавшихся ядер', axes: ['t, ч', 'N'], bounds: [0, 9, 0, 8000], positions: [[3,4000],[6,2000],[9,1000]],
    curve: Array.from({length: 37}, (_, i) => [i / 4, 8000 * 2 ** (-i / 12)]),
  },
  'measurement-data': {
    title: 'График U(I) для резистора 5 Ом', axes: ['I, А', 'U, В'], bounds: [0, .6, 0, 3], positions: [[.2,1],[.4,2],[.6,3]],
    curve: [[0,0],[.6,3]],
  },
  'lab-resistance': {
    title: 'Экспериментальные точки I(U)', axes: ['U, В', 'I, А'], bounds: [0, 3.1, 0, .62], positions: [[1,.2],[2,.4],[3,.6]],
    curve: [[0,0],[3,.6]], uncertainties: [.1,.02],
  },
};

const format = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

function plot(config, index) {
  const { title, axes: [xt, yt], positions, bounds: [x0, x1, y0, y1], curve, area, uncertainties } = config;
  const [left, right, top, bottom] = [56, 312, 25, 129];
  const X = x => left + (right-left) * (x-x0) / (x1-x0);
  const Y = y => bottom - (bottom-top) * (y-y0) / (y1-y0);
  const position = positions[index];
  const ticks = [0, .5, 1].map(part => {
    const x = x0 + part * (x1 - x0), y = y0 + part * (y1 - y0);
    return line(X(x),bottom,X(x),top,'#d8deed') + line(left,Y(y),right,Y(y),'#d8deed')
      + label(X(x), bottom+20, format.format(x), 'middle') + label(left-7,Y(y)+5,format.format(y),'end');
  }).join('');
  const path = curve.map(([x,y], i) => `${i ? 'L' : 'M'}${X(x)} ${Y(y)}`).join(' ');
  const graphic = area && position ? `<rect x="${X(curve[0][0])}" y="${Y(position[1])}"
    width="${X(position[0])-X(curve[0][0])}" height="${bottom-Y(position[1])}" fill="#bec9ff"/>` : '';
  const bars = uncertainties ? positions.slice(0,index+1).map(([x,y]) => {
    const [dx,dy] = uncertainties;
    return line(X(x-dx),Y(y),X(x+dx),Y(y),warm) + line(X(x),Y(y-dy),X(x),Y(y+dy),warm) + dot(X(x),Y(y),warm);
  }).join('') : '';
  return diagram(title, ticks + graphic + arrow(left,bottom,330,bottom,faint) + arrow(left,bottom,left,16,faint)
    + `<path d="${path}" fill="none" stroke="${ink}" stroke-width="3"/>` + bars
    + (position ? dot(X(position[0]),Y(position[1]),warm,6) : '')
    + label(318,bottom-11,xt) + label(left+7,15,yt));
}

function lever(index) {
  const tiltedY = [13, 0, -13][index];
  return diagram('Рычаг с силами на двух плечах', line(54,82+tiltedY,307,82-tiltedY)
    + `<path d="M203 82L189 112H217Z" fill="#a5aff0"/>`
    + arrow(63,25+tiltedY,63,78+tiltedY,warm) + arrow(299,25-tiltedY,299,78-tiltedY)
    + label(64,18+tiltedY,'6 Н','middle') + label(299,18-tiltedY,['6 Н','9 Н','12 Н'][index],'middle')
    + label(118,133,'0,30 м','middle') + label(260,133,'0,20 м','middle'));
}

function collision(index) {
  const after = index > 0;
  const x = after ? 151 : 71;
  const second = after ? 199 : 250;
  return diagram('Две тележки до и после сцепления', line(20,115,340,115,faint)
    + `<rect x="${x}" y="79" width="48" height="29" rx="4" fill="#b9c5fd"/>
       <rect x="${second}" y="79" width="42" height="29" rx="4" fill="#e7bb9c"/>`
    + label(x+24,100,'2 кг','middle') + label(second+21,100,'1 кг','middle')
    + arrow(x+12,59,x+67,59) + label(x+8,45,after?'2 м/с':'3 м/с')
    + (!after ? label(second,59,'Покой') : ''));
}

function capacitor(index) {
  const space = index ? 29 : 58;
  const left = 180 - space, right = 180 + space;
  return diagram('Пластины конденсатора с изменяемым зазором',
    line(left,32,left,119) + line(right,32,right,119,warm)
    + label(left-17,69,'+') + label(right+7,69,'−')
    + (index < 2 ? line(left,119,left,141,faint)+line(right,119,right,141,faint)+line(left,141,165,141,faint)+line(195,141,right,141,faint)+line(165,132,165,150)+line(195,136,195,146) : '')
    + arrow(left+3,80,right-3,80,faint));
}

function lc(index) {
  const width = 130, active = index === 1;
  return diagram('Обмен между полями конденсатора и катушки',
    `<path d="M70 42H162M198 42H290V103H228
      c0 -18 -24 -18 -24 0c0 -18 -24 -18 -24 0c0 -18 -24 -18 -24 0c0 -18 -24 -18 -24 0H70Z"
      fill="none" stroke="${active ? warm : ink}" stroke-width="3"/>`
    + line(162,28,162,56) + line(198,28,198,56)
    + label(180,22,index === 2 ? '−     +' : index ? 'q = 0' : '+     −','middle')
    + `<rect x="115" y="129" width="${width}" height="10" fill="#e2e6f7"/>
       <rect x="115" y="129" width="${width}" height="10" fill="${active ? warm : ink}"/>`
    + label(180,158,active ? 'Магнитная энергия' : 'Электрическая энергия','middle'));
}

function refraction(index) {
  const radians=[15,30,40][index]*Math.PI/180;
  const sin=2*Math.sin(radians), x=180, y=78;
  const gamma=Math.asin(Math.min(1,sin));
  const ray=index<2 ? arrow(x,y,x+78*Math.sin(gamma),y+78*Math.cos(gamma)) : '';
  return diagram('Луч на границе сред и нормаль',
    `<rect x="20" y="16" width="320" height="62" fill="#dce5fd"/>`
    + line(20,y,340,y,faint) + line(x,17,x,154,faint,'dash')
    + arrow(x-72*Math.tan(radians),6,x,y,warm) + arrow(x,y,x+65*Math.tan(radians),13,warm)
    + ray + label(26,48,'n₁ = 2') + label(26,110,'n₂ = 1'));
}

function lens(index, lab = false) {
  const x = 182, y = 83, scale = 3.6;
  const [distance, image] = lab ? [30,15] : [[30,15],[20,20],[5,-10]][index];
  const left = x-scale*distance, right = x+scale*image, h = 26, target = y + h*image/distance;
  const end = 316;
  const centerRay = y + h*(end-x)/(x-left);
  const planeRay = y-h + h*(end-x)/(10*scale);
  const focus = 10*scale;
  return diagram('Построение изображения двумя лучами',
    line(20,y,340,y,faint) + arrow(x,y+49,x,y-49) + arrow(x,y-49,x,y+49)
    + dot(x+focus,y,faint,3) + dot(x-focus,y,faint,3)
    + arrow(left,y,left,y-h,warm) + line(left,y-h,end,centerRay)
    + line(left,y-h,x,y-h) + line(x,y-h,end,planeRay)
    + (image < 0 ? line(x,y,right,target,warm,'dash') + line(x,y-h,right,target,warm,'dash') : '')
    + arrow(right,y,right,target,warm)
    + label(x+focus,y+23,'F','middle') + label(x-focus,y+23,'F','middle')
    + (lab ? line(x+scale*(index ? 15 : 10),28,x+scale*(index ? 15 : 10),144,faint,'dash') : '')
    , 172).replace('stroke-linejoin=', 'clip-path="inset(0)" stroke-linejoin=');
}

function waves(index) {
  const phase = [0, Math.PI, 2*Math.PI][index];
  const path = (center, amplitude, shift) => Array.from({length: 81}, (_, i) =>
    `${i ? 'L' : 'M'}${32 + i * 3.8} ${center - amplitude * Math.sin(i * Math.PI / 20 + shift)}`).join(' ');
  return diagram('Наложение двух волн и результирующее колебание',
    `<path d="${path(29,12,0)}" fill="none" stroke="${ink}" stroke-width="2"/>
     <path d="${path(75,12,phase)}" fill="none" stroke="${warm}" stroke-width="2"/>
     <path d="${path(128,index === 1 ? 0 : 24,0)}" fill="none" stroke="#227363" stroke-width="3"/>`);
}

function levels(index) {
  const from = [30,30,88][index], to = [128,88,128][index];
  return diagram('Схема энергетических уровней учебной модели',
    [30,88,128].map((y,i) => line(65,y,305,y) + label(15,y+6,['−1 эВ','−4 эВ','−6 эВ'][i])).join('')
    + arrow(188,from+2,188,to-2,warm));
}

function meniscus(index) {
  if (!index) return diagram('Взвешивание тела', `<rect x="139" y="37" width="82" height="60" rx="4" fill="#b9c5fd"/>
    <rect x="98" y="98" width="164" height="38" rx="6" fill="#dce5fd"/>` + label(180,122,'54 г','middle'));
  const water = index === 1 ? 80 : 53;
  return diagram('Измерение вытесненного объёма',
    `<rect x="125" y="${water}" width="88" height="${131-water}" fill="#c0ccff"/>`
    + `<path d="M125 20V132H213V20" fill="none" stroke="${ink}" stroke-width="2"/>`
    + line(125,80,147,80) + line(125,53,147,53)
    + label(94,85,'40') + label(94,58,'60') + label(80,30,'мл')
    + (index === 2 ? `<rect x="160" y="76" width="31" height="41" rx="4" fill="#8b6e65"/>` + line(175,25,175,76,faint) : ''));
}

const scenes = {
  'statics-fluids': lever,
  'momentum-energy': collision,
  capacitor,
  'lc-waves': lc,
  refraction,
  'thin-lens': index => lens(index),
  'lab-lens': index => lens(index, true),
  'interference-grating': waves,
  'atomic-transitions': levels,
  'lab-density': meniscus,
};

export function drawDiagram(id, index) {
  if (plots[id]) return plot(plots[id], index);
  return scenes[id]?.(index) || '';
}
