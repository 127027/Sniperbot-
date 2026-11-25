import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {checkRelease,stageRelease} from './updater.mjs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {openAccountStore} from './account-store.mjs';
import {accountView,applyBroadcast,fundAccount,updateAccountControls} from './device-account.mjs';
import {publicTelemetry} from './telemetry.mjs';
import {broadcastFeed} from './broadcast-feed.mjs';
const port=Number(process.env.R31_PORT||8787);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_PORT');
const origin='http://127.0.0.1:'+port,csrf=randomBytes(32).toString('hex');
const accountDir=process.env.R31_ACCOUNT_DIR||join(homedir(),'.r31-paper-device');
const store=await openAccountStore(accountDir);
const version=JSON.parse(await readFile(new URL('./version.json',import.meta.url),'utf8')).version;
let updating=false,trial=process.env.R31_UPDATE_TRIAL==='1',updateState='BEREIT';
const feed=broadcastFeed({token:process.env.R31_GITHUB_READ_TOKEN||''});
const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['../web/style.css','text/css; charset=utf-8'],'/telemetry.mjs':['../telemetry.mjs','text/javascript; charset=utf-8'],'/performance.mjs':['../performance.mjs','text/javascript; charset=utf-8']};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'Referrer-Policy':'no-referrer'};
let status={state:'NOT_CHECKED',checked_at_utc:null},polling=false,stopping=false;
function errorCode(e){return typeof e.message==='string'&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'REQUEST_FAILED'}
async function poll(){
 if(polling||stopping||trial||updating)return;polling=true;
 try{const latest=await feed.latest();const now=new Date().toISOString();
 if(!latest){status={state:'NOT_PUBLISHING',checked_at_utc:now};return}
 let result;await store.mutate(a=>{result=applyBroadcast(a,{...latest,now:new Date().toISOString()});return result.account});
 status={state:result.status,checked_at_utc:new Date().toISOString(),sequence:latest.signal.sequence,target_utc:latest.signal.target_utc,expires_at_utc:latest.signal.expires_at_utc};
 }catch(e){status={state:'FEED_ERROR',checked_at_utc:new Date().toISOString(),error:errorCode(e)}}finally{polling=false}
}
function json(res,n,value){res.writeHead(n,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value))}
function goodToken(s){return typeof s==='string'&&/^[0-9a-f]{64}$/.test(s)&&timingSafeEqual(Buffer.from(s),Buffer.from(csrf))}
async function body(req){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>4096)throw Error('BODY_TOO_LARGE');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
let cachedTelemetry=null,telemetryTask=null;
async function telemetry(){if(cachedTelemetry&&Date.now()-Date.parse(cachedTelemetry.checked_at_utc)<45000)return cachedTelemetry;if(!telemetryTask)telemetryTask=publicTelemetry().readStatus().then(x=>(cachedTelemetry=x)).finally(()=>{telemetryTask=null});return telemetryTask}
function view(){return {...accountView(store.read()),feed:status,csrf,real_money_enabled:false,update:{version,state:updateState,managed:typeof process.send==='function'}}}
const server=createServer(async(req,res)=>{
 try{
 if(req.headers.host!=='127.0.0.1:'+port)return json(res,403,{error:'LOCAL_HOST_ONLY'});
 const path=new URL(req.url,origin).pathname;
 if(req.method==='GET'&&files[path]){const [name,type]=files[path],b=await readFile(new URL('./device-web/'+name,import.meta.url));res.writeHead(200,{...headers,'Content-Type':type});return res.end(b)}
 if(req.method==='GET'&&path==='/api/telemetry')return json(res,200,await telemetry());
 if(req.method==='GET'&&path==='/api/state')return json(res,200,view());
 if(req.method==='POST'&&['/api/controls','/api/funding','/api/update'].includes(path)){
  if(req.headers.origin!==origin||!goodToken(req.headers['x-r31-csrf'])||req.headers['content-type']!=='application/json')return json(res,403,{error:'FORBIDDEN'});
  const input=await body(req);
  if(path==='/api/update'){
   if(trial||updating||stopping)throw Error('UPDATE_BUSY');if(!process.send)throw Error('START_WITH_R40_LAUNCHER');updating=true;updateState='PRÜFT';
   try{const check=await checkRelease({current:version});if(!check.available){updateState='AKTUELL';updating=false;return json(res,200,view())}updateState='LÄDT';const next=await stageRelease({manifest:check.manifest,current:version,root:join(accountDir,'updates')});while(polling)await new Promise(r=>setTimeout(r,100));await mkdir(join(accountDir,'updates','backups'),{recursive:true,mode:0o700});await writeFile(join(accountDir,'updates','backups','account-'+Date.now()+'.json'),JSON.stringify(store.read()),{flag:'wx',mode:0o600});updateState='NEUSTART';json(res,200,view());process.send({type:'restart',...next});return;}catch(e){updating=false;updateState='FEHLER';throw e}
  }
  if(updating||trial||stopping)throw Error('UPDATE_BUSY');await store.mutate(a=>path==='/api/controls'?updateAccountControls(a,input,new Date().toISOString()):fundAccount(a,input,new Date().toISOString()));return json(res,200,view());
 }
 return json(res,404,{error:'NOT_FOUND'});
 }catch(e){return json(res,e.message.includes('CONFLICT')?409:400,{error:errorCode(e)})}
});
const timer=setInterval(poll,300000);timer.unref();
server.listen(port,'127.0.0.1',()=>{console.log('R31 independent paper account: '+origin);if(process.send)process.send({type:'ready'});if(!trial)void poll()});
async function close(){if(stopping)return;stopping=true;clearInterval(timer);server.close();while(polling)await new Promise(r=>setTimeout(r,100));await store.close()}
process.on('message',m=>{if(m?.type==='activate'){trial=false;void poll()}else if(m?.type==='shutdown-for-update'){void close().then(()=>process.exit(42),()=>process.exit(1))}else if(m?.type==='update-rejected'){updating=false;updateState='FEHLER';}});
process.once('SIGINT',()=>void close().finally(()=>process.exit(0)));
process.once('SIGTERM',()=>void close().finally(()=>process.exit(0)));
server.on('error',e=>{console.error(errorCode(e));void close().finally(()=>process.exit(1))});
