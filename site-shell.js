(() => {
  const base = new URL('.', document.currentScript.src);
  const root = document.documentElement;
  const body = document.body;
  const params = new URLSearchParams(location.search);
  const path = name => new URL(name, base).pathname;
  const onOge = location.pathname === path('oge.html');
  const onEge = location.pathname === path('ege-bank.html');
  const onCourse = location.pathname === path('ege.html');
  const onMocks = location.pathname === path('mocks.html');
  const onLessons = location.pathname === path('lessons.html');

  root.dataset.theme = 'light';
  if (params.has('workspace') || (onLessons && params.get('embed') === '1')) {
    root.classList.add('workspace-embed');
  }
  if (root.classList.contains('workspace-embed')) return;

  let exam = params.get('exam');
  let teacher = false;
  try {
    exam ||= localStorage.getItem('invariant-exam-preference-v1');
    teacher = Boolean(sessionStorage.getItem('oge-teacher-session-v1') ||
      localStorage.getItem('oge-teacher-device-v1'));
  } catch {
    // Navigation remains available when storage is blocked.
  }
  if (onMocks) exam = params.get('exam') === 'oge' ? 'oge' : 'ege';
  if (onLessons) exam = params.get('exam') === 'ege' ? 'ege' : 'oge';
  if (onOge) exam = 'oge';
  if (onEge || onCourse) exam = 'ege';
  if (onLessons) exam = params.get('exam') === 'ege' ? 'ege' : 'oge';
  if (onMocks) exam = params.get('exam') === 'oge' ? 'oge' : 'ege';
  const isEge = exam === 'ege';
  const examKey = isEge ? 'ege' : 'oge';
  const examName = isEge ? 'ЕГЭ' : 'ОГЭ';
  const icons = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    bank: '<path d="M4 5h6a2 2 0 0 1 2 2v13a4 4 0 0 0-3-1H4zm16 0h-6a2 2 0 0 0-2 2v13a4 4 0 0 1 3-1h5z"/>',
    test: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h4"/>',
    hw: '<path d="M3 10l9-7 9 7v10H3zM9 20v-6h6v6"/>',
    prog: '<path d="M4 20h16M7 16v-4m5 4V8m5 8V4"/>',
    lessons: '<path d="m3 9 9-5 9 5-9 5zm4 3v5a10 10 0 0 0 10 0v-5m4-3v7"/>',
    mocks: '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 3h6v4H9zm-1 11 2 2 5-5"/>',
    graphs: '<path d="M4 4v16h16M7 15l4-4 3 2 5-6"/>',
    forces: '<path d="M4 19l15-14M13 5h6v6M5 13v6h6"/>',
    lab: '<path d="M9 3h6m-5 0v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3M8 15h8"/>',
    teacher: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v2"/>',
    plan: '<path d="M4 5h16M4 12h16M4 19h16"/><path d="M8 3v4m8 3v4m-6 3v4"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name]}</svg>`;

  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', 'Разделы и инструменты');

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'site-nav__menu';
  menu.setAttribute('aria-controls', 'site-nav-content');
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Разделы');
  menu.innerHTML = icon('menu');

  const content = document.createElement('div');
  content.className = 'site-nav__content';
  content.id = 'site-nav-content';
  nav.append(menu, content);

  const links = [];
  function decorate(control, name, label) {
    const text = document.createElement('span');
    text.className = 'site-nav__label';
    text.textContent = label;
    control.classList.add('site-nav__item');
    control.setAttribute('aria-label', label);
    control.innerHTML = icon(name);
    text.setAttribute('aria-hidden', 'true');
    control.append(text);
  }

  function addLinks(items) {
    const group = document.createElement('div');
    group.className = 'site-nav__group';
    for (const [name, label, href, match] of items) {
      const url = new URL(href, base);
      const link = document.createElement('a');
      link.href = url.href;
      decorate(link, name, label);
      links.push({link, url, match});
      group.append(link);
    }
    content.append(group);
  }

  const localActions = onOge && document.getElementById('tabs');
  if (localActions) {
    localActions.className = 'site-nav__group';
    for (const button of localActions.querySelectorAll('button[data-v]')) {
      decorate(button, button.dataset.v, button.textContent.trim());
    }
    content.append(localActions);
  } else if (isEge) {
    addLinks([
      ['bank', 'Задачник', 'ege-bank.html', (query, samePath) => samePath && query.get('view') !== 'progress'],
      ['mocks', 'Пробники ЕГЭ', 'mocks.html?exam=ege'],
      ['hw', 'Домашка', 'lessons.html?exam=ege&view=homework'],
      ['prog', 'Прогресс', 'ege-bank.html?view=progress'],
    ]);
  } else {
    addLinks([
      ['bank', 'Задачник', 'oge.html'],
      ['test', 'Тест', 'oge.html?view=test'],
      ['hw', 'Домашка', 'oge.html?view=homework'],
      ['prog', 'Прогресс', 'oge.html?view=progress'],
    ]);
  }

  addLinks([
    ['lessons', `Уроки ${examName}`, `lessons.html?exam=${examKey}`,
      (query, samePath) => onCourse || (samePath && query.get('view') !== 'homework')],
    ...(isEge ? [] : [['mocks', 'Пробники ОГЭ', 'mocks.html?exam=oge']]),
    ['graphs', 'Графики', 'grafiki.html'],
    ['forces', 'Силы', 'forces.html'],
    ['lab', 'Лаборатория', 'laboratory.html'],
  ]);
  addLinks([
    ['teacher', 'Журнал репетитора', isEge ? 'teach.html?view=lessons&exam=ege' : 'teach.html'],
    ...(teacher ? [['plan', 'Маршрут ОГЭ', 'tutor-plan/']] : []),
  ]);

  function updateCurrent() {
    const query = new URLSearchParams(location.search);
    for (const {link, url, match} of links) {
      const samePath = location.pathname === url.pathname;
      const sameParams = [...url.searchParams].every(([key, value]) =>
        (query.get(key) ?? (key === 'exam' ? examKey : null)) === value);
      const current = match ? match(query, samePath) : samePath && sameParams;
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }

  const main = document.querySelector('main, [role="main"]');
  if (main) {
    main.id ||= 'site-content';
    if (!main.hasAttribute('tabindex')) main.tabIndex = -1;
    const skip = document.createElement('a');
    skip.className = 'site-skip';
    skip.href = '#' + main.id;
    skip.textContent = 'К содержанию';
    skip.addEventListener('click', event => {
      event.preventDefault();
      main.focus();
    });
    body.prepend(skip);
  }

  const topbar = document.querySelector('.study-site .topbar');
  if (topbar) {
    nav.classList.add('site-nav--in-header');
    topbar.append(nav);
  } else {
    const skip = body.querySelector('.site-skip');
    if (skip) skip.after(nav);
    else body.prepend(nav);
  }
  body.classList.add('site-has-rail');
  updateCurrent();
  addEventListener('popstate', updateCurrent);
  addEventListener('ege-study-state', updateCurrent);

  const compact = matchMedia('(max-width: 760px), (max-height: 650px)');
  function setMenu(open) {
    content.hidden = compact.matches && !open;
    menu.setAttribute('aria-expanded', String(compact.matches && open));
  }
  setMenu(false);
  compact.addEventListener('change', () => setMenu(false));
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') === 'false'));
  content.addEventListener('click', event => {
    if (!compact.matches || !event.target.closest('.site-nav__item')) return;
    setMenu(false);
    if (event.target.closest('button')) main?.focus({preventScroll: true});
  });
  document.addEventListener('click', event => {
    if (compact.matches && !nav.contains(event.target)) setMenu(false);
  });
  nav.addEventListener('focusout', event => {
    if (compact.matches && event.relatedTarget && !nav.contains(event.relatedTarget)) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || menu.getAttribute('aria-expanded') !== 'true') return;
    setMenu(false);
    menu.focus();
  });

  if (onMocks) return;

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('frog-helper.css?v=study-rail-1', base).href;
  document.head.append(css);
  const guide = document.createElement('script');
  guide.src = new URL('frog-guide.js?v=ai-1', base).href;
  guide.onload = () => {
    const helper = document.createElement('script');
    helper.src = new URL('frog-helper.js?v=study-rail-1', base).href;
    body.append(helper);
  };
  body.append(guide);
})();
