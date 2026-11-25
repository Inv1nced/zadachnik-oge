import {answerIsCorrect, buildCatalog, taskLessons, taskTopics} from './catalog.mjs?v=practice-first';
import {readPersonalBank, setupPersonalBank} from './personal-bank.mjs';
import {bankLine, originalAnswerMatches} from './fipi.mjs';
import {officialLink, renderParts, sitePath} from '../../ege-bank/render.js';
import {readJSON, typeLabel} from '../../mocks/config.mjs';
import {taskVisuals} from '../../mocks/figures.mjs';
import {element} from '../../mocks/io.mjs';

const view = document.querySelector('#ege-bank-content');
const storageKey = 'invariant-ege-bank-v1';
const pageSize = 12;
const types = {...typeLabel, short: 'Краткий ответ', long: 'Развёрнутый ответ'};
const sources = new Set(['course', 'mock', 'bank', 'fipi', 'reference']);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);
const progress = readProgress();
let practiceCatalog, referenceCatalog, catalog, state, course, variant, keys;
let personalBank, personalRequest, referenceRequest, boardRequest, renderVersion = 0;
let officialMechanics = new Set();

function readProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return {
      entries: stored?.entries && typeof stored.entries === 'object' ? stored.entries : {},
      last: typeof stored?.last === 'string' ? stored.last : '',
    };
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

const link = (text, href, attrs = '') => `<a data-bank-link href="${escapeHTML(href)}"${attrs}>${escapeHTML(text)}</a>`;
const lessonURL = id => 'lessons.html?' + new URLSearchParams({exam: 'ege', lesson: id});
const progressOf = task => progress.entries[task.id] ?? {};
const completed = task => Boolean(progressOf(task).done);
const checked = task => progressOf(task).checked || (task.type !== 'long' && completed(task));
const countText = count => count.toLocaleString('ru-RU');

function countTasks(n) {
  const tail = n % 100, digit = n % 10;
  return countText(n) + (tail >= 11 && tail <= 14 ? ' задач' : digit === 1 ? ' задача' : digit >= 2 && digit <= 4 ? ' задачи' : ' задач');
}

function route(query) {
  const taskId = query.get('task') || '';
  const task = catalog.byId.get(taskId);
  const mode = query.get('mode') === 'line' ? 'line' : '';
  const line = [0, ...catalog.lines].map(String).includes(query.get('line')) ? query.get('line') : '';
  const requestedTopic = query.get('topic');
  const topic = catalog.byTopic.has(requestedTopic) ? requestedTopic :
    (Object.hasOwn(catalog.legacyTopics, requestedTopic) ? catalog.legacyTopics[requestedTopic] : '');
  const requestedModule = practiceCatalog.practiceModules.find(item => item.id === query.get('module'));
  const lesson = catalog.lessons.has(query.get('lesson')) ? query.get('lesson') : '';
  const block = catalog.blocks.some(item => item.id === query.get('block')) ? query.get('block') :
    catalog.lessons.get(catalog.byTopic.get(topic)?.[0])?.block ?? requestedModule?.section ?? '';
  const source = sources.has(query.get('source')) ? query.get('source') : '';
  const requestedView = query.get('view');
  return {
    view: requestedView === 'progress' ? 'progress' : requestedView === 'fipi' || source === 'reference' ? 'fipi' : '',
    mode, line: mode ? (line || (task ? String(bankLine(task) ?? 0) : '')) : '',
    block: mode ? '' : catalog.lessons.get(lesson)?.block ?? (block || task?.block || ''),
    lesson: mode ? '' : lesson,
    module: mode ? '' : requestedModule?.id ?? '',
    topic: mode ? '' : (topic || (!lesson && !block ? task?.topic : '') || ''),
    type: Object.hasOwn(types, query.get('type')) ? query.get('type') : '',
    source,
    lineFilter: catalog.lines.map(String).includes(query.get('lineFilter')) ? query.get('lineFilter') : '',
    q: (query.get('q') ?? '').slice(0, 32).trim(),
    ready: query.get('ready') === '1' ? '1' : '',
    page: Math.max(1, Number.parseInt(query.get('page'), 10) || 1),
    task: taskId,
  };
}

function routeURL(overrides = {}, hash = '') {
  const next = {...state, task: '', ...overrides};
  if (next.page === 1) delete next.page;
  return url(next, hash);
}

function matchesQuery(task, query) {
  return [task.sourceId, task.id, task.prompt, catalog.labels.get(task.topic)]
    .some(value => String(value ?? '').toLocaleLowerCase('ru-RU').includes(query.toLocaleLowerCase('ru-RU')));
}

