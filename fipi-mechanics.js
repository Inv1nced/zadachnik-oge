'use strict';

const index = window.OGE_FIPI;
const native = window.OGE_FIPI_NATIVE;
const params = new URLSearchParams(location.search);
const sections = [['all', 'Все разделы'], ...index.sections];
const selected = params.get('section');
const section = sections.some(([id]) => id === selected) ? selected : 'mechanics';
const groups = [...index.byGroup.values()].filter(group => section === 'all' || index.blockSection(+group.parent) === section);
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
    query.set('section', index.blockSection(+index.byGroup.get(block).parent));
    query.set('block', block);
  } else if (section !== 'all') {
    query.set('section', section);
  }
  if (taskCode) query.set('code', taskCode);
  return 'oge.html?' + query.toString();
}

for (const [id, name] of sections) {
  const link = document.createElement('a');
  link.href = id === 'mechanics' ? 'fipi-mechanics.html' : '?section=' + id;
  link.textContent = name;
  if (id === section) link.setAttribute('aria-current', 'page');
  nav.append(link);
}

topic.add(new Option('Все темы', ''));
groups.forEach(group => topic.add(new Option('Блок ' + group.id + ' · ' + group.title, group.id)));
const linked = index.locateGroup(params.get('block'),(params.get('code')||'').toUpperCase());
if (linked && groups.includes(linked)) topic.value = linked.id;
format.add(new Option('Любой', ''));
Object.entries(index.formats).filter(([id]) => bank.some(item => item.format === id))
  .forEach(([id, name]) => format.add(new Option(name, id)));
code.value = (params.get('code') || '').slice(0,32);

function card(item) {
  const card = document.createElement('li');
  const title = document.createElement('strong');
  title.textContent = item.code;
  const description = document.createElement('p');
  const group = topic.value ? index.byGroup.get(topic.value) : groups.find(group=>group.items.includes(item));
  description.textContent = 'Блок ' + group.id + ' · ' + group.title + ' · ' + index.formats[item.format];
  const links = document.createElement('div');
  links.className = 'catalog-card-links';
  const link = (href,label,external=false) => {
    const anchor=document.createElement('a');
    anchor.href=href;
    anchor.textContent=label;
    if(external){anchor.target='_blank';anchor.rel='noopener'}
    return anchor;
  };
  if(Object.hasOwn(native,item.code))links.append(link(practiceUrl(group.id,item.code),'В задачнике →'));
  links.append(link(index.officialUrl(item.code),'Оригинал ФИПИ ↗',true));
  if(item.hasMirror)links.append(link(index.mirrorUrl(item.code),'Копия условия ↗',true));
  card.append(title, description);
  card.append(links);
  return card;
}

function render() {
  const query = code.value.trim().toUpperCase();
  const filtered = bank.filter(item =>
    (!query || item.code.includes(query)) &&
    (!format.value || item.format === format.value) &&
    (!topic.value || index.byGroup.get(topic.value).items.includes(item))
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
