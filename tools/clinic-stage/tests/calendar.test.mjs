import test from 'node:test';
import assert from 'node:assert/strict';
import {weekDates,weekLabel,shiftDate,periodAppointments} from '../app/calendar.mjs';
import {createState,scheduleAppointment} from '../app/model.mjs';

test('week runs Monday to Sunday including Sundays and year boundaries',()=>{
  assert.deepEqual(weekDates('2026-10-08'),['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10','2026-10-11']);
  assert.deepEqual(weekDates('2026-10-11'),weekDates('2026-10-05'));
  assert.deepEqual(weekDates('2027-01-01'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
  assert.equal(shiftDate('2026-10-08',7),'2026-10-15');
  assert.match(weekLabel('2026-10-08'),/5–11 октября 2026/);
  assert.match(weekLabel('2026-10-30'),/26 окт.*1 нояб.*2026/);
  assert.match(weekLabel('2027-01-01'),/2026.*2027/);
});

test('week projection includes each day, excludes cancellation and keeps exact appointment identity',()=>{
  const state=createState();
  const friday=scheduleAppointment(state,{patientId:'dm-0216',date:'2026-10-09',time:'09:15',duration:30});
  const previous=scheduleAppointment(state,{patientId:'dm-0194',date:'2026-10-04',time:'09:15',duration:30});
  state.crm.appointments[0].status='Отменён';
  const items=periodAppointments(state.crm.appointments,weekDates('2026-10-08'));
  assert.equal(items.length,7);assert.ok(items.some(a=>a.id===friday.id&&a.date==='2026-10-09'));
  assert.ok(!items.includes(previous));assert.ok(items.every(a=>a.status!=='Отменён'));
  assert.equal(items.at(-1),friday);
});
