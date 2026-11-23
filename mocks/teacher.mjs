import {checkVariant, exams, getCatalog, getPayload, studentLink, variantKey} from './config.mjs';
import {openVariant} from './crypto.mjs';
import {checkShort, hasAnswer, makeReview, validateSubmission} from './grade.mjs';
import {taskVisuals} from './figures.mjs';
import {button, downloadJSON, element, readFile} from './io.mjs';

export function mountTeacherMocks(anchor, issuance) {
  if (!anchor || anchor.dataset.mocksMounted) return;
  anchor.dataset.mocksMounted = '1';
  const dialog = element('dialog',null,{class:'mock-ui mock-teacher','aria-labelledby':'mock-teacher-title'});
  const body = element('div',null,{class:'mock-teacher-body'});
  const bar = element('header',null,{class:'mock-dialog-head'});
  bar.append(element('h2','Пробники',{id:'mock-teacher-title'}),button('Закрыть',()=>dialog.close(),'secondary'));
  dialog.append(bar,body);
  document.body.append(dialog);
  const style = element('link',null,{rel:'stylesheet',href:new URL('mocks.css',import.meta.url)});
  document.head.append(style);

  const open = button('Пробники и коды',async ()=>{
    body.replaceChildren(element('p','Загружаем каталог…',{role:'status'}));
    dialog.showModal();
    try {
      const catalog = await getCatalog();
      if (dialog.open) showTools(body,catalog.variants,issuance);
    } catch {
      body.replaceChildren(element('p','Каталог недоступен. Закройте окно и попробуйте снова.',{role:'status'}));
    }
  },'secondary');
  anchor.append(open);
  dialog.addEventListener('close',()=>{body.replaceChildren();open.focus();});
}

function showTools(root, variants, issuance) {
  const issueName = meta => `${exams[meta.exam].label} · ${meta.title} · версия ${meta.version}`;
  const issuedCode = meta => Object.hasOwn(issuance,variantKey(meta)) ? issuance[variantKey(meta)] : '';
  const selector = element('select',null,{id:'mock-issue-variant'});
  const visible=variants.filter(meta=>!meta.archived || issuedCode(meta));
  for (const meta of visible) {
    selector.append(element('option',issueName(meta)+(meta.archived?' · архив':''),
      {value:variantKey(meta)}));
  }
  const copyText = element('textarea',null,{id:'mock-issue-message',rows:'4',readonly:''});
  const status = element('p','',{role:'status',class:'mock-muted'});
  const copy = button('Скопировать сообщение',async ()=>{
    try {
      await navigator.clipboard.writeText(copyText.value);
      status.textContent = 'Сообщение скопировано.';
    } catch {
      copyText.focus();
      copyText.select();
      status.textContent = 'Выделили сообщение. Скопируйте его вручную.';
    }
  });
  const state = element('p','',{class:'mock-muted'});
  const updateIssue = () => {
    const meta=variants.find(row=>variantKey(row)===selector.value);
    if (!meta) return;
    const code=issuedCode(meta);
    const locked=meta.access==='code';
    copy.disabled=locked && !code;
    copyText.value=copy.disabled?'':`Пробник по физике. ${issueName(meta)}\n${studentLink(meta)}${locked?'\nКод: '+code:''}`;
    state.textContent=locked?(code?'Код готов к выдаче. Любой получатель действующего кода сможет открыть эту версию.':
      'Код этой версии ещё не включён в защищённую сборку кабинета.'):'Открытый вариант. Для прохождения достаточно ссылки.';
    status.textContent='';
  };
  selector.addEventListener('change',updateIssue);
  updateIssue();

  const issuing=element('section',null,{class:'mock-panel'});
  issuing.append(element('h3','Выдать вариант'),element('label','Пробник',{for:selector.id}),selector,state,
    element('label','Сообщение ученику',{for:copyText.id}),copyText,copy,status);
  const checking=element('section',null,{class:'mock-panel'});
  const file=element('input',null,{type:'file',id:'mock-work-file',accept:'application/json,.json'});
  const workStatus=element('p','',{role:'status',class:'mock-muted'});
  const preview=element('div');
  checking.append(element('h3','Проверить работу'),element('label','Файл от ученика',{for:file.id}),file,workStatus,preview);
  file.addEventListener('change',async ()=>{
    preview.replaceChildren();
    if (!file.files[0]) return;
    file.disabled=true;
    workStatus.textContent='Открываем работу…';
    try {
      const submission=validateSubmission(await readFile(file.files[0]));
      const meta=variants.find(row=>variantKey(row)===variantKey(submission));
      if (!meta) throw new Error('version');
      const code=issuedCode(meta);
      if (meta.access==='code' && !code) throw new Error('missing');
      const data=await getPayload(meta);
      const variant=meta.access==='code'?await openVariant(data,meta,code):checkVariant(data,meta);
      workStatus.textContent='';
      renderReview(preview,issueName(meta),variant,submission);
    } catch (error) {
      workStatus.textContent=error.message==='version'?'Версии этой работы нет в каталоге.':
        error.message==='missing'?'В сборке кабинета отсутствует код этой версии.':
        'Не удалось открыть работу. Проверьте файл и доступ к версии пробника.';
    } finally { file.disabled=false;file.value=''; }
  });
  root.replaceChildren(issuing,checking);
}

