import {blankEncounter} from './model.mjs';

// Local UX state. Selecting a record never opens it or changes the clinical draft.
export function createWorkspace(currentId) {
  return {
    primary: {kind: 'exam', id: currentId}, secondary: null, selectedExam: currentId,
    focus: 'overview', arrangement: 'columns', ratio: 'equal', trail: [],
  };
}

export function resolveTarget(state, target) {
  if (!target || !['exam', 'attachment'].includes(target.kind)) throw new Error('Неизвестный материал.');
  const list = target.kind === 'exam' ? state.encounters : state.attachments;
  const item = list.find(item => item.id === target.id);
  if (!item || (item.patientId && item.patientId !== state.patient.id)) throw new Error('Материал не найден в этой карте.');
  return item;
}

export function selectExam(state, workspace, id) {
  resolveTarget(state, {kind: 'exam', id});
  workspace.selectedExam = id;
}

export function openTarget(state, workspace, target, beside = false, scroll = 0) {
  resolveTarget(state, target);
  if (beside) {
    if (workspace.primary.kind === target.kind && workspace.primary.id === target.id) throw new Error('Этот материал уже открыт в основной области.');
    workspace.secondary = {...target};
    return;
  }
  if (workspace.primary.kind === target.kind && workspace.primary.id === target.id) return;
  const {trail, ...snapshot} = workspace;
  workspace.trail.push({workspace: structuredClone(snapshot), currentId: state.currentId, scroll});
  workspace.primary = {...target};
  workspace.secondary = null;
  workspace.focus = 'overview';
  if (target.kind === 'exam') state.currentId = target.id;
}

export function returnToWorkspace(state, workspace) {
  const previous = workspace.trail.pop();
  if (!previous) return null;
  Object.assign(workspace, previous.workspace);
  state.currentId = previous.currentId;
  return previous.scroll;
}

export function swapPanes(state, workspace) {
  if (!workspace.secondary) return;
  [workspace.primary, workspace.secondary] = [workspace.secondary, workspace.primary];
  if (workspace.primary.kind === 'exam') state.currentId = workspace.primary.id;
}

const aliases = [
  ['окт', 'oct', 'оптическая когерентная томография'],
  ['перерыв', 'washout', 'отмена линз'],
  ['фото', 'фотография', 'изображение', 'снимок'],
];
export const normalize = text => String(text ?? '').normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё', 'е').replace(/\s+/g, ' ').trim();

export function searchPatient(state, query) {
  const q = normalize(query);
  if (!q) return [];
  const phrase = aliases.find(group => group.includes(q));
  const terms = phrase ? [phrase] : q.split(' ').map(term => aliases.find(group => group.includes(term)) || [term]);
  const entries = [
    ...state.encounters.filter(ex => !ex.patientId || ex.patientId === state.patient.id).map(ex => ({kind: 'exam', id: ex.id, date: ex.date, title: `${ex.title} · #${ex.id.replace('exam-', '')}`, fields: [ex.title, ex.id, ex.date, ex.context.note, ex.context.clinicalStatus, ...Object.values(ex.conclusion)]})),
    ...(state.attachments || []).filter(a => a.patientId === state.patient.id).map(a => ({kind: 'attachment', id: a.id, date: a.date, title: a.title, fields: [a.title, a.type, a.description, ...(a.tags || []), a.text]})),
  ];
  return entries.filter(entry => terms.every(options => options.some(term => normalize(entry.fields.join(' ')).includes(term))))
    .map(entry => ({...entry, match: entry.fields.find(field => terms.some(options => options.some(term => normalize(field).includes(term)))) || entry.title}))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const FLEX_PRESETS = [
  {code: 'bc2', label: 'BC 2', unit: ''}, {code: 'power2', label: 'PWR 2', unit: ''},
  {code: 'oz', label: 'OZ', unit: ''}, {code: 'sag', label: 'SAG', unit: ''},
  {code: 'tint', label: 'Tint', unit: ''}, {code: 'material', label: 'Материал', unit: ''},
];

export function addFlex(exam, correctionId, eye, field) {
  if (exam.status !== 'draft') throw new Error('Историческая запись доступна только для чтения.');
  const correction = exam.corrections.find(c => c.id === correctionId);
  if (!correction || !['OD', 'OS'].includes(eye)) throw new Error('Запись коррекции не найдена.');
  if (!field.label?.trim() || field.label.length > 80) throw new Error('Укажите название параметра до 80 символов.');
  correction.flex ??= {OD: [], OS: []};
  if (correction.flex[eye].some(f => normalize(f.label) === normalize(field.label))) throw new Error('Такой параметр уже есть у этого глаза.');
  correction.flex[eye].push({...field, label: field.label.trim(), unit: field.unit || '', value: ''});
}

export function ensureDemoExtensions(state) {
  // Additive migration: do not replace edits made in the v1 demonstration.
  if (!state.uiFixtureVersion) {
    const baseline = blankEncounter('exam-14679', '2026-03-09');
    baseline.status = 'completed'; baseline.title = 'Исходное обследование';
    baseline.conclusion.decision = 'Учебная запись без клинического назначения.';
    const washout = blankEncounter('exam-14680', '2026-04-09');
    washout.status = 'completed'; washout.title = 'Контрольный осмотр';
    washout.context.clinicalStatus = 'Перерыв от ношения КЛ / washout';
    washout.context.note = 'Врач указал период перерыва от ношения контактных линз. Синтетический пример для поиска.';
    washout.conclusion.decision = 'Клинический вывод в учебном сценарии не задан.';
    state.encounters.unshift(baseline, washout);
    state.uiFixtureVersion = 2;
  }
  for (const ex of state.encounters) {
    ex.patientId ??= state.patient.id;
    ex.context.clinicalStatus ??= '';
    for (const c of ex.corrections) c.flex ??= {OD: [], OS: []};
  }
  if (!state.attachments) state.attachments = [
    {id:'oct-01', patientId:state.patient.id, examId:'exam-002', date:'2026-06-10', type:'image', title:'ОКТ · учебное изображение OD', tags:['ОКТ','OCT','снимок'], description:'Схематическая иллюстрация для проверки просмотра; не результат обследования.', src:'/demo-oct.svg'},
    {id:'oct-report', patientId:state.patient.id, examId:'exam-002', date:'2026-06-10', type:'document', title:'ОКТ · демонстрационное заключение', tags:['ОКТ','OCT','документ'], description:'Учебный текстовый документ из истории пациента.', text:'ДЕМОНСТРАЦИОННЫЙ ДОКУМЕНТ\n\nОКТ / Optical coherence tomography\nДата: 10.06.2026\nКарта: DEMO-001\n\nЭтот материал создан для проверки поиска и параллельного просмотра. Диагностические показатели, интерпретация и клиническое заключение отсутствуют.\n\nИсходный материал связан с осмотром #002. Приложенный схематический рисунок не является настоящим сканом.\n\nАвтор записи: демонстрационный сценарий Dr. Mate Clinic.'},
    {id:'image-02', patientId:state.patient.id, examId:'exam-003', date:'2026-08-12', type:'image', title:'Изображение переднего отрезка · схема', tags:['фото','изображение','роговица'], description:'Учебная схема для сравнения изображений. Не фотография пациента.', src:'/demo-eye.svg'},
  ];
  return state;
}
