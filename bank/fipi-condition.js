/* Render the source's public condition in place. Text, options and diagrams stay on its origin. */
(() => {
  const index = window.OGE_FIPI;

  function markup(item, open = false) {
    const original = index.officialUrl(item.code);
    const copy = index.mirrorUrl(item.code);
    return `<details class="fipi-condition" data-fipi-condition="${item.code}" ${open?'open':''}>
      <summary>Условие задачи</summary>
      <div class="fipi-condition-content">
        <div class="fipi-condition-view"></div>
        <div class="fipi-links" aria-label="Источники задания">
          <a href="${original}" target="_blank" rel="noopener">Оригинал ФИПИ ↗</a>
          ${item.hasMirror?`<a href="${copy}#task-heading-title" target="_blank" rel="noopener">Открыть в отдельной вкладке ↗</a>`:''}
        </div>
      </div>
    </details>`;
  }

  function load(details, retry = false) {
    const item = index.byCode.get(details.dataset.fipiCondition);
    const view = details.querySelector('.fipi-condition-view');
    if (!item || !view || (!retry && view.hasChildNodes())) return;
    const source = item.hasMirror ? index.mirrorUrl(item.code) + '#task-heading-title' : index.officialUrl(item.code);
    const frame = document.createElement('iframe');
    const pending = document.createElement('p');
    pending.className = 'fipi-condition-loading';
    pending.setAttribute('role','status');
    pending.textContent = 'Загружаю условие…';
    frame.title = 'Полное условие ФИПИ ' + item.code;
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin');
    const hint = setTimeout(()=>{
      if (!pending.isConnected) return;
      pending.textContent = 'Источник долго отвечает. ';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fipi-condition-retry';
      button.textContent = 'Повторить загрузку';
      button.addEventListener('click',()=>load(details,true),{once:true});
      pending.append(button);
    },12000);
    frame.addEventListener('load',()=>{
      clearTimeout(hint);
      pending.remove();
    },{once:true});
    frame.src = source;
    view.replaceChildren(pending,frame);
  }

  document.addEventListener('toggle', event => {
    const details = event.target;
    if (details.matches?.('details[data-fipi-condition]') && details.open && details.isConnected) load(details);
  }, true);

  window.OGE_FIPI_CONDITION = {markup};
})();
