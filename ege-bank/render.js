const HTML = new Set('p div span br hr strong b i em u s sub sup ul ol li table thead tbody tfoot tr th td caption blockquote center'.split(' '));
const MATH = new Set('math mrow mi mn mo mtext mfrac msqrt mroot msup msub msubsup munder mover munderover mmultiscripts mprescripts none mstyle semantics mspace mfenced mtable mtr mtd menclose mphantom mpadded merror ms'.split(' '));
const MATH_ATTRS = new Set('display displaystyle stretchy fence separator accent accentunder mathvariant linethickness notation width height depth lspace rspace open close separators rowalign columnalign columnspacing rowspacing columnspan rowspan scriptlevel'.split(' '));
const root = new URL('../', import.meta.url);

export const answerTypes = {
  short: 'Краткий ответ', multiple: 'Выбор нескольких', single: 'Один вариант',
  matching: 'Соответствие', extended: 'Развёрнутый ответ', unknown: 'Тип уточняется',
};

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function sitePath(path) {
  if (typeof path !== 'string' || path.split('/').some(part => part === '.' || part === '..') || !/^ege-data\/v1\/(?:[\w-]+\/)*[\w.-]+$/.test(path)) {
    throw new Error('Неверный путь к материалу');
  }
  return new URL(path, root);
}

export function officialLink(url) {
  const link = new URL(url);
  if (link.protocol !== 'https:' || link.host !== 'ege.fipi.ru') throw new Error('Неверный адрес ФИПИ');
  return link.href;
}

function image(part, onFailure, options) {
  const src = options.imageSource ? options.imageSource(part.path) : sitePath(part.path);
  const link = el('a', 'figure-link');
  link.href = src;
  link.target = '_blank';
  link.rel = 'noopener';
  link.title = 'Открыть в полном размере';
  const img = el('img');
  img.alt = part.alt || 'Иллюстрация из условия';
  img.src = src;
  img.addEventListener('error', () => {
    link.replaceWith(el('span', 'notice', 'Иллюстрация не загрузилась.'));
    onFailure();
  }, {once: true});
  if (options.enlarge) link.addEventListener('click', event => {
    event.preventDefault();
    options.enlarge(img);
  });
  link.append(img);
  return link;
}

export function renderParts(parts, onFailure = () => {}, options = {}) {
  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    if (part.type === 'text') {
      fragment.append(document.createTextNode(part.text));
    } else if (part.type === 'image') {
      fragment.append(image(part, onFailure, options));
    } else if (part.type === 'options') {
      const list = el('ol', 'options');
      for (const item of part.items) {
        const li = el('li');
        li.append(renderParts(item, onFailure, options));
        list.append(li);
      }
      fragment.append(list);
    } else if (part.type === 'prompt') {
      fragment.append(renderParts(part.children, onFailure, options));
    } else if (part.type === 'math' && MATH.has(part.tag)) {
      const node = document.createElementNS('http://www.w3.org/1998/Math/MathML', part.tag);
      for (const [name, value] of Object.entries(part.attrs || {})) {
        if (MATH_ATTRS.has(name)) node.setAttribute(name, value);
      }
      node.append(renderParts(part.children, onFailure, options));
      fragment.append(node);
    } else if (part.type === 'element' && HTML.has(part.tag)) {
      const node = el(part.tag);
      for (const [name, value] of Object.entries(part.attrs || {})) {
        if (['rowspan', 'colspan', 'start', 'value'].includes(name) && /^\d{1,3}$/.test(value)) node.setAttribute(name, value);
      }
      node.append(renderParts(part.children, onFailure, options));
      if (part.tag === 'table') {
        if (part.attrs?.grid) node.className = 'data-table';
        const wrap = el('div', 'table-scroll');
        wrap.tabIndex = 0;
        wrap.setAttribute('role', 'region');
        wrap.setAttribute('aria-label', 'Таблица из условия');
        wrap.append(node);
        fragment.append(wrap);
      } else {
        fragment.append(node);
      }
    } else {
      throw new Error('Неизвестный элемент карточки');
    }
  }
  return fragment;
}
