import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDemo,currentExam} from '../../src/dr_mate_clinic_prototype/static/model.mjs';
import {createWorkspace,selectExam,openTarget,returnToWorkspace,swapPanes,searchPatient,ensureDemoExtensions,addFlex} from '../../src/dr_mate_clinic_prototype/static/workspace.mjs';

test('selection alone never switches the active draft',()=>{
  const state=ensureDemoExtensions(makeDemo()), workspace=createWorkspace(state.currentId);
  selectExam(state,workspace,'exam-002');
  assert.equal(state.currentId,'exam-004');
  assert.deepEqual(workspace.primary,{kind:'exam',id:'exam-004'});
  assert.equal(workspace.selectedExam,'exam-002');
});
test('expanding a reference and returning restores comparison, focus, proportions and scroll',()=>{
  const state=ensureDemoExtensions(makeDemo()), w=createWorkspace(state.currentId);
  currentExam(state).measures.manifest.OD.sph='-3.25';
  w.focus='03'; w.ratio='primary'; w.arrangement='rows';
  openTarget(state,w,{kind:'exam',id:'exam-002'},true);
  openTarget(state,w,w.secondary,false,340);
  assert.equal(state.currentId,'exam-002');
  assert.equal(w.secondary,null);
  assert.equal(returnToWorkspace(state,w),340);
  assert.equal(state.currentId,'exam-004');
  assert.equal(currentExam(state).measures.manifest.OD.sph,'-3.25');
  assert.deepEqual(w.secondary,{kind:'exam',id:'exam-002'});
  assert.equal(w.focus,'03'); assert.equal(w.ratio,'primary'); assert.equal(w.arrangement,'rows');
});
test('image/document navigation supports comparison and reversible depth',()=>{
  const state=ensureDemoExtensions(makeDemo()), w=createWorkspace(state.currentId);
  openTarget(state,w,{kind:'attachment',id:'oct-01'});
  openTarget(state,w,{kind:'attachment',id:'oct-report'},true);
  swapPanes(state,w);
  assert.equal(w.primary.id,'oct-report'); assert.equal(w.secondary.id,'oct-01');
  assert.equal(state.currentId,'exam-004');
  openTarget(state,w,w.secondary);
  returnToWorkspace(state,w);
  assert.equal(w.primary.id,'oct-report'); assert.equal(w.secondary.id,'oct-01');
});
test('patient search connects synonyms and excludes another patient',()=>{
  const state=ensureDemoExtensions(makeDemo());
  assert.deepEqual(searchPatient(state,'перерыв').map(r=>r.id),searchPatient(state,'washout').map(r=>r.id));
  assert.ok(searchPatient(state,'washout').some(r=>r.id==='exam-14680'));
  assert.equal(searchPatient(state,'ОКТ').length,2);
  assert.equal(searchPatient(state,'oct').length,2);
  state.attachments.push({id:'private-other',patientId:'ANOTHER',date:'2026-09-09',title:'ОКТ',tags:['ОКТ']});
  assert.equal(searchPatient(state,'ОКТ').length,2);
  assert.equal(searchPatient(state,'неизвестный запрос').length,0);
  assert.equal(searchPatient(state,'  ').length,0);
  assert.throws(()=>openTarget(state,createWorkspace(state.currentId),{kind:'attachment',id:'private-other'}),/этой карте/);
});
test('Flex fields belong to the selected correction and eye, without changing history',()=>{
  const state=ensureDemoExtensions(makeDemo()), ex=currentExam(state);
  const old=structuredClone(state.encounters.find(e=>e.id==='exam-003'));
  addFlex(ex,'c1','OD',{id:'f1',label:'BC 2',unit:'мм'});
  ex.corrections.find(c=>c.id==='c1').flex.OD[0].value='8.9';
  assert.equal(ex.corrections.find(c=>c.id==='c1').flex.OS.length,0);
  assert.equal(ex.corrections.find(c=>c.id==='c2').flex.OD.length,0);
  assert.deepEqual(state.encounters.find(e=>e.id==='exam-003'),old);
  assert.throws(()=>addFlex(ex,'c1','OD',{id:'f2',label:'BC 2'}),/уже есть/);
  assert.throws(()=>addFlex(state.encounters[0],'c1','OD',{label:'New'}),/только для чтения/);
});
test('v1 demo migration is additive, repeatable and preserves earlier edits',()=>{
  const state=makeDemo();
  currentExam(state).conclusion.decision='Сохранить этот текст';
  ensureDemoExtensions(state);
  const snapshot=structuredClone(state);
  ensureDemoExtensions(state);
  assert.deepEqual(state,snapshot);
  assert.equal(currentExam(state).conclusion.decision,'Сохранить этот текст');
  assert.equal(state.encounters.filter(e=>e.status==='completed').length,5);
});
