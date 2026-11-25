import { grade } from './grade.js';
import { svgUrl } from './graphics.js';
import { figureImages, figureMarkup } from './figures.js';
import { createModel } from './models.js';
import { mountPlayer } from './player.js';
import { mountReport } from './report.js';

const byId = id => document.getElementById(id);
const root = byId('trial');
const current = byId('current');
const escape = value => OgeCore.escapeHtml(value);
const branches = {ege: {initial: 'KIN', label:'ЕГЭ · 11 класс'}, school: {initial: 'energy', label:'Школьная физика · 10 класс'}};
const sessions = {};
const ui = {branch: null, open: null, mode: 'intro', player: null};
const statusMessages = {
  correct: 'Верно.',
  wrong: 'Пока не сходится. Проверьте расчёт или попробуйте подсказку.',
  blank: 'Заполните все поля или выберите утверждения.',
  format: 'Введите число без единицы. Можно использовать точку или запятую.'
};

async function openBranch(name, deepLink) {
  if (!Object.hasOwn(branches, name) || ui.open) return;
  const status = byId(ui.mode === 'intro' ? 'load-status' : 'error-status');
  const buttons = [...root.querySelectorAll('[data-branch]')];
  ui.open = name;
  status.hidden = false;
  status.textContent = 'Загружаем задачи…';
  buttons.forEach(button => { button.disabled = true; });
  try {
    if (!Object.hasOwn(sessions, name)) {
      const response = await fetch(`./${name}.json`);
      if (!response.ok) throw new Error(`Банк задач: ${response.status}`);
      const bank = await response.json();
      sessions[name] = {bank, section: branches[name].initial, level: 'all', task: null, answers: new Map()};
    }
    if (deepLink) {
      const s = sessions[name];
      const task = s.bank.tasks.find(item => item.id === deepLink);
      if (task) { s.section = task.section; s.task = task.id; }
    }
    ui.branch = name;
    ui.mode = 'work';
    byId('intro').hidden = true;
    byId('workspace').hidden = false;
    byId('plan').hidden = true;
    byId('skip-link').href = '#current';
    byId('branch-switch').hidden = false;
    byId('top-actions').hidden = false;
    byId('error-status').hidden = true;
    buttons.forEach(button => {
      if (button.parentElement.id === 'branch-switch') button.setAttribute('aria-pressed', button.dataset.branch === name);
    });
    status.hidden = true;
    renderWorkspace(true);
  } catch (error) {
    console.error(error);
    status.textContent = 'Банк задач не загрузился. Нажмите на сценарий ещё раз.';
    status.hidden = false;
  } finally {
    buttons.forEach(button => { button.disabled = false; });
    ui.open = null;
  }
}

