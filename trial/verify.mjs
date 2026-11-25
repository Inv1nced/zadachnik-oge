import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {grade} from './grade.js';
import {carExam} from './graphics.js';
import {motion, route, fall, incline, staticContact, circuit} from './physics.js';
import {createModel} from './models.js';

const require = createRequire(import.meta.url);
globalThis.OgeCore = require('../learning-core.js');
const banks = {};
const close = (value, target) => assert.ok(Math.abs(value-target) < 1e-8, `${value} ≠ ${target}`);
for (const [branch, count] of [['ege',24],['school',25]]) {
  const bank = JSON.parse(await readFile(new URL(`./${branch}.json`,import.meta.url),'utf8'));
  banks[branch] = bank;
  assert.equal(bank.tasks.length,count);
  assert.equal(new Set(bank.tasks.map(task=>task.id)).size,count);
  for (const section of bank.sections) {
    for (const id of [section.support,section.extension,...section.route].filter(Boolean)) {
      assert.ok(bank.tasks.some(task => id===task.id && task.section===section.id),id);
    }
  }
  for (const task of bank.tasks) {
    assert.ok(task.prompt && task.steps.length && task.hints.length && task.answer,task.id);
    const values = task.kind==='numeric' ? task.fields.map(field=>String(field.value).replace('.',',')) : [...(task.key ?? '')];
    assert.equal(grade(task,values),task.kind==='oral'?'oral':'correct',task.id);
    if (task.kind!=='oral') assert.equal(grade(task,[]),'blank',task.id);
    if (task.model) {
      const model=createModel(task);
      assert.ok(model,task.id);
      const end=model.duration(model.defaults);
      for (const t of [0,end/2,end]) {
        const frame=model.frame(t,model.defaults,end);
        assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(frame)),`${task.id} at ${t}`);
      }
    }
  }
}
const number = fields => ({kind:'numeric',fields});
assert.equal(grade(number([{value:-3}]),['−3.0']),'correct');
assert.equal(grade(number([{value:-3}]),['3']),'wrong');
assert.equal(grade(number([{value:2}]),['2 м']),'format');
assert.equal(grade(number([{value:10.95445,decimals:1}]),['11,0']),'correct');
assert.equal(grade(number([{value:10.95445,absoluteTolerance:.06}]),['11']),'correct');
assert.equal(grade(number([{value:10.95445,absoluteTolerance:.06}]),['11.1']),'wrong');
assert.equal(grade({kind:'ordered',key:'31'},['1','3']),'wrong');
assert.equal(grade({kind:'choice',key:'235'},['5','2','3']),'correct');

assert.deepEqual(carExam(0),[10,0,4]);
assert.deepEqual(carExam(6),[42,0,-4]);
assert.deepEqual(carExam(8),[34,-8,-4]);
close(carExam(8)[0] - carExam(0)[0],24);
close((42-10+42-34)/8,5);
assert.deepEqual(motion(4,0,6,-2),{x:8,v:-2,a:-2});
const routeTask=banks.school.tasks.find(task=>task.id==='KIN-01');
assert.deepEqual(route(20,routeTask.params.segments),{x:40,distance:200,displacement:40});
close(fall(2,20,10,0).speed,20);
close(fall(2,20,10,15).speed,25);
close(fall(2,20,10,15).x,30);
close(fall(3,45,10,14).x,42);
assert.deepEqual(staticContact({m:2,g:10,fx:6.5,fy:8,mus:.4,muk:.25}),{normal:12,friction:3,a:1.75});
assert.deepEqual(staticContact({m:2,g:10,fx:6.5,fy:-8,mus:.4,muk:.25}),{normal:28,friction:6.5,a:0});
const slope=banks.school.tasks.find(task=>task.id==='ENE-05').params;
for (const t of [0,1,2,slope.endTime]) {
  const energy=incline(t,slope);
  close(energy.ep+energy.ek+energy.thermal,energy.total);
}
close(incline(slope.endTime,slope).thermal,40);
close(incline(slope.endTime,slope).v,Math.sqrt(60));
const branch={U:18,r:3,Rseries:6,Rbranch1:6,Rbranch2:6,branchSwitch:true};
close(circuit({...branch,closed:false}).current,1.2);
close(circuit({...branch,closed:true}).i2,.75);
const parallel=circuit({U:12,Rseries:3,Rbranch1:6,Rbranch2:3,closed:true});
close(parallel.current,2.4);
close(parallel.i1+parallel.i2,parallel.current);
console.log('PASS: 49 карточек, маршруты, правила проверки, физические контрольные точки и все модели.');

