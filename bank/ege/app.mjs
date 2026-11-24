import {answerIsCorrect, buildCatalog, taskLessons, taskTopics} from './catalog.mjs';
import {bankLine, originalAnswerMatches} from './fipi.mjs';
import {officialLink, renderParts, sitePath} from '../../ege-bank/render.js';
import {readJSON, typeLabel} from '../../mocks/config.mjs';
import {taskVisuals} from '../../mocks/figures.mjs';
import {element} from '../../mocks/io.mjs';

const view = document.querySelector('#ege-bank-content');
const storageKey = 'invariant-ege-bank-v1';
const pageSize = 24;
const modes = {topic: 'По темам', line: 'По номерам ЕГЭ'};
const types = {...typeLabel, short: 'Краткий ответ', long: 'Развёрнутый ответ'};
const sources = {course: 'Уроки Invariant', mock: 'Открытый пробник Invariant', bank: 'Авторская задача Invariant', fipi: 'Задачи по открытому банку ФИПИ', reference: 'Ссылки на оригиналы ФИПИ'};
const e = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);
let catalog, state, progress = readProgress();

function readProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return {entries: stored?.entries ?? {}, last: stored?.last ?? ''};
  } catch { return {entries: {}, last: ''}; }
}

function storeProgress() {
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); }
  catch { /* The current tab still keeps its answers. */ }
}

function url(values = {}, hash = '') {
  const params = new URLSearchParams(Object.entries(values).filter(([, value]) => value));
  return 'ege-bank.html' + (params.size ? '?' + params : '') + hash;
}

const internal = (text, href, attrs = '') => `<a data-bank-link href="${e(href)}"${attrs}>${e(text)}</a>`;
const lessonURL = (id, stage = '', anchor = '') =>
  'lessons.html?' + new URLSearchParams({exam: 'ege', lesson: id, ...(stage && {stage})}) + (anchor ? '#' + anchor : '');
const progressOf = task => progress.entries[task.id] ?? {};
const countText = count => count.toLocaleString('ru-RU');

function route() {
  const query = new URLSearchParams(location.search);
  const taskId = query.get('task') || '';
  const task = catalog.byId.get(taskId);
  const mode = query.get('mode') === 'line' ? 'line' : '';
  const line = [0, ...catalog.lines].map(String).includes(query.get('line')) ? query.get('line') : '';
  const requestedTopic = query.get('topic');
  const topic = catalog.byTopic.has(requestedTopic) ? requestedTopic :
    (Object.hasOwn(catalog.legacyTopics, requestedTopic) ? catalog.legacyTopics[requestedTopic] : '');
  const lineFilter = catalog.lines.map(String).includes(query.get('lineFilter')) ? query.get('lineFilter') : '';
  const q = (query.get('q') ?? '').slice(0, 32).trim();
  const lesson = catalog.lessons.has(query.get('lesson')) ? query.get('lesson') : '';
  const block = catalog.blocks.some(block => block.id === query.get('block')) ? query.get('block') :
    catalog.lessons.get(catalog.byTopic.get(topic)?.[0])?.block ?? '';
  const requestedPage = Number.parseInt(query.get('page'), 10);
  const usable = query.get('ready') === '1' ? '1' : '';
  return {
    mode, line: mode ? (line || (task ? String(bankLine(task) ?? 0) : '')) : '',
    block: mode ? '' : (catalog.lessons.get(lesson)?.block ?? (block || task?.block || '')),
    lesson: mode ? '' : (lesson || (!topic && !block ? task?.lesson : '') || ''),
    topic: mode ? '' : (topic || (!lesson && !block ? task?.topic : '') || ''),
    type: Object.hasOwn(types, query.get('type')) ? query.get('type') : '',
    source: Object.hasOwn(sources, query.get('source')) ? query.get('source') : '',
    lineFilter, q, ready: usable,
    page: Math.max(1, requestedPage || 1),
    task: taskId,
  };
}

