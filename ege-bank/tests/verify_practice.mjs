import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerIsCorrect, buildCatalog} from '../../bank/ege/catalog.mjs';
import {originalAnswerMatches} from '../../bank/ege/fipi.mjs';

const read = path => JSON.parse(readFileSync(new URL('../../' + path, import.meta.url), 'utf8'));
const course = read('lessons/ege.json');
const variant = read('mocks/data/ege-01-v1.json');
const keys = read('ege-data/v1/verified-keys.json');
const practice = buildCatalog(course, variant, read('ege-data/v1/practice-catalog.json'), keys);
const full = buildCatalog(course, variant, read('ege-data/v1/catalog.json'), keys);

assert.deepEqual(practice.tasks, full.tasks.filter(task => task.source !== 'reference'));
assert.deepEqual(practice.practiceBlocks, practice.practiceModules.flatMap(module => module.blocks));
assert.equal(new Set(practice.practiceModules.map(module => module.id)).size, practice.practiceModules.length);
assert.deepEqual([...new Set(practice.practiceModules.map(module => module.section))], practice.blocks.map(section => section.id));
assert.deepEqual(practice.practiceBlocks.map(block => block.id).sort(), [...practice.byTopic.keys()].sort());
assert.deepEqual(
  practice.practiceModules.filter(module => module.section === 'mechanics').map(module => module.id),
  ['kinematics', 'dynamics', 'statics', 'hydrostatics', 'momentum', 'work-energy', 'mechanical-waves'],
);
for (const module of practice.practiceModules) {
  assert.ok(module.blocks.length, module.id);
  for (const block of module.blocks) {
    assert.equal(block.section, module.section);
    assert.equal(block.module, module.id);
  }
}
const assigned = new Set();
for (const block of practice.practiceBlocks) {
  assert.ok(block.title, block.id);
  assert.ok(block.tasks.length >= (block.section === 'mechanics' ? 9 : 4), block.id);
  const automaticallyChecked = block.tasks.filter(task => task.key || (task.type !== 'long' && task.answer));
  assert.ok(automaticallyChecked.length >= (block.section === 'mechanics' ? 8 : 4), block.id);
  for (const task of block.tasks) {
    assert.equal(task.block, block.section);
    assert.equal(task.topic, block.id);
    assert.ok(task.prompt || task.cardPath, task.id);
    assert.ok(!assigned.has(task.id), task.id);
    assigned.add(task.id);
  }
}
assert.equal(assigned.size, practice.tasks.length);
assert.ok(practice.tasks.length >= 425);
assert.ok(practice.tasks.filter(task => task.block === 'mechanics').length >= 199);

const collision = practice.byId.get('practice-collision-spring');
assert.ok(answerIsCorrect(collision, '0,40'));
assert.ok(!answerIsCorrect(collision, '0,04'));
const pendulum = practice.byId.get('ballistic-pendulum');
assert.ok(originalAnswerMatches(pendulum.finalCheck, '20,0'));
assert.ok(!originalAnswerMatches(pendulum.finalCheck, '20 м/с'));
assert.ok(pendulum.solution && pendulum.criteria.length);

console.log(`${practice.practiceModules.length} модуля · ${practice.practiceBlocks.length} учебных блоков · ${practice.tasks.length} заданий с условиями`);
