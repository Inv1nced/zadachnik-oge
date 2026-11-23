import {checkVariant, exams, getCatalog, getPayload, studentLink, typeLabel, variantKey} from './config.mjs';
import {openVariant} from './crypto.mjs';
import {attemptPrefix, attemptsFor, canSave, createAttempt, readAttempt, saveAttempt, submitAttempt, timeLeft} from './drafts.mjs';
import {checkShort, hasAnswer, makeSubmission, validateReview} from './grade.mjs';
import {taskVisuals} from './figures.mjs';
import {button, downloadJSON, element, readFile} from './io.mjs';

const root = document.querySelector('#mock-app');
const confirm = document.querySelector('#mock-confirm');
const params = new URLSearchParams(location.search);
const exam = params.get('exam') === 'oge' ? 'oge' : 'ege';
const spec = exams[exam];
const date = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const catalogUrl = `mocks.html?exam=${exam}`;
document.querySelector(`[data-exam="${exam}"]`).setAttribute('aria-current','page');
let meta;
let variant;
let attempt;
let timer;
let view = '';
let loading = false;

function heading(title, subtitle, back = null) {
  const header = element('header',null,{class:'mock-heading'});
  if (back) header.append(back);
  header.append(element('h1',title,{tabindex:'-1'}));
  if (subtitle) header.append(element('p',subtitle,{class:'mock-lead'}));
  return header;
}

function render(next, ...nodes) {
  clearInterval(timer);
  view = next;
  root.replaceChildren(...nodes);
  root.querySelector('h1')?.focus({preventScroll:true});
  window.scrollTo(0,0);
}

const toCatalog = () => element('a','Все пробники ' + spec.label,{href:catalogUrl,class:'mock-back'});
const sourceLink = () => element('a','ФИПИ · демоверсия и спецификация 2027 (ZIP с PDF)',{href:spec.archive});
const panel = (...nodes) => {
  const region = element('section',null,{class:'mock-panel'});
  region.append(...nodes);
  return region;
};

function fail(message, retry) {
  render('error',heading('Пробник пока недоступен',message,toCatalog()),
    button('Повторить',retry,'secondary'));
}

function showCatalog(variants, missing) {
  const header = heading('Пробники по физике',`${spec.label} 2027 · тренировка в экзаменационном формате`);
  const list = element('div',null,{class:'mock-grid'});
  for (const item of variants.filter(item=>item.exam===exam && !item.archived)) {
    const pending = attemptsFor(item).find(record=>record.submittedAt==null);
    const card = element('article',null,{class:'mock-ticket'});
    const badge = element('span',item.access==='open'?'Открытый доступ':'По коду репетитора',{class:'mock-badge'});
    card.append(badge,element('h2',item.title),element('p',`${spec.label} · ${item.count} заданий · ${item.minutes} минут`),
      element('p',pending?'Есть незавершённая попытка':'Краткие и развёрнутые ответы',{class:'mock-muted'}),
      element('a',item.access==='code'?'Ввести код':pending?'Продолжить':'Начать',
        {href:studentLink(item),class:'mock-button primary'}));
    list.append(card);
  }
  const notice = missing ? 'Эта версия не найдена. Выберите вариант из каталога.' :
    list.childElementCount === 0 ? 'В этом разделе пока нет пробников.' : '';
  render('catalog',header,...(notice?[element('p',notice,{role:'status',class:'mock-notice'})]:[]),list,
    element('footer',null,{class:'mock-footer'}));
  root.lastElementChild.append(sourceLink());
}

function showGate() {
  if (meta.access === 'open') {
    openPublic();
    return;
  }
  const form = element('form',null,{class:'mock-code-form'});
  const code = element('input',null,{id:'mock-code',type:'password',spellcheck:'false',autocomplete:'off',
    autocapitalize:'off',maxlength:'96',required:'',placeholder:'IM1-…'});
  const status = element('p','',{class:'mock-error',role:'status'});
  const submit = element('button','Открыть вариант',{type:'submit',class:'mock-button primary'});
  form.append(element('label','Код доступа',{for:code.id}),code,submit,status);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if (loading) return;
    submit.disabled = loading = true;
    status.textContent = '';
    try {
      const encrypted = await getPayload(meta);
      variant = await openVariant(encrypted,meta,code.value);
      code.value = '';
      showStart();
    } catch (error) {
      status.textContent = error.message === 'code' ? 'Вставьте полный код, который выдал репетитор.' :
        error.message === 'unlock' ? 'Код не подходит к этой версии или файл варианта повреждён. Проверьте ссылку и код.' :
        'Не удалось загрузить вариант. Проверьте соединение и попробуйте снова.';
      code.focus();
    } finally { submit.disabled = loading = false; }
  });
  render('gate',heading(meta.title,`${spec.label} · версия ${meta.version}`,toCatalog()),
    panel(element('h2','Доступ по коду'),element('p','Код для этой версии выдаёт репетитор.'),form));
}