const session = () => sessions[ui.branch];
const section = s => s.bank.sections.find(item => item.id === s.section);
function visibleTasks(s) {
  const group = section(s);
  return s.bank.tasks.filter(task => task.section === group.id && (s.level === 'all' || task.level === s.level))
    .sort((a, b) => routeOrder(group, a.id) - routeOrder(group, b.id));
}
function routeOrder(group, id) {
  const pos = group.route.indexOf(id);
  if (pos !== -1) return pos;
  return group.extension === id ? 101 : group.support === id ? 100 : 102;
}
function stateFor(task) {
  const states = session().answers;
  if (!states.has(task.id)) states.set(task.id, {values: [], hint: 0, step: 0, answer: false, checked: '', skipped: false});
  return states.get(task.id);
}
function renderWorkspace(focusHeading = false) {
  ui.player?.pause();
  ui.player = null;
  const s = session();
  const group = section(s);
  const tasks = visibleTasks(s);
  if (!tasks.some(task => task.id === s.task)) s.task = tasks[0]?.id;
  byId('sections').innerHTML = s.bank.sections.map(item => `<button type="button" data-section="${item.id}" aria-current="${item.id === s.section}">${escape(item.name)}</button>`).join('');
  byId('section-select').innerHTML = s.bank.sections.map(item => `<option value="${item.id}">${escape(item.name)}</option>`).join('');
  byId('section-select').value = group.id;
  byId('task-select').innerHTML = tasks.map(task => `<option value="${task.id}">${escape(task.title)}</option>`).join('');
  byId('task-select').value = s.task ?? '';
  byId('task-select').disabled = !tasks.length;
  const levels = new Map(s.bank.tasks.filter(task => task.section === group.id).map(task => [task.level, task.levelName]));
  byId('level').innerHTML = '<option value="all">Все уровни</option>' + [...levels].map(([value, label]) => `<option value="${value}">${escape(label)}</option>`).join('');
  byId('level').value = s.level;
  byId('task-list').innerHTML = tasks.map(task => {
    const index = group.route.indexOf(task.id);
    const state = stateFor(task);
    let label = index >= 0 ? `Маршрут · ${index + 1}` : group.support === task.id ? 'Для поддержки' : 'Дополнительная';
    if (state.checked === 'correct' || state.checked === 'oral') label += ' · Разобрана';
    else if (state.skipped) label += ' · Пропущена';
    return `<button type="button" data-task="${task.id}" aria-current="${task.id === s.task}"><span class="task-order">${label}</span>${escape(task.title)}</button>`;
  }).join('');
  const url = new URL(location.href);
  url.searchParams.set('branch', ui.branch);
  if (s.task) url.searchParams.set('task', s.task);
  else url.searchParams.delete('task');
  history.replaceState(null, '', url);
  if (s.task) renderTask(tasks, tasks.findIndex(task => task.id === s.task));
  else current.innerHTML = '<h1 tabindex="-1">Нет задач по этому фильтру</h1><button id="clear-filter">Показать все уровни</button>';
  if (focusHeading) {
    window.scrollTo(0, 0);
    current.querySelector('h1').focus({preventScroll: true});
  }
}

