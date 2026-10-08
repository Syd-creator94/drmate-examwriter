import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDemo,currentExam,clone,setMeasure,previousValue,enableExtra,newEncounter,importDemo,measureSource,blankCorrection,addCorrection,completeEncounter,correctionHistory} from '../../src/dr_mate_clinic_prototype/static/model.mjs';

test('extra fields persist across visits without carrying forward measured values',()=>{
  const state=makeDemo(), old=currentExam(state);
  enableExtra(state,'dvid'); setMeasure(old,'keratometry','OD','dvid','11.6');
  old.conclusion.decision='Демонстрационное решение'; completeEncounter(old);
  const next=newEncounter(state,'2026-10-09');
  assert.ok(state.enabledExtra.includes('dvid'));
  assert.equal(next.measures.keratometry.OD.dvid,'');
  assert.deepEqual(previousValue(state,next,'keratometry','OD','dvid'),{value:'11.6',date:'2026-09-09'});
  assert.equal(next.context.sleep,'');
  assert.equal(next.source.auto,null);
});
test('import preserves manually entered cells and attributes equal-valued cells correctly',()=>{
  const ex=currentExam(makeDemo());
  setMeasure(ex,'auto','OD','sph','-2.00');
  const result=importDemo(ex,'packet-1','2026-09-09T10:30:00');
  assert.equal(result.kept,1); assert.equal(result.filled,13);
  assert.equal(measureSource(ex,'auto','OD','sph'),'Ручной ввод · демо');
  assert.match(measureSource(ex,'auto','OS','sph'),/^Demo AR\/K/);
  setMeasure(ex,'auto','OS','sph','-3.00');
  assert.equal(ex.imports[0].auto.OS.sph,'-2.50');
  assert.equal(measureSource(ex,'auto','OS','sph'),'Ручной ввод · демо');
  const snapshot=clone(ex);
  assert.throws(()=>importDemo(ex,'packet-1','now'),/уже получен/);
  assert.deepEqual(ex,snapshot);
});
test('historical correction snapshots remain unchanged after current edits and additions',()=>{
  const state=makeDemo(), ex=currentExam(state);
  const historic=clone(state.encounters[2]);
  ex.corrections[0].eyes.OD.sph='-3.25';
  const added=blankCorrection('glasses','g3'); added.name='Компьютерные';
  addCorrection(ex,added);
  assert.equal(ex.corrections.filter(c=>c.kind==='glasses'&&c.active).length,3);
  assert.deepEqual(state.encounters[2],historic);
  assert.equal(correctionHistory(state,'glasses').filter(c=>c.id==='g1').length,1);
});
test('completion requires a decision, rejects malformed measurements and locks the visit',()=>{
  const ex=currentExam(makeDemo());
  assert.throws(()=>completeEncounter(ex),/решение/);
  ex.conclusion.decision='Тест';
  setMeasure(ex,'manifest','OD','axis','999');
  assert.throws(()=>completeEncounter(ex),/формат/);
  assert.equal(ex.status,'draft');
  setMeasure(ex,'manifest','OD','axis','180');
  setMeasure(ex,'manifest','OD','dva','1.2-2');
  completeEncounter(ex);
  assert.throws(()=>setMeasure(ex,'manifest','OD','sph','1'),/только для чтения/);
  assert.throws(()=>importDemo(ex,'p','today'),/только для чтения/);
  assert.throws(()=>addCorrection(ex,blankCorrection('glasses','g9')),/только для чтения/);
});
test('new visits inherit follow-up outcomes and activate actions by encounter date',()=>{
  const state=makeDemo(), ex=currentExam(state);
  assert.throws(()=>newEncounter(state,'2026-10-09'),/черновик/);
  ex.followups[0].status='completed';
  ex.followups[1].status='snoozed'; ex.followups[1].due='2026-10-20';
  ex.conclusion.decision='Тест'; completeEncounter(ex);
  assert.throws(()=>newEncounter(state,'2026-01-01'),/Дата/);
  const next=newEncounter(state,'2026-10-09');
  assert.deepEqual(next.followups.map(f=>f.status),['completed','snoozed','active']);
  next.followups[2].status='completed';
  assert.equal(ex.followups[2].status,'pending');
});
test('unknown field keys are rejected and blank observations stay unknown',()=>{
  const state=makeDemo(), ex=currentExam(state);
  assert.throws(()=>enableExtra(state,'invented'));
  assert.throws(()=>setMeasure(ex,'auto','OD','invented','4'));
  assert.equal(previousValue(state,ex,'keratometry','OD','dvid'),null);
  assert.equal(ex.measures.keratometry.OD.vvid,'');
  assert.equal(measureSource(ex,'keratometry','OD','vvid'),'Не измерено');
});
