/* Shared mapping from FIPI topic codes to the blocks of the student bank. */
(() => {
  const tags = {
    1: ['1.1','1.3'], 2: ['1.2'], 3: ['1.4'], 4: ['1.5'], 5: ['1.6'],
    6: ['1.7','1.9'], 7: ['1.8','1.10'], 8: ['1.11','1.13'], 9: ['1.12'],
    10: ['1.14'], 11: ['1.8','1.10','1.11','1.12','1.13','1.14'],
    12: ['1.15','1.16'], 13: ['1.17'], 14: ['1.18','1.19'],
    15: ['1.15','1.16','1.17','1.18','1.19'],
    16: ['1.21'], 17: ['1.22'], 18: ['1.21','1.23'], 19: ['1.23'],
    20: ['1.20'], 21: ['1.24','1.25','1.26'], 22: ['1.27','1.28'], 23: ['1.29','1.30','1.31'],
    24: ['2.1','2.2','2.3','2.4'], 25: ['2.6','2.7','2.16','2.17'],
    26: ['2.5','2.8','2.9','2.15'], 27: ['2.10','2.11','2.12'], 28: ['2.13','2.14'],
    29: ['3.1','3.2','3.3','3.4','3.5'], 30: ['3.6','3.7','3.8','3.16'],
    31: ['3.9'], 32: ['3.10','3.11'], 33: ['3.12','3.13','3.14','3.15','3.17','3.18','3.19'],
    34: ['3.20','3.21'], 35: ['3.22','3.23','3.27'], 36: ['3.24','3.25','3.26','3.28'],
    37: ['4.2','4.3'], 38: ['4.1','4.4'], 39: ['4.5','4.6','4.7'],
  };
  const mechanicsTitles = [
    'Путь, перемещение, равномерное движение', 'Средняя скорость и графики',
    'Равноускоренное движение', 'Свободное падение', 'Движение по окружности',
    'Инерция, масса и плотность', 'Сила и второй закон Ньютона',
    'Третий закон Ньютона и упругость', 'Вес и трение', 'Всемирное тяготение',
    'Задачи по динамике', 'Импульс', 'Работа и мощность', 'Энергия и её сохранение',
    'Задачи на законы сохранения', 'Давление твёрдых тел и газов',
    'Давление жидкости и пресс', 'Атмосфера и сила Архимеда', 'Плавание тел',
    'Рычаг, блоки и КПД', 'Колебания и маятники', 'Волны и звук', 'Повторение по механике',
  ];
  const special = {
    40: ['Измерения, шкалы и погрешности', 'methods.measurements'],
    41: ['Планирование и анализ эксперимента', 'methods.experiments'],
    42: ['Работа с текстом', 'methods.text'],
    43: ['Физические понятия и смешанные задания', 'methods.concepts'],
  };
  const recaps = {
    heat: {id:'44', after:'28', group:'2', title:'Общие задания по тепловым явлениям'},
    electricity: {id:'45', after:'33', group:'3', title:'Общие задания по электромагнитным явлениям'},
    quantum: {id:'46', after:'39', group:'4', title:'Общие задания по квантовым явлениям'},
  };
  const methodModule = {
    section: 'methods', n: 'Методы и смешанные задачи',
    s: 'измерения, эксперименты, тексты и понятия', l: Object.keys(special),
  };
  const sections = window.OGE_EXTRA_PHYSICS.sections.concat([['methods','Методы и смешанные задания']]);
  const formats = {
    single: 'Выбор одного ответа', multiple: 'Выбор нескольких ответов',
    short: 'Краткий ответ', match: 'Соответствие', terms: 'Расстановка терминов',
    full: 'Развёрнутый ответ', other: 'Точный формат не указан',
  };
  const blockSection = n => {
    if (n <= 23) return 'mechanics';
    if (n <= 28 || n === 44) return 'heat';
    if (n <= 33 || n === 45) return 'electricity';
    if (n <= 36) return 'optics';
    if (n <= 39 || n === 46) return 'quantum';
    return 'methods';
  };
  const titles = Object.fromEntries(mechanicsTitles.map((title,i) => [i+1,title]));
  for (const [id, [title]] of Object.entries(window.OGE_EXTRA_PHYSICS.lessons)) titles[id] = title;
  for (const [id, [title]] of Object.entries(special)) titles[id] = title;
  for (const {id,title} of Object.values(recaps)) titles[id] = title;

  const byBlock = new Map(Object.keys(titles).map(id => [id,[]]));
  const byCode = new Map();
  for (const [code, topicCodes, format, groups, hasMirror, originalCode] of window.OGE_FIPI_TASKS) {
    const blocks = Object.entries(tags)
      .filter(([, topicList]) => topicCodes.some(tag => topicList.includes(tag)))
      .map(([block]) => block);
    // General assignments go to the review block. Cross-cutting skills have their own blocks.
    if (groups.includes('1') && !blocks.some(block => +block <= 23)) blocks.push('23');
    for (const [section, {group,id}] of Object.entries(recaps)) {
      const relevant = blocks.some(block => blockSection(+block) === section ||
        (section === 'electricity' && blockSection(+block) === 'optics'));
      if (groups.includes(group) && !relevant) blocks.push(id);
    }
    for (const [block, [, group]] of Object.entries(special)) {
      if (groups.includes(group)) blocks.push(block);
    }
    if (!blocks.length || (groups.includes('methods') && !blocks.some(block => Object.hasOwn(special,block)))) blocks.push('43');
    const item = { code, topicCodes, format, blocks, hasMirror, originalCode };
    byCode.set(code,item);
    blocks.forEach(block => byBlock.get(block).push(item));
  }

  const officialUrl = code => 'https://oge.fipi.ru/bank/questions.php?proj=B24AFED7DE6AB5BC461219556CCA4F9B&search=1&qid=' + (byCode.get(code)?.originalCode || code);
  const mirrorUrl = code => 'https://ege-fipi.ru/tasks/OGEPHYS' + code;
  const label = (block,code) => `Блок ${block} · ФИПИ ${code}`;
  const sectionBlocks = section => Object.keys(titles).filter(block => blockSection(+block) === section);
  const sectionItems = section => {
    const blocks = sectionBlocks(section);
    return [...new Set(blocks.flatMap(block => byBlock.get(block)))].sort((a,b) => a.code.localeCompare(b.code));
  };
  const mergedInto = {17:'16',46:'39'};
  const groupTitles = {
    16:'Давление твёрдых тел, жидкостей и газов',
    39:'Ядерные реакции, излучение и общие вопросы',
  };
  // Rules run in this order so a task appears only once within its original topic block.
  const themes = {
    11:[['Равнодействующая и второй закон Ньютона','1.8','1.10'],['Упругость и трение','1.12','1.13'],['Третий закон Ньютона и тяготение','1.11','1.14']],
    14:[['Кинетическая и потенциальная энергия','1.18'],['Сохранение энергии и нагревание','2.8']],
    15:[['Импульс и его сохранение','1.15','1.16'],['Механическая работа и мощность','1.17'],['Превращение энергии при нагревании','2.8']],
    16:[['Давление жидкости и закон Паскаля','1.22','1.23']],
    18:[['Архимедова сила','1.23']],
    23:[['Практические работы по механике','1.29']],
    26:[['Тепловой баланс и электрический нагрев','3.10'],['Тепловое равновесие и баланс','2.5','2.9','2.15'],['Нагревание, охлаждение и теплоёмкость','2.8']],
    27:[['Плавление и кристаллизация','2.12'],['Испарение, конденсация и влажность','2.10','2.11']],
    29:[['Электризация тел','3.1'],['Сохранение заряда и электрическое поле','3.2','3.3','3.4','3.5']],
    30:[['Сила тока, сопротивление и измерения','3.6','3.7','3.16'],['Закон Ома и цепи','3.8']],
    32:[['Энергия тока и тепловой баланс','2.9','3.11'],['Работа и мощность тока','3.10']],
    33:[['Магнитное поле и магниты','3.12','3.13','3.14'],['Электромагнитная индукция','3.15'],['Электромагнитные волны','3.19']],
    40:[['Измерения в механике','1.29']],
    41:[['Эксперименты по механике','1.29'],['Тепловые эксперименты','2.8','2.15'],['Электрические и оптические опыты','3.1','3.7','3.16','3.26']],
  };
  const byGroup = new Map();
  const byParent = new Map();
  const byResponse = [
    ['Краткий ответ', item => item.format === 'short'],
    ['Развёрнутый ответ', item => item.format === 'full'],
    ['Выбор, термины и соответствие', item => !['short','full'].includes(item.format)],
  ];
  function sortInto(items, rules, restTitle, matches) {
    let remaining = items.slice();
    const groups = [];
    for (const [title,...rule] of rules) {
      const selected = remaining.filter(item => matches(item,rule));
      if (selected.length < 10) continue;
      groups.push([title,selected]);
      remaining = remaining.filter(item => !matches(item,rule));
    }
    if (!remaining.length) return groups;
    if (remaining.length < 10 && groups.length) {
      const smallest = groups.reduce((a,b) => a[1].length <= b[1].length ? a : b);
      smallest[0] += ' и смешанные задачи';
      smallest[1].push(...remaining);
    } else {
      groups.push([restTitle,remaining]);
    }
    return groups;
  }
  function splitGroup(title,items) {
    if (items.length <= 50) return [[title,items]];
    const formats = sortInto(items,byResponse,'Другие форматы',(item,[test])=>test(item));
    return formats.flatMap(([formatTitle,group])=>{
      // Even page sizes prevent a tiny last block when the total is just above 50.
      const parts = Math.ceil(group.length / 50);
      return Array.from({length:parts},(_,i)=>[
        title + ' · ' + formatTitle + (parts > 1 ? ' ' + (i+1) + '/' + parts : ''),
        group.slice(Math.floor(i*group.length/parts),Math.floor((i+1)*group.length/parts)),
      ]);
    });
  }
  for (const [parent,original] of byBlock) {
    if (Object.hasOwn(mergedInto,parent)) continue;
    const linked = Object.entries(mergedInto).filter(([,into])=>into===parent).flatMap(([from])=>byBlock.get(from));
    const items = [...new Set([...original,...linked])];
    const title = groupTitles[parent] || titles[parent];
    const named = items.length>50 ?
      sortInto(items,themes[parent]||[],title,(item,topicCodes)=>topicCodes.some(code=>item.topicCodes.includes(code))) :
      [[title,items]];
    const parts = named.flatMap(([name,part])=>splitGroup(name,part));
    const groups = parts.map(([name,part],i)=>{
      const id = parts.length===1?parent:parent+'.'+(i+1);
      const group = {id,parent,title:name,items:part};
      byGroup.set(id,group);
      return group;
    });
    byParent.set(parent,groups);
  }
  function locateGroup(id,code) {
    const direct = byGroup.get(id);
    const mergedParent = Object.hasOwn(mergedInto,id) ? mergedInto[id] : null;
    const candidates = byParent.get(mergedParent||direct?.parent||id) || [];
    if (direct && (!code || direct.items.some(item=>item.code===code))) return direct;
    const expected = code || (mergedParent && byBlock.get(id)[0]?.code);
    return candidates.find(group=>group.items.some(item=>item.code===expected)) || candidates[0];
  }
  window.OGE_FIPI = { sections, methodModule, recaps, titles, formats, byBlock, byCode, blockSection,
    sectionBlocks, sectionItems, officialUrl, mirrorUrl, label, byGroup, byParent, locateGroup };
})();
