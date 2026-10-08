export const initialsText=name=>String(name??'').split(/\s+/).filter(Boolean).slice(0,2).map(part=>[...part].find(c=>/\p{L}/u.test(c))??'').join('').toUpperCase();
export function ageText(age){const last=age%10,tail=age%100;return `${age} ${tail>=11&&tail<=14?'лет':last===1?'год':last>=2&&last<=4?'года':'лет'}`;}
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 3h2"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m3 10v-2a5 5 0 0 0-3-4"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  external:'<path d="M14 3h7v7m0-7L11 13M10 4H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-4"/>',
  left:'<path d="m15 5-7 7 7 7"/>',right:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m5 9 7 7 7-7"/>',up:'<path d="m5 15 7-7 7 7"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  'check-circle':'<circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  lens:'<ellipse cx="12" cy="12" rx="7" ry="9"/><path d="M12 3c-6 6-6 12 0 18m0-18c6 6 6 12 0 18M5 12h14"/>',
  scan:'<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3M5 12h14"/>',
  focus:'<circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/><path d="M12 4v2m0 12v2"/>',
  chat:'<path d="M21 11a8 8 0 0 1-8 8H8l-5 3v-6a8 8 0 0 1-1-5 8 8 0 0 1 8-8h3a8 8 0 0 1 8 8Z"/><path d="M7 9h9m-9 4h6"/>',
  document:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8m-8 4h5"/>',
  pin:'<path d="M8 3h8l-1 7 4 4H5l4-4Z M12 14v7"/>',
  saved:'<path d="M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 3v6h9V3M7 21v-7h10v7"/>',
  moon:'<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  compare:'<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="16" rx="2"/>',
  'sliders':'<path d="M5 3v5m0 4v9m7-18v9m0 4v5m7-18v2m0 4v12"/><path d="M2 8h6m1 8h6m1-11h6"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  list:'<path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1"/>',
  book:'<path d="M12 5v16M3 3c3 0 6 0 9 2 3-2 6-2 9-2v16c-3 0-6 0-9 2-3-2-6-2-9-2Z"/>',
  box:'<path d="m12 2 9 5v10l-9 5-9-5V7Z m-9 5 9 5 9-5M12 12v10m-5-17 9 5"/>',
  money:'<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M5 9h1m12 6h1"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  settings:'<path d="m10 3-1 3-3 1-3 3 2 3v4l4 1 3 3 3-2h4l1-4 3-3-2-3V5l-4-1-3-2Z"/><circle cx="12" cy="12" r="3"/>',
  sparkle:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z M20 2v4m-2-2h4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  history:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l4 2"/>',
  undo:'<path d="m8 3-5 5 5 5M3 8h10a7 7 0 0 1 0 14"/>',
  play:'<path d="m8 4 12 8-12 8Z"/>',
  link:'<path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m-1 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
  shield:'<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z"/><path d="m8 12 3 3 5-5"/>',
  print:'<path d="M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6Z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'
};
export function icon(name,size=18){return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??paths.info}</svg>`;}
export function avatar(p,size=''){return `<span class="avatar ${size}" data-tone="${esc(p.tone)}" aria-hidden="true">${esc(p.initials)}</span>`;}
export function badge(text,tone='neutral',dot=false){return `<span class="badge" data-tone="${tone}">${dot?'<i></i>':''}${esc(text)}</span>`;}
export function button(label,action,iconName='',className='',extra=''){return `<button type="button" class="btn ${className}" data-action="${esc(action)}" ${extra}>${iconName?icon(iconName):''}${label}</button>`;}
export const fmtDate=(date,long=false)=>date?new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU',long?{day:'numeric',month:'long',year:'numeric'}:{day:'2-digit',month:'2-digit',year:'numeric'}):'Дата не указана';
export const statusTone=s=>({'В кабинете':'mint','Ожидает':'amber','Подтверждён':'blue','Не подтверждён':'amber','Приём завершён':'mint','Отменён':'rose'}[s]??'neutral');
export const empty=(title,text,iconName='search')=>`<div class="empty">${icon(iconName,30)}<h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
export function field(label,path,value,type='text',extra=''){
  return `<label class="field"><span>${esc(label)}</span><input type="${type}" data-field="${path}" value="${esc(value)}" ${extra}/></label>`;
}
export function textField(label,path,value,placeholder='',rows=3,extra=''){return `<label class="field"><span>${esc(label)}</span><textarea data-field="${path}" rows="${rows}" placeholder="${esc(placeholder)}" ${extra}>${esc(value)}</textarea></label>`;}
export function matrix(record,group='refraction',editable=false,fields=[['sph','Sph','D'],['cyl','Cyl','D'],['axis','Axis','°'],['va','Vis','']]){
  return `<div class="matrix-scroll"><table class="eye-matrix"><caption class="sr-only">${group==='refraction'?'Рефракция':group==='keratometry'?'Кератометрия':group==='lenses'?'Параметры линз':'Авторефракция'} по глазам</caption><thead><tr><th scope="col">Глаз</th>${fields.map(([,title,unit])=>`<th scope="col">${title}<small>${esc(unit)}</small></th>`).join('')}</tr></thead><tbody>${['OD','OS'].map(eye=>`<tr><th scope="row"><span class="eye-label ${eye.toLowerCase()}">${eye}</span></th>${fields.map(([key])=>{const value=record[group][eye][key];return `<td>${editable?`<input aria-label="${eye} · ${{refraction:'Рефракция',auto:'Авторефракция',keratometry:'Кератометрия',lenses:'Линзы'}[group]} · ${{sph:'Sph',cyl:'Cyl',axis:'Axis',va:'Vis',flat:'K flat',steep:'K steep',hvid:'HVID',power:'Pwr',bc:'BC',dia:'DIA'}[key]}" data-field="${group}.${eye}.${key}" value="${esc(value)}" inputmode="decimal" placeholder="—" autocomplete="off"/>`:`<span class="number ${value===''?'unknown':''}">${esc(value===''?'—':value)}</span>`}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
}
export function orbit(id='hero',small=false){
  const rings=Array.from({length:33},(_,i)=>{const rx=66+i*2.7,ry=83+i*1.72;return `<ellipse cx="180" cy="164" rx="${rx}" ry="${ry}" transform="rotate(${i*1.8-28} 180 164)"/>`;}).join('');
  return `<svg class="orbit ${small?'orbit-small':''}" viewBox="0 0 360 330" fill="none" aria-hidden="true"><defs><linearGradient id="orbit-${id}" x1="45" y1="55" x2="320" y2="275" gradientUnits="userSpaceOnUse"><stop stop-color="#48a799"/><stop offset=".55" stop-color="#6faaa9"/><stop offset="1" stop-color="#b2d7be"/></linearGradient></defs><g class="orbit-rings" stroke="url(#orbit-${id})" stroke-width=".75">${rings}</g><circle cx="180" cy="164" r="26" stroke="currentColor" stroke-width=".5" opacity=".15"/><path d="M180 40v19m0 210v19M51 164h19m221 0h19" stroke="currentColor" opacity=".2"/><circle class="orbit-dot" cx="260" cy="70" r="3.5" fill="#60aa95"/></svg>`;
}
export function topo(id='topo',mini=false){
  const lines=Array.from({length:10},(_,i)=>`<ellipse cx="120" cy="106" rx="${83-i*6.2}" ry="${80-i*6.5}" fill="none" stroke="#edf7f8" stroke-width=".55" opacity=".55" transform="rotate(-18 120 106)"/>`).join('');
  return `<svg class="topo ${mini?'mini':''}" viewBox="0 0 240 212" role="img" aria-label="Учебная схема топографии, не измерение"><defs><radialGradient id="heat-${id}" cx=".42" cy=".4"><stop offset="0" stop-color="#e69160"/><stop offset=".2" stop-color="#e8bd70"/><stop offset=".39" stop-color="#ced382"/><stop offset=".58" stop-color="#89c3a5"/><stop offset=".79" stop-color="#73b8cd"/><stop offset="1" stop-color="#5d8fba"/></radialGradient></defs><circle cx="120" cy="106" r="87" fill="url(#heat-${id})"/>${lines}<path d="M24 106h192M120 10v192" stroke="#fff" stroke-width=".7" stroke-dasharray="3 4" opacity=".65"/><circle cx="120" cy="106" r="3" stroke="#fff" fill="none"/></svg>`;
}
export function oct(){return `<svg class="oct" viewBox="0 0 340 170" role="img" aria-label="Учебная схема ОКТ, не результат исследования"><defs><linearGradient id="oct-grad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c5c8e5"/><stop offset="1" stop-color="#606b87"/></linearGradient></defs><rect width="340" height="170" rx="8" fill="#152a39"/>${Array.from({length:14},(_,i)=>`<path d="M10 ${108+i*2.4} Q170 ${17+i*5.7} 330 ${108+i*2.4}" stroke="${i%2?'#d3d5d7':'#8295ae'}" opacity="${.2+i*.045}" fill="none" stroke-width="${i%3===0?1.8:.8}"/>`).join('')}<path d="M170 12v142" stroke="#77cbbe" opacity=".5" stroke-dasharray="3 4"/></svg>`;}