const base=process.argv[2];
if (!base) process.exit(0);
const {chromium}=require(process.env.TRIAL_PLAYWRIGHT || 'playwright-core');
const browser=await chromium.launch({executablePath:process.env.OGE_CHROME});
try {
  const context=await browser.newContext({viewport:{width:1470,height:956},permissions:['clipboard-read','clipboard-write']});
  const origin=new URL(base).origin;
  await context.route('**/*', request => new URL(request.request().url()).origin===origin ? request.continue() : request.abort());
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400 && response.url().startsWith(origin) && !response.url().endsWith('/favicon.ico')) errors.push(response.url()+': '+response.status());});
  const button=name=>page.getByRole('button',{name,exact:true});
  const choose=id=>page.locator(`[data-task="${id}"]`).click();
  const topic=id=>page.locator(`[data-section="${id}"]`).click();
  const heading=()=>page.locator('#current h1').innerText();
  const readTime=()=>page.locator('#model-time').inputValue();
  const testPlayer=async () => {
    await button('Показать интерактив').click();
    await button('Пуск').click();
    await page.waitForFunction(()=>Number(document.querySelector('#model-time').value)>.05);
    await button('Пауза').click();
    const value=await readTime();
    await page.waitForTimeout(100);
    assert.equal(await readTime(),value);
    await button('Сброс').click();
    assert.equal(await readTime(),'0');
    await button('Скрыть интерактив').click();
  };
  await page.goto(base);
  await page.getByRole('button',{name:/ЕГЭ 11 класс/}).click();
  assert.equal(await heading(),'Робот между стеллажами');
  assert.equal(await page.locator('#solution-answer').innerText(),'');
  await button('Проверить').click();
  assert.match(await page.locator('.answer-status').innerText(),/Заполните/);
  await page.getByRole('textbox',{name:'Ответ, м/с'}).fill('3');
  await button('Проверить').click();
  assert.equal(await page.locator('#solution-answer').innerText(),'');
  await page.getByRole('textbox',{name:'Ответ, м/с'}).fill('−3,0');
  await button('Проверить').click();
  assert.match(await page.locator('#solution-answer').innerText(),/-3/);
  await button('Подсказка').click();
  await button('Начать решение').click();
  assert.equal(await page.locator('#hints li').count(),1);
  assert.equal(await page.locator('#steps li').count(),1);
  await button('Открыть на доске').click();
  assert.match(await page.locator('#bdTb').innerText(),/Робот/);
  assert.equal(await page.locator('#bdTb img').count(),1);
  const canvas=await page.locator('#bdCv').boundingBox();
  await page.mouse.move(canvas.x+canvas.width*.7,canvas.y+canvas.height*.5);
  await page.mouse.down();
  await page.mouse.move(canvas.x+canvas.width*.8,canvas.y+canvas.height*.6);
  await page.mouse.up();
  assert.ok(await page.evaluate(()=>BD._S().objs.some(obj=>obj.t==='pen')));
  await button('Закрыть доску').click();
  await button('Следующая').click();
  await button('Пропустить').click();
  await choose('KIN-03');
  for (const option of ['2','3','5']) await page.locator(`[name=choices][value="${option}"]`).check();
  await button('Проверить').click();
  assert.equal(await page.locator('.answer-status').innerText(),'Верно.');
  await testPlayer();
  await choose('KIN-05');
  await testPlayer();
  for (const id of ['DYN','CON','ELC']) await topic(id);
  await choose('ELC-05');
  await testPlayer();
  await button('На весь экран').click();
  assert.equal(await page.locator('.rail').isVisible(),false);
  await button('Открыть на доске').click();
  await button('Закрыть доску').click();
  await button('Выйти из полного экрана').click();

  await button('10 класс').click();
  await page.getByRole('heading',{name:'Одинаковая высота, разные спуски'}).waitFor();
  assert.equal(await heading(),'Одинаковая высота, разные спуски');
  await button('Отметить разобранной').click();
  await choose('ENE-03');
  await testPlayer();
  const numbers=page.locator('input[name=answer]');
  await numbers.nth(0).fill('15');
  await numbers.nth(1).fill('15');
  await numbers.nth(2).fill('11,0');
  await button('Проверить').click();
  assert.equal(await page.locator('.answer-status').innerText(),'Верно.');
  await topic('kinematics');
  await testPlayer();
  await page.locator('#level').selectOption('basic');
  assert.match(await heading(),/Движение автомобиля/);
  await topic('newton');
  await choose('NEW-05');
  await testPlayer();
  await topic('thermal');
  await choose('THM-04');
  await testPlayer();
  await topic('electricity');
  await choose('ELE-05');
  await testPlayer();
  await button('План занятия').click();
  await page.getByRole('checkbox',{name:'Электричество',exact:false}).first().check();
  const [editor]=await Promise.all([page.waitForEvent('popup'),button('Открыть отчёт для родителя').click()]);
  await editor.getByRole('textbox',{name:'Что получилось'}).fill('Сравнили ток в двух ветвях.');
  await editor.getByRole('button',{name:'Скопировать отчёт'}).click();
  await editor.getByText('Отчёт скопирован.',{exact:true}).waitFor();
  const [download]=await Promise.all([editor.waitForEvent('download'),editor.getByRole('button',{name:'Скачать .txt'}).click()]);
  assert.match(await readFile(await download.path(),'utf8'),/Сравнили ток в двух ветвях/);
  await editor.close();
  await button('Вернуться к задачам').click();
  await page.locator('#workspace').waitFor();
  await page.setViewportSize({width:390,height:844});
  await page.locator('#section-select').selectOption('kinematics');
  await page.locator('#task-select').selectOption('KIN-02');
  await testPlayer();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS: Chromium 1470×956 и 390×844, оба сценария, доска, полный экран, плееры, отчёт и загрузка без внешних запросов.');
} finally {
  await browser.close();
}
