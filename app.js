'use strict';
const KEY='casasegura60.v1',$=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=(n=0)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString('sv')};
const hm=t=>new Date(t).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
const dmy=t=>new Date(t).toLocaleDateString('es-CL',{day:'2-digit',month:'short'});
const nowHM=()=>new Date().toTimeString().slice(0,5),uid=()=>Math.random().toString(36).slice(2,9);
const isToday=t=>t&&new Date(t).toLocaleDateString('sv')===day();
const FEATS={checkin:['Estoy bien','La familia ve cuándo confirmas que estás bien.'],reminders:['Recordatorios','La familia ve si cumpliste tus recordatorios.'],house:['Mi Casa','La familia ve el estado de la puerta y el detector de humo.']};
const ICO={medicamento:'💊',cita:'📅',llamada:'📞',otro:'⏰'},FI={checkin:'🟢',reminders:'⏰',house:'🏠',sos:'🆘'};
const ST={done:'Realizado',doing:'En curso',todo:'Pendiente'};

/* ---------- Estado único ---------- */
const defaults=()=>({onboarded:false,role:'senior',tab:'home',viewer:null,
 profile:{name:'',age:'',comuna:'',type:'Casa'},contacts:[],
 privacy:{checkin:{on:true,who:[]},reminders:{on:true,who:[]},house:{on:true,who:[]}},
 checkin:{last:null,daily:true,time:'20:00',missedDay:null},reminders:[],alerts:[],events:[],
 house:{door:'closed',smoke:'ok',report:{date:day(-12),by:'Equipo Casa Segura 60',level:'Nivel 3 · Adaptación parcial',items:[
  {id:'a1',area:'Baño',work:'Barras de apoyo en ducha e inodoro',st:'done'},
  {id:'a2',area:'Pasillo',work:'Iluminación automática nocturna',st:'done'},
  {id:'a3',area:'Baño',work:'Piso antideslizante en ducha',st:'doing'},
  {id:'a4',area:'Acceso',work:'Corregir desnivel en la entrada',st:'todo'}]},
  maint:[{id:'m1',title:'Revisión del detector de humo',due:day(20),done:false},{id:'m2',title:'Revisión de barras de apoyo',due:day(75),done:false}]},
 settings:{theme:'auto',scale:1,contrast:false}});
