const escape = value => OgeCore.escapeHtml(value);
const fields = [
  ['covered','Что разобрали'],
  ['strengths','Что получилось'],
  ['difficulties','Какие трудности обнаружены'],
  ['program','Рекомендуемая программа']
];

export function mountReport(container, session, label) {
  const draft = session.report ??= {topics:new Set(), text:{}, exported:null};
  container.innerHTML = `
    <div class="report-heading">
      <p class="eyebrow">${label}</p>
      <h1 tabindex="-1">Индивидуальный план</h1>
      <p>Выберите темы для следующей встречи. Отчёт можно заполнить по итогам занятия в отдельной вкладке.</p>
    </div>
    <fieldset class="plan-topics"><legend>Темы для дальнейших занятий</legend>
      ${session.bank.sections.map(section => `<label><input type="checkbox" value="${section.id}" ${draft.topics.has(section.id) ? 'checked' : ''}>${escape(section.name)}</label>`).join('')}
    </fieldset>
    <div class="actions">
      <button type="button" class="primary" id="parent-report">Открыть отчёт для родителя</button>
      <button type="button" id="resume-lesson">Вернуться к задачам</button>
    </div>
    <p id="report-launch-status" role="status"></p>`;
  container.querySelector('.plan-topics').addEventListener('change', event => {
    const {value,checked} = event.target;
    if (checked) draft.topics.add(value);
    else draft.topics.delete(value);
  });
  container.querySelector('#parent-report').addEventListener('click', () => {
    const editor = window.open('', 'invariant-parent-report', 'popup,width=830,height=760');
    const status = container.querySelector('#report-launch-status');
    if (!editor) {
      status.textContent = 'Разрешите открывать всплывающие окна для этой страницы и нажмите кнопку ещё раз.';
      return;
    }
    const topics = session.bank.sections.filter(section => draft.topics.has(section.id)).map(section => section.name);
    renderEditor(editor, draft, label, topics);
    status.textContent = '';
    editor.focus();
  });
}

function renderEditor(editor, draft, label, topics) {
  const doc = editor.document;
  doc.open();
  doc.write(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Отчёт для родителя · INVARIANT</title>
    <style>
      *{box-sizing:border-box}body{color:#222a3a;background:#fff;font:16px/1.5 system-ui,sans-serif;margin:0}main{width:min(780px,calc(100% - 36px));margin:44px auto}h1{line-height:1.1}p{color:#505c71}
      label{display:grid;gap:6px;font-weight:650;margin-block:14px}textarea{padding:10px;min-height:82px;font:inherit;font-weight:400;border:1px solid #aab4c4;border-radius:8px;resize:vertical}
      button{font:inherit;font-weight:650;border:1px solid #aab4c4;border-radius:8px;background:#fff;padding:9px 13px;cursor:pointer}button:first-child{background:#4232ab;color:white;border-color:#4232ab}button:hover{filter:brightness(.94)}:focus-visible{outline:2px solid #4232ab;outline-offset:3px}
      .actions{display:flex;flex-wrap:wrap;gap:8px}#preview{white-space:pre-wrap;overflow-wrap:anywhere}summary{cursor:pointer}
    </style><main>
    <h1>Отчёт для родителя</h1><p>${escape(label)}. Заполните по итогам занятия.</p>
    <form autocomplete="off">${fields.map(([key,title]) => `<label>${title}<textarea name="${key}" maxlength="1800">${escape(draft.text[key] ?? '')}</textarea></label>`).join('')}</form>
    <div class="actions"><button type="button" id="copy">Скопировать отчёт</button><button type="button" id="download">Скачать .txt</button></div>
    <p role="status" id="report-status"></p>
    <details id="report-preview"><summary>Посмотреть текст</summary><pre id="preview"></pre></details></main></html>`);
  doc.close();
  const byId = id => doc.getElementById(id);
  const reportText = () => [
    'Пробное занятие по физике', label,
    ...fields.filter(([key]) => draft.text[key]?.trim()).map(([key,title]) => `${title}\n${draft.text[key].trim()}`),
    ...(topics.length ? [`Темы для дальнейших занятий\n${topics.map(topic => '• ' + topic).join('\n')}`] : [])
  ].join('\n\n');
  const preview = () => { byId('preview').textContent = reportText(); };
  const ready = () => {
    if (Object.values(draft.text).some(value => value.trim())) return true;
    byId('report-status').textContent = 'Добавьте хотя бы одно наблюдение по итогам занятия.';
    doc.querySelector('textarea').focus();
    return false;
  };
  doc.querySelector('form').addEventListener('input', event => {
    draft.text[event.target.name] = event.target.value;
    preview();
  });
  byId('copy').addEventListener('click', async () => {
    if (!ready()) return;
    const report = reportText();
    try {
      await editor.navigator.clipboard.writeText(report);
      draft.exported = report;
      byId('report-status').textContent = 'Отчёт скопирован.';
    } catch {
      byId('report-preview').open = true;
      const selection = editor.getSelection();
      const range = doc.createRange();
      range.selectNodeContents(byId('preview'));
      selection.removeAllRanges();
      selection.addRange(range);
      byId('report-status').textContent = 'Текст выделен. Скопируйте его сочетанием ⌘C или Ctrl+C.';
    }
  });
  byId('download').addEventListener('click', () => {
    if (!ready()) return;
    const report = reportText();
    const url = editor.URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));
    const link = doc.createElement('a');
    link.href = url;
    link.download = 'invariant-trial-report.txt';
    doc.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => editor.URL.revokeObjectURL(url), 1000);
    draft.exported = report;
    byId('report-status').textContent = 'Отчёт скачан.';
  });
  editor.onbeforeunload = event => {
    if (!Object.values(draft.text).some(value => value.trim()) || reportText() === draft.exported) return;
    event.preventDefault();
    event.returnValue = true;
  };
  preview();
}
