// V0.5 bounded same-pool longitudinal research. No trading state, no wallet,
// no local API, no private portfolio, no GitHub credential or write permissions.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {candidateId} from './research-watchlist.mjs';
import {classifyMemecoinBreakouts} from './memecoin-outcomes.mjs';
import {summarizeCohorts} from './memecoin-learning.mjs';

const CHAINS=Object.freeze({solana:'solana',base:'base',bsc:'bsc',eth:'eth'});
const HORIZON_MS=14*86400_000, KEEP_MS=120*86400_000;
const CAP_PER_CHAIN=56, MAX_PER_CYCLE=120, MAX_FILE_BYTES=48*1024*1024;
const SLOT_MS=6*3600_000; // spread 4 new research samples per chain across every UTC day
const BATCH_PER_CHAIN=30; // official GeckoTerminal multiple-pools endpoint
const validPrice=p=>typeof p==='number'&&Number.isFinite(p)&&p>0;
const finiteOrNull=x=>x===undefined||x===null||x===''?null:
 (Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null);
const errCode=e=>Number.isInteger(e?.status)?'HTTP_'+e.status:
 ['AbortError','TimeoutError'].includes(e?.name)?'TIMEOUT':'SOURCE_UNAVAILABLE';
const moment=t=>{const n=Date.parse(t);return Number.isFinite(n)?n:NaN};
const hexFraction=s=>parseInt(createHash('sha256').update(s).digest('hex').slice(0,8),16)%8;
export const emptyFollowupState=()=>({schema:'memecoin_followups.v1',paper_only:true,
 actionable:false,records:[],last_updated_at_utc:null});
