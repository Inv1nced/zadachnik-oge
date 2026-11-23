import { escapeHTML as e, showLab } from './lab.js';

const content = document.getElementById('course-content');
const query = new URLSearchParams(location.search);
const overview = document.body.dataset.page === 'course';
const exams = { ege: 'ЕГЭ', oge: 'ОГЭ' };
const exam = overview ? 'ege' : query.getAll('exam').length <= 1 ? (query.get('exam') ?? 'oge') : '';
const title = Object.hasOwn(exams, exam) ? exams[exam] : '';
const id = query.get('lesson');
const stages = [
  ['diagnostic', 'Диагностика', '0–5'],
  ['explain', 'Объясняем', '5–18'],
  ['together', 'Вместе', '18–33'],
  ['practice', 'Практика', '33–48'],
  ['review', 'Разбор', '48–55'],
  ['homework', 'Итог и ДЗ', '55–60'],
];
const stage = stages.find(([key]) => key === query.get('stage'))?.[0] || 'diagnostic';

function lessonURL(lesson, stageId = '', embed = false) {
  const params = new URLSearchParams({ exam });
  if (lesson) params.set('lesson', lesson.id);
  if (stageId) params.set('stage', stageId);
  if (embed) params.set('embed', '1');
  return 'lessons.html?' + params;
}

async function updateIntegration(link) {
  // Bank and mocks are merged independently. The official resource stays usable in an isolated checkout.
  try {
    const response = await fetch(link.href, { method: 'HEAD' });
    if (response.ok) return;
  } catch {
    // The official source also works when the project's module is temporarily unavailable.
  }
  link.href = link.dataset.fallback;
  link.textContent = link.dataset.fallbackTitle;
}
document.querySelectorAll('[data-integration]').forEach(updateIntegration);

function lessonIndex(lesson) {
  return String(lesson.number).padStart(2, '0');
}

function directory(data) {
  const tag = overview ? 'h3' : 'h2';
  return (overview ? '' : `<div class="route-top"><p class="kicker">${title} · ${exam === 'ege' ? 11 : 9} класс</p>
    <h1>Уроки физики</h1><p>${exam === 'oge'
      ? 'Выбери тему для повторения. План проведения прежних занятий доступен в кабинете.'
      : 'Выбери тему или двигайся по порядку, от механики к анализу эксперимента.'}</p></div>`) +
    data.blocks.map(block => {
      const items = data.lessons.filter(lesson => lesson.block === block.id);
      return `<section class="course-block" id="${e(block.id)}">
        <${tag}>${e(block.title)}</${tag}>
        <ul>${items.map(lesson => `<li><a class="lesson-row" href="${e(lessonURL(lesson))}">
          <span class="lesson-index">${lessonIndex(lesson)}</span><strong>${e(lesson.title)}</strong>
          <span class="lesson-duration">${lesson.duration ? lesson.duration + ' мин' : 'Повторение'}</span>
        </a></li>`).join('')}</ul>
      </section>`;
    }).join('');
}

function tasks(rows) {
  return rows.map(row => `<article class="task" id="${e(row.id)}">
    <h3>${e(row.label)}${row.level === 'advanced' ? ' · Повышенная сложность' : ''}</h3>
    <p>${e(row.question)}</p>
    ${row.hint ? `<details><summary>Подсказка</summary><p>${e(row.hint)}</p></details>` : ''}
  </article>`).join('');
}

function stageHTML(lesson) {
  if (stage === 'diagnostic') return tasks(lesson.diagnostic);
  if (stage === 'explain') return `<p>${e(lesson.theory)}</p><p class="formula">${e(lesson.formula)}</p>
    <p>${e(lesson.limits)}</p>${lesson.demo ? '<div class="demo" id="demo"></div>' : ''}`;
  if (stage === 'review') return `<h3>На что обратить внимание</h3><p>${e(lesson.error)}</p>
    <h3>Проверь себя</h3><p>${e(lesson.criterion)}</p><h3>Примени в другой ситуации</h3><p>${e(lesson.transfer.question)}</p>`;
  if (stage === 'homework') return `<h3>Вопрос на выходе</h3><p>${e(lesson.exit.question)}</p>
    <h3>Домашняя работа</h3>${tasks(lesson.homework)}`;
  return tasks(lesson[stage]);
}

function previousNext(data, lesson) {
  const index = data.lessons.indexOf(lesson);
  return `<nav class="lesson-footer" aria-label="Соседние занятия">
    ${data.lessons[index - 1] ? `<a href="${e(lessonURL(data.lessons[index - 1]))}">Предыдущий урок</a>` : '<span></span>'}
    ${data.lessons[index + 1] ? `<a href="${e(lessonURL(data.lessons[index + 1]))}">Следующий урок</a>` : ''}
  </nav>`;
}

