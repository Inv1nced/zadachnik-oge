/* Grade a submission against the stored task definitions and choose short follow-up practice. */
(function (root) {
  'use strict';

  function locate(students, submission) {
    for (const student of students) {
      const duplicate = student.results.find(result => result.code === submission.code);
      if (duplicate) return { student, duplicate };
      const assignment = submission.assignment && student.assignments.find(item => item.id === submission.assignment);
      if (assignment) {
        if (assignment.ids.length !== submission.ids.length || assignment.ids.some((id,i) => id !== submission.ids[i])) {
          throw new Error('Состав ответа отличается от выданной версии. Попроси ученика скопировать результат ещё раз.');
        }
        return { student, assignment };
      }
    }
    if (submission.assignment) throw new Error('Этот код относится к выдаче, которой нет в кабинете. Открой её резервную копию.');
    return {};
  }

  function grade(submission, rows) {
    return submission.ids.map((id,i) => {
      const row = rows.get(id), given = submission.answers[i];
      const checked = given.trim() && row ? OgeCore.correct(row,given) : null;
      return { id, given, verdict:checked===null?null:checked?1:0, known:!!row, comment:'' };
    });
  }

  function counts(items) {
    const measures = { correct:0, errors:0, pending:0, empty:0, unknown:0 };
    for (const item of items) {
      if (item.verdict === 1) measures.correct++;
      else if (item.verdict === 0) measures.errors++;
      else if (!item.given?.trim()) measures.empty++;
      else if (item.known === false) measures.unknown++;
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

  const api = { locate, grade, counts, warmup };
  root.OgeTeacherReview = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
