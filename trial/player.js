import {createModel} from './models.js';
import {format} from './graphics.js';

export function mountPlayer(container, task) {
  const model = createModel(task);
  let params = {...model.defaults};
  let time = 0;
  let running = false;
  let clock = 0;
  let frameId = 0;
  const {controls} = model;
  container.innerHTML = `
    <h2>${model.title}</h2>
    <p class="model-note">${model.note}</p>
    <div class="model-scenes"><div class="model-left"><div id="model-scene"></div>
    <dl class="model-readings"></dl>
    <div class="playback" aria-label="Управление моделью">
      <button type="button" id="play-model" class="primary">Пуск</button>
      <button type="button" id="reset-model">Сброс</button>
      <label class="timeline-label"><span id="timeline-caption">${model.timelineLabel ?? 'Время'}</span><input type="range" id="model-time" min="0" step="0.01"><output id="model-time-value" for="model-time"></output></label>
    </div>
    <div class="model-controls">
      ${controls.map(c => c.checkbox
        ? `<label class="model-check"><input type="checkbox" name="${c.key}"> ${c.label}</label>`
        : `<label><span>${c.label}</span><input type="range" name="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}"><output></output></label>`).join('')}
    </div></div><div id="model-graphs" hidden></div></div>`;
  const query = selector => container.querySelector(selector);
  const timeInput = query('#model-time');
  const timeLabel = query('#model-time-value');
  const play = query('#play-model');
  const graphs = query('#model-graphs');
  function fields() {
    for (const c of controls) {
      const input = query(`[name="${c.key}"]`);
      if (c.checkbox) input.checked = params[c.key];
      else {
        input.value = params[c.key];
        input.nextElementSibling.value = format(params[c.key]);
      }
    }
  }
  function draw() {
    const end = model.duration(params);
    time = Math.min(time, end);
    timeInput.max = end;
    // A continuously adjustable domain lets the slider reach an irrational landing time exactly.
    timeInput.step = 'any';
    timeInput.value = time;
    timeLabel.value = model.describeTime?.(time) ?? `${format(time)} ${model.timeUnit ?? 'с'}`.trim();
    timeInput.setAttribute('aria-valuetext',timeLabel.value);
    const {scene, readings, graphs:plots} = model.frame(time,params,end);
    query('#model-scene').innerHTML = scene;
    graphs.hidden = !plots.length;
    graphs.innerHTML = plots.join('');
    query('.model-readings').innerHTML = readings.map(([label, value, unit]) =>
      `<div><dt>${label}</dt><dd>${typeof value === 'number' ? format(value, 3) : value} ${unit}</dd></div>`).join('');
  }
  function pause() {
    running = false;
    cancelAnimationFrame(frameId);
    play.textContent = 'Пуск';
  }
  function tick(now) {
    if (!running) return;
    if (!clock) clock = now;
    const elapsed = (now - clock) / 1000;
    if (elapsed >= 1/32) {
      clock = now;
      time = Math.min(model.duration(params),time + Math.min(elapsed,.1) * (model.playbackRate ?? Math.max(1,model.duration(params)/12)));
      draw();
    }
    if (time < model.duration(params)) frameId = requestAnimationFrame(tick);
    else pause();
  }
  play.addEventListener('click',() => {
    if (running) return pause();
    if (time >= model.duration(params)) time = 0;
    running = true;
    clock = 0;
    play.textContent = 'Пауза';
    frameId = requestAnimationFrame(tick);
  });
  query('#reset-model').addEventListener('click',() => {
    pause();
    time = 0;
    params = {...model.defaults};
    fields();
    draw();
  });
  container.addEventListener('input',event => {
    const {target} = event;
    pause();
    if (target === timeInput) time = Number(target.value);
    else {
      params[target.name] = target.type === 'checkbox' ? target.checked : Number(target.value);
      fields();
    }
    draw();
  });
  fields();
  draw();
  return {pause};
}