function filtered(tasks) {
  return tasks.filter(task =>
    (!state.mode || (state.line ? String(bankLine(task) ?? 0) === state.line : Boolean(bankLine(task)))) &&
    (!state.lineFilter || String(bankLine(task)) === state.lineFilter) &&
    (!state.type || task.type === state.type) &&
    (!state.source || task.source === state.source) &&
    (!state.ready || task.source !== 'reference') &&
    (!state.q || matchesQuery(task, state.q)));
}

function modulesForSection(section) {
  const modules = practiceCatalog.practiceModules.filter(item => item.section === section);
  if (!state.lesson) return modules;
  return modules.map(module => ({
    ...module,
    blocks: module.blocks.filter(block => practiceCatalog.byTopic.get(block.id)?.includes(state.lesson)),
  })).filter(module => module.blocks.length > 0);
}

function taskURL(task) {
  return url({task: task.id});
}

function continuation() {
  if (!progress.last.startsWith('ege-bank.html?')) return '';
  const id = new URL(progress.last, location.href).searchParams.get('task');
  return practiceCatalog.byId.has(id) ? link('Продолжить решение', progress.last, ' class="btn primary"') : '';
}

function mainHeading(title, text = '') {
  return `<header class="ege-page-heading"><h1 tabindex="-1">${escapeHTML(title)}</h1>
    ${text ? `<p class="lead">${escapeHTML(text)}</p>` : ''}</header>`;
}

function breadcrumb(...items) {
  return `<nav class="ege-breadcrumbs" aria-label="Путь в задачнике">${items.join('')}</nav>`;
}

function practiceStats(items) {
  return `<dl class="bank-overview">
    <div><dt>Задач в практике</dt><dd>${countText(practiceCatalog.tasks.length)}</dd></div>
    <div><dt>Блоков в разделе</dt><dd>${items.length}</dd></div>
    <div><dt>Решено и разобрано</dt><dd data-bank-solved>${countText(practiceCatalog.tasks.filter(completed).length)}</dd></div>
  </dl>`;
}

function sections(section) {
  return `<section class="bank-modules" aria-labelledby="modules-title">
    <div class="bank-section-title"><h2 id="modules-title">Разделы физики</h2>
      <div class="ege-section-links">
        ${link('По номерам ЕГЭ', url({mode: 'line'}), ' class="bank-text-link"')}
        ${link('Каталог ФИПИ', url({view: 'fipi'}), ' class="bank-text-link"')}
      </div>
    </div>
    <nav class="bank-topics" aria-label="Разделы физики">${practiceCatalog.blocks.map(item =>
      link(item.title, url({block: item.id}), ` class="chip"${item.id === section.id ? ' aria-current="page"' : ''}`)).join('')}</nav>
  </section>`;
}

function moduleTiles(modules, current, selected) {
  if (!modules.length) return '';
  return `<nav class="mods ege-module-grid" aria-label="Модули раздела">${modules.map(module => {
    const active = module.id === current?.id;
    const tasks = module.blocks.flatMap(block => block.tasks);
    const done = tasks.filter(completed).length;
    return `<a class="mod" data-bank-link data-module="${escapeHTML(module.id)}" href="${escapeHTML(routeURL({
      block: module.section, module: module.id, topic: '', page: 1,
    }))}"${active ? ' aria-current="true"' : ''}${active && !selected && state.module ? ' data-bank-focus="module"' : ''}>
      <span class="module-symbol" aria-hidden="true"></span>
      <span class="mn">${escapeHTML(module.title)}</span>
      <span class="module-counts"><span>Тем <b>${module.blocks.length}</b></span><span>${countTasks(tasks.length)}</span></span>
      <span class="meter" aria-hidden="true"><i data-module-meter style="width:${tasks.length ? done / tasks.length * 100 : 0}%"></i></span>
    </a>`;
  }).join('')}</nav>`;
}

function showPractice() {
  const section = practiceCatalog.blocks.find(item => item.id === state.block) ?? practiceCatalog.blocks[0];
  const lesson = practiceCatalog.lessons.get(state.lesson);
  const modules = modulesForSection(section.id);
  const current = modules.find(module => module.blocks.some(block => block.id === state.topic)) ??
    modules.find(module => module.id === state.module) ?? modules[0];
  const items = [...(current?.blocks ?? [])];
  let selected = items.find(block => block.id === state.topic);
  if (!selected && state.topic && practiceCatalog.byTopic.has(state.topic)) {
    const related = practiceCatalog.tasks.filter(task => taskTopics(task).includes(state.topic));
    if (related.length) {
      selected = {id: state.topic, title: practiceCatalog.labels.get(state.topic), section: section.id, module: current?.id, tasks: related};
      items.push(selected);
    }
  }
  const resume = continuation();
  view.innerHTML = `
    ${lesson ? breadcrumb(link('Банк задач', url()), link(section.title, url({block: section.id}))) : ''}
    <header class="hero bank-hero">
      <div class="bank-intro"><h1 tabindex="-1">${escapeHTML(lesson?.title ?? 'Задачи по физике')}</h1>
        <p class="lead">Выбери тему, реши задачу самостоятельно или открой её на доске для разбора.</p>
        ${lesson ? `<a class="bank-text-link" href="${escapeHTML(lessonURL(lesson.id))}">К уроку</a>` : ''}
      </div>
      ${resume ? `<aside class="bank-resume"><span>Продолжить практику</span>${resume}</aside>` : practiceStats(modules.flatMap(module => module.blocks))}
    </header>
    ${sections(section)}
    ${moduleTiles(modules, current, selected)}
    ${search('practice')}
    <div class="ege-practice-blocks">${items.map(block => practiceBlock(block, selected)).join('')}</div>
    ${items.length ? '' : '<p>В этой подборке пока нет задач для практики.</p>'}`;
  if (selected) mountCards(filtered(selected.tasks));
}

