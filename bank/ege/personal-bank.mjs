const database = 'invariant-ege-materials';
const storeName = 'banks';
const bankKey = 'personal';
const dataStart = '<script type="application/json" id="offline-data">';
const imageURL = /^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,/;

async function withBank(mode, operation) {
  const db = await new Promise((resolve, reject) => {
    const open = indexedDB.open(database, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(storeName);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const req = operation(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(req.result);
      tx.onabort = tx.onerror = () => reject(tx.error ?? req.error);
    });
  } finally { db.close(); }
}

export const readPersonalBank = () => withBank('readonly', store => store.get(bankKey));
export const removePersonalBank = () => withBank('readwrite', store => store.delete(bankKey));

export async function importPersonalBank(file) {
  if (!file || file.size > 40 * 1024 * 1024) throw new Error('Файл слишком большой или не выбран.');
  const html = await file.text();
  const start = html.indexOf(dataStart);
  const end = html.indexOf('</script>', start + dataStart.length);
  if (start < 0 || end < 0) throw new Error('Выбери полученный HTML-файл INVARIANT с полным банком ЕГЭ.');
  const data = JSON.parse(html.slice(start + dataStart.length, end));
  const inventory = data.objects?.['catalog.json'];
  const cards = {};
  if (inventory?.schemaVersion !== 1 || !Array.isArray(inventory.tasks) || !inventory.tasks.length || !data.assets) {
    throw new Error('В файле отсутствует каталог заданий.');
  }
  for (const task of inventory.tasks) {
    const match = /^ege-data\/v1\/cards\/([\w.-]+\.json)$/.exec(task.cardPath);
    const card = match && data.objects[match[1]];
    if (!/^ege-fipi-[A-Z\d]+$/.test(task.id) || task.status !== 'ready' ||
      !Array.isArray(task.kes) || !Array.isArray(task.topicSlugs) || card?.id !== task.id || !Array.isArray(card.parts)) {
      throw new Error('В файле есть неполные или неверные карточки.');
    }
    cards[task.cardPath] = card;
  }
  const assets = Object.fromEntries(Object.entries(data.assets).filter(([path, value]) =>
    /^ege-data\/v1\/assets\/[\w.-]+$/.test(path) && typeof value === 'string' && imageURL.test(value)));
  const bank = {inventory, cards, assets};
  await withBank('readwrite', store => store.put(bank, bankKey));
}

export function setupPersonalBank(connected) {
  const controls = document.querySelector('[data-personal-bank]');
  const input = controls?.querySelector('input');
  const feedback = controls?.querySelector('output');
  if (!input || !('indexedDB' in window)) return;
  controls.hidden = false;
  controls.querySelector('summary').textContent = connected ? 'Полный банк подключён' : 'Подключить полный банк';
  const remove = controls.querySelector('[data-remove-bank]');
  remove.hidden = !connected;
  input.onchange = async () => {
    if (!input.files.length) return;
    input.disabled = true;
    feedback.textContent = 'Подключаем условия и иллюстрации…';
    try {
      await importPersonalBank(input.files[0]);
      location.reload();
    } catch (error) {
      feedback.textContent = error.message || 'Файл не удалось сохранить в этом браузере.';
      input.value = '';
      input.disabled = false;
    }
  };
  remove.onclick = async () => {
    try {
      await removePersonalBank();
      location.reload();
    } catch { feedback.textContent = 'Не удалось отключить личную копию.'; }
  };
}