function filtered(values = state, skip = '') {
  return catalog.tasks.filter(task =>
    (!values.mode || (values.line ? String(bankLine(task) ?? 0) === values.line : Boolean(bankLine(task)))) &&
    (values.mode || !values.block || task.block === values.block ||
      (values.lesson && taskLessons(task, catalog).includes(values.lesson)) ||
      (values.topic && taskTopics(task).includes(values.topic))) &&
    (!values.lineFilter || String(bankLine(task)) === values.lineFilter) &&
    (!values.q || [task.sourceId, task.id, task.prompt, catalog.labels.get(task.topic)]
      .some(value => String(value ?? '').toLocaleLowerCase('ru-RU').includes(values.q.toLocaleLowerCase('ru-RU')))) &&
    (!values.ready || task.source !== 'reference') &&
    (!values.lesson || taskLessons(task, catalog).includes(values.lesson)) &&
    (!values.topic || taskTopics(task).includes(values.topic)) &&
    (skip === 'type' || !values.type || values.type === task.type) &&
    (skip === 'source' || !values.source || values.source === task.source));
}

function routeURL(overrides = {}, hash = '') {
  const next = {...state, task: '', ...overrides};
  if (next.page === 1) delete next.page;
  return url(next, hash);
}

function catalogHero() {
  const solved = catalog.tasks.filter(task => progressOf(task).done).length;
  const available = catalog.tasks.filter(task => task.source !== 'reference').length;
  const lastURL = progress.last.startsWith('ege-bank.html?') ? progress.last : '';
  return `<section class="hero bank-hero">
    <div class="bank-intro">
      <p class="eyebrow">ЕГЭ · Физика · 11 класс</p>
      <h1>Банк задач</h1>
      <p class="lead">Выбери тему, которую проходишь, или потренируй задания нужного номера ЕГЭ.</p>
      ${lastURL ? internal('Продолжить решение', lastURL, ' class="bank-text-link"') : ''}
    <form class="ege-search" role="search">
      <label>Найти задачу <input name="q" type="search" value="${e(state.q)}" placeholder="Код ФИПИ или тема" maxlength="32"></label>
      <button class="btn" type="submit">Найти</button>
    </form>
    </div>
    <dl class="bank-overview">
      <div><dt>Условия в задачнике</dt><dd>${countText(available)}</dd></div>
      <div><dt>Разобрано</dt><dd>${countText(solved)}</dd></div>
      ${available === catalog.tasks.length ? '' : `<div><dt>Дополнительно на ФИПИ</dt><dd>${countText(catalog.tasks.length - available)}</dd></div>`}
    </dl>
  </section>`;
}

function modeLinks() {
  return `<nav class="catalog-tools" aria-label="Группировка задач">
    ${Object.entries(modes).map(([mode, name]) => {
      const selected = (state.mode || 'topic') === mode;
      return internal(name, url(mode === 'line' ? {mode} : {}), ` class="btn${selected ? ' primary" aria-current="page' : ''}"`);
    }).join('')}
  </nav>`;
}

function countsText(n) {
  const tail = n % 100, digit = n % 10;
  return countText(n) + (tail >= 11 && tail <= 14 ? ' задач' : digit === 1 ? ' задача' : digit >= 2 && digit <= 4 ? ' задачи' : ' задач');
}

function blocks() {
  return `<div class="mods">${catalog.blocks.map(block => {
    const count = catalog.tasks.filter(task => task.block === block.id).length;
    return `<a class="mod" data-bank-link href="${url({block: block.id})}"${state.block === block.id ? ' aria-current="true"' : ''}>
      <span class="module-symbol" aria-hidden="true"></span><span class="mn">${e(block.title)}</span>
      <span class="module-counts">${countsText(count)} · ${countText(catalog.tasks.filter(task => task.block === block.id && task.source !== 'reference').length)} с условием</span></a>`;
  }).join('')}</div>`;
}

function lines() {
  return `<nav class="bank-topics" aria-label="Номера заданий 2027">
    ${[...catalog.lines.map(String), '0'].map(line => {
      const count = catalog.tasks.filter(task => String(bankLine(task) ?? 0) === line).length;
      return internal(line === '0' ? `Без номера · ${countText(count)}` : `№${line} · ${countText(count)}`,
        url({mode: 'line', line}), ` class="chip"${state.line === line ? ' aria-current="true"' : ''}`);
    }).join('')}
  </nav>`;
}

