(() => {
  const script = document.currentScript;
  const preferenceKey = 'invariant-exam-preference-v1';
  const arrivalKey = 'invariant-exam-arrival-v1';
  const examPaths = new Map(['oge', 'ege'].map(exam => [exam, new URL('../' + exam + '.html', script.src)]));
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const examOf = link => link?.dataset.examChoice;

  function remember(link) {
    const exam = examOf(link);
    if (!examPaths.has(exam)) return;
    try { localStorage.setItem(preferenceKey, exam); } catch { /* Navigation still works. */ }
  }

  function prepareArrival(link) {
    const destination = examPaths.get(examOf(link));
    if (!destination || reducedMotion.matches) return;
    try {
      sessionStorage.setItem(arrivalKey, JSON.stringify({path: destination.pathname, writtenAt: Date.now()}));
    } catch { /* The course can render directly. */ }
  }

  if (script.hasAttribute('data-entry')) {
    window.InvariantExamEntry = {remember, prepareArrival};
    const {search, hash} = location;
    const returning = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    if (!search && !hash && !returning) {
      try {
        const preferred = examPaths.get(localStorage.getItem(preferenceKey));
        if (preferred) location.replace(preferred);
      } catch { /* Leave the exam chooser accessible. */ }
    }
  } else {
    let arrival;
    try {
      arrival = JSON.parse(sessionStorage.getItem(arrivalKey));
      sessionStorage.removeItem(arrivalKey);
    } catch { /* Leave the course visible. */ }
    if (!reducedMotion.matches && arrival?.path === location.pathname && Date.now() - arrival.writtenAt < 15_000) {
      root.dataset.examArrival = 'waiting';
      const uncover = () => {
        if (root.dataset.examArrival !== 'waiting') return;
        root.dataset.examArrival = 'revealing';
        setTimeout(() => delete root.dataset.examArrival, 360);
      };
      addEventListener('DOMContentLoaded', uncover, {once: true});
      setTimeout(uncover, 650);
    }
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[data-exam-choice]');
    if (link && (!link.target || link.target === '_self')) remember(link);
  });
})();
