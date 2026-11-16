/* Full run metadata and individual answers have separate keys so tabs can edit different tasks. */
(function (root) {
  'use strict';

  const slot = kind => `mk_run_${kind}`;
  const homeworkKey = draftId => `mk_hwa_${draftId}`;
  const answerKey = (draftId, id) => `mk_answer_${draftId}_${id}`;

  function store(storage) {
    function read(key, fallback = null) {
      try { return JSON.parse(storage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    }
    function active(kind) {
      const run = read(slot(kind));
      return kind === 'hw' && run?.draftId ? read(homeworkKey(run.draftId), run) : run;
    }
    function save(run) {
      const { persistError, unsaved, ...record } = run;
      if (run.kind === 'hw') storage.setItem(homeworkKey(run.draftId), JSON.stringify(record));
      storage.setItem(slot(run.kind), JSON.stringify(record));
    }
    function write(run, id, value) {
      storage.setItem(answerKey(run.draftId, id), value);
    }
    function restoreAnswers(run) {
      if (!run.draftId || run.done) return run;
      for (const id of run.ids) {
        const value = storage.getItem(answerKey(run.draftId, id));
        if (value !== null) run.answers[id] = value;
      }
      return run;
    }
    function detach(run) {
      if (read(slot(run.kind))?.draftId === run.draftId) storage.removeItem(slot(run.kind));
    }
    function discardTest(run) {
      detach(run);
      discardAnswers(run);
    }
    function discardAnswers(run) {
      for (const id of run.ids) storage.removeItem(answerKey(run.draftId, id));
    }
    return {
      active, save, write, restoreAnswers, detach, discardTest, discardAnswers,
      homework: draftId => read(homeworkKey(draftId)),
      legacyHomework: code => read('mk_hwp', {})[code],
      answerKey: (run, id) => answerKey(run.draftId, id),
    };
  }

  async function homeworkId(code) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
    return Array.from(new Uint8Array(digest), octet => octet.toString(16).padStart(2, '0')).join('');
  }

  const api = { store, homeworkId };
  root.OgeDrafts = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