async function openPublic() {
  render('load',heading(meta.title,'Загружаем задания…',toCatalog()));
  try { variant = checkVariant(await getPayload(meta), meta); showStart(); }
  catch { fail('Не удалось загрузить задания. Проверьте соединение и попробуйте ещё раз.',openPublic); }
}

function storageNotice() {
  return element('p','Хранилище недоступно. Закрытие или обновление вкладки прервёт попытку.',
    {class:'mock-notice',role:'status',id:'mock-storage',...(!canSave()?{}:{hidden:''})});
}

function applyStorageNotice() {
  if (!canSave()) document.querySelector('#mock-storage')?.removeAttribute('hidden');
}

function selectAttempt(record) {
  attempt = readAttempt(meta,record.attemptId) || record;
  if (attempt.submittedAt == null && Date.now() >= attempt.deadline) submitAttempt(meta,attempt);
  if (attempt.submittedAt == null) showQuestion();
  else showResult();
}

function showStart() {
  const records = attemptsFor(meta);
  for (const record of records.filter(item=>item.submittedAt == null && Date.now() >= item.deadline)) submitAttempt(meta,record);
  const title = heading(meta.title,`${variant.label} · версия ${meta.version}`,toCatalog());
  const summary = element('div',null,{class:'mock-stats'});
  for (const [value,label] of [[meta.count,'заданий'],[meta.minutes,'минут'],[meta.max,'первичных баллов']]) {
    const stat=element('div');
    stat.append(element('strong',value),element('span',label));
    summary.append(stat);
  }
  const guide = panel(element('h2','Перед началом'),element('p',spec.rules),
    element('p','Краткие ответы проверяются после сдачи. Развёрнутые решения оценивает репетитор.'),
    element('p','Время идёт и после закрытия вкладки. Когда оно закончится, сохранённые ответы будут сданы.'),
    storageNotice(),button(records.length?'Новая попытка':'Начать попытку',()=>selectAttempt(createAttempt(meta))));
  const history = element('section',null,{class:'mock-history'});
  if (records.length) history.append(element('h2','Ваши попытки на этом устройстве'));
  for (const record of records) {
    const row = element('div',null,{class:'mock-history-row'});
    const status = record.submittedAt != null ? record.review?'Проверено учителем':'Сдано' : 'Осталось ' + timeLeft(record.deadline);
    row.append(element('span',`${date.format(record.startedAt)} · ${status}`),
      button(record.submittedAt != null?'Результат':'Продолжить',()=>selectAttempt(record),'secondary'));
    history.append(row);
  }
  render('start',title,summary,guide,history,element('footer',null,{class:'mock-footer'}));
  root.lastElementChild.append(sourceLink());
  if (records.some(record=>record.submittedAt==null)) {
    timer = setInterval(()=>{
      for (const [i,record] of records.entries()) {
        if (record.submittedAt != null) continue;
        if (Date.now() >= record.deadline) { showStart(); return; }
        history.children[i+1].firstElementChild.textContent = `${date.format(record.startedAt)} · Осталось ${timeLeft(record.deadline)}`;
      }
    },1000);
  }
}

function expired() {
  if (Date.now() < attempt.deadline) return false;
  if (confirm.open) confirm.close('cancel');
  submitAttempt(meta,attempt);
  showResult();
  return true;
}

function formatText(task) {
  switch (task.type) {
    case 'long': return 'Запишите ход рассуждений. В расчётной задаче укажите законы, вычисления и ответ с единицами.';
    case 'number': return [task.format,'Введите число без единиц. Подойдут запятая и точка.'].filter(Boolean).join(' ');
    case 'measure': return 'Введите показание и погрешность отдельно, без единиц.';
    case 'choice': return 'Введите номер одного правильного ответа.';
    case 'ordered': return 'Введите цифры подряд, в указанном порядке.';
    case 'set': return 'Введите номера верных пунктов подряд. Порядок свободный.';
  }
}

