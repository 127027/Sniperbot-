import {preparationRequestKey} from './r29-preparation-queue.mjs';
export const FIRST_TICK='2026-10-12T00:00:00Z';
const HOUR=3600000,cutoff=Date.parse(FIRST_TICK);
export function archiveRequest(hour){return {provider:'SHRINE_ARCHIVE',url:'https://replay.shrine.trade/pump/'+hour.slice(0,10).replaceAll('-','/')+'/'+hour.slice(11,13)+'.jsonl.zst'};}
export function preparationPlanHours(plan){
 const start=Date.parse(plan.start_utc),end=Date.parse(plan.end_exclusive_utc);
 if(plan.kind!=='R29_PREPARATION_HOUR_PLAN'||!Number.isFinite(start)||start%HOUR||end!==cutoff||start>=end||end-start>168*HOUR||plan.priority!=='NEAREST_FIRST'||plan.no_orders!==true)throw Error('INVALID_PLAN');
 return Array.from({length:(end-start)/HOUR},(_,i)=>new Date(end-(i+1)*HOUR).toISOString().replace('.000Z','Z'));
}
export function selectPreparationHours(plan,queue,nowUtc,{maxHours=2}={}){
 const at=Date.parse(nowUtc);if(!Number.isFinite(at)||!Number.isInteger(maxHours)||maxHours<1||maxHours>3)throw Error('INVALID_BATCH');
 const states=preparationPlanHours(plan).map(hour=>{
  const r=queue.requests[preparationRequestKey(archiveRequest(hour))];
  let status='READY';if(r?.status==='CAPTURED')status='CAPTURED';else if(r?.status==='IN_FLIGHT')status='RECOVERY_REQUIRED';else if(r?.attempts>=3)status='REVIEW_REQUIRED';else if(Date.parse(r?.retry_not_before_utc)>at||Date.parse(queue.providers.SHRINE_ARCHIVE?.cooldown_until_utc)>at)status='COOLDOWN';
  return {hour_utc:hour,status,attempts:r?.attempts||0};
 });
 return {states,selected:states.filter(x=>x.status==='READY').slice(0,maxHours).map(x=>x.hour_utc),complete:states.every(x=>x.status==='CAPTURED')};
}
// The cumulative index preserves every observed identity and a per-hour source reference.
// No summing per-hour unique wallets, no merging different pools or quote currencies.
export function buildCumulativePreparation({legacy,earlier,hours}){
 const map=new Map(),pools=new Map(),cutoffMs=Date.parse(FIRST_TICK);
 const add=m=>{if(!map.has(m))map.set(m,{mint:m,legacy_feature:null,earlier_model_candidate:null,pool_keys:new Set()});return map.get(m);};
 for(const c of legacy.candidates)add(c.mint).legacy_feature=c;
 for(const c of earlier.preparation.candidates)add(c.mint).earlier_model_candidate=c;
 const used=new Set(),sources=[];
 for(const h of hours){
  const {manifest,projection,recentMinutes}=h;
  if(!manifest.usable||!manifest.stream_complete||manifest.hour_utc!==projection.hour_utc||Date.parse(manifest.hour_utc)>=cutoffMs||used.has(manifest.hour_utc)||!Array.isArray(recentMinutes)||projection.pools.length!==manifest.pool_count)throw Error('INVALID_OR_DUPLICATE_HOUR');
  used.add(manifest.hour_utc);sources.push({hour_utc:manifest.hour_utc,manifest_path:h.path,archive_sha256:manifest.archive_sha256,accepted:manifest.counts.accepted,minute_observations:manifest.minute_observations});
  const start=Date.parse(manifest.hour_utc),keys=new Set();
  for(const p of projection.pools){
   const k=[p.chain,p.mint,p.pool,p.quote_mint].join(':');if(keys.has(k)||p.chain!=='solana'||Date.parse(p.first_capture_utc)<start||Date.parse(p.last_capture_utc)>=start+HOUR||Date.parse(p.last_capture_utc)+60000>=cutoffMs)throw Error('INVALID_POOL_OBSERVATION');
   keys.add(k);add(p.mint).pool_keys.add(k);
   let r=pools.get(k);if(!r)r={key:k,chain:p.chain,mint:p.mint,pool:p.pool,quote_mint:p.quote_mint,hours:[],reported_buys:0,reported_sells:0,recent_buys:0,recent_sells:0,latest:null};
   r.hours.push(manifest.hour_utc);r.reported_buys+=p.buys;r.reported_sells+=p.sells;
   if(!r.latest||Date.parse(p.last_capture_utc)>Date.parse(r.latest.last_capture_utc))r.latest=p;
   pools.set(k,r);
  }
  for(const m of recentMinutes){
   const k=['solana',m.mint,m.pool,m.quote_mint].join(':'),t=Date.parse(m.minute_utc);
   if(!keys.has(k)||t<cutoffMs-600000||t>=cutoffMs-60000||Date.parse(m.last_capture_utc)+60000>=cutoffMs)throw Error('INVALID_RECENT_MINUTE');
   const r=pools.get(k);r.recent_buys+=m.buys;r.recent_sells+=m.sells;
  }
 }
 const candidates=[...map.values()].map(r=>({mint:r.mint,legacy_feature:r.legacy_feature,earlier_model_candidate:r.earlier_model_candidate,pool_keys:[...r.pool_keys].sort(),has_recent_two_sided_swap_evidence:[...r.pool_keys].some(k=>{const p=pools.get(k);return p.recent_buys>0&&p.recent_sells>0;}),trade_input_verified:false})).sort((a,b)=>a.mint.localeCompare(b.mint));
 return {kind:'R29_CUMULATIVE_PREPARATION_INDEX',tick_utc:FIRST_TICK,sources:sources.sort((a,b)=>a.hour_utc.localeCompare(b.hour_utc)),candidates,pools:[...pools.values()].sort((a,b)=>a.key.localeCompare(b.key)),source_market_scope_complete:false,prepared_trade_inputs:0,orders:0};
}
