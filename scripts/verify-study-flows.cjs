/* Browser regression checks. Run with playwright-core installed and Chromium available. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const crypto = require('node:crypto');
const {encode}=require('../assignment-code.js');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');
const prefix = '/zadachnik-oge/';
const mime = {'.js':'application/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server = http.createServer((request,response)=>{
  const route = new URL(request.url,'http://localhost').pathname;
  const file = path.resolve(root,route.slice(prefix.length) || 'index.html');
  if (!route.startsWith(prefix) || !file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end();return;
  }
  response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});
const waitForForm = page => page.locator('#fin2').waitFor();
const target = (page,n) => page.locator('.study-questions .q').nth(n-1);
const studentName = 'Ученик для проверки';
const errors = [];

async function openPreset(page, landing, quiz, written) {
  await page.goto(landing);
  await page.locator('a[href*="#set="]').first().click();
  await waitForForm(page);
  assert.equal(await page.locator('.study-questions .q input').count(),quiz);
  assert.equal(await page.locator('.study-questions .q textarea').count(),written);
}

async function checkStartupLoader(browser,base) {
  const context=await browser.newContext({baseURL:base,viewport:{width:390,height:844}});
  try {
    const page=await context.newPage();
    await page.route('**/bank/intro.js*',async route=>{
      await new Promise(resolve=>setTimeout(resolve,550));
      await route.continue();
    });
    await page.goto('index.html',{waitUntil:'commit'});
    const overlay=page.locator('.physics-lab-overlay');
    await overlay.waitFor();
    assert.equal(await overlay.getByRole('img',{name:'Physics Lab.'}).count(),1);
    assert.equal(await overlay.locator('.physics-lab-progress span').count(),12);
    assert.equal(await overlay.locator('.physics-lab-orbits').evaluate(node=>getComputedStyle(node).animationName),'physics-lab-orbit');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await overlay.locator('.physics-lab-orbits').evaluate(node=>getComputedStyle(node).animationName),'none');
    await overlay.waitFor({state:'detached'});
    await page.locator('.bank-title, #bank-topics').first().waitFor();
    await page.goto('index.html?workspace=1');
    assert.equal(await overlay.count(),0);
  }finally{await context.close()}
}
async function checkPublic(browser, base) {
  const context = await browser.newContext({baseURL:base,viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page = await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  const requested = [];
  page.on('request',request=>requested.push(request.url()));
  await page.goto('index.html');
  await page.locator('#freeBd').waitFor();
  assert.equal(await page.locator('#mods .mod').count(),5);
  assert.ok(!requested.some(url=>/bank\/\w+\.json|task-board\.js/.test(url)));
  await page.locator('#frog-nav-toggle').click();
  assert.ok(await page.locator('.frog-bubble').isVisible());
  await page.locator('.frog-close').click();
  assert.ok(!(await page.locator('.frog-bubble').isVisible()));

  // Tasks must work even when the source websites are unavailable.
  await context.route(/https:\/\/(ege-fipi\.ru|oge\.fipi\.ru)\//, route=>route.abort());
  for (const [section,block] of [['heat','24'],['electricity','29'],['optics','34'],['quantum','37'],['methods','47']]) {
    await page.locator(`#bank-topics [data-section="${section}"]`).click();
    const lesson=page.locator(`details[data-fipi-block="${block}"]`);
    await lesson.locator('summary').click();
    await lesson.locator('.task').first().waitFor();
    const size=await lesson.locator('.task').count();
    assert.ok(size>=10&&size<=50);
    assert.ok((await lesson.locator('.task .tt').first().textContent()).length>30);
    assert.equal(await lesson.locator('iframe').count(),0);
  }
  await page.goto('index.html?block=24&code=6E8FB0');
  const thermal=page.locator('[data-fipi-block="24"]');
  const task=thermal.locator('[data-fipi-code="6E8FB0"]');
  await task.waitFor();
  assert.match(await task.locator('.tn').innerText(),/Блок 24 · №/);
  assert.match(await task.locator('.tt').innerText(),/Колбу с жидкостью/);
  const image=task.locator('img.fig');
  await image.evaluate(el=>el.decode());
  assert.ok(await image.evaluate(el=>el.naturalWidth>0));
  await task.locator('input').fill('1234');
  await task.locator('[data-act="check"]').click();
  assert.match(await task.locator('.vslot').innerText(),/пока нет/);
  await task.locator('input').fill('2475');
  await task.locator('input').press('Enter');
  assert.match(await task.locator('.vslot').innerText(),/верно/);
  assert.match(await thermal.locator('.lmt').innerText(),/^1 \/ 12$/);
  await task.locator('[data-act="show"]').click();
  assert.match(await task.locator('.vslot').innerText(),/2475/);
  await task.locator('[data-act="board"]').click();
  await page.locator('#bd').waitFor();
  assert.match(await page.locator('#bdTn').textContent(),/Блок 24 · задача/);
  assert.match(await page.locator('#bdTb').innerText(),/Колбу с жидкостью/);
  assert.equal(await page.locator('#bdTb img.fig').count(),1);
  assert.equal(await page.locator('#bdTb iframe').count(),0);
  await page.locator('#bdClose').click();
  await page.reload();
  await task.waitFor();
  assert.ok(await task.evaluate(el=>el.classList.contains('ok')));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));

  await page.goto('index.html?block=26.4&code=515CFE');
  assert.equal(await page.locator('[data-fipi-block="26"] [data-fipi-code="515CFE"]').count(),1);
  await page.goto('index.html?section=optics&block=36&source=practice');
  const lens=page.locator('details[data-l="36"]');
  assert.ok(await lens.evaluate(details=>details.open));
  const lensTask=lens.locator('.task').first();
  await lensTask.locator('input').fill('4');
  await lensTask.locator('[data-act="check"]').click();
  assert.match(await lensTask.locator('.vslot').innerText(),/верно/);
  await lens.locator('.block-reference a').click();
  await page.locator('#topic option[value="36"]').waitFor({state:'attached'});
  await page.locator('#code').fill('df7cda');
  await page.getByRole('link',{name:'В задачнике →'}).click();
  const experiment=page.locator('[data-fipi-block="36"] [data-fipi-code="DF7CDA"]');
  await experiment.waitFor();
  assert.match(await experiment.locator('.tt').innerText(),/7,5 см/);
  assert.equal(await experiment.locator('input').count(),0);
  await page.goto('index.html?block=42');
  const reading=page.locator('[data-fipi-block="42"] .task').first();
  await reading.waitFor();
  assert.match(await reading.locator('.tt').innerText(),/Горная станция/);
  await reading.locator('img').evaluate(image=>image.decode());
  await page.goto('index.html?block=40');
  assert.ok(await page.locator('[data-fipi-block="40"] .task').count()>=12);
  await page.goto('index.html?block=33&code=EFC1F6');
  assert.equal(await page.locator('[data-fipi-block="35"] [data-fipi-code="EFC1F6"]').count(),1);
  await page.locator('#bank-topics [data-section="mechanics"]').click();

  await openPreset(page,'homework-friction.html',8,2);
  await openPreset(page,'dynamics-homework.html',8,2);
  const dynamicCode = await page.evaluate(()=>runs.hw.hw);
  await page.goto(`index.html#hw=${dynamicCode}`);
  await page.locator('#study-name').waitFor();
  assert.equal(await page.locator('.study-questions .q').count(),10);
  await openPreset(page,'ratio-trainer.html',10,0);
  await openPreset(page,'impulse-homework.html',10,2);

  const second = await context.newPage();
  await second.goto(page.url());await waitForForm(second);
  await target(page,1).locator('input').fill('2');
  await target(second,2).locator('input').fill('6000');
  await page.reload();await waitForForm(page);
  assert.equal(await target(page,1).locator('input').inputValue(),'2');
  assert.equal(await target(page,2).locator('input').inputValue(),'6000');
  await second.close();

  await page.locator('[data-v="test"]').click();
  await page.locator('#go').click();
  await target(page,1).locator('input').fill('123');
  await page.locator('[data-v="hw"]').click();
  assert.equal(await target(page,2).locator('input').inputValue(),'6000');
  await page.locator('[data-v="test"]').click();
  assert.equal(await target(page,1).locator('input').inputValue(),'123');
  assert.notEqual(await page.locator('#timer').innerText(),'∞');
  await page.locator('[data-v="hw"]').click();
  await page.locator('#fin').click();
  assert.ok(await page.locator('#submit-top').isVisible());
  assert.match(await page.locator('#submit-top').innerText(),/3, 4/);
  await page.locator('#fin').click();
  assert.match(await page.locator('#msg').inputValue(),/Автопроверка: 2\/10.*На проверке у преподавателя: 0/);
  const impulseMessage = await page.locator('#msg').inputValue();
  await page.reload();
  assert.equal(await page.locator('#msg').inputValue(),impulseMessage);

  for (const board of ['gravity-board.html','dynamics-lesson.html']) {
    await page.goto(board);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  }
  await page.goto('grafiki.html');
  const fieldWasRendered = await page.evaluate(()=>{
    for (let i=0;i<100;i++) {
      G.q=genQuestion();
      document.querySelector('[data-v="guess"]').click();
      if (document.querySelector('#qin')) {
        document.querySelector('[data-v="build"]').click();return true;
      }
    }
    return false;
  });
  assert.ok(fieldWasRendered);
  await page.locator('h1').first().waitFor();
  await page.goto('test-1-5.html');
  await page.locator('#t1 input').fill('20абв');
  await page.locator('#finish').click();
  await page.locator('#finish').click();
  assert.match(await page.locator('#t1 .verdict').innerText(),/^неверно/);
  assert.match(await page.locator('#report').inputValue(),/RES-/);
  await page.goto('index.html');
  await page.locator('[data-v="bank"]').click();
  await page.locator('.lesson[data-l="1"] summary').click();
  await page.locator('input[aria-label="Ответ к задаче 31"]').fill('1, 4');
  await page.locator('input[aria-label="Ответ к задаче 31"]').press('Enter');
  assert.match(await page.locator('li.task:has(input[aria-label="Ответ к задаче 31"]) .vslot').innerText(),/✓ верно/);
  await page.locator('#freeBd').click();
  await page.locator('#bdCv').waitFor();
  const closeButton=await page.locator('#bdClose').boundingBox();
  assert.ok(closeButton.x>=0 && closeButton.x+closeButton.width<=390);
  const canvas = await page.locator('#bdCv').boundingBox();
  await page.mouse.move(canvas.x+65,canvas.y+90);await page.mouse.down();await page.mouse.move(canvas.x+120,canvas.y+120,{steps:5});await page.mouse.up();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mk_bd_free')||'[]').length===1);
  await page.locator('#bdClose').click();
  assert.deepEqual(errors,[]);

  const offline=await browser.newContext({baseURL:base});
  try {
    const retry=await offline.newPage();
    await retry.goto('index.html');
    await offline.setOffline(true);
    await retry.evaluate(()=>{location.hash='set=impulse'});
    await retry.locator('#retry-homework').waitFor();
    await offline.setOffline(false);
    await retry.locator('#retry-homework').click();
    await waitForForm(retry);
    assert.equal(await retry.locator('.study-questions .q').count(),12);
  } finally {await offline.close();}

  const source = await context.newPage();
  const codes = {};
  const rows = new Map();
  await source.goto('index.html');
  for (const preset of ['impulse','dynamics','friction','ratio']) {
    await source.goto(`index.html#set=${preset}`);
    await source.waitForFunction(name=>runs.hw?.title?.includes(name), {impulse:'Импульс',dynamics:'Диагностика',friction:'Закрепление',ratio:'После блока'}[preset]);
    const data = await source.evaluate(()=>({rows:Object.values(runs.hw.taskRows).filter(row=>row[0]>-100000),keys:OgeAssignments.homework(runs.hw.hw).keys}));
    data.rows.forEach(row=>rows.set(row[0],row));
    data.keys.forEach(key=>{codes[key.split('-')[0]]=key});
  }
  const versionedId=-199991;
  const versionedCode=answer=>encode('HW-',{
    v:2,t:'Вымышленная версия '+answer,i:[versionedId.toString(36)],
    a:[[versionedId,0,'A1','b',answer,'A','Полное вымышленное условие '+answer,[],{label:'Вымышленная задача'}]],
  });
  const separate=await context.newPage();
  await separate.goto('index.html?workspace=1');
  const unchanged=await separate.evaluate(async ({first,second,id})=>{
    const before=await openHomework(first);
    drafts.write(before,id,'8');
    await openHomework(second);
    finish(before);
    return before.res[0][2];
  },{first:versionedCode('8'),second:versionedCode('12'),id:versionedId});
  assert.equal(unchanged,1);
  await context.close();
  console.log('PASS: ready-made homework, old links, multiple tabs, independent test timer, submission, strict grading, mobile boards, graph focus and homework loading after reconnect.');
  return { ALL:[...rows.values()], CODES:codes, LT:{}, MAP:{} };
}

function makeTeacherFixture(source, bank) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(),'oge-teacher-test-'));
  try {
    const password='isolated-browser-test';
    const salt=crypto.randomBytes(16), iv=crypto.randomBytes(12);
    const key=crypto.pbkdf2Sync(password,salt,200000,32,'sha256');
    const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
    const bytes=Buffer.concat([salt,iv,cipher.update(JSON.stringify(bank)),cipher.final(),cipher.getAuthTag()]);
    fs.writeFileSync(path.join(fixture,'zhurnal.html'),fs.readFileSync(path.join(root,'zhurnal.html'),'utf8').replace(/const ENC="[^"]+"/,`const ENC="${bytes.toString('base64')}"`));
    execFileSync(process.execPath,[path.join(root,'scripts/protect-teacher.mjs'),source,'--workspace-only'],{cwd:fixture,input:password+'\n'});
    return {fixture,password};
  } catch (error) {
    fs.rmSync(fixture,{recursive:true,force:true});throw error;
  }
}

