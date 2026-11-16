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
assert.equal(core.correct(row('14','m',1000),'1, 4'),true);
assert.equal(core.correct(row('14','m',1000),'1.4'),false);
assert.deepEqual(core.summary([[1,'',null],[2,'фото',null]]),{correct:0,automatic:0,pending:1});
const codes=require('../assignment-code.js');
const review=require('../teacher-review.js');
const id='example-assignment';
const raw=codes.encode('RES-',{v:3,h:id,r:[['1','5',0],['2','',1]]});
const submission=codes.result(raw);
const teacherStudent={id:'second',results:[],assignments:[{id,ids:[1,2]}]};
assert.equal(review.locate([{id:'first',results:[],assignments:[]},teacherStudent],submission).student.id,'second');
assert.deepEqual(review.counts(review.grade(submission,new Map([[1,row('5')],[2,row('6')]]))),{correct:1,errors:0,pending:0,empty:1,unknown:0});
assert.throws(()=>review.locate([teacherStudent],{...submission,ids:[2,1]}),/выданной версии/);
assert.throws(()=>codes.result(codes.encode('RES-',{r:[['1','5'],['1','6']]})),/разных заданий/);
const snapshot=core.snapshotRow([12,34,'7','b','5','F','Condition'],'Блок 7 · №10');assert.deepEqual(snapshot[7],[]);assert.equal(snapshot[8].label,'Блок 7 · №10');
const c={window:{},btoa:s=>Buffer.from(s,'binary').toString('base64'),unescape,encodeURIComponent};vm.createContext(c);
for(const file of ['bank/extra-physics.js','bank/fipi-tasks.js','bank/fipi-index.js','bank/fipi-native.js','fipi-mechanics-data.js']){
 vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
}
const {OGE_FIPI:fipi,OGE_FIPI_TASKS:fipiRows,OGE_FIPI_NATIVE:native,OGE_FIPI_MECHANICS:oldMechanics}=c.window;
assert.equal(fipi.byCode.size,fipiRows.length,'Repeated FIPI code');
assert.ok(fipi.byCode.size>=1506,'Missing FIPI assignments');
const assignedCodes=new Set([...fipi.byBlock.values()].flatMap(items=>items.map(item=>item.code)));
assert.equal(assignedCodes.size,fipi.byCode.size,'Some FIPI assignments are missing from the blocks');
assert.ok(oldMechanics.every(([code])=>fipi.byCode.has(code.toUpperCase())),'Lost FIPI mechanics reference');
for(let block=24;block<=39;block++)assert.ok(fipi.byBlock.get(String(block)).length>=12,`Underfilled FIPI block ${block}`);
const visibleFipiCodes=new Set();
for(const group of fipi.byGroup.values()){
 assert.ok(group.items.length>=10&&group.items.length<=50,`FIPI block ${group.id} has ${group.items.length} assignments`);
 assert.equal(new Set(group.items).size,group.items.length,`Repeated assignment within ${group.id}`);
 group.items.forEach(item=>visibleFipiCodes.add(item.code));
}
assert.equal(visibleFipiCodes.size,fipi.byCode.size,'Lost assignment when splitting or merging blocks');
const heatGroups=fipi.byParent.get('26');
assert.equal(heatGroups.reduce((total,group)=>total+group.items.length,0),133);
assert.ok(fipi.locateGroup('17').items.some(item=>item.blocks.includes('17')),'Old block 17 does not resolve to its assignments');
assert.ok(fipi.locateGroup('46').items.some(item=>item.blocks.includes('46')),'Old block 46 does not resolve to its assignments');
console.log(`PASS: ${fipi.byCode.size} distinct FIPI tasks, ${fipi.byGroup.size} blocks of 10–50 tasks.`);
const nativeCounts=new Map();
for(const [code,task] of Object.entries(native)){
 assert.ok(fipi.byCode.get(code)?.blocks.includes(task.block),`FIPI task ${code} has the wrong topic`);
 assert.ok(task.condition.length>35 && !/<iframe|https:\/\//i.test(task.condition),`Task ${code} needs a local condition`);
 if(['b','m'].includes(task.type))assert.ok(core.numeric(task.answer),`Invalid key for task ${code}`);
 assert.equal((task.condition.match(/\[рисунок\]/g)||[]).length,task.images.length,`Missing figure for ${code}`);
 for(const image of task.images){
  assert.match(image,/^bank\/figures\/[a-z-]+\.svg$/);
  assert.ok(fs.existsSync(image),`Missing local image ${image}`);
 }
 const block=({'35':'34','40':'41'})[task.block]||task.block;
 nativeCounts.set(block,(nativeCounts.get(block)||0)+1);
}
assert.ok(nativeCounts.size>=16);
for(const [block,count] of nativeCounts)assert.ok(count>=10&&count<=50,`Native block ${block} has ${count} tasks`);
assert.equal(Number(native['325B62'].answer),8000/400/10);
assert.equal(Number(native['AFFC36'].answer),0.2*2300000/1000);
assert.ok(Math.abs(Number(native['1D15CF'].answer)-3.6e-15/1.6e-19/1000)<1e-8);
assert.equal(Number(native['8CEE80'].answer),9/4);
assert.equal(Number(native['5FF3B9'].answer),900000/(3*60*5**2));
assert.equal(Number(native['D27B09'].answer),90-150/2);
assert.equal(Number(native['EF05FF'].answer),224-2*4);
assert.equal(Number(native['579C59'].answer),235+1-141-92);
assert.equal(native['7C16CA'].answer,'32');
assert.equal(native['F74FFB'].answer,'52 °C');
assert.equal(native['485DFD'].answer,'12,5 Вт');
assert.equal(native['6E8FB0'].answer,'2475');
console.log(`PASS: ${Object.keys(native).length} full FIPI cards in ${nativeCounts.size} blocks on local data.`);
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
