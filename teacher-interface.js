(() => {
  const view = document.getElementById('teacher-view');
  const studentSelect = document.getElementById('student');
  const notice = document.getElementById('notice');
  if (!view || !studentSelect || !notice) return;

  function latestResult() {
    // The authenticated workspace already persists the student's review records here.
    try {
      const workspace = JSON.parse(localStorage.getItem('oge-workspace-v1'));
      const profile = workspace?.students?.find(item => item.id === studentSelect.value);
      return profile?.results?.reduce((latest, result) => {
        return !latest || result.created > latest.created ? result : latest;
      }, null);
    } catch {
      return null;
    }
  }

  function showLatestResult() {
    const card = view.querySelector('.lesson-context > .sheet:first-child');
    if (!card || card.querySelector('.teacher-latest')) return;
    const result = latestResult();
    if (!result || !Array.isArray(result.items)) return;

    const summary = OgeTeacherReview.counts(result.items);
    const panel = document.createElement('div');
    panel.className = 'teacher-latest';
    const label = document.createElement('span');
    label.textContent = 'Последняя работа';
    const title = document.createElement('strong');
    title.textContent = result.title;
    const status = document.createElement('p');
    const parts = [`${summary.correct} верно`, `${summary.errors} с ошибкой`];
    if (summary.pending) parts.push(`${summary.pending} ждут проверки`);
    if (summary.empty) parts.push(`${summary.empty} пропущено`);
    if (summary.unknown) parts.push(`${summary.unknown} требуют сверки`);
    status.textContent = parts.join(' · ');
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Открыть разбор';
    open.addEventListener('click', () => {
      document.querySelector('[data-area="review"]')?.click();
      const results = document.getElementById('review-select');
      if (results && results.value !== result.id) {
        results.value = result.id;
        results.dispatchEvent(new Event('change'));
      }
      document.getElementById('review-select')?.focus();
    });
    panel.append(label, title, status, open);
    card.querySelector('h3').after(panel);
  }

  let copyButton, copyDeadline, labelTimer;
  view.addEventListener('click', event => {
    const button = event.target.closest('#copy-feedback');
    if (!button) return;
    copyButton = button;
    copyDeadline = Date.now() + 5000;
  }, true);
  new MutationObserver(() => {
    if (!copyButton?.isConnected || Date.now() > copyDeadline) return;
    if (notice.textContent !== 'Скопировано') return;
    const button = copyButton;
    copyButton = null;
    const label = button.dataset.copyLabel || button.textContent;
    button.dataset.copyLabel = label;
    button.textContent = 'Скопировано ✓';
    clearTimeout(labelTimer);
    labelTimer = setTimeout(() => { button.textContent = label; }, 1800);
  }).observe(notice, { childList: true });

  showLatestResult();
  new MutationObserver(showLatestResult).observe(view, { childList: true });
})();
