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
  const x0=50, y0=196, w=330, h=155;
  const xvals = [...new Set(figure.points.map(([x]) => x))];
  const yvals = [...new Set(figure.points.map(([,y]) => y))];
  const px = x => x0 + w * x / Math.max(...xvals);
  const py = y => y0 - h * y / Math.max(...yvals);
  const img = svg('svg',{viewBox:'0 0 450 225',role:'img',
    'aria-label': `График. Ось X — ${figure.x}. Ось Y — ${figure.y}. Точки: ${figure.points.map(([x,y])=>`(${fmt(x)}; ${fmt(y)})`).join(', ')}.`});
  img.append(line(x0,y0,407,y0), line(x0,y0,x0,23), label(413,201,figure.x,'start'), label(53,18,figure.y,'start'));
  for (const x of xvals) {
    img.append(line(px(x),y0,px(x),33,'grid'), line(px(x),y0,px(x),201),label(px(x),219,fmt(x)));
  }
  for (const y of yvals.filter(Boolean)) {
    img.append(line(x0,py(y),397,py(y),'grid'), line(x0-4,py(y),x0,py(y)),label(38,py(y)+5,fmt(y),'end'));
  }
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