function answerFields(task, update) {
  const field = element('div',null,{class:'mock-answer'});
  const raw = attempt.answers[task.n] ?? '';
  const help = element('p',formatText(task),{id:'mock-input-help',class:'mock-muted'});
  function control(id,label,previous,inputMode) {
    const attrs = {id, 'aria-describedby':help.id, autocomplete:'off', autocapitalize:'off', spellcheck:'false',
      maxlength:task.type==='long'?'6000':'30'};
    const input = task.type === 'long' ? element('textarea',null,{...attrs,rows:'7'}) :
      element('input',null,{...attrs,type:'text',inputmode:inputMode});
    input.value = previous;
    field.append(element('label',label,{for:id}),input);
    return input;
  }
  field.append(help);
  if (task.type==='measure') {
    const [a='',b=''] = raw.split('±');
    const value=control('mock-reading',`Показание, ${task.unit}`,a,'decimal');
    const error=control('mock-uncertainty',`Погрешность, ${task.unit}`,b,'decimal');
    field.addEventListener('input',()=>update(value.value.trim() || error.value.trim() ? value.value+'±'+error.value : ''));
  } else {
    const input=control('mock-answer',task.type==='long'?'Решение':task.unit?`Ответ, ${task.unit}`:'Ответ',raw,
      task.type==='number'?'text':'numeric');
    input.addEventListener('input',()=>update(input.value));
  }
  return field;
}

function showQuestion() {
  if (expired()) return;
  const task=variant.tasks[attempt.current] || variant.tasks[0];
  const clock=element('strong',timeLeft(attempt.deadline),{class:'mock-clock',role:'timer','aria-label':'Оставшееся время'});
  const header=heading(`${meta.title} · ${spec.label}`,null,button('К попыткам',showStart,'link'));
  header.append(clock);
  header.classList.add('attempt');
  const grid=element('div',null,{class:'mock-workspace'});
  const numbers=element('nav',null,{class:'mock-numbers','aria-label':'Номера заданий'});
  const count=element('p','',{class:'mock-muted'});
  const go = index => {
    if (expired()) return;
    attempt.current=index;
    saveAttempt(meta,attempt);
    showQuestion();
  };
  const navButtons=variant.tasks.map((item,index)=>{
    const control=button(item.n,()=>go(index),'number');
    if (item.n===task.n) control.setAttribute('aria-current','step');
    numbers.append(control);
    return control;
  });
  function updateProgress() {
    let answered=0;
    for (const [index,item] of variant.tasks.entries()) {
      const filled=hasAnswer(attempt.answers[item.n]);
      navButtons[index].classList.toggle('filled',filled);
      navButtons[index].setAttribute('aria-label',`Задание ${item.n}, ${filled?'есть ответ':'пропущено'}`);
      if (filled) answered++;
    }
    count.textContent=`Есть ответ: ${answered} из ${meta.count}. Пропущено: ${meta.count-answered}.`;
    return meta.count-answered;
  }
  const sidebar=panel(element('h2','Задания'),count,numbers,button('К сдаче',()=>{
    if (expired()) return;
    confirm.returnValue='cancel';
    confirm.querySelector('p').textContent=`Без ответа: ${updateProgress()} из ${meta.count}. После сдачи ответы сохранятся без возможности редактирования.`;
    confirm.showModal();
  },'secondary'));
  sidebar.classList.add('mock-sidebar');
  const question=panel(element('p',`${typeLabel[task.type]} · ${task.max} ${task.max===1?'балл':'балла'}`,{class:'mock-badge'}),
    element('h2','Задание №' + task.n,{tabindex:'-1'}), element('p',task.prompt,{class:'mock-prompt'}),
    ...taskVisuals(task),answerFields(task,value=>{
      if (expired()) return;
      attempt.answers[task.n]=value;
      saveAttempt(meta,attempt);
      applyStorageNotice();
      updateProgress();
    }),storageNotice());
  const nav=element('div',null,{class:'mock-row'});
  const prev=button('Назад',()=>go(task.n-2),'secondary');
  prev.disabled=task.n===1;
  nav.append(prev,task.n===meta.count ? button('К сдаче',()=>sidebar.querySelector('.secondary').click()) :
    button('Дальше',()=>go(task.n)));
  question.append(nav);
  grid.append(question,sidebar);
  updateProgress();
  render('question',header,grid);
  question.querySelector('h2').focus({preventScroll:true});
  timer=setInterval(()=>{
    if (!expired()) {
      clock.textContent=timeLeft(attempt.deadline);
      clock.classList.toggle('urgent',attempt.deadline-Date.now() < 300000);
    }
  },300);
}

