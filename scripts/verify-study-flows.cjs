/* Browser regression checks. Run with playwright-core installed and Chromium available. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');
const prefix = '/zadachnik-oge/';
const mime = {'.js':'application/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.json':'application/json'};
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

  for (const [section,block] of [['heat','24'],['electricity','29'],['optics','34'],['quantum','37']]) {
    await page.locator(`#bank-topics [data-section="${section}"]`).click();
    assert.equal(await page.locator('#mods .mod').count(),2);
    assert.equal(await page.locator('#bank-source [data-source="fipi"]').getAttribute('aria-pressed'),'true');
    const lesson=page.locator(`details[data-fipi-block="${block}"]`);
    await lesson.locator('summary').click();
    await lesson.locator('.fipi-task').first().waitFor();
    assert.equal(await lesson.locator('.fipi-task').count(),12);
    assert.ok(Number((await lesson.locator('[data-fipi-count]').textContent()).split('/')[1])>12);
  }
  await page.goto('index.html?section=optics&block=36&source=practice');
  const lens=page.locator('details[data-l="36"]');
  assert.ok(await lens.evaluate(details=>details.open));
  const lensTask=lens.locator('.task').first();
  await lensTask.locator('input').fill('4');
  await lensTask.locator('[data-act="check"]').click();
  assert.match(await lensTask.locator('.vslot').innerText(),/верно/);
  assert.match(await page.locator('#mods .mod[aria-pressed="true"] [data-module-solved]').innerText(),/1/);
  await page.locator('#bt [data-t="e"]').click();
  assert.equal(await lens.locator('.task').count(),1);
  assert.match(await lens.locator('.task').innerText(),/36 см/);
  await lens.locator('.block-reference a').click();
  await page.locator('#topic option[value="36"]').waitFor({state:'attached'});
  assert.equal(await page.locator('#topic').inputValue(),'36');
  await page.locator('#format').selectOption('full');
  assert.equal(await page.locator('#tasks li').count(),2);
  await page.locator('#code').fill('df7cda');
  assert.equal(await page.locator('#tasks li').count(),1);
  assert.match(await page.locator('#tasks a').nth(1).getAttribute('href'),/OGEPHYSDF7CDA$/);
  await page.getByRole('link',{name:'В задачнике →'}).click();
  const fipiLens=page.locator('details[data-fipi-block="36"]');
  const linked=fipiLens.locator('[data-fipi-code="DF7CDA"]');
  await linked.waitFor();
  assert.ok(await fipiLens.evaluate(details=>details.open));
  await linked.locator('[data-fipi-act="mark"]').click();
  assert.match(await fipiLens.locator('[data-fipi-count]').innerText(),/^1 \/ 45$/);
  await linked.locator('[data-fipi-act="board"]').click();
  await page.locator('#bd').waitFor();
  assert.match(await page.locator('#bdTn').textContent(),/Блок 36 · ФИПИ DF7CDA/);
  assert.equal(await page.locator('#bdTb a').count(),2);
  await page.locator('#bdClose').click();
  await page.reload();
  await linked.waitFor();
  assert.equal(await linked.locator('[data-fipi-act="mark"]').getAttribute('aria-pressed'),'true');
  await page.locator('#bq').fill('');
  await fipiLens.locator('[data-fipi-page="1"]').click();
  assert.match(await fipiLens.locator('.fipi-pagination [role="status"]').textContent(),/^13–24 из 45$/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.locator('#bank-topics [data-section="methods"]').click();
  assert.equal(await page.locator('[data-fipi-block]').count(),4);
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
    const data = await source.evaluate(()=>({rows:Object.values(byId).filter(row=>row[0]>-100000),keys:OgeAssignments.homework(runs.hw.hw).keys}));
    data.rows.forEach(row=>rows.set(row[0],row));
    data.keys.forEach(key=>{codes[key.split('-')[0]]=key});
  }
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
    fs.mkdirSync(path.join(fixture,'tutor-plan'));
    fs.writeFileSync(path.join(fixture,'zhurnal.html'),fs.readFileSync(path.join(root,'zhurnal.html'),'utf8').replace(/const ENC="[^"]+"/,`const ENC="${bytes.toString('base64')}"`));
    execFileSync(process.execPath,[path.join(root,'scripts/protect-teacher.mjs'),source],{cwd:fixture,input:password+'\n'});
    return {fixture,password};
  } catch (error) {
    fs.rmSync(fixture,{recursive:true,force:true});throw error;
  }
}

async function checkTeacher(browser,base,bank,source) {
  const {fixture,password}=makeTeacherFixture(source,bank);
  const context=await browser.newContext({baseURL:base,permissions:['clipboard-read','clipboard-write']});
  try {
    await context.route('**/zadachnik-oge/**',async route=>{
      const file=new URL(route.request().url()).pathname.slice(prefix.length);
      if (!['teach.html','teacher-workspace.enc.json','zhurnal.html','tutor-plan/index.html','tutor-plan/teacher-plan.enc.json'].includes(file)) return route.continue();
      return route.fulfill({path:path.join(fixture,file),contentType:mime[path.extname(file)]});
    });
    const teacher=await context.newPage();
    teacher.on('pageerror',error=>errors.push(error.message));
    await teacher.goto('teach.html');
    await teacher.locator('#teacher-password').fill(password);
    await teacher.locator('#teacher-login button').click();
    await teacher.locator('#teacher-view').waitFor();
    await teacher.locator('#add-student').click();
    await teacher.locator('#new-name').fill(studentName);
    await teacher.locator('#profile-form button[type="submit"]').click();
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
    assert.match(await teacher.locator('#review-tools').locator('..').innerText(),/Верно: 1 · Ошибки: 1 · Ожидают проверки: 1/);
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
    await teacher.locator('[data-area="lesson"]').click();
    assert.match(await teacher.locator('.teacher-latest').innerText(),/Импульс/);
    await teacher.getByRole('button',{name:'Открыть разбор',exact:true}).click();
    assert.equal(await teacher.locator('#review-select').inputValue(),reviewedId);

    await pupil.goto(base+'index.html#set=dynamics');await waitForForm(pupil);
    await target(pupil,2).locator('input').fill('6');
    await pupil.locator('#fin2').click();await pupil.locator('#fin2').click();
    await teacher.locator('#result-code').fill(await pupil.locator('#msg').inputValue());
    await teacher.locator('#read-result').click();await teacher.locator('#result-student').waitFor();
    assert.ok(await teacher.locator('#accept-result').isDisabled());
    await teacher.locator('#result-student').selectOption(assigned);
    await teacher.locator('#accept-result').click();
    assert.match(await teacher.locator('#review-tools').locator('..').innerText(),/Верно: 1 · Ошибки: 0/);
    assert.equal(await teacher.getByText('Неизвестное задание — открой банк',{exact:true}).count(),0);

    await teacher.locator('#course-lesson').selectOption('19');
    await teacher.locator('[data-step="homework"]').first().click();
    await teacher.locator('#task-source').selectOption('bank');
    await teacher.locator('#bank-block').selectOption('26');
    assert.equal(await teacher.locator('.task-entry').count(),3);
    assert.match(await teacher.locator('.task-entry').first().innerText(),/Блок 26 · №1/);
    const previousDraftCount=Number(await teacher.locator('#draft-count').textContent());
    await teacher.locator('.task-entry [data-pick]').first().check();
    assert.equal(Number(await teacher.locator('#draft-count').textContent()),previousDraftCount+1);
    await teacher.locator('#issue-homework').click();
    const heatHomework=await teacher.locator('#draft-output a').getAttribute('href');
    await pupil.goto(heatHomework); await waitForForm(pupil);
    assert.equal(await pupil.locator('.study-questions .q').count(),previousDraftCount+1);
    const heatTask=pupil.locator('.study-questions .q').filter({hasText:'Блок 26 · №1'});
    await heatTask.locator('input').fill('42');
    await pupil.locator('#fin2').click();await pupil.locator('#fin2').click();
    await teacher.locator('[data-area="review"]').click();
    await teacher.locator('#result-code').fill(await pupil.locator('#msg').inputValue());
    await teacher.locator('#read-result').click();
    await teacher.locator('#accept-result').waitFor();
    await teacher.locator('#accept-result').click();
    assert.match(await teacher.locator('#review-tools').locator('..').innerText(),/Верно: 1 · Ошибки: 0/);
    await studentCtx.close();

    const legacy=await context.newPage();
    await legacy.addInitScript(value=>{localStorage.removeItem('oge-teacher-device-v1');sessionStorage.removeItem('oge-teacher-session-v1');localStorage.setItem('jr_pw',value)},password);
    await legacy.goto('zhurnal.html');await legacy.locator('#chk').waitFor();
    assert.ok(await legacy.evaluate(()=>!localStorage.getItem('jr_pw')&&!!localStorage.getItem('oge-teacher-device-v1')));
    await legacy.locator('#inp').fill(message);await legacy.locator('#chk').click();await legacy.locator('#save').waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS: encrypted teacher fixture, assigned-profile matching, legacy preview, duplicate detection, feedback, warmup and old login migration.');
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
    const bank=await checkPublic(browser,base);
    const privateSource=path.resolve(process.env.OGE_PRIVATE_SOURCE||path.join(root,'../site-private-source'));
    if (fs.existsSync(privateSource)) await checkTeacher(browser,base,bank,privateSource);
    else console.log('SKIP: encrypted teacher fixture requires local private source.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
