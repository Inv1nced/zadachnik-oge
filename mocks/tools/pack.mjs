import {mkdir, readFile, realpath, writeFile, rename, rmdir} from 'node:fs/promises';
import {dirname, resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {checkVariant, exams, variantKey} from '../config.mjs';
import {newCode, openVariant, sealVariant} from '../crypto.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = fileURLToPath(new URL('../data/', import.meta.url));
const privateDir = await realpath(resolve(process.argv[2] || resolve(root, '../invariant-mocks-private')));
const innerPath = relative(await realpath(root), privateDir);
if (!innerPath || (!innerPath.startsWith('..' + sep) && !isAbsolute(innerPath))) {
  throw new Error('Каталог закрытых исходников должен находиться за пределами дерева Pages.');
}

const {default: definitions} = await import(pathToFileURL(resolve(privateDir, 'variants.mjs')).href);

async function readOptional(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}

async function put(file, value, mode) {
  const temp = file + '.tmp';
  await mkdir(dirname(file), {recursive:true, mode:0o700});
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', {mode});
  await rename(temp, file);
}

const lockPath = resolve(privateDir, '.packing');
await mkdir(lockPath, {mode:0o700});
try {
  const registryPath = resolve(privateDir, 'registry.json');
  const catalogPath = resolve(output, 'catalog.json');
  const oldCatalog = await readOptional(catalogPath);
  const registry = await readOptional(registryPath) || {};
  const variants = [];
  const files = new Map();
  const seen = new Set();

  for (const entry of definitions) {
    const {exam, id, version, access, title, tasks, archived = false} = entry;
    assert(Object.hasOwn(exams, exam) && /^[a-z0-9-]{1,48}$/.test(id) && Number.isInteger(version) && version > 0);
    assert(['code','open'].includes(access));
    const spec = exams[exam];
    const meta = {exam,id,version,title,access,archived,count:spec.types.length,minutes:spec.minutes,
      max:spec.points.reduce((sum, value) => sum + value, 0),
      file:`${id}-v${version}${access === 'code' ? '.enc' : ''}.json`};
    const idKey = variantKey(meta);
    assert(!seen.has(idKey) && !files.has(meta.file), 'Версия или имя файла повторяется.');
    seen.add(idKey);
    const variant = checkVariant({exam,id,version,year:2027,label:`Тренировочный вариант по спецификации ${spec.label} 2027`,
      tasks:tasks.map((task,i) => ({...task,n:i+1,type:spec.types[i],max:spec.points[i]}))}, meta);
    const old = oldCatalog?.variants.find(item => variantKey(item) === idKey);
    assert(!old || old.file === meta.file, 'Изменение доступа требует новой версии.');
    const oldFile = await readOptional(resolve(output, meta.file));
    let payload = variant;
    if (access === 'code') {
      if (old && !registry[idKey]) throw new Error('Нужен исходный приватный реестр, чтобы сохранить прежний код.');
      registry[idKey] ||= {code:newCode(), payload:null};
      const record = registry[idKey];
      if (oldFile) assert(JSON.stringify(oldFile) === JSON.stringify(record.payload), 'Контейнер расходится с реестром.');
      record.payload ||= await sealVariant(variant, record.code);
      try {
        const decoded = await openVariant(record.payload, meta, record.code);
        if (JSON.stringify(decoded) !== JSON.stringify(variant)) throw new Error();
      } catch {
        throw new Error(`Проверка закрытого варианта ${idKey} не пройдена. Для изменения выпустите новую версию.`);
      }
      payload = record.payload;
    } else if (oldFile && JSON.stringify(oldFile) !== JSON.stringify(payload)) {
      throw new Error(`Открытый вариант ${idKey} изменён. Для правок выпустите новую версию.`);
    }
    variants.push(meta);
    files.set(meta.file, payload);
  }
  assert(oldCatalog?.variants.every(item => seen.has(variantKey(item))) ?? true, 'Сохраните ранее выданные версии в каталоге как архивные.');
  assert(variants.filter(item => !item.archived && item.access === 'open').length === 2);
  for (const exam of Object.keys(exams)) {
    assert(variants.some(item => item.exam === exam && !item.archived && item.access === 'open'));
    assert(variants.some(item => item.exam === exam && !item.archived && item.access === 'code'));
  }

  await put(registryPath, registry, 0o600);
  await put(resolve(privateDir, 'issuance.json'), Object.fromEntries(Object.entries(registry).map(([k,v]) => [k,v.code])), 0o600);
  for (const [file, payload] of files) await put(resolve(output, file), payload);
  await put(catalogPath, {schemaVersion:1,variants}, 0o644);
  console.log(`Проверено и упаковано вариантов: ${variants.length}.`);
} finally {
  await rmdir(lockPath);
}
