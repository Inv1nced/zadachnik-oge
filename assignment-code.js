/* Formats shared by the bank, published assignments and the teacher's workspace. */
(function (root) {
  'use strict';

  function encode(prefix, value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    for (let i = 0; i < bytes.length; i += 16384) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    }
    return prefix + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(prefix, text) {
    const code = String(text).match(new RegExp(prefix + '[A-Za-z0-9_-]+'))?.[0];
    if (!code) throw new Error(`В сообщении нет кода ${prefix}`);
    try {
      const binary = atob(code.slice(prefix.length).replace(/-/g, '+').replace(/_/g, '/'));
      const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
      return { code, data };
    } catch {
      throw new Error('Код повреждён. Скопируй сообщение целиком.');
    }
  }

  function taskId(value) {
    if (typeof value !== 'string' || !/^-?[a-z0-9]+$/i.test(value)) throw new Error('Неверный номер задания в коде.');
    const id = Number.parseInt(value, 36);
    if (!id || !Number.isSafeInteger(id)) throw new Error('Неверный номер задания в коде.');
    return id;
  }

  function validateIds(ids) {
    if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length) {
      throw new Error('В работе должно быть от 1 до 100 разных заданий.');
    }
    return ids;
  }

  function homework(text) {
    const { code, data } = decode('HW-', text);
    if (!Array.isArray(data.i) || (data.k != null && !Array.isArray(data.k)) ||
        (data.a != null && !Array.isArray(data.a))) throw new Error('Неверный состав домашки.');
    const ids = validateIds(data.i.map(taskId));
    const allowedIds = new Set(ids);
    const rows = data.a || [];
    const isFigure = root.OgeCore?.isFigure || (typeof require === 'function' && require('./learning-core.js').isFigure);
    if (new Set(rows.map(row => row?.[0])).size !== rows.length || rows.some(row =>
      !Array.isArray(row) || !allowedIds.has(row[0]) || row[0] > -100000 ||
      typeof row[6] !== 'string' || !row[6].trim() || row[6].length > 10000 ||
      !['b', 'm', 'q', 'r', 'e'].includes(row[3]) || !['A','F'].includes(row[5]) ||
      (row[5] === 'F' && row[0] > -0x10000000) ||
      (row[7] != null && (!Array.isArray(row[7]) || row[7].some(img=>!isFigure(img)))))) {
      throw new Error('Повреждено авторское задание или его рисунок.');
    }
    const keys = data.k || [];
    if (keys.some(key => typeof key !== 'string' || !/^(?:\d{1,2}|X)-[A-Z0-9]{6}$/.test(key))) {
      throw new Error('Повреждены коды блоков.');
    }
    return { code, ids, rows, keys, title: String(data.t || 'Домашка').slice(0, 160), assignment: assignmentId(data.h) };
  }

  function assignmentId(value) {
    if (value == null || value === '') return '';
    if (typeof value !== 'string' || !/^[a-z0-9-]{8,80}$/i.test(value)) throw new Error('Неверный код выданной работы.');
    return value;
  }

  function result(text) {
    const { code, data } = decode('RES-', text);
    if (!Array.isArray(data.r) || data.r.some(item => !Array.isArray(item) || item.length < 2 ||
        !['string', 'number'].includes(typeof item[1]))) throw new Error('Неверный состав результата.');
    const ids = validateIds(data.r.map(item => taskId(item[0])));
    return {
      code, ids, answers: data.r.map(item => String(item[1]).slice(0, 2000)),
      title: String(data.t || 'Работа ученика').slice(0, 160), name: String(data.n || '').slice(0, 50),
      started: Number.isFinite(data.s) ? data.s : null, duration: Number.isFinite(data.d) ? Math.max(0,data.d) : 0, assignment: assignmentId(data.h),
      homeworkHash: typeof data.f==='string' && /^[a-f0-9]{64}$/.test(data.f) ? data.f : '',
      kind: data.k === 'test' ? 'test' : 'hw',
    };
  }

  async function homeworkHash(code) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
    return Array.from(new Uint8Array(digest), octet => octet.toString(16).padStart(2, '0')).join('');
  }

  const api = { encode, homework, result, homeworkHash };
  root.OgeAssignments = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
