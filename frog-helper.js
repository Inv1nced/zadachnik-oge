(() => {
'use strict';

if (document.querySelector('.oge-frog') || document.documentElement.classList.contains('workspace-embed')) return;
const root = new URL('.', document.currentScript.src);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const frog = document.createElement('aside');
frog.className = 'oge-frog';
frog.setAttribute('aria-label', 'Лягушка — ИИ-помощник по физике');
frog.innerHTML = `
  <section id="frog-chat" class="frog-bubble" hidden aria-label="Лягушка — ИИ-помощник">
    <header>
      <strong>Лягушка · ИИ по физике</strong>
      <button class="frog-close" type="button" aria-label="Закрыть помощника">×</button>
    </header>
    <div class="frog-chat-log" aria-label="Переписка" tabindex="0" hidden></div>
    <form class="frog-form">
      <div class="frog-task" hidden>
        <span></span>
        <button type="button" class="frog-clear" aria-label="Убрать условие задачи">×</button>
      </div>
      <label for="frog-question" class="frog-sr">Вопрос лягушке</label>
      <textarea id="frog-question" rows="2" maxlength="1200" required placeholder="На каком шаге ты застрял?"></textarea>
      <div class="frog-form-actions">
        <small class="frog-quota">5 вопросов в день</small>
        <button class="frog-send" type="submit" disabled>Отправить</button>
      </div>
      <p class="frog-status" role="status" aria-atomic="true"></p>
    </form>
  </section>
  <button class="frog-body" type="button" aria-controls="frog-chat" aria-expanded="false" aria-label="Задать вопрос лягушке"><svg viewBox="0 0 128 96" aria-hidden="true"><g class="frog-sprite"><path fill="#41424d" d="M24 4h24v8h32V4h24v8h8v24h8v16h8v28h-8v8H8v-8H0V52h8V36h8V12h8z"/><path fill="#86b75d" d="M24 16h24v4h32v-4h24v24h8v16h8v20h-8v8H16v-8H8V56h8V40h8z"/><path fill="#38a16c" d="M8 60h8v12h16v12h24V72h16v12h24V72h16V60h8v16h-8v8H16v-8H8z"/><path fill="#c9ff72" d="M16 40h8v12H12v-8h4zM104 40h8v4h4v8h-12zM8 56h8v8H8zM112 56h8v8h-8zM52 64h24v12H52z"/><rect x="56" y="76" width="16" height="8" fill="#c4db59"/><g class="frog-eye"><path fill="#fffde7" d="M24 12h20v4h4v16h-4v4H24v-4h-4V16h4z"/><g class="frog-pupil"><rect x="29" y="20" width="10" height="12" rx="2" fill="#344f50"/><rect x="30" y="20" width="4" height="4" fill="#fff"/><rect x="35" y="28" width="2" height="2" fill="#b8e5d8"/></g></g><g class="frog-eye"><path fill="#fffde7" d="M84 12h20v4h4v16h-4v4H84v-4h-4V16h4z"/><g class="frog-pupil"><rect x="89" y="20" width="10" height="12" rx="2" fill="#344f50"/><rect x="90" y="20" width="4" height="4" fill="#fff"/><rect x="95" y="28" width="2" height="2" fill="#b8e5d8"/></g></g><path fill="#e9a896" d="M28 44h10v5H28zM90 44h10v5H90z"/><path class="frog-smile" fill="#364953" d="M52 47h4v6h16v-6h4v8h-4v3H56v-3h-4z"/><g class="frog-open-mouth"><rect x="52" y="48" width="24" height="16" fill="#364953"/><rect x="58" y="58" width="12" height="6" fill="#e69c9f"/></g><path fill="#364953" d="M28 68h6v12h-6zM94 68h6v12h-6z"/></g></svg><span class="frog-name">Задать вопрос</span></button>`;
document.body.append(frog);
const body = frog.querySelector('.frog-body');
const navButton = document.createElement('button');
navButton.id = 'frog-nav-toggle';
navButton.type = 'button';
navButton.textContent = '🐸 Помощник';
navButton.setAttribute('aria-controls', 'frog-chat');
navButton.setAttribute('aria-expanded', 'false');
document.querySelector('.site-nav')?.append(navButton);

const bubble = frog.querySelector('.frog-bubble');
const closeButton = frog.querySelector('.frog-close');
const form = frog.querySelector('.frog-form');
const input = frog.querySelector('#frog-question');
const send = frog.querySelector('.frog-send');
const taskBadge = frog.querySelector('.frog-task');
const log = frog.querySelector('.frog-chat-log');
const status = frog.querySelector('.frog-status');
const quota = frog.querySelector('.frog-quota');
let task = '';
let endpoint, device, quotaRequest, inFlight;
let remaining = null;
let resetTimer;
let trigger = null;
let locked = false;

function setQuota(value) {
  remaining = Number.isInteger(value) && value >= 0 && value <= 5 ? value : null;
  quota.textContent = remaining === null ? '5 вопросов в день' : `Осталось ${remaining} из 5 сегодня`;
}

function controls() {
  send.disabled = locked || !!inFlight || !!quotaRequest || !endpoint || remaining === 0;
  input.readOnly = locked || !!inFlight;
  frog.querySelector('.frog-clear').disabled = !!inFlight;
}

function deviceId() {
  if (device) return device;
  try {
    device = localStorage.getItem('invariant-frog-device');
    if (!device) {
      device = crypto.randomUUID();
      localStorage.setItem('invariant-frog-device', device);
      device = localStorage.getItem('invariant-frog-device');
    }
  } catch {
    device = crypto.randomUUID();
  }
  return device;
}

async function connect() {
  if (endpoint) return endpoint;
  const response = await fetch(new URL('frog-api.json', root), {
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error();
  const config = await response.json();
  if (!config.url) throw new Error('ИИ пока не подключён.');
  const url = new URL(config.url, root);
  if (url.protocol !== 'https:' && url.origin !== location.origin) throw new Error();
  endpoint = url.href.replace(/\/$/, '');
  return endpoint;
}

function showQuota() {
  if (quotaRequest || locked || inFlight) return;
  status.textContent = 'Проверяю, сколько вопросов осталось…';
  quotaRequest = (async () => {
    try {
      const response = await fetch((await connect()) + '/quota', {
        headers: { 'X-Frog-Device': deviceId() }, signal: AbortSignal.timeout(8_000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось проверить лимит.');
      setQuota(data.remaining);
      clearTimeout(resetTimer);
      if (Number.isFinite(data.resetAt) && data.resetAt > Date.now()) {
        resetTimer = setTimeout(() => {
          if (!bubble.hidden) showQuota();
        }, data.resetAt - Date.now() + 300);
      }
      status.textContent = remaining === 0 ? 'Новые вопросы будут доступны в полночь по Москве.' : '';
    } catch (error) {
      endpoint = null;
      setQuota(null);
      status.textContent = error.message && !(error instanceof TypeError) && !(error instanceof DOMException)
        ? error.message : 'ИИ пока недоступен. Попробуй позже.';
    } finally {
      quotaRequest = null;
      controls();
    }
  })();
  controls();
}

function close(restoreFocus = false) {
  bubble.hidden = true;
  body.setAttribute('aria-expanded', 'false');
  navButton.setAttribute('aria-expanded', 'false');
  if (restoreFocus && trigger?.isConnected && !trigger.disabled) trigger.focus({ preventScroll: true });
}

function open(button) {
  if (locked) return;
  trigger = button;
  bubble.hidden = false;
  body.setAttribute('aria-expanded', 'true');
  navButton.setAttribute('aria-expanded', 'true');
  input.focus({ preventScroll: true });
  showQuota();
}

function setTask(label = '', condition = '') {
  task = condition ? [label, condition].filter(Boolean).join('\n').slice(0, 3000) : '';
  taskBadge.hidden = !task;
  taskBadge.querySelector('span').textContent = label || 'Условие задачи';
}

function assessmentChanged() {
  const next = document.body.dataset.frogAssessment === 'active' || !!window.OgeFrogGuide?.pending(key => localStorage.getItem(key));
  if (next && !locked) {
    inFlight?.abort();
    close();
  }
  locked = next;
  body.disabled = locked;
  navButton.disabled = locked;
  frog.querySelector('.frog-name').textContent = locked ? 'До конца теста' : 'Задать вопрос';
  navButton.title = locked ? 'Помощник доступен после сдачи теста' : '';
  controls();
}

function addMessage(className, message) {
  const node = document.createElement('p');
  node.className = className;
  node.textContent = message;
  log.hidden = false;
  log.append(node);
  while (log.children.length > 10) log.firstElementChild.remove();
  log.scrollTop = log.scrollHeight;
  return node;
}

async function readAnswer(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let doneEvent = false;
  const accept = line => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    doneEvent ||= event.done === true;
    onEvent(event);
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      let newline;
      while ((newline = pending.indexOf('\n')) !== -1) {
        accept(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
      }
      if (done) {
        accept(pending);
        if (!doneEvent) throw new Error('Ответ прервался. Попробуй ещё раз.');
        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question || send.disabled) return;
  const controller = new AbortController();
  inFlight = controller;
  controls();
  const userMessage = addMessage('frog-user-message', question);
  const answer = addMessage('frog-answer', '');
  answer.hidden = true;
  frog.classList.add('is-talking');
  status.textContent = 'Думаю над вопросом…';
  let assembled = '';
  let frame = 0;
  let errored = false;
  const paint = () => {
    frame = 0;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
    answer.hidden = false;
    answer.textContent = assembled;
    if (nearBottom) log.scrollTop = log.scrollHeight;
  };
  try {
    const response = await fetch(endpoint + '/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Frog-Device': deviceId() },
      signal: controller.signal,
      body: JSON.stringify({ question, task }),
    });
    if (!response.ok) {
      const data = await response.json();
      if (Number.isInteger(data.remaining)) setQuota(data.remaining);
      throw new Error(data.error || 'Не удалось отправить вопрос.');
    }
    const header = response.headers.get('X-Frog-Remaining');
    if (header !== null) setQuota(Number(header));
    await readAnswer(response, event => {
      if (Number.isInteger(event.remaining)) setQuota(event.remaining);
      if (event.error) throw new Error(event.error);
      if (typeof event.delta !== 'string') return;
      assembled += event.delta;
      status.textContent = 'Пишу ответ…';
      if (!frame) frame = requestAnimationFrame(paint);
    });
    input.value = '';
  } catch (error) {
    errored = true;
    status.textContent = controller.signal.aborted ? '' :
      (error instanceof TypeError ? 'Связь прервалась. Попробуй ещё раз.' : error.message);
    if (!assembled) {
      userMessage.remove();
      answer.remove();
      log.hidden = log.children.length === 0;
    }
  } finally {
    cancelAnimationFrame(frame);
    if (assembled) paint();
    if (!errored) status.textContent = 'Ответ готов. Лягушка может ошибаться.';
    frog.classList.remove('is-talking');
    inFlight = null;
    controls();
  }
});

function toggle(button) {
  if (bubble.hidden) open(button);
  else close();
}
navButton.onclick = () => toggle(navButton);
body.onclick = () => toggle(body);
closeButton.onclick = () => close(true);
frog.querySelector('.frog-clear').onclick = () => setTask();
frog.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !bubble.hidden) close(true);
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !send.disabled) form.requestSubmit();
});

document.addEventListener('click', event => {
  const button = event.target.closest('[data-frog-task]');
  if (!button || locked) return;
  const card = button.closest('[data-id]');
  const condition = card?.querySelector('.tt');
  if (!condition) return;
  if (!inFlight) {
    const label = card.querySelector('.tn, .qn')?.textContent.trim();
    const text = condition.innerText + (condition.querySelector('img') ? '\nВ задаче есть рисунок. Изображение в чат не передано.' : '');
    setTask(label, text);
    if (!input.value.trim()) input.value = 'Подскажи первый шаг.';
  }
  open(button);
});

addEventListener('oge-study-state', assessmentChanged);
addEventListener('storage', assessmentChanged);
addEventListener('pageshow', assessmentChanged);
assessmentChanged();

if (!reduced.matches) {
  const pupils = frog.querySelectorAll('.frog-pupil');
  let frame = 0;
  addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || frame || !body.getClientRects().length || reduced.matches) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const rect = body.getBoundingClientRect();
      const x = Math.max(-3, Math.min(3, (event.clientX - rect.left - rect.width / 2) / 65));
      const y = Math.max(-2, Math.min(2, (event.clientY - rect.top - rect.height / 3) / 85));
      pupils.forEach(pupil => { pupil.style.transform = `translate(${x}px, ${y}px)`; });
    });
  }, { passive: true });
}
})();
