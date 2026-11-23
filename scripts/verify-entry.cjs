/* Browser checks for the exam chooser, visual handoff and remembered choice. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const waitForForm = page => page.locator('#fin2').waitFor();

async function newEntryContext(browser, options) {
  const context = await browser.newContext(options);
  // Entry uses a local font. The external font on legacy pages is unrelated to route checks.
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  return context;
}

async function checkEntryRoutes(browser, base) {
  const context = await newEntryContext(browser, {baseURL:base, reducedMotion:'reduce'});
  try {
    const page = await context.newPage();
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto(base);
    assert.equal(await page.getByRole('heading', {name:'Выбери свой экзамен'}).count(), 1);
    assert.deepEqual(
      await page.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href'))),
      ['teach.html', 'oge.html', 'ege.html', 'https://fipi.ru/ege/demoversii-specifikacii-kodifikatory']
    );
    assert.ok(!requests.some(url => /bank\/|zadachnik\.js|physics-lab-loader|teacher-workspace/.test(url)));
    await page.getByRole('link', {name:'Кабинет репетитора'}).click();
    assert.equal(page.url(), base+'teach.html');

    // Board invitation routing is verified without connecting to the external collaboration service.
    await page.route('**/oge.html?preserve=*', route => route.fulfill({body:'Маршрут доски'}));
    for (const fragment of [
      '?section=optics&block=36&source=practice&x=%2B#anchor',
      '?preserve=%2B#board=free&room=room%2Blegacy',
      '?workspace=1&extra=1#extra',
    ]) {
      await page.goto(base+fragment);
      await page.waitForURL(base+'oge.html'+fragment);
    }
    await page.goto('index.html#set=impulse');
    await page.waitForURL(base+'oge.html#set=impulse');
    await waitForForm(page);
    assert.equal(await page.getByRole('link', {name:'Уроки ОГЭ'}).getAttribute('href'), base+'lessons.html?exam=oge');
    assert.equal(await page.getByRole('link', {name:'Демоверсия ОГЭ'}).getAttribute('href'), 'https://fipi.ru/oge/demoversii-specifikacii-kodifikatory');

    // An actual iframe is required for the cabinet's workspace bridge.
    await page.route('**/entry-iframe-test.html', route => route.fulfill({
      contentType:'text/html',
      body:'<script>addEventListener("message", e => document.body.dataset.bridge = e.data.type)</script><iframe src="index.html?workspace=1"></iframe>',
    }));
    await page.goto('entry-iframe-test.html');
    await page.waitForFunction(() => document.body.dataset.bridge === 'board-ready');
    assert.ok(page.frames().some(frame => frame.url() === base+'oge.html?workspace=1'));
  } finally { await context.close(); }
  console.log('PASS: entry links and payload, legacy queries, published homework, board invitation URL and iframe bridge.');
}

async function checkEntryInteraction(browser, base) {
  const context = await newEntryContext(browser, {baseURL:base, viewport:{width:1440,height:900}});
  try {
    // When testing the entry branch alone, the EGE course belongs to another branch.
    if (!fs.existsSync(path.join(root, 'ege.html'))) {
      await context.route('**/ege.html', route => route.fulfill({contentType:'text/html', body:'<h1>Проверка маршрута ЕГЭ</h1>'}));
    }
    const page = await context.newPage();
    for (const [width,height] of [[360,700],[390,844],[768,900],[1440,900],[740,320]]) {
      await page.setViewportSize({width,height});
      await page.goto(base);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const [oge,ege] = await Promise.all((await page.locator('.exam').all()).map(link => link.boundingBox()));
      assert.equal(ege.y > oge.y, width <= 650);
      await page.getByRole('link', {name:'Демоверсия ЕГЭ'}).scrollIntoViewIfNeeded();
      const mocks = await page.getByRole('link', {name:'Демоверсия ЕГЭ'}).boundingBox();
      assert.ok(mocks.y >= 0 && mocks.y + mocks.height <= height);
    }

    await page.setViewportSize({width:1440,height:900});
    await page.goto(base);
    const oge = page.getByRole('link', {name:/Я ученик ОГЭ/});
    const ege = page.getByRole('link', {name:/Я ученик ЕГЭ/});
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Кабинет репетитора');
    await page.keyboard.press('Tab');
    assert.ok(await oge.evaluate(link => link.matches(':focus-visible')));
    assert.equal(await oge.locator('.exam-shine').evaluate(word => word.getAnimations()[0]?.id), 'shine');
    await page.keyboard.press('Tab');
    assert.ok(await ege.evaluate(link => link.matches(':focus-visible')));
    await page.keyboard.press('Enter');
    await ege.locator('canvas:not([hidden])').waitFor();
    assert.equal(await oge.locator('canvas:not([hidden])').count(), 0);
    await page.waitForURL(base+'ege.html');
    await page.goBack();
    assert.equal(await page.locator('.exam.is-choosing').count(), 0);
    const popupPromise = context.waitForEvent('page');
    await oge.click({modifiers:['ControlOrMeta']});
    const popup = await popupPromise;
    await popup.waitForURL(base+'oge.html', {waitUntil:'commit'});
    await popup.close();
    assert.equal(page.url(), base);
    await oge.click();
    await page.waitForURL(base+'oge.html', {waitUntil:'commit'});
    await page.goBack();

    await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
    await page.goto('index.html?choose=1');
    await ege.click();
    await page.waitForURL(base+'ege.html');

    const stalled = await context.newPage();
    await stalled.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await stalled.goto('index.html?choose=1');
    await stalled.getByRole('link', {name:/Я ученик ЕГЭ/}).click();
    await stalled.waitForURL(base+'ege.html', {timeout:2000});
  } finally { await context.close(); }

  const touch = await newEntryContext(browser, {baseURL:base, viewport:{width:390,height:844}, hasTouch:true, isMobile:true, deviceScaleFactor:3});
  try {
    await touch.route('**/onest.woff2', async route => {
      await new Promise(resolve => setTimeout(resolve, 1600));
      await route.continue().catch(() => {});
    });
    const page = await touch.newPage();
    const session = await touch.newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', {rate:4});
    await page.goto(base, {waitUntil:'domcontentloaded'});
    assert.equal(await page.evaluate(() => document.fonts.status), 'loading');
    const oge = page.getByRole('link', {name:/Я ученик ОГЭ/});
    const ege = page.getByRole('link', {name:/Я ученик ЕГЭ/});
    for (const link of [oge,ege]) {
      const box = await link.boundingBox();
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForURL(base+'oge.html', {waitUntil:'commit'});

    await page.goBack({waitUntil:'domcontentloaded'});
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await oge.locator('.exam-shine').evaluate(shine => getComputedStyle(shine).display), 'none');
    await oge.tap();
    await page.waitForURL(base+'oge.html', {waitUntil:'commit'});
  } finally { await touch.close(); }

  const withoutJs = await newEntryContext(browser, {baseURL:base, javaScriptEnabled:false});
  try {
    const page = await withoutJs.newPage();
    await page.goto(base);
    await page.getByRole('link', {name:/Я ученик ОГЭ/}).click();
    await page.waitForURL(base+'oge.html', {waitUntil:'commit'});
  } finally { await withoutJs.close(); }
  console.log('PASS: responsive entry, keyboard, modified click, back, first tap, rapid taps on throttled CPU, late font, canvas and frame failures, reduced motion and no JavaScript.');
}