let S;try{S={...defaults(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{S=defaults()}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};
const log=(feat,text,level='info')=>{S.events.unshift({id:uid(),t:Date.now(),feat,text,level});S.events=S.events.slice(0,100)};
const can=f=>S.role==='senior'||f==='sos'||!!(S.privacy[f]?.on&&S.privacy[f].who.includes(S.viewer));
const addAlert=(type,text,feat)=>{S.alerts.unshift({id:uid(),type,text,feat,t:Date.now(),st:'active',muted:false});log(feat,text,'alert')};
const liveAlerts=()=>S.alerts.filter(a=>a.st==='active'&&!a.muted&&can(a.feat));

/* ---------- Avisos y modales propios ---------- */
const toast=m=>{const e=document.createElement('div');e.className='toast';e.textContent=m;$('#toasts').append(e);setTimeout(()=>e.remove(),3500)};
const dlg=$('#dlg');
function modal(html,fn){return new Promise(r=>{dlg.innerHTML=html;dlg.returnValue='';let out=null;
 dlg.onclose=()=>r(dlg.returnValue==='ok'?out:null);
 dlg.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{out=true;dlg.close(b.dataset.d)});
 const f=dlg.querySelector('form');if(f)f.onsubmit=e=>{e.preventDefault();out=Object.fromEntries(new FormData(f));dlg.close('ok')};
 dlg.showModal()})}
const ask=(t,p,ok='Aceptar')=>modal(`<h2>${esc(t)}</h2><p>${esc(p)}</p><div class="row"><button class="btn" data-d="ok">${esc(ok)}</button><button class="btn ghost" data-d="no">Cancelar</button></div>`);
const formDlg=(t,fields)=>modal(`<h2>${esc(t)}</h2><form>${fields.map(f=>`<label>${esc(f.l)}${f.o?`<select name="${f.n}">${f.o.map(o=>`<option>${esc(o)}</option>`).join('')}</select>`:`<input name="${f.n}" type="${f.t||'text'}" ${f.r?'required':''} ${f.p?`placeholder="${esc(f.p)}"`:''}>`}</label>`).join('')}<div class="row"><button class="btn">Guardar</button><button type="button" class="btn ghost" data-d="no">Cancelar</button></div></form>`);

/* ---------- Vistas ---------- */
const lock=()=>`<div class="card"><p>🔒 La persona mayor pausó esta información.</p></div>`;
const banner=()=>liveAlerts().map(a=>`<section class="card alert" role="alert"><strong>⚠️ ${esc(a.text)}</strong><small>${dmy(a.t)} ${hm(a.t)}</small><div class="row"><button class="btn ok sm" data-act="resolve" data-id="${a.id}">Resolver</button><button class="btn ghost sm" data-act="mute" data-id="${a.id}">Silenciar</button></div></section>`).join('');
const isDone=r=>r.doneDate===day();
const call=c=>`<a class="btn" href="tel:${esc(c.phone.replace(/[^\d+]/g,''))}" aria-label="Llamar a ${esc(c.name)}">📞 ${esc(c.name)}<small>${esc(c.rel)}</small></a>`;

function homeS(){const c=S.checkin,nx=[...S.reminders].filter(r=>!isDone(r)).sort((a,b)=>a.time.localeCompare(b.time))[0];
 return banner()+`<button class="sos" data-act="sos" aria-label="Necesito ayuda. Avisar a mi familia"><span>🔴 NECESITO AYUDA</span><small>Tendrás 5 segundos para cancelar</small></button>
 <button class="btn ok big" data-act="checkin" aria-label="Estoy bien. Avisar a mi familia"><span>🟢 ESTOY BIEN</span><small>${isToday(c.last)?'Hoy a las '+hm(c.last):'Aún no lo confirmas hoy'}</small></button>
 ${nx?`<div class="card"><small>Siguiente recordatorio</small><h3>${ICO[nx.type]||'⏰'} ${esc(nx.title)} · ${esc(nx.time)}</h3></div>`:''}
 <h2>Mi familia</h2><div class="grid">${S.contacts.map(call).join('')||'<p class="muted">Agrega personas en Privacidad.</p>'}</div>`}

function homeF(){const c=S.checkin,v=S.contacts.find(x=>x.id===S.viewer);
 const ev=S.events.filter(e=>can(e.feat)).slice(0,25);
 return `<label>Viendo como<select data-viewer aria-label="Persona que ve la información">${S.contacts.map(x=>`<option value="${x.id}" ${x.id===S.viewer?'selected':''}>${esc(x.name)} (${esc(x.rel)})</option>`).join('')}</select></label>
 <section class="card"><h2>${esc(S.profile.name)}</h2><p class="muted">${esc(S.profile.comuna)}</p>
 <p>${can('checkin')?(c.last?`🟢 Última confirmación: ${isToday(c.last)?'hoy':dmy(c.last)} a las ${hm(c.last)}`:'Aún sin confirmaciones'):'🔒 Dato pausado por la persona mayor'}</p></section>
 ${banner()}<h2>Historial</h2><section class="card"><ul class="ev">${ev.map(e=>`<li><time>${isToday(e.t)?'':dmy(e.t)+' '}${hm(e.t)}</time><span class="${e.level==='alert'?'alert':''}">${FI[e.feat]||''} ${esc(e.text)}</span></li>`).join('')||'<li class="muted">Sin eventos todavía.</li>'}</ul></section>`}

function rem(){if(!can('reminders'))return lock();
 const L=[...S.reminders].sort((a,b)=>a.time.localeCompare(b.time));
 return `<div class="between"><h2>Recordatorios</h2><button class="btn sm" data-act="addRem">+ Nuevo</button></div>`+
 (L.map(r=>{const d=isDone(r),late=!d&&r.time<nowHM();return `<article class="card item ${d?'done':''}"><span class="ico" aria-hidden="true">${ICO[r.type]||'⏰'}</span><div class="grow"><h3>${esc(r.title)}</h3><p class="muted">${esc(r.time)} <span class="tag ${d?'ok':late?'bad':'wait'}">${d?'Completado '+hm(r.doneAt):late?'Atrasado':'Pendiente'}</span></p></div><div class="col"><button class="btn sm ${d?'ghost':'ok'}" data-act="doneRem" data-id="${r.id}" aria-label="${d?'Deshacer':'Marcar como hecho'}: ${esc(r.title)}">${d?'Deshacer':'✓ Hecho'}</button><button class="btn sm ghost" data-act="delRem" data-id="${r.id}" aria-label="Eliminar ${esc(r.title)}">🗑</button></div></article>`}).join('')||'<p class="muted">Aún no hay recordatorios. Toca “+ Nuevo”.</p>')}

function house(){if(!can('house'))return lock();const h=S.house,r=h.report,n=r.items.filter(i=>i.st==='done').length,pc=Math.round(n/r.items.length*100);
 return `<h2>Mi Casa</h2><p class="muted">Datos de ejemplo para la demostración.</p>
 <section class="card"><h3>Informe de evaluación</h3><p class="muted">${esc(r.level)} · ${dmy(r.date)} · ${esc(r.by)}</p><div class="bar" role="progressbar" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100" aria-label="Adaptaciones realizadas"><i style="width:${pc}%"></i></div><p>${n} de ${r.items.length} adaptaciones realizadas</p>
 <ul class="ev">${r.items.map(i=>`<li><span class="grow"><strong>${esc(i.area)}</strong><br>${esc(i.work)}</span><span class="tag ${i.st==='done'?'ok':i.st==='doing'?'wait':'bad'}">${ST[i.st]}</span></li>`).join('')}</ul></section>
 <section class="card"><h3>Próximas mantenciones</h3><ul class="ev">${h.maint.map(m=>{const d=Math.round((new Date(m.due)-new Date(day()))/864e5);return `<li><span class="grow">${esc(m.title)}<br><small>${m.done?'Realizada':d<0?'Atrasada '+(-d)+' días':'En '+d+' días'}</small></span>${m.done?'<span class="tag ok">Lista</span>':`<button class="btn sm ghost" data-act="doneMaint" data-id="${m.id}" aria-label="Marcar realizada: ${esc(m.title)}">Realizada</button>`}</li>`}).join('')}</ul><button class="btn ghost" data-act="reqMaint">Solicitar visita a Casa Segura 60</button></section>
 <section class="card"><h3>Sensores</h3><p>🚪 Puerta: <strong>${h.door==='open'?'abierta':'cerrada'}</strong> · 🔥 Humo: <strong>${h.smoke==='ok'?'normal':'ALERTA'}</strong></p><div class="row"><button class="btn sm ghost" data-act="simDoor">Demo: puerta</button><button class="btn sm ghost" data-act="simSmoke">Demo: humo</button></div></section>`}

function priv(){const all=Object.values(S.privacy).every(p=>p.on);
 return `<h2>Privacidad</h2><p class="muted">Tú decides qué comparte tu casa y con quién. Puedes pausar cada función cuando quieras.</p>
 <button class="btn ghost" data-act="pauseAll">${all?'⏸ Pausar todo':'▶ Reactivar todo'}</button>`+
 Object.entries(FEATS).map(([k,[t,d]])=>{const p=S.privacy[k];return `<section class="card"><div class="between"><div><h3>${t}</h3><p class="muted">${d}</p></div><button class="switch" role="switch" aria-checked="${p.on}" aria-label="${t}: ${p.on?'activo':'pausado'}" data-act="toggleFeat" data-id="${k}">${p.on?'Activo':'Pausado'}</button></div><strong>Pueden verlo:</strong>${S.contacts.map(c=>`<label class="chk"><input type="checkbox" data-who="${k}" value="${c.id}" ${p.who.includes(c.id)?'checked':''}> ${esc(c.name)} <small>(${esc(c.rel)})</small></label>`).join('')||'<p class="muted">Aún no hay personas.</p>'}</section>`}).join('')+
 `<section class="card"><h3>🆘 Necesito ayuda</h3><p class="muted">Siempre avisa a todas tus personas de confianza. No se puede pausar.</p></section>
 <div class="between"><h2>Mi familia</h2><button class="btn sm" data-act="addContact">+ Agregar</button></div>`+
 S.contacts.map(c=>`<article class="card item"><div class="grow"><h3>${esc(c.name)}</h3><p class="muted">${esc(c.rel)} · ${esc(c.phone)}</p></div><button class="btn sm ghost" data-act="delContact" data-id="${c.id}" aria-label="Quitar a ${esc(c.name)}">🗑</button></article>`).join('')}

function set(){const s=S.settings,c=S.checkin,b=(a,id,t,on)=>`<button class="btn sm ${on?'':'ghost'}" data-act="${a}" data-id="${id}" aria-pressed="${on}">${t}</button>`;
 return `<h2>Ajustes</h2>
 <section class="card"><h3>Tema</h3><div class="row">${b('theme','auto','Automático',s.theme==='auto')}${b('theme','light','Claro',s.theme==='light')}${b('theme','dark','Oscuro',s.theme==='dark')}</div></section>
 <section class="card"><h3>Tamaño de letra</h3><div class="row">${b('scale',1,'Normal',s.scale===1)}${b('scale',1.15,'Grande',s.scale===1.15)}${b('scale',1.3,'Muy grande',s.scale===1.3)}</div></section>
 <section class="card"><div class="between"><h3>Alto contraste</h3><button class="switch" role="switch" aria-checked="${s.contrast}" aria-label="Alto contraste" data-act="contrast">${s.contrast?'Sí':'No'}</button></div></section>
 <section class="card"><div class="between"><div><h3>Aviso si no confirmo</h3><p class="muted">Si no tocas “Estoy bien” antes de la hora, se avisa a la familia.</p></div><button class="switch" role="switch" aria-checked="${c.daily}" aria-label="Aviso diario" data-act="daily">${c.daily?'Sí':'No'}</button></div><label>Hora límite<input type="time" data-ctime value="${esc(c.time)}"></label></section>
 ${deferred?'<button class="btn" data-act="install">📲 Instalar en este teléfono</button>':''}
 <button class="btn ghost" data-act="reset">Borrar todos los datos</button>`}

function onboard(){return `<main><h1>🏠 Casa Segura 60</h1><p>Vamos a configurar tu hogar. Toma menos de un minuto.</p>
 <form data-form="onboard" class="card"><label>Tu nombre<input name="name" required autocomplete="name"></label><label>Edad (opcional)<input name="age" type="number" min="40" max="120"></label><label>Comuna<input name="comuna" required></label>
 <label>Tipo de vivienda<select name="type"><option>Casa</option><option>Departamento</option></select></label>
 <h2>Persona de confianza</h2><label>Nombre<input name="cname" required></label><label>Relación<select name="rel"><option>Hijo/a</option><option>Vecino/a</option><option>Cuidador/a</option><option>Médico/a</option><option>Otro</option></select></label><label>Teléfono<input name="phone" type="tel" required placeholder="+56 9 1234 5678" pattern="[+0-9 ()-]{8,}"></label>
 <label class="chk"><input type="checkbox" name="daily" checked> Avisar si no confirmo “Estoy bien” antes de las 20:00</label>
 <label class="chk"><input type="checkbox" name="consent" required> Entiendo que yo decido qué ve mi familia y puedo pausarlo en Privacidad.</label>
 <button class="btn big">Comenzar</button></form></main>`}

/* ---------- Render ---------- */
const TS=[['home','🏠','Inicio'],['rem','⏰','Recordar'],['house','🛠️','Mi Casa'],['priv','🔒','Privacidad'],['set','⚙️','Ajustes']],TF=[['home','📊','Estado'],['rem','⏰','Recordar'],['house','🛠️','Mi Casa'],['set','⚙️','Ajustes']];
function applySettings(){const s=S.settings,h=document.documentElement,d=s.theme==='dark'||(s.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);h.dataset.theme=d?'dark':'light';h.dataset.contrast=s.contrast?'high':'';h.style.setProperty('--scale',s.scale)}
function render(){const a=$('#app');applySettings();if(!S.onboarded){a.innerHTML=onboard();return}
 const T=S.role==='senior'?TS:TF;if(!T.some(t=>t[0]===S.tab))S.tab='home';
 const V={home:S.role==='senior'?homeS:homeF,rem,house,priv,set};
 a.innerHTML=`<header><strong>🏠 Casa Segura 60</strong><div class="seg" role="group" aria-label="Modo de uso"><button data-act="role" data-id="senior" aria-pressed="${S.role==='senior'}">Yo</button><button data-act="role" data-id="family" aria-pressed="${S.role==='family'}">Familia</button></div></header><main>${V[S.tab]()}</main><nav aria-label="Secciones">${T.map(t=>`<button data-act="tab" data-id="${t[0]}" ${S.tab===t[0]?'aria-current="page"':''}><span aria-hidden="true">${t[1]}</span>${t[2]}</button>`).join('')}</nav>`}

/* ---------- SOS ---------- */
let sosT;const ov=$('#ov');
function startSos(){let n=5;ov.hidden=false;const paint=()=>ov.innerHTML=`<div class="ovbox"><h2>Pediremos ayuda en</h2><div class="count" aria-live="assertive">${n}</div><p>Se avisará a tu familia.</p><button class="btn big" data-ov="cancel">CANCELAR</button></div>`;paint();
 sosT=setInterval(()=>{if(--n<=0){clearInterval(sosT);sendSos()}else paint()},1000)}
function sendSos(){addAlert('sos','🆘 Pidió ayuda','sos');save();render();
 ov.innerHTML=`<div class="ovbox"><h2>✅ Aviso enviado a las ${hm(Date.now())}</h2>${S.contacts.length?`<p>Avisamos a: ${S.contacts.map(c=>esc(c.name)).join(', ')}.</p><div class="grid">${S.contacts.map(call).join('')}</div>`:'<p>Aún no tienes personas de confianza.</p>'}<a class="btn" href="tel:131">📞 Llamar al 131 (ambulancia)</a><button class="btn ok" data-ov="safe">Ya estoy bien, cancelar aviso</button><button class="btn ghost" data-ov="close">Cerrar</button></div>`}
ov.addEventListener('click',e=>{const k=e.target.closest('[data-ov]')?.dataset.ov;if(!k)return;
 if(k==='cancel'){clearInterval(sosT);ov.hidden=true;toast('Cancelado. No se envió ningún aviso.')}
 if(k==='safe'){const a=S.alerts.find(x=>x.type==='sos'&&x.st==='active');if(a)A.resolve(a.id);ov.hidden=true;toast('Aviso cancelado. Qué bueno que estás bien.')}
 if(k==='close')ov.hidden=true;save();render()});

/* ---------- Acciones ---------- */
let deferred=null;
const A={
 role(id){S.role=id;S.tab='home';if(id==='family'&&!S.contacts.some(c=>c.id===S.viewer))S.viewer=S.contacts[0]?.id},
 tab(id){S.tab=id},
 checkin(){S.checkin.last=Date.now();log('checkin','Confirmó que está bien');toast('✅ Listo. Tu familia sabrá que estás bien.')},
 resolve(id){const a=S.alerts.find(x=>x.id===id);if(!a)return;a.st='resolved';if(a.type==='smoke')S.house.smoke='ok';log(a.feat,'Alerta resuelta: '+a.text);toast('Alerta resuelta')},
 mute(id){const a=S.alerts.find(x=>x.id===id);if(a){a.muted=true;toast('Silenciada. Queda en el historial.')}},
 sos(){startSos();return 'skip'},
 doneRem(id){const r=S.reminders.find(x=>x.id===id);if(isDone(r)){r.doneDate=null;r.doneAt=null}else{r.doneDate=day();r.doneAt=Date.now();log('reminders','Cumplió: '+r.title);toast('✓ Listo')}},
 async delRem(id){if(await ask('¿Eliminar recordatorio?','Se borrará de la lista.','Eliminar')){S.reminders=S.reminders.filter(x=>x.id!==id);toast('Eliminado')}},
 async addRem(){const f=await formDlg('Nuevo recordatorio',[{n:'type',l:'Tipo',o:['medicamento','cita','llamada','otro']},{n:'title',l:'¿Qué debes recordar?',r:1},{n:'time',l:'Hora',t:'time',r:1}]);if(f){S.reminders.push({id:uid(),...f});toast('Recordatorio guardado')}},
 toggleFeat(id){const p=S.privacy[id];p.on=!p.on;log(id,(p.on?'Reactivó':'Pausó')+' compartir: '+FEATS[id][0]);toast(p.on?'Función activa':'Función pausada. La familia ya no la ve.')},
 pauseAll(){const on=!Object.values(S.privacy).every(p=>p.on);Object.values(S.privacy).forEach(p=>p.on=on);toast(on?'Todo reactivado':'Todo pausado')},
 async addContact(){const f=await formDlg('Nueva persona de confianza',[{n:'name',l:'Nombre',r:1},{n:'rel',l:'Relación',o:['Hijo/a','Vecino/a','Cuidador/a','Médico/a','Otro']},{n:'phone',l:'Teléfono',t:'tel',r:1}]);if(f){S.contacts.push({id:uid(),...f});toast('Agregado. Elige qué puede ver.')}},
 async delContact(id){if(await ask('¿Quitar a esta persona?','Dejará de recibir avisos y de ver información.','Quitar')){S.contacts=S.contacts.filter(c=>c.id!==id);Object.values(S.privacy).forEach(p=>p.who=p.who.filter(x=>x!==id));toast('Persona quitada')}},
 doneMaint(id){S.house.maint.find(m=>m.id===id).done=true;log('house','Mantención realizada');toast('Mantención registrada')},
 reqMaint(){log('house','Solicitó visita a Casa Segura 60');toast('Solicitud enviada (demo)')},
 simDoor(){S.house.door=S.house.door==='open'?'closed':'open';log('house',S.house.door==='open'?'Puerta abierta':'Puerta cerrada')},
 simSmoke(){S.house.smoke='alert';addAlert('smoke','🔥 Detector de humo activado','house')},
 theme(id){S.settings.theme=id},scale(id){S.settings.scale=parseFloat(id)},contrast(){S.settings.contrast=!S.settings.contrast},
 daily(){S.checkin.daily=!S.checkin.daily},
 async install(){if(deferred){deferred.prompt();deferred=null}},
 async reset(){if(await ask('¿Borrar todo?','Se eliminarán tus datos de este teléfono.','Borrar')){S=defaults();toast('Datos borrados')}}
};
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const r=await A[b.dataset.act]?.(b.dataset.id);if(r!=='skip'){save();render()}});
document.addEventListener('change',e=>{const t=e.target;
 if(t.dataset.who){const w=S.privacy[t.dataset.who].who,i=w.indexOf(t.value);if(t.checked&&i<0)w.push(t.value);if(!t.checked&&i>=0)w.splice(i,1);toast('Permisos actualizados')}
 else if(t.dataset.viewer!==undefined)S.viewer=t.value;
 else if(t.dataset.ctime!==undefined){S.checkin.time=t.value;toast('Hora guardada')}else return;
 save();if(t.dataset.viewer!==undefined)render()});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form=onboard]');if(!f)return;e.preventDefault();const d=Object.fromEntries(new FormData(f)),id=uid();
 S.profile={name:d.name.trim(),age:d.age,comuna:d.comuna.trim(),type:d.type};
 S.contacts=[{id,name:d.cname.trim(),rel:d.rel,phone:d.phone.trim()}];S.viewer=id;
 Object.values(S.privacy).forEach(p=>{p.on=true;p.who=[id]});S.checkin.daily=!!d.daily;S.checkin.time='20:00';
 S.reminders=[{id:uid(),type:'medicamento',title:'Tomar mi medicamento',time:'12:00'},{id:uid(),type:'llamada',title:'Llamar a mi familia',time:'19:00'}];
 S.onboarded=true;log('checkin','Casa Segura 60 configurada');save();render();toast('¡Listo! Tu hogar está configurado.')});

/* ---------- Aviso diario, PWA ---------- */
function checkMissed(){const c=S.checkin;if(S.onboarded&&c.daily&&nowHM()>=c.time&&!isToday(c.last)&&c.missedDay!==day()){c.missedDay=day();addAlert('missed','Hoy no ha confirmado “Estoy bien”','checkin');save();render()}}
setInterval(checkMissed,30000);
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;if(S.onboarded)render()});
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applySettings);
render();checkMissed();