async function checkTeacher(browser,base,bank,source) {
  const expectedCode='16-TEST16';
  const fixtureBank={...bank,CODES:{...bank.CODES,16:expectedCode},LT:{...bank.LT,16:['Вымышленный блок давления',[]]}};
  const {fixture,password}=makeTeacherFixture(source,fixtureBank);
  const context=await browser.newContext({baseURL:base,permissions:['clipboard-read','clipboard-write']});
  async function useFixture(target) {
    await target.route('**/zadachnik-oge/**',async route=>{
      const file=new URL(route.request().url()).pathname.slice(prefix.length);
      if (!['teach.html','teacher-workspace.enc.json','zhurnal.html'].includes(file)) return route.continue();
      if(file==='teacher-workspace.enc.json')await new Promise(resolve=>setTimeout(resolve,250));
      return route.fulfill({path:path.join(fixture,file),contentType:mime[path.extname(file)]});
    });
  }
  async function login(page) {
    await page.goto('teach.html');
    assert.equal(await page.locator('#block-codes-dialog').count(),0);
    await page.locator('#teacher-password').fill(password);
    await page.locator('#teacher-login button').click();
    await page.locator('.physics-lab-overlay').waitFor();
    await page.locator('#teacher-view').waitFor();
    await page.locator('.physics-lab-overlay').waitFor({state:'detached'});
  }
  try {
    await useFixture(context);
    const teacher=await context.newPage();
    teacher.on('pageerror',error=>errors.push(error.message));
    await login(teacher);
    await teacher.locator('.lesson-tile').first().waitFor();
    assert.equal(await teacher.locator('.cabinet-nav a').count(),3);
    assert.equal(await teacher.locator('.lesson-tile').count(),56);
    await teacher.locator('.lesson-tile[data-lesson="9"]').click();
    const lessonCodes=teacher.locator('[data-block-codes=lesson]');
    await lessonCodes.click();
    const codesDialog=teacher.locator('#block-codes-dialog');
    await codesDialog.waitFor();
    assert.equal(await codesDialog.locator('.block-code-row').count(),2);
    assert.ok(await codesDialog.getByLabel('Код · Блок 16',{exact:true}).inputValue()===expectedCode);
    await codesDialog.getByRole('button',{name:'Скопировать код · Блок 16',exact:true}).click();
    assert.ok(await teacher.evaluate(()=>navigator.clipboard.readText())===expectedCode);
    await codesDialog.getByRole('button',{name:'Все блоки',exact:true}).click();
    assert.equal(await codesDialog.getByText('Открыт без кода',{exact:true}).count(),1);
    assert.ok(await codesDialog.locator('.block-code-row').count()>2);
    await teacher.keyboard.press('Escape');
    await codesDialog.waitFor({state:'hidden'});
    assert.ok(await lessonCodes.evaluate(element=>document.activeElement===element));
    await teacher.locator('[data-step="homework"]').first().click();
    await teacher.locator('#draft-details summary').click();
    const pressureList=teacher.locator('#draft-list');
    assert.equal(await pressureList.locator('li').count(),10);
    assert.match(await pressureList.innerText(),/гидравлический пресс/);
    assert.match(await pressureList.innerText(),/прямой расчёт давления|площадь опоры/);
    assert.doesNotMatch(await pressureList.innerText(),/Повторение графиков/);
    await pressureList.locator('[data-remove-draft]').last().click();
    assert.equal(await pressureList.locator('li').count(),9);
    await teacher.reload();
    await teacher.locator('#draft-details summary').click();
    assert.equal(await pressureList.locator('li').count(),9);
    await teacher.locator('[data-area="lessons"]').click();
    assert.equal(await teacher.locator('script[src*="frog-helper.js"],.teacher-sidebar').count(),0);
    await teacher.locator('.lesson-tile').first().focus();
    await teacher.keyboard.press('Tab');
    assert.ok(await teacher.locator('.lesson-tile').nth(1).evaluate(element=>
      element===document.activeElement&&getComputedStyle(element).outlineStyle!=='none'));
    await teacher.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await teacher.locator('.lesson-tile').first().evaluate(element=>getComputedStyle(element).transitionDuration),'0s');
    await teacher.emulateMedia({reducedMotion:'no-preference'});
    await teacher.locator('.cabinet-menu summary').click();
    await teacher.locator('#open-cabinet-bank').click();
    assert.match(teacher.url(),/view=lesson&lesson=9&step=practice/);
    assert.equal(await teacher.locator('#task-source').inputValue(),'bank');
    await teacher.locator('[data-area="lessons"]').click();
    const fits=async page=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const widths=[390,768,1440];
    for(const width of widths){
      await teacher.setViewportSize({width,height:900});await fits(teacher);
    }
    await teacher.locator('[data-area="students"]').click();
    await teacher.locator('#add-student').click();
    await teacher.locator('#new-name').fill(studentName);
    await teacher.locator('#profile-form button[type="submit"]').click();
    const firstProfile=await teacher.locator('#student').inputValue();
    await teacher.locator('[data-area="lessons"]').click();
    await teacher.locator('.lesson-tile[data-lesson="2"]').click();
    assert.match(teacher.url(),/view=lesson&lesson=2/);
    await teacher.locator('#mark-lesson-done').click();
    await teacher.getByText('Заметки и материалы',{exact:true}).click();
    await teacher.locator('#lesson-note').fill('Вымышленная заметка о занятии');
    await teacher.goBack();
    assert.equal(await teacher.locator('.lesson-tile[data-lesson="2"] [data-status=done]').count(),1);
    await teacher.goForward();
    assert.equal(await teacher.locator('#mark-lesson-done').getAttribute('aria-pressed'),'true');
    await teacher.reload();
    await teacher.locator('#mark-lesson-done').waitFor();
    assert.equal(await teacher.locator('#mark-lesson-done').getAttribute('aria-pressed'),'true');
    await teacher.locator('[data-area="students"]').click();
    assert.match(await teacher.locator('.completed-lessons').innerText(),/Вымышленная заметка/);
    await teacher.locator('#student').selectOption({index:0});
    assert.equal(await teacher.locator('.completed-lessons').count(),0);
    await teacher.locator('#student').selectOption(firstProfile);
    assert.equal(await teacher.locator('.completed-lessons li').count(),1);
    assert.match(teacher.url(),/view=students/);
    for(const width of widths){
      await teacher.setViewportSize({width,height:900});await fits(teacher);
    }
    await teacher.locator('.completed-lessons a').click();
    for(const width of widths){
      await teacher.setViewportSize({width,height:900});await fits(teacher);
    }
    await teacher.locator('[data-step="homework"]').first().click();
    await teacher.locator('#homework-preset option').nth(1).waitFor({state:'attached'});
    await teacher.locator('#homework-preset').selectOption('0');
    await teacher.locator('#use-preset').click();await teacher.locator('#use-preset').click();
    await teacher.locator('#issue-homework').click();
    const assignmentUrl=await teacher.locator('#draft-output a').getAttribute('href');
    assert.ok(assignmentUrl.includes('#hw=HW-'));

    const studentCtx=await browser.newContext();
    const pupil=await studentCtx.newPage();
    await pupil.goto(assignmentUrl);await waitForForm(pupil);
    await pupil.locator('#study-name').fill(studentName);
    await target(pupil,1).locator('input').fill('2');
    await target(pupil,2).locator('input').fill('3');
    await target(pupil,11).locator('textarea').fill('решение на фото');
    await pupil.locator('#fin2').click();await pupil.locator('#fin2').click();
    assert.deepEqual(await pupil.locator('.result-overview dd').allTextContents(),['1','1','9','1']);
    const message=await pupil.locator('#msg').inputValue();
    const assigned=await teacher.locator('#student').inputValue();
    await teacher.locator('#student').selectOption({index:0});
    await teacher.locator('[data-area="review"]').click();
    await teacher.locator('#result-code').fill(message);
    await teacher.locator('#read-result').click();
    await teacher.locator('#accept-result').waitFor();
    assert.match(await teacher.locator('.review-preview').innerText(),new RegExp(studentName));
    await teacher.locator('#accept-result').click();
    assert.equal(await teacher.locator('#student').inputValue(),assigned);
    assert.match(await teacher.locator('.review-summary').innerText(),/Верно: 1 · Ошибки: 1 · Ожидают проверки: 1/);
    assert.match(teacher.url(),/view=review&work=/);
    for(const width of widths){
      await teacher.setViewportSize({width,height:900});await fits(teacher);
    }
    await teacher.getByText('Отправить разбор или собрать разминку',{exact:true}).click();
    await teacher.locator('#build-warmup').click();
    assert.match(await teacher.locator('#warmup-plan').innerText(),/Разминка на 5–10 минут/);
    await teacher.locator('#copy-feedback').click();
    await teacher.getByRole('button',{name:'Скопировано ✓',exact:true}).waitFor();
    assert.match(await teacher.locator('#feedback-text').inputValue(),/Исправить: 1/);
    await teacher.locator('#result-code').fill(message);
    await teacher.locator('#read-result').click();
    await teacher.locator('#open-existing-result').click();
    assert.equal(await teacher.locator('#review-select option').count(),1);
    const reviewedId=await teacher.locator('#review-select').inputValue();
    await teacher.locator('[data-area="students"]').click();
    assert.match(await teacher.locator('.student-last-work').innerText(),/Импульс/);
    await teacher.getByRole('link',{name:'Открыть разбор',exact:true}).click();
    assert.equal(await teacher.locator('#review-select').inputValue(),reviewedId);

    await pupil.goto(base+'index.html#set=dynamics');await waitForForm(pupil);
    await target(pupil,2).locator('input').fill('6');
    await pupil.locator('#fin2').click();await pupil.locator('#fin2').click();
    await teacher.locator('#result-code').fill(await pupil.locator('#msg').inputValue());
    await teacher.locator('#read-result').click();await teacher.locator('#result-student').waitFor();
    assert.ok(await teacher.locator('#accept-result').isDisabled());
    await teacher.locator('#result-student').selectOption(assigned);
    await teacher.locator('#accept-result').click();
    assert.match(await teacher.locator('.review-summary').innerText(),/Верно: 1 · Ошибки: 0/);
    assert.equal(await teacher.getByText('Неизвестное задание — открой банк',{exact:true}).count(),0);

    await teacher.locator('[data-area="lessons"]').click();
    await teacher.locator('.lesson-tile[data-lesson="19"]').click();
    await teacher.locator('[data-step="homework"]').first().click();
    await teacher.locator('#task-source').selectOption('bank');
    await teacher.locator('#bank-block').selectOption('26');
    assert.equal(await teacher.locator('.task-entry').count(),21);
    assert.match(await teacher.locator('.task-entry').first().innerText(),/Блок 26 · №1/);
    const basicHeat=teacher.locator('.task-entry[data-task="-260001"] [data-pick]');
    const ohmId=-803001;
    await basicHeat.uncheck();
    const withoutBasic=Number(await teacher.locator('#draft-count').textContent());
    await basicHeat.check();
    assert.equal(Number(await teacher.locator('#draft-count').textContent()),withoutBasic+1);
    await teacher.locator('#bank-block').selectOption('30');
    await teacher.locator(`.task-entry[data-task="${ohmId}"] [data-pick]`).check();
    const issueCount=Number(await teacher.locator('#draft-count').textContent());
    await teacher.locator('#issue-homework').click();
    const heatHomework=await teacher.locator('#draft-output a').getAttribute('href');
    await pupil.goto(heatHomework); await waitForForm(pupil);
    assert.equal(await pupil.locator('.study-questions .q').count(),issueCount);
    const heatTask=pupil.locator('.study-questions .q[data-id="-260001"]');
    await heatTask.locator('input').fill('42');
    await pupil.reload(); await waitForForm(pupil);
    assert.equal(await heatTask.locator('input').inputValue(),'42');
    const expected=await pupil.evaluate(()=>runs.hw.ids.map(id=>({
      given:runs.hw.answers[id]||'',condition:runs.hw.taskRows[id][6],
      figures:runs.hw.taskRows[id][7]||[],key:runs.hw.taskRows[id][4],
      automatic:OgeCore.checkable(runs.hw.taskRows[id]),
    })));
    assert.ok(expected.some(item=>item.figures.length));
    await pupil.locator('#fin2').click();await pupil.locator('#fin2').click();
    const mixedMessage=await pupil.locator('#msg').inputValue();
    await teacher.locator('[data-area="review"]').click();
    await teacher.locator('#result-code').fill(mixedMessage);
    await teacher.locator('#read-result').click();
    await teacher.locator('#accept-result').waitFor();
    await teacher.locator('#accept-result').click();
    assert.match(await teacher.locator('.review-summary').innerText(),/Верно: 1 · Ошибки: 0/);
    async function checkCards(page) {
      const cards=page.locator('.review-work > article.review-item');
      assert.equal(await cards.count(),expected.length);
      for(let i=0;i<expected.length;i++){
        const card=cards.nth(i), item=expected[i];
        assert.equal(await card.locator('.review-condition img').count(),item.figures.length);
        for(let j=0;j<item.figures.length;j++){
          const img=card.locator('.review-condition img').nth(j);
          assert.equal(await img.getAttribute('src'),item.figures[j]);
          await img.evaluate(image=>image.decode());
        }
        const normalize=text=>text.replace(/\s+/g,' ').trim();
        assert.equal(normalize(await card.locator('.review-condition').innerText()),normalize(item.condition.replace(/\[рисунок\]/g,'')));
        assert.equal(await card.locator('.review-key').innerText(),item.automatic?'Правильный ответ: '+item.key:'Ручная проверка');
        assert.equal(await card.locator('.written').innerText(),'Ответ ученика: '+(item.given||'Ответ не заполнен'));
      }
    }
    await checkCards(teacher);
    await teacher.locator('[data-comment]').first().fill('Сохранённый комментарий');
    await teacher.getByText('Фотографии решений',{exact:true}).click();
    const photo=await teacher.evaluate(()=>{
      const canvas=document.createElement('canvas');
      canvas.width=8;canvas.height=8;
      canvas.getContext('2d').fillRect(1,1,6,6);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await teacher.locator('#solution-photo').setInputFiles({
      name:'test-solution.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64'),
    });
    await teacher.getByAltText('test-solution.png').waitFor();
    await teacher.reload();
    await teacher.locator('[data-area="review"]').click();
    await checkCards(teacher);
    assert.equal(await teacher.locator('[data-comment]').first().inputValue(),'Сохранённый комментарий');
    await teacher.locator('[data-area="students"]').click();
    await teacher.getByText('Данные кабинета',{exact:true}).click();
    const downloadPromise=teacher.waitForEvent('download');
    await teacher.locator('#export-all').click();
    const backupPath=await (await downloadPromise).path();

    const cleanContext=await browser.newContext({baseURL:base});
    try {
      await useFixture(cleanContext);
      const clean=await cleanContext.newPage();
      clean.on('pageerror',error=>errors.push(error.message));
      await login(clean);
      await clean.locator('[data-area="review"]').click();
      await clean.locator('#result-code').fill(mixedMessage);
      await clean.locator('#read-result').click();
      await clean.locator('#result-student').selectOption({index:1});
      const unresolved=clean.locator('.preview-cards article');
      assert.equal(await unresolved.count(),expected.length);
      assert.match(await unresolved.first().innerText(),/Условие не восстановлено|Сверь версию/);
      await clean.locator('#accept-result').click();
      assert.match(await clean.locator('.review-work > article.review-item').first().innerText(),/Ответ ученика/);
      await clean.locator('#result-code').fill(mixedMessage);
      await clean.getByText('Восстановить по исходной ссылке',{exact:true}).click();
      await clean.locator('#recovery-hw').fill(assignmentUrl);
      await clean.locator('#read-result').click();
      await clean.getByText('Исходная ссылка относится к другой версии домашки.',{exact:true}).waitFor();
      await clean.locator('#recovery-hw').fill(heatHomework);
      await clean.locator('#read-result').click();
      await clean.locator('#open-existing-result').click();
      assert.ok(await clean.locator('.review-work > article .review-figure').count());
      await clean.locator('[data-area="students"]').click();
      await clean.getByText('Данные кабинета',{exact:true}).click();
      await clean.locator('#import-all').setInputFiles(backupPath);
      await clean.getByText('Копия объединена с текущими записями.',{exact:false}).waitFor();
      await clean.locator('#student').selectOption(assigned);
      assert.match(await clean.locator('.completed-lessons').innerText(),/Вымышленная заметка/);
      await clean.locator('[data-area="review"]').click();
      await checkCards(clean);
      await clean.getByAltText('test-solution.png').waitFor();
      assert.equal(await clean.locator('[data-comment]').first().inputValue(),'Сохранённый комментарий');
    } finally {
      await cleanContext.close();
    }
    await studentCtx.close();

    const legacy=await context.newPage();
    await legacy.addInitScript(value=>{localStorage.removeItem('oge-teacher-device-v1');sessionStorage.removeItem('oge-teacher-session-v1');localStorage.setItem('jr_pw',value)},password);
    await legacy.goto('zhurnal.html');await legacy.locator('#chk').waitFor();
    assert.ok(await legacy.evaluate(()=>!localStorage.getItem('jr_pw')&&!!localStorage.getItem('oge-teacher-device-v1')));
    await legacy.locator('#inp').fill(message);await legacy.locator('#chk').click();await legacy.locator('#save').waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS: encrypted teacher fixture, full review cards after reload, original-link recovery, backup restore, legacy preview, duplicate detection and warmup.');
  } finally {
    await context.close();fs.rmSync(fixture,{recursive:true,force:true});
  }
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}${prefix}`;
  const executablePath=process.env.OGE_CHROME || undefined;
  const browser=await chromium.launch({executablePath});
  try {
    await checkStartupLoader(browser,base);
    const bank=await checkPublic(browser,base);
    const privateSource=path.resolve(process.env.OGE_PRIVATE_SOURCE||path.join(root,'../site-private-source'));
    if (fs.existsSync(privateSource)) await checkTeacher(browser,base,bank,privateSource);
    else console.log('SKIP: encrypted teacher fixture requires local private source.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
