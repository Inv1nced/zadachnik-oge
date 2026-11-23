import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dataRoot, exams, checkVariant, variantKey} from '../config.mjs';
import {decimal, score, validateReview} from '../grade.mjs';
import {newCode, openVariant, sealVariant} from '../crypto.mjs';

export const root = fileURLToPath(new URL('../../',import.meta.url));
const privateDir = resolve(process.env.INVARIANT_MOCKS_PRIVATE || resolve(root,'../invariant-mocks-private'));
export const readJSON = async url => JSON.parse(await readFile(url,'utf8'));
export const catalog = await readJSON(new URL('catalog.json',dataRoot));
assert.equal(catalog.schemaVersion,1);
assert.deepEqual((await readdir(dataRoot)).sort(),['catalog.json',...catalog.variants.map(meta=>meta.file)].sort());
assert.equal(new Set(catalog.variants.map(variantKey)).size,catalog.variants.length);

const measured={type:'measure',answer:'3.5±0.5',max:1};
assert.equal(score(measured,'3,5±.50','ege'),1);
assert.equal(score(measured,'3.5±','ege'),0);
assert.equal(decimal('-00,0'),'0');
assert.equal(decimal('1e2'),null);
assert.equal(decimal('1,25 м'),null);
assert.equal(score({type:'number',answer:'0'},'0','ege'),1);
assert.equal(score({type:'number',answer:'0'},'','ege'),0);
assert.equal(score({type:'number',answer:'0.67'},'0.669','ege'),0);
assert.equal(score({type:'ordered',answer:'213',max:2},'231','oge'),0);
assert.equal(score({type:'ordered',answer:'213',max:2},'233','oge'),1);
assert.equal(score({type:'ordered',answer:'213',max:2},'23','oge'),0);
for (const exam of ['oge','ege']) {
  const task={type:'set',max:2,answer:'13'};
  assert.equal(score(task,'31',exam),2);
  assert.equal(score(task,'1',exam),1);
  assert.equal(score(task,'14',exam),1);
  assert.equal(score(task,'231',exam),exam==='ege'?1:0);
  assert.equal(score(task,'111',exam),0);
}
assert.equal(score({type:'set',max:1,answer:'14'},'41','ege'),1);
assert.equal(score({type:'set',max:1,answer:'14'},'1','ege'),0);

let issuance;
try { issuance=await readJSON(resolve(privateDir,'issuance.json')); }
catch (error) { if (error.code!=='ENOENT') throw error; }
const tracked = execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:root})
  .toString().split('\0').filter(Boolean);
if (issuance) {
  const secretBytes = Object.values(issuance).map(code=>Buffer.from(code));
  for (const file of new Set(tracked)) {
    const payload = await readFile(resolve(root,file));
    if (secretBytes.some(secret=>payload.includes(secret))) throw new Error('Секрет обнаружен в дереве публикации.');
  }
}
export const variants = new Map();
export const fixtures = new Map();
const publicText = [];
const closedText = [];
for (const exam of Object.keys(exams)) {
  const [count, minutes, max] = exam==='oge'?[22,180,39]:[26,235,45];
  const rows=catalog.variants.filter(meta=>meta.exam===exam);
  assert.equal(rows.filter(meta=>!meta.archived&&meta.access==='open').length,1);
  assert(rows.some(meta=>!meta.archived&&meta.access==='code'));
  for (const meta of rows) {
    assert.deepEqual([meta.count,meta.minutes,meta.max],[count,minutes,max]);
    const payload=await readJSON(new URL(meta.file,dataRoot));
    const key=variantKey(meta);
    let v;
    if (meta.access==='code') {
      assert.deepEqual(Object.keys(payload).sort(),['alg','ciphertext','format','iv']);
      assert.equal(Buffer.from(payload.iv,'base64url').length,12);
      if (!issuance) continue;
      try { v=await openVariant(payload,meta,issuance[key]); }
      catch { throw new Error('Опубликованный контейнер не соответствует приватному реестру.'); }
      const testCode=newCode();
      const testPayload=await sealVariant(v,testCode);
      fixtures.set(key,{code:testCode,payload:testPayload});
      const damaged={...testPayload,ciphertext:(testPayload.ciphertext[0]==='A'?'B':'A')+testPayload.ciphertext.slice(1)};
      await assert.rejects(openVariant(damaged,meta,testCode),/unlock/);
      await assert.rejects(openVariant(testPayload,{...meta,version:meta.version+1},testCode),/unlock/);
      closedText.push(...v.tasks.map(task=>task.prompt));
    } else {
      v=checkVariant(payload,meta);
      publicText.push(...v.tasks.map(task=>task.prompt));
    }
    variants.set(key,v);
    assert.equal(v.tasks.filter(task=>task.type==='long').length,6);
    assert(v.tasks.some(task=>task.figure) && v.tasks.some(task=>task.table));
    assert.equal(v.tasks.reduce((sum,task)=>sum+task.max,0),meta.max);
    const blanks = {schemaVersion:1,kind:'invariant-mock-review',exam,id:meta.id,version:meta.version,attemptId:'a'.repeat(32),marks:[]};
    assert.throws(()=>validateReview(blanks,v,blanks.attemptId));
    for (const task of v.tasks.filter(task=>task.type!=='long')) {
      assert.equal(score(task,task.answer,exam),task.max,`${meta.id}, №${task.n}`);
    }
  }
}
if (issuance) {
  const uniqueClosed = closedText.filter(prompt=>!publicText.includes(prompt));
  const toCheck=tracked.filter(file=>file==='mocks.html' || file.startsWith('mocks/'));
  for (const file of new Set(toCheck)) {
    const raw=await readFile(resolve(root,file),'utf8');
    if (uniqueClosed.some(prompt=>raw.includes(JSON.stringify(prompt).slice(1,-1)))) {
      throw new Error('Условие закрытого варианта обнаружено в дереве публикации.');
    }
  }
}
console.log(`PASS: форматы, баллы и состав каталога; закрытых наборов проверено: ${fixtures.size}.`);
if (process.argv.includes('--browser')) await (await import('./verify-browser.mjs')).run({root, catalog, variants, fixtures});