async function checkExamPreference(browser, base) {
  const context = await newEntryContext(browser, {baseURL:base, viewport:{width:390,height:844}});
  try {
    if (!fs.existsSync(path.join(root, 'ege.html'))) {
      await context.route('**/ege.html', route => route.fulfill({
        contentType:'text/html',
        body:`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="entry/exam-handoff.css">
          <script src="entry/exam-preference.js"></script><main><h1>Проверка маршрута ЕГЭ</h1>
          <nav class="exam-switch" aria-label="Курс по физике">
            <a href="oge.html" data-exam-choice="oge">ОГЭ</a>
            <a href="ege.html" data-exam-choice="ege" aria-current="page">ЕГЭ</a>
          </nav></main>`,
      }));
    }
    let releaseBank;
    const bankReady = new Promise(resolve => { releaseBank = resolve; });
    await context.route('**/bank/intro.js*', async route => {
      await bankReady;
      await route.continue().catch(() => {});
    });

    const page = await context.newPage();
    await page.goto(base);
    await page.getByRole('link', {name:/Я ученик ОГЭ/}).click();
    try {
      await page.locator('html[data-entry-departing]').waitFor({state:'attached'});
      await page.waitForURL(base+'oge.html', {waitUntil:'commit'});
      await page.locator('html[data-exam-arrival="waiting"]').waitFor({state:'attached'});
      assert.equal(await page.locator('.physics-lab-overlay').count(), 0);
    } finally {
      releaseBank();
    }
    await page.locator('html[data-exam-arrival]').waitFor({state:'detached'});
    const switcher = page.getByRole('navigation', {name:'Курс по физике'});
    assert.equal(await switcher.getByRole('link', {name:'ОГЭ'}).getAttribute('aria-current'), 'page');

    const freshTab = await context.newPage();
    await freshTab.goto(base);
    await freshTab.waitForURL(base+'oge.html', {waitUntil:'commit'});
    await freshTab.getByRole('link', {name:'INVARIANT · Выбрать экзамен'}).click();
    await freshTab.waitForURL(base+'index.html?choose=1');
    await freshTab.getByRole('heading', {name:'Выбери свой экзамен'}).waitFor();
    await freshTab.close();

    await switcher.getByRole('link', {name:'ЕГЭ'}).click();
    await page.waitForURL(base+'ege.html');
    assert.equal(await switcher.getByRole('link', {name:'ЕГЭ'}).getAttribute('aria-current'), 'page');
    await page.goto(base+'index.html#set=impulse');
    await page.waitForURL(base+'oge.html#set=impulse');
    await waitForForm(page);
    await page.goto(base);
    await page.waitForURL(base+'ege.html');
    await switcher.getByRole('link', {name:'ОГЭ'}).click();
    await page.waitForURL(base+'oge.html', {waitUntil:'commit'});
    await page.reload();
    assert.equal(await page.locator('html[data-exam-arrival]').count(), 0);
  } finally { await context.close(); }
  console.log('PASS: smooth exam landing, remembered choice between tabs, explicit chooser, course switch and legacy homework priority.');
}

module.exports = {checkEntryRoutes, checkEntryInteraction, checkExamPreference};
