// V0.7 strictly as-of daily historical replay, public research only.
// The detector receives only data whose verified historical archive capture
// was available by its VIRTUAL DAY. Hindsight articles, workbook winners,
// later ATHs, present-day sites and target identity are excluded.
// NO paper portfolio changes, synthesized 5-Dot votes, BUYs, SELLs or PnL.
import {candidateId} from './research-watchlist.mjs';

const DAY=86400_000;
const isoMs=s=>typeof s==='string'?Date.parse(s):NaN;
const isoDay=ms=>new Date(ms).toISOString().slice(0,10);
const kinds=new Set(['NEWS','SOCIAL_ORIGINAL','TOKEN_LISTING','ONCHAIN_POOL','POOL_MARKET']);
const pos=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
function archiveEvidence(e){
  const p=isoMs(e?.original_published_at_utc);
  const c=isoMs(e?.historical_capture_at_utc);
  // An item appearing on a modern site with an old publication timestamp is
  // NOT independently known to have contained the same text back then.
  if(!Number.isFinite(p)||!Number.isFinite(c)||p>c||
     e.historical_capture_verified!==true)return null;
  const u=e.archive_url;
  if(typeof u!=='string')return null;
  const m=/^https:\/\/web\.archive\.org\/web\/(\d{14})\/(https?:\/\/[^\s]+)$/.exec(u);
  if(!m)return null;
  const digits=m[1];
  const reconstructed=Date.UTC(Number(digits.slice(0,4)),Number(digits.slice(4,6))-1,
   Number(digits.slice(6,8)),Number(digits.slice(8,10)),Number(digits.slice(10,12)),Number(digits.slice(12,14)));
  if(Math.abs(reconstructed-c)>1000)return null;
  return {published:p,captured:c};
}
function poolId(x){
 try{
  if(typeof x?.candidate_id!=='string')return null;
  const id=candidateId(x.chain,x.token_address,x.pool_address);
  return id===x.candidate_id?id:null;
 }catch{return null}
}
function eventProblem(e){
  if(!e||typeof e!=='object'||!kinds.has(e.source_kind))return 'INVALID_OR_UNKNOWN_SOURCE_KIND';
  if(typeof e.source_url!=='string'||!/^https:\/\/[^\s]+$/.test(e.source_url))
    return 'MISSING_PUBLIC_SOURCE_URL';
  if(e.actionable!==false||e.paper_only!==true)return 'UNSAFE_ACTIONABLE_SOURCE';
  if(!Number.isFinite(isoMs(e.original_published_at_utc)))
    return 'MISSING_ORIGINAL_PUBLICATION_TIME';
  if(!archiveEvidence(e))return 'NO_VERIFIED_HISTORICAL_ASOF_CAPTURE';
  if(['ONCHAIN_POOL','POOL_MARKET'].includes(e.source_kind)&&!poolId(e))
    return 'MISSING_EXACT_CHAIN_TOKEN_POOL';
  if(e.source_kind==='POOL_MARKET'&&(!pos(e.price_usd)||!pos(e.liquidity_usd)))
    return 'MISSING_HISTORICAL_MARKET_PRICE_LIQUIDITY';
  return null;
}
function groupSources(events){
  const map=new Map();
  for(const e of events){
    const id=poolId(e);
    if(!id)continue;
    let entry=map.get(id);
    if(!entry){entry={candidate_id:id,chain:e.chain,
      modalities:new Set(),source_hosts:new Set(),pool_seen:false,mark_seen:false};
      map.set(id,entry)}
    entry.modalities.add(e.source_kind);
    try{entry.source_hosts.add(new URL(e.source_url).hostname)}catch{}
    if(e.source_kind==='ONCHAIN_POOL')entry.pool_seen=true;
    if(e.source_kind==='POOL_MARKET')entry.mark_seen=true;
  }
  return [...map.values()].map(c=>({...c,modalities:[...c.modalities].sort(),
    independent_host_count:c.source_hosts.size,source_hosts:undefined}));
}
export function runDailyBlindReplay({scenario_id,window_start_utc,window_end_utc,
 events=[],budget_test_usdc=5000,preferred_test_usdc=50}={}){
 if(typeof scenario_id!=='string'||!/^R[0-9]{2,3}$/.test(scenario_id)||
    !Array.isArray(events)||events.length>5000||
    !pos(budget_test_usdc)||!pos(preferred_test_usdc)||preferred_test_usdc>budget_test_usdc)
   throw Error('INVALID_BLIND_REPLAY_INPUT');
 const start=isoMs(window_start_utc),end=isoMs(window_end_utc);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||
    end-start>90*DAY)throw Error('INVALID_REPLAY_WINDOW');
 // Fixed UTC day boundaries, including start/end dates.
 const first=Math.floor(start/DAY)*DAY,last=Math.floor(end/DAY)*DAY;
 const reasons=new Map();
 const allowed=[];
 for(const e of events){
  const issue=eventProblem(e);
  if(issue)reasons.set(issue,(reasons.get(issue)||0)+1);
  else allowed.push({...e,_available_ms:archiveEvidence(e).captured});
 }
 allowed.sort((a,b)=>a._available_ms-b._available_ms||
   a.source_url.localeCompare(b.source_url));
 const days=[],seen=new Set(),firstDiscovered=new Map();
 for(let day=first;day<=last;day+=DAY){
  const at=Math.min(day+DAY-1,Math.floor(end/DAY)*DAY+DAY-1);
  const available=allowed.filter(e=>e._available_ms<=at);
  const candidates=groupSources(available);
  const ready=candidates.filter(c=>c.pool_seen&&c.mark_seen&&c.independent_host_count>=2);
  for(const c of candidates)if(!seen.has(c.candidate_id)){
   firstDiscovered.set(c.candidate_id,isoDay(day));seen.add(c.candidate_id)}
  days.push({day_utc:isoDay(day),available_archived_events:available.length,
   possible_verified_pool_identities:candidates.length,
   candidates_with_market_and_two_hosts:ready.length,
   research_recommendations:0,
   simulated_buy_orders:0,simulated_sell_orders:0,
   reserved_test_usdc:0,
   execution:'BLOCKED_REAL_VALIDATOR_UNAVAILABLE'});
 }
 const allDays=days.length;
 return {schema:'historical_blind_replay.v1',scenario_id,
  mode:'STRICT_ASOF_PUBLIC_ARCHIVE_ONLY',paper_only:true,actionable:false,
  labels_accessible_to_detector:false,
  total_days:allDays,start_date_utc:isoDay(first),end_date_utc:isoDay(last),
  submitted_evidence:events.length,admitted_historical_captures:allowed.length,
  rejected_evidence:Object.fromEntries([...reasons].sort()),
  first_pool_discovered_at_utc:Object.fromEntries([...firstDiscovered].sort()),
  ever_discovered_pools:firstDiscovered.size,
  paper_buys:0,paper_sells:0,virtual_cash_changed:false,
  budget_test_usdc,preferred_test_usdc,
  daily:days,assessment:'NOT_A_SUCCESSFUL_REAL_TRADING_REPLAY',
  caveat:'Archive capture eligibility is metadata-audited only; archive URLs and source bodies must also be independently fetched and verified to claim a valid original historical as-of backtest.'};
}
export function scoreSealedReplay(replay,truth){
 if(replay?.schema!=='historical_blind_replay.v1'||truth?.scenario_id!==replay.scenario_id)
  throw Error('TRUTH_ENVELOPE_MISMATCH');
 // Critical: ground truth is passed ONLY after replay completes; the detector
 // must never receive the target symbol, name, launch time or outcome.
 const valid=poolId(truth);
 const first=valid?replay.first_pool_discovered_at_utc[valid]||null:null;
 return {scenario_id:replay.scenario_id,case_name:truth.case_name,
  target_identity_verifiable:!!valid,
  detected_target_at_utc:first,
  timely_detection_verified:false,
  simulated_buy_verified:false,simulated_sell_verified:false,
  status:'UNTESTABLE_AS_HISTORICAL_TRADING_PERFORMANCE',
  primary_blocker:truth.primary_blocker||
    'ARCHIVED_ASOF_AND_MARKET_QUOTE_COHORT_MISSING',
  paper_only:true,actionable:false};
}