function practiceBlock(block, selected) {
  const opened = block.id === selected?.id;
  const href = routeURL({block: block.section, module: block.module, topic: opened ? '' : block.id, page: 1});
  const title = escapeHTML(block.title);
  const completedCount = block.tasks.filter(completed).length;
  const selectedTasks = opened ? filtered(block.tasks) : [];
  const lessonId = state.lesson || practiceCatalog.byTopic.get(block.id)?.[0];
  const details = opened ? `<div class="ege-practice-body">
      ${lessonId && !state.lesson ? `<a class="bank-text-link ege-block-lesson" href="${escapeHTML(lessonURL(lessonId))}">К уроку</a>` : ''}
      ${cardsList(selectedTasks)}
    </div>` : '';
  return `<section class="ege-practice-block${opened ? ' is-open' : ''}" aria-labelledby="topic-${escapeHTML(block.id)}">
    <h2 id="topic-${escapeHTML(block.id)}" ${opened ? 'tabindex="-1" data-bank-focus' : ''}>
      <a class="lesson-row" data-bank-link href="${escapeHTML(href)}"${opened ? ' aria-current="true"' : ''}>
        <span class="ege-block-title">${title}</span>
        <span class="mini-count">${completedCount} / ${block.tasks.length}<span class="sr-only"> разобрано</span></span>
        <span class="ege-block-arrow" aria-hidden="true"></span>
      </a>
    </h2>${details}</section>`;
}

function showProgress() {
  const tasks = practiceCatalog.tasks;
  const solved = tasks.filter(checked).length;
  const reviewed = tasks.filter(task => completed(task) && !checked(task)).length;
  const topics = practiceCatalog.practiceBlocks.filter(block => block.tasks.some(completed));
  view.innerHTML = `${breadcrumb(link('Банк задач', url()))}
    ${mainHeading('Прогресс ЕГЭ')}
    <dl class="bank-overview ege-progress-summary">
      <div><dt>Ответы проверены</dt><dd>${solved}</dd></div>
      <div><dt>Отмечено разобранными</dt><dd>${reviewed}</dd></div>
    </dl>
    ${continuation()}
    ${topics.length ? `<ul class="topic-list">${topics.map(block =>
      `<li>${link(block.title + ' · ' + block.tasks.filter(completed).length + '/' + block.tasks.length,
        url({block: block.section, module: block.module, topic: block.id}), ' class="lesson-row"')}</li>`).join('')}</ul>` :
      '<p>Здесь появятся темы, в которых ты решил или разобрал задачи.</p>'}`;
}

function showLines() {
  const choices = [...practiceCatalog.lines.map(String), '0'].filter(line =>
    practiceCatalog.tasks.some(task => String(bankLine(task) ?? 0) === line));
  const tasks = state.line ? filtered(practiceCatalog.tasks) : [];
  view.innerHTML = `${breadcrumb(link('Банк задач', url()))}
    ${mainHeading('По номерам ЕГЭ')}
    <nav class="bank-topics" aria-label="Номера заданий ЕГЭ">
    ${choices.map(line => {
      const count = practiceCatalog.tasks.filter(task => String(bankLine(task) ?? 0) === line).length;
      return link(line === '0' ? `Без номера · ${countText(count)}` : `№${line} · ${countText(count)}`,
        url({mode: 'line', line}), ` class="chip"${state.line === line ? ' aria-current="true"' : ''}`);
    }).join('')}</nav>
    ${state.line ? collection(tasks, state.line === '0' ? 'Задания без номера' : 'Задания №' + state.line) : ''}`;
  if (state.line) mountCards(pageOf(tasks).items);
}

function pageOf(tasks) {
  const pages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const page = Math.min(state.page, pages);
  return {items: tasks.slice((page - 1) * pageSize, page * pageSize), page, pages};
}

