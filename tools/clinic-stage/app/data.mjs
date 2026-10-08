// Synthetic UI fixtures. No patient data or production contracts.
export const DEMO_DATE = '2026-10-08';
export const PATIENTS = [
  {id:'dm-0148',name:'Мария Соколова',initials:'МС',age:29,tone:'mint',time:'09:30',kind:'Контроль коррекции',stage:'В кабинете',doctor:'А. Мате',duration:45,goal:'Оценить комфорт и результат новой пары',last:'2026-09-09'},
  {id:'dm-0216',name:'Алексей Морозов',initials:'АМ',age:34,tone:'blue',time:'10:30',kind:'Первичная консультация',stage:'Ожидает',doctor:'А. Мате',duration:60,goal:'Обсудить варианты коррекции',last:null},
  {id:'dm-0083',name:'София Лебедева',initials:'СЛ',age:16,tone:'rose',time:'11:45',kind:'Контрольный осмотр',stage:'Подтверждён',doctor:'А. Мате',duration:30,goal:'Контроль текущей коррекции',last:'2026-08-20'},
  {id:'dm-0307',name:'Даниил Волков',initials:'ДВ',age:26,tone:'violet',time:'13:30',kind:'Примерка линз',stage:'Подтверждён',doctor:'А. Мате',duration:45,goal:'Оценить посадку пробной пары',last:'2026-09-22'},
  {id:'dm-0194',name:'Анна Ким',initials:'АК',age:42,tone:'amber',time:'14:30',kind:'Подбор очков',stage:'Не подтверждён',doctor:'А. Мате',duration:45,goal:'Проверить коррекцию для близи',last:'2026-07-15'},
  {id:'dm-0265',name:'Илья Орлов',initials:'ИО',age:21,tone:'cyan',time:'15:30',kind:'Контрольный осмотр',stage:'Подтверждён',doctor:'А. Мате',duration:30,goal:'Обсудить комфорт ношения',last:'2026-09-02'},
  {id:'dm-0102',name:'Елена Миронова',initials:'ЕМ',age:37,tone:'mint',time:'16:15',kind:'Консультация',stage:'Подтверждён',doctor:'А. Мате',duration:45,goal:'Обсудить дальнейший план',last:'2026-08-14'}
];
export const SECTIONS = [
  {id:'interview',title:'Жалобы и анамнез',short:'Интервью',tone:'sand',icon:'chat'},
  {id:'refraction',title:'Рефракция и коррекция',short:'Рефракция',tone:'teal',icon:'scan'},
  {id:'exam',title:'Осмотр и исследования',short:'Осмотр',tone:'ice',icon:'eye'},
  {id:'lenses',title:'Контактные линзы',short:'Линзы',tone:'petrol',icon:'lens'},
  {id:'binocular',title:'Бинокулярные функции',short:'Бинокулярность',tone:'slate',icon:'focus'},
  {id:'conclusion',title:'Итог и следующий шаг',short:'Итог',tone:'sage',icon:'check-circle'}
];
export const MATERIALS = [
  {id:'topography',title:'Топография роговицы',kind:'Учебная схема',tone:'blue',date:'08.10.2026',patientId:'dm-0148',section:'exam'},
  {id:'oct',title:'ОКТ · передний отрезок',kind:'Учебная схема',tone:'violet',date:'09.09.2026',patientId:'dm-0148',section:'exam'},
  {id:'plan',title:'Задача этой пары',kind:'Замысел врача',tone:'violet',date:'09.09.2026',patientId:'dm-0148',section:'lenses'},
  {id:'memo',title:'Памятка перед визитом',kind:'Демо-документ',tone:'cyan',date:'08.10.2026',patientId:null,section:'conclusion'}
];
export const INITIAL_TASKS = [
  {id:'t1',text:'Сравнить текущий и предыдущий осмотры',patientId:'dm-0148',time:'09:30',done:false},
  {id:'t2',text:'Подготовить пробную пару',patientId:'dm-0307',time:'13:15',done:false},
  {id:'t3',text:'Проверить итог незавершённого приёма',patientId:'dm-0083',time:'Сегодня',done:false}
];
export const INITIAL_REQUESTS = [
  {id:'req1',name:'Полина Новикова',initials:'ПН',tone:'rose',subject:'Первичная консультация',channel:'Входящий звонок',when:'09:12',stage:'new',note:'Просит подобрать удобное время после 16:00.',owner:'А. Ким',next:'Уточнить время',time:'Сегодня'},
  {id:'req2',name:'Кирилл Петров',initials:'КП',tone:'blue',subject:'Запись на контроль',channel:'Обращение с сайта',when:'08:45',stage:'contact',note:'Предпочитает утро следующей недели.',owner:'А. Ким',next:'Согласовать слот',time:'Сегодня'},
  {id:'req3',name:'Анна Ким',initials:'АК',tone:'amber',subject:'Подтверждение визита',channel:'Телефон',when:'Вчера',stage:'booked',patientId:'dm-0194',note:'Запись на 14:30. Ожидается подтверждение.',owner:'А. Ким',next:'Подтвердить запись',time:'До 12:00'},
  {id:'req4',name:'Илья Орлов',initials:'ИО',tone:'cyan',subject:'Уточнить следующий визит',channel:'Локальная задача',when:'Вчера',stage:'contact',patientId:'dm-0265',note:'Есть операционная задача записать на контроль.',owner:'А. Ким',next:'Согласовать дату',time:'Сегодня'},
  {id:'req5',name:'Елена Миронова',initials:'ЕМ',tone:'mint',subject:'Запись подтверждена',channel:'Телефон',when:'08:20',stage:'done',patientId:'dm-0102',note:'Пациент подтвердила время 16:15.',owner:'А. Ким',next:'Запись подтверждена',time:'Выполнено'}
];
export const INITIAL_HANDOFFS = [
  {id:'h1',patientId:'dm-0307',order:'FL-0264',item:'Пробная пара',state:'received',due:'13:30',instruction:'Примерка и выдача в клинике',source:'План врача · демо-версия 1',approved:true,done:false},
  {id:'h2',patientId:'dm-0265',order:'FL-0261',item:'Повторный заказ',state:'received',due:'Сегодня',instruction:'Инструкция врача ещё не указана',source:'Нет утверждённого плана',approved:false,done:false},
  {id:'h3',patientId:'dm-0083',order:'FL-0258',item:'Контроль после выдачи',state:'followup',due:'Завтра',instruction:'Согласовать время контрольного визита',source:'Операционная задача · демо',approved:true,done:false}
];
const emptyEye = () => ({sph:'',cyl:'',axis:'',va:'',add:''});
export function emptyRecord(patientId, id, date=DEMO_DATE) {
  return {id,patientId,date,title:'Новый приём',status:'draft',visitType:'Контрольный осмотр',complaint:'',history:'',context:'',refraction:{OD:emptyEye(),OS:emptyEye(),OU:{va:''}},auto:{OD:emptyEye(),OS:emptyEye()},keratometry:{OD:{flat:'',steep:'',axis:'',hvid:''},OS:{flat:'',steep:'',axis:'',hvid:''}},exam:'',binocular:{distance:'',near:'',npc:'',note:''},lenses:{OD:{power:'',bc:'',dia:'',fit:''},OS:{power:'',bc:'',dia:'',fit:''},model:'',note:''},findings:'',decision:'',plan:'',followupDate:'',source:'Ручной ввод · демо',imported:false,expectations:{comfort:'Не оценено',vision:'Не оценено'}};
}
export function initialRecords(patient) {
  const current=emptyRecord(patient.id,`${patient.id}-current`);
  current.title=patient.kind;
  if(patient.id==='dm-0148') {
    Object.assign(current,{complaint:'К вечеру появляется небольшой дискомфорт. Хочу проверить новую пару линз.',history:'Работа за монитором 7–8 часов в день. Новая пара используется с сентября.',context:'Дневное ношение · линзы сняты за 2 часа до визита',exam:'Учебная запись врача: передний отрезок без описанных особенностей. Посадку и состояние поверхности нужно оценить отдельно.',findings:'Сопоставить комфорт, остроту зрения и посадку с предыдущим визитом.'});
    current.refraction.OD={sph:'−2.00',cyl:'−0.75',axis:'180',va:'1.0',add:''};
    current.refraction.OS={sph:'−2.50',cyl:'−0.50',axis:'90',va:'1.0',add:''};
    current.keratometry={OD:{flat:'42.25',steep:'43.00',axis:'180',hvid:'11.8'},OS:{flat:'42.50',steep:'43.25',axis:'90',hvid:'11.7'}};
    current.lenses={OD:{power:'−2.00',bc:'8.60',dia:'14.20',fit:''},OS:{power:'−2.50',bc:'8.60',dia:'14.20',fit:''},model:'Учебная пара A · версия 2',note:'Оценка ожиданий выполняется врачом.'};
    current.binocular.note='Не исследовано на текущем визите.';
  }
  const records=[current];
  if(patient.last) {
    const older=emptyRecord(patient.id,`${patient.id}-previous`,patient.last);
    Object.assign(older,{title:'Предыдущий контроль',status:'completed',complaint:'Обсудить используемую коррекцию.',findings:'Демонстрационная запись предыдущего визита.',decision:'Сохранить записанный план и проверить на следующем визите.',plan:'Контрольный осмотр по согласованной записи.'});
    if(patient.id==='dm-0148') {
      older.refraction.OD={sph:'−2.00',cyl:'−0.75',axis:'180',va:'0.9',add:''};
      older.refraction.OS={sph:'−2.50',cyl:'−0.50',axis:'90',va:'1.0',add:''};
      older.refraction.OU.va='1.0';
      older.lenses={OD:{power:'−2.00',bc:'8.60',dia:'14.20',fit:'Внесено врачом · демо'},OS:{power:'−2.50',bc:'8.60',dia:'14.20',fit:'Внесено врачом · демо'},model:'Учебная пара A · версия 2',note:'Проверить комфорт к вечеру.'};
      const first=structuredClone(older);
      Object.assign(first,{id:`${patient.id}-baseline`,date:'2026-05-12',title:'Первичный подбор',complaint:'Первичная оценка коррекции.',decision:'Учебное решение врача об исходной коррекции.'});
      first.refraction.OD.sph='−1.75';first.refraction.OS.sph='−2.25';
      first.lenses.model='Учебная пара A · версия 1';first.lenses.note='Исходная учебная пара.';records.push(older,first);
    } else records.push(older);
  }
  return records;
}
