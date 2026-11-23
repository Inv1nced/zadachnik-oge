import { drawDiagram } from './diagrams.js';

const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const svgNS = 'http://www.w3.org/2000/svg';

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function svgElement(name, attributes) {
  const element = document.createElementNS(svgNS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

export function velocityAt(time) {
  const forward = 2 * Math.min(3, time);
  const back = Math.max(0, time - 3);
  return { position: forward - back, path: forward + back, velocity: time < 3 ? 2 : -1 };
}

function velocityLab(container) {
  const X = time => 58 + 60 * time;
  const Y = speed => 126 - 31 * speed;
  const axisX = position => 58 + 46 * position;
  container.insertAdjacentHTML('beforeend', `
    <svg viewBox="0 0 400 245" role="img" aria-label="График скорости и положение точки на оси">
      <path d="M58 39V169M47 126H376M58 212H376" fill="none" stroke="#566280"/>
      <path d="M58 64H238M238 157H358" fill="none" stroke="#26358f" stroke-width="3"/>
      <path d="M238 64V157M358 157V126" fill="none" stroke="#566280" stroke-dasharray="4 4"/>
      <g data-area></g>
      <line data-time x1="58" x2="58" y1="41" y2="168" stroke="#4f5dbd" stroke-width="2"/>
      <line data-trip x1="58" x2="58" y1="212" y2="212" stroke="#5366da" stroke-width="5"/>
      <circle data-position cx="58" cy="212" r="7" fill="#26358f"/>
      <g font-size="17">
        <text x="29" y="24">vₓ, м/с</text><text x="27" y="69">+2</text><text x="29" y="162">−1</text>
        <text x="39" y="143">0</text><text x="233" y="149">3</text><text x="352" y="117">5</text>
        <text x="360" y="148">t, с</text>
        <text x="54" y="239">0</text><text x="146" y="239">2</text>
        <text x="237" y="239">4</text><text x="330" y="239">6</text><text x="351" y="197">x, м</text>
      </g>
    </svg>
    <label>Время, с <input type="range" min="0" max="5" step=".01" value="0"></label>
    <div class="actions">
      <button class="button primary" type="button" data-play>Пуск</button>
      <button class="button" type="button" data-pause disabled>Пауза</button>
      <button class="button" type="button" data-reset>Сброс</button>
    </div>
    <p class="readout"></p>`);
  const slider = container.querySelector('input');
  const play = container.querySelector('[data-play]');
  const pause = container.querySelector('[data-pause]');
  const timeLine = container.querySelector('[data-time]');
  const dot = container.querySelector('[data-position]');
  const trip = container.querySelector('[data-trip]');
  const positive = svgElement('rect', { x: X(0), y: Y(2), height: Y(0) - Y(2), fill: '#5366da', opacity: .35 });
  const negative = svgElement('rect', { x: X(3), y: Y(0), height: Y(-1) - Y(0), fill: '#b45a30', opacity: .45 });
  container.querySelector('[data-area]').append(positive, negative);
  const readout = container.querySelector('.readout');
  let time = 0;
  let animation = null;
  let last = null;

  function draw() {
    const { position, path, velocity } = velocityAt(time);
    positive.setAttribute('width', X(Math.min(3, time)) - X(0));
    negative.setAttribute('width', X(Math.max(3, time)) - X(3));
    timeLine.setAttribute('x1', X(time));
    timeLine.setAttribute('x2', X(time));
    dot.setAttribute('cx', axisX(position));
    trip.setAttribute('x2', axisX(position));
    slider.value = time;
    slider.setAttribute('aria-valuetext', number.format(time) + ' с');
    readout.textContent = `t = ${number.format(time)} с · vₓ = ${number.format(velocity)} м/с · x = ${number.format(position)} м · s = ${number.format(path)} м`;
  }

  function stop() {
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
    last = null;
    play.disabled = false;
    pause.disabled = true;
  }

  function advance(now) {
    if (last !== null) time = Math.min(5, time + (now - last) / 1000);
    last = now;
    draw();
    if (time === 5) stop();
    else animation = requestAnimationFrame(advance);
  }

  play.onclick = () => {
    if (time === 5) time = 0;
    play.disabled = true;
    pause.disabled = false;
    animation = requestAnimationFrame(advance);
  };
  pause.onclick = stop;
  container.querySelector('[data-reset]').onclick = () => { stop(); time = 0; draw(); };
  slider.oninput = () => { stop(); time = slider.valueAsNumber; draw(); };
  draw();
}

function forceDiagram(face, frames) {
  const values = frames.map(frame => frame.forces);
  const max = Math.max(1, ...values.flat().map(Math.abs));
  return ([pull, friction]) => {
    const arrow = (force, side, color, name) => {
      if (!force) return '';
      const start = 180 + side * 28;
      const tip = start + side * (20 + 94 * force / max);
      return `<path d="M${start} 84H${tip}m0 0l${-side * 8} -6m${side * 8} 6l${-side * 8} 6" stroke="${color}" fill="none" stroke-width="3"/>
      <text x="${(start + tip) / 2}" y="64" text-anchor="middle" font-size="15">${name} ${force} Н</text>`;
    };
    face.innerHTML = `<svg viewBox="0 0 360 142" role="img" aria-label="Силы вдоль поверхности">
    <path d="M12 109H348" stroke="#7886ab"/><rect x="152" y="70" width="56" height="39" rx="3" fill="#a9b7fb"/>
    ${arrow(pull, 1, '#3347b2', 'Тяга')}
    ${arrow(friction, -1, '#a04025', 'Трение')}
    <text font-size="15" text-anchor="middle" x="180" y="133">N и mg уравновешены</text></svg>`;
  };
}

function sequenceLab(container, demo, id) {
  const frames = demo.frames;
  container.insertAdjacentHTML('beforeend', `
    <div data-diagram></div>
    <div class="demo-frame" aria-live="polite">
      <h3></h3><div class="demo-values"></div><p></p>
    </div>
    <label>Состояние модели <input type="range" min="1" max="${frames.length}" value="1"></label>`);
  const slider = container.querySelector('input');
  const face = container.querySelector('[data-diagram]');
  const updateDiagram = demo.type === 'forces' ? forceDiagram(face, frames) : null;
  const panel = container.querySelector('.demo-frame');
  const title = panel.querySelector('h3');
  const values = panel.querySelector('.demo-values');
  const description = panel.querySelector('p');
  function draw() {
    const index = slider.valueAsNumber - 1;
    const frame = frames[index];
    title.textContent = frame.label;
    values.replaceChildren(...frame.values.map(text => Object.assign(document.createElement('span'), { textContent: text })));
    description.textContent = frame.note;
    slider.setAttribute('aria-valuetext', frame.label);
    if (updateDiagram) updateDiagram(frame.forces);
    else face.innerHTML = drawDiagram(id, index);
  }
  slider.oninput = draw;
  draw();
}

export function showLab(container, demo, id) {
  if (!demo) return;
  container.insertAdjacentHTML('beforeend', `<p>${escapeHTML(demo.prompt)}</p>`);
  if (demo.type === 'velocity') velocityLab(container);
  else sequenceLab(container, demo, id);
}
