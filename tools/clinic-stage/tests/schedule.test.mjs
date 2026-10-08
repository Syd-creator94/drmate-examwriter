import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {STORAGE_PREFIX} from '../app/model.mjs';
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'http://localhost/#/crm/schedule'});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};
dom.window.HTMLElement.prototype.scrollTo=()=>{};
for(const name of ['document','window','history','location','FormData'])globalThis[name]=dom.window[name];
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
await import('../app/app.mjs?schedule-week');
const el=s=>{const result=document.querySelector(s);assert.ok(result,s);return result;};
const click=s=>{el(s).focus();el(s).click();};
const set=(s,value)=>{el(s).value=value;el(s).dispatchEvent(new window.Event('change',{bubbles:true}));};
const submit=()=>el('#appointment-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));

test('view switch and seven-day navigation preserve selected date and exact daily drill-down',()=>{
  click('[data-action="schedule-view"][data-view="week"]');
  assert.equal(document.querySelectorAll('.week-day-head').length,7);
  assert.equal(el('.week-day-head.selected').dataset.date,'2026-10-08');
  assert.match(el('.crm-context .capacity').textContent,/300 из 4200 минут/);
  assert.equal(el('[data-view="week"]').getAttribute('aria-pressed'),'true');
  assert.equal(document.activeElement.dataset.view,'week');
  click('[data-action="schedule-next"]');assert.equal(el('[data-schedule-date]').value,'2026-10-15');
  assert.match(el('.week-foot').textContent,/нет записей/);assert.match(el('.crm-context .capacity').textContent,/0 из 4200 минут/);
  click('[data-action="schedule-prev"]');assert.equal(el('[data-schedule-date]').value,'2026-10-08');
  click('.week-day-head[data-date="2026-10-09"]');
  assert.equal(el('[data-schedule-date]').value,'2026-10-09');assert.equal(el('[data-view="day"]').getAttribute('aria-pressed'),'true');
  click('[data-action="schedule-prev"]');assert.equal(el('[data-schedule-date]').value,'2026-10-08');
});

test('slot supplies its own date, cancellation leaves selection intact, and new slot opens exact appointment',()=>{
  click('[data-view="week"]');
  click('.week-slot[data-date="2026-10-09"][data-time="09:30"]');
  assert.equal(el('#appointment-form [name="date"]').value,'2026-10-09');
  assert.equal(el('#appointment-form [name="time"]').value,'09:30');
  click('#appointment-form [data-action="close-dialog"]');assert.equal(el('[data-schedule-date]').value,'2026-10-08');
  click('.week-slot[data-date="2026-10-09"][data-time="09:30"]');
  set('#appointment-form [name="patientId"]','dm-0216');submit();
  assert.equal(el('[data-schedule-date]').value,'2026-10-09');assert.equal(el('[data-view="week"]').getAttribute('aria-pressed'),'true');
  assert.equal(document.querySelectorAll('[data-week-date="2026-10-09"] .week-appointment').length,1);
  click('[data-week-date="2026-10-09"] .week-appointment');assert.match(el('#dialog').textContent,/09\.10\.2026 · 09:30/);
  set('#appointment-status-form [name="status"]','Отменён');
  el('#appointment-status-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(document.querySelectorAll('[data-week-date="2026-10-09"] .week-appointment').length,0);
});

test('week slot uses existing overlap checks and supports final half-hour without crossing into next day',()=>{
  click('.week-slot[data-date="2026-10-08"][data-time="09:30"]');set('#appointment-form [name="patientId"]','dm-0216');submit();
  assert.match(el('#appointment-form .form-error').textContent,/пересекается/);
  click('#appointment-form [data-action="close-dialog"]');
  click('.week-slot[data-date="2026-10-11"][data-time="17:30"]');set('#appointment-form [name="patientId"]','dm-0102');submit();
  const last=el('[data-week-date="2026-10-11"] .week-appointment');assert.equal(last.style.height,'44px');assert.equal(last.style.top,'914px');
  assert.match(last.getAttribute('aria-label'),/17:30–18:00/);
  click('[data-action="save-crm"]');const envelope=JSON.parse(memory.get(`${STORAGE_PREFIX}.crm`));
  assert.ok(envelope.value.appointments.some(a=>a.date==='2026-10-11'&&a.time==='17:30'));
  click('[data-action="schedule-today"]');assert.equal(el('[data-schedule-date]').value,'2026-10-08');
  dom.window.close();
});
