import {variantKey} from './config.mjs';

const scope = 'invariant-mock/';
export const attemptPrefix = meta => scope + variantKey(meta) + '/';
const memory = new Map();
let available = true;
try {
  localStorage.setItem(scope + 'probe', '');
  localStorage.removeItem(scope + 'probe');
} catch { available = false; }

export const canSave = () => available;
const keyFor = (meta, id) => attemptPrefix(meta) + id;
const attemptId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)),
  value => value.toString(16).padStart(2, '0')).join('');

export function readAttempt(meta, id) {
  const key = keyFor(meta, id);
  if (available) {
    try {
      const record = JSON.parse(localStorage.getItem(key));
      if (record && record.attemptId === id && record.answers && Number.isFinite(record.deadline)) {
        return record;
      }
    } catch { /* Missing or malformed record. */ }
  }
  return memory.get(key) || null;
}

export function attemptsFor(meta) {
  const prefix = attemptPrefix(meta);
  const keys = new Set(memory.keys());
  if (available) {
    try {
      for (let index = 0; index < localStorage.length; index++) keys.add(localStorage.key(index));
    } catch { available = false; }
  }
  return [...keys].filter(key => key?.startsWith(prefix)).map(key => readAttempt(meta, key.slice(prefix.length)))
    .filter(Boolean).sort((a,b) => b.startedAt - a.startedAt);
}

export function saveAttempt(meta, attempt) {
  const key = keyFor(meta, attempt.attemptId);
  memory.set(key, attempt);
  if (available) {
    try { localStorage.setItem(key, JSON.stringify(attempt)); }
    catch { available = false; }
  }
}

export function createAttempt(meta, now = Date.now()) {
  const attempt = {attemptId:attemptId(), startedAt:now, deadline:now + meta.minutes * 60000,
    current:0, answers:{}, submittedAt:null, expired:false, review:null};
  saveAttempt(meta, attempt);
  return attempt;
}

export function submitAttempt(meta, attempt, now = Date.now()) {
  if (attempt.submittedAt != null) return;
  attempt.expired = now >= attempt.deadline;
  attempt.submittedAt = Math.min(now, attempt.deadline);
  saveAttempt(meta, attempt);
}

export function timeLeft(deadline, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
}
