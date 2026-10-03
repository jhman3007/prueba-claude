import http from 'http';import fs from 'fs';import path from 'path';import crypto from 'crypto';
import {WebSocketServer} from 'ws';import webpush from 'web-push';import mqtt from 'mqtt';
const PORT=+process.env.PORT||8080,DATA=process.env.DATA_DIR||'./data',WEB=path.resolve(process.env.WEB_DIR||'../app'),MQ=process.env.MQTT_URL;
fs.mkdirSync(DATA,{recursive:true});
const F=path.join(DATA,'state.json'),TF=path.join(DATA,'token.txt');
if(!fs.existsSync(TF))fs.writeFileSync(TF,crypto.randomBytes(9).toString('base64url'));
const TOKEN=fs.readFileSync(TF,'utf8').trim();
console.log('\n>>> CÓDIGO DE VINCULACIÓN:',TOKEN,'\n');
let st=fs.existsSync(F)?JSON.parse(fs.readFileSync(F,'utf8')):{rev:0,data:null};
const VF=path.join(DATA,'vapid.json'),SF=path.join(DATA,'subs.json');
if(!fs.existsSync(VF))fs.writeFileSync(VF,JSON.stringify(webpush.generateVAPIDKeys()));
const V=JSON.parse(fs.readFileSync(VF,'utf8'));webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:admin@example.com',V.publicKey,V.privateKey);
let subs=fs.existsSync(SF)?JSON.parse(fs.readFileSync(SF,'utf8')):[];const saveSubs=()=>fs.writeFileSync(SF,JSON.stringify(subs));
const seen=new Set((st.data?.alerts||[]).map(a=>a.id));
function notify(){if(!st.data)return;for(const a of st.data.alerts||[]){if(seen.has(a.id))continue;seen.add(a.id);if(a.st!=='active')continue;
 const body=JSON.stringify({title:a.feat==='sos'?'🆘 Emergencia':'⚠️ Alerta',body:a.text,tag:a.id,urgent:a.feat==='sos'});
 for(const s of subs){const p=st.data.privacy?.[a.feat];if(s.viewer&&a.feat!=='sos'&&!(p?.on&&p.who.includes(s.viewer)))continue;
  webpush.sendNotification(s.sub,body,{urgency:'high',TTL:3600}).catch(e=>{if(e.statusCode===404||e.statusCode===410){subs=subs.filter(x=>x!==s);saveSubs()}})}}}
const auth=t=>{const a=Buffer.from(t||''),b=Buffer.from(TOKEN);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const rid=()=>crypto.randomBytes(4).toString('hex'),json=(r,o,c=200)=>{r.writeHead(c,{'content-type':'application/json'});r.end(JSON.stringify(o))};
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');
 if(u.pathname==='/api/state'){if(!auth(q.headers['x-token'])){r.writeHead(401);return r.end()}
  if(q.method==='GET')return json(r,st);
  if(q.method==='PUT'){let b='';q.on('data',c=>{b+=c;if(b.length>2e6)q.destroy()});q.on('end',()=>{try{const x=JSON.parse(b);
   if(st.data&&x.rev!==st.rev)return json(r,st,409);st={rev:st.rev+1,data:x.data};commit();json(r,st)}catch{r.writeHead(400);r.end()}});return}}
 if(u.pathname==='/api/vapid'){if(!auth(q.headers['x-token'])){r.writeHead(401);return r.end()}return json(r,{key:V.publicKey})}
 if(u.pathname==='/api/push'&&q.method==='POST'){if(!auth(q.headers['x-token'])){r.writeHead(401);return r.end()}let b='';q.on('data',c=>{b+=c;if(b.length>1e5)q.destroy()});
  q.on('end',()=>{try{const x=JSON.parse(b);if(!x.sub?.endpoint)throw 0;subs=subs.filter(s=>s.sub.endpoint!==x.sub.endpoint);subs.push({sub:x.sub,viewer:x.viewer||null});saveSubs();json(r,{ok:1})}catch{r.writeHead(400);r.end()}});return}
 let p=decodeURIComponent(u.pathname);if(p==='/')p='/index.html';const f=path.join(WEB,path.normalize(p));
 if(!f.startsWith(WEB)){r.writeHead(403);return r.end()}
 fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});r.end(d)})});
