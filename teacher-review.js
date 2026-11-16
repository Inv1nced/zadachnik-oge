/* Grade a submission against the stored task definitions and choose short follow-up practice. */
(function (root) {
  'use strict';

  const sameIds=(left,right)=>Array.isArray(left)&&left.length===right.length&&left.every((id,i)=>id===right[i]);
  function locate(students, submission) {
    for (const student of students) {
      const duplicate = student.results.find(result => result.code === submission.code);
      if (duplicate) return { student, duplicate };
    }
    for (const student of students) {
      const assignment = submission.assignment && student.assignments.find(item => item.id === submission.assignment);
      if (assignment) {
        if (!sameIds(assignment.ids,submission.ids)) {
          throw new Error('Состав ответа отличается от выданной версии. Попроси ученика скопировать результат ещё раз.');
        }
        return { student, assignment };
      }
    }
    return {};
  }

  function taskMap(rows) {
    return new Map((Array.isArray(rows)?rows:[])
      .filter(row=>Array.isArray(row)&&Number.isSafeInteger(row[0])&&typeof row[6]==='string'&&row[6].trim())
      .map(row=>[row[0],row]));
  }

  async function recoverHomework(text,submission) {
    if (!text.trim()) return null;
    const homework=OgeAssignments.homework(text);
    if (!sameIds(homework.ids,submission.ids) ||
        (submission.assignment && homework.assignment!==submission.assignment) ||
        (!submission.assignment && !submission.homeworkHash && homework.title!==submission.title) ||
        (submission.homeworkHash && await OgeAssignments.homeworkHash(homework.code)!==submission.homeworkHash)) {
      throw new Error('Исходная ссылка относится к другой версии домашки.');
    }
    return homework;
  }

  function resolve(submission, assignments, bank, recovery) {
    const exact = submission.assignment && assignments.find(item=>item.id===submission.assignment && sameIds(item.ids,submission.ids));
    const candidates = submission.assignment ? [] : assignments.filter(item=>
      sameIds(item.ids,submission.ids) && item.title===submission.title);
    const stored=taskMap(exact?.rows || (candidates.length===1?candidates[0].rows:null));
    const recovered=taskMap(recovery?.rows);
    const uncertain=new Set(), rows=new Map();
    for (const id of submission.ids) {
      const row=stored.get(id)||recovered.get(id)||bank.get(id);
      if (!row) continue;
      rows.set(id,row);
      if (!stored.has(id) && !recovered.has(id) &&
          (submission.assignment || candidates.length>0)) uncertain.add(id);
    }
    return {rows,uncertain};
  }

  function grade(submission, rows, uncertain=new Set()) {
    return submission.ids.map((id,i) => {
      const row = rows.get(id), given = submission.answers[i];
      const checked = given.trim() && row && !uncertain.has(id) ? OgeCore.correct(row,given) : null;
      return {
        id, given, verdict:checked===null?null:checked?1:0, known:!!row, comment:'',
        ...(row?{task:OgeCore.snapshotRow(row)}:{}),
        ...(uncertain.has(id)?{uncertain:true}:{}),
      };
    });
  }

  function cardHTML(item,index,label) {
    const esc=OgeCore.escapeHtml, row=item.task;
    let key='Условие не восстановлено. Нужна исходная ссылка или резервная копия.';
    if (row && item.uncertain) key='Найдено условие из банка. Сверь версию перед проверкой.';
    else if (row && OgeCore.checkable(row)) key=`Правильный ответ: ${row[4]}`;
    else if (row) key='Ручная проверка';
    const solution=row?.[8]?.solution || (row && !OgeCore.checkable(row)?row[4]:'');
    return `<h3>№${index+1} · ${esc(row?(label||row[8]?.label||`Задание ${item.id}`):`Условие не восстановлено (ID ${item.id})`)}</h3>
      ${row?`<div class="review-condition">${OgeCore.conditionHTML(row)}</div>`:''}
      <div class="written"><b>Ответ ученика:</b> ${esc(item.given?.trim()?item.given:'Ответ не заполнен')}</div>
      <p class="review-key">${esc(key)}</p>
      ${solution && !item.uncertain?`<details class="teacher-only"><summary>Ориентир для проверки</summary><div>${esc(solution)}</div></details>`:''}`;
  }

  function counts(items) {
    const measures = { correct:0, errors:0, pending:0, empty:0, unknown:0 };
    for (const item of items) {
      if (item.verdict === 1) measures.correct++;
      else if (item.verdict === 0) measures.errors++;
      else if (item.known === false || item.uncertain) measures.unknown++;
      else if (!item.given?.trim()) measures.empty++;
      else measures.pending++;
    }
    return measures;
  }

  const prompts = [
    [/лифт|вес.*опор|давит на пол/, 'Сначала укажи направление ускорения и подпиши силы. Затем объясни, как ускорение влияет на вес.'],
    [/трени/, 'Определи, скользит ли тело. Для трения покоя сначала сравни силу тяги с максимальной силой трения.'],
    [/тяготен|расстояни.*центр/, 'Запиши отношение новых величин к исходным. Возведи коэффициент изменения расстояния в квадрат.'],
    [/импульс|оскол|соудар/, 'Выбери ось и запиши импульсы тел со знаками до и после взаимодействия.'],
    [/механическ.*работ|работ[аыу].*сил/, 'Отметь угол между силой и перемещением. Объясни, как он влияет на знак работы.'],
    [/график/, 'Подпиши обе оси и единицы. Объясни, что даёт наклон или площадь на этом графике.'],
    [/окружност/, 'Отметь скорость по касательной и ускорение к центру. Объясни, какую величину требуется найти.'],
  ];

  function warmup(items, rows, taskStates) {
    const mistakes = items.filter(item => item.verdict === 0).map(item => ({ item, row:rows.get(item.id) })).filter(entry => entry.row);
    const usedTopics = new Set(), usedIds = new Set(items.map(item => item.id));
    const exercises = [];
    for (const {item,row} of mistakes) {
      const text = row[6].toLowerCase(), match = prompts.find(([pattern]) => pattern.test(text));
      const skill = match?.[0].source || row[8]?.lesson || row[2];
      if (usedTopics.has(skill)) continue;
      usedTopics.add(skill);
      const candidates = Array.from(rows.values()).filter(next => !usedIds.has(next[0]) && next[3]!=='e' &&
        (!taskStates[next[0]] || taskStates[next[0]]==='repeat') &&
        (next[2] === row[2] || (row[8]?.lesson && next[8]?.lesson === row[8].lesson)));
      const points = next => (match?.[0].test(next[6].toLowerCase()) ? 8 : 0) +
        (next[3]===row[3] ? 4 : 0) + (next[2]===row[2] ? 2 : 0) + (taskStates[next[0]]==='repeat' ? 1 : 0);
      candidates.sort((a,b)=>points(b)-points(a));
      const practice = candidates[0] || null;
      if (practice) usedIds.add(practice[0]);
      exercises.push({ row, practice, guidance:item.comment?.trim() || match?.[1] || 'Запиши, что дано и что нужно найти. Назови закон и поясни, почему он подходит.' });
      if (exercises.length === 3) break;
    }
    return exercises;
  }

  const api = { locate, resolve, recoverHomework, taskMap, grade, counts, warmup, cardHTML };
  root.OgeTeacherReview = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
