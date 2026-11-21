// Deterministic time-travel-safe research replay. Reconstructed source is NOT proof
// the 2026 GPT dots really found a pool at the specified time.
const timestamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const iso=x=>new Date(x).toISOString();
export function replayFirstScanMemory({date,pools=[],modelScans=[]}={}){
 const start=Date.parse(date+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(start)||!Array.isArray(pools))throw Error('BAD_REPLAY_INPUT');
 const minute=60000,hour=3600000,known=new Map(),rows=[],seenInitial=new Set();
 let lastTotal=0;
 for(let h=0;h<24;h++){
  const tick=start+h*hour,discoverAt=tick+15*minute,decisionAt=tick+35*minute;
  const firstScan=h===0,added=[],updated=[],sourceGaps=[],firstRunBackfill=[];
  for(const p of pools){
   const created=timestamp(p.pool_created_at_utc),id=p.id;
   if(!id||created===null||!Array.isArray(p.candles)){sourceGaps.push({id:id||null,reason:'MISSING_POOL_CREATION_OR_TAPE'});continue;}
   if(created>discoverAt)continue;
   // Reconstructed closed candle available no earlier than its close + 60s.
   const usable=p.candles.filter(c=>{
    const t=timestamp(c.known_no_earlier_than_utc);
    return t!==null&&t+minute<=discoverAt&&t>=created
      &&typeof c.close_usd==='number'&&c.close_usd>0;
   }).sort((a,b)=>timestamp(a.known_no_earlier_than_utc)-timestamp(b.known_no_earlier_than_utc));
   const old=known.get(id),oldCount=old?.candle_count||0;
   const row={id,chain:p.chain||null,symbol:p.symbol||null,created_at_utc:iso(created),
    discovered_in_model_at_utc:old?.discovered_in_model_at_utc||iso(discoverAt),
    known_at_dot2_utc:iso(discoverAt),candle_count:usable.length,
    oldest_closed_candle_at_utc:usable[0]?.known_no_earlier_than_utc||null,
    latest_closed_candle_at_utc:usable.at(-1)?.known_no_earlier_than_utc||null,
    years_of_history_access_allowed:true,source_class:'RETROSPECTIVE_HINDSIGHT_SELECTED_POOL_NOT_REAL_DOT2_DISCOVERY'};
   known.set(id,row);
   if(!old){added.push(id);if(firstScan){firstRunBackfill.push({id,known_previously_closed_candles:usable.length});seenInitial.add(id);}}
   else if(usable.length>oldCount){updated.push({id,added_closed_candles:usable.length-oldCount});}
   if(usable.length<oldCount)throw Error('HISTORICAL_MEMORY_LOSS');
  }
  const knowledge=[...known.values()];
  const total=knowledge.reduce((s,p)=>s+p.candle_count,0);
  if(total<lastTotal)throw Error('MEMORY_REGRESSION');
  lastTotal=total;
  const realScans=Array.isArray(modelScans)?modelScans:[];
  const model=realScans[h]||{decisions:[]};
  const decisions=Array.isArray(model.decisions)?model.decisions:[];
  rows.push({scan:h+1,at_utc:iso(decisionAt),
   germany_mesz:iso(decisionAt+2*hour).slice(11,16),
   dot2_at_utc:iso(discoverAt),
   phase:firstScan?'FIRST_RUN_HISTORICAL_BACKFILL_AS_OF_TIME':'INCREMENTAL_UPDATE_ONLY',
   first_run_historical_backfill_pools:firstRunBackfill.length,
   added_pool_ids:added,updated_pool_ids:updated,
   newly_appeared_count:added.length,
   already_known_at_scan_start:known.size-added.length,
   retained_pool_count:known.size,
   total_known_prior_closed_candles:total,
   earliest_usable_historical_candle_utc:knowledge.map(x=>x.oldest_closed_candle_at_utc).filter(Boolean).sort()[0]||null,
   oldest_source_age_limit_minutes:null, source_gaps:sourceGaps,
   dot1:'FORCED_24_RESEARCH_SCANS_NOT_AUTONOMOUS_GPT_CADENCE',
   dot2:'HINDSIGHT_MODEL_DISCOVERY_ASSUMPTION_NOT_ORIGINAL_CAPTURE',
   dot3:'NO_ORIGINAL_CONCURRENT_RISK_OR_SELLABILITY_EVIDENCE',
   dot4:'RESEARCH_MODEL_ONLY_NO_REAL_PAPER_ORDER',
   dot5:'NO_HISTORIC_CLIENT_RECEIPT',
   modeled_buys:decisions.filter(d=>d.action==='BUY_EXPERIMENT').length,
   modeled_sells:decisions.filter(d=>d.action==='SELL_EXPERIMENT').length,
   modeled_watches:decisions.filter(d=>d.action==='WATCH_EXPERIMENT').length,
   modeled_holds:decisions.filter(d=>d.action==='HOLD_EXPERIMENT').length,
   all_historical_dot_buys:0,all_historical_dot_sells:0,
   confirmed_paper_fills:0,
   retained_candidates:knowledge.map(x=>({id:x.id,symbol:x.symbol,known_closed_candles:x.candle_count,
    oldest_closed_candle_at_utc:x.oldest_closed_candle_at_utc}))});
 }
 return {schema:1,kind:'R29_FIRST_RUN_THEN_23_INCREMENTAL_SCANS',date,
  source_type:'HINDSIGHT_SELECTED_POOL_TAPES_WITH_TIME_GATES',
  historical_discovery_verified:false,
  actual_historical_client_fills:0,actual_historical_orders:0,
  initial_pool_ids:[...seenInitial],
  cumulative_pool_ids:[...known.keys()],
  total_cumulative_pool_count:known.size,
  first_scan_count:1,incremental_scan_count:23,
  steps:rows,policy:[
   'Unlimited retrospective context within actually present evidence',
   'Pool created after scan cannot be known before that scan',
   'Candle close plus 60 seconds must be <= Dot2 observation time',
   'Prior memory does not reset at midnight or each scan',
   'Selected post-event pool identities are NOT actual historical discovery']};
}