function pagination(page, pages) {
  if (pages <= 1) return '';
  return `<nav class="ege-neighbors" aria-label="Страницы задач">
    ${page > 1 ? link('Предыдущая страница', routeURL({page: page - 1}, '#task-list'), ' class="btn"') : '<span></span>'}
    <span class="muted">${page} / ${pages}</span>
    ${page < pages ? link('Следующая страница', routeURL({page: page + 1}, '#task-list'), ' class="btn"') : '<span></span>'}
  </nav>`;
}

function collection(tasks, title) {
  const {items, page, pages} = pageOf(tasks);
  return `<section class="bank-catalog" id="task-list" aria-labelledby="selection-title">
    <div class="bank-section-title"><h2 id="selection-title" tabindex="-1" data-bank-focus>${escapeHTML(title)}</h2>
      <span class="mini-count">${countTasks(tasks.length)}</span></div>
    ${cardsList(items, (page - 1) * pageSize)}${pagination(page, pages)}
    </section>`;
}

function search(formView) {
  const label = formView === 'fipi' ? 'Код или тема' : 'Найти задачу';
  const placeholder = formView === 'fipi' ? '' : 'Тема или слово из условия';
  return `<form class="ege-search" role="search" data-search-view="${formView}">
    <label>${label} <input name="q" type="search" value="${escapeHTML(state.q)}" placeholder="${placeholder}" maxlength="32"></label>
    <button class="btn" type="submit">Найти</button></form>`;
}

function showSearch() {
  const selectedModule = practiceCatalog.practiceModules.find(module => module.id === state.module);
  const withinModule = selectedModule ? new Set(selectedModule.blocks.flatMap(block => block.tasks.map(task => task.id))) : null;
  const tasks = filtered(practiceCatalog.tasks.filter(task =>
    (!state.block || task.block === state.block || (state.topic && taskTopics(task).includes(state.topic))) &&
    (!state.lesson || taskLessons(task, practiceCatalog).includes(state.lesson)) &&
    (!state.topic || taskTopics(task).includes(state.topic)) &&
    (!withinModule || withinModule.has(task.id))));
  view.innerHTML = `${breadcrumb(link('Банк задач', url()))}${mainHeading('Поиск в задачнике')}
    ${search('practice')}${collection(tasks, 'Найденные задачи')}
    ${link('Поискать в каталоге ФИПИ', url({view: 'fipi', q: state.q}), ' class="bank-text-link"')}`;
  mountCards(pageOf(tasks).items);
}

function showReferences() {
  const base = catalog.tasks.filter(task => task.official &&
    (!state.block || (state.block === 'mechanics' ? officialMechanics.has(task.id) : task.block === state.block)) &&
    (!state.lesson || taskLessons(task, catalog).includes(state.lesson)) &&
    (!state.topic || taskTopics(task).includes(state.topic)));
  const tasks = filtered(base);
  const {items, page, pages} = pageOf(tasks);
  const options = practiceCatalog.blocks.map(section =>
    `<option value="${escapeHTML(section.id)}"${state.block === section.id ? ' selected' : ''}>${escapeHTML(section.title)}</option>`).join('');
  view.innerHTML = `${breadcrumb(link('Банк задач', url()))}
    ${mainHeading('Каталог ФИПИ', 'Найди оригинал по коду или теме. Условия открываются на ФИПИ.')}
    ${search('fipi')}
    <div class="ege-reference-controls"><label>Раздел <select name="reference-block"><option value="">Все разделы</option>${options}</select></label></div>
    <section class="bank-catalog" id="task-list" aria-labelledby="selection-title">
      <div class="bank-section-title"><h2 id="selection-title" tabindex="-1" data-bank-focus>Оригиналы заданий</h2>
        <span class="mini-count">${countTasks(tasks.length)}</span></div>
      ${items.length ? `<ul class="topic-list">${items.map(task => `<li><a class="lesson-row" href="${escapeHTML(officialLink(task.official))}"
        target="_blank" rel="noopener"><span><strong>${escapeHTML(task.sourceId)}</strong> · ${escapeHTML(task.skill ?? task.prompt)}</span>
        <span class="ege-external-icon" aria-hidden="true">↗</span></a></li>`).join('')}</ul>` : '<p>По выбранным параметрам задания не найдены.</p>'}
      ${pagination(page, pages)}
    </section>
    <p><a class="bank-text-link" href="https://fipi.ru/ege/otkrytyy-bank-zadaniy-ege/" target="_blank" rel="noopener">Открытый банк ФИПИ ↗</a></p>`;
}

function cardsList(tasks, offset = 0) {
  if (!tasks.length) return '<p>В этой подборке нет задач с выбранными параметрами.</p>';
  return `<ol class="quest-list">${tasks.map((task, index) =>
    `<li id="row-${escapeHTML(task.id)}">${taskCard(task, false, offset + index + 1)}</li>`).join('')}</ol>`;
}

function taskLabel(task) {
  return task.skill || catalog.labels.get(task.topic) || 'Задача ЕГЭ';
}

