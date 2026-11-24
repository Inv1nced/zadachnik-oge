import {exams} from '../../mocks/config.mjs';

const lessonTopics = {
  'velocity-graph': ['linear', 'velocity-chart'],
  'projectile-circle': ['acceleration', 'projectile', 'circle'],
  'newton-friction': ['newton', 'friction', 'elastic-force', 'weight', 'gravity'],
  'statics-fluids': ['statics', 'fluids', 'buoyancy', 'center-mass'],
  'momentum-energy': ['momentum', 'work-power', 'mechanical-energy', 'momentum-and-energy'],
  'oscillations-waves': ['oscillations', 'waves'],
  'gas-mkt': ['mkt', 'gas-state', 'isoprocesses'],
  'thermodynamic-work': ['gas-work', 'first-law', 'heat-engines'],
  'thermal-balance': ['heat-balance', 'phase', 'humidity'],
  'electric-field': ['coulomb', 'electric-strength', 'potential', 'general-laws'],
  capacitor: ['capacitance', 'capacitor-energy'],
  'dc-circuits': ['dc-resistors', 'emf', 'electric-power'],
  'magnetic-forces': ['ampere', 'lorentz'],
  induction: ['faraday-lenz', 'self-induction'],
  'lc-waves': ['lc-oscillation', 'em-waves', 'transformer'],
  refraction: ['reflection', 'refraction', 'total-reflection'],
  'thin-lens': ['lens-formula', 'lens-image'],
  'interference-grating': ['interference', 'grating'],
  'photons-photoeffect': ['photons', 'photoeffect'],
  'atomic-transitions': ['spectra'],
  'nuclear-decay': ['nucleus', 'radioactivity', 'nuclear-reactions'],
  'measurement-data': ['measurement', 'data-analysis', 'experiments'],
};
const lessonFor = new Map(Object.entries(lessonTopics).flatMap(([lesson, topics]) => topics.map(topic => [topic, lesson])));

// Order within a series matches the element numbers in the physics codifier.
const kesTopics = {
  '1.1': ['linear','linear','velocity-chart','acceleration','linear','acceleration','projectile','circle','circle'],
  '1.2': ['newton','newton','newton','newton','newton','gravity','elastic-force','friction','fluids'],
  '1.3': ['statics','center-mass','statics','fluids','fluids','buoyancy'],
  '1.4': ['momentum','momentum','momentum','work-power','work-power','mechanical-energy','mechanical-energy','mechanical-energy'],
  '1.5': ['oscillations','oscillations','oscillations','waves','waves'],
  '2.1': ['mkt','mkt','mkt','mkt','mkt','mkt','mkt','mkt','mkt','gas-state','gas-state','isoprocesses','humidity','humidity','phase','phase','phase'],
  '2.2': ['heat-balance','gas-work','heat-balance','heat-balance','phase','gas-work','first-law','heat-engines','heat-engines','heat-engines','heat-balance'],
  '3.1': ['coulomb','coulomb','electric-strength','electric-strength','potential','electric-strength','electric-strength','capacitance','capacitance','capacitance','capacitor-energy'],
  '3.2': ['dc-resistors','dc-resistors','dc-resistors','dc-resistors','emf','emf','dc-resistors','electric-power','electric-power','dc-resistors'],
  '3.3': ['ampere','ampere','ampere','lorentz'],
  '3.4': ['faraday-lenz','faraday-lenz','faraday-lenz','faraday-lenz','faraday-lenz','self-induction','self-induction'],
  '3.5': ['lc-oscillation','lc-oscillation','lc-oscillation','transformer','em-waves','em-waves'],
  '3.6': ['reflection','reflection','reflection','refraction','total-reflection','lens-image','lens-formula','lens-image','lens-image','interference','grating','refraction'],
  '4.1': ['photons','photons','photoeffect','photoeffect','photons'],
  '4.2': ['spectra','spectra','spectra'],
  '4.3': ['nucleus','radioactivity','radioactivity','nuclear-reactions'],
};

const defaultTopic = {
  mechanics: 'newton', kinematics: 'velocity-chart', dynamics: 'newton', statics: 'statics',
  conservation: 'mechanical-energy', 'oscillations-waves': 'oscillations',
  thermodynamics: 'first-law', 'molecular-physics': 'gas-state', 'thermal-processes': 'first-law',
  electrodynamics: 'general-laws', electrostatics: 'electric-strength', 'dc-circuits': 'dc-resistors',
  magnetism: 'ampere', induction: 'faraday-lenz', 'em-oscillations-waves': 'em-waves',
  optics: 'refraction', 'geometric-optics': 'refraction', 'wave-optics': 'interference',
  quantum: 'spectra', photons: 'photons', 'atomic-nuclear': 'nucleus', 'atomic-physics': 'spectra',
  'nuclear-physics': 'radioactivity', methods: 'data-analysis', measurement: 'measurement', experiment: 'experiments',
};