function renderReview(root, title, variant, submission) {
  const answers=Object.fromEntries(submission.answers.map((answer,index)=>[index+1,answer]));
  const short=checkShort(variant,answers);
  const total=short.reduce((sum,row)=>sum+row.score,0);
  const max=short.reduce((sum,row)=>sum+row.max,0);
  const shortRows=element('details',null,{class:'mock-result-row'});
  shortRows.append(element('summary',`Краткие ответы · ${total} из ${max}`));
  for (const item of short) {
    const task=variant.tasks[item.n-1];
    shortRows.append(element('p',`№${item.n}. ${hasAnswer(answers[item.n])?answers[item.n]:'пропущено'} · ключ ${task.answer} · ${item.score}/${item.max}`));
  }
  const form=element('form',null,{class:'mock-review-form'});
  const controls=variant.tasks.filter(task=>task.type==='long').map(task=>{
    const item=element('details',null,{class:'mock-result-row'});
    const title=element('summary',`№${task.n}. ${task.topic}`);
    item.append(title,element('p',task.prompt,{class:'mock-prompt'}),...taskVisuals(task),
      element('h4','Решение ученика'),element('p',hasAnswer(answers[task.n])?answers[task.n]:'Ответ пропущен.',{class:'mock-prompt'}),
      element('h4','Эталон'),element('p',task.solution),element('h4','Критерии'));
    const criteria=element('ul');
    task.criteria.forEach((line,score)=>criteria.append(element('li',`${score} балл. · ${line}`)));
    const label=`mock-score-${task.n}`;
    const select=element('select',null,{required:'',id:label});
    select.append(element('option','Выберите балл',{value:''}));
    for (let i=0;i<=task.max;i++) select.append(element('option',`${i} из ${task.max}`,{value:i}));
    title.textContent += ' · нет оценки';
    select.addEventListener('change',()=>{title.textContent=`№${task.n}. ${task.topic} · ${select.value===''?'нет оценки':select.value+'/'+task.max}`;});
    const comment=element('textarea',null,{rows:'3',maxlength:'2000',id:`mock-comment-${task.n}`});
    item.append(criteria,element('label','Балл',{for:label}),select,element('label','Комментарий',{for:comment.id}),comment);
    form.append(item);
    return {task,item,select,comment};
  });
  const status=element('p','',{role:'status',class:'mock-error'});
  form.append(button('Скачать разбор',()=>{
    const pending=controls.find(control=>control.select.value==='');
    if (pending) {
      pending.item.open=true;
      pending.select.focus();
      status.textContent='Поставьте балл за каждое развёрнутое задание. Пропуски можно оценить в 0.';
      return;
    }
    const marks=controls.map(({task,select,comment})=>({n:task.n,score:Number(select.value),comment:comment.value}));
    downloadJSON(makeReview(variant,submission,marks),`invariant-review-${submission.attemptId}.json`);
    status.textContent='Разбор готов. Передайте файл ученику.';
  }),status);
  form.addEventListener('submit',event=>event.preventDefault());
  root.replaceChildren(element('h4',title),element('p',`Попытка ${submission.attemptId}`,{class:'mock-id'}),shortRows,form);
}
