// Real forward-only research; ALL captured pools, positive and negative labels.
// This module does not look at retrospective winner spreadsheets and NEVER trades.
import {canonicalChain,tokenValid,poolValid} from './market-evidence.mjs';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const key=(chain,pool)=>chain+':'+(chain==='solana'?pool:String(pool).toLowerCase());
const number=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const rel=(now,before)=>number(now)!==null&&number(before)!==null&&before>0?(now/before-1)*100:null;
// Strict separation of forward observations and retrospective winner sources.
// Explicit source classes and future winner tags are forbidden even when
// injected by a caller with plausible but false early timestamps.
const oracleOrRetro=x=>!!x&&typeof x==='object'&&(
 x.source_class==='POST_EVENT_ORACLE'||x.source_class==='RETRO_ASOF_RECONSTRUCTION'
 ||x.source_provider==='POST_EVENT_ORACLE'||x.provenance==='POST_EVENT_ORACLE'
 ||x.provenance==='RETRO_ASOF_RECONSTRUCTION'
 ||x.selected_from_future_winner_list===true
 ||Object.hasOwn(x,'future_winner_label')
 ||Object.hasOwn(x,'reported_gain_pct')
 ||Object.hasOwn(x,'post_event_rank')
 ||(typeof x.outcome_status==='string'
   &&!['NOT_YET_MEASURED','PENDING'].includes(x.outcome_status)));
