import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, mkdtemp, cp, rm, stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve, join, extname, sep} from 'node:path';
import {createCipheriv, pbkdf2Sync, randomBytes} from 'node:crypto';
import {studentLink, variantKey} from '../config.mjs';

const require=createRequire(import.meta.url);
const prefix='/zadachnik-oge/';
const fixturePassword='mock-integration-fixture';
const integration=process.env.INVARIANT_MOCKS_INTEGRATION;
const privateSource=process.env.INVARIANT_CABINET_SOURCE;
const shots=process.env.INVARIANT_MOCKS_SHOTS;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json',
  '.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const app=page=>page.locator('#mock-app');
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
const got=async (locator,phrase)=>{
  await locator.filter({hasText:phrase}).first().waitFor();
};
const unlock=async (page,code)=>{
  await page.locator('#mock-code').fill(code);
  await click(page,'Открыть вариант');
};
const selectQuestion=async (page,n)=>page.getByRole('button',{name:new RegExp('^Задание '+n+',')}).click();
const idPattern=/[a-f\d]{32}/;
async function capture(page,name) {
  if (shots) await page.screenshot({path:join(shots,name+'.png'),fullPage:true});
}

async function cabinetFixture(root, temp, codes) {
  const source=join(temp,'private');
  const output=join(temp,'overlay');
  await Promise.all([mkdir(source,{mode:0o700}),mkdir(output)]);
  const issuance=join(temp,'test-issuance.json');
  await writeFile(issuance,JSON.stringify(codes),{mode:0o600});
  execFileSync(process.execPath,[join(root,'mocks/tools/teacher-entry.mjs'),source,issuance]);
  const home=integration || root;
  if (privateSource) {
    const html=await readFile(join(privateSource,'teach.html'),'utf8');
    const anchor='<div data-mock-tools></div>';
    assert(html.includes('<main id="teacher-view"'));
    await writeFile(join(source,'teach.html'),html.replace('<main id="teacher-view"',anchor+'<main id="teacher-view"'));
    for (const file of ['teach.js','practice-data.js','lessons-data.js','tutor-plan']) {
      await cp(join(privateSource,file),join(source,file),{recursive:true});
    }
  } else {
    await writeFile(join(source,'teach.html'),'<html><body><main><h1>Тестовый кабинет</h1><div data-mock-tools></div></main></body></html>');
    await mkdir(join(source,'tutor-plan'));
    for (const file of ['teach.js','practice-data.js','tutor-plan/plan-data.js']) await writeFile(join(source,file),'');
  }
  const salt=randomBytes(16), iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',pbkdf2Sync(fixturePassword,salt,200000,32,'sha256'),iv);
  const data=Buffer.concat([salt,iv,cipher.update(JSON.stringify({ALL:[],LT:{},CODES:{}})),cipher.final(),cipher.getAuthTag()]);
  const journal=await readFile(join(home,'zhurnal.html'),'utf8');
  await writeFile(join(output,'zhurnal.html'),journal.replace(/const ENC="[^"]+"/,`const ENC="${data.toString('base64')}"`));
  const pack=await readFile(join(home,'scripts/protect-teacher.mjs'),'utf8');
  const adapted = pack.replace("...lessonScripts,'teach.js'","...lessonScripts,'teach.js','mocks-entry.js'");
  assert.notEqual(adapted,pack);
  const script=join(temp,'pack.mjs');
  await writeFile(script,adapted);
  execFileSync(process.execPath,[script,source,'--workspace-only'],{cwd:output,input:fixturePassword+'\n'});
  return output;
}

async function openAll(page, base, meta, variant) {
  await page.goto(studentLink(meta,base));
  await click(page,'Начать попытку');
  assert.equal(await page.getByRole('navigation',{name:'Номера заданий'}).getByRole('button').count(),meta.count);
  await got(page.locator('.mock-clock'),meta.exam==='oge'?/^0[23]:/:/^03:/);
  for (const task of variant.tasks) {
    await selectQuestion(page,task.n);
    await got(app(page).locator('h2'),new RegExp('^Задание №'+task.n+'$'));
    if (task.n===1 && meta.exam==='ege') await capture(page,'ege-question');
    if (task.type==='long') {
      if (task.n===17) {
        assert.equal(await page.locator('table tbody tr').count(),3);
        await page.locator('#mock-answer').fill(task.solution);
      }
    } else if (task.type==='measure') {
      await page.locator('#mock-reading').fill('3,5');
      await page.locator('#mock-uncertainty').fill('0,5');
    } else {
      const answer=meta.exam==='oge' && task.n===14?task.answer[0]:task.answer;
      await page.locator('#mock-answer').fill(answer);
    }
  }
  await page.getByRole('button',{name:'К сдаче',exact:true}).first().click();
  await got(page.locator('#mock-confirm-count'),meta.exam==='oge'?'5 из 22':'6 из 26');
  await click(page,'Сдать работу');
  await got(app(page).locator('h1'),'Результат пробника');
  await got(app(page).getByText('Проверено автоматически:',{exact:false}),meta.exam==='oge'?'22 из 23':'28 из 28');
  await got(app(page).locator('h2'),'Итог появится после проверки');
}

export async function run({root,catalog,variants,fixtures}) {
  assert(fixtures.size>=2,'Для браузерной приёмки требуется приватный реестр вариантов.');
  const {chromium}=require('playwright-core');
  const temp=await mkdtemp(join(tmpdir(),'invariant-mocks-test-'));
  let server, browser;
  try {
    if (shots) await mkdir(shots,{recursive:true});
    const cabinet=await cabinetFixture(root,temp,Object.fromEntries([...fixtures].map(([key,v])=>[key,v.code])));
    const containers=new Map(catalog.variants.filter(meta=>meta.access==='code').map(meta=>
      ['mocks/data/'+meta.file,fixtures.get(variantKey(meta)).payload]));
    const servedTeacher = new Set(['teach.html','teacher-workspace.enc.json','zhurnal.html']);
    server=createServer(async (request,response)=>{
      try {
        const url=new URL(request.url,'http://localhost');
        if (!url.pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
        const name=decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
        if (containers.has(name)) {
          response.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(containers.get(name)));
          return;
        }
        const dir=servedTeacher.has(name)?cabinet:integration && !/^mocks(?:\/|\.html$)/.test(name)?resolve(integration):resolve(root);
        const file=resolve(dir,name);
        if (!file.startsWith(dir+sep) || !(await stat(file)).isFile()) { response.writeHead(404).end(); return; }
        response.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});
        createReadStream(file).pipe(response);
      } catch { response.writeHead(404).end(); }
    });
    await new Promise(complete=>server.listen(0,'127.0.0.1',complete));
    const base=`http://127.0.0.1:${server.address().port}${prefix}`;
    browser=await chromium.launch({executablePath:process.env.OGE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
    const desktop=await browser.newContext({viewport:{width:1360,height:850},reducedMotion:'reduce'});
    const mobile=await browser.newContext({viewport:{width:375,height:800},isMobile:true,hasTouch:true});
    const teacherProfile=await browser.newContext();
    await teacherProfile.addInitScript(()=>{
      Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied');}}});
    });
    const student=await desktop.newPage();
    const phone=await mobile.newPage();
    const teacher=await teacherProfile.newPage();
    const appErrors=[];
    for (const page of [student,phone]) page.on('pageerror',error=>appErrors.push(error.message));
    await phone.goto(base+'mocks.html?exam=oge');
    await got(phone.locator('h1'),'Пробники по физике');
    assert.equal(await phone.locator('.mock-ticket').count(),2);
    assert.equal(await phone.evaluate(()=>document.body.scrollWidth<=innerWidth),true);
    await capture(phone,'mobile-catalog');
    const pick=(exam,access)=>catalog.variants.find(item=>item.exam===exam&&item.access===access&&!item.archived);
    for (const exam of ['oge','ege']) {
      const meta=pick(exam,'open');
      await openAll(student,base,meta,variants.get(variantKey(meta)));
    }

    const locked=pick('ege','code'), other=pick('oge','code');
    const otherCode=fixtures.get(variantKey(other)).code;
    const requests=[];
    student.on('request',request=>requests.push(request.url()));
    await teacher.goto(base+'teach.html?view=lessons&exam=ege');
    assert.equal(await teacher.getByRole('button',{name:'Пробники и коды'}).count(),0);
    await teacher.locator('#teacher-password').fill(fixturePassword);
    await click(teacher,'Войти в кабинет');
    await click(teacher,'Пробники и коды');
    await teacher.locator('#mock-issue-variant').selectOption(variantKey(locked));
    await click(teacher,'Скопировать сообщение');
    await got(teacher.getByRole('status'),'Скопируйте его вручную');
    const message=await teacher.locator('#mock-issue-message').inputValue();
    const [,link,codeLine]=message.split('\n');
    const code=codeLine.slice('Код: '.length);
    if (code!==fixtures.get(variantKey(locked)).code || link.includes(code)) throw new Error('Выдача не соответствует версии.');
    await student.goto(link);
    await student.locator('#mock-code').waitFor();
    assert(!requests.some(url=>url.includes('/mocks/data/')&&!url.endsWith('/catalog.json')));
    await unlock(student,'not-a-code');
    await got(student.getByRole('status'),'Вставьте полный код');
    await unlock(student,otherCode);
    await got(student.getByRole('status'),'Код не подходит');
    await unlock(student,'  '+code+'  ');
    await click(student,'Начать попытку');
    await student.locator('#mock-answer').fill('0');
    const before=await student.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('invariant-mock/ege/ege-02/')));
    assert.equal(before.length,1);
    const key=before[0];
    const deadline=await student.evaluate(key=>JSON.parse(localStorage.getItem(key)).deadline,key);

    await student.reload();
    await unlock(student,code);
    await click(student,'Продолжить');
    assert.equal(await student.locator('#mock-answer').inputValue(),'0');
    assert.equal(await student.evaluate(key=>JSON.parse(localStorage.getItem(key)).deadline,key),deadline);
    const variant=variants.get(variantKey(locked));
    for (const task of variant.tasks) {
      await selectQuestion(student,task.n);
      if (task.type==='measure') {
        await student.locator('#mock-reading').fill(task.answer.split('±')[0]);
        await student.locator('#mock-uncertainty').fill(task.answer.split('±')[1]);
      } else if (task.type!=='long') {
        await student.locator('#mock-answer').fill(task.answer);
      } else if (task.n===21) await student.locator('#mock-answer').fill(task.solution);
    }
    await student.getByRole('button',{name:'К сдаче',exact:true}).first().click();
    await got(student.locator('#mock-confirm-count'),'5 из 26');
    await click(student,'Сдать работу');
    await got(app(student).getByText('Проверено автоматически:',{exact:false}),'28 из 28');
    await got(app(student).locator('h2'),'Итог появится после проверки');
    const workPromise=student.waitForEvent('download');
    await click(student,'Скачать работу');
    const work=await workPromise;
    assert(work.suggestedFilename().match(idPattern));
    await teacher.locator('#mock-work-file').setInputFiles(await work.path());
    await got(teacher.getByRole('heading',{level:4}),'ЕГЭ');
    await click(teacher,'Скачать разбор');
    await got(teacher.getByRole('status'),'Поставьте балл за каждое');
    for (const task of variant.tasks.filter(task=>task.type==='long')) {
      await teacher.locator('#mock-score-'+task.n).evaluate(node=>node.closest('details').open=true);
      await teacher.locator('#mock-score-'+task.n).selectOption(task.n===21?'3':'0');
    }
    await teacher.locator('#mock-comment-21').fill('Верно показано, почему ближний заряд притягивается сильнее.');
    const reviewPromise=teacher.waitForEvent('download');
    await click(teacher,'Скачать разбор');
    const review=await reviewPromise;
    await student.locator('#mock-review').setInputFiles(await work.path());
    await got(student.getByRole('status'),'не подходит к этой попытке');
    await student.locator('#mock-review').setInputFiles(await review.path());
    await got(app(student).locator('h2'),'Итог · 31 из 45');
    await got(app(student).locator('p'),'Проверено учителем.');
    await capture(student,'ege-reviewed');
    await click(student,'К попыткам');
    await click(student,'Новая попытка');
    assert.equal(await student.locator('#mock-answer').inputValue(),'');
    const newKeys=await student.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('invariant-mock/ege/ege-02/')));
    assert.equal(newKeys.length,2);
    const fresh=newKeys.find(item=>item!==key);
    await student.evaluate(fresh=>{
      const record=JSON.parse(localStorage.getItem(fresh));
      record.deadline=Date.now()-1000;
      localStorage.setItem(fresh,JSON.stringify(record));
    },fresh);
    await student.reload();
    await unlock(student,code);
    await got(app(student).locator('span'),'Сдано');
    await app(student).getByRole('button',{name:'Результат',exact:true}).first().click();
    await got(app(student).locator('p'),'Время истекло');
    await got(app(student).locator('h2'),'Итог появится после проверки');

    await phone.goto(studentLink(other,base));
    await unlock(phone,otherCode);
    await click(phone,'Начать попытку');
    await selectQuestion(phone,15);
    assert.equal(await phone.evaluate(()=>document.body.scrollWidth<=innerWidth),true);
    await capture(phone,'mobile-question');
    await selectQuestion(phone,22);
    await got(app(phone).locator('h2'),'Задание №22');
    const noStorage=await browser.newContext();
    await noStorage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked');}}));
    const blocked=await noStorage.newPage();
    await blocked.goto(studentLink(pick('oge','open'),base));
    await got(blocked.locator('#mock-storage'),'Хранилище недоступно');
    await click(blocked,'Начать попытку');
    await blocked.locator('#mock-answer').fill('241');
    await selectQuestion(blocked,2);
    await selectQuestion(blocked,1);
    assert.equal(await blocked.locator('#mock-answer').inputValue(),'241');
    assert.deepEqual(appErrors,[]);
    console.log('PASS: четыре варианта, два профиля, закрытый кабинет, код другой версии, черновик, таймер, частичный балл, ручная оценка, возврат разбора, мобильная ширина и недоступное хранилище.');
  } finally {
    await browser?.close();
    server?.close();
    await rm(temp,{recursive:true,force:true});
  }
}