function fieldsMarkup(task, state) {
  if (task.kind === 'oral') return '<p>Обсудите ответ устно. Отметьте задачу после разбора.</p>';
  if (task.kind === 'choice') return '<div class="choice-grid">' + task.options.map(option => `<label><input type="checkbox" name="choices" value="${option.id}" ${state.values.includes(String(option.id)) ? 'checked' : ''}><span>${option.id}. ${escape(option.text)}</span></label>`).join('') + '</div>';
  return '<div class="answer-grid">' + (task.kind === 'ordered'
    ? task.rows.map((label, i) => `<label>${escape(label)}<select name="answer"><option value="">Выберите вариант</option>${task.options.map(option => `<option value="${option.id}" ${state.values[i] === String(option.id) ? 'selected' : ''}>${option.id}. ${escape(option.text)}</option>`).join('')}</select></label>`)
    : task.fields.map((field, i) => `<label>${escape(field.label)}${field.unit && field.unit !== '1' ? `, ${escape(field.unit)}` : ''}<input name="answer" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${escape(state.values[i] ?? '')}"></label>`)).join('') + '</div>';
}
function renderTask(tasks, index) {
  const task = tasks[index];
  const state = stateFor(task);
  const figure = figureMarkup(task);
  current.innerHTML = `
    <p class="eyebrow">${escape(section(session()).name)} · ${escape(task.levelName)}</p>
    <h1 tabindex="-1">${escape(task.title)}</h1>
    <div class="condition${figure ? ' has-figure' : ''}"><p class="prompt">${escape(task.prompt)}</p>${figure}</div>
    <div id="task-tools" class="actions">
      ${createModel(task) ? '<button type="button" id="show-model" aria-expanded="false" aria-controls="interactive">Показать интерактив</button>' : ''}
      <button type="button" id="open-board">Открыть на доске</button>
    </div>
    <section id="interactive" aria-label="Интерактивная модель" hidden></section>
    <form class="answer-form" aria-labelledby="answer-title" novalidate>
      <h2 id="answer-title">Ответ</h2>${fieldsMarkup(task, state)}
      <div class="actions"><button type="submit" class="primary">${task.kind === 'oral' ? 'Отметить разобранной' : 'Проверить'}</button></div>
      <p class="answer-status" role="status" data-result="${state.checked}">${statusMessages[state.checked] ?? (state.checked === 'oral' ? 'Отмечено как разобранное.' : '')}</p>
    </form>
    <div class="actions">
      <button data-reveal="hint" aria-controls="hints" aria-expanded="${state.hint > 0}">${state.hint ? 'Следующая подсказка' : 'Подсказка'}</button>
      <button data-reveal="step" aria-controls="steps" aria-expanded="${state.step > 0}">${state.step ? 'Следующий шаг' : 'Начать решение'}</button>
      <button data-reveal="answer" aria-controls="solution-answer" aria-expanded="${state.answer}">${state.answer ? 'Скрыть ответ' : 'Показать ответ'}</button>
    </div>
    <div id="hints"></div><div id="steps"></div><div id="solution-answer"></div>
    <nav class="route-nav" aria-label="Переход между задачами">
      <span class="counter">Задача ${index + 1} из ${tasks.length}</span>
      <button type="button" data-move="-1" ${index === 0 ? 'disabled' : ''}>Предыдущая</button>
      <button type="button" data-skip ${index === tasks.length - 1 ? 'disabled' : ''}>Пропустить</button>
      <button type="button" data-move="1" ${index === tasks.length - 1 ? 'disabled' : ''}>Следующая</button>
    </nav>`;
  renderReveals(task, state);
}
function renderReveals(task, state) {
  for (const [field, id, items, first, more] of [
    ['hint', 'hints', task.hints, 'Подсказка', 'Следующая подсказка'],
    ['step', 'steps', task.steps, 'Начать решение', 'Следующий шаг']
  ]) {
    const button = current.querySelector(`[data-reveal="${field}"]`);
    button.disabled = state[field] >= items.length;
    button.textContent = state[field] >= items.length ? (field === 'hint' ? 'Все подсказки открыты' : 'Решение открыто') : state[field] ? more : first;
    button.setAttribute('aria-expanded', state[field] > 0);
    byId(id).innerHTML = state[field] ? `<div class="reveal"><h2>${field === 'hint' ? 'Подсказки' : 'Решение'}</h2><ol>${items.slice(0, state[field]).map(item => `<li>${escape(item)}</li>`).join('')}</ol></div>` : '';
  }
  const button = current.querySelector('[data-reveal="answer"]');
  button.textContent = state.answer ? 'Скрыть ответ' : 'Показать ответ';
  button.setAttribute('aria-expanded', state.answer);
  byId('solution-answer').innerHTML = state.answer ? `<div class="reveal"><h2>Правильный ответ</h2>${escape(task.answer)}</div>` : '';
}
function recordAnswer(form) {
  const s = session();
  const task = s.bank.tasks.find(item => item.id === s.task);
  const state = stateFor(task);
  const data = new FormData(form);
  state.values = data.getAll(task.kind === 'choice' ? 'choices' : 'answer');
  return {task, state};
}
current.addEventListener('input', event => {
  if (event.target.form?.classList.contains('answer-form')) recordAnswer(event.target.form);
});
current.addEventListener('submit', event => {
  event.preventDefault();
  const {task, state} = recordAnswer(event.target);
  const result = grade(task, state.values);
  state.checked = result;
  state.skipped = false;
  const live = current.querySelector('.answer-status');
  live.dataset.result = result;
  live.textContent = statusMessages[result] ?? 'Отмечено как разобранное.';
  if (result === 'correct') state.answer = true;
  renderReveals(task, state);
  const marker = byId('task-list').querySelector('[aria-current="true"] .task-order');
  if (marker) marker.textContent = marker.textContent.replace(/ · (Пропущена|Разобрана)$/, '') + (['correct','oral'].includes(result) ? ' · Разобрана' : '');
});

