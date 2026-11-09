import {receiveDecision} from './central-decisions.mjs';
import {createReceiver} from './research-inbox.mjs';
import {buildDotStatus} from './dot-status.mjs';
import {storage} from './storage.mjs';
import {ingest,evaluate,simulate,assess} from './research.mjs';
import {authenticate,limiter,body} from './gateway.mjs';
import {createServer} from 'node:http';
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {action,applyExits,autoBuyCandidate,freshState,log,paperSignal,updateCandidates,updateQuotes} from './core.mjs';
import {CHAINS,lookupToken,scanNewPools,tokenQuote,validTokenAddress} from './market.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const store=storage(root);
let state=store.state,scanning=false,pricing=false;
const allowRequest=limiter();
function decisionKeys(){
 const file=path.join(store.dir,'trusted-publishers.json');
 if(!existsSync(file))return [];
 const keys=JSON.parse(readFileSync(file,'utf8'));
 if(!Array.isArray(keys)||keys.length>20)throw Error('Ungültige Publisher-Registry');
 return keys;
}
function centralStatus(){
 try{return {mode:'PAPER_ONLY',follow:!!state.centralPaperFollow,publisherConfigured:decisionKeys().some(k=>k.scope==='external'&&!k.revoked),execution:'BLOCKED_REAL_VALIDATOR_UNAVAILABLE',receipts:state.paperDecisions?.receipts||[]};}
 catch{return {mode:'PAPER_ONLY',follow:!!state.centralPaperFollow,publisherConfigured:false,execution:'BLOCKED_INVALID_PUBLISHER_REGISTRY',receipts:state.paperDecisions?.receipts||[]};}
}