function topics() {
  const lessons = [...catalog.lessons.values()].filter(item => item.block === state.block);
  const current = catalog.lessons.get(state.lesson);
  const block = catalog.blocks.find(item => item.id === state.block);
  const lessonList = !current && !state.topic
    ? `<ul class="topic-list">${lessons.map(item => picker(item.title, {block: item.block, lesson: item.id})).join('')}</ul>` : '';
  const keys = [...catalog.byTopic].filter(([, ids]) => current ? ids.includes(current.id) : ids.some(id => lessons.some(lesson => lesson.id === id)));
  const topicList = `<nav class="bank-topics" aria-label="Подтемы">
    ${keys.map(([id]) => {
      const slot = {block: state.block, lesson: state.lesson, topic: id};
      const count = filtered(slot).length;
      return count ? internal(`${catalog.labels.get(id)} · ${countText(count)}`,
        url(slot), ` class="chip"${state.topic === id ? ' aria-current="true"' : ''}`) : '';
    }).join('')}
  </nav>`;
  return `<section class="bank-catalog" aria-labelledby="selected-title">
    <div class="bank-section-title"><h2 id="selected-title">${e(current?.title ?? block.title)}</h2>
    ${current ? `<a class="bank-text-link" href="${e(lessonURL(current.id))}">К уроку</a>` : ''}</div>
    ${lessonList}${topicList}
  </section>`;
}

function picker(label, params) {
  return `<li><a class="lesson-row" data-bank-link href="${url(params)}"><strong>${e(label)}</strong>
    <span class="mini-count">${countText(filtered(params).length)}</span></a></li>`;
}

function filters() {
  return `<form class="ege-filters">
    ${[['type', 'Тип ответа', types], ['source', 'Материалы', sources]].map(([key, label, options]) => {
      const valid = new Set(filtered(state, key).map(task => task[key]));
      return `<label>${label}<select name="${key}"><option value="">Все</option>
        ${Object.entries(options).filter(([id]) => valid.has(id) || state[key] === id).map(([id, value]) =>
          `<option value="${id}"${state[key] === id ? ' selected' : ''}>${value}</option>`).join('')}</select></label>`;
    }).join('')}
    ${state.mode ? '' : `<label>Номер ЕГЭ<select name="exam-line"><option value="">Все</option>
      ${[...new Set(filtered({...state, mode: '', lineFilter: ''}).map(bankLine).filter(Boolean))].sort((a,b)=>a-b)
        .map(line => `<option value="${line}"${state.lineFilter === String(line) ? ' selected' : ''}>№${line}</option>`).join('')}</select></label>`}
  </form>`;
}

function taskLabel(task) {
  if (task.line) return `ЕГЭ · №${task.line}`;
  if (task.inferred) return `Тренировка №${task.inferred}`;
  return catalog.labels.get(task.topic);
}

function list() {
  const tasks = filtered();
  const numPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const page = Math.min(state.page, numPages);
  const selected = tasks.slice((page - 1) * pageSize, page * pageSize);
  const title = state.topic ? catalog.labels.get(state.topic) : state.mode && state.line ?
    (state.line === '0' ? 'Задания без номера' : 'Задания №' + state.line) : state.q ? 'Поиск задач' : 'Все задания подборки';
  return `<section class="bank-catalog" aria-labelledby="selection-title" id="task-list">
    <div class="bank-section-title"><h2 id="selection-title" tabindex="-1">${e(title)}</h2><span class="mini-count">${countsText(tasks.length)}</span></div>
    ${filters()}
    ${selected.length ? `<ul class="quest-list">${selected.map(task => {
      const prompt = task.prompt.split('\n', 1)[0];
      const preview = prompt.length > 160 ? prompt.slice(0, 159) + '…' : prompt;
      return `<li id="row-${e(task.id)}"><a class="task task-entry" data-bank-link href="${e(routeURL({task: task.id, page}))}">
        <div class="task-top"><span class="tn">${e(taskLabel(task))}</span><span class="muted">${e(types[task.type])}${task.official ? ` · ${e(task.sourceId)}` : ''}${task.source === 'reference' ? ' · условие на ФИПИ' : ''}${progressOf(task).done ? ' · ✓' : ''}</span></div>
        <p class="tt">${e(preview)}</p></a></li>`;
    }).join('')}</ul>` : '<p>В этой подборке нет задач с выбранными фильтрами.</p>'}
    ${numPages > 1 ? `<nav class="ege-neighbors" aria-label="Страницы задач">
      ${page > 1 ? internal('Предыдущая страница', routeURL({page: page - 1}, '#task-list'), ' class="btn"') : '<span></span>'}
      <span class="muted">${page} / ${numPages}</span>
      ${page < numPages ? internal('Следующая страница', routeURL({page: page + 1}, '#task-list'), ' class="btn"') : '<span></span>'}
    </nav>` : ''}
  </section>`;
}

function showCatalog() {
  view.innerHTML = catalogHero() + modeLinks() + (state.mode ? lines() : blocks()) +
    (!state.mode && state.block ? topics() : '') + (state.block || state.line || state.q ? list() : '');
}

