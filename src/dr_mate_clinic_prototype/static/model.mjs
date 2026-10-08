// UX demonstration state only. These are not accepted clinical API contracts.
export const VERSION = 1;
export const EYES = ['OD', 'OS'];
export const EXTRA = {
  vvid: {label: 'VVID', unit: 'мм'}, dvid: {label: 'DVID', unit: 'мм'},
  nva: {label: 'NVA', unit: ''}, ph: {label: 'Pinhole', unit: ''},
};
export const clone = value => structuredClone(value);
const eyes = fields => Object.fromEntries(EYES.map(eye => [eye, Object.fromEntries(fields.map(f => [f, '']))]));

export function emptyMeasures() {
  return {
    acuity: {...eyes(['dva', 'nva', 'ph']), OU: {dva: '', nva: '', ph: ''}},
    keratometry: eyes(['flat', 'steep', 'axis', 'hvid', 'vvid', 'dvid']),
    auto: eyes(['sph', 'cyl', 'axis']),
    manifest: {...eyes(['sph', 'cyl', 'axis', 'add', 'hprism', 'hbase', 'vprism', 'vbase', 'dva', 'nva', 'ph']), OU: {dva: '', nva: '', ph: ''}},
    binocular: {distance: '', near: '', blur: '', break: '', recovery: '', note: ''},
  };
}

export function blankCorrection(kind, id) {
  return {id, kind, name: '', active: true, since: '', model: '', lab: '', wear: '', replacement: '', care: '', frame: '', frameSize: '', source: 'Внесено вручную · демо',
    eyes: eyes(kind === 'glasses' ? ['sph', 'cyl', 'axis', 'add', 'vertex', 'panto', 'bc'] : ['power', 'cyl', 'axis', 'bc', 'dia']), note: ''};
}

export function blankEncounter(id, date, corrections = []) {
  return {id, date, title: 'Контрольный осмотр', status: 'draft', corrections: clone(corrections), measures: emptyMeasures(),
    context: {correction: 'none', sleep: '', sinceRemoval: '', wearDuration: '', note: ''},
    source: {auto: null, keratometry: null}, imports: [],
    conclusion: {findings: '', decision: '', plan: ''}, followups: [],};
}

export function makeDemo() {
  const g1 = {...blankCorrection('glasses', 'g1'), name: 'Основные очки', since: '2026-05-12', model: 'Однофокальные', frame: 'Demo Frame 01', frameSize: '51 □ 18 — 140', source: 'Пре-тест · демонстрационная запись'};
  g1.eyes = {OD: {sph: '-2.00', cyl: '-0.75', axis: '180', add: '', vertex: '12', panto: '8', bc: '4'}, OS: {sph: '-2.50', cyl: '-0.50', axis: '90', add: '', vertex: '12', panto: '8', bc: '4'}};
  const g2 = clone(g1); Object.assign(g2, {id: 'g2', name: 'Запасные очки', since: '2025-11-03', frame: 'Demo Frame 02'});
  g2.eyes.OD.sph = '-1.75'; g2.eyes.OS.sph = '-2.25';
  const c1 = {...blankCorrection('contacts', 'c1'), name: 'Основная пара КЛ', model: 'Демонстрационная модель A', lab: 'Demo Lab', since: '2026-06-10', wear: 'Дневное ношение', replacement: 'По записи врача', care: 'Не указано'};
  c1.eyes = {OD: {power: '-2.00', cyl: '', axis: '', bc: '8.6', dia: '14.2'}, OS: {power: '-2.50', cyl: '', axis: '', bc: '8.6', dia: '14.2'}};
  const c2 = clone(c1); Object.assign(c2, {id: 'c2', name: 'Дополнительная пара КЛ', model: 'Демонстрационная модель B'});
  const old = clone(g2); Object.assign(old, {id: 'g0', name: 'Предыдущие очки', active: false, since: '2024-04-20'});
  const first = blankEncounter('exam-001', '2026-05-12', [g2, old]);
  const second = blankEncounter('exam-002', '2026-06-10', [g1, g2, c1, old]);
  const third = blankEncounter('exam-003', '2026-08-12', [g1, g2, c1, c2, old]);
  for (const exam of [first, second, third]) {
    exam.status = 'completed';
    exam.measures.manifest.OD = {...exam.measures.manifest.OD, sph: '-2.00', cyl: '-0.75', axis: '180', dva: '1.0'};
    exam.measures.manifest.OS = {...exam.measures.manifest.OS, sph: '-2.50', cyl: '-0.50', axis: '90', dva: '1.0'};
    exam.conclusion = {findings: 'Учебная запись для сравнения осмотров.', decision: 'Демонстрационное решение врача.', plan: 'Сопоставить результаты при следующем визите.'};
  }
  third.measures.keratometry.OD.vvid = '10.8'; third.measures.keratometry.OS.vvid = '10.7';
  third.source.keratometry = {label: 'Ручной ввод · демо', time: '2026-08-12T10:00:00'};
  third.followups = [{id: 'f1', text: 'Уточнить комфорт в запасных очках', type: 'reminder', status: 'active', due: '2026-09-09', origin: 'Осмотр #003 · 12.08.2026'}, {id: 'f2', text: 'Обсудить предыдущие измерения с пациентом', type: 'commitment', status: 'active', due: '2026-09-09', origin: 'Осмотр #003 · 12.08.2026'}, {id: 'f3', text: 'Контроль выполнения плана', type: 'action', status: 'pending', due: '2026-10-09', origin: 'Осмотр #003 · 12.08.2026'}];
  const current = blankEncounter('exam-004', '2026-09-09', third.corrections);
  current.context.sleep = '8'; current.context.sinceRemoval = '2';
  current.followups = clone(third.followups);
  return {version: VERSION, patient: {id: 'DEMO-001', name: 'Демонстрационный пациент', age: 28, occupation: 'Работа за компьютером', complaint: 'Обсудить текущую коррекцию'}, enabledExtra: ['vvid'], encounters: [first, second, third, current], currentId: current.id};
}

