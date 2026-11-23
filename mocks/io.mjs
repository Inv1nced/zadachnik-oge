export function element(tag, text, attrs = {}) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

export function button(text, action, variant = 'primary') {
  const node = element('button', text, {type:'button', class:`mock-button ${variant}`});
  node.addEventListener('click', action);
  return node;
}

export function downloadJSON(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
  const link = element('a', null, {href:url, download:filename});
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readFile(file) {
  if (!file || file.size > 300_000) throw new Error('file');
  return JSON.parse(await file.text());
}
