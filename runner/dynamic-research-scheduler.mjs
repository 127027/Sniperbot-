// Adaptive R29 *research* cadence: 1/4/12/24 reviews per UTC day, no orders.
// Existing two-minute public market collector remains independent of review frequency.
// All source facts are first-observed, not proof of historical completeness or safety.
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';

export const ADAPTIVE_FREQUENCIES=Object.freeze([1,4,12,24]);
const HOUR=3600000,DAY=24*HOUR;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const ms=s=>typeof s==='string'&&s.endsWith('Z')?Date.parse(s):NaN;
const utc=n=>new Date(n).toISOString();
const day=n=>utc(n).slice(0,10);
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const safeId=s=>typeof s==='string'&&/^(solana|base|eth|bsc):[^ \r\n]{4,200}$/.test(s);
const researchOnly=s=>s?.paper_only===true&&s?.actionable===false;

export function adaptiveActivity(snapshot,{now=Date.parse(snapshot?.published_at_utc)}={}){
  if(snapshot?.schema!=='research_market_snapshot.v1'||!researchOnly(snapshot)||
    !Array.isArray(snapshot.candidates)||snapshot.candidates.length>200||
    !Number.isFinite(now)||ms(snapshot.published_at_utc)!==now)
    throw Error('ADAPTIVE_UNTRUSTED_RESEARCH_INPUT');
  const sourceAvailable=snapshot.collection_status==='OBSERVED_OR_PARTIAL';
  const candidates=snapshot.candidates.filter(c=>safeId(c.candidate_id)&&
    c.promotion_biased!==true&&finite(c.liquidity_usd)&&c.liquidity_usd>=10000);
  const fresh=candidates.filter(c=>Number.isFinite(ms(c.pool_created_at_utc))&&
    ms(c.pool_created_at_utc)<=now&&now-ms(c.pool_created_at_utc)<=HOUR);
  const alerts=new Map();
  for(const a of snapshot.research_alerts||[]){
    if(a?.event_type!=='MARKET_ACCELERATION'||!researchOnly(a)||
       !safeId(a.candidate_id)||!Number.isFinite(ms(a.observed_at_utc))||
       ms(a.observed_at_utc)>now||now-ms(a.observed_at_utc)>HOUR)continue;
    // Never count a stale, duplicate or paid-promotion alert as fresh demand.
    alerts.set(a.event_id,a);
  }
  const independentAlertPools=new Set([...alerts.values()].map(a=>a.candidate_id)).size;
  const youngPools=new Set(fresh.map(c=>c.candidate_id)).size;
  // Explicitly a non-trained operational heuristic, NOT a probability or score.
  let frequency=1,reason='QUIET_MARKET_OR_MISSING_MARKET_EVIDENCE';
  if(sourceAvailable){
    if(independentAlertPools>=4 && youngPools>=3){
      frequency=24;reason='MULTIPLE_DISTINCT_ACCELERATION_AND_YOUNG_POOLS';
    }else if(independentAlertPools>=2 || (independentAlertPools>=1&&youngPools>=3)){
      frequency=12;reason='STRONG_DISTINCT_ACCELERATION';
    }else if(independentAlertPools>=1 || youngPools>=3){
      frequency=4;reason='EARLY_POOL_ACTIVITY_OR_ONE_ACCELERATION';
    }
  }
  return {frequency_per_day:frequency,reason,first_hour_pool_count:youngPools,
    independently_observed_accelerating_pool_count:independentAlertPools,
    source_available:sourceAvailable,signals_unverified:true,
    social_independently_verified:false};
}

