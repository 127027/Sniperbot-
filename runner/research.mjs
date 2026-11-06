// Untrusted research is stored, never treated as an executable order.
import {createHash, randomUUID} from 'node:crypto';
import {validTokenAddress} from './market.mjs';
import {action, log, paperSignal} from './core.mjs';
export const ROLES=['news_discovery','social_acceleration','onchain_liquidity','contract_security','opportunity_qa'];
export const emptyResearch=()=>({events:[],candidates:[],decisions:[]});
const fail=message=>{throw Error(message)};
const str=(v,max=200)=>typeof v==='string'&&v.length>0&&v.length<=max;
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
export function fresh(observed,expires,now=Date.now()){
 const a=Date.parse(observed),b=Date.parse(expires);
 return Number.isFinite(a)&&Number.isFinite(b)&&a<=now&&a>=now-300000&&b>now&&b>a&&b-a<=300000;
}
export function identity(chain,token,pool){
 if(['base','bsc','eth'].includes(chain)){token=token.toLowerCase();pool=pool.toLowerCase()}
 return `${chain}:${token}:${pool}`;
}
function keys(e,extra){
 const allowed=new Set(['schema','event_id','agent_id','observed_at_utc','expires_at_utc','paper_only','candidate_id',...extra]);
 if(Object.keys(e).some(k=>!allowed.has(k)))fail('Unbekanntes Feld');
}
export function ingest(state,event,principal,now=Date.now()){
 const e=structuredClone(event),r=structuredClone(state.research||emptyResearch());
 if(!e||typeof e!=='object'||Array.isArray(e)||!principal)fail('Ereignis/Identität fehlt');
 if(!str(e.event_id,100)||!/^[-\w]+$/.test(e.event_id)||e.agent_id!==principal.id||e.paper_only!==true)fail('Ungültiger Absender/Event');
 const hash=createHash('sha256').update(JSON.stringify(e)).digest('hex');
 const old=r.events.find(x=>x.event_id===e.event_id);
 if(old){if(old.hash!==hash)fail('Event-ID-Konflikt');return state}
 if(!fresh(e.observed_at_utc,e.expires_at_utc,now))fail('Zeitfenster abgelaufen oder ungültig');
 if(e.schema==='candidate.v1'){
  keys(e,['chain','token_address','pool_address','symbol']);
  if(!ROLES.includes(principal.role)||!validTokenAddress(e.chain,e.token_address)||!validTokenAddress(e.chain,e.pool_address)||!str(e.symbol,36))fail('Ungültiger Kandidat');
  const id=identity(e.chain,e.token_address,e.pool_address);
  if(e.candidate_id!==id)fail('Kandidatenidentität stimmt nicht');
  if(!r.candidates.some(c=>c.id===id)){
   r.candidates.push({id,chain:e.chain,tokenAddress:e.token_address,poolAddress:e.pool_address,symbol:e.symbol,isDemo:false,votes:[],evidence:[],risk:null,filled:false});
  }
 }else{
  const c=r.candidates.find(c=>c.id===e.candidate_id);if(!c)fail('Unbekannter Kandidat');
  if(c.isDemo&&!principal.synthetic)fail('Externe Agenten dürfen keine Simulationskandidaten verändern');
  if(e.schema==='evidence.v1'){
   keys(e,['evidence_id','url','independence_key','summary']);
   if(!ROLES.includes(principal.role)||!str(e.evidence_id,100)||!str(e.summary,2000)||!str(e.independence_key,100))fail('Ungültiger Beleg');
   let url;try{url=new URL(e.url)}catch{fail('Ungültige Quellen-URL')}
   if(url.protocol!=='https:'||url.username||url.password||e.url.length>1000)fail('Nur HTTPS-Quellen ohne Zugangsdaten');
   url.hash='';url.search='';
   if(c.evidence.some(x=>x.evidence_id===e.evidence_id))fail('Beleg-ID bereits vergeben');
   c.evidence.push({...e,url:url.href,source_host:url.hostname,author:principal.id});
  }else if(e.schema==='agent_vote.v1'){
   keys(e,['role','vote','reason','evidence_ids','counterevidence_ids','risk_flags','score_0_100']);
   if(e.score_0_100!==undefined&&(!Number.isFinite(e.score_0_100)||e.score_0_100<0||e.score_0_100>100))fail('Ungültiger Bewertungsscore');
   if(principal.role!==e.role||!ROLES.includes(e.role)||!['YES','NO','ABSTAIN','VETO'].includes(e.vote)||!str(e.reason,2000))fail('Ungültige Rolle/Stimme');
   for(const k of ['evidence_ids','counterevidence_ids','risk_flags'])if(!Array.isArray(e[k])||e[k].length>20||e[k].some(x=>!str(x,100)))fail('Ungültige Beleg-/Risikoliste');
   if(new Set(e.evidence_ids).size!==e.evidence_ids.length||!e.evidence_ids.length)fail('Eindeutige Belege erforderlich');
   for(const id of [...e.evidence_ids,...e.counterevidence_ids])if(!c.evidence.some(x=>x.evidence_id===id))fail('Unbekannter Beleg');
   // A review amendment supersedes this agent, not another agent's veto.
   c.votes=c.votes.filter(v=>v.agent_id!==principal.id);c.votes.push(e);
  }else if(e.schema==='risk_assessment.v1'){
   keys(e,['contract','liquidity','sellability','max_amount_usdc','reason']);
   if(principal.role!=='risk_controller'||!str(e.reason,2000))fail('Unabhängiger Risiko-Zugang erforderlich');
   if(['contract','liquidity','sellability'].some(k=>!['PASS','FAIL','UNKNOWN'].includes(e[k]))||!positive(e.max_amount_usdc))fail('Ungültige Risikoprüfung');
   c.risk=e;
  }else fail('Schema nicht unterstützt; keine Orderbefehle erlaubt');
 }
 r.events.push({...e,hash,received_at:new Date(now).toISOString()});
 return {...state,research:r};
}
export function assess(c,now=Date.now()){
 const votes=c.votes;
 if(votes.some(v=>v.vote==='VETO'||v.vote==='NO'))return {status:'REJECT',reason:'Gegenstimme/VETO vorhanden'};
 if(votes.some(v=>v.vote!=='YES'||!fresh(v.observed_at_utc,v.expires_at_utc,now)||v.risk_flags.length||v.counterevidence_ids.length))return {status:'WATCH',reason:'Unsicherheit, Gegenbeleg oder veraltete Stimme'};
 if(!ROLES.every(role=>votes.some(v=>v.role===role))||new Set(votes.map(v=>v.agent_id)).size<5)return {status:'WATCH',reason:'Fünf vollständige Rollen fehlen'};
 const hosts=new Set(),independent=new Set();
 for(const role of ROLES){
  const v=votes.find(v=>v.role===role);
  const evidence=v.evidence_ids.map(id=>c.evidence.find(e=>e.evidence_id===id));
  if(evidence.some(e=>!e||!fresh(e.observed_at_utc,e.expires_at_utc,now)))return {status:'WATCH',reason:'Belege fehlen oder sind veraltet'};
  const own=evidence.find(e=>e.author===v.agent_id&&!hosts.has(e.source_host)&&!independent.has(e.independence_key));
  if(!own)return {status:'WATCH',reason:'Unabhängige eigene Quellen nicht nachgewiesen'};
  hosts.add(own.source_host);independent.add(own.independence_key);
 }
 if(!c.risk||!fresh(c.risk.observed_at_utc,c.risk.expires_at_utc,now)||['contract','liquidity','sellability'].some(k=>c.risk[k]!=='PASS'))return {status:'WATCH',reason:'Unabhängige Risiko-/Verkaufsfreigabe fehlt'};
 // Authenticating a report does not verify an actual contract or sell route.
 if(!c.isDemo)return {status:'WATCH',reason:'REAL_VALIDATOR_UNAVAILABLE: echte On-Chain-/Sell-Adapter fehlen'};
 return {status:'PAPER_ELIGIBLE',reason:'5 Rollen + separate synthetische Risiko-Fixture bestätigt'};
}
// Explicit allocation convention, NOT a calibrated probability of profit.
// Missing scores select the minimum. The lowest role score determines sizing;
// 95 or higher may select the user maximum, subject to cash and technical sell limits.
export function positionSize(s,c){
 const scores=ROLES.map(role=>{
  const votes=c.votes.filter(v=>v.role===role);
  return votes.length?Math.min(...votes.map(v=>Number.isFinite(v.score_0_100)?v.score_0_100:0)):0;
 });
 const fraction=Math.min(1,Math.max(0,Math.min(...scores)/95));
 const target=s.minTrade+(s.maxTrade-s.minTrade)*fraction;
 const amount=Math.floor((Math.min(target,s.maxTrade,s.cashUsdc+s.cashEur,c.risk.max_amount_usdc)+1e-9)*100)/100;
 return amount>=s.minTrade?amount:0;
}
export function evaluate(state,now=Date.now()){
 let s={...state,research:structuredClone(state.research||emptyResearch())};
 for(const c of s.research.candidates){
  const a=c.filled?{status:'PAPER_FILLED',reason:'Bereits verarbeitet; kein Wiederkauf'}:assess(c,now);
  if(a.status==='PAPER_ELIGIBLE'){
   const amount=positionSize(s,c);
   if(!s.entriesEnabled||!s.automaticPaperBuys){a.status='WAITING';a.reason='Bot oder Paper-Autokauf AUS'}
   else if(amount<s.minTrade){a.status='WAITING';a.reason='Guthaben oder technische Verkaufsgrenze unter Mindestbetrag'}
   else{
    const candidate={...paperSignal(),id:c.id,tokenAddress:c.tokenAddress,poolAddress:c.poolAddress,symbol:c.symbol};
    const before=s.positions.length;
    s=action({...s,candidates:[candidate,...s.candidates.filter(x=>x.id!==c.id)]},{type:'BUY',id:c.id,amount});
    if(s.positions.length>before){c.filled=true;a.status='PAPER_FILLED';a.reason=`${amount} Test-USDC simuliert gekauft`}
    else {a.status='WAITING';a.reason='Kauf durch Engine blockiert'}
   }
  }
  if(c.status!==a.status||c.reason!==a.reason){
   c.status=a.status;c.reason=a.reason;
   s.research.decisions.push({candidate_id:c.id,...a,at:new Date(now).toISOString()});
   s={...s,history:log(s,'Agentenentscheidung',`${c.symbol}: ${a.status} – ${a.reason}`)};
  }
 }
 return s;
}
export function simulate(state,negative=false,score=95){
 const key=randomUUID(),id=`demo:${key}:pool`,now=Date.now();
 let s={...state,research:structuredClone(state.research||emptyResearch())};
 s.research.candidates.push({id,chain:'demo',tokenAddress:key,poolAddress:'pool',symbol:'SIM-'+key.slice(0,6),isDemo:true,votes:[],evidence:[],risk:null,filled:false});
 const common={candidate_id:id,paper_only:true,observed_at_utc:new Date(now).toISOString(),expires_at_utc:new Date(now+300000).toISOString()};
 ROLES.forEach((role,i)=>{
  const principal={id:`sim-${role}`,role,synthetic:true};
  s=ingest(s,{...common,schema:'evidence.v1',event_id:randomUUID(),agent_id:principal.id,evidence_id:`${key}-${i}`,url:`https://source-${i}.example.org/synthetic`,independence_key:`fixture-${i}`,summary:'Synthetischer Testbeleg, keine Marktrecherche'},principal,now);
  s=ingest(s,{...common,schema:'agent_vote.v1',event_id:randomUUID(),agent_id:principal.id,role,vote:negative&&i===4?'NO':'YES',reason:'Simulierter Rollentest',score_0_100:score,evidence_ids:[`${key}-${i}`],counterevidence_ids:[],risk_flags:[]},principal,now);
 });
 s=ingest(s,{...common,schema:'risk_assessment.v1',event_id:randomUUID(),agent_id:'sim-risk',contract:'PASS',liquidity:'PASS',sellability:'PASS',max_amount_usdc:100000,reason:'Synthetische Verkaufsroute; keine Contract-Prüfung'}, {id:'sim-risk',role:'risk_controller',synthetic:true},now);
 return evaluate(s,now);
}
