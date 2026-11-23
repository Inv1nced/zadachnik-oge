import {exams, variantKey} from './config.mjs';

export function decimal(raw) {
  const value = raw.trim();
  if (!/^[+−-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(value)) return null;
  const [whole, fraction = ''] = value.replace(/[,+−]/g, ch => ({',':'.','+':'','−':'-'})[ch]).split('.');
  const negative = whole.startsWith('-');
  const integer = whole.replace(/^-/, '').replace(/^0+/, '') || '0';
  const remainder = fraction.replace(/0+$/, '');
  return (negative && (integer !== '0' || remainder) ? '-' : '') + integer + (remainder ? '.' + remainder : '');
}

export const hasAnswer = answer => !!answer?.trim();

export function score(task, raw = '', exam) {
  if (!hasAnswer(raw)) return 0;
  const input = raw.trim();
  const answer = task.answer;
  if (task.type === 'number') return Number(decimal(input) === decimal(answer));
  if (task.type === 'measure') {
    const parts = input.split('±').map(decimal);
    const expected = answer.split('±').map(decimal);
    return Number(parts.length === 2 && parts.every((part, i) => part !== null && part === expected[i]));
  }
  if (!/^\d+$/.test(input)) return 0;
  if (task.type === 'choice') return Number(input === answer);
  if (task.type === 'ordered') {
    if (input.length !== answer.length) return 0;
    const errors = [...input].filter((digit, i) => digit !== answer[i]).length;
    return errors === 0 ? task.max : errors === 1 ? task.max - 1 : 0;
  }
  if (task.type === 'set') {
    if (exam === 'oge' && input.length > answer.length) return 0;
    if (task.max === 1 && input.length !== answer.length) return 0;
    const unmatched = [...answer];
    let extras = 0;
    for (const digit of input) {
      const i = unmatched.indexOf(digit);
      if (i < 0) extras++;
      else unmatched.splice(i, 1);
    }
    const errors = Math.max(extras, unmatched.length);
    return errors === 0 ? task.max : errors === 1 ? task.max - 1 : 0;
  }
  return 0;
}

export function checkShort(variant, answers) {
  return variant.tasks.filter(task => task.type !== 'long').map(task => ({
    n: task.n, score: score(task, answers[task.n], variant.exam), max: task.max,
  }));
}

const prefixFor = (meta, id) => ({schemaVersion: 1, exam: meta.exam, id: meta.id, version: meta.version, attemptId: id});
export const makeSubmission = (variant, attempt) => ({
  ...prefixFor(variant, attempt.attemptId), kind: 'invariant-mock-submission', submittedAt: attempt.submittedAt,
  answers: variant.tasks.map(task => attempt.answers[task.n] || ''),
});
export const makeReview = (variant, submission, marks) => ({
  ...prefixFor(variant, submission.attemptId), kind: 'invariant-mock-review', marks,
});

function validHeader(packet, kind) {
  return packet?.schemaVersion === 1 && packet.kind === kind && Object.hasOwn(exams, packet.exam) &&
    /^[a-z0-9-]{1,48}$/.test(packet.id) && Number.isInteger(packet.version) && packet.version > 0 &&
    /^[a-f\d]{32}$/.test(packet.attemptId);
}

export function validateSubmission(packet) {
  if (!validHeader(packet, 'invariant-mock-submission') || !Number.isFinite(packet.submittedAt) ||
      !Array.isArray(packet.answers) || packet.answers.length !== exams[packet.exam].types.length ||
      packet.answers.some((answer, index) => typeof answer !== 'string' ||
        answer.length > (exams[packet.exam].types[index] === 'long' ? 6000 : 64))) throw new Error('submission');
  return packet;
}

export function validateReview(packet, variant, attemptId) {
  const long = variant.tasks.filter(task => task.type === 'long');
  if (!validHeader(packet, 'invariant-mock-review') || variantKey(packet) !== variantKey(variant) ||
      packet.attemptId !== attemptId || !Array.isArray(packet.marks) || packet.marks.length !== long.length ||
      packet.marks.some((mark, i) => !mark || mark.n !== long[i].n || !Number.isInteger(mark.score) ||
        mark.score < 0 || mark.score > long[i].max || typeof mark.comment !== 'string' ||
        mark.comment.length > 2000)) throw new Error('review');
  return packet;
}
