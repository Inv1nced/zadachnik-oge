'use strict';

const topics = [
  'Общие задания по механике', 'Движение и система отсчёта', 'Средняя скорость',
  'Равномерное прямолинейное движение', 'Равноускоренное движение',
  'Свободное падение', 'Движение по окружности', 'Масса и плотность',
  'Сила и сложение сил', 'Инерция и первый закон Ньютона', 'Второй закон Ньютона',
  'Третий закон Ньютона', 'Трение', 'Упругость', 'Тяготение и сила тяжести',
  'Импульс тела', 'Сохранение импульса', 'Работа и мощность', 'Механическая энергия',
  'Сохранение механической энергии', 'Простые механизмы', 'Давление',
  'Закон Паскаля', 'Закон Архимеда', 'Колебания', 'Маятники',
  'Затухание и резонанс', 'Механические волны', 'Звук', 'Практические работы',
  'Механика в природе', 'Технические устройства'
];
const practiceBank = window.OGE_EXTRA_PHYSICS;
const params = new URLSearchParams(location.search);
const section = practiceBank.sections.some(([id]) => id === params.get('section')) ? params.get('section') : 'mechanics';
const mechanics = section === 'mechanics';
const bank = mechanics ? window.OGE_FIPI_MECHANICS : window.OGE_FIPI_EXTRA.filter(row => row[1].includes(section));
const formats = {
  short: 'Краткий ответ', single: 'Выбор одного ответа', multiple: 'Выбор нескольких ответов',
  terms: 'Расстановка терминов', match: 'Соответствие', full: 'Развёрнутый ответ',
};
const blockTags = {
  24: ['2.1','2.2','2.3','2.4'], 25: ['2.6','2.7','2.16','2.17'], 26: ['2.5','2.8','2.9','2.15'],
  27: ['2.10','2.11','2.12'], 28: ['2.13','2.14'], 29: ['3.1','3.2','3.3','3.4','3.5'],
  30: ['3.6','3.7','3.8','3.16'], 31: ['3.9'], 32: ['3.10','3.11'],
  33: ['3.12','3.13','3.14','3.15','3.17','3.18','3.19'], 34: ['3.20','3.21'], 35: ['3.22','3.23','3.27'],
  36: ['3.24','3.25','3.26','3.28'], 37: ['4.2','4.3'], 38: ['4.1','4.4'], 39: ['4.5','4.6','4.7'],
};
const sectionBlocks = practiceBank.modules.filter(module => module.section === section).flatMap(module => module.l);
const blockName = id => `Блок ${id} · ${practiceBank.lessons[id][0]}`;
const official = 'https://oge.fipi.ru/bank/questions.php?proj=B24AFED7DE6AB5BC461219556CCA4F9B&search=1&qid=';
const mirror = 'https://ege-fipi.ru/tasks/OGEPHYS';
const pageSize = 24;
const topic = document.getElementById('topic');
const format = document.getElementById('format');
const code = document.getElementById('code');
const list = document.getElementById('tasks');
const count = document.getElementById('count');
const pageText = document.getElementById('page');
const previous = document.getElementById('prev');
const next = document.getElementById('next');
const practice = document.getElementById('practice');
const returnToPractice = document.getElementById('return-to-practice');
let page = 0;

for (const [id, name] of practiceBank.sections) {
  const link = document.createElement('a');
  link.href = id === 'mechanics' ? 'fipi-mechanics.html' : `?section=${id}`;
  link.textContent = name;
  if (id === section) link.setAttribute('aria-current', 'page');
  document.getElementById('sections').append(link);
}
topic.add(new Option('Все темы', ''));
format.add(new Option('Любой', ''));
if (mechanics) {
  topic.add(new Option('Кинематика · все темы', 'kinematics'));
  topics.forEach((name, index) => topic.add(new Option(index ? `1.${index} ${name}` : name, String(index))));
  format.add(new Option('Развёрнутый', 'full'));
  format.add(new Option('Остальные', 'other'));
} else {
  sectionBlocks.forEach(id => topic.add(new Option(blockName(id), id)));
  if (sectionBlocks.includes(params.get('block'))) topic.value = params.get('block');
  Object.entries(formats).filter(([key]) => bank.some(row => row[3] === key))
    .forEach(([key, name]) => format.add(new Option(name, key)));
}
document.getElementById('source-note').textContent = mechanics
  ? 'Номера заданий механики взяты из открытого банка ФИПИ. Одна задача может относиться к нескольким темам.'
  : 'Подборка охватывает часть открытого банка. Номера и темы сверены по ege-fipi.ru. Если официальный банк не откроется, условие можно прочитать через «Копию задания» на этом независимом сайте.';

function matchesBlock(id, tags) {
  return tags.some(tag => blockTags[id].includes(tag));
}

function taskLink(url, text, label) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = text;
  link.setAttribute('aria-label', `${label}, откроется в новой вкладке`);
  return link;
}

function render() {
  const query = code.value.trim().toUpperCase();
  const filtered = bank.filter(row => {
    if (query && !row[0].toUpperCase().includes(query)) return false;
    if (!mechanics) return (!format.value || row[3] === format.value) && (!topic.value || matchesBlock(topic.value, row[2]));
    const [, tags, full] = row;
    if (format.value && full !== (format.value === 'full')) return false;
    if (topic.value === 'kinematics') return tags.some(tag => tag >= 1 && tag <= 6);
    if (topic.value === '0') return tags.length === 0;
    return !topic.value || tags.includes(Number(topic.value));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, pages - 1);
  count.textContent = filtered.length ? `Найдено ${filtered.length} из ${bank.length}` : 'По этим фильтрам заданий нет.';
  list.replaceChildren(...filtered.slice(page * pageSize, (page + 1) * pageSize).map(row => {
    const id = row[0];
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = id;
    const description = document.createElement('p');
    if (mechanics) {
      description.textContent = (row[1].map(tag => topics[tag]).filter(Boolean).join(' · ') || topics[0]) +
        (row[2] ? ' · развёрнутый ответ' : '');
    } else {
      const names = sectionBlocks.filter(block => matchesBlock(block, row[2])).map(blockName);
      description.textContent = [names.join(' / ') || 'Общее задание по разделу', formats[row[3]]].join(' · ');
    }
    const links = document.createElement('div');
    links.className = 'catalog-card-links';
    links.append(taskLink(official + id, 'Условие ФИПИ ↗', `Условие ФИПИ ${id}`));
    if (!mechanics) links.append(taskLink(mirror + id, 'Копия задания ↗', `Копия задания ${id} на ege-fipi.ru`));
    item.append(title, description, links);
    return item;
  }));
  pageText.textContent = filtered.length ? `${page + 1} / ${pages}` : '';
  previous.disabled = page === 0;
  next.disabled = page + 1 === pages;
  practice.href = mechanics ? 'index.html?section=mechanics' : `index.html?section=${section}${topic.value ? `&block=${topic.value}` : ''}`;
  returnToPractice.href = practice.href;
}

function applyFilters() {
  page = 0;
  render();
}
topic.addEventListener('change', applyFilters);
format.addEventListener('change', applyFilters);
code.addEventListener('input', applyFilters);
previous.addEventListener('click', () => { page--; render(); });
next.addEventListener('click', () => { page++; render(); });
render();