function displayAnswer(answer) {
  return answer?.replaceAll('.', ',').replaceAll('±',' ± ') ?? '';
}

function solutionMarkup(task) {
  if (!task.answer && !task.solution) return '';
  return `<details class="ege-solution">
    <summary>${task.solution ? 'Показать разбор' : 'Показать ответ'}</summary>
    ${task.answer ? `<p><strong>${escapeHTML(displayAnswer(task.answer))}${task.unit ? ' ' + escapeHTML(task.unit) : ''}</strong></p>` : ''}
    ${task.solution ? `<p class="ege-text">${escapeHTML(task.solution)}</p>` : ''}
    ${task.criteria?.length ? `<ul>${task.criteria.map(text => `<li>${escapeHTML(text)}</li>`).join('')}</ul>` : ''}
    ${task.type === 'long' ? reviewButton(task) : ''}
  </details>`;
}

function reviewButton(task) {
  const reviewed = progressOf(task).reviewed || (completed(task) && !checked(task));
  return `<button class="btn" type="button" data-mark-review ${reviewed ? 'disabled' : ''}>${reviewed ? 'Разобрана' : 'Отметить разобранной'}</button>`;
}

function formMarkup(task) {
  const isLong = task.type === 'long';
  if (isLong ? !task.finalCheck : task.official && !task.key) return '';
  const label = isLong ? 'Ответ для проверки итога' : 'Ответ';
  const unit = isLong ? task.finalCheck.unit : task.unit;
  const format = task.type === 'measure' ? '0 ± 0' : '';
  const accepted = isLong ? task.finalCheck.accepted : task.key?.accepted ?? [task.answer];
  const signed = accepted?.some(value => /^[-−]/.test(String(value).trim()));
  const keyboard = task.type === 'measure' || signed ? 'text' : isLong || task.type === 'number' ? 'decimal' : 'numeric';
  return `<form class="ansbox" data-answer-check>
    <label>${label}${unit ? ', ' + escapeHTML(unit) : ''}
      <input class="ege-answer" name="answer" inputmode="${keyboard}" autocomplete="off" maxlength="64"
        ${format ? ` placeholder="${format}"` : ''} value="${escapeHTML(isLong ? progressOf(task).finalAnswer : progressOf(task).answer)}" required>
    </label>
    <button class="btn primary" type="submit">${isLong ? 'Проверить итог' : 'Проверить'}</button>
  </form>`;
}

function taskCard(task, standalone, number) {
  const id = escapeHTML(task.id);
  const heading = standalone ? 'h1' : 'h3';
  const label = standalone ? taskLabel(task) : 'Задача ' + number;
  const external = task.official ? escapeHTML(officialLink(task.official)) : '';
  const reference = task.source === 'reference';
  return `<article class="task${completed(task) ? ' ok' : ''}" data-task-card="${id}" aria-labelledby="title-${id}">
    <div class="task-top"><${heading} id="title-${id}" class="${standalone ? 'ege-task-title' : 'tn'}"${standalone ? ' tabindex="-1" data-bank-focus' : ''}>${escapeHTML(label)}</${heading}>
      <span class="muted">${escapeHTML(types[task.type] ?? '')}${task.line ? ' · №' + task.line + ' ЕГЭ' : ''}</span></div>
    ${task.official ? `<p class="muted">ФИПИ · ${escapeHTML(task.sourceId)}</p>` : ''}
    ${!task.official ? `<p class="tt ege-text">${escapeHTML(task.prompt)}</p>` : ''}
    ${task.cardPath && !reference ? `<div class="ege-original" data-original><p role="status">Загружаем условие…</p></div>
      <p class="muted" data-asset-error hidden>Часть условия не загрузилась. Ниже есть ссылка на оригинал.</p>` : ''}
    ${reference ? `<p class="tt">${escapeHTML(task.reason ?? 'Оригинал задания доступен на ФИПИ.')}</p>
      <a class="btn primary" href="${external}" target="_blank" rel="noopener">Открыть условие на ФИПИ ↗</a>` : ''}
    ${task.clarify ? `<p class="tt">${escapeHTML(task.clarify)}</p>` : ''}
    <div data-visuals></div>
    ${reference ? '' : `<div class="task-controls ege-attempt">
      ${formMarkup(task)}
      <button class="btn board" type="button" data-ege-board${task.cardPath ? ' disabled' : ''}>Доска для решения</button>
      <output class="verdict" aria-live="polite"></output>
    </div>`}
    ${task.cardPath && !reference ? `<details class="ege-solution ege-original" data-original-solution hidden><summary>Показать разбор</summary><div></div></details>` : ''}
    ${task.hint ? `<details class="ege-solution"><summary>Подсказка</summary><p>${escapeHTML(task.hint)}</p></details>` : ''}
    ${solutionMarkup(task)}
    ${standalone || external ? `<div class="task-links tr">
      ${external && !reference ? `<a href="${external}" target="_blank" rel="noopener">Оригинал на ФИПИ</a>` : ''}
      ${standalone ? '<button class="linkbtn" type="button" data-copy-link>Скопировать ссылку</button>' : ''}
    </div>` : ''}
  </article>`;
}