function save(){store.save(state)}
function commit(next){if(next!==state){store.save(next);state=next}}
function reply(res,code,body){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body))}
function error(res,code,msg){return reply(res,code,{ok:false,error:msg})}
function corsAllowed(req){const origin=req.headers.origin;return !origin || origin===`http://127.0.0.1:${port}`}
async function scan(){if(scanning)return;scanning=true;
 try {const {results,errors,at}=await scanNewPools();
   const custom=state.candidates.filter(c=>c.source==='DEX Screener' || c.isDemo);
   const ids=new Set(results.map(x=>x.id));const others=custom.filter(x=>!ids.has(x.id));
   let n=updateCandidates(state,[...results,...others].slice(0,85),errors,at);
   n=autoBuyCandidate(n);commit(n);
 }catch(e){commit({...state,lastError:e.message})}
 finally{scanning=false}
}
async function prices(){if(pricing || state.positions.length===0)return;pricing=true;
 const quotes={};
 try{for(const p of state.positions){if(p.isDemo)continue;try{const quote=await tokenQuote(p.chain,p.tokenAddress);if(quote)quotes[p.id]=quote}catch(e){console.log('Kursabfrage',p.symbol,e.message)}}
  if(Object.keys(quotes).length)commit(updateQuotes(state,quotes));
 }finally{pricing=false}
}
const port=Number(process.env.SNIPER_PORT)||3030;
const server=createServer(async(req,res)=>{
 if(req.headers.host!==`127.0.0.1:${port}`||!corsAllowed(req))return error(res,403,'Host/Origin blockiert');
 const route=new URL(req.url||'/',`http://127.0.0.1:${port}`).pathname;
 if(req.method==='GET'&&['/','/dashboard'].includes(route)){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'"});
  return res.end(readFileSync(path.join(root,'runner','dashboard.html')));
 }
 if(req.method==='GET'&&route==='/api/state')return reply(res,200,{ok:true,mode:'PAPER_ONLY',dataSource:'GeckoTerminal / DEX Screener (read only)',state,health:{online:true,scanRunning:scanning,pricing,uptimeSec:Math.round(process.uptime()),central:centralStatus(),dotStatus:buildDotStatus(state.researchInbox,{enabled:process.env.SNIPER_RESEARCH_FEED==='1'})}});
 if(req.method==='GET'&&route==='/api/research/inbox')return reply(res,200,{ok:true,mode:'PAPER_ONLY',enabled:process.env.SNIPER_RESEARCH_FEED==='1',inbox:state.researchInbox||{receipts:[]}});
 if(req.method==='GET'&&route==='/api/decisions')return reply(res,200,{ok:true,...centralStatus()});
 if(req.method==='POST'&&route==='/api/decisions/events'){
  if(req.headers.origin)return error(res,403,'Nur lokale signierte Clients');
  if(!allowRequest('central-paper-publisher'))return error(res,429,'Rate-Limit');
  try{const d=await body(req),next=receiveDecision(state,d,decisionKeys());const duplicate=next===state;commit(next);return reply(res,200,{ok:true,duplicate,receipt:state.paperDecisions.receipts.find(r=>r.signal_id===d.signal_id)});}catch(e){return error(res,422,e.message)}
 }
 if(req.method==='GET'&&route==='/api/health')return reply(res,200,{ok:true,mode:'PAPER_ONLY',uptimeSec:Math.round(process.uptime())});
 if(route==='/api/research'||route==='/api/research/events'){
  if(req.headers.origin)return error(res,403,'Gateway ist nur für lokale Clients');
  const principal=authenticate(req.headers.authorization,store.credentials);
  if(!principal)return error(res,401,'Agenten-Zugang erforderlich');
  if(!allowRequest(principal.id))return error(res,429,'Rate-Limit');
  if(req.method==='GET'&&route==='/api/research')return reply(res,200,{ok:true,research:state.research});
  if(req.method!=='POST'||route!=='/api/research/events')return error(res,405,'Methode nicht erlaubt');
  try{const e=await body(req),n=ingest(state,e,principal),duplicate=n===state;if(!duplicate)commit(evaluate(n));return reply(res,200,{ok:true,duplicate,research:state.research})}
  catch(e){return error(res,e.status||422,e.message)}
 }
 if(req.method!=='POST'||route!=='/api/command')return error(res,404,'Nicht gefunden');
 if(!corsAllowed(req))return error(res,403,'Fremder Origin blockiert');
 if(!req.headers['content-type']?.startsWith('application/json'))return error(res,415,'JSON erforderlich');
 let raw='';try{for await(const chunk of req){raw+=chunk;if(raw.length>6000)throw Error('Anfrage zu groß')}}catch{return error(res,413,'Anfrage zu groß')}
 let a;try{a=JSON.parse(raw)}catch{return error(res,400,'Ungültiges JSON')}
 const allowed=new Set(['SET_PAPER_BALANCE','SET_CENTRAL_FOLLOW','SIMULATE_AGENTS','TOGGLE_BOT','SET_AUTO','SET_RANGE','SET_EXITS','DEPOSIT','WITHDRAW','EXCHANGE','EXCHANGE_BACK','BUY','SELL','RESET','SCAN','DEMO_SIGNAL','LOOKUP','DEMO_MOVE']);
 if(!allowed.has(a?.type))return error(res,400,'Aktion nicht zulässig');
 if(a.type==='SIMULATE_AGENTS'){try{commit(simulate(state,a.negative===true));return reply(res,200,{ok:true,state})}catch(e){return error(res,422,e.message)}}
 if(a.type==='SCAN'){void scan();return reply(res,202,{ok:true,message:'Marktdatenabfrage gestartet'})}
 if(a.type==='LOOKUP'){
  if(!validTokenAddress(a.chain,a.address))return error(res,400,'Ungültige Contract-Adresse für Chain');
  try{const c=await lookupToken(a.chain,a.address);const rest=state.candidates.filter(x=>x.id!==c.id);
   commit({...state,candidates:[c,...rest].slice(0,85),history:log(state,'Token geprüft',`${c.symbol} – DEX Screener; Sicherheitsstatus UNGEPRÜFT`)});
   return reply(res,200,{ok:true,state})}catch(e){return error(res,422,e.message)}
 }
 if(a.type==='DEMO_SIGNAL'){
   const demo=paperSignal(),n={...state,candidates:[demo,...state.candidates.filter(x=>x.id!==demo.id)]};
   let next={...n,history:log(n,'TEST-SIGNAL','Erfundenes Demo-Signal erzeugt – keine echte KI-Entscheidung')};
   // Demo single-signal is manual only; automatic entries require the five-role pipeline.
   commit(next);
   return reply(res,200,{ok:true,state});
 }
 if(a.type==='DEMO_MOVE'){
  const p=state.positions.find(p=>p.id===a.id&&p.isDemo);if(!p)return error(res,422,'Nur für erfundene Test-Coins');
  const pct=Number(a.percent);if(!Number.isFinite(pct)||pct< -95||pct>500)return error(res,422,'Ungültiger Impuls');
  commit(applyExits({...state,positions:state.positions.map(q=>q.id===p.id?{...q,priceUsd:q.priceUsd*(1+pct/100),markAt:new Date().toISOString()}:q)}));
  return reply(res,200,{ok:true,state});
 }
 const n=action(state,a);if(n===state)return error(res,422,'Aktion blockiert (Bot AUS, Guthaben, Grenzen oder ungültige Eingabe)');
 commit(evaluate(n));return reply(res,200,{ok:true,state});
});
server.requestTimeout=10000;server.headersTimeout=10000;
server.listen(port,'127.0.0.1',()=>console.log(`MEME SNIPER V0.4 GATEWAY (nur TEST) http://127.0.0.1:${port}`));
// Safe, low-frequency public polling; independent of browser. No private keys, no live execution.
if(process.env.SNIPER_OFFLINE!=='1'&&process.env.SNIPER_LOCAL_DISCOVERY==='1')setInterval(()=>{void scan()},90000);
if(process.env.SNIPER_OFFLINE!=='1')setInterval(()=>{void prices()},30000);
if(process.env.SNIPER_OFFLINE!=='1'&&process.env.SNIPER_LOCAL_DISCOVERY==='1')setTimeout(()=>{void scan()},2500);
setInterval(()=>{try{commit(evaluate(applyExits(state)))}catch(e){console.error('Research/Exit:',e.message)}},5000);
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{save();server.close();process.exit(0)});

// Opt-in, outbound-only, informational feed. Never calls ingest/evaluate/action.
if(process.env.SNIPER_RESEARCH_FEED==='1'){
 const pollResearch=createReceiver({getState:()=>state,commit});
 void pollResearch().catch(e=>console.error('Research inbox:',e.message));setInterval(()=>{void pollResearch().catch(e=>console.error('Research inbox:',e.message))},60000);
}
