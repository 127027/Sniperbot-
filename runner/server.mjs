import {receiveDecision} from './central-decisions.mjs';
import {buildV09Status,previewFundingV09} from './v09-integration.mjs';
import {createReceiver} from './research-inbox.mjs';
import {buildDotStatus} from './dot-status.mjs';
import {fetchResearchNetwork} from './research-network.mjs';
import {storage} from './storage.mjs';
import {ingest,evaluate,simulate,assess} from './research.mjs';
import {authenticate,limiter,body} from './gateway.mjs';
import {createServer} from 'node:http';
import {attachSupervisedStop} from './supervised-stop.mjs';
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {action,applyExits,autoBuyCandidate,freshState,log,paperSignal,updateCandidates,updateQuotes} from './core.mjs';
import {CHAINS,lookupToken,scanNewPools,tokenQuote,validTokenAddress} from './market.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const store=storage(root);
let state=store.state,scanning=false,pricing=false;
const allowRequest=limiter();
let researchNetwork={schema:'research_network_status.v1',transport:'PUBLIC_GITHUB_PULL_ONLY',
 paper_only:true,actionable:false,current_roles:0,total_roles:5,
 roles:[],watchlist:{candidate_count:null,stale:true},local_execution:'BLOCKED_REAL_VALIDATOR_UNAVAILABLE',
 checked_at_utc:null,message:'Awaiting first public GitHub research readback'};
