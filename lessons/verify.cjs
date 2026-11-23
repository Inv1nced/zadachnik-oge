const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { homework, result } = require('../assignment-code.js');
const { correct } = require('../learning-core.js');

const root = path.resolve(__dirname, '..');
const source = path.resolve(process.env.OGE_PRIVATE_SOURCE || path.join(root, '../invariant-lessons-private'));
const prefix = '/zadachnik-oge/';
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const readData = exam => JSON.parse(read('lessons/' + exam + '.json'));
const ege = readData('ege');
const oge = readData('oge');
const stages = ['diagnostic', 'explain', 'together', 'practice', 'review', 'homework'];
const lessonPath = (exam, id, stage) => `lessons.html?exam=${exam}&lesson=${id}${stage ? '&stage=' + stage : ''}`;
const canonical = ['mechanics', 'thermodynamics', 'electrodynamics', 'optics', 'quantum', 'methods',
  'kinematics', 'dynamics', 'statics', 'conservation', 'oscillations-waves', 'molecular-physics',
  'electrostatics', 'dc-circuits', 'magnetism', 'induction', 'wave-optics', 'atomic-nuclear', 'measurement'];
const fixturePassword = 'isolated-invariant-lessons-test';
const lessonIds = new Set();
const taskIds = new Set();

for (const data of [ege, oge]) {
  assert.equal(data.schemaVersion, 1);
  const blocks = new Set(data.blocks.map(block => block.id));
  for (const lesson of data.lessons) {
    assert.ok(!lessonIds.has(lesson.cabinetId));
    lessonIds.add(lesson.cabinetId);
    assert.ok(blocks.has(lesson.block), lesson.id);
    if (data.exam === 'ege') assert.ok(canonical.includes(lesson.topic), lesson.topic);
    if (!lesson.duration) {
      assert.ok(lesson.links.every(link => fs.existsSync(path.join(root, link.href.split('?')[0]))), lesson.id);
      continue;
    }
    assert.equal(lesson.duration, 60);
    assert.ok(lesson.theory && lesson.demo && lesson.formula && lesson.error && lesson.criterion && lesson.exit.question && lesson.transfer.question);
    assert.equal(lesson.diagnostic.length, 2);
    for (const [slot, count] of [['together', 2], ['practice', 3], ['homework', 3]]) {
      assert.equal(lesson[slot].length, count, lesson.id);
      for (const item of lesson[slot]) {
        assert.ok(item.taskId < -100000 && !taskIds.has(item.taskId), item.label);
        taskIds.add(item.taskId);
        assert.ok(item.label && item.question && item.hint);
        assert.ok(!Object.hasOwn(item, 'answer') && !Object.hasOwn(item, 'solution'));
      }
    }
    assert.ok(!lesson.diagnostic.some(item => Object.hasOwn(item, 'answer')));
  }
}

const fixture = fs.existsSync(path.join(source, 'lessons-data.js'));
if (fixture) {
  const world = { window: {}, btoa, URLSearchParams };
  vm.createContext(world);
  for (const file of ['tutor-plan/plan-data.js', 'practice-data.js']) {
    vm.runInContext(fs.readFileSync(path.join(source, file), 'utf8'), world);
  }
  const legacy = new Set(Object.values(world.window.PRACTICE).flat().map(row => row[0]));
  vm.runInContext(fs.readFileSync(path.join(source, 'lessons-data.js'), 'utf8'), world);
  const { PLAN, PRACTICE } = world.window;
  const validationFile = path.join(source, 'verify-numbers.cjs');
  if (fs.existsSync(validationFile)) console.log(`PASS: ${require(validationFile)(PRACTICE)} independent numerical checks.`);
  assert.equal(PLAN.lessons.length, lessonIds.size);
  for (const lesson of PLAN.lessons.filter(item => item.newCourse)) {
    assert.equal(PRACTICE[lesson.id].length, 8);
    assert.equal(lesson.diagnostic.length, 2);
    assert.equal(lesson.guidedTasks.length, 2);
    assert.equal(lesson.timeline.length, 6);
    assert.equal(lesson.homeworkIds.length, 3);
    for (const row of PRACTICE[lesson.id]) {
      assert.ok(taskIds.has(row[0]) && !legacy.has(row[0]), row[0]);
      assert.ok(row[8].solution.includes('авторский расчёт'));
      if (row[3] === 'b') assert.equal(correct(row, row[4]), true, row[8].label);
    }
  }
}
console.log(`PASS: ${ege.lessons.length} EGE cards, ${oge.lessons.length} OGE routes, ${taskIds.size} stable author task IDs; ${fixture ? 'private payload verified' : 'private payload unavailable'}.`);

