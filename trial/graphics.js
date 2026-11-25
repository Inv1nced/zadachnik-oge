const colors = ['#4436aa', '#16706d', '#9c4f25'];
const escape = value => globalThis.OgeCore.escapeHtml(value);
export const format = (number, digits = 2) => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: digits}).format(Math.abs(number) < 1e-12 ? 0 : number);
export const samples = (end, fn, count = 80) => Array.from({length: count + 1}, (_, i) => [end * i / count, fn(end * i / count)]);

export function carExam(t, x0 = 10, strength = 4) {
  if (t < 2) return [x0 + strength * t * t / 2, strength * t, strength];
  if (t < 4) return [x0 + strength * (2 + 2 * (t - 2)), 2 * strength, 0];
  const u = t - 4;
  return [x0 + strength * (6 + 2 * u - u * u / 2), strength * (2 - u), -strength];
}

export function svg(body, label, w = 460, h = 180) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escape(label)}" font-family="system-ui,sans-serif"><title>${escape(label)}</title><rect width="${w}" height="${h}" rx="12" fill="#f6f7fb"/>${body}</svg>`;
}

export function plot(series, {domain, yLabel, xLabel = 't, с', cursor, marks = [], yTicks, h = 146}) {
  const left = 53, right = 438, top = 27, bottom = h - 28;
  const all = series.flatMap(line => line.points.map(point => point[1]));
  let low = Math.min(0, ...all);
  let high = Math.max(0, ...all);
  if (low === high) { low -= 1; high += 1; }
  const x = v => left + (right - left) * (v - domain[0]) / (domain[1] - domain[0]);
  const y = v => bottom - (bottom - top) * (v - low) / (high - low);
  const verticals = Array.from({length: 5}, (_, i) => {
    const v = domain[0] + (domain[1] - domain[0]) * i / 4;
    return `<path d="M${x(v)} ${top}V${bottom}" stroke="#dfe3ed"/><text x="${x(v)}" y="${bottom + 16}" text-anchor="middle">${format(v, 1)}</text>`;
  }).join('');
  const ticks = yTicks ?? Array.from({length: 5}, (_, i) => low + (high - low) * i / 4);
  const horizontals = ticks.map(v => {
    return `<path d="M${left} ${y(v)}H${right}" stroke="#dfe3ed"/><text x="${left - 8}" y="${y(v) + 4}" text-anchor="end">${format(v, 1)}</text>`;
  }).join('');
  const curves = series.map((line, i) => `<polyline points="${line.points.map(([t, v]) => `${x(t)},${y(v)}`).join(' ')}" fill="none" stroke="${colors[i]}" stroke-width="2.5" ${i ? 'stroke-dasharray="6 4"' : ''}/>`).join('');
  const annotations = marks.map(([t, value]) => {
    const atEnd = t === domain[1];
    return `<circle cx="${x(t)}" cy="${y(value)}" r="3.5" fill="${colors[0]}"/><text x="${x(t) + (atEnd ? -8 : 8)}" y="${y(value) + (atEnd ? 18 : -9)}" text-anchor="${atEnd ? 'end' : 'start'}" fill="${colors[0]}" font-size="13" font-weight="700">${format(value)} м</text>`;
  }).join('');
  return svg(`<g fill="#48556d" font-size="12">${verticals}${horizontals}<path d="M${left} ${top}V${bottom}M${left} ${y(0)}H${right}" fill="none" stroke="#8894a9"/><text x="${left}" y="17" font-weight="700">${escape(yLabel)}</text><text x="${right}" y="${h - 3}" text-anchor="end">${escape(xLabel)}</text>${series.length > 1 ? series.map((line, i) => `<text x="${196 + i * 119}" y="17" fill="${colors[i]}">${escape(line.label)}</text>`).join('') : ''}</g>${curves}${annotations}${cursor === undefined ? '' : `<path d="M${x(cursor)} ${top}V${bottom}" stroke="#182135" stroke-dasharray="4 3"/>`}`, `${yLabel} от ${xLabel}`, 460, h);
}

export const svgUrl = code => 'data:image/svg+xml;base64,' + btoa(String.fromCharCode(...new TextEncoder().encode(code)));
export const arrow = (x1, y1, x2, y2, color = colors[0]) => {
  if (Math.hypot(x2 - x1, y2 - y1) < 1) return '';
  const a = Math.atan2(y2 - y1, x2 - x1);
  const point = angle => `${x2 - 9 * Math.cos(angle)},${y2 - 9 * Math.sin(angle)}`;
  return `<path d="M${x1},${y1}L${x2},${y2}M${point(a - .55)}L${x2},${y2}L${point(a + .55)}" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
};
