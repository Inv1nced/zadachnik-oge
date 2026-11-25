import {courseCards, courseResultChecks} from './course-tasks.mjs?v=practice-first';
import {additions, courseFigures} from './additions.mjs?v=practice-first';
import {practiceTasks} from './practice-tasks.mjs';
import {kinematicsPractice} from './kinematics-practice.mjs';
import {dynamicsPractice} from './dynamics-practice.mjs';
import {conservationPractice} from './conservation-practice.mjs';
import {supplementalPractice} from './supplemental-practice.mjs';
import {practiceModuleDefinitions} from './practice-modules.mjs';
import {adaptFipi, legacyTopics} from './fipi.mjs';
import {decimal, score} from '../../mocks/grade.mjs';

const short = result => decimal(result) !== null;
const mockResultChecks = new Map([
  [22, ['200', 'Н']],
  [23, ['1500', 'Дж']],
  [25, ['1.8', 'мДж']],
]);
const mockPlacement = [
  ['velocity-graph', 'acceleration'],
  ['newton-friction', 'newton'],
  ['momentum-energy', 'mechanical-energy'],
  ['oscillations-waves', 'waves'],
  ['newton-friction', 'newton'],
  ['momentum-energy', 'mechanical-energy'],
  ['gas-mkt', 'gas-state'],
  ['thermodynamic-work', 'first-law'],
  ['gas-mkt', 'isoprocesses', ['gas-work']],
  ['gas-mkt', 'gas-state', ['gas-work']],
  ['dc-circuits', 'dc-resistors'],
  ['magnetic-forces', 'ampere'],
  ['thin-lens', 'lens-formula'],
  ['dc-circuits', 'dc-resistors', ['electric-power']],
  ['capacitor', 'capacitor-energy'],
  ['nuclear-decay', 'radioactivity'],
  ['nuclear-decay', 'radioactivity'],
  ['electric-field', 'general-laws', ['mechanical-energy', 'heat-balance', 'em-waves', 'radioactivity']],
  ['measurement-data', 'measurement'],
  ['measurement-data', 'experiments'],
  ['dc-circuits', 'emf', ['electric-power']],
  ['statics-fluids', 'fluids'],
  ['thermodynamic-work', 'first-law', ['gas-work']],
  ['thermodynamic-work', 'heat-engines', ['gas-work', 'first-law']],
  ['capacitor', 'capacitor-energy'],
  ['newton-friction', 'friction', ['newton']],
];

const labels = new Map(Object.values(courseCards).flatMap(([list]) =>
  Array.from({length: list.length / 2}, (_, i) => [list[i * 2], list[i * 2 + 1]])));
labels.set('general-laws', 'Общие законы физики');

function finalCheck(result) {
  if (!result) return undefined;
  const [answer, unit] = result;
  return {rule: 'number', accepted: [answer], unit};
}

function courseTasks(lessons) {
  return lessons.flatMap(lesson => {
    const [topics, entries] = courseCards[lesson.id] || [[], []];
    return [...lesson.together, ...lesson.practice, ...lesson.homework].flatMap(task => {
      const sourceId = Math.abs(task.taskId);
      const entry = entries[sourceId - (30010001 + lesson.number * 10)];
      if (!entry) return [];
      const [slot, result, clarify] = entry;
      const type = short(result) ? 'number' : 'long';
      const topic = topics[slot * 2];
      const extraTopics = topic === 'momentum-and-energy' ? ['momentum', 'mechanical-energy'] : [];
      const check = courseResultChecks[sourceId];
      return [{
        id: 'course-' + sourceId, lesson: lesson.id, topic, extraTopics,
        source: 'course', sourceId: task.taskId, anchor: task.id,
        prompt: task.question, clarify, type, level: task.level,
        answer: type === 'number' ? result : undefined, solution: type === 'long' ? result : undefined,
        hint: task.hint, figure: courseFigures[sourceId],
        ...(check && {finalCheck: finalCheck(check), criteria: check[2]}),
      }];
    });
  });
}

