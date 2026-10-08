import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {STORAGE_PREFIX} from '../app/model.mjs';
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'http://localhost/'});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};
dom.window.scrollTo=()=>{};dom.window.HTMLElement.prototype.scrollTo=()=>{};
for(const key of ['document','window','history','location','FormData'])globalThis[key]=dom.window[key];
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
await import('../app/app.mjs?workflow-review');
const el=selector=>{const element=document.querySelector(selector);assert.ok(element,selector);return element;};
const click=selector=>{el(selector).focus();el(selector).click();};
const set=(selector,value,event='input')=>{el(selector).value=value;el(selector).dispatchEvent(new window.Event(event,{bubbles:true}));};
const key=(selector,value,options={})=>el(selector).dispatchEvent(new window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...options}));
const submit=selector=>el(selector).dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));

test('section keyboard navigation retains focus and field values across rendered tabs',()=>{
  click('.queue-person[data-id="dm-0148"]');click('#section-tab-refraction');
  assert.equal(document.activeElement.id,'section-tab-refraction');
  set('[data-field="refraction.OD.sph"]','−2.75');
  key('#section-tab-refraction','ArrowRight');assert.equal(document.activeElement.id,'section-tab-exam');
  key('#section-tab-exam','ArrowLeft');assert.equal(el('[data-field="refraction.OD.sph"]').value,'−2.75');
  assert.equal(el('[data-field="refraction.OD.sph"]').getAttribute('aria-label'),'OD · Рефракция · Sph');
  key('#section-tab-refraction','End');assert.equal(document.activeElement.id,'section-tab-conclusion');
  key('#section-tab-conclusion','Home');assert.equal(document.activeElement.id,'section-tab-overview');
  assert.equal(document.querySelectorAll('.clinical-tabs [tabindex="0"]').length,1);
  click('[data-action="theme"]');assert.equal(document.activeElement.dataset.action,'theme');
});

test('closing a dialog returns focus and save shortcut does not save unapplied modal fields',()=>{
  click('[data-action="search"]');assert.equal(document.activeElement.id,'workspace-search');
  click('[data-action="close-dialog"]');assert.equal(document.activeElement.dataset.action,'search');
  click('.module-switch [data-module="crm"]');click('[data-action="request-new"]');
  set('#new-request-form [name="name"]','Алексей Морозов');
  key('#new-request-form [name="name"]','k',{ctrlKey:true});
  assert.equal(el('#new-request-form [name="name"]').value,'Алексей Морозов');
  key('#new-request-form [name="name"]','s',{ctrlKey:true});
  assert.equal(memory.has(`${STORAGE_PREFIX}.crm`),false);assert.equal(el('#dialog').open,true);
  submit('#new-request-form');
});

test('request scheduling applies edited ownership, preserves return path and opens its exact appointment',()=>{
  const card=[...document.querySelectorAll('.request-card')].find(e=>e.textContent.includes('Алексей Морозов'));
  card.click();set('#request-form [name="owner"]','И. Орлов');set('#request-form [name="note"]','Учебная операционная заметка.');
  click('[data-action="request-schedule"]');assert.equal(el('#appointment-form [name="patientId"]').value,'');
  assert.match(el('#appointment-form [data-action="request"]').textContent,/Вернуться к обращению/);
  click('#appointment-form [data-action="request"]');assert.equal(el('#request-form [name="owner"]').value,'И. Орлов');
  click('[data-action="request-schedule"]');set('#appointment-form [name="patientId"]','dm-0216','change');
  set('#appointment-form [name="date"]','2026-10-09');set('#appointment-form [name="time"]','09:15');submit('#appointment-form');
  assert.equal(el('#request-form [name="stage"]').value,'booked');assert.equal(el('#request-form [name="owner"]').value,'И. Орлов');
  click('#request-form [data-action="crm-patient"]');assert.match(el('#dialog').textContent,/09\.10\.2026 · 09:15/);
  click('[data-action="close-dialog"]');click('.view-tabs [data-page="requests"]');
  const owner=[...document.querySelectorAll('.request-card')].find(e=>e.textContent.includes('Алексей Морозов')).querySelector('.owner-avatar');
  assert.equal(owner.textContent,'ИО');assert.match(owner.title,/И\. Орлов/);
});

test('first visit has no comparison and earlier pair has no later version intent',()=>{
  click('.queue-person[data-id="dm-0216"]');assert.equal(el('[data-action="compare"]').disabled,true);
  click('.queue-person[data-id="dm-0148"]');set('[data-record-select]','dm-0148-baseline','change');click('#section-tab-lenses');
  assert.match(el('[data-field="lenses.model"]').value,/версия 1/);assert.equal(document.querySelector('.pair-intent'),null);
});

test('new visit after completion keeps the prior decision in history and starts without pair intent',()=>{
  set('[data-record-select]','dm-0148-current','change');click('#section-tab-conclusion');
  set('[data-field="decision"]','Учебное решение для проверки сценария.');click('.patient-actions [data-action="complete"]');
  click('[data-action="complete-confirm"]');click('[data-action="patient-new"]');click('#section-tab-lenses');
  assert.equal(el('[data-field="lenses.model"]').value,'');assert.equal(document.querySelector('.pair-intent'),null);
  click('#section-tab-conclusion');assert.equal(el('[data-field="decision"]').value,'');
  set('[data-record-select]','dm-0148-current','change');click('#section-tab-conclusion');
  assert.equal(el('[data-field="decision"]').readOnly,true);assert.match(el('[data-field="decision"]').value,/Учебное решение/);
  dom.window.close();
});