export function planAdaptiveReview(snapshot,previous=null){
  const now=ms(snapshot?.published_at_utc);
  const activity=adaptiveActivity(snapshot,{now});
  if(previous!==null&&(previous?.schema!=='sniper_r29_dynamic_research_status.v1'||
    !Number.isFinite(ms(previous.first_seen_at_utc))||
    !Number.isFinite(ms(previous.last_review_at_utc))||
    ms(previous.last_review_at_utc)>now||
    !Number.isInteger(previous.day_review_count)||previous.day_review_count<1||
    previous.day_review_count>24))
    throw Error('ADAPTIVE_INVALID_PREVIOUS_STATE_OR_CLOCK');
  const first=previous?.first_seen_at_utc||utc(now);
  const phaseDay=Math.floor((now-ms(first))/DAY);
  const phase=phaseDay<30?'OBSERVATION_WARMUP_30_DAYS':
    phaseDay<60?'LOCKED_FORWARD_TEST_30_DAYS':'ONGOING_FORWARD_EVALUATION';
  const today=day(now);
  const dayCount=previous?.day_utc===today?previous.day_review_count:0;
  const due=dayCount===0||
    (dayCount<24&&now-ms(previous.last_review_at_utc)>=DAY/activity.frequency_per_day);
  const nextDue=dayCount===0?now:
    Math.min(Date.parse(today+'T00:00:00.000Z')+DAY,
      ms(previous.last_review_at_utc)+DAY/activity.frequency_per_day);
  return {schema:'sniper_r29_dynamic_research_plan.v1',due,
    at_utc:utc(now),day_utc:today,day_review_count:dayCount,
    first_seen_at_utc:first,experiment_day_index:phaseDay,
    experiment_phase:phase,next_due_at_utc:utc(Math.max(now,nextDue)),
    ...activity};
}

function boundedCandidates(snapshot){
  // Deterministic fixed cap plus two controls: collect losers too.
  const valid=snapshot.candidates.filter(c=>safeId(c.candidate_id)&&
    finite(c.price_usd)&&c.price_usd>0&&finite(c.liquidity_usd));
  const unique=[...new Map(valid.map(c=>[c.candidate_id,c])).values()];
  const rank=(a,b)=>(b.volume_m5_usd||0)-(a.volume_m5_usd||0)||
    a.candidate_id.localeCompare(b.candidate_id);
  const ordinary=unique.filter(c=>!c.promotion_biased).sort(rank);
  const chosen=ordinary.slice(0,10).map(c=>({c,selection:'MARKET_ACTIVITY_SAMPLE'}));
  const selected=new Set(chosen.map(x=>x.c.candidate_id));
  // Independent deterministic controls not selected by apparent performance.
  const controls=unique.filter(c=>!selected.has(c.candidate_id))
    .sort((a,b)=>hash(a.candidate_id).localeCompare(hash(b.candidate_id)))
    .slice(0,2);
  chosen.push(...controls.map(c=>({c,selection:'DETERMINISTIC_CONTROL'})));
  return chosen.map(({c,selection})=>({
    candidate_id:c.candidate_id,chain:c.chain,
    token_address:c.token_address,pool_address:c.pool_address,
    selection,price_usd:c.price_usd,liquidity_usd:c.liquidity_usd,
    volume_m5_usd:finite(c.volume_m5_usd)?c.volume_m5_usd:null,
    buys_m5:finite(c.buys_m5)?c.buys_m5:null,
    sells_m5:finite(c.sells_m5)?c.sells_m5:null,
    promo_bias:c.promotion_biased===true,
    source_names:[c.source].filter(x=>typeof x==='string').slice(0,1),
    contract_security:'UNKNOWN',sellability:'UNKNOWN',
    gpt_action:'NO_ORDER_UNVERIFIED_SECURITY',
    score_0_100:null,expected_gain_probability:null
  }));
}
export function buildAdaptiveReview(snapshot,plan){
  if(!plan?.due||plan.at_utc!==snapshot?.published_at_utc)
    throw Error('ADAPTIVE_NOT_DUE_OR_TIME_MISMATCH');
  const candidates=boundedCandidates(snapshot);
  const body={schema:'sniper_r29_dynamic_research_review.v1',
    paper_only:true,actionable:false,at_utc:plan.at_utc,
    cadence_per_day:plan.frequency_per_day,activity_reason:plan.reason,
    experiment_phase:plan.experiment_phase,experiment_day_index:plan.experiment_day_index,
    capture_hash:hash(snapshot),universe_complete:false,
    contract_security_verified:false,sellability_verified:false,
    quote_executable:false,trained_predictor:false,
    candidates,missing_sources:['COMPLETE_NEW_POOL_UNIVERSE',
      'INDEPENDENT_SECURITY_PROOFS','ORGANIC_SOCIAL_PROOFS',
      'WALLET_CLUSTER_VALIDATION','EXECUTABLE_EXIT_QUOTE'],
    validated_buy_count:0,validated_sell_count:0,
    simulated_pnl:null,
    decision:'OBSERVE_ONLY_EVIDENCE_GAP',
    outcome_status:'PENDING_FUTURE_OBSERVATION_NOT_TRADE',
    note:'Research-only predecision: no signed paper orders, real orders or wallet data'};
  return {...body,sha256_payload:hash(body)};
}