export const currentExam = state => state.encounters.find(e => e.id === state.currentId);
export function editable(exam) { if (exam.status !== 'draft') throw new Error('Завершённый осмотр доступен только для чтения.'); }
export function setMeasure(exam, group, eye, key, value) {
  editable(exam);
  const target = group === 'binocular' ? exam.measures.binocular : exam.measures[group]?.[eye];
  if (!target || !Object.hasOwn(target, key)) throw new Error('Неизвестный параметр.');
  target[key] = value;
  exam.cellSources ??= {};
  exam.cellSources[`${group}.${eye}.${key}`] = 'Ручной ввод · демо';
}
export function previousValue(state, exam, group, eye, key) {
  const index = state.encounters.findIndex(e => e.id === exam.id);
  for (const earlier of state.encounters.slice(0, index).reverse()) {
    const value = earlier.measures[group]?.[eye]?.[key];
    if (value !== undefined && value !== '') return {value, date: earlier.date};
  }
  return null;
}
export function enableExtra(state, key) {
  if (!Object.hasOwn(EXTRA, key)) throw new Error('Неизвестный параметр.');
  if (!state.enabledExtra.includes(key)) state.enabledExtra.push(key);
}
export function newEncounter(state, date) {
  if (state.encounters.some(e => e.status === 'draft')) throw new Error('Сначала завершите открытый черновик.');
  const previous = state.encounters.at(-1);
  if (!date || date < previous.date) throw new Error('Дата должна быть не раньше предыдущего осмотра.');
  const next = blankEncounter(`exam-${String(state.encounters.length + 1).padStart(3, '0')}`, date, previous.corrections);
  next.followups = clone(previous.followups).map(f => ({...f, status: ['pending', 'snoozed'].includes(f.status) && f.due <= date ? 'active' : f.status}));
  state.encounters.push(next); state.currentId = next.id;
  return next;
}
export function importDemo(exam, id, time) {
  editable(exam);
  if (exam.imports.some(i => i.id === id)) throw new Error('Этот пакет уже получен.');
  const packet = {id, time, label: 'Demo AR/K · пакет 01', auto: {OD: {sph: '-2.00', cyl: '-0.75', axis: '180'}, OS: {sph: '-2.50', cyl: '-0.50', axis: '90'}}, keratometry: {OD: {flat: '42.25', steep: '43.00', axis: '180', hvid: '11.8'}, OS: {flat: '42.50', steep: '43.25', axis: '90', hvid: '11.7'}}};
  let filled = 0, kept = 0;
  exam.cellSources ??= {};
  for (const group of ['auto', 'keratometry']) for (const eye of EYES) for (const [key, value] of Object.entries(packet[group][eye])) {
    if (exam.measures[group][eye][key] === '') {
      exam.measures[group][eye][key] = value;
      exam.cellSources[`${group}.${eye}.${key}`] = `${packet.label} · ${time}`;
      filled++;
    }
    else kept++;
  }
  exam.imports.push(packet);
  for (const group of ['auto', 'keratometry']) exam.source[group] = {label: packet.label, time};
  return {filled, kept};
}
export function measureSource(exam, group, eye, key) {
  if (exam.measures[group]?.[eye]?.[key] === '') return 'Не измерено';
  // Attribution is tracked per cell; numeric equality never proves provenance.
  return exam.cellSources?.[`${group}.${eye}.${key}`] || 'Ручной ввод · демо';
}
export function addCorrection(exam, correction) {
  editable(exam);
  if (!['glasses', 'contacts'].includes(correction.kind) || !correction.name.trim()) throw new Error('Укажите название коррекции.');
  exam.corrections.push(clone(correction));
}
export function completeEncounter(exam) {
  editable(exam);
  if (!exam.conclusion.decision.trim()) throw new Error('Запишите решение врача перед завершением.');
  if (measurementErrors(exam).length) throw new Error('Проверьте формат измерений: ' + measurementErrors(exam)[0]);
  exam.status = 'completed';
}

export function numericError(key, value) {
  if (value === '' || ['dva', 'nva', 'ph', 'hbase', 'vbase', 'distance', 'near', 'note'].includes(key)) return '';
  const normalized = value.replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) || !Number.isFinite(Number(normalized))) return 'Ожидается число';
  if (key === 'axis' && (Number(normalized) < 0 || Number(normalized) > 180)) return 'Ось: от 0 до 180°';
  if (['flat', 'steep', 'hvid', 'vvid', 'dvid', 'bc', 'dia', 'vertex', 'blur', 'break', 'recovery'].includes(key) && Number(normalized) <= 0) return 'Ожидается положительное число';
  return '';
}

export function measurementErrors(exam) {
  const errors = [];
  for (const [group, groupData] of Object.entries(exam.measures)) {
    const rows = group === 'binocular' ? [['OU', groupData]] : Object.entries(groupData);
    for (const [eye, values] of rows) for (const [key, value] of Object.entries(values)) {
      const error = numericError(key, value);
      if (error) errors.push(`${group} ${eye} ${key}: ${error}`);
    }
  }
  return errors;
}
export function correctionHistory(state, kind) {
  const records = new Map();
  for (const exam of [...state.encounters].reverse()) for (const correction of exam.corrections) {
    if (correction.kind === kind && !records.has(correction.id)) records.set(correction.id, {...clone(correction), lastSeen: exam.date});
  }
  return [...records.values()];
}
