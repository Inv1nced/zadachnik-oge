/* Keep the helper closed during an unfinished test, including on other pages. */
(() => {
  function pending(read) {
    try {
      const run = JSON.parse(read('mk_run_test') || 'null');
      return !!run && run.kind === 'test' && run.done !== true && Array.isArray(run.ids) && run.ids.length > 0;
    } catch {
      return false;
    }
  }
  window.OgeFrogGuide = { pending };
})();
