import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {openAccountStore} from './account-store.mjs';
import {accountView,applyBroadcast,fundAccount,updateAccountControls} from './device-account.mjs';
import {broadcastFeed} from './broadcast-feed.mjs';
const port=Number(process.env.R31_PORT||8787);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_PORT');
const origin='http://127.0.0.1:'+port,csrf=randomBytes(32).toString('hex');
const store=await openAccountStore(process.env.R31_ACCOUNT_DIR||join(homedir(),'.r31-paper-device'));
const feed=broadcastFeed({token:process.env.R31_GITHUB_READ_TOKEN||''});
const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['../web/style.css','text/css; charset=utf-8']};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'Referrer-Policy':'no-referrer'};
let status={state:'NOT_CHECKED',checked_at_utc:null},polling=false,stopping=false;
function errorCode(e){return typeof e.message==='string'&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'REQUEST_FAILED'}
async function poll(){
 if(polling||stopping)return;polling=true;
 try{const latest=await feed.latest();const now=new Date().toISOString();
 if(!latest){status={state:'NOT_PUBLISHING',checked_at_utc:now};return}
 let result;await store.mutate(a=>{result=applyBroadcast(a,{...latest,now:new Date().toISOString()});return result.account});
 status={state:result.status,checked_at_utc:new Date().toISOString(),sequence:latest.signal.sequence,target_utc:latest.signal.target_utc,expires_at_utc:latest.signal.expires_at_utc};
 }catch(e){status={state:'FEED_ERROR',checked_at_utc:new Date().toISOString(),error:errorCode(e)}}finally{polling=false}
}
function json(res,n,value){res.writeHead(n,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value))}
function goodToken(s){return typeof s==='string'&&/^[0-9a-f]{64}$/.test(s)&&timingSafeEqual(Buffer.from(s),Buffer.from(csrf))}
async function body(req){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>4096)throw Error('BODY_TOO_LARGE');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
function view(){return {...accountView(store.read()),feed:status,csrf,real_money_enabled:false}}
const server=createServer(async(req,res)=>{
 try{
 if(req.headers.host!=='127.0.0.1:'+port)return json(res,403,{error:'LOCAL_HOST_ONLY'});
 const path=new URL(req.url,origin).pathname;
 if(req.method==='GET'&&files[path]){const [name,type]=files[path],b=await readFile(new URL('./device-web/'+name,import.meta.url));res.writeHead(200,{...headers,'Content-Type':type});return res.end(b)}
 if(req.method==='GET'&&path==='/api/state')return json(res,200,view());
 if(req.method==='POST'&&['/api/controls','/api/funding'].includes(path)){
  if(req.headers.origin!==origin||!goodToken(req.headers['x-r31-csrf'])||req.headers['content-type']!=='application/json')return json(res,403,{error:'FORBIDDEN'});
  const input=await body(req);await store.mutate(a=>path==='/api/controls'?updateAccountControls(a,input,new Date().toISOString()):fundAccount(a,input,new Date().toISOString()));return json(res,200,view());
 }
 return json(res,404,{error:'NOT_FOUND'});
 }catch(e){return json(res,e.message.includes('CONFLICT')?409:400,{error:errorCode(e)})}
});
const timer=setInterval(poll,300000);timer.unref();
server.listen(port,'127.0.0.1',()=>{console.log('R31 independent paper account: '+origin);void poll()});
async function close(){if(stopping)return;stopping=true;clearInterval(timer);server.close();while(polling)await new Promise(r=>setTimeout(r,100));await store.close()}
process.once('SIGINT',()=>void close().finally(()=>process.exit(0)));
process.once('SIGTERM',()=>void close().finally(()=>process.exit(0)));
server.on('error',e=>{console.error(errorCode(e));void close().finally(()=>process.exit(1))});