const wss=new WebSocketServer({noServer:true});
srv.on('upgrade',(q,s,h)=>{const u=new URL(q.url,'http://x');if(u.pathname!=='/ws'||!auth(u.searchParams.get('token')))return s.destroy();wss.handleUpgrade(q,s,h,w=>wss.emit('connection',w))});
function commit(){notify();fs.writeFileSync(F+'.tmp',JSON.stringify(st));fs.renameSync(F+'.tmp',F);const m=JSON.stringify({type:'state',...st});wss.clients.forEach(c=>c.readyState===1&&c.send(m))}
/* Puente Zigbee2MQTT: un dispositivo se enlaza por su campo "mqtt" (friendly_name) */
const T=()=>new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
function apply(d,p){const D=st.data,now=Date.now(),
 ev=(x,i)=>{d.info=i;d.bad=false;D.events.unshift({id:rid(),t:now,feat:'devices',text:d.name+': '+x,level:'info'});return true},
 al=(x,i)=>{const text=x+' ('+d.loc+')';d.info=i;d.bad=true;D.alerts.unshift({id:rid(),type:'device',text,feat:'devices',devId:d.id,t:now,st:'active',muted:false});D.events.unshift({id:rid(),t:now,feat:'devices',text,level:'alert'});return true};
 const k=JSON.stringify([p.contact,p.water_leak,p.smoke,p.carbon_monoxide,p.occupancy??p.presence,p.state,p.temperature]);if(d.type!=='sos'){if(k===d.k)return false;d.k=k}
 switch(d.type){
  case'door':case'fridge':return p.contact===undefined?false:ev(p.contact?'cerrado':'abierto',p.contact?'Cerrado':'Abierto '+T());
  case'leak':return p.water_leak?al('💧 Fuga de agua detectada','Fuga detectada'):false;
  case'smoke':return(p.smoke||p.carbon_monoxide)?al('🔥 Humo o monóxido detectado','Alerta'):false;
  case'temp':if(p.temperature===undefined)return false;d.info=Math.round(p.temperature)+'°C'+(p.humidity!=null?' · '+Math.round(p.humidity)+'%':'');return true;
  case'pir':case'radar':return(p.occupancy??p.presence)?ev('movimiento detectado','Movimiento '+T()):false;
  case'sos':{const a=String(p.action??''),hit=p.sos===true||p.panic===true||p.emergency===true||(a!==''&&!/^(release|off)$/i.test(a));
  if(!hit||now-(d.lt||0)<10000)return false;d.lt=now;d.info='Pulsado '+T();d.bad=true;const text='🆘 Botón de pánico pulsado ('+d.name+' · '+d.loc+')';
  D.alerts.unshift({id:rid(),type:'sos',text,feat:'sos',devId:d.id,t:now,st:'active',muted:false});D.events.unshift({id:rid(),t:now,feat:'sos',text,level:'alert'});return true}
  case'switch':case'bulb':return p.state?ev(p.state==='ON'?'encendido':'apagado',p.state==='ON'?'Encendido':'Apagado'):false}
 return false}
if(MQ){const c=mqtt.connect(MQ);c.on('connect',()=>{console.log('MQTT conectado');c.subscribe('zigbee2mqtt/+')});c.on('error',e=>console.log('MQTT:',e.message));
 c.on('message',(t,buf)=>{const name=t.split('/')[1];let p;try{p=JSON.parse(buf)}catch{return}
  const d=st.data?.devices?.find(x=>x.mqtt&&x.mqtt===name);if(d&&apply(d,p)){st.rev++;commit()}})}
srv.listen(PORT,()=>console.log('Servidor en puerto',PORT));