if (!process.argv.includes('--browser')) process.exit(0);

const { chromium } = require('playwright-core');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
let encryptedFixture;

function makeTeacherFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'invariant-lessons-check-'));
  const testSource = path.join(directory, 'source');
  fs.mkdirSync(path.join(testSource, 'tutor-plan'), { recursive: true });
  // Project only the lesson sources. Live mock access codes never enter the fixture.
  for (const file of ['teach.html', 'teach.js', 'practice-data.js', 'lessons-data.js', 'tutor-plan/plan-data.js']) {
    fs.copyFileSync(path.join(source, file), path.join(testSource, file));
  }
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(fixturePassword, salt, 200000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([salt, iv, cipher.update(JSON.stringify({ ALL: [], LT: {}, CODES: {} })), cipher.final(), cipher.getAuthTag()]);
  fs.writeFileSync(path.join(directory, 'zhurnal.html'), read('zhurnal.html').replace(/const ENC="[^"]+"/, `const ENC="${data.toString('base64')}"`));
  execFileSync(process.execPath, [path.join(root, 'scripts/protect-teacher.mjs'), testSource, '--workspace-only'],
    { cwd: directory, input: fixturePassword + '\n' });
  return directory;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (!url.pathname.startsWith(prefix)) return response.writeHead(404).end();
  const relative = url.pathname.slice(prefix.length) || 'index.html';
  const file = path.resolve(root, relative);
  const teacherFile = ['teach.html', 'teacher-workspace.enc.json', 'zhurnal.html'].includes(relative);
  const served = encryptedFixture && teacherFile ? path.join(encryptedFixture, relative) : file;
  if (!file.startsWith(root + path.sep) || !fs.existsSync(served) || !fs.statSync(served).isFile()) {
    return response.writeHead(404).end();
  }
  response.setHeader('Content-Type', mime[path.extname(served)] || 'application/octet-stream');
  fs.createReadStream(served).pipe(response);
});

const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

async function checkPublic(browser, base) {
  const mobile = await browser.newContext({ baseURL: base, viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  const page = await mobile.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('ege.html');
  await page.getByRole('heading', { name: 'Физика', exact: true }).waitFor();
  await page.locator('.lesson-row').first().waitFor();
  assert.equal(await page.locator('.lesson-row').count(), ege.lessons.length);
  assert.ok(await fits(page));

  for (const data of [ege, oge]) {
    await page.goto('lessons.html?exam=' + data.exam);
    await page.locator('.lesson-row').first().waitFor();
    assert.equal(await page.locator('.lesson-row').count(), data.lessons.length);
    for (const lesson of data.lessons) {
      await page.goto(lessonPath(data.exam, lesson.id, lesson.duration ? 'explain' : ''));
      await page.getByRole('heading', { name: lesson.title, exact: true }).waitFor();
      assert.ok(await fits(page), lesson.id);
      if (lesson.duration) {
        assert.equal(await page.locator('#demo svg').count(), 1, lesson.id);
        assert.equal(await page.locator('.stage-nav [aria-current=step]').count(), 1);
        const slider = page.locator('#demo input');
        await slider.press('End');
        assert.ok(await fits(page));
        await slider.press('Home');
      } else {
        assert.ok(await page.locator('.stage a').count(), lesson.id);
      }
    }
  }
  const exemplar = ege.lessons[0];
  for (const stage of stages) {
    await page.goto(lessonPath('ege', exemplar.id, stage));
    await page.locator('.stage h2').waitFor();
    assert.ok(await fits(page), stage);
    assert.equal(await page.getByText('Источником ответа', { exact: false }).count(), 0);
    if (stage === 'practice') {
      assert.equal(await page.locator('.task').count(), 3);
      await page.locator('.task summary').first().click();
      assert.equal(await page.locator('.task details[open]').count(), 1);
    }
  }
  await page.goto(lessonPath('ege', exemplar.id, 'explain'));
  const readout = page.locator('.readout');
  await readout.waitFor();
  assert.match(await readout.textContent(), /t = 0 с/);
  await page.locator('#demo input').press('End');
  assert.match(await readout.textContent(), /x = 4 м · s = 8 м/);
  await page.getByRole('button', { name: 'Сброс' }).click();
  await page.getByRole('button', { name: 'Пуск' }).click();
  await page.waitForFunction(() => document.querySelector('#demo input').valueAsNumber > 0.05);
  await page.getByRole('button', { name: 'Пауза' }).click();
  assert.ok(await page.getByRole('button', { name: 'Пуск' }).isEnabled());
  await page.reload();
  await readout.waitFor();
  assert.match(await readout.textContent(), /t = 0 с/);
  if (process.env.LESSON_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.LESSON_SCREENSHOTS, 'lesson-mobile.png'), fullPage: true });
  await page.goto('lessons.html?exam=ege&lesson=missing');
  await page.getByRole('heading', { name: 'Урок не найден' }).waitFor();
  await page.goto('lessons.html?exam=ege&exam=oge');
  await page.getByRole('heading', { name: 'Выбери экзамен' }).waitFor();
  await page.route('**/lessons/ege.json', route => route.abort());
  await page.goto('lessons.html?exam=ege');
  await page.getByRole('heading', { name: 'Уроки не загрузились' }).waitFor();
  assert.deepEqual(errors, []);
  await mobile.close();
  const desktop = await browser.newPage({ baseURL: base, viewport: { width: 1440, height: 920 } });
  await desktop.goto('ege.html');
  await desktop.locator('.lesson-row').first().waitFor();
  assert.ok(await fits(desktop));
  if (process.env.LESSON_SCREENSHOTS) await desktop.screenshot({ path: path.join(process.env.LESSON_SCREENSHOTS, 'course-desktop.png') });
  await desktop.close();
  console.log('PASS: all direct lesson URLs under the Pages prefix, mobile diagrams, velocity controls, hints, empty and error states.');
}

