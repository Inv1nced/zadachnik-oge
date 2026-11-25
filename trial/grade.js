export function grade(task, values, core = globalThis.OgeCore) {
  const expected = task.fields?.map(field => field.value) ?? [...(task.key ?? '')];
  if (task.kind === 'choice') {
    if (!values.length) return 'blank';
    return [...values].sort().join('') === [...expected].sort().join('') ? 'correct' : 'wrong';
  }
  if (values.length !== expected.length || values.some(value => !String(value).trim())) return 'blank';
  if (task.kind === 'ordered') return values.join('') === expected.join('') ? 'correct' : 'wrong';
  if (task.kind !== 'numeric') return 'oral';
  if (!values.every(core.numeric)) return 'format';
  return task.fields.every((field, index) => {
    const value = Number(core.norm(values[index]));
    if (Number.isInteger(field.decimals)) {
      const factor = 10 ** field.decimals;
      const rounded = number => Math.sign(number) * Math.round((Math.abs(number) + Number.EPSILON) * factor) / factor;
      return Math.abs(rounded(value) - rounded(field.value)) <= (field.absoluteTolerance ?? 0) + Number.EPSILON * factor;
    }
    if (typeof field.absoluteTolerance === 'number') {
      return Math.abs(value - field.value) <= field.absoluteTolerance + Number.EPSILON * Math.max(1, Math.abs(field.value));
    }
    return core.correct([null, null, null, 'b', field.value], value);
  }) ? 'correct' : 'wrong';
}
