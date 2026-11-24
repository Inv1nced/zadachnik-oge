import {element} from './io.mjs';

const svgNS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs, text) => {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, val);
  if (text !== undefined) node.textContent = text;
  return node;
};
const line = (x1,y1,x2,y2, cls='axis') => svg('line',{x1,y1,x2,y2,class:cls});
const label = (x,y,text,anchor='middle') => svg('text',{x,y,'text-anchor':anchor},text);
const fmt = value => Number(value.toFixed(3)).toLocaleString('ru-RU');

function graph(figure) {
  const left = 54, right = 392, top = 34, bottom = 184;
  const xvals = [...new Set(figure.points.map(([x]) => x))].sort((a,b) => a-b);
  const yvals = [...new Set(figure.points.map(([,y]) => y))].sort((a,b) => a-b);
  const xMin = Math.min(0, ...xvals), xMax = Math.max(0, ...xvals);
  const yMin = Math.min(0, ...yvals), yMax = Math.max(0, ...yvals);
  const px = x => left + (right - left) * (x - xMin) / (xMax - xMin || 1);
  const py = y => bottom - (bottom - top) * (y - yMin) / (yMax - yMin || 1);
  const x0 = px(0), y0 = py(0);
  const img = svg('svg',{viewBox:'0 0 455 220',role:'img',
    'aria-label': `График. Ось X — ${figure.x}. Ось Y — ${figure.y}. Точки: ${figure.points.map(([x,y])=>`(${fmt(x)}; ${fmt(y)})`).join(', ')}.`});
  for (const x of xvals.filter(Boolean)) {
    img.append(line(px(x),top,px(x),bottom,'grid'), line(px(x),y0-3,px(x),y0+4), label(px(x),y0+17,fmt(x)));
  }
  for (const y of yvals.filter(Boolean)) {
    img.append(line(left,py(y),right,py(y),'grid'), line(x0-4,py(y),x0+3,py(y)), label(x0-8,py(y)+4,fmt(y),'end'));
  }
  img.append(line(left,y0,405,y0), line(x0,bottom,x0,24), label(444,y0+5,figure.x,'end'),
    label(x0,16,figure.y,'start'), label(x0-7,y0+17,'0','end'));
  img.append(svg('polyline',{points:figure.points.map(([x,y])=>`${px(x)},${py(y)}`).join(' '),class:'curve',fill:'none'}));
  for (const [x,y] of figure.points) img.append(svg('circle',{cx:px(x),cy:py(y),r:4,class:'point'}));
  return img;
}

function scale(figure) {
  const img = svg('svg',{viewBox:'0 0 440 130',role:'img',
    'aria-label': `Шкала прибора, ${figure.unit}, от 0 до ${fmt(figure.step*figure.ticks)}. ${figure.ticks} равных делений. Стрелка на делении ${figure.pointer} от нуля.`});
  const x = index => 35 + 34*index;
  img.append(line(35,66,x(figure.ticks),66), label(414,72,figure.unit));
  for (let i=0; i<=figure.ticks; i++) {
    const big = i%2 === 0;
    img.append(line(x(i),66,x(i),big?43:54));
    if (big) img.append(label(x(i),96,fmt(i*figure.step)));
  }
  const pos=x(figure.pointer);
  img.append(line(pos,12,pos,54,'curve'), svg('path',{d:`M${pos-6},52 h12 l-6,10 Z`,class:'point'}));
  return img;
}

export function taskVisuals(task) {
  const nodes = [];
  if (task.figure) {
    const wrapper = element('figure',null,{class:'mock-figure'});
    wrapper.append(task.figure.kind === 'graph' ? graph(task.figure) : scale(task.figure));
    nodes.push(wrapper);
  }
  if (task.table) {
    const wrapper = element('div',null,{class:'mock-table-scroll',tabindex:'0','aria-label':'Таблица данных'});
    const table = element('table',null,{class:'mock-table'});
    const head = table.createTHead().insertRow();
    for (const value of task.table.head) head.append(element('th',value,{scope:'col'}));
    const body = table.createTBody();
    for (const values of task.table.rows) {
      const row = body.insertRow();
      for (const value of values) row.append(element('td',value));
    }
    wrapper.append(table);
    nodes.push(wrapper);
  }
  return nodes;
}