function mockTasks(variant) {
  return variant.tasks.map(task => {
    const [lesson, topic, extraTopics = []] = mockPlacement[task.n - 1];
    return {
      ...task, id: variant.id + '-v' + variant.version + '-' + task.n,
      source: 'mock', sourceId: String(task.n), year: variant.year, line: task.n, lesson, topic, extraTopics,
      level: task.type === 'long' ? 'advanced' : undefined,
      finalCheck: variant.id === 'ege-01' && variant.version === 1 ? finalCheck(mockResultChecks.get(task.n)) : undefined,
    };
  });
}

function buildPracticeModules(tasks) {
  const byPracticeTopic = new Map();
  for (const task of tasks) {
    if (task.source === 'reference') continue;
    if (!byPracticeTopic.has(task.topic)) byPracticeTopic.set(task.topic, []);
    byPracticeTopic.get(task.topic).push(task);
  }
  return practiceModuleDefinitions.flatMap(({id, title, section, topics}) => {
    const blocks = topics.flatMap(topic => {
      const selected = byPracticeTopic.get(topic);
      if (!selected?.length) return [];
      const title = topic === 'general-laws' ? 'Связи между разделами физики' : labels.get(topic);
      return [{id: topic, title, section, module: id, tasks: selected}];
    });
    return blocks.length ? [{id, title, section, blocks}] : [];
  });
}

export function buildCatalog(course, variant, inventory, keys) {
  const lessons = new Map(course.lessons.map(lesson => [lesson.id, lesson]));
  const byTopic = new Map();
  for (const lesson of course.lessons) {
    const [keys] = courseCards[lesson.id] || [[]];
    for (const key of keys.filter((_, i) => i % 2 === 0)) {
      if (!byTopic.has(key)) byTopic.set(key, []);
      byTopic.get(key).push(lesson.id);
    }
  }
  byTopic.set('general-laws', ['electric-field']);

  const authorTasks = [...additions, ...practiceTasks, ...kinematicsPractice, ...dynamicsPractice, ...conservationPractice, ...supplementalPractice];
  const tasks = [...courseTasks(course.lessons), ...mockTasks(variant), ...authorTasks.map(task => ({
    ...task, source: 'bank', sourceId: task.id, year: task.line ? variant.year : undefined,
    max: task.type === 'set' || task.type === 'ordered' ? 2 : 1,
  })), ...adaptFipi(inventory, keys)].map(task => ({...task, block: lessons.get(task.lesson).block}));

  const byId = new Map(tasks.map(task => [task.id, task]));
  const rank = {basic: 0, advanced: 2};
  const order = task => task.source === 'reference' ? 5 : task.cardPath && !task.key ? 3 : rank[task.level] ?? 1;
  const ordered = [...tasks].sort((a, b) => order(a) - order(b));
  const practiceModules = buildPracticeModules(ordered);
  const practiceBlocks = practiceModules.flatMap(module => module.blocks);
  return {
    blocks: course.blocks, legacyTopics, lessons, labels, byTopic, tasks: ordered, byId,
    practiceModules, practiceBlocks, lines: variant.tasks.map(task => task.n),
  };
}

export function taskTopics(task) {
  return [task.topic, ...task.extraTopics ?? []];
}

export function taskLessons(task, catalog) {
  return [...new Set([task.lesson, ...(task.extraTopics ?? []).flatMap(topic => catalog.byTopic.get(topic) ?? [])])];
}

export function answerIsCorrect(task, raw) {
  const clean = raw.trim().replace(/\s+/g, '');
  if (task.type === 'number') {
    const value = decimal(raw.trim());
    return value !== null && value === decimal(task.answer);
  }
  if (task.type === 'set' && clean.length !== task.answer.length) return false;
  return score(task, clean, 'ege') === task.max;
}
