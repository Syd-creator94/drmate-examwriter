import {
  VERSION, EYES, EXTRA, clone, makeDemo, currentExam, editable, setMeasure,
  previousValue, enableExtra, newEncounter, importDemo, measureSource,
  blankCorrection, addCorrection, completeEncounter, correctionHistory,
  numericError, measurementErrors,
} from './model.mjs';

import {createWorkspace, resolveTarget, selectExam, openTarget, returnToWorkspace, swapPanes, searchPatient, FLEX_PRESETS, addFlex, ensureDemoExtensions} from './workspace.mjs';

const STORAGE_KEY = 'drmate.clinic.synthetic-demo.v1';
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
let state = makeDemo();
let storageOK = true;
let recoveryMessage = '';
try {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.version !== VERSION || parsed.patient?.id !== 'DEMO-001' || !Array.isArray(parsed.encounters) || !currentExam(parsed)) throw new Error('Incompatible demo');
    state = parsed;
  }
} catch {
  recoveryMessage = 'Сохранённое демо не удалось открыть. Загружен исходный учебный сценарий.';
}
state = ensureDemoExtensions(state);
const workspace = createWorkspace(state.currentId);
const view = {details:false, tab:'exam', layout:'horizontal', correction:{glasses:0,contacts:0}, followAll:false, query:'', selectedAttachment:state.attachments[0]?.id, zoom:{}, collapsed:new Set()};
let theme = 'auto';
try { const saved=localStorage.getItem('drmate.clinic.theme'); if (['light','dark','auto'].includes(saved)) theme=saved; } catch {}
const deviceTheme=matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  document.documentElement.dataset.theme=theme==='auto'?(deviceTheme.matches?'dark':'light'):theme;
  document.documentElement.dataset.themeChoice=theme;
}
deviceTheme.addEventListener('change',applyTheme);
applyTheme();
let toastTimer;
const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date = value => value ? value.split('T')[0].split('-').reverse().join('.') : 'Дата не указана';
const exam = () => currentExam(state);
const locked = () => exam().status !== 'draft';
const suffix = () => locked() ? 'disabled' : '';
const no = item => item.id.replace('exam-', '');
const cog = `<svg class="cog" viewBox="0 0 40 40" aria-hidden="true"><path fill="currentColor" d="M17 1h6l1 5 4 2 5-2 4 5-4 4 1 4 5 2-1 6-6 0-3 3 0 6-6 2-3-5-4-1-4 4-5-4 2-5-2-4-5-1v-6l5-1 2-4-2-5 5-4 4 3z"/><circle cx="20" cy="20" r="11" fill="#191b1c"/><path d="M20 10v20M10 20h20" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="20" r="4" fill="#191b1c" stroke="currentColor"/></svg>`;
const button = (action, text, attrs = '') => `<button type="button" data-action="${action}" ${attrs}>${text}</button>`;

