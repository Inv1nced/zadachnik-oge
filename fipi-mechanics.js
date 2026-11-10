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
const bank = window.OGE_FIPI_MECHANICS;
const official = 'https://oge.fipi.ru/bank/questions.php?proj=B24AFED7DE6AB5BC461219556CCA4F9B&search=1&qid=';
const pageSize = 24;
const topic = document.getElementById('topic');
const format = document.getElementById('format');
const code = document.getElementById('code');
const list = document.getElementById('tasks');
const count = document.getElementById('count');
const pageText = document.getElementById('page');
const previous = document.getElementById('prev');
const next = document.getElementById('next');
let page = 0;

topic.add(new Option('Все темы', ''));
topic.add(new Option('Кинематика · все темы', 'kinematics'));
topics.forEach((name, index) => topic.add(new Option(index ? `1.${index} ${name}` : name, String(index))));

function render() {
  const query = code.value.trim().toUpperCase();
  const filtered = bank.filter(([id, tags, full]) => {
    if (query && !id.toUpperCase().includes(query)) return false;
    if (format.value && full !== (format.value === 'full')) return false;
    if (topic.value === 'kinematics') return tags.some(tag => tag >= 1 && tag <= 6);
    if (topic.value === '0') return tags.length === 0;
    return !topic.value || tags.includes(Number(topic.value));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, pages - 1);
  count.textContent = filtered.length ? `Найдено ${filtered.length} из ${bank.length}` : 'По этим фильтрам заданий нет.';
  list.replaceChildren(...filtered.slice(page * pageSize, (page + 1) * pageSize).map(([id, tags, full]) => {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = id;
    const description = document.createElement('p');
    description.textContent = (tags.map(tag => topics[tag]).filter(Boolean).join(' · ') || topics[0]) +
      (full ? ' · развёрнутый ответ' : '');
    const link = document.createElement('a');
    link.href = official + id;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Условие ФИПИ ↗';
    link.setAttribute('aria-label', `Условие ФИПИ ${id}, откроется в новой вкладке`);
    item.append(title, description, link);
    return item;
  }));
  pageText.textContent = filtered.length ? `${page + 1} / ${pages}` : '';
  previous.disabled = page === 0;
  next.disabled = page + 1 === pages;
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