function showTask(task) {
  const practice = practiceCatalog.practiceBlocks.find(block => block.id === (state.topic || task.topic));
  const sourceQueue = state.mode ? filtered(practiceCatalog.tasks) :
    practice?.tasks.some(item => item.id === task.id) ? practice.tasks :
    practiceCatalog.tasks.filter(item => taskTopics(item).includes(state.topic || task.topic));
  const queue = sourceQueue.some(item => item.id === task.id) ? sourceQueue : [];
  const index = queue.findIndex(item => item.id === task.id);
  const neighbor = (item, text) => item ?
    link(text, routeURL({task: item.id, page: 1}), ' class="btn"') : '<span></span>';
  const back = task.source === 'reference' || !practiceCatalog.byId.has(task.id) ? url({view: 'fipi'}) :
    routeURL({block: state.mode ? '' : practice?.section || task.block,
      module: state.mode ? '' : practice?.module, topic: state.mode ? '' : practice?.id || task.topic, page: state.mode ? Math.floor(index / pageSize) + 1 : 1}, '#row-' + task.id);
  view.innerHTML = `<div class="ege-center">
    ${breadcrumb(link('Банк задач', url()), link('← К подборке', back))}
    ${taskCard(task, true)}
    ${queue.length > 1 ? `<nav class="ege-neighbors" aria-label="Соседние задачи">
      ${neighbor(queue[index - 1], '← Предыдущая')}${neighbor(queue[index + 1], 'Следующая →')}
    </nav>` : ''}
  </div>`;
  document.title = taskLabel(task) + ' · Задачник ЕГЭ · INVARIANT';
  mountCards([task]);
  if (practiceCatalog.byId.has(task.id)) remember(task);
}

function enlarge(visual) {
  const dialog = document.querySelector('.ege-image-dialog');
  dialog.querySelector('.ege-dialog-visual').replaceChildren(visual.cloneNode(true));
  dialog.showModal();
}

function zoomButton(visual) {
  const button = element('button', null, {class: 'ege-visual-open', type: 'button', 'aria-label': 'Увеличить рисунок'});
  button.append(visual);
  button.addEventListener('click', () => enlarge(visual));
  return button;
}

function drawVisuals(task, card) {
  const container = card.querySelector('[data-visuals]');
  for (const visual of taskVisuals(task)) container.append(visual.matches('figure') ? zoomButton(visual) : visual);
  if (task.image) {
    const figure = element('figure', null, {class: 'mock-figure'});
    const src = new URL('./figures/' + task.image.file, import.meta.url);
    figure.append(element('img', null, {src, alt: task.image.alt, loading: 'lazy'}));
    container.append(zoomButton(figure));
  }
}

async function drawOriginal(task, article) {
  const body = article.querySelector('[data-original]');
  const solution = article.querySelector('[data-original-solution]');
  const fail = () => { article.querySelector('[data-asset-error]').hidden = false; };
  try {
    const privateCard = !practiceCatalog.byId.has(task.id) && personalBank?.cards[task.cardPath];
    const card = privateCard || await readJSON(sitePath(task.cardPath));
    if (card.id !== task.id) throw new Error('Mismatched card ID');
    if (!article.isConnected) return;
    const options = {
      ...(privateCard ? {imageSource: path => personalBank.assets[path] ?? sitePath(path)} : {}),
      enlarge,
    };
    body.replaceChildren(renderParts(card.parts, fail, options));
    article.querySelector('[data-ege-board]').disabled = false;
    if (card.solution?.parts) {
      solution.querySelector('div').append(renderParts(card.solution.parts, fail, options));
      if (task.type === 'long') solution.insertAdjacentHTML('beforeend', reviewButton(task));
      solution.hidden = false;
    }
  } catch {
    if (!article.isConnected) return;
    body.textContent = 'Условие не загрузилось. Его можно открыть по ссылке на ФИПИ.';
  }
}

function mountCards(tasks) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  for (const card of view.querySelectorAll('[data-task-card]')) {
    const task = byId.get(card.dataset.taskCard);
    if (!task) continue;
    drawVisuals(task, card);
    if (task.cardPath && task.source !== 'reference') drawOriginal(task, card);
  }
}

function verdict(card, message, success, completedTask = false) {
  const result = card.querySelector('.verdict');
  result.textContent = message;
  result.className = 'verdict ' + (success ? 'ok' : 'no');
  if (completedTask) card.classList.add('ok');
}

function remember(task) {
  if (practiceCatalog.byId.has(task.id)) progress.last = taskURL(task);
  storeProgress();
}