function validRecord(c){
 if(!c||!Object.hasOwn(CHAINS,c.chain)||typeof c.candidate_id!=='string')return false;
 try{return candidateId(c.chain,c.token_address,c.pool_address)===c.candidate_id}
 catch{return false}
}
function observation(c,now){
 return {at_utc:now,price_usd:c.price_usd,
  liquidity_usd:c.liquidity_usd??null,volume_m5_usd:c.volume_m5_usd??null,
  buys_m5:c.buys_m5??null,sells_m5:c.sells_m5??null,
  quality:'UNVERIFIED_DEX_INDICATIVE'};
}
export function selectFollowupCandidates(current,snapshot,{now=snapshot?.published_at_utc}={}){
 if(!current||current.schema!=='memecoin_followups.v1'||current.paper_only!==true||
    current.actionable!==false||!Array.isArray(current.records))throw Error('INVALID_FOLLOWUP_STATE');
 if(snapshot?.schema!=='research_market_snapshot.v1'||snapshot.paper_only!==true||
    snapshot.actionable!==false||!Array.isArray(snapshot.candidates)||!Number.isFinite(moment(now)))
   throw Error('UNTRUSTED_RESEARCH_SNAPSHOT');
 const records=current.records.map(r=>({...r,observations:Array.isArray(r.observations)?r.observations:[]}));
 const active=r=>!r.completed_at_utc&&moment(now)-moment(r.first_seen_at_utc)<HORIZON_MS;
 const ids=new Set(records.map(r=>r.candidate_id));
 let admitted=0,omitted=0;
 const slot=Math.floor(moment(now)/SLOT_MS);
 const wantsControl=(slot%4)===1;
 // One new cohort sample per chain / six-hour slot to avoid filling
 // every 14-day slot from one launch burst. The sample is NOT exhaustive.
 const pool=structuredClone(snapshot.candidates)
   .filter(c=>validRecord(c)&&validPrice(c.price_usd)&&!ids.has(c.candidate_id))
   .sort((a,b)=>hexFraction(a.candidate_id)-hexFraction(b.candidate_id)||
     a.candidate_id.localeCompare(b.candidate_id));
 for(const m of Object.keys(CHAINS)){
  const group=pool.filter(c=>c.chain===m);
  if(records.filter(r=>r.chain===m&&active(r)).length>=CAP_PER_CHAIN){omitted+=group.length;continue}
  // Earlier versions may not have slot_id; recover it from original timestamp.
  if(records.some(r=>r.chain===m&&(r.slot_id??Math.floor(moment(r.first_seen_at_utc)/SLOT_MS))===slot))continue;
  const found=group.find(c=>{
   const control=hexFraction(c.candidate_id)===0;
   const momentum=Number.isFinite(c.volume_m5_usd)&&c.volume_m5_usd>=500&&
     Number.isFinite(c.liquidity_usd)&&c.liquidity_usd>=10000&&c.promotion_biased!==true;
   return wantsControl?control:momentum&&!control;
  });
  if(!found)continue;
  records.push({candidate_id:found.candidate_id,chain:m,token_address:found.token_address,
    pool_address:found.pool_address,first_seen_at_utc:now,last_poll_at_utc:now,
    slot_id:slot,selection:wantsControl?'DETERMINISTIC_CONTROL':'EARLY_MOMENTUM',
    baseline_price_usd:found.price_usd,observations:[observation(found,now)],
    check_errors:0,check_count:0,completed_at_utc:null,outcomes:null});
  ids.add(found.candidate_id);admitted++;
 }
 // Prune ONLY completed research summaries older than 120 days.
 const kept=records.filter(r=>!r.completed_at_utc||
    moment(now)-moment(r.completed_at_utc)<=KEEP_MS);
 return {state:{...current,records:kept,last_updated_at_utc:now},admitted,omitted};
}
function pollInterval(record,now){
 const age=moment(now)-moment(record.first_seen_at_utc);
 if(record.selection==='DETERMINISTIC_CONTROL')return 6*3600_000;
 if(age<6*3600_000)return 15*60_000; // early high-cadence burst
 if(age<48*3600_000)return 60*60_000;
 return 6*3600_000; // longer horizon: minimize requests
}
export function dueFollowups(state,{now,limit=MAX_PER_CYCLE}={}){
 if(!Number.isFinite(moment(now))||!Number.isInteger(limit)||limit<0||limit>120)
   throw Error('INVALID_FOLLOWUP_SCHEDULE');
 const due=state.records.filter(r=>!r.completed_at_utc&&validRecord(r)&&
   moment(now)-moment(r.first_seen_at_utc)<HORIZON_MS&&
   moment(now)-moment(r.last_poll_at_utc)>=pollInterval(r,now))
 .sort((a,b)=>moment(a.last_poll_at_utc)-moment(b.last_poll_at_utc)||
  a.candidate_id.localeCompare(b.candidate_id));
 // At most one batch per chain/cycle, 30 unique pool addresses in each.
 const perChain=new Map();
 for(const r of due){
  const n=perChain.get(r.chain)||0;
  if(n>=BATCH_PER_CHAIN)continue;
  perChain.set(r.chain,n+1);
 }
 const consumed=new Map();
 return due.filter(r=>{
  const n=consumed.get(r.chain)||0;
  if(n>=(perChain.get(r.chain)||0))return false;
  consumed.set(r.chain,n+1);return true;
 }).slice(0,limit);
}
export function finishFollowupState(state,{now}={}){
 if(!Number.isFinite(moment(now)))throw Error('INVALID_RESEARCH_TIME');
 for(const r of state.records){
  if(r.completed_at_utc||moment(now)-moment(r.first_seen_at_utc)<HORIZON_MS)continue;
  r.outcomes=classifyMemecoinBreakouts({
   first_seen_at_utc:r.first_seen_at_utc,entry_price_usd:r.baseline_price_usd,
   observations:r.observations,observed_until_at_utc:now,
   independently_verified_quotes:false
  });
  r.completed_at_utc=now;
  // Completed candidates retain the cohort label and evidence summary, not
  // a large unbounded time-series; raw collector snapshots remain in gzip history.
  r.observation_count=r.observations.length;
  r.observations=r.observations.slice(0,1);
 }
 state.last_updated_at_utc=now;
 return state;
}
export async function fetchFollowupPool(record,{fetcher=fetch,now}={}){
 if(!validRecord(record)||!Number.isFinite(moment(now)))throw Error('INVALID_POOL_IDENTITY');
 const url='https://api.geckoterminal.com/api/v2/networks/'+CHAINS[record.chain]+
  '/pools/'+encodeURIComponent(record.pool_address);
 const response=await fetcher(url,{headers:{accept:'application/json','user-agent':'MemeSniperResearchFollowups/1.0'},
  signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!response?.ok){const e=Error('FOLLOWUP_PROVIDER_UNAVAILABLE');e.status=response?.status;throw e}
 const json=await response.json(),raw=json?.data,att=raw?.attributes;
 const rawToken=raw?.relationships?.base_token?.data?.id;
 if(typeof rawToken!=='string'||!rawToken.startsWith(CHAINS[record.chain]+'_')||
    !att||candidateId(record.chain,rawToken.slice(CHAINS[record.chain].length+1),att.address)!==record.candidate_id)
   throw Error('FOLLOWUP_POOL_IDENTITY_MISMATCH');
 const price=finiteOrNull(att.base_token_price_usd);
 if(!validPrice(price))throw Error('FOLLOWUP_NO_VALID_PRICE');
 return observation({price_usd:price,liquidity_usd:finiteOrNull(att.reserve_in_usd),
  volume_m5_usd:finiteOrNull(att.volume_usd?.m5),
  buys_m5:finiteOrNull(att.transactions?.m5?.buys),
  sells_m5:finiteOrNull(att.transactions?.m5?.sells)},now);
}
export async function runFollowups(snapshot,{filename,fetcher=fetch,now=snapshot?.published_at_utc}={}){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('ABSOLUTE_RESEARCH_FILE_REQUIRED');
 let current=emptyFollowupState();
 try{
  const bytes=await readFile(filename);
  if(bytes.length>MAX_FILE_BYTES)throw Error('RESEARCH_TRACKER_LIMIT');
  current=JSON.parse(bytes.toString('utf8'));
 }catch(e){if(e.code!=='ENOENT')throw e}
 const {state,admitted,omitted}=selectFollowupCandidates(current,snapshot,{now});
 const pending=dueFollowups(state,{now});
 let succeeded=0,failed=0;
 // Eight public read-only requests maximum per 2-minute cycle, without retry bursts.
 const checked=await Promise.all(pending.map(async r=>{
  try{return {id:r.candidate_id,obs:await fetchFollowupPool(r,{fetcher,now})}}
  catch(e){return {id:r.candidate_id,error:errCode(e)}}
 }));
 const byId=new Map(state.records.map(r=>[r.candidate_id,r]));
 for(const c of checked){
  const r=byId.get(c.id);if(!r)continue;
  r.last_poll_at_utc=now;r.check_count++;
  if(c.obs){r.observations.push(c.obs);succeeded++}
  else{r.check_errors++;r.last_error=c.error;failed++}
 }
 finishFollowupState(state,{now});
 const output=JSON.stringify(state);
 if(Buffer.byteLength(output)>MAX_FILE_BYTES)throw Error('RESEARCH_TRACKER_LIMIT: no observations overwritten');
 await mkdir(path.dirname(filename),{recursive:true});
 const tmp=filename+'.tmp-'+process.pid;
 await writeFile(tmp,output+'\n','utf8');
 await rename(tmp,filename);
 return {schema:'memecoin_followups_status.v1',paper_only:true,actionable:false,
  monitored_active:state.records.filter(r=>!r.completed_at_utc).length,
  completed:state.records.filter(r=>r.completed_at_utc).length,
  cohort_study:summarizeCohorts(state.records),
  admitted,omitted_capacity:omitted,checked:checked.length,
  followup_ok:succeeded,followup_failed:failed,
  disclaimer:'Selected subset only, indicative pool prices, no verified sellability or trade fills'};
}
