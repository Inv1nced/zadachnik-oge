const assert = require('node:assert/strict');

async function checkEgeBank(browser, baseURL) {
  for (const width of [360, 390, 1200]) {
    const context = await browser.newContext({baseURL, viewport: {width, height: 850}});
    try {
      const page = await context.newPage();
      const errors = [];
      const requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(new URL(request.url()).pathname));
      const loadedInventory = () => requests.some(path => path.endsWith('/ege-data/v1/catalog.json'));
      const loadedBoard = () => requests.some(path => path.endsWith('/task-board.js'));
      const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.goto('index.html?choose=1');
      await page.getByRole('link', {name: 'Я ученик ЕГЭ, 11 класс'}).click();
      await page.getByRole('heading', {name: 'Задачи по физике', exact: true}).waitFor();
      assert.equal(new URL(page.url()).pathname.split('/').pop(), 'ege-bank.html');
      const sections = page.getByRole('navigation', {name: 'Разделы физики'});
      assert.equal(await sections.getByRole('link').count(), 6);
      assert.equal(await sections.getByRole('link', {name: 'Механика', exact: true}).getAttribute('aria-current'), 'page');
      await noOverflow();

      assert.equal(loadedInventory(), false);
      assert.equal(loadedBoard(), false);
      await page.getByRole('searchbox', {name: 'Найти задачу'}).fill('нерастяжимой нити');
      await page.getByRole('button', {name: 'Найти', exact: true}).click();
      await page.locator('[data-task-card="ballistic-pendulum"]').waitFor();
      assert.equal(loadedInventory(), false);
      await page.goto('ege-bank.html?block=mechanics&topic=circle');
      const opening = page.locator('#topic-circle');
      await opening.waitFor();
      await page.waitForFunction(() => {
        const heading = document.querySelector('#topic-circle').getBoundingClientRect();
        const top = document.querySelector('.topbar').getBoundingClientRect();
        return heading.top >= top.bottom && heading.bottom <= innerHeight;
      });
      await page.goto('ege-bank.html');
      const motion = page.getByRole('link', {name: /Движение по окружности/});
      const momentum = page.getByRole('link', {name: /Импульс и закон его сохранения/});
      const modules = page.getByRole('navigation', {name: 'Модули раздела'});
      assert.equal(await modules.getByRole('link').count(), 7);
      assert.equal(await modules.getByRole('link', {name: /Кинематика/}).getAttribute('aria-current'), 'true');
      await motion.waitFor();
      assert.equal(await momentum.count(), 0);
      await modules.getByRole('link', {name: /Импульс и столкновения/}).click();
      await momentum.waitFor();
      assert.equal(new URL(page.url()).searchParams.get('module'), 'momentum');
      assert.equal(await motion.count(), 0);
      await momentum.click();
      const practice = page.locator('.ege-practice-block.is-open');
      await practice.getByRole('heading', {name: /Импульс и закон его сохранения/}).waitFor();
      assert.ok(await practice.locator('article[data-task-card] .tt').count() >= 3);
      assert.ok(await practice.getByRole('button', {name: 'Проверить', exact: true}).count() >= 2);
      assert.equal(await practice.getByRole('link', {name: /Открыть условие на ФИПИ/}).count(), 0);
      assert.equal(new URL(page.url()).searchParams.get('topic'), 'momentum');
      assert.equal(loadedInventory(), false);
      assert.equal(loadedBoard(), false);
      await noOverflow();
      await page.getByRole('link', {name: 'К уроку', exact: true}).click();
      await page.getByRole('link', {name: 'Задачи по теме', exact: true}).click();
      assert.equal(new URL(page.url()).searchParams.get('lesson'), 'momentum-energy');
      await page.getByRole('link', {name: /Импульс и закон его сохранения/}).waitFor();

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
      await noOverflow();
      await page.goto('ege-bank.html?task=ege-fipi-F23045');
      await page.locator('[data-original] math').first().waitFor();
      await noOverflow();

      await page.goto('ege-bank.html?task=ballistic-pendulum');
      await page.locator('[data-task-card]').waitFor();
      assert.equal(await page.locator('[data-task-card] textarea').count(), 0);
      assert.equal(loadedBoard(), false);
      await page.locator('input[name=answer]').fill('20');
      await page.getByRole('button', {name: 'Проверить итог'}).click();
      await page.getByText('Итог верен', {exact: true}).waitFor();
      await page.reload();
      assert.equal(await page.locator('input[name=answer]').inputValue(), '20');
      await page.getByText('Показать разбор', {exact: true}).click();
      await page.getByRole('button', {name: 'Отметить разобранной'}).click();
      await page.getByText('Разобрана', {exact: true}).last().waitFor();
      await page.getByRole('button', {name: 'Доска для решения'}).click();
      await page.locator('#bdCv').waitFor();
      assert.equal(loadedBoard(), true);
      assert.match(await page.locator('#bdTb').innerText(), /нерастяжимой нити/);
      await page.getByRole('button', {name: 'Закрыть доску'}).click();
      assert.equal(await page.locator('#bd').isVisible(), false);
      await noOverflow();

      await page.goto('ege-bank.html?view=progress');
      await page.getByRole('heading', {name: 'Прогресс ЕГЭ'}).waitFor();
      assert.match(await page.locator('.ege-progress-summary').innerText(), /Ответы проверены/);

      assert.equal(loadedInventory(), false);
      await page.goto('ege-bank.html');
      await page.getByRole('link', {name: 'Каталог ФИПИ', exact: true}).click();
      await page.getByRole('heading', {name: 'Каталог ФИПИ'}).waitFor();
      assert.equal(loadedInventory(), true);
      const referenceCount = page.locator('#task-list .mini-count');
      assert.equal((await referenceCount.innerText()).replace(/\s/g, ''), '2344задачи');
      await page.getByRole('combobox', {name: 'Раздел'}).selectOption('mechanics');
      await page.waitForFunction(() => document.querySelector('#task-list .mini-count')?.textContent.includes('691'));
      await page.getByRole('combobox', {name: 'Раздел'}).selectOption('');
      await page.getByRole('searchbox', {name: 'Код или тема'}).fill('474F4B');
      await page.getByRole('button', {name: 'Найти', exact: true}).click();
      await page.getByRole('link', {name: /474F4B/}).waitFor();
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
        await page.goto('ege-bank.html?view=fipi');
        await page.getByRole('heading', {name: 'Каталог ФИПИ'}).waitFor();
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
      console.log('PASS: direct EGE entry, inline topic tasks, progress, lazy FIPI/board, legacy links, visuals, answers, and layout at ' + width + 'px.');
    } finally { await context.close(); }
  }
}

module.exports = {checkEgeBank};