let networkBusy=false;
async function refreshResearchNetwork(){
 if(networkBusy)return;networkBusy=true;
 try{
  const next=await fetchResearchNetwork({settings:{minTrade:state.minTrade,maxTrade:state.maxTrade,portfolioBudgetUsdc:state.portfolioBudgetUsdc,cashUsdc:state.cashUsdc,cashEur:state.cashEur,positions:state.positions.map(p=>({amountUsdc:p.amountUsdc}))}});
  researchNetwork=next;
  // Public summaries only; never put portfolio, tokens or signing keys in the cache.
  const target=path.join(root,'.local','research-network','status.json');
  mkdirSync(path.dirname(target),{recursive:true});
  const temp=target+'.tmp-'+process.pid;
  writeFileSync(temp,JSON.stringify(next,null,2)+'\n','utf8');
  renameSync(temp,target);
 }catch(e){console.error('GitHub research mirror:',e?.message||'UNAVAILABLE')}
 finally{networkBusy=false}
}
function localResearchLearning(){
 const filename=path.join(root,'.local','research-market','status.json');
 try{
  const m=JSON.parse(readFileSync(filename,'utf8'));
  const f=m?.followups;
  if(m?.schema!=='research_market_collector_status.v1'||f?.schema!=='memecoin_followups_status.v1')
    return {available:false,paper_only:true,actionable:false,error:m?.followup_error||'NO_LOCAL_FOLLOWUP_DATA'};
  return {available:true,paper_only:true,actionable:false,
    checked_at_utc:m.last_check_at_utc,stale:Date.now()-Date.parse(m.last_check_at_utc)>600000,
    monitored_active:f.monitored_active,completed:f.completed,admitted_last_cycle:f.admitted,
    omitted_capacity_last_cycle:f.omitted_capacity,followup_ok_last_cycle:f.followup_ok,
    followup_failed_last_cycle:f.followup_failed,
    recent_public_news_leads:m.news_radar?.public_news_leads??0,
    locally_archived_news_events:m.news_radar?.local_archive_count??0,
    news_source_failures:Array.isArray(m.news_radar?.coverage)?m.news_radar.coverage.filter(x=>x.status==='SOURCE_UNAVAILABLE').length:3,
    latest_market_alerts:m.market_alerts?.events_found??0,
    evaluated_market_pairs:m.market_alerts?.compared_pairs??0,
    local_alert_archive_error:m.market_alerts?.local_alert_error??null,
    disclaimer:f.disclaimer,
    warning:m.followup_error||null};
 }catch{return {available:false,paper_only:true,actionable:false,error:'LOCAL_FOLLOWUP_DATA_UNAVAILABLE'}}
}
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
 if(req.method==='GET'&&route==='/api/state')return reply(res,200,{ok:true,mode:'PAPER_ONLY',dataSource:'GeckoTerminal / DEX Screener (read only)',state,health:{online:true,scanRunning:scanning,pricing,uptimeSec:Math.round(process.uptime()),central:centralStatus(),researchNetwork,localLearning:localResearchLearning(),dotStatus:buildDotStatus(state.researchInbox,{enabled:process.env.SNIPER_RESEARCH_FEED==='1'})}});
 if(req.method==='GET'&&route==='/api/research/network')return reply(res,200,{ok:true,network:researchNetwork});
 if(req.method==='GET'&&route==='/api/research/advisories')return reply(res,200,{ok:true,advisories:researchNetwork.advisories||null});
 if(req.method==='GET'&&route==='/api/research/learning')return reply(res,200,{ok:true,learning:localResearchLearning()});
 if(req.method==='GET'&&route==='/api/research/inbox')return reply(res,200,{ok:true,mode:'PAPER_ONLY',enabled:process.env.SNIPER_RESEARCH_FEED==='1',inbox:state.researchInbox||{receipts:[]}});
 if(req.method==='GET'&&route==='/api/decisions')return reply(res,200,{ok:true,...centralStatus()});
 if(req.method==='POST'&&route==='/api/decisions/events'){
  if(req.headers.origin)return error(res,403,'Nur lokale signierte Clients');
  if(!allowRequest('central-paper-publisher'))return error(res,429,'Rate-Limit');
  try{const d=await body(req),next=receiveDecision(state,d,decisionKeys());const duplicate=next===state;commit(next);return reply(res,200,{ok:true,duplicate,receipt:state.paperDecisions.receipts.find(r=>r.signal_id===d.signal_id)});}catch(e){return error(res,422,e.message)}
 }
 if(req.method==='GET'&&route==='/api/v09/status')return reply(res,200,{ok:true,v09:buildV09Status({state,network:researchNetwork})});
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
 const allowed=new Set(['PREVIEW_PAPER_FUNDING','SET_PAPER_BALANCE','SET_CENTRAL_FOLLOW','SIMULATE_AGENTS','TOGGLE_BOT','SET_AUTO','SET_RANGE','SET_EXITS','DEPOSIT','WITHDRAW','EXCHANGE','EXCHANGE_BACK','BUY','SELL','RESET','SCAN','DEMO_SIGNAL','LOOKUP','DEMO_MOVE']);
 if(!allowed.has(a?.type))return error(res,400,'Aktion nicht zulässig');
 if(a.type==='PREVIEW_PAPER_FUNDING'){
  const result=previewFundingV09({amountEur:a.amountEur,eurPerUsdc:a.eurPerUsdc,
    providerFeeEur:a.providerFeeEur,spreadPct:a.spreadPct,networkFeeUsdc:a.networkFeeUsdc,
    now:Date.now()});
  return reply(res,200,{ok:true,preview:result,ledger_unchanged:true});
 }
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
let shuttingDown=false;
function shutdownServer(){
 if(shuttingDown)return;
 shuttingDown=true;
 try{save()}catch(e){console.error('Paper-state save on shutdown:',e.message)}
 server.close(()=>process.exit(0));
 // Exit even if an HTTP connection refuses to close. State was saved first.
 setTimeout(()=>process.exit(0),3000).unref();
}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,shutdownServer);
attachSupervisedStop(shutdownServer);

// Read-only five-role GitHub research mirror, separate from portfolio and action handlers.
if(process.env.SNIPER_OFFLINE!=='1'){
 void refreshResearchNetwork();
 setInterval(()=>{void refreshResearchNetwork()},120000);
}

// Opt-in, outbound-only, informational feed. Never calls ingest/evaluate/action.
if(process.env.SNIPER_RESEARCH_FEED==='1'){
 const pollResearch=createReceiver({getState:()=>state,commit});
 void pollResearch().catch(e=>console.error('Research inbox:',e.message));setInterval(()=>{void pollResearch().catch(e=>console.error('Research inbox:',e.message))},60000);
}