function sourceLink(task) {
  if (task.official) return officialLink(task.official);
  if (task.source === 'course') {
    const stage = task.anchor.replace(task.lesson + '-', '').replace(/-\d+$/, '');
    return lessonURL(task.lesson, stage, task.anchor);
  }
  if (task.source === 'mock') return 'mocks.html?exam=ege&variant=ege-01&v=1';
  return '';
}

function displayAnswer(answer) {
  return answer?.replaceAll('.', ',').replaceAll('±',' ± ') ?? '';
}

function solutionMarkup(task) {
  if (!task.answer && !task.solution) return '';
  return `<details class="ege-solution">
    <summary>${task.type === 'long' ? 'Показать разбор' : 'Показать ответ'}</summary>
    ${task.answer ? `<p><strong>${e(displayAnswer(task.answer))}${task.unit ? ' ' + e(task.unit) : ''}</strong></p>` : ''}
    ${task.solution ? `<p class="ege-text">${e(task.solution)}</p>` : ''}
    ${task.criteria?.length ? `<ul>${task.criteria.map(text => `<li>${e(text)}</li>`).join('')}</ul>` : ''}
    ${task.type === 'long' ? '<button class="btn" type="button" data-mark-review>Отметить разобранной</button>' : ''}
  </details>`;
}

function formMarkup(task) {
  if (task.official && !task.key) {
    return `<label for="draft-${e(task.id)}">Твой ответ или ход решения</label>
      <textarea data-draft id="draft-${e(task.id)}" rows="4" maxlength="6000">${e(progressOf(task).answer)}</textarea>
      <div class="tr"><button class="btn" type="button" data-copy-solution>Скопировать для репетитора</button>
      <p class="muted">Проверка преподавателем</p></div>`;
  }
  if (task.type === 'long') {
    return `<label for="draft-${e(task.id)}">Запиши ход решения</label>
      <textarea data-draft id="draft-${e(task.id)}" maxlength="6000" rows="5">${e(progressOf(task).answer)}</textarea>`;
  }
  const format = task.key?.rule === 'ordered-digits' ? 'Цифры по порядку' : types[task.type];
  const keyboard = task.type === 'number' || task.type === 'measure' ? 'text' : 'numeric';
  return `<form class="ansbox" data-answer-check>
    <label>${format}${task.unit ? ' · ' + e(task.unit) : ''}
    <input class="ege-answer" name="answer" inputmode="${keyboard}" autocomplete="off" maxlength="64"
      ${task.type === 'measure' ? ' placeholder="0 ± 0"' : ''}
      value="${e(progressOf(task).answer)}" required></label>
    <button class="btn primary" type="submit">Проверить</button>
  </form>`;
}

function drawVisuals(task) {
  const container = view.querySelector('[data-visuals]');
  for (const visual of taskVisuals(task)) container.append(visual.matches('figure') ? zoomButton(visual) : visual);
  if (task.image) {
    const figure = element('figure', null, {class: 'mock-figure'});
    const src = new URL('./figures/' + task.image.file, import.meta.url);
    figure.append(element('img', null, {src, alt: task.image.alt}));
    container.append(zoomButton(figure));
  }
}

function zoomButton(visual) {
  const button = element('button', null, {class: 'ege-visual-open', type: 'button', 'aria-label': 'Увеличить рисунок'});
  button.append(visual);
  button.addEventListener('click', () => {
    const dialog = document.querySelector('.ege-image-dialog');
    dialog.querySelector('.ege-dialog-visual').replaceChildren(visual.cloneNode(true));
    dialog.showModal();
  });
  return button;
}

async function drawOriginal(task, article) {
  const body = article.querySelector('[data-original]');
  const solution = article.querySelector('[data-original-solution]');
  const fail = () => { article.querySelector('[data-asset-error]').hidden = false; };
  try {
    const card = await readJSON(sitePath(task.cardPath));
    if (card.id !== task.id) throw new Error('Mismatched card ID');
    if (!article.isConnected) return;
    body.replaceChildren(renderParts(card.parts, fail));
    if (card.solution?.parts) {
      solution.querySelector('div').append(renderParts(card.solution.parts, fail));
      solution.hidden = false;
    }
    if (!task.key && task.type === 'long' && card.solution?.parts) {
      const mark = element('button', 'btn', 'Отметить разобранной');
      mark.type = 'button';
      mark.addEventListener('click', () => markReviewed(task, mark));
      solution.append(mark);
    }
  } catch (error) {
    if (!article.isConnected) return;
    body.textContent = 'Условие не загрузилось. Его можно открыть по ссылке на ФИПИ.';
    console.error(error);
  }
}

