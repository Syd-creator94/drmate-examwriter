import {PATIENTS,INITIAL_TASKS,INITIAL_REQUESTS,INITIAL_HANDOFFS,initialRecords,emptyRecord,DEMO_DATE} from './data.mjs';
export const VERSION=1;
export const clone=v=>structuredClone(v);
export const STORAGE_PREFIX='dr-mate-clinic-stage.v1';
export function createState(){return {version:VERSION,patients:clone(PATIENTS),records:Object.fromEntries(PATIENTS.map(p=>[p.id,initialRecords(p)])),tasks:clone(INITIAL_TASKS),crm:{requests:clone(INITIAL_REQUESTS),handoffs:clone(INITIAL_HANDOFFS),appointments:clone(PATIENTS.map(p=>({id:`a-${p.id}`,patientId:p.id,date:DEMO_DATE,time:p.time,duration:p.duration,kind:p.kind,status:p.stage}))),log:[]},pins:{},expectations:{}};}
export function patientById(state,id){return state.patients.find(p=>p.id===id);}
export function recordById(state,patientId,id){return state.records[patientId]?.find(r=>r.id===id);}
export function updateField(state,patientId,recordId,path,value){
  const r=recordById(state,patientId,recordId);
  if(!r||r.status!=='draft')throw new Error('Завершённый осмотр доступен для чтения.');
  const keys=path.split('.');
  let target=r;
  for(const key of keys.slice(0,-1)){
    if(!Object.hasOwn(target,key)||target[key]===null||typeof target[key]!=='object')throw new Error('Неизвестное поле.');
    target=target[key];
  }
  const key=keys.at(-1);
  if(!Object.hasOwn(target,key)||typeof target[key]!=='string'||['id','patientId','status','date','source'].includes(path))throw new Error('Неизвестное поле.');
  target[key]=String(value);return r;
}
export function newEncounter(state,patientId,date=DEMO_DATE){
  if(!patientById(state,patientId))throw new Error('Пациент не найден.');
  const records=state.records[patientId]??=[];
  const draft=records.find(r=>r.status==='draft');
  if(draft)return draft;
  const r=emptyRecord(patientId,`${patientId}-visit-${Date.now()}`,date);
  records.unshift(r);return r;
}
export function completeEncounter(state,patientId,recordId){
  const r=recordById(state,patientId,recordId);
  if(!r||r.status!=='draft')throw new Error('Приём уже завершён.');
  if(!r.decision.trim())throw new Error('Добавьте решение врача в итог приёма.');
  r.status='completed';return r;
}
export function importDemo(state,patientId,recordId){
  const r=recordById(state,patientId,recordId);if(!r||r.status!=='draft')throw new Error('Запись доступна только для чтения.');
  if(r.imported)throw new Error('Учебный пакет уже загружен.');
  let filled=0,kept=0;
  const packet={OD:{sph:'−2.00',cyl:'−0.75',axis:'180'},OS:{sph:'−2.50',cyl:'−0.50',axis:'90'}};
  for(const eye of ['OD','OS'])for(const [k,v]of Object.entries(packet[eye])){if(r.auto[eye][k]===''){r.auto[eye][k]=v;filled++;}else kept++;}
  r.imported=true;return {filled,kept};
}
export function crmProjection(state,id){
  const p=patientById(state,id);if(!p)return null;
  // Administrative boundary: no records, measurements, diagnosis or findings.
  return {id:p.id,name:p.name,initials:p.initials,tone:p.tone,appointments:clone(state.crm.appointments.filter(a=>a.patientId===id)),handoffs:clone(state.crm.handoffs.filter(h=>h.patientId===id)),contact:'Не указан в демо'};
}
export function scheduleAppointment(state,values){
  if(!patientById(state,values.patientId))throw new Error('Выберите пациента.');
  const date=values.date,time=values.time;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw new Error('Укажите дату и время.');
  const duration=Number(values.duration);
  if(![30,45,60].includes(duration))throw new Error('Выберите длительность.');
  const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));const start=minutes(time);if(start<480||start+duration>1080)throw new Error('Запись должна быть в пределах 08:00–18:00.');
  if(state.crm.appointments.some(a=>a.date===date&&a.status!=='Отменён'&&start<minutes(a.time)+a.duration&&minutes(a.time)<start+duration))throw new Error('Это время пересекается с другой записью. Выберите свободный слот.');
  const a={id:`a-${Date.now()}`,patientId:values.patientId,date,time,duration,kind:values.kind||'Консультация',status:'Не подтверждён'};state.crm.appointments.push(a);return a;
}
export function moveRequest(state,id,stage){
  const r=state.crm.requests.find(x=>x.id===id);if(!r||!['new','contact','booked','done'].includes(stage))throw new Error('Неизвестный этап.');
  r.stage=stage;state.crm.log.unshift({id:`event-${Date.now()}`,name:r.name,text:`Этап обращения: ${{new:'Новое',contact:'В работе',booked:'Записан',done:'Завершено'}[stage]}`,time:'Сейчас'});return r;
}
export function markHandoff(state,id){
  const h=state.crm.handoffs.find(x=>x.id===id);if(!h||!h.approved)throw new Error('Сначала нужен утверждённый план врача.');h.done=!h.done;return h;
}
export function storageEnvelope(value,revision=0){return {version:VERSION,revision:revision+1,savedAt:new Date().toISOString(),value:clone(value)};}
export function readEnvelope(raw){
  if(!raw)return null;let e;try{e=JSON.parse(raw);}catch{throw new Error('Локальная копия повреждена. Текущая работа сохранена в памяти.');}
  if(!e||e.version!==VERSION||!Number.isInteger(e.revision)||e.revision<1||!e.value||typeof e.value!=='object')throw new Error('Формат локальной копии не поддерживается.');return e;
}
export function validClinical(value,patientId){
  if(!Array.isArray(value?.records)||!value.records.length||value.records.length>100)return false;
  const seen=new Set();
  const shape=emptyRecord(patientId,'shape');
  const fits=(target,template)=>Object.entries(template).every(([key,type])=>Object.hasOwn(target,key)&&(typeof type==='object'&&type!==null?typeof target[key]==='object'&&target[key]!==null&&fits(target[key],type):typeof target[key]===typeof type));
  for(const r of value.records){if(!r||!fits(r,shape)||r.patientId!==patientId||!['draft','completed'].includes(r.status)||seen.has(r.id))return false;seen.add(r.id);}return true;
}
export function validCRM(value,patientIds){
  if(!value||!Array.isArray(value.requests)||!Array.isArray(value.handoffs)||!Array.isArray(value.appointments)||!Array.isArray(value.log))return false;
  return value.appointments.every(a=>patientIds.includes(a.patientId)&&typeof a.id==='string'&&typeof a.date==='string'&&/^\d{2}:\d{2}$/.test(a.time)&&[30,45,60].includes(a.duration)&&typeof a.kind==='string'&&typeof a.status==='string')&&value.requests.every(r=>typeof r.id==='string'&&typeof r.name==='string'&&['new','contact','booked','done'].includes(r.stage)&&typeof r.note==='string')&&value.handoffs.every(h=>patientIds.includes(h.patientId)&&typeof h.id==='string'&&typeof h.approved==='boolean'&&typeof h.done==='boolean');
}
export function searchWorkspace(state,query){
  const q=query.toLocaleLowerCase('ru').trim();if(!q)return [];
  const results=[];
  for(const p of state.patients){if(`${p.name} ${p.id} ${p.kind}`.toLocaleLowerCase('ru').includes(q))results.push({kind:'patient',patientId:p.id,title:p.name,subtitle:p.kind});
    for(const r of state.records[p.id]??[]){if([r.title,r.complaint,r.history,r.exam,r.findings,r.decision,r.plan,r.date,r.lenses.model].join(' ').toLocaleLowerCase('ru').includes(q))results.push({kind:'record',patientId:p.id,recordId:r.id,title:`${p.name} · ${r.title}`,subtitle:r.date});}
  }return results.slice(0,30);
}
export function progress(r){
  return {interview:!!r.complaint.trim(),refraction:['OD','OS'].some(e=>r.refraction[e].sph!==''),exam:!!r.exam.trim(),lenses:!!r.lenses.model.trim(),binocular:!!r.binocular.note.trim()||!!r.binocular.distance.trim(),conclusion:!!r.decision.trim()};
}