function check(card, task, raw) {
  const isLong = task.type === 'long';
  const key = isLong ? task.finalCheck : task.key;
  const answerCorrect = key ? originalAnswerMatches(key, raw) : answerIsCorrect(task, raw);
  const previous = progressOf(task);
  progress.entries[task.id] = {
    ...previous,
    [isLong ? 'finalAnswer' : 'answer']: raw,
    checked: answerCorrect || checked(task),
    done: answerCorrect || previous.done,
  };
  remember(task);
  verdict(card, answerCorrect ? isLong ? 'Итог верен' : 'Верно' : 'Проверь ответ', answerCorrect, completed(task));
}

function updateTopicCount(card) {
  const block = card.closest('.ege-practice-block');
  if (!block) return;
  const id = block.getAttribute('aria-labelledby').slice('topic-'.length);
  const practice = practiceCatalog.practiceBlocks.find(item => item.id === id);
  const count = block.querySelector('.mini-count');
  if (practice && count) count.firstChild.data = practice.tasks.filter(completed).length + ' / ' + practice.tasks.length;
  const total = view.querySelector('[data-bank-solved]');
  if (total) total.textContent = countText(practiceCatalog.tasks.filter(completed).length);
  const active = view.querySelector('.ege-module-grid [aria-current] [data-module-meter]');
  const module = modulesForSection(practice?.section).find(item => item.id === practice?.module);
  if (active && module) {
    const tasks = module.blocks.flatMap(item => item.tasks);
    active.style.width = (tasks.length ? tasks.filter(completed).length / tasks.length * 100 : 0) + '%';
  }
}

function markReviewed(card, task, button) {
  progress.entries[task.id] = {...progressOf(task), done: true, reviewed: true};
  remember(task);
  button.disabled = true;
  button.textContent = 'Разобрана';
  verdict(card, 'Разобрана', true, true);
  updateTopicCount(card);
}

function loadBoard() {
  if (!boardRequest) {
    boardRequest = new Promise((resolve, reject) => {
      const script = element('script', null, {src: new URL('../../task-board.js?v=study-rail-1', import.meta.url)});
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        boardRequest = undefined;
        reject(new Error('Не загрузилась доска'));
      };
      document.head.append(script);
    });
  }
  return boardRequest;
}

async function openBoard(card, task, button) {
  button.disabled = true;
  try {
    await loadBoard();
    if (!card.isConnected) return;
    const condition = document.createElement('div');
    for (const part of card.querySelectorAll('[data-original], .tt, [data-visuals]')) condition.append(part.cloneNode(true));
    window.InvariantEgeBoard.open(task.id, taskLabel(task), condition);
    remember(task);
  } catch {
    if (card.isConnected) verdict(card, 'Доска не открылась. Попробуй ещё раз.', false);
  } finally { button.disabled = false; }
}

function loadPersonal() {
  if (!personalRequest) personalRequest = readPersonalBank().catch(() => null).then(bank => {
    personalBank = bank;
    setupPersonalBank(Boolean(bank));
    const controls = document.querySelector('[data-personal-bank]');
    const input = controls?.querySelector('input');
    if (input) {
      input.disabled = false;
      if (state) controls.hidden = state.view !== 'fipi' && !catalog.byId.get(state.task)?.official;
    }
    return bank;
  });
  return personalRequest;
}

async function loadReferences() {
  if (referenceCatalog) return referenceCatalog;
  if (!referenceRequest) {
    referenceRequest = readJSON(sitePath('ege-data/v1/catalog.json')).then(inventory => {
      officialMechanics = new Set(inventory.tasks.filter(entry => entry.kes.some(code => /^1(?:\.|$)/.test(code)))
        .map(entry => entry.id));
      referenceCatalog = buildCatalog(course, variant, inventory, keys);
      return referenceCatalog;
    }).catch(error => {
      referenceRequest = undefined;
      throw error;
    });
  }
  return referenceRequest;
}

async function catalogForRoute(query) {
  const id = query.get('task') ?? '';
  if (query.get('view') === 'fipi' || query.get('source') === 'reference') return loadReferences();
  if (!/^ege-fipi-[A-Z\d]+$/i.test(id) || practiceCatalog.byId.has(id)) return practiceCatalog;
  const bank = await loadPersonal();
  if (bank?.inventory.tasks.some(task => task.id === id)) return buildCatalog(course, variant, bank.inventory, keys);
  return loadReferences();
}