const sourceType = {short: 'short', extended: 'long', single: 'choice', multiple: 'set', matching: 'ordered'};
const keyType = {number: 'number', 'measurement-pair': 'measure', 'ordered-digits': 'ordered', 'unordered-digits': 'set'};

export function adaptFipi(inventory, keys) {
  return inventory.tasks.map(entry => {
    const exact = entry.kes.flatMap(code => {
      const match = /^(\d\.\d)\.(\d+)$/.exec(code);
      return match ? kesTopics[match[1]]?.[Number(match[2]) - 1] ?? [] : [];
    });
    const broad = [...entry.topicSlugs].reverse().flatMap(slug => defaultTopic[slug] ?? []);
    const methods = ['experiment','measurement'].filter(slug => entry.topicSlugs.includes(slug)).map(slug => defaultTopic[slug]);
    const combined = exact.includes('momentum') && exact.includes('mechanical-energy') ? ['momentum-and-energy'] : [];
    const tags = [...new Set([...methods, ...combined, ...exact, ...(exact.length ? [] : broad)])];
    const topic = tags[0] ?? 'general-laws';
    const verified = keys[entry.id];
    const key = entry.status === 'ready' && verified?.digest === entry.sourceDigest ? verified.key : null;
    const type = keyType[key?.rule] ?? sourceType[entry.answerType] ?? 'short';
    const inferred = suggestedLine(type, topic, entry, tags);
    return {
      id: entry.id, lesson: lessonFor.get(topic), topic, extraTopics: tags.slice(1),
      type, source: entry.status === 'ready' ? 'fipi' : 'reference', sourceId: entry.sourceCode,
      prompt: entry.title, skill: entry.title, official: entry.sourceUrl,
      cardPath: entry.cardPath, key, sourceStatus: entry.status, reason: entry.reason,
      hasFigure: entry.hasFigure, inferred, year: inferred ? 2027 : undefined,
    };
  });
}

function suggestedLine(type, topic, entry, tags) {
  if (entry.applicability === 'legacy-format' || type === 'long') return undefined;
  if (topic === 'measurement') return 19;
  if (topic === 'experiments' && type === 'set') return 20;
  if (type === 'measure' || type === 'choice') return undefined;
  const codes = new Set(entry.kes.map(code => code.split('.').slice(0, 2).join('.')));
  const areas = new Set([...codes].map(code => code[0]));
  if (areas.size !== 1 || tags[0] === 'general-laws') return undefined;
  const [area] = areas;
  if (type === 'set' || type === 'ordered') {
    const lines = type === 'set' ? {'1':5,'2':9,'3':14} : {'1':6,'2':10,'3':15,'4':17};
    return lines[area];
  }
  if (codes.size !== 1) return undefined;
  const [code] = codes;
  const line = {'1.1':1,'1.2':2,'1.3':4,'1.4':3,'1.5':4,'2.1':7,'2.2':8,
    '3.1':11,'3.2':11,'3.3':12,'3.4':12,'3.5':13,'3.6':13,'4.1':16,'4.2':16,'4.3':16}[code];
  return exams.ege.types[line - 1] === 'number' ? line : undefined;
}

export const bankLine = task => task.line ?? task.inferred;

export function originalAnswerMatches(key, raw) {
  const normalize = text => {
    const clean = text.trim().replaceAll('−', '-').replaceAll(',', '.');
    const decimal = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
    if (key.rule === 'number') return decimal.test(clean) ? Number(clean) : null;
    if (key.rule === 'measurement-pair') {
      const pair = clean.split(/\s*±\s*|\s*;\s*|\s+/);
      return pair.length === 2 && pair.every(item => decimal.test(item)) ? pair.map(Number).join(';') : null;
    }
    if (!/^[1-9](?:\s*(?:[,;]\s*)?[1-9])*$/.test(text.trim())) return null;
    const digits = text.replace(/[\s,;]+/g, '');
    return key.rule === 'unordered-digits' ? [...digits].sort().join('') : digits;
  };
  const parsed = normalize(raw);
  return parsed !== null && key.accepted.some(accepted => normalize(accepted) === parsed);
}

export const legacyTopics = Object.freeze(defaultTopic);
