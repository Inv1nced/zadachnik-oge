'use strict';

const index = window.OGE_FIPI;
const params = new URLSearchParams(location.search);
const sections = [['all', 'Все разделы'], ...index.sections];
const selected = params.get('section');
const section = sections.some(([id]) => id === selected) ? selected : 'mechanics';
const blocks = section === 'all' ? Object.keys(index.titles) : index.sectionBlocks(section);
const bank = section === 'all' ? [...index.byCode.values()] : index.sectionItems(section);
const pageSize = 24;

const nav = document.getElementById('sections');
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

function practiceUrl(block, taskCode) {
  const query = new URLSearchParams({source:'fipi'});
  if (block) {
    query.set('section', index.blockSection(Number(block)));
    query.set('block', block);
  } else if (section !== 'all') {
    query.set('section', section);
  }
  if (taskCode) query.set('code', taskCode);
  return 'index.html?' + query.toString();
}

for (const [id, name] of sections) {
  const link = document.createElement('a');
  link.href = id === 'mechanics' ? 'fipi-mechanics.html' : '?section=' + id;
  link.textContent = name;
  if (id === section) link.setAttribute('aria-current', 'page');
  nav.append(link);
}

topic.add(new Option('Все темы', ''));
blocks.forEach(block => topic.add(new Option('Блок ' + block + ' · ' + index.titles[block], block)));
if (blocks.includes(params.get('block'))) topic.value = params.get('block');
format.add(new Option('Любой', ''));
Object.entries(index.formats).filter(([id]) => bank.some(item => item.format === id))
  .forEach(([id, name]) => format.add(new Option(name, id)));
code.value = (params.get('code') || '').slice(0,32);

function linkTo(url, label, isExternal) {
  const link = document.createElement('a');
  link.href = url;
  link.textContent = label;
  if (isExternal) {
    link.target = '_blank';
    link.rel = 'noopener';
  }
  return link;
}

function card(item) {
  const card = document.createElement('li');
  const title = document.createElement('strong');
  title.textContent = item.code;
  const description = document.createElement('p');
  const relevant = topic.value ? [topic.value] : item.blocks.filter(block => blocks.includes(block));
  const block = relevant[0] || item.blocks[0];
  description.textContent = 'Блок ' + block + ' · ' + index.titles[block] + ' · ' + index.formats[item.format];
  const links = document.createElement('div');
  links.className = 'catalog-card-links';
  const original = linkTo(index.officialUrl(item.code), 'Условие ФИПИ ↗', true);
  original.setAttribute('aria-label', 'Условие ФИПИ ' + item.code + ' в новой вкладке');
  links.append(original);
  if (item.hasMirror) links.append(linkTo(index.mirrorUrl(item.code), 'Копия условия ↗', true));
  links.append(linkTo(practiceUrl(block,item.code), 'В задачнике →', false));
  card.append(title, description, links);
  return card;
}

function render() {
  const query = code.value.trim().toUpperCase();
  const filtered = bank.filter(item =>
    (!query || item.code.includes(query)) &&
    (!format.value || item.format === format.value) &&
    (!topic.value || item.blocks.includes(topic.value))
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, pages - 1);
  count.textContent = filtered.length ?
    'Найдено ' + filtered.length + ' из ' + bank.length :
    'По этим фильтрам заданий нет.';
  list.replaceChildren(...filtered.slice(page * pageSize, (page + 1) * pageSize).map(card));
  pageText.textContent = filtered.length ? (page + 1) + ' / ' + pages : '';
  previous.disabled = page === 0;
  next.disabled = page + 1 === pages;
  practice.href = practiceUrl(topic.value, '');
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
