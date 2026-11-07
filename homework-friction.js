(() => {
  'use strict';
  const select = selector => document.querySelector(selector);
  // Native homework payload keeps progress, labels and result submission in the task app.
  select('#open-homework').href = 'index.html#hw=HW-eyJ2IjoyLCJ0Ijoi0JfQsNC60YDQtdC_0LvQtdC90LjQtTog0YLRgNC10L3QuNC1LCDQstC10YEg0Lgg0YHQuNC70Ysg0L_QviDQvtGB0Y_QvCDCtyAxMCDQt9Cw0LTQsNC90LjQuSIsImkiOlsiLXhpYWwwdCIsIi14aWFsMHUiLCIteGlhbDB2IiwiLXhpYWwwdyIsIi14aWFsMHgiLCIteGlhbDB5IiwiMjluYyIsIjFsMWYiLCIxdW5tIiwiMXVuMCJdLCJrIjpbIjctNk1TRFhXIiwiOS03SEhTR0QiXSwiYSI6W1stMjAyNjExMDcwMSwwLCI5IiwicSIsIiIsIkEiLCLQkdGA0YPRgdC-0Log0LzQsNGB0YHQvtC5IDIg0LrQsyDQv9C-0LrQvtC40YLRgdGPINC90LAg0LPQvtGA0LjQt9C-0L3RgtCw0LvRjNC90L7QvCDRgdGC0L7Qu9C1LiDQmtGA0L7QvNC1INGC0Y_QttC10YHRgtC4INC4INGA0LXQsNC60YbQuNC4INC-0L_QvtGA0YssINC90LAg0LHRgNGD0YHQvtC6INGB0LjQu9GLINC90LUg0LTQtdC50YHRgtCy0YPRjtGCLiDQndCw0YDQuNGB0YPQuSDRgdC40LvRiywg0LTQtdC50YHRgtCy0YPRjtGJ0LjQtSDQvdCwINCx0YDRg9GB0L7Qui4g0J7RgtC00LXQu9GM0L3QviDQv9C-0LrQsNC20LgsINC60YPQtNCwINC_0YDQuNC70L7QttC10L0g0LXQs9C-INCy0LXRgS4g0J7QsdGK0Y_RgdC90Lgg0YHQu9C-0LLQsNC80LgsINGH0LXQvCDQvtGC0LvQuNGH0LDRjtGC0YHRjyDRgdC40LvQsCDRgtGP0LbQtdGB0YLQuCwg0YDQtdCw0LrRhtC40Y8g0L7Qv9C-0YDRiyDQuCDQstC10YEsINC4INC90LDQudC00Lgg0LjRhSDQvNC-0LTRg9C70LguINCf0YDQuNC90LjQvNCw0LkgZyA9IDEwINC8L9GBwrIuINCg0LXRiNC10L3QuNC1INC90LAg0LHRg9C80LDQs9C1INC_0YDQuNGI0LvQuCDQv9GA0LXQv9C-0LTQsNCy0LDRgtC10LvRji4iLFtdLHsibGFiZWwiOiLQotGA0LXQvdC40YDQvtCy0LrQsCDQv9C-INCx0LvQvtC60YMgOSDCtyDihJYxIn1dLFstMjAyNjExMDcwMiwwLCI5IiwiYiIsIjMiLCJBIiwi0JHRgNGD0YHQvtC6INGC0Y_QvdGD0YIg0LPQvtGA0LjQt9C-0L3RgtCw0LvRjNC90L4g0LLQv9GA0LDQstC-INGBINGB0LjQu9C-0LkgMyDQnSwg0L3QviDQvtC9INC-0YHRgtCw0ZHRgtGB0Y8g0L3QtdC_0L7QtNCy0LjQttC90YvQvC4g0JTRgNGD0LPQuNGFINCz0L7RgNC40LfQvtC90YLQsNC70YzQvdGL0YUg0YHQuNC7LCDQutGA0L7QvNC1INGC0Y_Qs9C4INC4INGC0YDQtdC90LjRjywg0L3QtdGCLiDQp9C10LzRgyDRgNCw0LLQtdC9INC80L7QtNGD0LvRjCDRgdC40LvRiyDRgtGA0LXQvdC40Y8g0L_QvtC60L7Rjz8g0J7RgtCy0LXRgiDQsiDQnS4g0J3QsCDQsdGD0LzQsNCz0LUg0YPQutCw0LbQuCDQvdCw0L_RgNCw0LLQu9C10L3QuNC1INGC0YDQtdC90LjRjyDQuCDQt9Cw0L_QuNGI0Lgg0YPRgNCw0LLQvdC10L3QuNC1INC_0L4g0LPQvtGA0LjQt9C-0L3RgtCw0LvRjNC90L7QuSDQvtGB0LguIixbXSx7ImxhYmVsIjoi0KLRgNC10L3QuNGA0L7QstC60LAg0L_QviDQsdC70L7QutGDIDkgwrcg4oSWMiJ9XSxbLTIwMjYxMTA3MDMsMCwiOSIsImIiLCI2IiwiQSIsItCR0YDRg9GB0L7QuiDQvNCw0YHRgdC-0LkgMyDQutCzINGB0LrQvtC70YzQt9C40YIg0L_QviDQs9C-0YDQuNC30L7QvdGC0LDQu9GM0L3QvtC5INC_0L7QstC10YDRhdC90L7RgdGC0LguINCa0L7RjdGE0YTQuNGG0LjQtdC90YIg0YLRgNC10L3QuNGPINGB0LrQvtC70YzQttC10L3QuNGPINGA0LDQstC10L0gMCwyLiDQktC10YDRgtC40LrQsNC70YzQvdC-0LPQviDRg9GB0LrQvtGA0LXQvdC40Y8g0L3QtdGCLCDQtNGA0YPQs9C40LUg0YHQuNC70YssINC60YDQvtC80LUg0YLRj9C20LXRgdGC0Lgg0Lgg0YDQtdCw0LrRhtC40Lgg0L7Qv9C-0YDRiywg0L_QviDQstC10YDRgtC40LrQsNC70Lgg0L3QtSDQtNC10LnRgdGC0LLRg9GO0YIuINCd0LDQudC00Lgg0LzQvtC00YPQu9GMINGB0LjQu9GLINGC0YDQtdC90LjRjyDRgdC60L7Qu9GM0LbQtdC90LjRjy4g0J_RgNC40L3QuNC80LDQuSBnID0gMTAg0Lwv0YHCsi4g0J7RgtCy0LXRgiDQsiDQnS4g0J3QsNGH0L3QuCDRgSDRgNC40YHRg9C90LrQsCDQuCDRg9GA0LDQstC90LXQvdC40Y8g0L_QviDQstC10YDRgtC40LrQsNC70YzQvdC-0Lkg0L7RgdC4LiIsW10seyJsYWJlbCI6ItCi0YDQtdC90LjRgNC-0LLQutCwINC_0L4g0LHQu9C-0LrRgyA5IMK3IOKEljMifV0sWy0yMDI2MTEwNzA0LDAsIjkiLCJiIiwiMiIsIkEiLCLQkdGA0YPRgdC-0Log0LzQsNGB0YHQvtC5IDMg0LrQsyDRgdC60L7Qu9GM0LfQuNGCINCy0L_RgNCw0LLQviDQv9C-INCz0L7RgNC40LfQvtC90YLQsNC70YzQvdC-0LzRgyDRgdGC0L7Qu9GDLiDQldCz0L4g0YLRj9C90YPRgiDQs9C-0YDQuNC30L7QvdGC0LDQu9GM0L3QviDQstC_0YDQsNCy0L4g0YEg0YHQuNC70L7QuSAxMiDQnS4g0JrQvtGN0YTRhNC40YbQuNC10L3RgiDRgtGA0LXQvdC40Y8g0YHQutC-0LvRjNC20LXQvdC40Y8g0YDQsNCy0LXQvSAwLDIuINCh0L7Qv9GA0L7RgtC40LLQu9C10L3QuNC10Lwg0LLQvtC30LTRg9GF0LAg0L_RgNC10L3QtdCx0YDQtdGH0YwsINCy0LXRgNGC0LjQutCw0LvRjNC90L7Qs9C-INGD0YHQutC-0YDQtdC90LjRjyDQvdC10YIuINCf0YDQuNC90LjQvNCw0LkgZyA9IDEwINC8L9GBwrIuINCd0LDQudC00Lgg0LzQvtC00YPQu9GMINGD0YHQutC-0YDQtdC90LjRjyDQsiDQvC_RgcKyLiDQndCwINCx0YPQvNCw0LPQtSDQvdCw0YDQuNGB0YPQuSDRgdC40LvRiyDQuCDQt9Cw0L_QuNGI0Lgg0LLRgtC-0YDQvtC5INC30LDQutC-0L0g0J3RjNGO0YLQvtC90LAg0L_QviDQvtCx0LXQuNC8INC-0YHRj9C8LiIsW10seyJsYWJlbCI6ItCi0YDQtdC90LjRgNC-0LLQutCwINC_0L4g0LHQu9C-0LrRgyA5IMK3IOKEljQifV0sWy0yMDI2MTEwNzA1LDAsIjkiLCJiIiwiNSIsIkEiLCLQotC10LvQviDQvNCw0YHRgdC-0LkgNCDQutCzINC00LLQuNC20LXRgtGB0Y8g0L_QviDQs9C-0YDQuNC30L7QvdGC0LDQu9GM0L3QvtC80YMg0YHRgtC-0LvRgyDQstC_0YDQsNCy0L4g0Lgg0LjQvNC10LXRgiDRg9GB0LrQvtGA0LXQvdC40LUgMCw1INC8L9GBwrIg0LLQv9GA0LDQstC-LiDQodC40LvQsCDRgdC-0L_RgNC-0YLQuNCy0LvQtdC90LjRjyDQtNCy0LjQttC10L3QuNGOINGA0LDQstC90LAgMyDQnSDQuCDQvdCw0L_RgNCw0LLQu9C10L3QsCDQstC70LXQstC-LiDQotGP0LPQsCDQvdCw0L_RgNCw0LLQu9C10L3QsCDQs9C-0YDQuNC30L7QvdGC0LDQu9GM0L3QviDQstC_0YDQsNCy0L4uINCU0YDRg9Cz0LjRhSDQs9C-0YDQuNC30L7QvdGC0LDQu9GM0L3Ri9GFINGB0LjQuyDQvdC10YIuINCd0LDQudC00Lgg0YHQuNC70YMg0YLRj9Cz0LguINCe0YLQstC10YIg0LIg0J0uINCd0LAg0LHRg9C80LDQs9C1INGB0L3QsNGH0LDQu9CwINC30LDQv9C40YjQuCDRg9GA0LDQstC90LXQvdC40LUg0L_QviDQvtGB0LgsINC90LDQv9GA0LDQstC70LXQvdC90L7QuSDQstC_0YDQsNCy0L4uIixbXSx7ImxhYmVsIjoi0KLRgNC10L3QuNGA0L7QstC60LAg0L_QviDQsdC70L7QutGDIDkgwrcg4oSWNSJ9XSxbLTIwMjYxMTA3MDYsMCwiOSIsImIiLCIxNiIsIkEiLCLQkdGA0YPRgdC-0Log0LzQsNGB0YHQvtC5IDIg0LrQsyDQv9C-0LrQvtC40YLRgdGPINC90LAg0LPQvtGA0LjQt9C-0L3RgtCw0LvRjNC90L7QvCDRgdGC0L7Qu9C1LiDQndC40YLRjCDRgtGP0L3QtdGCINC10LPQviDQstC10YDRgtC40LrQsNC70YzQvdC-INCy0LLQtdGA0YUg0YEg0YHQuNC70L7QuSA0INCdLiDQndCw0LnQtNC4INC80L7QtNGD0LvRjCDRgNC10LDQutGG0LjQuCDQvtC_0L7RgNGLLiDQn9GA0LjQvdC40LzQsNC5IGcgPSAxMCDQvC_RgcKyLiDQntGC0LLQtdGCINCyINCdLiDQndCw0YDQuNGB0YPQuSDRgtGA0Lgg0YHQuNC70YssINC00LXQudGB0YLQstGD0Y7RidC40LUg0L3QsCDQsdGA0YPRgdC-0LosINC4INGB0L7RgdGC0LDQstGMINGD0YDQsNCy0L3QtdC90LjQtSDQv9C-INCy0LXRgNGC0LjQutCw0LvRjNC90L7QuSDQvtGB0LguINCd0LAg0LHRg9C80LDQs9C1INC-0LHRitGP0YHQvdC4LCDQv9C-0YfQtdC80YMg0LfQtNC10YHRjCBOINC80LXQvdGM0YjQtSBtZy4iLFtdLHsibGFiZWwiOiLQotGA0LXQvdC40YDQvtCy0LrQsCDQv9C-INCx0LvQvtC60YMgOSDCtyDihJY2In1dXX0';
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