async function render(transition = false) {
  const version = ++renderVersion;
  const query = new URLSearchParams(location.search);
  const hash = location.hash;
  document.title = 'Задачник ЕГЭ по физике · INVARIANT';
  if (!referenceCatalog && (query.get('view') === 'fipi' || query.get('source') === 'reference')) {
    view.innerHTML = '<p class="foot" role="status">Загружаем каталог ФИПИ…</p>';
  }
  try {
    const selected = await catalogForRoute(query);
    if (version !== renderVersion) return;
    catalog = selected;
    state = route(query);
    const task = catalog.byId.get(state.task);
    const personal = document.querySelector('[data-personal-bank]');
    if (personal && 'indexedDB' in window) personal.hidden = state.view !== 'fipi' && !task?.official;
    window.dispatchEvent(new Event('ege-study-state'));
    if (task) showTask(task);
    else if (state.task) view.innerHTML = `${mainHeading('Задача не найдена')}${link('Открыть задачник', url())}`;
    else if (state.view === 'fipi') {
      showReferences();
      if ('indexedDB' in window) loadPersonal();
    }
    else if (state.view === 'progress') showProgress();
    else if (state.mode) showLines();
    else if (state.q) showSearch();
    else showPractice();
    const anchor = document.getElementById(hash.slice(1));
    if (anchor) anchor.scrollIntoView();
    else if (transition || (state.topic && !state.task)) {
      const target = view.querySelector('[data-bank-focus]');
      if (transition) (target ?? view.querySelector('h1[tabindex="-1"]'))?.focus({preventScroll: true});
      if (target) target.scrollIntoView({block: target.dataset.bankFocus === 'module' ? 'nearest' : 'start'});
      else if (transition) window.scrollTo(0, 0);
    }
  } catch {
    if (version !== renderVersion) return;
    view.innerHTML = `${mainHeading('Каталог не загрузился')}
      <button class="btn" type="button" data-retry>Повторить</button>
      ${link('Вернуться в задачник', url(), ' class="bank-text-link"')}`;
  }
}

function navigate(href) {
  if (new URL(href, location.href).href === location.href) return;
  history.replaceState({scroll: window.scrollY}, '');
  history.pushState(null, '', href);
  render(true);
}

view.addEventListener('click', event => {
  const target = event.target;
  const navigation = target.closest('a[data-bank-link]');
  if (navigation && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    navigate(navigation.getAttribute('href'));
    return;
  }
  if (target.closest('[data-retry]')) return render(true);
  const card = target.closest('[data-task-card]');
  if (!card) return;
  const task = catalog.byId.get(card.dataset.taskCard);
  const board = target.closest('[data-ege-board]');
  if (board) return openBoard(card, task, board);
  const review = target.closest('[data-mark-review]');
  if (review) return markReviewed(card, task, review);
  const copy = target.closest('[data-copy-link]');
  if (copy) navigator.clipboard.writeText(new URL(taskURL(task), location.href).href)
    .then(() => { copy.textContent = 'Ссылка скопирована'; })
    .catch(() => { window.prompt('Ссылка на задачу', new URL(taskURL(task), location.href).href); });
});

view.addEventListener('submit', event => {
  const form = event.target;
  if (form.matches('[data-search-view]')) {
    event.preventDefault();
    navigate(url({view: form.dataset.searchView === 'fipi' ? 'fipi' : '', q: form.elements.q.value.trim()}, '#task-list'));
  }
  if (form.matches('[data-answer-check]')) {
    event.preventDefault();
    const card = form.closest('[data-task-card]');
    check(card, catalog.byId.get(card.dataset.taskCard), form.elements.answer.value);
    updateTopicCount(card);
  }
});

view.addEventListener('change', event => {
  if (event.target.name === 'reference-block') navigate(routeURL({block: event.target.value, page: 1, topic: ''}, '#task-list'));
});

async function load() {
  let inventory;
  [course, variant, inventory, keys] = await Promise.all([
    readJSON(new URL('../../lessons/ege.json', import.meta.url)),
    readJSON(new URL('../../mocks/data/ege-01-v1.json', import.meta.url)),
    readJSON(sitePath('ege-data/v1/practice-catalog.json')),
    readJSON(sitePath('ege-data/v1/verified-keys.json')),
  ]);
  practiceCatalog = buildCatalog(course, variant, inventory, keys);
  window.addEventListener('popstate', async event => {
    await render();
    if (!location.hash && Number.isFinite(event.state?.scroll)) window.scrollTo(0, event.state.scroll);
  });
  await render();
  const invitation = new URLSearchParams(location.hash.slice(1));
  if (invitation.has('room') && invitation.get('board')?.startsWith('invariant-ege-')) {
    try { await loadBoard(); window.InvariantEgeBoard.join(); }
    catch { /* The on-demand button can retry. */ }
  }
  const controls = document.querySelector('[data-personal-bank]');
  if (controls && 'indexedDB' in window) {
    controls.addEventListener('toggle', () => { if (controls.open) loadPersonal(); });
  }
}

load().catch(() => {
  view.innerHTML = `${mainHeading('Задачник ЕГЭ не загрузился')}<button class="btn" type="button">Обновить</button>`;
  view.querySelector('button').addEventListener('click', () => location.reload());
});
