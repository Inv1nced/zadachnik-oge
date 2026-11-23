(() => {
  'use strict';
  const select = selector => document.querySelector(selector);
  // Native homework payload keeps progress, labels and result submission in the task app.
  select('#open-homework').href = 'oge.html#set=friction';
  const format = value => Number(value.toFixed(2)).toLocaleString('ru-RU');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mass = 1;
  const staticLimit = 5;
  const slidingFriction = 3;
  let velocity = 0;
  let distance = 0;
  let frictionFrame = 0;
  let frictionTime = 0;
  let playing = false;
  let demonstrationTime = 0;
  let fallFrame = 0;

  // The camera follows the block. Ground marks move relative to it.
  select('#ground-marks').innerHTML = Array.from({length: 28}, (_, index) =>
    `<path d="M${index * 20 - 20} 214l-8 12" stroke="currentColor" opacity=".4"/>`
  ).join('');

  function frictionAt(pull, speed) {
    if (speed > 0) return slidingFriction;
    return pull <= staticLimit ? pull : slidingFriction;
  }

  function paintFriction() {
    const pull = Number(select('#pull-force').value);
    const friction = frictionAt(pull, velocity);
    const atRest = velocity === 0 && pull <= staticLimit;
    select('#pull-value').textContent = `${pull} Н`;
    select('#pull-arrow').setAttribute('d', `M295 169h${pull * 15}`);
    select('#pull-arrow').style.visibility = pull ? 'visible' : 'hidden';
    select('#pull-text').textContent = `Тяга ${pull} Н`;
    select('#friction-arrow').setAttribute('d', `M225 190h${-friction * 15}`);
    select('#friction-arrow').style.visibility = friction ? 'visible' : 'hidden';
    select('#friction-text').textContent = `Трение ${format(friction)} Н`;
    select('#friction-state').textContent = atRest ? 'Брусок покоится' : velocity > 0 ? 'Брусок скользит вправо' : 'Тяга превысила предел трения покоя';
    select('#friction-detail').textContent = atRest
      ? `Трение покоя равно тяге по модулю. По горизонтали ${pull} − ${pull} = 0, ускорение равно нулю.`
      : `При скольжении трение в этой модели равно 3 Н. По горизонтали Fтяги − Fтр = ma. При тяге ${pull} Н ускорение равно ${format((pull - friction) / mass)} м/с².`;
    select('#motion-reading').textContent = reducedMotion.matches
      ? 'Уменьшение движения включено. Силы показаны для выбранной тяги.'
      : `Скорость ${format(velocity)} м/с. Камера движется вместе с бруском.`;
    select('#ground-marks').style.transform = `translateX(${-((distance * 30) % 20)}px)`;
  }

  function pauseFriction() {
    playing = false;
    cancelAnimationFrame(frictionFrame);
    frictionTime = 0;
    select('#friction-play').textContent = '▶ Продолжить';
  }

  function frictionTick(now) {
    if (!playing) return;
    const elapsed = frictionTime ? Math.min((now - frictionTime) / 1000, 0.04) : 0;
    frictionTime = now;
    demonstrationTime += elapsed;
    const pull = Number(select('#pull-force').value);
    const force = frictionAt(pull, velocity);
    const acceleration = (pull - force) / mass;
    const nextVelocity = Math.max(0, velocity + acceleration * elapsed);
    distance += (velocity + nextVelocity) * elapsed / 2;
    velocity = nextVelocity;
    paintFriction();
    if (demonstrationTime >= 6) pauseFriction();
    else frictionFrame = requestAnimationFrame(frictionTick);
  }

  select('#friction-play').onclick = () => {
    if (playing) return pauseFriction();
    if (reducedMotion.matches) return paintFriction();
    playing = true;
    demonstrationTime = 0;
    select('#friction-play').textContent = 'Пауза';
    if (demonstrationTime >= 6) pauseFriction();
    else frictionFrame = requestAnimationFrame(frictionTick);
  };
  select('#friction-reset').onclick = () => {
    pauseFriction();
    velocity = 0;
    distance = 0;
    select('#pull-force').value = 2;
    select('#friction-play').textContent = '▶ Запустить';
    paintFriction();
  };
  select('#pull-force').addEventListener('input', paintFriction);

  const situations = {
    rest: {normal: 10, rope: 0, title: 'Опора поддерживает груз', detail: 'Ускорения по вертикали нет. Реакция опоры уравновешивает тяжесть. Груз действует на опору с весом 10 Н.', equation: 'N − mg = 0\nN = 10 Н; P = 10 Н'},
    rope: {normal: 6, rope: 4, title: 'Часть нагрузки принимает нить', detail: 'Нить тянет груз вверх с силой 4 Н. Опоре остаётся действовать вверх с силой 6 Н. Груз продолжает покоиться, его вес на этой опоре равен 6 Н.', equation: 'N + Fнити − mg = 0\nN = 10 − 4 = 6 Н; P = 6 Н'},
    fall: {normal: 0, rope: 0, title: 'Груз и опора свободно падают вместе', detail: 'Опора не поддерживает груз. Реакция опоры и вес равны нулю, а сила тяжести по-прежнему действует. Ускорение направлено вниз.', equation: 'N = 0; P = 0; mg = 10 Н\nПри оси вверх aᵧ = −g'}
  };

  function playFall() {
    cancelAnimationFrame(fallFrame);
    const group = select('#falling-scene');
    group.style.transform = 'translateY(0px)';
    if (reducedMotion.matches) return;
    const started = performance.now();
    function frame(now) {
      const time = Math.min((now - started) / 1000, 1);
      // Physical free-fall displacement, scaled to 18 pixels per metre.
      group.style.transform = `translateY(${0.5 * 10 * time * time * 18}px)`;
      if (time < 1) fallFrame = requestAnimationFrame(frame);
    }
    fallFrame = requestAnimationFrame(frame);
  }

  function showWeight(name) {
    cancelAnimationFrame(fallFrame);
    const state = situations[name];
    select('#falling-scene').style.transform = 'translateY(0px)';
    document.querySelectorAll('[data-weight]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.weight === name)));
    select('#normal-arrow').setAttribute('d', `M275 140v${-state.normal * 6}`);
    select('#normal-arrow').style.visibility = state.normal ? 'visible' : 'hidden';
    select('#normal-label').textContent = `N = ${state.normal} Н`;
    select('#normal-label').setAttribute('y', 140 - state.normal * 6 - 10);
    select('#weight-arrow').setAttribute('d', `M315 154v${state.normal * 6}`);
    select('#weight-arrow').style.visibility = state.normal ? 'visible' : 'hidden';
    select('#weight-label').textContent = `P = ${state.normal} Н`;
    for (const id of ['rope-line', 'rope-force', 'rope-label']) select('#' + id).style.visibility = state.rope ? 'visible' : 'hidden';
    select('#weight-state').textContent = state.title;
    select('#weight-detail').textContent = state.detail;
    select('#weight-equation').textContent = state.equation;
    select('#fall-replay').hidden = name !== 'fall';
    if (name === 'fall') playFall();
  }
  document.querySelectorAll('[data-weight]').forEach(button => button.onclick = () => showWeight(button.dataset.weight));
  select('#fall-replay').onclick = playFall;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseFriction();
      cancelAnimationFrame(fallFrame);
    }
  });
  reducedMotion.addEventListener('change', () => {
    pauseFriction();
    cancelAnimationFrame(fallFrame);
    paintFriction();
  });
  paintFriction();
  showWeight('rest');
})();