function studentProfile(id, name) {
  return { id, name, lesson: 2, notes: {}, tasks: {}, drafts: {}, assignments: [], results: [], mastery: {}, lessonStatus: {}, photos: [] };
}

async function checkClassroom(browser, base) {
  const context = await browser.newContext({ baseURL: base, permissions: ['clipboard-read','clipboard-write'] });
  const teacher = await context.newPage();
  const errors = [];
  teacher.on('pageerror', error => errors.push(error.message));
  await teacher.goto('teach.html?view=lessons&exam=ege');
  assert.equal(await teacher.locator('#teacher-view').count(), 0);
  await teacher.evaluate(profiles => localStorage.setItem('oge-workspace-v1', JSON.stringify(profiles)), {
    version: 1, active: 'alice-fixture', students: [studentProfile('alice-fixture', 'Ученица А'), studentProfile('bob-fixture', 'Ученик Б')],
  });
  await teacher.locator('#teacher-password').fill(fixturePassword);
  await teacher.locator('#teacher-login button').click();
  await teacher.locator('.lesson-tile').first().waitFor();
  assert.equal(await teacher.locator('.lesson-tile').count(), ege.lessons.length);

  for (const block of ege.blocks) {
    const lesson = ege.lessons.find(row => row.block === block.id);
    await teacher.goto(`teach.html?view=lesson&lesson=${lesson.cabinetId}&exam=ege&step=explain`);
    await teacher.getByRole('button', { name: 'Демонстрация урока' }).click();
    await teacher.frameLocator('#resource-frame').locator('#demo svg').waitFor();
    await teacher.locator('#close-resource').click();
    await teacher.locator('[data-step=together]').click();
    assert.equal(await teacher.locator('[data-guided]').count(), 2);
    await teacher.locator('[data-guided]').first().click();
    await teacher.frameLocator('#resource-frame').locator('#bd:not([hidden])').waitFor();
    const label = await teacher.frameLocator('#resource-frame').locator('#bdTn').textContent();
    assert.match(label, /Блок \d+, задача №/);
    await teacher.locator('#close-resource').click();
  }

  for (const id of [1,19,29,43,46,49,54]) {
    await teacher.goto('teach.html?view=lesson&lesson=' + id + '&step=explain');
    await teacher.getByRole('button', { name: 'Выразить величину' }).click();
    await teacher.frameLocator('#resource-frame').locator('body').waitFor();
    await teacher.locator('#close-resource').click();
    await teacher.locator('[data-step=practice]').click();
    await teacher.locator('[data-board]').first().click();
    await teacher.frameLocator('#resource-frame').locator('#bd:not([hidden])').waitFor();
    await teacher.locator('#close-resource').click();
  }

  const lesson = ege.lessons[0];
  await teacher.goto('teach.html?view=lesson&lesson=1001&exam=ege');
  await teacher.locator('#teacher-view h1').waitFor();
  await teacher.locator('.lesson-record > summary').click();
  await teacher.locator('#lesson-note').fill('Заметка ЕГЭ А');
  await teacher.locator('[data-next=explain]').click();
  await teacher.locator('[data-next=together]').click();
  await teacher.locator('[data-next=practice]').click();
  assert.equal(await teacher.locator('.task-entry').count(), 3);
  await teacher.locator('#exit-repeat').click();
  await teacher.locator('[data-next=homework]').click();
  assert.equal(await teacher.locator('#draft-count').textContent(), '3');
  await teacher.locator('#issue-homework').click();
  const pupilURL = await teacher.getByRole('link', { name: 'Открыть ученическую подборку' }).getAttribute('href');
  const issued = homework(pupilURL);
  assert.deepEqual(issued.ids, lesson.homework.map(task => task.taskId));
  assert.equal(issued.rows[2][4], '');
  assert.ok(!('solution' in issued.rows[2][8]));
  const pupilContext = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 } });
  const pupil = await pupilContext.newPage();
  await pupil.goto(pupilURL);
  await pupil.locator('#study-name').fill('Ученица А');
  const questions = pupil.locator('.study-questions .q');
  await questions.nth(0).locator('input').fill('999');
  await questions.nth(1).locator('input').fill('1');
  await questions.nth(2).locator('textarea').fill('Ломаный график пересекает ось времени в 4 с.');
  await pupil.locator('#fin').click();
  const submission = result(await pupil.locator('#msg').inputValue());
  assert.equal(submission.assignment, issued.assignment);
  await pupilContext.close();

  await teacher.getByRole('link', { name: 'Проверить работу' }).click();
  await teacher.locator('#result-code').fill(submission.code);
  await teacher.locator('#read-result').click();
  const save = teacher.locator('#accept-result');
  await save.click();
  await teacher.getByText('Отправить разбор или собрать разминку', { exact: true }).click();
  await teacher.locator('#build-warmup').click();
  assert.match(await teacher.locator('#warmup-plan').innerText(), /график|Координата/i);
  await teacher.locator('#warm-to-homework').click();
  assert.match(teacher.url(), /lesson=1001&step=homework/);
  assert.ok(Number(await teacher.locator('#draft-count').textContent()) > 3);

  await teacher.goto('teach.html?view=lesson&lesson=2');
  await teacher.locator('#teacher-view h1').waitFor();
  await teacher.locator('.lesson-record > summary').click();
  await teacher.locator('#lesson-note').fill('Заметка ОГЭ А');
  await teacher.locator('[data-next=explain]').click();
  await teacher.locator('[data-next=together]').click();
  await teacher.locator('[data-next=practice]').click();
  await teacher.locator('[data-step=homework]').click();
  await teacher.locator('#issue-homework').click();
  const legacyURL = await teacher.getByRole('link', { name: 'Открыть ученическую подборку' }).getAttribute('href');
  assert.ok(homework(legacyURL).ids.every(id => !taskIds.has(id)));
  await teacher.locator('#student').selectOption('bob-fixture');
  const stored = await teacher.evaluate(() => JSON.parse(localStorage.getItem('oge-workspace-v1')));
  const [alice, bob] = stored.students;
  assert.equal(alice.notes[2], 'Заметка ОГЭ А');
  assert.equal(alice.notes[1001], 'Заметка ЕГЭ А');
  assert.equal(alice.egeLesson, 1001);
  assert.equal(alice.lesson, 2);
  assert.deepEqual(new Set(alice.assignments.map(assignment => assignment.exam)), new Set(['ege','oge']));
  assert.equal(alice.results[0].exam, 'ege');
  assert.equal(bob.assignments.length, 0);
  assert.equal(bob.results.length, 0);
  assert.deepEqual(bob.notes, {});
  assert.deepEqual(errors, []);
  await context.close();
  console.log('PASS: protected fixture, all EGE and OGE blocks with a board and resource, EGE submission and warm-up, legacy OGE issue, two profiles and distinct exams.');
}

(async () => {
  let browser;
  try {
    if (fixture) encryptedFixture = makeTeacherFixture();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}${prefix}`;
    browser = await chromium.launch({ executablePath: process.env.OGE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
    await checkPublic(browser, base);
    if (encryptedFixture) await checkClassroom(browser, base);
    else console.log('SKIP: encrypted classroom fixture requires separate local teaching sources.');
  } finally {
    if (browser) await browser.close();
    server.close();
    if (encryptedFixture) fs.rmSync(encryptedFixture, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