function markReviewed(task, button) {
  progress.entries[task.id] = {...progressOf(task), done: true};
  storeProgress();
  button.textContent = 'Разобрана';
  verdict('Разобрана', true);
}

async function copySolution(task, value) {
  const text = `ФИПИ ${task.sourceId}\n${value.trim()}`;
  if (!value.trim()) {
    verdict('Сначала запиши ответ', false);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    verdict('Ответ скопирован', true);
  } catch {
    const draft = view.querySelector('[data-draft]');
    draft.select();
    verdict('Скопируй выделенный ответ вручную', false);
  }
}

function showTask(task) {
  let queue = filtered();
  if (!queue.some(item => item.id === task.id)) queue = filtered({block: task.block, topic: task.topic});
  const index = queue.findIndex(item => item.id === task.id);
  const neighbor = (item, label, shift) => item ?
    internal(label, routeURL({task: item.id, page: Math.floor((index + shift) / pageSize) + 1}), ' class="btn"') : '<span></span>';
  const listURL = routeURL({page: Math.floor(Math.max(index, 0) / pageSize) + 1}, '#row-' + task.id);
  const origin = sourceLink(task);
  view.innerHTML = `<div class="ege-center">
    <nav class="ege-breadcrumbs" aria-label="Навигация по банку">
      ${internal('Банк задач', url(), ' class="bank-text-link"')}
      ${internal('← К подборке', listURL, ' class="bank-text-link"')}
      <button class="linkbtn" type="button" data-copy-link>Скопировать ссылку на задачу</button>
    </nav>
    <article class="task${progressOf(task).done ? ' ok' : ''}" data-task-card>
      <div class="task-top"><p class="tn">${e(taskLabel(task))}</p>
      <p class="muted">${index >= 0 ? `${index + 1} / ${queue.length} · ` : ''}${e(types[task.type])}</p></div>
      <h1 class="ege-task-title" tabindex="-1">${e(task.skill || catalog.labels.get(task.topic))}</h1>
      ${task.official ? `<p class="muted">ФИПИ · ${e(task.sourceId)}${task.inferred ? ' · подборка по формату ЕГЭ 2027' : ''}</p>` : `<p class="tt ege-text">${e(task.prompt)}</p>`}
      ${task.cardPath ? `<div class="ege-original" data-original><p role="status">Загружаем условие…</p></div>
        <p class="muted" data-asset-error hidden>Часть иллюстраций не загрузилась. Открой оригинал по ссылке ниже.</p>` : ''}
      ${task.source === 'reference' ? `<p class="tt">${e(task.reason ?? 'Оригинал задания доступен на ФИПИ.')}</p>
        <a class="btn primary" href="${e(origin)}" target="_blank" rel="noopener">Открыть условие на ФИПИ ↗</a>` : ''}
      ${task.clarify ? `<p class="tt">${e(task.clarify)}</p>` : ''}
      <div data-visuals></div>
      ${task.source === 'reference' ? '' : `<div class="task-controls">${formMarkup(task)} <output class="verdict" aria-live="polite"></output></div>`}
      ${task.cardPath ? `<details class="ege-solution ege-original" data-original-solution hidden><summary>Показать разбор</summary><div></div></details>` : ''}
      ${task.hint ? `<details class="ege-solution"><summary>Подсказка</summary><p>${e(task.hint)}</p></details>` : ''}
      ${solutionMarkup(task)}
      <div class="task-links tr">
        ${origin && task.source !== 'reference' ? `<a href="${e(origin)}">${task.official ? 'Оригинал на ФИПИ' : e(sources[task.source])}</a>` : `<span class="muted">${e(sources[task.source])}</span>`}
        ${taskLessons(task, catalog).map(id => `<a href="${e(lessonURL(id))}">${e(catalog.lessons.get(id).title)}</a>`).join('')}
      </div>
    </article>
    <nav class="ege-neighbors" aria-label="Соседние задачи">
      ${neighbor(queue[index - 1], '← Предыдущая', -1)}${neighbor(queue[index + 1], 'Следующая →', 1)}
    </nav>
  </div>`;
  document.title = taskLabel(task) + ' · Задачник ЕГЭ · INVARIANT';
  drawVisuals(task);
  if (task.cardPath) drawOriginal(task, view.querySelector('[data-task-card]'));
  view.querySelector('[data-copy-link]').addEventListener('click', async event => {
    const button = event.currentTarget;
    const direct = new URL(url({task: task.id}), location.href).href;
    try {
      await navigator.clipboard.writeText(direct);
      button.textContent = 'Ссылка скопирована';
    } catch { window.prompt('Ссылка на задачу', direct); }
  });
  progress.last = routeURL({task: task.id});
  storeProgress();
  const answer = view.querySelector('[data-answer-check]');
  if (answer) answer.addEventListener('submit', event => {
    event.preventDefault();
    const raw = answer.elements.answer.value;
    const done = task.key ? originalAnswerMatches(task.key, raw) : answerIsCorrect(task, raw);
    const entry = progressOf(task);
    progress.entries[task.id] = {...entry, answer: raw, done: done || entry.done};
    storeProgress();
    verdict(done ? 'Верно' : 'Проверь ответ', done, true);
  });
  const draft = view.querySelector('[data-draft]');
  if (draft) draft.addEventListener('input', () => {
    progress.entries[task.id] = {...progressOf(task), answer: draft.value};
    storeProgress();
  });
  view.querySelector('[data-copy-solution]')?.addEventListener('click', () => copySolution(task, draft.value));
  const mark = view.querySelector('[data-mark-review]');
  if (mark) mark.addEventListener('click', () => markReviewed(task, mark));
}