function notify(text) {
  clearTimeout(toastTimer);
  document.querySelector('#toast').textContent = text;
  toastTimer = setTimeout(() => { document.querySelector('#toast').textContent = ''; }, 5000);
}
function save() {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageOK = true; }
  catch { storageOK = false; }
  const label = document.querySelector('#save-state');
  if (label) label.textContent = storageOK ? 'Сохранено в этой вкладке' : 'Только в памяти · сохранение недоступно';
}
function selectedCorrection(kind) {
  const records = exam().corrections.filter(c => c.kind === kind && c.active);
  view.correction[kind] = Math.max(0, Math.min(view.correction[kind], records.length - 1));
  return {records, item: records[view.correction[kind]]};
}
function prior(group, eye, key) {
  const old = previousValue(state, exam(), group, eye, key);
  return old ? `<span class="previous" title="Предыдущее измерение · ${date(old.date)}">${e(old.value)} <span class="micro">· ${date(old.date)}</span></span>` : '';
}
function input(group, eye, key, label) {
  const value = group === 'binocular' ? exam().measures.binocular[key] : exam().measures[group][eye][key];
  const path = `${group}.${eye}.${key}`;
  const error = numericError(key, value);
  const source = measureSource(exam(), group, eye, key);
  const sourceText = ['auto', 'keratometry'].includes(group) && value !== '' ? `<span class="source-mark" title="${e(source)}">${source.startsWith('Demo') ? 'DEMO AR/K' : 'Вручную'}</span>` : '';
  let control;
  if (key === 'hbase' || key === 'vbase') {
    const bases = key === 'hbase' ? ['BI', 'BO'] : ['BU', 'BD'];
    control = `<select data-measure="${path}" aria-label="${e(label)} ${eye}" ${suffix()}><option value="">—</option>${bases.map(b => `<option ${value === b ? 'selected' : ''}>${b}</option>`).join('')}</select>`;
  } else control = `<input data-measure="${path}" aria-label="${e(label)} ${eye}" value="${e(value)}" placeholder="—" autocomplete="off" inputmode="${['dva', 'nva', 'ph', 'distance', 'near', 'note'].includes(key) ? 'text' : 'decimal'}" aria-invalid="${Boolean(error)}" title="${e(error || label)}" ${suffix()}>`;
  return `${control}${sourceText}${group !== 'binocular' ? prior(group, eye, key) : ''}`;
}
function table(group, columns, rows = EYES) {
  return `<div class="table-scroll"><table class="clinical-table"><thead><tr><th scope="col">Глаз</th>${columns.map(([key,label,unit]) => `<th scope="col">${e(label)}${unit ? ` <span class="micro">${e(unit)}</span>` : ''}</th>`).join('')}</tr></thead><tbody>${rows.map(eye => `<tr><th scope="row" class="eye">${eye}</th>${columns.map(([key,label]) => `<td>${input(group,eye,key,label)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const card = (number, title, content, controls = '', foot = '') => `<section class="card"><div class="card-head"><h2>${number ? `<span class="section-number">${number}</span>` : ''}${title}</h2><div class="card-controls">${controls}${number?button('focus-section',workspace.focus===number?'↙':'↗',`class="focus-button" data-focus="${number}" aria-label="${workspace.focus===number?'Свернуть: '+title:'Раскрыть: '+title}" aria-expanded="${workspace.focus===number}" title="${workspace.focus===number?'Вернуть маленькие карточки':'Раскрыть карточку'}"`):''}</div></div>${content}${foot ? `<div class="card-foot">${foot}</div>` : ''}</section>`;

function patientPanel() {
  const past=[...state.encounters].filter(item=>item.status==='completed').reverse();
  const draft=state.encounters.find(item=>item.status==='draft');
  return `<aside class="patient-panel">
    <div class="patient-top"><div class="patient-mark">DM<span>001</span></div><div><span class="eyebrow">Пациент / DEMO-001</span><h2 class="patient-name">Учебная карта</h2><span class="micro">28 лет · синтетический пациент</span></div></div>
    <div class="patient-search"><label for="patient-search" class="side-label">Поиск в этой карте</label><div class="search-control"><span aria-hidden="true">⌕</span><input id="patient-search" type="search" value="${e(view.query)}" placeholder="ОКТ, washout, перерыв…" autocomplete="off" aria-controls="search-results"></div><div id="search-results">${searchResults()}</div></div>
    <div class="side-section patient-context"><h3>Контекст <span class="micro">/ пациента</span></h3><p>${e(state.patient.complaint)}</p><dl><dt>Занятость</dt><dd>За компьютером</dd><dt>Аллергии</dt><dd>Не уточнено</dd><dt>Препараты</dt><dd>Не уточнено</dd></dl></div>
    <div class="side-section"><div class="row between"><h3>Осмотры</h3><span class="micro">${state.encounters.length} записей</span></div>
      <div class="recent-visits">${past.slice(0,5).map(item=>button('select-visit',`<span>${date(item.date)}</span><span class="micro">#${no(item)}</span>`,`class="recent-visit ${workspace.selectedExam===item.id?'selected':''}" data-id="${item.id}" aria-pressed="${workspace.selectedExam===item.id}"`)).join('')}</div>
      <label class="field"><span>Все осмотры · выбрать запись</span><select id="history-select" aria-label="Все осмотры">${[...state.encounters].reverse().map(item=>`<option value="${item.id}" ${workspace.selectedExam===item.id?'selected':''}>${date(item.date)} · ${e(item.title)} · #${no(item)}</option>`).join('')}</select></label>
      <div class="history-actions">${button('open-selected','Войти в осмотр','class="primary"')}${button('compare-selected','Открыть рядом')}</div>
      ${draft?button('open-draft',`Текущий черновик · #${no(draft)} →`,`class="text draft-link" data-id="${draft.id}"`):''}
    </div>
    <div class="side-section"><div class="row between"><h3>Материалы</h3><span class="micro">${state.attachments.length}</span></div><select id="attachment-select" aria-label="Материалы пациента">${state.attachments.map(a=>`<option value="${a.id}" ${view.selectedAttachment===a.id?'selected':''}>${date(a.date)} · ${e(a.title)}</option>`).join('')}</select><div class="history-actions">${button('open-attachment','Открыть')}${button('compare-attachment','Открыть рядом')}</div></div>
    <div class="side-ornament" aria-hidden="true"><svg viewBox="0 0 200 90"><g fill="none" stroke="currentColor"><circle cx="100" cy="45" r="29"/><circle cx="100" cy="45" r="23" stroke-dasharray="2 4"/><circle cx="100" cy="45" r="10"/><path d="M8 45H67m66 0h59M100 6v8m0 62v8M20 38v14m160-14v14M75 20l8 8m34 34 8 8M75 70l8-8m34-34 8-8"/></g></svg><span>OCULAR ARCHIVE · MECHANICUS</span></div>
  </aside>`;
}
function correctionFields(c, mode = 'inline') {
  const readonly = mode === 'read' || locked();
  const allSpec = c.kind === 'glasses' ? [['sph','Sph','D'],['cyl','Cyl','D'],['axis','Axis','°'],['add','Add','D'],['vertex','Vertex','мм'],['panto','Panto','°'],['bc','BC','D']] : [['power','Pwr','D'],['cyl','Cyl','D'],['axis','Axis','°'],['bc','BC','мм'],['dia','DIA','мм']];
  const core=c.kind==='glasses'?['sph','cyl','axis']:['power','bc','dia'];
  const spec=allSpec.filter(([key])=>mode==='form'||core.includes(key)||EYES.some(eye=>c.eyes[eye][key]!==''));
  const field = (path, value, label) => `<input ${mode === 'form' ? `name="${path}"` : `data-correction="${c.id}" data-path="${path}"`} aria-label="${e(label)}" value="${e(value)}" placeholder="—" ${readonly ? 'disabled' : ''}>`;
  const general = c.kind === 'glasses' ? [['model','Тип / модель линз'],['frame','Модель оправы'],['frameSize','Размеры оправы'],['since','В использовании с']] : [['model','Модель КЛ'],['lab','Производитель / лаборатория'],['wear','Режим ношения'],['replacement','Плановая замена'],['care','Уход'],['since','В использовании с']];
  return `<div class="table-scroll spec-table"><table class="clinical-table"><thead><tr><th>Глаз</th>${spec.map(([,label,unit]) => `<th>${label} <span class="micro">${unit}</span></th>`).join('')}</tr></thead><tbody>${EYES.map(eye => `<tr><th class="eye" scope="row">${eye}</th>${spec.map(([key,label]) => `<td>${field(`eyes.${eye}.${key}`, c.eyes[eye][key], `${label} ${eye} ${c.name}`)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="fields two">${general.map(([key,label]) => `<label class="field"><span>${label}</span>${field(key,c[key],label)}</label>`).join('')}<label class="field wide"><span>Примечание к коррекции</span>${field('note',c.note,'Примечание к коррекции')}</label></div><p class="compact-note">Источник: ${e(c.source)}</p>`;
}
function equipmentCard(kind) {
  const {records, item} = selectedCorrection(kind);
  const name = kind === 'glasses' ? 'Очки' : 'Контактные линзы';
  const num = view.correction[kind];
  const summary = item ? EYES.map(eye => {
    const spec = item.eyes[eye];
    const values = kind === 'glasses' ? `${spec.sph || '—'} / ${spec.cyl || '—'} × ${spec.axis || '—'}°` : `${spec.power || '—'} D · ${spec.bc || '—'} / ${spec.dia || '—'} мм`;
    return `<span class="eye">${eye}</span><span class="mono">${e(values)}</span>`;
  }).join('') : '<span class="muted">Нет текущей коррекции</span>';
  return `<div class="equipment-card"><div class="row between wrap"><span class="eyebrow">${name}</span><div class="row">${button('add-correction','+ Добавить',`class="text" data-kind="${kind}" ${suffix()}`)}${button('history','История',`class="ghost" data-kind="${kind}" aria-label="История: ${name}"`)}</div></div><div class="row between wrap correction-title"><h3>${e(item?.name || 'Не указано')}</h3><div class="counter">${button('cycle','‹',`class="icon" data-kind="${kind}" data-step="-1" aria-label="Предыдущие: ${name}" ${num <= 0 ? 'disabled' : ''}`)}<span>${records.length ? num + 1 : 0} из ${records.length}</span>${button('cycle','›',`class="icon" data-kind="${kind}" data-step="1" aria-label="Следующие: ${name}" ${num >= records.length - 1 ? 'disabled' : ''}`)}</div></div><div class="correction-summary wrap">${summary}</div>${view.details && item ? `<div class="details-content">${correctionFields(item)}${flexFields(item)}${button('retire','Убрать из текущего пользования',`class="text" data-id="${item.id}" ${suffix()}`)}</div>` : ''}</div>`;
}
function equipment() {
  return `<section class="equipment ${view.details?'equipment-expanded':''}"><div class="equipment-bar"><div class="row"><span class="section-number">RX</span><h2>${locked()?'Коррекция на дату осмотра':'Текущая коррекция'}</h2></div>${button('details',view.details?'Свернуть ↙':'Спецификации ↗',`class="text" aria-expanded="${view.details}"`)}</div><div class="equipment-grid">${equipmentCard('glasses')}${equipmentCard('contacts')}</div></section>`;
}

function contextField(key, label) {
  return `<label class="field"><span>${label}</span><input data-context="${key}" aria-label="${label}" value="${e(exam().context[key])}" placeholder="Не указано" inputmode="decimal" ${suffix()}></label>`;
}
function manifest() {
  const basics = [['sph','Sph','D'],['cyl','Cyl','D'],['axis','Axis','°'],['add','Add','D']];
  const acuities = [['dva','DVA',''], ...['nva','ph'].filter(key => state.enabledExtra.includes(key)).map(key => [key,EXTRA[key].label,''])];
  const columns = [...basics, ...acuities];
  let body = '';
  if (view.layout === 'horizontal') body = table('manifest',columns);
  else body = `<div class="table-scroll"><table class="clinical-table vertical"><thead><tr><th>Параметр</th><th>OD</th><th>OS</th></tr></thead><tbody>${columns.map(([key,label,unit]) => `<tr><th scope="row">${label} ${unit}</th>${EYES.map(eye => `<td>${input('manifest',eye,key,label)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const correctionOptions = exam().corrections.map(c => `<option value="${c.id}" ${exam().context.correction === c.id ? 'selected' : ''}>${e(c.name)}${c.active ? '' : ' · история'}</option>`).join('');
  return card('03','Манифестная рефракция', `<div class="context-strip"><label class="field"><span>Исходная коррекция для исследования</span><select data-context="correction" aria-label="Исходная коррекция для исследования" ${suffix()}><option value="none" ${exam().context.correction === 'none' ? 'selected' : ''}>Без коррекции</option>${correctionOptions}</select></label></div>${body}<div class="card-body compact-section"><h3>Призматическая составляющая</h3></div>${table('manifest',[['hprism','H Prism','Δ'],['hbase','Осн. H',''],['vprism','V Prism','Δ'],['vbase','Осн. V','']])}${table('manifest',acuities,['OU'])}`, `<div class="button-group" aria-label="Расположение рефракции">${button('layout','Гориз.',`class="${view.layout==='horizontal'?'selected':''}" data-layout="horizontal" aria-pressed="${view.layout==='horizontal'}"`)}${button('layout','Верт.',`class="${view.layout==='vertical'?'selected':''}" data-layout="vertical" aria-pressed="${view.layout==='vertical'}"`)}</div>`, 'Латунным показаны предыдущие значения с датой. Они не заполняют текущий осмотр.');
}
function examContent() {
  const extra = state.enabledExtra;
  const acuityCols = [['dva','DVA',''],...['nva','ph'].filter(k=>extra.includes(k)).map(k=>[k,EXTRA[k].label,''])];
  const kCols = [['flat','Flat K','D'],['steep','Steep K','D'],['axis','Axis','°'],['hvid','HVID','мм'],...['vvid','dvid'].filter(k=>extra.includes(k)).map(k=>[k,EXTRA[k].label,'мм'])];
  const packet = exam().imports.length > 0;
  return `${card('01','Острота зрения без коррекции',table('acuity',acuityCols,['OD','OS','OU']),button('parameters','+ Параметры',`class="text" ${suffix()}`))}
  ${card('02','Приборные измерения',`<div class="context-strip">${contextField('sleep','Сон, ч')}${contextField('sinceRemoval','После снятия КЛ, ч')}${contextField('wearDuration','Длительность ношения, мес.')}</div><div class="card-body compact-section"><label class="field"><span>Клинический контекст / статус</span><input data-context="clinicalStatus" aria-label="Клинический контекст" value="${e(exam().context.clinicalStatus)}" placeholder="Например, перерыв от ношения КЛ" ${suffix()}></label></div><div class="card-body compact-section"><h3>Кератометрия и видимый диаметр радужки</h3></div>${table('keratometry',kCols)}<div class="card-body compact-section"><h3>Авторефракция</h3></div>${table('auto',[['sph','Sph','D'],['cyl','Cyl','D'],['axis','Axis','°']])}<div class="card-body compact-section"><label class="field"><span>Условия измерений / замечания</span><input data-context="note" aria-label="Условия измерений" value="${e(exam().context.note)}" placeholder="Добавить обстоятельства измерений" ${suffix()}></label></div>`,button(packet?'packets':'import',packet?'Пакет получен ↗':'↓ Демо-импорт',`class="ghost" ${!packet?suffix():''}`),packet?'Исходный пакет доступен для просмотра. Ручные изменения отмечаются отдельно.':'Нет поступивших пакетов · можно загрузить синтетический пример AR/K.')}
  ${manifest()}
  ${card('04','Бинокулярные исследования',`<div class="card-body"><div class="fields two"><label class="field"><span>Cover test · вдаль</span>${input('binocular','OU','distance','Cover test вдаль')}</label><label class="field"><span>Cover test · вблизи</span>${input('binocular','OU','near','Cover test вблизи')}</label></div><div class="divider"></div><h3>Near point of convergence</h3><div class="fields top-gap">${[['blur','Blur'],['break','Break'],['recovery','Recovery']].map(([key,label])=>`<label class="field"><span>${label}, см</span>${input('binocular','OU',key,`${label}, см`)}</label>`).join('')}</div><label class="field top-gap"><span>Методика и наблюдения</span><textarea data-measure="binocular.OU.note" aria-label="Методика и наблюдения" ${suffix()}>${e(exam().measures.binocular.note)}</textarea></label></div>`)}
  <div class="row between wrap"><span class="micro">Пустое поле означает отсутствие текущего значения.</span>${button('tab','К заключению →','class="primary" data-tab="conclusion"')}</div>`;
}
function followPanel() {
  const all = exam().followups;
  const visible = view.followAll ? all : all.filter(f=>f.status==='active');
  const statusNames = {active:'К выполнению',pending:'Запланировано',snoozed:'Отложено',completed:'Выполнено',cancelled:'Отменено'};
  const types = {action:'Действие',reminder:'Напоминание',commitment:'Обещание пациенту'};
  return card('', 'Follow-up', `<div class="card-body">${visible.length ? visible.map(f=>`<div class="follow-item ${f.status==='completed'?'done':''}"><div class="row between wrap"><span class="follow-kind">${types[f.type]}</span><span class="micro">${date(f.due)}</span></div><p>${e(f.text)}</p><span class="micro">${e(f.origin)}</span>${f.status !== 'active' ? `<p class="micro">${statusNames[f.status]}</p>` : ''}${!locked()&&f.status==='active'?`<div class="follow-actions">${button('follow-done','✓ Выполнено',`data-id="${f.id}"`)}${button('follow-snooze','Отложить',`class="ghost" data-id="${f.id}"`)}</div>`:''}</div>`).join(''):'<p class="support-copy">Нет действий, требующих внимания на дату осмотра.</p>'}<div class="divider"></div><div class="row between">${button('follow-all',view.followAll?'Только активные':`Все действия (${all.length})`,'class="text"')}${button('follow-add','+ Добавить',`class="text" ${suffix()}`)}</div></div>`, `<span class="badge">${all.filter(f=>f.status==='active').length}</span>`, 'Демонстрация · синхронизация с общим Follow-up пока не подключена.');
}
function supportPanel() {
  return card('','Clinical decision support',`<div class="card-body"><div class="support-icon" aria-hidden="true">⌘</div><h3>Ожидает подключения правил</h3><p class="support-copy top-gap">Здесь появятся объяснимые результаты протоколов и ссылки на их основания.</p><div class="divider"></div><p class="support-copy">В этом прототипе клинические рекомендации не формируются. Заключение и план вводит врач.</p></div>`);
}
function conclusionContent() {
  return card('05','Заключение и дальнейший план',`<div class="card-body stack">${locked()?'<div class="notice">Демонстрационная запись завершена и доступна для чтения.</div>':''}${[['findings','Результаты и наблюдения','Что установлено в ходе осмотра'],['decision','Решение врача','Запишите своё решение'],['plan','План и рекомендации','Дальнейшие действия и сроки']].map(([key,label,placeholder])=>`<label class="field"><span>${label}${key==='decision'?' · нужно для завершения':''}</span><textarea data-conclusion="${key}" aria-label="${label}" placeholder="${placeholder}" ${suffix()}>${e(exam().conclusion[key])}</textarea></label>`).join('')}<div class="row between wrap">${button('summary','Просмотреть запись','class="ghost"')}${button('complete',locked()?'Осмотр завершён':'Завершить демо-осмотр',`class="primary" ${suffix()}`)}</div></div>`, '', 'Завершение демонстрирует состояние записи; юридической подписи в прототипе нет.');
}
function searchResults() {
  if (!view.query.trim()) return '';
  const results=searchPatient(state,view.query);
  return `<div class="search-results" role="region" aria-label="Результаты поиска"><div class="row between"><span class="micro">Найдено: ${results.length}</span>${button('clear-search','×','class="text" aria-label="Очистить поиск"')}</div>${results.map(r=>`<article class="search-result"><span class="eyebrow">${r.kind==='exam'?'Осмотр':'Материал'} · ${date(r.date)}</span><h3>${e(r.title)}</h3><p class="search-snippet">${e(String(r.match).slice(0,155))}</p><div class="history-actions">${button('open-result',r.kind==='exam'?'Войти':'Открыть',`data-kind="${r.kind}" data-id="${r.id}"`)}${button('compare-result','Рядом',`data-kind="${r.kind}" data-id="${r.id}"`)}</div></article>`).join('')||'<p class="compact-note">Совпадений в этой карте нет.</p>'}</div>`;
}
function focusNavigation() {
  const sections=[['overview','Обзор'],['01','Зрение'],['02','Приборы'],['03','Рефракция'],['04','Бинокулярное'],['05','Заключение']];
  return `<nav class="focus-navigation" aria-label="Фокус рабочего пространства">${sections.map(([key,label])=>button('focus-section',`<span class="focus-index">${key==='overview'?'⊞':key}</span>${label}`,`data-focus="${key}" class="${workspace.focus===key&&!view.details?'selected':''}" aria-pressed="${workspace.focus===key&&!view.details}"`)).join('')}</nav>`;
}
function focusedContent() {
  if (view.details) return '<div class="context-summary"><span class="eyebrow">Фокус / коррекция</span><p>Выберите исследование в полосе фокуса, чтобы перейти к заполнению.</p></div>';
  if (workspace.focus==='05') return conclusionContent();
  const template=document.createElement('template');
  template.innerHTML=examContent();
  const sections=[...template.content.children].filter(el=>el.tagName==='SECTION');
  return sections.map((section,index)=>{
    const number=String(index+1).padStart(2,'0'); section.dataset.section=number;
    return workspace.focus==='overview'||workspace.focus===number?section.outerHTML:'';
  }).join('');
}
function attachmentView(a,main=false) {
  const zoom=view.zoom[a.id]||1;
  const content=a.type==='image'?`<div class="image-viewport zoom-${zoom}" data-scroll-id="image-${a.id}"><img src="${a.src}" alt="${e(a.description)}"></div>`:`<article class="document-sheet"><header><span class="eyebrow">DR. MATE / ARCHIVE</span><span class="document-seal" aria-hidden="true">DM</span></header><div>${e(a.text)}</div><footer>DEMO-001 · ${date(a.date)} · Учебный материал</footer></article>`;
  return `<div class="attachment-view"><div class="attachment-toolbar"><span class="badge">${a.type==='image'?'Изображение · схема':'Текстовый документ'}</span><div class="row">${a.type==='image'?`${button('zoom-out','−',`data-id="${a.id}" aria-label="Уменьшить изображение" ${zoom===1?'disabled':''}`)}<span class="micro">${zoom*100}%</span>${button('zoom-in','+',`data-id="${a.id}" aria-label="Увеличить изображение" ${zoom===3?'disabled':''}`)}`:''}${button('open-result','К осмотру',`data-kind="exam" data-id="${a.examId}"`)}</div></div><p class="compact-note">${e(a.description)}</p>${content}${main?`<div class="attachment-bottom">${button('compare-related','Сравнить с другим материалом','class="ghost"')}</div>`:''}</div>`;
}
function referenceExam(ex) {
  const groups=[['acuity','Острота зрения'],['auto','Авторефракция'],['keratometry','Кератометрия'],['manifest','Рефракция']];
  const lines=groups.map(([group,title])=>`<section class="reference-block"><h3>${title}</h3><div class="table-scroll"><table class="clinical-table reference-table"><tbody>${EYES.map(eye=>`<tr><th class="eye">${eye}</th><td>${Object.entries(ex.measures[group][eye]).filter(([,v])=>v!=='').map(([k,v])=>`<span class="measurement-readout"><small>${e(k)}</small><b>${e(v)}</b></span>`).join('')||'<span class="muted">Нет измерений</span>'}</td></tr>`).join('')}</tbody></table></div></section>`).join('');
  return `<div class="reference-content" data-scroll-id="reference-${ex.id}"><div class="reference-status"><span class="badge">${ex.status==='draft'?'Черновик · просмотр':'Историческая запись'}</span><p>${e(ex.context.clinicalStatus||ex.title)}</p>${ex.context.note?`<p class="micro">${e(ex.context.note)}</p>`:''}</div><section class="reference-block"><h3>Коррекция на дату осмотра</h3>${ex.corrections.filter(c=>c.active).map(c=>`<div class="reference-correction"><strong>${e(c.name)}</strong>${EYES.map(eye=>`<div><span class="eye">${eye}</span> ${Object.entries(c.eyes[eye]).filter(([,v])=>v!=='').map(([k,v])=>`${e(k)} ${e(v)}`).join(' · ')}${(c.flex?.[eye]||[]).filter(f=>f.value!=='').map(f=>` · ${e(f.label)} ${e(f.value)} ${e(f.unit)}`).join('')}</div>`).join('')}</div>`).join('')||'<p class="compact-note">Не указана</p>'}</section>${lines}<section class="reference-block"><h3>Решение врача</h3><p>${e(ex.conclusion.decision||'Не внесено')}</p><h3>План</h3><p>${e(ex.conclusion.plan||'Не внесён')}</p></section></div>`;
}
function comparisonPane() {
  const target=workspace.secondary, item=resolveTarget(state,target);
  return `<aside class="comparison-pane instrument-frame" aria-label="Область сравнения"><div class="pane-label"><span>02 / СРАВНЕНИЕ</span><div class="row">${button('expand-reference','Раскрыть ↗','class="text"')}${button('close-reference','×','class="icon" aria-label="Закрыть сравнение"')}</div></div><div class="reference-heading"><h2>${target.kind==='exam'?`Осмотр #${no(item)}`:e(item.title)}</h2><span class="micro">${date(item.date)}</span></div>${target.kind==='exam'?referenceExam(item):attachmentView(item)}</aside>`;
}
function flexFields(c, readOnly = false) {
  const disabled = readOnly || locked();
  c.flex??={OD:[],OS:[]};
  return `<div class="flex-specification"><div class="row between"><span class="eyebrow">${Object.values(c.flex).some(rows=>rows.length)?'Flex':'Base'} / индивидуальные параметры</span>${button('flex-add','⚙ Параметр',`class="text" data-id="${c.id}" ${disabled?'disabled':''}`)}</div>${EYES.map(eye=>{
    const fields=c.flex[eye]||[];
    return fields.length?`<div class="flex-eye"><span class="eye">${eye}</span><div class="flex-fields">${fields.map((f,index)=>`<label class="field"><span>${e(f.label)} <small>${e(f.unit||'ед. не заданы')}</small></span><div class="flex-value"><input data-flex="${c.id}" data-eye="${eye}" data-index="${index}" aria-label="${e(f.label)} ${eye} ${e(c.name)}" value="${e(f.value)}" placeholder="—" ${disabled?'disabled':''}>${!disabled?`<div class="flex-move">${button('flex-move','‹',`data-id="${c.id}" data-eye="${eye}" data-index="${index}" data-step="-1" aria-label="Переместить ${e(f.label)} раньше" ${index===0?'disabled':''}`)}${button('flex-move','›',`data-id="${c.id}" data-eye="${eye}" data-index="${index}" data-step="1" aria-label="Переместить ${e(f.label)} позже" ${index===fields.length-1?'disabled':''}`)}</div>`:''}</div></label>`).join('')}</div></div>`:'';
  }).join('')}</div>`;
}
function flexDialog(id) {
  editable(exam());
  const c=exam().corrections.find(c=>c.id===id);
  openDialog('Добавить параметр коррекции',`<input type="hidden" name="correctionId" value="${id}"><p class="compact-note">${e(c.name)}. Изменение относится только к этой записи и выбранному глазу.</p><div class="fields two"><label class="field"><span>Глаз</span><select name="eye" aria-label="Глаз для параметра"><option>OD</option><option>OS</option></select></label><label class="field"><span>Параметр</span><select name="preset" id="flex-preset" aria-label="Параметр коррекции"><option value="custom">Свой параметр</option>${FLEX_PRESETS.map(p=>`<option value="${p.code}">${p.label}</option>`).join('')}</select></label><label class="field"><span>Название</span><input name="label" aria-label="Название параметра" required maxlength="80"></label><label class="field"><span>Единица, если известна</span><input name="unit" aria-label="Единица параметра" maxlength="20" placeholder="Не задана"></label></div><p class="compact-note">Это структура записи врача. Профиль производителя и допустимые диапазоны здесь не определяются.</p>`,`<button type="submit" class="primary">Добавить поле</button>`,'flex-add');
}
function navigateTarget(target,beside=false) {
  const position={window:window.scrollY,correction:clone(view.correction),layout:view.layout,details:view.details,selectedAttachment:view.selectedAttachment,scrolls:[...document.querySelectorAll('[data-scroll-id]')].map(el=>({id:el.dataset.scrollId,top:el.scrollTop,left:el.scrollLeft}))};
  openTarget(state,workspace,target,beside,position);
  if (!beside) { view.details=false; view.tab='exam'; view.correction={glasses:0,contacts:0}; }
  save(); render();
}

function render() {
  const ex=exam(), scrollY=window.scrollY;
  const primary=resolveTarget(state,workspace.primary);
  const isExam=workspace.primary.kind==='exam';
  app.innerHTML=`<header class="topbar"><div class="brand">${cog}<div class="brand-title">DR. MATE <span>/ CLINIC</span><div class="eyebrow">Ocular precision · клинический архив</div></div></div><div class="topbar-middle" aria-hidden="true"><i></i><span>INSTRUMENTUM MEDICAE</span><i></i></div><div class="row"><span class="micro save-status" id="save-state">${storageOK?'Сохранено в этой вкладке':'Сохранение недоступно'}</span><label class="theme-control"><span class="sr-only">Тема интерфейса</span><select id="theme-select" aria-label="Тема интерфейса">${[['auto','◐ Авто'],['dark','◑ Тёмная'],['light','☀ Светлая']].map(([v,label])=>`<option value="${v}" ${theme===v?'selected':''}>${label}</option>`).join('')}</select></label>${button('reset','Сброс','class="ghost" aria-label="Сбросить демо"')}</div></header>
    <div class="shell">${patientPanel()}<main class="work-area" id="workspace">
      <div class="pathbar"><span>DEMO-001</span><span>/</span><span>${isExam?'Осмотр #'+no(primary):'Материалы'}</span><span>/</span><strong>${isExam?date(primary.date):e(primary.title)}</strong><span class="grow"></span><span class="demo-label">СИНТЕТИЧЕСКИЕ ДАННЫЕ</span></div>
      <div class="work-heading"><div class="row wrap">${workspace.trail.length?button('back-workspace','← Вернуться','class="ghost"'):''}<h1>${isExam?(locked()?'Осмотр из истории':'Текущее обследование'):e(primary.title)}</h1>${isExam?`<span class="badge ${locked()?'':'green'}">${locked()?'Только чтение':'Черновик'}</span>`:''}</div><div class="row">${workspace.secondary?`<select id="compare-arrangement" aria-label="Компоновка сравнения"><option value="columns" ${workspace.arrangement==='columns'?'selected':''}>Бок о бок</option><option value="rows" ${workspace.arrangement==='rows'?'selected':''}>Друг под другом</option></select><select id="compare-ratio" aria-label="Пропорции сравнения"><option value="equal" ${workspace.ratio==='equal'?'selected':''}>1 : 1</option><option value="primary" ${workspace.ratio==='primary'?'selected':''}>2 : 1</option><option value="reference" ${workspace.ratio==='reference'?'selected':''}>1 : 2</option></select>${button('swap-panes','⇄','aria-label="Поменять области местами"')}`:''}${button('new-visit','Новый осмотр',`class="ghost" ${state.encounters.some(e=>e.status==='draft')?'disabled title="Сначала завершите открытый черновик"':''}`)}</div></div>
      <div class="pane-layout ${workspace.secondary?'has-comparison':''} arrangement-${workspace.arrangement} ratio-${workspace.ratio}"><section class="primary-pane instrument-frame" aria-label="Основная область"><div class="pane-label"><span>01 / ${isExam?'ОСМОТР #'+no(ex):'ПРОСМОТР МАТЕРИАЛА'}</span><span>${isExam?date(ex.date):date(primary.date)}</span></div>${isExam?`${locked()?'<div class="archive-line">Параметры и коррекция показаны на дату этого осмотра.</div>':''}${equipment()}${focusNavigation()}<div class="clinical-layout"><div class="clinical-main ${workspace.focus==='overview'?'overview-grid':''}">${focusedContent()}</div><aside class="right-column">${followPanel()}${supportPanel()}</aside></div>`:attachmentView(primary,true)}</section>${workspace.secondary?comparisonPane():''}</div>
      <footer class="footer-note"><span>DR. MATE CLINIC · PROTOTYPE 02</span><span class="devotional" aria-hidden="true">BY THE WILL OF THE OMNISSIAH</span><span>Локальная учебная карта</span></footer>
    </main></div>`;
  window.scrollTo(0,scrollY);
}

let returnFocus;
function openDialog(title, body, footer = '', form = '') {
  returnFocus = document.activeElement;
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2>${button('close','×','class="icon" aria-label="Закрыть окно"')}</div>${form ? `<form data-form="${form}">` : ''}<div class="dialog-body"><p class="error" id="dialog-error" role="alert" hidden></p>${body}</div>${footer ? `<div class="dialog-footer">${footer}</div>` : ''}${form?'</form>':''}`;
  if (!dialog.open) dialog.showModal();
}
function closeDialog() { dialog.close(); }
dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus(); });
function modalError(message) {
  const error = dialog.querySelector('#dialog-error');
  if (error) { error.hidden = false; error.textContent = message; }
  else notify(message);
}
function changeVisit(id) {
  if (!state.encounters.some(item=>item.id===id)) throw new Error('Осмотр не найден.');
  state.currentId = id; view.correction = {glasses:0,contacts:0};
  save(); render();
}
function nextDate(days = 30) {
  const d = new Date(`${exam().date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
function setPath(target, path, value) {
  const parts = path.split('.');
  // Paths are generated by this UI, but still reject unknown keys.
  for (const part of parts.slice(0,-1)) {
    if (!Object.hasOwn(target,part) || !target[part] || typeof target[part] !== 'object') throw new Error('Неизвестное поле.');
    target = target[part];
  }
  const last = parts.at(-1);
  if (!Object.hasOwn(target,last)) throw new Error('Неизвестное поле.');
  target[last] = value;
}
function addCorrectionDialog(kind) {
  editable(exam());
  const draft = blankCorrection(kind, `correction-${crypto.randomUUID()}`);
  draft.since = exam().date;
  openDialog(kind==='glasses'?'Добавить очки':'Добавить контактные линзы', `<input type="hidden" name="kind" value="${kind}"><input type="hidden" name="id" value="${draft.id}"><label class="field"><span>Название для переключателя</span><input name="name" aria-label="Название коррекции" required maxlength="100" placeholder="Например, очки для компьютера"></label><p class="compact-note">Другие средства коррекции останутся в текущем пользовании.</p>${correctionFields(draft,'form')}`,`${button('close','Отмена','class="ghost"')}<button class="primary" type="submit">Добавить в текущие</button>`,'add-correction');
}
function historyDialog(kind) {
  const rows = correctionHistory(state,kind);
  openDialog(`История · ${kind==='glasses'?'очки':'контактные линзы'}`,`<p class="muted">Все записи учебной карты. Параметры на дату конкретного визита доступны в истории посещений.</p>${rows.map(c=>`<article class="history-record"><div class="row between wrap"><h3>${e(c.name)}</h3><span class="badge">${c.active?'В текущем пользовании':'История'}</span></div><p class="micro">С ${date(c.since)} · последняя запись ${date(c.lastSeen)}</p>${correctionFields(c,'read')}${flexFields(c,true)}</article>`).join('')||'<p class="empty">Записей пока нет.</p>'}`);
}
function parametersDialog() {
  editable(exam());
  openDialog('Дополнительные параметры',`<p class="muted bottom-gap">Выбранные поля остаются видимыми в следующих осмотрах. Скрытие поля сохраняет все его значения в истории.</p>${Object.entries(EXTRA).map(([key,value])=>`<label class="check-row"><input type="checkbox" name="${key}" ${state.enabledExtra.includes(key)?'checked':''}><span><strong>${value.label}</strong>${value.unit?` · ${value.unit}`:''}<span class="side-label">${{vvid:'Вертикальный видимый диаметр радужки',dvid:'Диагональный видимый диаметр радужки',nva:'Острота зрения вблизи',ph:'Острота зрения с диафрагмой'}[key]}</span></span></label>`).join('')}`,`${button('close','Отмена','class="ghost"')}<button class="primary" type="submit">Применить</button>`,'parameters');
}
function packetDialog() {
  openDialog('Исходные приборные пакеты', exam().imports.map(packet=>`<article class="history-record"><h3>${e(packet.label)}</h3><p class="micro">${e(packet.time)} · ${e(packet.id)}</p>${['auto','keratometry'].map(group=>`<div class="divider"></div><h3>${group==='auto'?'Авторефракция':'Кератометрия'}</h3><div class="table-scroll"><table class="clinical-table"><tbody>${EYES.map(eye=>`<tr><th class="eye">${eye}</th><td class="mono">${Object.entries(packet[group][eye]).map(([k,v])=>`${e(k)}: ${e(v)}`).join(' · ')}</td></tr>`).join('')}</tbody></table></div>`).join('')}</article>`).join('') || '<p class="empty">Пакетов нет.</p>');
}
function summaryText() {
  const ex = exam();
  const lines = [`ДЕМОНСТРАЦИОННАЯ ЗАПИСЬ · DEMO-001`, `Осмотр #${no(ex)} · ${date(ex.date)}`, `Состояние: ${ex.status==='draft'?'черновик':'завершён'}`, '', 'КОРРЕКЦИЯ НА ДАТУ ОСМОТРА'];
  for (const c of ex.corrections.filter(c=>c.active)) {
    lines.push(c.name);
    for (const eye of EYES) lines.push(`  ${eye}: ${Object.entries(c.eyes[eye]).map(([k,v])=>`${k} ${v||'не указано'}`).join('; ')}`);
  }
  lines.push('', 'УСЛОВИЯ', `Исходная коррекция: ${ex.context.correction==='none'?'без коррекции':ex.corrections.find(c=>c.id===ex.context.correction)?.name||'не указано'}`, `Сон: ${ex.context.sleep||'не указано'} ч; после снятия КЛ: ${ex.context.sinceRemoval||'не указано'} ч`,ex.context.note,'','ИЗМЕРЕНИЯ');
  for (const [group, values] of Object.entries(ex.measures)) {
    lines.push(group);
    const rows = group==='binocular'?[['OU',values]]:Object.entries(values);
    for (const [eye, fields] of rows) lines.push(`  ${eye}: ${Object.entries(fields).map(([k,v])=>`${k}: ${v||'не измерено'}`).join('; ')}`);
  }
  lines.push('','НАБЛЮДЕНИЯ',ex.conclusion.findings||'Не внесены','','РЕШЕНИЕ ВРАЧА',ex.conclusion.decision||'Не внесено','','ПЛАН',ex.conclusion.plan||'Не внесён','','FOLLOW-UP');
  for (const f of ex.followups) lines.push(`${f.text} · ${f.status} · ${date(f.due)}`);
  lines.push('','Учебный UX-прототип. Клинические рекомендации автоматически не формировались.');
  return lines.join('\n');
}
function followDialog(id) {
  editable(exam());
  if (id) {
    const f=exam().followups.find(item=>item.id===id);
    openDialog('Отложить действие',`<input type="hidden" name="id" value="${id}"><p class="bottom-gap">${e(f.text)}</p><label class="field"><span>Новая дата</span><input name="due" aria-label="Новая дата" type="date" min="${nextDate(1)}" value="${nextDate(7)}" required></label>`, '<button type="submit" class="primary">Отложить</button>','snooze');
  } else openDialog('Новое действие по осмотру',`<div class="stack"><label class="field"><span>Что нужно сделать</span><textarea name="text" aria-label="Что нужно сделать" maxlength="500" required></textarea></label><div class="fields two"><label class="field"><span>Тип</span><select name="type"><option value="action">Действие</option><option value="commitment">Обещание пациенту</option><option value="reminder">Напоминание</option></select></label><label class="field"><span>Дата</span><input type="date" name="due" aria-label="Дата действия" value="${exam().date}" required></label></div></div>`, '<button type="submit" class="primary">Добавить действие</button>','follow-add');
}
function handleAction(target) {
  const {action,kind,id} = target.dataset;
  switch (action) {
    case 'close': closeDialog(); return;
    case 'select-visit': selectExam(state,workspace,id); break;
    case 'open-selected': navigateTarget({kind:'exam',id:workspace.selectedExam}); return;
    case 'compare-selected': navigateTarget({kind:'exam',id:workspace.selectedExam},true); return;
    case 'open-draft': navigateTarget({kind:'exam',id}); return;
    case 'open-attachment': navigateTarget({kind:'attachment',id:view.selectedAttachment}); return;
    case 'compare-attachment': navigateTarget({kind:'attachment',id:view.selectedAttachment},true); return;
    case 'open-result': view.query=''; navigateTarget({kind,id}); return;
    case 'compare-result': view.query=''; navigateTarget({kind,id},true); return;
    case 'expand-reference': navigateTarget(workspace.secondary); return;
    case 'close-reference': workspace.secondary=null; break;
    case 'swap-panes': swapPanes(state,workspace); view.details=false; break;
    case 'back-workspace': {
      const position=returnToWorkspace(state,workspace);
      if(position&&typeof position==='object'){view.correction=position.correction;view.layout=position.layout;view.details=position.details;view.selectedAttachment=position.selectedAttachment;}
      else view.details=workspace.focus==='correction';
      save();render();
      if(position&&typeof position==='object'){
        window.scrollTo(0,position.window);
        for(const saved of position.scrolls){const el=[...document.querySelectorAll('[data-scroll-id]')].find(el=>el.dataset.scrollId===saved.id);if(el){el.scrollTop=saved.top;el.scrollLeft=saved.left;}}
      }else if(position!==null)window.scrollTo(0,position);
      return;
    }
    case 'focus-section': workspace.focus=workspace.focus===target.dataset.focus?'overview':target.dataset.focus; view.details=false; view.tab=workspace.focus==='05'?'conclusion':'exam'; break;
    case 'clear-search': view.query=''; break;
    case 'compare-related': {const other=state.attachments.find(a=>a.id!==workspace.primary.id);if(other)navigateTarget({kind:'attachment',id:other.id},true);return;}
    case 'zoom-in': view.zoom[id]=Math.min(3,(view.zoom[id]||1)+1); break;
    case 'zoom-out': view.zoom[id]=Math.max(1,(view.zoom[id]||1)-1); break;
    case 'flex-add': flexDialog(id); return;
    case 'flex-move': {editable(exam());const rows=exam().corrections.find(c=>c.id===id).flex[target.dataset.eye];const from=Number(target.dataset.index),to=from+Number(target.dataset.step);if(to>=0&&to<rows.length)[rows[from],rows[to]]=[rows[to],rows[from]];break;}
    case 'details': view.details=!view.details; if(view.details) workspace.focus='correction'; else workspace.focus='overview'; break;
    case 'cycle': view.correction[kind]+=Number(target.dataset.step); break;
    case 'layout': view.layout=target.dataset.layout; break;
    case 'tab': view.tab=target.dataset.tab; workspace.focus=view.tab==='conclusion'?'05':'overview'; view.details=false; break;
    case 'visit': selectExam(state,workspace,id); break;
    case 'add-correction': addCorrectionDialog(kind); return;
    case 'history': historyDialog(kind); return;
    case 'parameters': parametersDialog(); return;
    case 'packets': packetDialog(); return;
    case 'import': {
      const result = importDemo(exam(),'demo-packet-01',`${exam().date}T10:30:00`);
      notify(`Получен демо-пакет: заполнено ${result.filled} полей. Уже введённых значений сохранено: ${result.kept}.`);
      break;
    }
    case 'retire': {
      editable(exam());
      const c=exam().corrections.find(c=>c.id===id);
      openDialog('Изменить текущее пользование',`<p>${e(c.name)} останутся в истории. Параметры старых осмотров сохранятся.</p>`,`${button('close','Отмена')}${button('confirm-retire','Убрать из текущих',`class="primary" data-id="${id}"`)}`);
      return;
    }
    case 'confirm-retire': editable(exam()); exam().corrections.find(c=>c.id===id).active=false; closeDialog(); break;
    case 'follow-all': view.followAll=!view.followAll; break;
    case 'follow-add': followDialog(); return;
    case 'follow-snooze': followDialog(id); return;
    case 'follow-done': editable(exam()); exam().followups.find(f=>f.id===id).status='completed'; notify('Действие отмечено выполненным в демо.'); break;
    case 'summary': openDialog('Запись осмотра',`<div class="readout">${e(summaryText())}</div>`); return;
    case 'complete': {
      if (!exam().conclusion.decision.trim()) { notify('Запишите решение врача перед завершением.'); document.querySelector('[data-conclusion="decision"]').focus(); return; }
      const errors = measurementErrors(exam());
      if (errors.length) { notify(`Проверьте формат измерений: ${errors[0]}`); return; }
      openDialog('Завершить демо-осмотр',`<p>Запись #${no(exam())} станет доступна только для чтения. После этого можно создать следующий учебный визит.</p><p class="compact-note">Незаполненные измерения останутся неизвестными. Прототип не оценивает полноту клинического обследования.</p>`,`${button('close','Вернуться к записи')}${button('confirm-complete','Завершить', 'class="primary"')}`); return;
    }
    case 'confirm-complete': completeEncounter(exam()); closeDialog(); notify('Демо-осмотр завершён. Можно открыть следующий визит.'); break;
    case 'new-visit': openDialog('Следующий демонстрационный осмотр',`<label class="field"><span>Дата осмотра</span><input type="date" name="date" aria-label="Дата осмотра" min="${state.encounters.at(-1).date}" value="${nextDate()}" required></label><p class="compact-note">Текущая коррекция и незавершённые действия сохранятся. Поля измерений будут пустыми, а предыдущие значения появятся рядом с датами.</p>`, '<button type="submit" class="primary">Создать осмотр</button>','new-visit'); return;
    case 'reset': openDialog('Сбросить учебный сценарий', '<p>Изменения в этой демонстрационной вкладке будут заменены исходным сценарием из четырёх осмотров.</p>',`${button('close','Отмена')}${button('confirm-reset','Сбросить демо','class="primary"')}`); return;
    case 'confirm-reset': state=ensureDemoExtensions(makeDemo()); Object.assign(workspace,createWorkspace(state.currentId)); view.query=''; view.correction={glasses:0,contacts:0}; view.tab='exam'; view.details=false; closeDialog(); notify('Исходный сценарий восстановлен.'); break;
    default: return;
  }
  save(); render();
  // Re-rendered controls keep keyboard focus when their action remains visible.
  const candidates=[...app.querySelectorAll(`[data-action="${action}"]`)];
  const replacement=candidates.find(el=>Object.entries(target.dataset).every(([k,v])=>el.dataset[k]===v));
  replacement?.focus({preventScroll:true});
}
document.addEventListener('click', event => {
  const target=event.target.closest('button[data-action]');
  if (!target || target.disabled) return;
  try { handleAction(target); } catch(error) { notify(error.message); }
});
document.addEventListener('input', event => {
  const target=event.target;
  if(target.id==='patient-search'){view.query=target.value;document.querySelector('#search-results').innerHTML=searchResults();return;}
  if (dialog.contains(target)) return;
  try {
    if(target.dataset.flex){editable(exam());exam().corrections.find(c=>c.id===target.dataset.flex).flex[target.dataset.eye][Number(target.dataset.index)].value=target.value;save();return;}
    if (target.dataset.measure) {
      const [group,eye,key]=target.dataset.measure.split('.');
      setMeasure(exam(),group,eye,key,target.value);
      const error=numericError(key,target.value);
      target.setAttribute('aria-invalid',Boolean(error));
      target.title=error||target.getAttribute('aria-label');
      const source=target.parentElement.querySelector('.source-mark');
      if (source) { source.textContent='Вручную'; source.title='Ручной ввод · демо'; }
    } else if (target.dataset.context) { editable(exam()); setPath(exam().context,target.dataset.context,target.value); }
    else if (target.dataset.conclusion) { editable(exam()); setPath(exam().conclusion,target.dataset.conclusion,target.value); }
    else if (target.dataset.correction) { editable(exam()); setPath(exam().corrections.find(c=>c.id===target.dataset.correction),target.dataset.path,target.value); }
    else return;
    save();
  } catch(error) { notify(error.message); }
});
document.addEventListener('change',event=>{
  if(event.target.id==='history-select'){selectExam(state,workspace,event.target.value);render();}
  if(event.target.id==='attachment-select')view.selectedAttachment=event.target.value;
  if(event.target.id==='theme-select'){theme=event.target.value;try{localStorage.setItem('drmate.clinic.theme',theme);}catch{}applyTheme();}
  if(event.target.id==='compare-arrangement'){workspace.arrangement=event.target.value;render();}
  if(event.target.id==='compare-ratio'){workspace.ratio=event.target.value;render();}
  if(event.target.id==='flex-preset'){const preset=FLEX_PRESETS.find(p=>p.code===event.target.value);const form=event.target.form;form.elements.label.value=preset?.label||'';form.elements.unit.value=preset?.unit||'';}
  if (event.target.dataset.measure) {
    const key=event.target.dataset.measure.split('.').at(-1);
    const error=numericError(key,event.target.value);
    if (error) notify(error);
  }
});
dialog.addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target;
  if (!form.reportValidity()) return;
  const data=new FormData(form);
  try {
    switch (form.dataset.form) {
      case 'flex-add': {addFlex(exam(),data.get('correctionId'),data.get('eye'),{id:crypto.randomUUID(),label:data.get('label'),unit:data.get('unit')});break;}
      case 'add-correction': {
        const c=blankCorrection(data.get('kind'),data.get('id'));
        for (const [key,value] of data) if (!['kind','id'].includes(key)) setPath(c,key,value.trim());
        for (const eye of EYES) for (const [key,value] of Object.entries(c.eyes[eye])) {
          const error=numericError(key,value); if (error) throw new Error(`${eye} ${key}: ${error}`);
        }
        addCorrection(exam(),c);
        view.correction[c.kind]=exam().corrections.filter(c2=>c2.kind===c.kind&&c2.active).length-1;
        notify('Добавлена отдельная запись. Предыдущая коррекция сохранена.'); break;
      }
      case 'parameters':
        editable(exam()); state.enabledExtra=[];
        for (const key of Object.keys(EXTRA)) if (data.has(key)) enableExtra(state,key);
        break;
      case 'snooze': {
        editable(exam()); const f=exam().followups.find(f=>f.id===data.get('id'));
        f.due=data.get('due'); f.status='snoozed'; notify('Действие отложено. Оно доступно в списке всех действий.'); break;
      }
      case 'follow-add': {
        editable(exam());
        const text=data.get('text').trim(); if (!text) throw new Error('Введите текст действия.');
        exam().followups.push({id:`follow-${crypto.randomUUID()}`,text,type:data.get('type'),due:data.get('due'),status:data.get('due')<=exam().date?'active':'pending',origin:`Осмотр #${no(exam())} · ${date(exam().date)}`});
        notify('Действие добавлено в демонстрационный план.'); break;
      }
      case 'new-visit': newEncounter(state,data.get('date')); Object.assign(workspace,createWorkspace(state.currentId)); view.tab='exam'; view.correction={glasses:0,contacts:0}; view.details=false; break;
      default: return;
    }
    closeDialog(); save(); render();
  } catch(error) { modalError(error.message); }
});

// Optional page-local agent surface; uses the same navigation as the UI.
const context=document.modelContext;
if (context?.registerTool) {
  const lifecycle=new AbortController();
  const register=tool=>{
    try { Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{}); } catch { /* Browser support is optional. */ }
  };
  register({name:'read_clinic_demo',description:'Read synthetic demo visit IDs and the selected visit. No real patient records.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({selected:state.currentId,visits:state.encounters.map(({id,date,status})=>({id,date,status}))})});
  register({name:'open_clinic_demo_visit',description:'Navigate to an existing synthetic visit. Does not create or complete a visit.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{
    if (!input||typeof input.id!=='string'||Object.keys(input).some(k=>k!=='id')) throw new Error('Expected a visit id.');
    navigateTarget({kind:'exam',id:input.id}); return {selected:state.currentId,status:exam().status};
  }});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
save(); render();
if (recoveryMessage) notify(recoveryMessage);
