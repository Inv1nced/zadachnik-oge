export const exams = {
  ege: {
    label: 'ЕГЭ', minutes: 235, archive: 'https://doc.fipi.ru/ege/demoversii-specifikacii-kodifikatory/2027/fi_11_2027.zip',
    types: ['number','number','number','number','set','ordered','number','number','set','ordered','number','number','number','set','ordered','number','ordered','set','measure','set','long','long','long','long','long','long'],
    points: [1,1,1,1,2,2,1,1,2,2,1,1,1,2,2,1,2,2,1,1,3,2,2,3,3,4],
    rules: 'В заданиях №1–20 запишите число, последовательность цифр или показание прибора с погрешностью. В №21–26 запишите ход решения. В №26 обоснуйте применимость выбранной модели.',
  },
  oge: {
    label: 'ОГЭ', minutes: 180, archive: 'https://doc.fipi.ru/oge/demoversii-specifikacii-kodifikatory/2027/fi_9_2027.zip',
    types: ['ordered','ordered','choice','ordered','choice','number','number','number','number','number','number','ordered','ordered','set','choice','set','long','long','long','long','long','long'],
    points: [2,2,1,2,1,1,1,1,1,1,1,2,2,2,1,2,3,2,2,3,3,3],
    rules: 'В заданиях №1–16 запишите число или номера ответов. В №17–22 запишите ход решения. №17 здесь можно выполнить по выданным измерениям. На экзамене измерения проводят самостоятельно на реальном оборудовании.',
  },
};

export const typeLabel = {
  number: 'Число', choice: 'Одна цифра', ordered: 'Цифры по порядку',
  set: 'Номера верных пунктов', measure: 'Показание и погрешность', long: 'Развёрнутый ответ',
};

export const dataRoot = new URL('./data/', import.meta.url);
export const variantKey = ({exam, id, version}) => `${exam}/${id}/${version}`;
export const studentLink = (variant, base = location.href) => {
  const url = new URL('mocks.html', base);
  url.search = new URLSearchParams({exam: variant.exam, variant: variant.id, v: variant.version});
  return url.href;
};

export function checkVariant(variant, meta) {
  const spec = exams[meta.exam];
  if (!variant || variantKey(variant) !== variantKey(meta) || variant.year !== 2027 ||
      variant.tasks?.length !== spec.types.length || typeof variant.label !== 'string') throw new Error('variant');
  for (const [index, task] of variant.tasks.entries()) {
    if (task.n !== index + 1 || task.type !== spec.types[index] || task.max !== spec.points[index] ||
        !task.prompt || !task.topic || !task.skill || !task.solution) throw new Error('task');
    if (task.type === 'long' ? task.criteria?.length !== task.max + 1 :
        typeof task.answer !== 'string' || !task.answer) throw new Error('criteria');
  }
  return variant;
}

export async function readJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('fetch');
  return response.json();
}

export const getCatalog = () => readJSON(new URL('catalog.json', dataRoot));
export const getPayload = meta => readJSON(new URL(meta.file, dataRoot));
