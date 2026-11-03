const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),core=require('../learning-core.js');
const row=(answer,type='b',catalog=0)=>[1,catalog,'1',type,answer,'A','test'];
assert.equal(core.correct(row('5'),'5'),true);
assert.equal(core.correct(row('5'),'5abc'),false);
assert.equal(core.correct(row('5'),'5/2'),false);
assert.equal(core.correct(row('0.4'),'0,4'),true);
assert.equal(core.correct(row('-2'),'−2'),true);
assert.equal(core.correct(row('5'),'5 м'),false);
assert.equal(core.correct(row('24','m',10112),'42'),true);
assert.equal(core.correct(row('24','m',10112),'24abc'),false);
assert.equal(core.correct(row('24','m',1000),'42'),false);
assert.equal(core.correct(row('','e'),'55'),null);
assert.equal(core.correct(row('рассуждение','q'),'ответ'),null);
assert.deepEqual(core.summary([[1,'5',1],[2,'4',0],[3,'text',null]]),{correct:1,automatic:2,pending:1});
const snapshot=core.snapshotRow([12,34,'7','b','5','F','Condition'],'Блок 7 · №10');assert.deepEqual(snapshot[7],[]);assert.equal(snapshot[8].label,'Блок 7 · №10');
const c={window:{},btoa:s=>Buffer.from(s,'binary').toString('base64'),unescape,encodeURIComponent};vm.createContext(c);
const privateRoot=process.env.OGE_PRIVATE_SOURCE||'../site-private-source';
const sourcePath=require('node:path');
assert.ok(!fs.readFileSync('teach.html','utf8').includes('teacher-view'),'Locked page must not contain classroom UI');
assert.ok(!fs.existsSync('teach.js')&&!fs.existsSync('practice-data.js')&&!fs.existsSync('tutor-plan/plan-data.js'),'Private source must not be published');
for(const f of ['teacher-workspace.enc.json','tutor-plan/teacher-plan.enc.json']){const enc=JSON.parse(fs.readFileSync(f,'utf8'));assert.equal(enc.algorithm,'AES-GCM');assert.equal(enc.iterations,200000);assert.equal(Buffer.from(enc.iv,'base64').length,12);assert.ok(!enc.body&&!enc.scripts);}
if(!fs.existsSync(sourcePath.join(privateRoot,'tutor-plan/plan-data.js'))){console.log('PASS: public privacy and answer checks; private curriculum source unavailable, curriculum tests skipped.');process.exit(0);}
vm.runInContext(fs.readFileSync(sourcePath.join(privateRoot,'tutor-plan/plan-data.js'),'utf8'),c);
vm.runInContext(fs.readFileSync(sourcePath.join(privateRoot,'practice-data.js'),'utf8'),c);
assert.equal(c.window.PLAN.lessons.length,56);
const all=new Map();for(const l of c.window.PLAN.lessons){const rows=c.window.PRACTICE[l.id];assert.ok(rows.length>=10,`Lesson ${l.id}: ${rows.length} tasks`);assert.equal(rows.filter(r=>r[8]?.graph&&r[8]?.lesson===l.id).length,2);for(const r of rows){assert.ok(Number.isSafeInteger(r[0])&&r[0]<=-100000);assert.ok(r[6].length>15);assert.ok(r[8].solution.length>10);assert.ok(r[8].label);if(r[3]==='b'){assert.ok(core.numeric(r[4]),`${l.id} ${r[6]}`);assert.equal(core.correct(r,r[4]),true)}const prev=all.get(r[0]);if(prev)assert.equal(JSON.stringify(prev),JSON.stringify(r),'Conflicting stable IDs');all.set(r[0],r)}}
for(const [id,rows]of Object.entries(c.window.PRACTICE)){for(const r of rows.filter(r=>r[8]?.graph)){assert.ok(Number(r[4])>=0);const text=r[6],m=text.match(/до \((\d+) с; (-?\d+) м\/с\)/),v0=Number(text.match(/\(0 с; (\d+) м\/с\)/)[1]),T=Number(m[1]),v1=Number(m[2]);const expected=v0*v1>=0?(v0+v1)*T/2:(v0*v0+v1*v1)*T/(2*(v0-v1));assert.equal(Number(r[4]),expected,'Path must sum absolute triangle areas')}}
for(const file of ['teach.js','practice-data.js','tutor-plan/app.js'])new vm.Script(fs.readFileSync(sourcePath.join(privateRoot,file),'utf8'),{filename:file});
// Syntax for every inline script, including encrypted-bank entry points.
for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(file,'utf8');for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){if(m[1].trim())new vm.Script(m[1],{filename:file})}}
console.log(`PASS: strict numeric validation, manual pending status, 56 lessons, ${all.size} unique author tasks, graph areas and inline JavaScript syntax.`);