export async function adaptiveResearchTick(snapshot,{folder,now=snapshot?.published_at_utc}={}){
  if(typeof folder!=='string'||!path.isAbsolute(folder)||
    now!==snapshot?.published_at_utc)throw Error('ADAPTIVE_INVALID_LOCAL_PATH_OR_TIME');
  const statusFile=path.join(folder,'status.json');
  let previous=null;
  try{
    const bytes=await readFile(statusFile);
    if(bytes.length>20000)throw Error('ADAPTIVE_STATUS_TOO_LARGE');
    previous=JSON.parse(bytes.toString('utf8'));
  }catch(e){if(e.code!=='ENOENT')throw e}
  const plan=planAdaptiveReview(snapshot,previous);
  if(!plan.due)return {created:false,plan,review:null};
  const record=buildAdaptiveReview(snapshot,plan);
  const dayFolder=path.join(folder,'reviews',plan.day_utc);
  await mkdir(dayFolder,{recursive:true});
  const basename=plan.at_utc.replace(/[-:.]/g,'')+'-'+record.sha256_payload.slice(0,16)+'.json';
  const filename=path.join(dayFolder,basename);
  const body=JSON.stringify(record,null,2)+'\n';
  try{await writeFile(filename,body,{flag:'wx',mode:0o600});}
  catch(e){
    if(e.code!=='EEXIST')throw e;
    if(await readFile(filename,'utf8')!==body)throw Error('ADAPTIVE_IMMUTABLE_CONFLICT');
    // Recover an interrupted previous write: the immutable review exists but
    // the small status pointer may not yet have been persisted. Continue.
    // A fully completed prior review cannot get here: plan.due=false.
  }
  const status={schema:'sniper_r29_dynamic_research_status.v1',
    paper_only:true,actionable:false,first_seen_at_utc:plan.first_seen_at_utc,
    day_utc:plan.day_utc,day_review_count:plan.day_review_count+1,
    total_review_count:(previous?.total_review_count||0)+1,
    last_review_at_utc:plan.at_utc,frequency_per_day:plan.frequency_per_day,
    next_due_at_utc:utc(Math.min(
      Date.parse(plan.day_utc+'T00:00:00.000Z')+DAY,
      ms(plan.at_utc)+DAY/plan.frequency_per_day)),
    experiment_phase:plan.experiment_phase,experiment_day_index:plan.experiment_day_index,
    last_review_sha256:record.sha256_payload,
    last_review_filename:path.basename(filename),
    recent_candidate_count:record.candidates.length,
    independent_security_verified:false,can_authorize_trades:false,
    real_trading_enabled:false,
    account_balances_included:false,
    method:'FORWARD_FIRST_OBSERVED_FIXED_HEURISTIC_NO_LLM',
    activity_reason:plan.reason};
  const tmp=statusFile+'.tmp-'+process.pid;
  await writeFile(tmp,JSON.stringify(status,null,2)+'\n',{mode:0o600});
  await rename(tmp,statusFile);
  return {created:true,plan,review:record,status,filename};
}
