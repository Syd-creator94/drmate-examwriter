// Calendar dates are civil dates. UTC keeps week boundaries independent of the device timezone.
export function shiftDate(date,days){
  const value=new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}
export function weekDates(date){
  const weekday=new Date(`${date}T12:00:00Z`).getUTCDay();
  const monday=shiftDate(date,-((weekday+6)%7));
  return Array.from({length:7},(_,i)=>shiftDate(monday,i));
}
export function weekLabel(date){
  const dates=weekDates(date),start=new Date(`${dates[0]}T12:00:00Z`),end=new Date(`${dates[6]}T12:00:00Z`);
  const format=(value,options)=>value.toLocaleDateString('ru-RU',{...options,timeZone:'UTC'});
  if(start.getUTCFullYear()!==end.getUTCFullYear())return `${format(start,{day:'numeric',month:'short',year:'numeric'})} — ${format(end,{day:'numeric',month:'short',year:'numeric'})}`;
  if(start.getUTCMonth()!==end.getUTCMonth())return `${format(start,{day:'numeric',month:'short'})} — ${format(end,{day:'numeric',month:'short',year:'numeric'})}`;
  return `${start.getUTCDate()}–${format(end,{day:'numeric',month:'long',year:'numeric'})}`;
}
export function periodAppointments(appointments,dates){
  return appointments.filter(a=>dates.includes(a.date)&&a.status!=='Отменён').sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
}
export function appointmentCount(count){
  const tail=count%100,unit=count%10;
  return `${count} ${tail>=11&&tail<=14?'записей':unit===1?'запись':unit>=2&&unit<=4?'записи':'записей'}`;
}