export function makeCaptureObservationBatch({capturedAtUtc,sourcePath,geckoCandidates=[],dexFallbackCandidates=[]}={}){
 const time=ms(capturedAtUtc);
 if(time===null||!sourcePath?.startsWith('research/feeds/')||!Array.isArray(geckoCandidates)||!Array.isArray(dexFallbackCandidates))
  throw Error('INVALID_PROSPECTIVE_BATCH');
 const merged=new Map(),errors=[];
 for(const c of [...geckoCandidates.map(c=>({...c,provider:'GECKOTERMINAL'})),
  ...dexFallbackCandidates.map(c=>({...c,provider:'DEXSCREENER'}))]){
  if(oracleOrRetro(c)){errors.push('POST_EVENT_OR_RETRO_INPUT_QUARANTINED');continue;}
  const chain=canonicalChain(c.chain),pool=c.pool,stamp=ms(c.observed_at_utc||capturedAtUtc);
  if(!chain||!poolValid(chain,pool,c.pool_kind)||stamp===null||stamp>time){
    errors.push('INVALID_CHAIN_POOL_OR_TIME');continue;
  }
  const id=key(chain,pool),price=number(c.observed_price_usd??c.price_usd),
   liquidity=number(c.liquidity_usd),volume=number(c.volume_24h_usd);
  const row={key:id,chain,pool,pool_kind:c.pool_kind||null,contract:tokenValid(chain,c.contract)?c.contract:null,
   symbol:c.symbol||null,observed_at_utc:new Date(stamp).toISOString(),
   captured_at_utc:new Date(time).toISOString(),source_path:sourcePath,
   source_provider:c.provider,
   source_raw_path:typeof c.source_raw_path==='string'&&c.source_raw_path.startsWith('research/feeds/')
     ?c.source_raw_path:null,
   source_raw_sha256:typeof c.source_raw_sha256==='string'
      &&/^[a-f0-9]{64}$/.test(c.source_raw_sha256)?c.source_raw_sha256:null,
   independently_verified_provider_quote_asof_utc:null,
   provider_quote_origin_time_verified:false,
   price_usd:price!==null&&price>0?price:null,
   liquidity_usd:liquidity!==null&&liquidity>=0?liquidity:null,
   volume_24h_usd:volume!==null&&volume>=0?volume:null,
   source_page:c.source_page??null,
   outcome_status:'NOT_YET_MEASURED',buy_eligible:false};
  // Do not silently mix independent provider numbers as one quote. The first
  // source wins; raw provider responses are retained for separate risk review.
  if(!merged.has(id))merged.set(id,row);
 }
 const observations=[...merged.values()].sort((a,b)=>a.key.localeCompare(b.key));
 return {schema:1,kind:'R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS',mode:'PAPER_RESEARCH_ONLY',
  captured_at_utc:new Date(time).toISOString(),source_path:sourcePath,
  source_policy:'ALL_VALID_CAPTURED_POOLS_UNLABELED_WINNERS_OR_LOSERS',
  observations,counts:{valid:observations.length,full_contracts:observations.filter(x=>x.contract).length,
   with_price:observations.filter(x=>x.price_usd!==null).length,
   with_liquidity:observations.filter(x=>x.liquidity_usd!==null).length,
   missing_price:observations.filter(x=>x.price_usd===null).length},
  errors,orders_published:0};
}
export function scoreAsOf({batches=[],asOfUtc,maxCandidates=100,maxLatestCaptureAgeMinutes=120,
 maxPriceObservationGapMinutes=240}={}){
 const t=ms(asOfUtc);
 if(t===null||!Array.isArray(batches)||!Number.isInteger(maxCandidates)||maxCandidates<1
   ||!Number.isInteger(maxLatestCaptureAgeMinutes)||maxLatestCaptureAgeMinutes<5
   ||maxLatestCaptureAgeMinutes>1440||!Number.isInteger(maxPriceObservationGapMinutes)
   ||maxPriceObservationGapMinutes<5||maxPriceObservationGapMinutes>1440)
   throw Error('INVALID_ASOF_SCORE');
 const rows=new Map();
 for(const batch of batches){
   const bTime=ms(batch?.captured_at_utc);
   if(batch?.kind!=='R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS'||bTime===null||bTime>t
     ||oracleOrRetro(batch))continue;
   for(const o of batch.observations||[]){
     const at=ms(o.observed_at_utc),capture=ms(o.captured_at_utc),
      available=o.available_at_utc==null?capture:ms(o.available_at_utc);
     if(oracleOrRetro(o)||at===null||capture===null||available===null
      ||at>t||capture>t||available>t||at>capture||available<capture||!o.key)continue;
     if(!rows.has(o.key))rows.set(o.key,[]);
     rows.get(o.key).push(o);
   }
 }
 const candidates=[];
 for(const [id,list] of rows){
   list.sort((a,b)=>ms(a.captured_at_utc)-ms(b.captured_at_utc));
   // Two distinct capture times needed for a real observed price delta;
   // first sightings must remain WATCH_COVERAGE_ONLY.
   const uniqueByHttpCaptureTime=[...new Map(list.map(x=>[x.captured_at_utc,x])).values()];
   // Two network HTTP200 replies can be exact copies of a cached quote.
   // When archived raw SHA is known, identical bytes from the SAME
   // provider cannot count as a new independent price observation.
   // Legacy historic batches without SHA are retained for research, but
   // must never be described as independently verified quote-time data.
   const seenOriginalRaw=new Set();
   const unique=uniqueByHttpCaptureTime.filter(x=>{
     const fingerprint=x.source_raw_sha256&&/^[a-f0-9]{64}$/.test(x.source_raw_sha256)
       ?String(x.source_provider)+'|'+x.source_raw_sha256:null;
     if(!fingerprint)return true;
     if(seenOriginalRaw.has(fingerprint))return false;
     seenOriginalRaw.add(fingerprint);
     return true;
   });
   const duplicateRawCapturesSuppressed=uniqueByHttpCaptureTime.length-unique.length;
   const newest=unique.at(-1);
   const newestAt=ms(newest.captured_at_utc);
   // An ancient price movement is useful history, never an active breakout.
   // Independent of the 4/8/12/24 GPT review budget, a fresh MARKET capture
   // must arrive within this bounded research TTL before the pool is ranked.
   const lastCaptureAgeMinutes=(t-newestAt)/60000;
   const captureFresh=lastCaptureAgeMinutes>=0
      &&lastCaptureAgeMinutes<=maxLatestCaptureAgeMinutes;
   const prior=unique.slice(0,-1).reverse().find(x=>
     x.price_usd!==null&&newest.price_usd!==null&&
     newestAt-ms(x.captured_at_utc)>=300000);
   // DEX pair rechecks often provide fresh price and liquidity but NO volume
   // observation. Carry forward the last *previously observed*, same-pool
   // volume for RESEARCH ranking only, and expire it after four hours.
   // An old same-time volume is not proof of a volume change.
   // A many-hours-old reference can be a historical feature, but does not
   // prove a current acceleration. Keep the old delta for diagnosis only.
   const priorGapMinutes=prior?(newestAt-ms(prior.captured_at_utc))/60000:null;
   const priorGapCurrent=priorGapMinutes!==null
     &&priorGapMinutes>=5&&priorGapMinutes<=maxPriceObservationGapMinutes;
   const volumeSource=[...unique].reverse().find(x=>
     x.volume_24h_usd!==null&&ms(x.captured_at_utc)<=newestAt
     &&newestAt-ms(x.captured_at_utc)<=4*3600000);
   const effectiveVolume=volumeSource?.volume_24h_usd??null;
   const move=prior?rel(newest.price_usd,prior.price_usd):null;
   const deltaVol=prior&&volumeSource?.captured_at_utc!==prior.captured_at_utc
     ?rel(effectiveVolume,prior.volume_24h_usd):null;
   const deltaLiquidity=prior?rel(newest.liquidity_usd,prior.liquidity_usd):null;
   const full=!!newest.contract&&tokenValid(newest.chain,newest.contract);
   const baseReady=captureFresh&&priorGapCurrent&&full&&prior&&move!==null
      &&newest.liquidity_usd!==null&&newest.liquidity_usd>=5000
      &&effectiveVolume!==null;
   const score=baseReady?
      Math.max(-50,Math.min(50,move))*0.6
      +Math.max(-100,Math.min(100,deltaVol??0))*0.2
      +Math.max(-100,Math.min(100,deltaLiquidity??0))*0.1
      +Math.log10(Math.max(1,newest.liquidity_usd))*2:null;
   candidates.push({key:id,chain:newest.chain,pool:newest.pool,pool_kind:newest.pool_kind||null,contract:newest.contract,
     symbol:newest.symbol,last_capture_at_utc:newest.captured_at_utc,
     latest_observed_liquidity_usd:newest.liquidity_usd,
     evidence_batches:unique.length,
     distinct_http_capture_times:uniqueByHttpCaptureTime.length,
     duplicated_original_provider_raw_captures_suppressed:duplicateRawCapturesSuppressed,
     independent_provider_quote_time_verified:false,
     latest_capture_age_minutes:Math.round(lastCaptureAgeMinutes*100)/100,
     latest_capture_is_recent: captureFresh,
     research_max_capture_age_minutes:maxLatestCaptureAgeMinutes,
     prior_price_capture_at_utc:prior?.captured_at_utc??null,
     prior_price_observation_gap_minutes:priorGapMinutes===null?null:Math.round(priorGapMinutes*100)/100,
     prior_price_gap_within_current_window:priorGapCurrent,
     research_max_observation_gap_minutes:maxPriceObservationGapMinutes,
     observed_price_change_pct:move,observed_volume_24h_change_pct:deltaVol,
     observed_liquidity_change_pct:deltaLiquidity,
     research_effective_volume_24h_usd:effectiveVolume,
     research_volume_source_at_utc:volumeSource?.captured_at_utc??null,
     carried_forward_volume_for_research:!!volumeSource&&volumeSource.captured_at_utc!==newest.captured_at_utc,
     provider_volume_and_price_are_not_independent_execution_quotes:true,
     score,
     status:!captureFresh?'WATCH_STALE_LAST_CAPTURE':
       prior&&!priorGapCurrent?'WATCH_PRICE_OBSERVATION_GAP':
       baseReady?'RESEARCH_PRIORITY_ONLY_NOT_RISK_APPROVED':'WATCH_INSUFFICIENT_REPEATED_EVIDENCE',
     risk_eligible:false,trade_authorized:false,
     oldest_signal_at_utc:prior?.captured_at_utc??null});
 }
 candidates.sort((a,b)=>(b.score??-Infinity)-(a.score??-Infinity)||a.key.localeCompare(b.key));
 return {schema:1,kind:'R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING',
  as_of_utc:new Date(t).toISOString(),candidates:candidates.slice(0,maxCandidates),
  counts:{observed_unique_pools:candidates.length,research_rankable:candidates.filter(x=>x.score!==null).length,
   stale_last_captures:candidates.filter(x=>!x.latest_capture_is_recent).length,
   long_price_observation_gaps:candidates.filter(x=>x.latest_capture_is_recent
     &&x.status==='WATCH_PRICE_OBSERVATION_GAP').length,
   insufficient_repeated_data:candidates.filter(x=>x.score===null&&x.latest_capture_is_recent
     &&x.status!=='WATCH_PRICE_OBSERVATION_GAP').length},
  contamination_protection:'NO_WINNER_LIST_NO_FUTURE_CAPTURES_NO_RISK_APPROVAL',orders:0};
}
export function labelAfterHorizon({batches=[],decisionAtUtc,horizonHours=24,toleranceMinutes=60,
 minimumOutcomeLiquidityUsd=5000}={}){
 const start=ms(decisionAtUtc),end=start+horizonHours*3600000;
 if(start===null||!Number.isInteger(horizonHours)||horizonHours<1||!Number.isInteger(toleranceMinutes)||toleranceMinutes<1)throw Error('INVALID_LABEL_PARAMETERS');
 const ranking=scoreAsOf({batches,asOfUtc:decisionAtUtc,maxCandidates:100000});
 const all=new Map();
 for(const b of batches){
  if(b?.kind!=='R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS')continue;
  for(const o of b.observations||[]){
   const t=ms(o.captured_at_utc);
   if(t===null||t<=start||!o.key||o.price_usd===null)continue;
   if(!all.has(o.key))all.set(o.key,[]);
   all.get(o.key).push(o);
  }
 }
 const labels=ranking.candidates.map(c=>{
  const outcome=all.get(c.key)||[];
  const entry=batches.filter(b=>ms(b?.captured_at_utc)!==null&&ms(b.captured_at_utc)<=start)
   .flatMap(b=>b.observations||[]).filter(o=>o.key===c.key&&o.price_usd>0)
   .sort((a,b)=>ms(b.captured_at_utc)-ms(a.captured_at_utc))[0];
  const exit=outcome.filter(o=>Math.abs(ms(o.captured_at_utc)-end)<=toleranceMinutes*60000
    &&o.liquidity_usd!==null&&o.liquidity_usd>=minimumOutcomeLiquidityUsd)
   .sort((a,b)=>Math.abs(ms(a.captured_at_utc)-end)-Math.abs(ms(b.captured_at_utc)-end))[0];
  const pct=entry?.price_usd>0&&exit?.price_usd>0?rel(exit.price_usd,entry.price_usd):null;
  return {key:c.key,score:c.score,signal_status:c.status,
   entry_at_utc:entry?.captured_at_utc??null,exit_at_utc:exit?.captured_at_utc??null,
   outcome_return_pct:pct,label:pct===null?'UNLABELED_MISSING_24H_OUTCOME':
    pct>=100?'OBSERVED_24H_DOUBLE':pct>0?'OBSERVED_POSITIVE_UNDER_100':'OBSERVED_NONPOSITIVE',
   warning:'Endpoint delta is not intraday maximum; no proof of historical executable sell price.'};
 });
 const valid=labels.filter(x=>x.outcome_return_pct!==null);
 return {schema:1,kind:'R29_FORWARD_ONLY_OUTCOME_LABELS',
  decision_at_utc:decisionAtUtc,required_horizon_hours:horizonHours,
  labels,counts:{total:labels.length,labeled:valid.length,
    doubled:valid.filter(x=>x.label==='OBSERVED_24H_DOUBLE').length,
    non_doubled:valid.filter(x=>x.label!=='OBSERVED_24H_DOUBLE').length,
    unknown:labels.length-valid.length},
  can_claim_learning_quality:valid.length>=30&&valid.some(x=>x.label==='OBSERVED_24H_DOUBLE')&&valid.some(x=>x.label!=='OBSERVED_24H_DOUBLE'),
  zero_lookahead_training: 'Labels are computed after the horizon and must never be used as input to as-of ranking.'};
}
export function evaluateBlindRankings({ranking,labels,topK=10}={}){
 if(ranking?.kind!=='R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING'
   ||labels?.kind!=='R29_FORWARD_ONLY_OUTCOME_LABELS'||!Number.isInteger(topK)||topK<1)throw Error('INVALID_EVALUATION_INPUT');
 if(ranking.as_of_utc!==labels.decision_at_utc)throw Error('ASOF_LABEL_TIME_MISMATCH');
 const joined=new Map(labels.labels.map(x=>[x.key,x]));
 const ranked=ranking.candidates.slice(0,topK);
 const known=ranked.filter(x=>joined.get(x.key)?.outcome_return_pct!==null);
 const correct=known.filter(x=>joined.get(x.key).label==='OBSERVED_24H_DOUBLE').length;
 const allKnown=labels.labels.filter(x=>x.outcome_return_pct!==null);
 const allWinners=allKnown.filter(x=>x.label==='OBSERVED_24H_DOUBLE');
 return {schema:1,kind:'R29_BLIND_TEMPORAL_EVALUATION',
  as_of_utc:ranking.as_of_utc,top_k:topK,
  scored:ranked.length,known_outcomes:known.length,
  known_positive_100:correct,total_labelled_pools:allKnown.length,
  total_labelled_positive_100:allWinners.length,
  precision_at_k_known:known.length?correct/known.length:null,
  recall_at_k_known:allWinners.length?correct/allWinners.length:null,
  missing_outcomes_in_top_k:ranked.length-known.length,
  caveat:'Coverage-limited observed endpoint doubling, not all future 100%-gainers, not proof of realized PnL.'};
}
