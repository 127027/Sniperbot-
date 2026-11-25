import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {github} from './github.mjs';
const port=Number(process.env.R31_PORT||8787);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_PORT');
const origin='http://127.0.0.1:'+port;
const csrf=randomBytes(32).toString('hex');
const api=github({token:process.env.R31_GITHUB_TOKEN||''});
const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'Referrer-Policy':'no-referrer'};
function json(res,status,data){res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function validToken(s){return typeof s==='string'&&/^[0-9a-f]{64}$/.test(s)&&timingSafeEqual(Buffer.from(s),Buffer.from(csrf));}
async function body(req){let bytes=0;const chunks=[];for await(const c of req){bytes+=c.length;if(bytes>4096)throw Error('BODY_TOO_LARGE');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
const server=createServer(async(req,res)=>{
 try{
 if(req.headers.host!=='127.0.0.1:'+port)return json(res,403,{error:'LOCAL_HOST_ONLY'});
 const path=new URL(req.url,origin).pathname;
 if(req.method==='GET'&&files[path]){const [name,type]=files[path];res.writeHead(200,{...headers,'Content-Type':type});return res.end(await readFile(new URL('./web/'+name,import.meta.url)));}
 if(req.method==='GET'&&path==='/api/state')return json(res,200,{...await api.state(),csrf});
 if(req.method==='POST'&&path==='/api/controls'){
  if(req.headers.origin!==origin||!validToken(req.headers['x-r31-csrf'])||req.headers['content-type']!=='application/json')return json(res,403,{error:'FORBIDDEN'});
  return json(res,200,{controls:await api.save(await body(req)),connected_to_dots:false});
 }
 return json(res,404,{error:'NOT_FOUND'});
 }catch(e){return json(res,e.message.includes('CONFLICT')||e.status===409?409:400,{error:typeof e.message==='string'&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'REQUEST_FAILED'});}
});
server.listen(port,'127.0.0.1',()=>console.log('R31 Paper Control Center: '+origin+' (R30 read-only, no real money)'));
