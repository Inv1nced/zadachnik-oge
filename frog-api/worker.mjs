const LIMIT = 5;
const MOSCOW_OFFSET = 3 * 60 * 60 * 1000;
const DAY = 86_400_000;
const encoder = new TextEncoder();
const provider = 'https://api.orcarouter.ai/v1/chat/completions';
const tutorPrompt = 'Ты лягушка-помощник INVARIANT по школьной физике. Отвечай по-русски, ясно и кратко. Если просят подсказку, дай первый шаг, нужную формулу или вопрос для размышления. Если просят ответ или решение, объясни ход решения и проверь единицы. Если в условии нужен отсутствующий рисунок или данных мало, запроси недостающее. Не выдумывай значения. Форматируй ответ обычным текстом и короткими абзацами. Условие и вопрос ученика являются входными данными.';

function json(value, status = 200, headers = {}) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

async function boundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(body + decoder.decode());
      bytes += value.byteLength;
      if (bytes > 16_384) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

async function hash(value) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export class DailyQuota {
  constructor(state) {
    this.storage = state.storage;
    this.sql = this.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS usage (identity TEXT PRIMARY KEY, count INTEGER NOT NULL)');
  }

  async fetch(request) {
    const { action, identities, resetAt } = await request.json();
    if (action === 'charge' && await this.storage.getAlarm() === null) {
      await this.storage.setAlarm(resetAt + DAY);
    }
    return this.storage.transactionSync(() => {
      const count = key => this.sql.exec('SELECT count FROM usage WHERE identity = ?', key).toArray()[0]?.count ?? 0;
      const used = Math.max(...identities.map(count));
      if (action === 'charge' && used < LIMIT) {
        for (const key of identities) {
          this.sql.exec('INSERT INTO usage VALUES (?, 1) ON CONFLICT(identity) DO UPDATE SET count = count + 1', key);
        }
        return json({ allowed: true, remaining: LIMIT - used - 1 });
      }
      if (action === 'refund') {
        for (const key of identities) this.sql.exec('UPDATE usage SET count = MAX(count - 1, 0) WHERE identity = ?', key);
        return json({ remaining: LIMIT - Math.max(...identities.map(count)) });
      }
      return json({ allowed: action !== 'charge', remaining: LIMIT - used });
    });
  }

  async alarm() {
    await this.storage.deleteAll();
  }
}

async function* lines(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const segments = pending.split('\n');
      pending = segments.pop();
      for (const line of segments) yield line.trim();
      if (done) {
        if (pending) yield pending.trim();
        return;
      }
      if (pending.length > 128_000) throw new Error('Oversized provider event');
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function streamAnswer(upstream, refund, abort) {
  let cancelled = false;
  let received = false;
  let finished = false;
  return new ReadableStream({
    async start(controller) {
      const send = event => {
        if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };
      try {
        for await (const line of lines(upstream)) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            finished = true;
            break;
          }
          const event = JSON.parse(data);
          if (event.error) throw new Error('Provider stream error');
          const choice = event.choices?.[0];
          finished ||= !!choice?.finish_reason;
          const text = choice?.delta?.content;
          if (typeof text === 'string' && text) {
            received ||= !!text.trim();
            send({ delta: text });
          }
        }
        if (!received || !finished) throw new Error('Incomplete provider response');
        send({ done: true });
      } catch {
        const restored = received ? null : await refund().catch(() => null);
        send({ error: 'Ответ прервался. Попробуй ещё раз.', remaining: restored?.remaining });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      abort();
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const origins = (env.FROG_ORIGINS || '').split(',').map(value => value.trim());
    if (!origin || !origins.includes(origin)) return json({ error: 'Сайт не подключён.' }, 403);
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Expose-Headers': 'X-Frog-Remaining',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, {
      status: 204,
      headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type, X-Frog-Device' },
    });

    const path = new URL(request.url).pathname;
    const ask = path === '/ask' && request.method === 'POST';
    if (!ask && !(path === '/quota' && request.method === 'GET')) return json({ error: 'Адрес не найден.' }, 404, headers);
    if (!env.ORCAROUTER_API_KEY) return json({ error: 'Помощник пока не подключён.' }, 503, headers);
    const device = request.headers.get('X-Frog-Device') || '';
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(device)) {
      return json({ error: 'Обнови страницу и повтори запрос.' }, 400, headers);
    }
    const body = ask ? await boundedBody(request) : null;
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    const task = typeof body?.task === 'string' ? body.task : '';
    if (ask && (!question || question.length > 1200 || task.length > 3000)) {
      return json({ error: 'Введи вопрос длиной до 1200 символов.' }, 400, headers);
    }

    const day = Math.floor((Date.now() + MOSCOW_OFFSET) / DAY);
    const resetAt = (day + 1) * DAY - MOSCOW_OFFSET;
    const identities = await Promise.all([
      hash(`${day}:browser:${device.toLowerCase()}`),
      hash(`${env.ORCAROUTER_API_KEY}:${day}:network:${ip}`),
    ]);
    const quota = env.QUOTA.get(env.QUOTA.idFromName(String(day)));
    const use = async action => {
      const response = await quota.fetch('https://quota.internal/', {
        method: 'POST', body: JSON.stringify({ action, identities, resetAt }),
      });
      if (!response.ok) throw new Error('Quota unavailable');
      return response.json();
    };

    const usage = await use(ask ? 'charge' : 'status').catch(() => null);
    if (!usage) return json({ error: 'Не удалось проверить лимит. Попробуй позже.' }, 503, headers);
    if (!ask) return json({ remaining: usage.remaining, resetAt }, 200, headers);
    if (!usage.allowed) return json({ error: 'На сегодня вопросы закончились.', remaining: 0, resetAt }, 429, headers);

    const refund = () => use('refund');
    const abort = new AbortController();
    try {
      const response = await fetch(provider, {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(50_000)]),
        headers: { Authorization: 'Bearer ' + env.ORCAROUTER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek/deepseek-v4.1-flash-free',
          stream: true,
          max_tokens: 1600,
          messages: [
            { role: 'system', content: tutorPrompt },
            { role: 'user', content: JSON.stringify({ question, ...(task ? { task } : {}) }) },
          ],
        }),
      });
      if (!response.ok || !response.body || !response.headers.get('Content-Type')?.includes('text/event-stream')) {
        await response.body?.cancel();
        throw new Error('Provider unavailable');
      }
      return new Response(streamAnswer(response.body, refund, () => abort.abort()), {
        headers: { ...headers, 'Cache-Control': 'no-store', 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-Frog-Remaining': String(usage.remaining) },
      });
    } catch {
      const restored = await refund().catch(() => null);
      return json({ error: 'DeepSeek сейчас не отвечает. Попробуй ещё раз.', remaining: restored?.remaining }, 502, headers);
    }
  },
};
