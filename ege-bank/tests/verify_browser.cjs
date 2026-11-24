const assert = require('node:assert/strict');

async function checkEgeBank(browser, baseURL) {
  for (const width of [360, 390, 1200]) {
    const context = await browser.newContext({baseURL, viewport: {width, height: 850}});
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.goto('index.html?choose=1');
      await page.getByRole('link', {name: 'Я ученик ЕГЭ, 11 класс'}).click();
      await page.getByRole('link', {name: 'Открыть банк задач ЕГЭ'}).click();
      await page.getByRole('heading', {name: 'Банк задач', exact: true}).waitFor();
      assert.equal(await page.locator('.mods .mod').count(), 6);
      await noOverflow();

      await page.getByRole('link', {name: /Механика.*задач/}).click();
      await page.getByRole('link', {name: /Импульс, работа и энергия/}).click();
      await page.getByRole('navigation', {name: 'Подтемы'}).getByRole('link', {name: /Импульс и закон его сохранения/}).click();
      await page.getByRole('heading', {name: 'Импульс и закон его сохранения', exact: true}).waitFor();
      await noOverflow();
      await page.getByRole('link', {name: 'К уроку', exact: true}).click();
      await page.getByRole('link', {name: 'Задачи по теме', exact: true}).click();
      assert.equal(new URL(page.url()).searchParams.get('lesson'), 'momentum-energy');

      await page.goto('ege-bank.html?task=impulse-force-graph');
      await page.locator('.mock-figure svg').waitFor();
      await page.getByRole('button', {name: 'Увеличить рисунок'}).click();
      await page.getByRole('dialog').waitFor();
      await page.getByRole('button', {name: 'Закрыть'}).click();
      await page.locator('input[name=answer]').fill('11');
      await page.getByRole('button', {name: 'Проверить'}).click();
      await page.getByText('Проверь ответ', {exact: true}).waitFor();
      await page.locator('input[name=answer]').fill('12,0');
      await page.getByRole('button', {name: 'Проверить'}).click();
      await page.getByText('Верно', {exact: true}).waitFor();
      await page.reload();
      assert.equal(await page.locator('input[name=answer]').inputValue(), '12,0');
      await page.getByRole('link', {name: 'Следующая →'}).click();
      assert.notEqual(new URL(page.url()).searchParams.get('task'), 'impulse-force-graph');
      await page.getByRole('link', {name: '← К подборке'}).click();
      assert.ok(new URL(page.url()).hash.startsWith('#row-'));
      await noOverflow();

      await page.goto('ege-bank.html?task=ege-fipi-17F546');
      await page.locator('.data-table').waitFor();
      assert.equal(await page.locator('.data-table tbody tr').count(), 5);
      await page.locator('input[name=answer]').fill('5, 3');
      await page.getByRole('button', {name: 'Проверить'}).click();
      await page.getByText('Верно', {exact: true}).waitFor();
      await noOverflow();

      await page.goto('ege-bank.html?task=ege-fipi-4EAC46');
      const figure = page.locator('.figure-link img').first();
      await figure.waitFor();
      await figure.evaluate(img => img.decode());
      assert.ok(await page.locator('[data-original] math').count());
      await noOverflow();

      await page.goto('ege-bank.html?task=ballistic-pendulum');
      const draft = page.locator('textarea[data-draft]');
      await draft.fill('Сначала закон сохранения горизонтальной проекции импульса.');
      await page.reload();
      assert.match(await draft.inputValue(), /проекции импульса/);
      await page.getByText('Показать разбор', {exact: true}).click();
      await page.getByRole('button', {name: 'Отметить разобранной'}).click();
      await page.getByText('Разобрана', {exact: true}).last().waitFor();
      await page.getByRole('button', {name: 'Доска для решения'}).click();
      await page.locator('#bdCv').waitFor();
      assert.match(await page.locator('#bdTb').innerText(), /нерастяжимой нити/);
      await page.getByRole('button', {name: 'Закрыть доску'}).click();
      assert.equal(await page.locator('#bd').isVisible(), false);
      await noOverflow();

      await page.goto('ege-bank.html?task=ege-fipi-474F4B');
      const original = page.getByRole('link', {name: /Открыть условие на ФИПИ/});
      await original.waitFor();
      assert.equal(new URL(await original.getAttribute('href')).searchParams.get('qid'), '474F4B');

      await page.goto('ege-bank.html');
      await page.getByRole('link', {name: 'По номерам ЕГЭ'}).click();
      await page.getByRole('link', {name: /^№3 · /}).click();
      await page.getByRole('heading', {name: 'Задания №3'}).waitFor();
      assert.ok(await page.locator('.quest-list .task').count());
      assert.ok(await page.evaluate(() => Object.keys(localStorage).includes('invariant-ege-bank-v1')));
      await noOverflow();
      if (width === 390) {
        const row = {
          id: 'ege-fipi-474F4B', sourceCode: '474F4B', status: 'ready', kes: ['2.2.1'], topicSlugs: ['measurement'],
          title: 'Локальная карточка для проверки', answerType: 'short',
          sourceUrl: 'https://ege.fipi.ru/bank/index.php?proj=BA1F39653304A5B041B656915DC36B38&search=1&qid=474F4B',
          cardPath: 'ege-data/v1/cards/test-card.json',
        };
        const payload = {
          objects: {'catalog.json': {schemaVersion: 1, tasks: [row]},
            'test-card.json': {id: row.id, parts: [{type: 'text', text: 'Условие из личной копии.'}]}},
          assets: {},
        };
        const bank = page.locator('[data-personal-bank]');
        await bank.locator('summary').click();
        await bank.locator('input').setInputFiles({
          name: 'invariant-test.html', mimeType: 'text/html',
          buffer: Buffer.from('<script type="application/json" id="offline-data">' + JSON.stringify(payload) + '</script>'),
        });
        await bank.getByText('Полный банк подключён').waitFor();
        await page.goto('ege-bank.html?task=ege-fipi-474F4B');
        await page.getByText('Условие из личной копии.', {exact: true}).waitFor();
        await page.reload();
        await page.getByText('Условие из личной копии.', {exact: true}).waitFor();
        await bank.locator('summary').click();
        await bank.getByRole('button', {name: 'Отключить личную копию'}).click();
        await page.getByRole('link', {name: /Открыть условие на ФИПИ/}).waitFor();
      }
      assert.deepEqual(errors, []);
      console.log('PASS: EGE bank links, topic and number filters, images, MathML, table, answers, drafts, and layout at ' + width + 'px.');
    } finally { await context.close(); }
  }
}

module.exports = {checkEgeBank};