function studentLesson(data, lesson) {
  const block = data.blocks.find(item => item.id === lesson.block);
  const label = stages.find(([key]) => key === stage)[1];
  const full = Boolean(lesson.duration);
  const embed = full && query.get('embed') === '1';
  document.body.classList.toggle('embedded', embed);
  document.title = `${lesson.title} · ${title} · INVARIANT`;
  const previous = stages[stages.findIndex(([key]) => key === stage) - 1];
  const next = stages[stages.findIndex(([key]) => key === stage) + 1];
  return `<header class="lesson-heading">
    <a href="${e(lessonURL())}">Все уроки ${title}</a>
    <p class="kicker">${title} · ${e(block.title)} · Занятие ${lesson.number}</p>
    <h1>${e(lesson.title)}</h1>
    ${full ? `<p class="intro">${e(lesson.goal)}</p><p class="meta">${e(lesson.level)} · ${lesson.duration} мин</p>
    <p class="meta"><strong>Перед занятием</strong> · ${e(lesson.prerequisites)}</p>` : '<p class="meta">9 класс · Повторение</p>'}
    ${exam === 'ege' ? `<p class="meta"><a href="ege-bank.html?topic=${e(lesson.topic)}" data-integration
      data-fallback="https://fipi.ru/navigator-podgotovki/navigator-ege" data-fallback-title="Задачи из навигатора ФИПИ">Задачи банка по теме</a></p>` : ''}
  </header>
  ${full ? `<div class="lesson-layout">
    <nav class="stage-nav" aria-label="Этапы урока">
      ${stages.map(([key, name, time]) => `<a href="${e(lessonURL(lesson, key))}"${key === stage ? ' aria-current="step"' : ''}>
        <span>${name}</span><small>${time} мин</small></a>`).join('')}
    </nav>
    <section class="stage" aria-labelledby="stage-heading">
      <h2 id="stage-heading">${label}</h2>${stageHTML(lesson)}
      ${embed ? '' : `<div class="actions">${previous ? `<a class="button" href="${e(lessonURL(lesson, previous[0]))}">${previous[1]}</a>` : ''}
      ${next ? `<a class="button primary" href="${e(lessonURL(lesson, next[0]))}">${next[1]}</a>` : ''}</div>`}
    </section>
  </div>` : `<section class="stage"><h2>Повторение темы</h2><p>${e(lesson.summary)}</p>
    <h3>Проверь, что помнишь</h3><p>${e(lesson.question)}</p>
    <div class="actions">${lesson.links.map(link => `<a class="button" href="${e(link.href)}">${e(link.text)}</a>`).join('')}</div></section>`}
  ${previousNext(data, lesson)}`;
}

async function load() {
  if (!title) {
    content.innerHTML = '<h1>Выбери экзамен</h1><p><a href="lessons.html?exam=oge">ОГЭ</a> или <a href="lessons.html?exam=ege">ЕГЭ</a></p>';
    return;
  }
  document.querySelector(`[data-exam="${exam}"]`)?.setAttribute('aria-current', 'page');
  const source = document.getElementById('exam-source');
  if (source) source.href = `https://fipi.ru/${exam}/demoversii-specifikacii-kodifikatory`;
  const response = await fetch(new URL(exam + '.json', import.meta.url));
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const data = await response.json();
  const lesson = !overview && id ? data.lessons.find(item => item.id === id) : null;
  const cabinet = document.getElementById('cabinet-link');
  if (cabinet) {
    const params = new URLSearchParams({ view: lesson ? 'lesson' : 'lessons', exam });
    if (lesson) params.set('lesson', lesson.cabinetId);
    cabinet.href = 'teach.html?' + params;
  }
  if (!overview && id && !lesson) {
    content.innerHTML = `<h1>Урок не найден</h1><p><a href="${e(lessonURL())}">Открыть все уроки ${title}</a></p>`;
    return;
  }
  content.innerHTML = lesson ? studentLesson(data, lesson) : directory(data);
  if (!document.body.classList.contains('embedded')) content.querySelectorAll('[data-integration]').forEach(updateIntegration);
  const demo = document.getElementById('demo');
  if (demo) showLab(demo, lesson.demo, lesson.id);
}

load().catch(() => {
  content.innerHTML = '<h2>Уроки не загрузились</h2><p>Обнови страницу, чтобы повторить загрузку.</p><div class="actions"><button class="button" type="button">Обновить</button></div>';
  content.querySelector('button').onclick = () => location.reload();
});
