// Generates only protected pack input. Never place the output inside the Pages repository.
import {readFile, realpath, writeFile} from 'node:fs/promises';
import {resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
const cabinet = await realpath(resolve(process.argv[2] || resolve(root, '../invariant-lessons-private')));
const workspace = await realpath(resolve(root,'..'));
const issuance = await realpath(resolve(process.argv[3] || resolve(root,'../invariant-mocks-private/issuance.json')));

function outside(child,parent) {
  const path=relative(parent,child);
  return path.startsWith('..'+sep) || isAbsolute(path);
}
if (!outside(cabinet,root) || !outside(issuance,root)) throw new Error('Приватные файлы должны быть за пределами Pages.');
// Avoid writing to a sibling Git checkout or below one.
for (let dir=cabinet;;dir=resolve(dir,'..')) {
  try { await realpath(resolve(dir,'.git')); throw new Error('Папка входа находится внутри Git.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (dir===workspace || dir===resolve(dir,'..')) break;
}
const codes=JSON.parse(await readFile(issuance,'utf8'));
if (!codes || Array.isArray(codes) || !Object.entries(codes).length || Object.entries(codes).some(([key,code])=>
  !/^(?:ege|oge)\/[a-z0-9-]{1,48}\/\d+$/.test(key) || !/^IM1-[A-Za-z0-9_-]{22}$/.test(code))) throw new Error('Формат реестра выдачи.');
const boot=`(() => {
  const anchor = document.querySelector('[data-mock-tools]');
  if (!anchor) return;
  import('./mocks/teacher.mjs').then(({mountTeacherMocks}) => mountTeacherMocks(anchor, ${JSON.stringify(codes)}))
    .catch(() => { anchor.textContent = 'Инструменты пробников не загрузились. Обновите страницу.'; });
})();\n`;
await writeFile(resolve(cabinet,'mocks-entry.js'),boot,{mode:0o600});
console.log('В закрытых исходниках подготовлен вход модуля пробников.');