root.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.branch) return void openBranch(button.dataset.branch);
  if (button.id === 'fullscreen') return void toggleFullscreen();
  if (button.id === 'resume-lesson') return void openBranch(ui.branch);
  if (button.id === 'finish-lesson') {
    ui.player?.pause();
    ui.mode = 'plan';
    byId('workspace').hidden = true;
    const plan = byId('plan');
    plan.hidden = false;
    byId('skip-link').href = '#plan-heading';
    mountReport(plan, session(), branches[ui.branch].label);
    const heading = plan.querySelector('h1');
    heading.id = 'plan-heading';
    heading.focus();
    return;
  }
  if (!ui.branch) return;
  const s = session();
  if (button.dataset.section) return chooseSection(button.dataset.section);
  if (button.dataset.task || button.id === 'clear-filter') {
    if (button.dataset.task) s.task = button.dataset.task;
    else s.level = 'all';
    return renderWorkspace(true);
  }
  const tasks = visibleTasks(s);
  const index = tasks.findIndex(task => s.task === task.id);
  const task = tasks[index];
  if (button.id === 'show-model') {
    const panel = byId('interactive');
    if (panel.hidden && !ui.player) ui.player = mountPlayer(panel, task);
    else ui.player.pause();
    panel.hidden = !panel.hidden;
    if (task.model === 'ege-car') current.querySelector('.condition').classList.toggle('model-replaces-figure', !panel.hidden);
    button.textContent = panel.hidden ? 'Показать интерактив' : 'Скрыть интерактив';
    button.setAttribute('aria-expanded', !panel.hidden);
    return;
  }
  if (button.id === 'open-board') {
    ui.player?.pause();
    const images = figureImages(task).map(svgUrl);
    const options = task.options?.map(item => `${item.id}. ${item.text}`).join('\n');
    const table = task.figure?.type === 'table' ? [task.figure.columns, ...task.figure.rows].map(values => values.join(' | ')).join('\n') : '';
    const description = (task.figure?.type === 'diagram' || task.figure?.type === 'circuit') && !images.length ? byId('current').querySelector('figcaption')?.textContent : '';
    const statement = [task.prompt, table, description, options].filter(Boolean).join('\n\n');
    const row = [task.id, null, null, null, null, null, statement, images];
    BD.open(`trial-${ui.branch}-${task.id}`, row, task.title);
    root.inert = true;
    byId('bdClose').focus();
    return;
  }
  if (button.hasAttribute('data-skip') || button.dataset.move) {
    if (button.hasAttribute('data-skip') && !['correct','oral'].includes(stateFor(task).checked)) stateFor(task).skipped = true;
    s.task = tasks[index + Number(button.dataset.move ?? 1)]?.id ?? s.task;
    return renderWorkspace(true);
  }
  if (button.dataset.reveal) {
    const state = stateFor(task);
    const name = button.dataset.reveal;
    if (name === 'answer') state.answer = !state.answer;
    else state[name] += 1;
    renderReveals(task, state);
  }
});
function chooseSection(id, focusHeading = true) {
  const s = session();
  s.section = id;
  s.task = null;
  s.level = 'all';
  renderWorkspace(focusHeading);
}
byId('section-select').addEventListener('change', event => chooseSection(event.target.value, false));
byId('task-select').addEventListener('change', event => {
  session().task = event.target.value;
  renderWorkspace(false);
});
byId('level').addEventListener('change', event => {
  session().level = event.target.value;
  renderWorkspace();
});

function updateFullscreen() {
  const expanded = Boolean(document.fullscreenElement || root.classList.contains('focus-mode'));
  byId('fullscreen').textContent = expanded ? 'Выйти из полного экрана' : 'На весь экран';
  byId('fullscreen').setAttribute('aria-pressed', expanded);
}
async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (!root.classList.contains('focus-mode')) {
    try { await document.documentElement.requestFullscreen(); }
    catch { root.classList.add('focus-mode'); }
  } else root.classList.remove('focus-mode');
  updateFullscreen();
}
document.addEventListener('fullscreenchange', updateFullscreen);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && root.classList.contains('focus-mode')) {
    root.classList.remove('focus-mode');
    updateFullscreen();
  }
});

new MutationObserver(() => {
  if (byId('bd').hidden && root.inert) {
    root.inert = false;
    byId('open-board')?.focus();
  }
}).observe(byId('bd'),{attributeFilter:['hidden']});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) ui.player?.pause();
});

const deepLink = new URLSearchParams(location.search);
if (deepLink.has('branch')) openBranch(deepLink.get('branch'),deepLink.get('task'));