function verdict(message, success, animate = false) {
  const result = view.querySelector('.verdict');
  const card = view.querySelector('[data-task-card]');
  result.textContent = message;
  result.className = 'verdict ' + (success ? 'ok' : 'no');
  if (success && message !== 'Ответ скопирован') card.classList.add('ok');
  if (animate && !success) {
    card.classList.remove('bad');
    requestAnimationFrame(() => card.classList.add('bad'));
  }
}

function render(transition = false) {
  state = route();
  document.title = 'Задачник ЕГЭ по физике · INVARIANT';
  const task = catalog.byId.get(state.task);
  if (task) showTask(task);
  else if (state.task) {
    view.innerHTML = `<h1>Задача не найдена</h1><p>${internal('Открыть каталог ЕГЭ', url(), ' class="bank-text-link"')}</p>`;
  } else showCatalog();
  const anchor = document.getElementById(location.hash.slice(1));
  if (anchor) requestAnimationFrame(() => anchor.scrollIntoView());
  else if (transition) {
    view.querySelector('[tabindex="-1"]')?.focus({preventScroll: true});
    window.scrollTo(0, task || state.block || state.line ? view.offsetTop : 0);
  }
}

function navigate(href) {
  if (new URL(href, location.href).href === location.href) return;
  history.replaceState({scroll: window.scrollY}, '');
  history.pushState(null, '', href);
  render(true);
}

view.addEventListener('click', event => {
  const link = event.target.closest('a[data-bank-link]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(link.getAttribute('href'));
});

view.addEventListener('submit', event => {
  if (!event.target.matches('.ege-search')) return;
  event.preventDefault();
  navigate(url({q: event.target.elements.q.value.trim()}, '#task-list'));
});

view.addEventListener('change', event => {
  const key = event.target.name;
  if (key === 'type' || key === 'source') navigate(routeURL({[key]: event.target.value, page: 1}, '#task-list'));
  if (key === 'exam-line') navigate(routeURL({lineFilter: event.target.value, page: 1}, '#task-list'));
});

async function load() {
  const [course, variant, inventory, keys] = await Promise.all([
    readJSON(new URL('../../lessons/ege.json', import.meta.url)),
    readJSON(new URL('../../mocks/data/ege-01-v1.json', import.meta.url)),
    readJSON(sitePath('ege-data/v1/catalog.json')),
    readJSON(sitePath('ege-data/v1/verified-keys.json')),
  ]);
  catalog = buildCatalog(course, variant, inventory, keys);
  window.addEventListener('popstate', event => {
    render();
    if (!location.hash && Number.isFinite(event.state?.scroll)) window.scrollTo(0, event.state.scroll);
  });
  render();
}

load().catch(error => {
  console.error(error);
  view.innerHTML = '<h1>Банк ЕГЭ не загрузился</h1><p>Попробуй обновить страницу.</p><button class="btn" type="button">Обновить</button>';
  view.querySelector('button').addEventListener('click', () => location.reload());
});