function showResult() {
  const short=checkShort(variant,attempt.answers);
  const manual=variant.tasks.filter(task=>task.type==='long');
  const result = short.reduce((total,row)=>total+row.score,0);
  const maximum = short.reduce((total,row)=>total+row.max,0);
  const header=heading('Результат пробника',`${spec.label} · ${meta.title} · версия ${meta.version}`,button('К попыткам',showStart,'link'));
  const summary=panel(element('h2',attempt.review?`Итог · ${result+attempt.review.marks.reduce((sum,m)=>sum+m.score,0)} из ${meta.max}`:'Итог появится после проверки учителем'),
    element('p',`Проверено автоматически: ${result} из ${maximum} баллов за краткие ответы.`));
  if (attempt.expired) summary.append(element('p','Время истекло. Сохранённые ответы сданы автоматически.',{class:'mock-notice'}));
  const topics=[...new Set(short.filter(row=>row.score<row.max).map(row=>variant.tasks[row.n-1].topic))];
  if (topics.length) summary.append(element('p','Темы для повторения: '+topics.join(', ')+'.'));
  const rows=element('div',null,{class:'mock-results'});
  for (const item of short) {
    const task=variant.tasks[item.n-1];
    const detail=element('details',null,{class:'mock-result-row'});
    const label=element('summary',`№${item.n} · ${task.topic} · ${item.score}/${item.max}`);
    const raw=attempt.answers[item.n];
    detail.append(label,element('p',`Ваш ответ: ${hasAnswer(raw)?raw:'пропущено'}. Верный ответ: ${task.answer}${task.unit?' '+task.unit:''}.`),
      element('p',task.solution));
    rows.append(detail);
  }
  const handoff=panel(element('h2','Развёрнутые ответы'),element('p',attempt.review?'Проверено учителем.':'Ожидает учителя. Скачайте работу и передайте файл репетитору.'));
  for (const [index,task] of manual.entries()) {
    const mark=attempt.review?.marks[index];
    const detail=element('details',null,{class:'mock-result-row'});
    detail.append(element('summary',`№${task.n} · ${task.topic} · ${mark?`${mark.score}/${task.max}`:'ожидает учителя'}`),
      element('p',hasAnswer(attempt.answers[task.n])?attempt.answers[task.n]:'Ответ пропущен.',{class:'mock-prompt'}));
    if (mark) detail.append(element('p',mark.comment || 'Комментарий учителя отсутствует.'),element('p',task.solution));
    handoff.append(detail);
  }
  const attach=element('input',null,{type:'file',accept:'application/json,.json',id:'mock-review','aria-label':'Загрузить разбор учителя'});
  const status=element('p','',{role:'status',class:'mock-error'});
  attach.addEventListener('change',async()=>{
    const selected=attempt;
    try {
      const review=validateReview(await readFile(attach.files[0]),variant,selected.attemptId);
      const saved=readAttempt(meta,selected.attemptId) || selected;
      saved.review=review;
      saveAttempt(meta,saved);
      if (view==='result' && attempt.attemptId===selected.attemptId) {
        attempt=saved;
        showResult();
      }
    } catch {
      status.textContent='Файл не подходит к этой попытке. Проверьте, что репетитор прислал её разбор.';
      attach.value='';
    }
  });
  handoff.append(element('p',`Попытка ${attempt.attemptId}`,{class:'mock-id'}),
    button('Скачать работу',()=>downloadJSON(makeSubmission(variant,attempt),`invariant-work-${attempt.attemptId}.json`),'secondary'),
    element('label',attempt.review?'Загрузить обновлённый разбор':'Загрузить разбор учителя',{for:attach.id,class:'mock-file-label'}),
    attach,status,storageNotice());
  render('result',header,summary,panel(element('h2','Краткие ответы'),rows),handoff);
}

confirm.addEventListener('close',()=>{
  if (view !== 'question' || confirm.returnValue !== 'submit') return;
  submitAttempt(meta,attempt);
  showResult();
});

window.addEventListener('storage',event=>{
  if (!meta || !event.key?.startsWith(attemptPrefix(meta))) return;
  if (view==='start') { showStart(); return; }
  if (!attempt || !['result','question'].includes(view)) return;
  if (event.key !== attemptPrefix(meta)+attempt.attemptId) return;
  const fresh=readAttempt(meta,attempt.attemptId);
  if (!fresh) return;
  attempt=fresh;
  if (fresh.submittedAt != null) {
    if (confirm.open) confirm.close('cancel');
    showResult();
  } else if (view==='question') {
    if (confirm.open) confirm.close('cancel');
    showQuestion();
  }
});

async function boot() {
  try {
    const catalog=await getCatalog();
    if (catalog.schemaVersion!==1 || !Array.isArray(catalog.variants)) throw new Error('catalog');
    const id=params.get('variant');
    const requested=params.get('v');
    const choices=catalog.variants.filter(item=>item.exam===exam && item.id===id &&
      (requested!=null ? String(item.version)===requested : !item.archived));
    meta=choices.sort((a,b)=>b.version-a.version)[0];
    if (meta) showGate();
    else showCatalog(catalog.variants,!!id);
  } catch {
    fail('Не удалось загрузить каталог. Проверьте соединение и попробуйте ещё раз.',boot);
  }
}

boot();
