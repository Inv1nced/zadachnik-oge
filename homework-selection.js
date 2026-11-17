/* Choose a varied set for the current lesson. IDs from previous issues remain valid. */
(function (root) {
'use strict';

const extraBlocks = {
  1:[1,2,3],8:[14,15],14:[40,41,47,6,8,9,18,20],16:[3,7,9,12,16,17,19,21,23],
  17:[24],18:[25],19:[26],20:[27],21:[27],22:[28],23:[26],24:[26,32],25:[41,25,40],
  26:[44,24,25,26,27,28],27:[29],28:[30,40],29:[30,41],30:[30],
  31:[31],32:[31],33:[31],34:[32],35:[32],36:[41,47,30,31,32,40],
  37:[33],38:[33],39:[33],40:[45,29,30,31,32,33],
  41:[34],42:[35],43:[36],44:[47,36,41],45:[37],46:[38],47:[39],
  48:[46,37,38,39],49:[2,3,21,30],50:[41,42,40],51:[23,43,25,36],
  52:[32,15,26,44,'X'],53:[43,40,3,16,26,30,38,45],
  54:[47,42,41,32,26,23,15],55:[43,40,42],56:[43,44,45,46,42,32,15],
};

const topicFilter = {
  14: /[пП]лотност|[дД]инамометр|плеч[оа]|упругост|трени|[аА]рхимед|бруск/,
  18: /температур|внутренн|теплопровод|конвекц|излучен|теплообмен|чехол/i,
  19: /теплоёмкост|нагрева|остыван|изменение температур|увеличил[аи]?сь температур/i,
  20: /плавлен|жидк.*тв[её]рд|кристаллизац|затвердев/i,
  21: /влажност|испар|кипени|конденс|рос[аыу]/i,
  23: /баланс|смешал|смесь|охладил|остыла|остыл|теплообмен/i,
  24: /график|мощност|потер/i,
  25: /тепл|вод[ауы]|температур|термометр|охлажден|испар/i,
  28: /амперметр|вольтметр|заряд|схем[ау]|электрическ.*ток/i,
  29: /сопротивлен|график|напряжен|амперм|вольтм/i,
  30: /удельн|поперечн|длин[ау]|материал|сечени|сопротивлен.*увелич/i,
  31: /последовательно/i,
  32: /параллельно/i,
  33: /смешанн|параллельно.*последовательно|последовательно.*параллельно|рисунок/sui,
  34: /работ[ау]|мощност/i,
  35: /нагрел|теплот|кВт|кипени|ламп|нагрева/i,
  36: /резистор|ток[ауе]?\b|электр|цеп[ьи]|вольтметр|амперметр/i,
  37: /компас|эрстед|магнитн.*пол[ея]|магнит.*стрелк/i,
  38: /индукци|ленца|катушк|индукционн/i,
  39: /радиостанц|радиоволн|сигнал|электромагнитн.*волн|излучен|спектр/i,
  44: /линз|оптическ|фокус|изображен|экран/i,
  49: /график/i,
};

function blocksFor(lesson) {
  const ids = extraBlocks[lesson.id] || lesson.siteBlocks || [];
  return ids.map(String);
}

const labLessons = new Set([14,36,44,54]);
const textLessons = new Set([50,54,56]);
const shortReview = new Set([53]);
const keyText = text => String(text||'').toLowerCase().replace(/\s+/g,' ').trim();
const topicOf = row => row[8]?.skill || row[6];
function familyOf(row) {
  if (row[8]?.family) return row[8].family;
  const condition = keyText(row[6]);
  if (condition.includes('свинцовых шара массами') && condition.includes('абсолютно неупруг')) return 'один и тот же удар';
  if (/^на рисунке представле[нн].*график/.test(condition) && /два (верных|правильных) утверждения/.test(condition)) {
    return row[2] + ':выбор утверждений по графику';
  }
  return condition.replace(/[−-]?\d+(?:[.,]\d+)?/g,'#').replace(/\b[а-яa-z]\d+\b/g,'#');
}
function kindOf(row, core) {
  if (core.isTerms(row) || row[3]==='m') return 'data';
  if (row[3]==='b' && /запиши номер ответа|выбери верный ответ|\b1\)[\s\S]+2\)[\s\S]+3\)/i.test(row[6])) return 'data';
  if (row[3]==='q') return 'explain';
  if (row[3]==='r') return 'solve';
  if (row[3]==='e') return 'lab';
  return 'calculate';
}

function choose({lesson, author=[], bank=[], done={}, issued=[], limit=10}, core=root.OgeCore) {
  const blocks = blocksFor(lesson);
  const allowed = topicFilter[lesson.id];
  const used = new Set(issued);
  const active = row => !row[8]?.archived && (!done[row[0]] || done[row[0]]==='repeat');
  const relevant = bank.filter(row => blocks.includes(row[2]) && (!allowed || allowed.test(topicOf(row)) || allowed.test(row[6])));
  const practice = author.filter(row => !row[8]?.graph || lesson.id===1 || lesson.id===49);
  const options = [...new Map([...relevant,...practice].filter(active).map(row=>[row[0],row])).values()]
    .map(row=>({row,kind:kindOf(row,core),family:familyOf(row),text:keyText(row[6])}))
    .filter(item => (item.kind!=='lab'||labLessons.has(lesson.id)) &&
      (!shortReview.has(lesson.id)||core.checkable(item.row)));
  const chosen = [], families = new Map(), counts = new Map(), texts = new Set(), selected = new Set();

  function take(kind, maxFamily=1, preferredBlock) {
    const eligible = options.filter(item => !selected.has(item.row[0]) && !texts.has(item.text) &&
      (!kind||item.kind===kind) && (!preferredBlock||item.row[2]===preferredBlock) &&
      (families.get(item.family)||0)<maxFamily);
    eligible.sort((a,b)=>{
      const aId=a.row[0], bId=b.row[0];
      return (done[bId]==='repeat')-(done[aId]==='repeat') ||
        used.has(aId)-used.has(bId) ||
        Number(!a.row[8]?.skill)-Number(!b.row[8]?.skill) ||
        (counts.get(a.row[2])||0)-(counts.get(b.row[2])||0);
    });
    const item = eligible[0];
    if (!item) return;
    const {row,family,text} = item;
    chosen.push(row);
    selected.add(row[0]);
    texts.add(text);
    families.set(family,(families.get(family)||0)+1);
    counts.set(row[2],(counts.get(row[2])||0)+1);
  }

  const plan=['calculate','data','calculate','explain','data','solve','calculate','data','solve','explain'];
  if (textLessons.has(lesson.id)) take('explain',1,'42');
  if (labLessons.has(lesson.id)) take('lab',1,'47');
  for (const kind of plan) {
    if(chosen.length>=limit) break;
    take(kind);
  }
  // Permit a second variant of a skill only when the lesson has too little variety.
  for(const cap of [1,2]) while (chosen.length<limit) {
    const size=chosen.length;
    take(null,cap);
    if(size===chosen.length)break;
  }
  const stage = row => row[3]==='e'?3:row[3]==='r'?2:core.checkable(row)?0:1;
  return chosen.sort((a,b)=>stage(a)-stage(b));
}

const api={blocksFor,choose};
root.OgeHomeworkSelection=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
