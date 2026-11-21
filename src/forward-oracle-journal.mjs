// V1.6: actual prospective 1h/3h/6h feature and outcome journal.
// Never references hindsight winner manifest, Oracle candles or wallet.
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const iso=x=>new Date(x).toISOString();
const horizonList=[1,3,6];
export function makeAsOfForecastSnapshot({ranking,batches=[]}={}){
 const at=ms(ranking?.as_of_utc);
 if(ranking?.kind!=='R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING'||at===null||!Array.isArray(batches))throw Error('BAD_FORWARD_FORECAST_INPUT');
 const observed=new Map();
 for(const b of batches){
  if(b?.kind!=='R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS'||ms(b.captured_at_utc)===null||ms(b.captured_at_utc)>at)continue;
  for(const o of b.observations||[]){
   const seen=ms(o.captured_at_utc);
   if(!o.key||seen===null||seen>at||ms(o.observed_at_utc)>at||!Number.isFinite(o.price_usd)||o.price_usd<=0)continue;
   const previous=observed.get(o.key);
   if(!previous||ms(previous.captured_at_utc)<seen)observed.set(o.key,o);
  }
 }
 const forecasts=(ranking.candidates||[]).map(c=>{
  const entry=observed.get(c.key);
  const sourceAt=ms(entry?.captured_at_utc);
  const eligible=entry?.price_usd>0&&c.score!==null&&c.score!==undefined
   &&c.contract&&c.status==='RESEARCH_PRIORITY_ONLY_NOT_RISK_APPROVED'
   &&sourceAt!==null&&at-sourceAt<=10*60000;
  return {key:c.key,chain:c.chain,pool:c.pool,contract:c.contract||null,
   source_market_capture_at_utc:entry?.captured_at_utc||null,
   decision_at_utc:iso(at),last_observed_price_usd:eligible?entry.price_usd:null,
   FEATURES_PAST_ONLY_research_score:c.score??null,
   FEATURES_PAST_ONLY_momentum_pct:c.observed_price_change_pct??null,
   FEATURES_PAST_ONLY_liquidity_change_pct:c.observed_liquidity_change_pct??null,
   FEATURES_PAST_ONLY_volume_change_pct:c.observed_volume_24h_change_pct??null,
   forecast_data_status:eligible?'UNTRAINED_ASOF_FEATURES_ONLY':'DATA_GAP_NOT_RANKABLE',
   calibrated_probability_up20pct:null,calibrated_probability_up50pct:null,
   calibrated_probability_up100pct:null,
   independent_sellability_verified:false,paper_buy_authorized:false};
 });
 return {schema:1,kind:'R29_PROSPECTIVE_ORACLE_FORECAST_SNAPSHOT',
  as_of_utc:iso(at),horizons_hours:horizonList,
  predictions:forecasts,rankable_inputs:forecasts.filter(x=>x.last_observed_price_usd!==null).length,
  status:'NO_CALIBRATED_PROBABILITY_MODEL_YET',
  test_only:false,orders_authorized:0,
  rule:'Features are as-of and frozen before later 1/3/6h observations; never use Oracle winner references.'};
}
export function settleMatureForecastSnapshot({snapshot,batches=[],asOfUtc,toleranceMinutes=30}={}){
 const evaluation=ms(asOfUtc),first=ms(snapshot?.as_of_utc);
 if(snapshot?.kind!=='R29_PROSPECTIVE_ORACLE_FORECAST_SNAPSHOT'||evaluation===null||first===null||evaluation<first
 ||!Array.isArray(batches)||!Number.isInteger(toleranceMinutes)||toleranceMinutes<1||toleranceMinutes>120)
 throw Error('BAD_FORWARD_LABEL_INPUT');
 const later=new Map();
 for(const b of batches){
  const batchAt=ms(b?.captured_at_utc);
  if(b?.kind!=='R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS'||batchAt===null||batchAt<=first||batchAt>evaluation)continue;
  for(const o of b.observations||[]){
   const seen=ms(o.captured_at_utc);
   if(!o.key||seen===null||seen<=first||seen>evaluation||!Number.isFinite(o.price_usd)||o.price_usd<=0)continue;
   if(!later.has(o.key))later.set(o.key,[]);
   later.get(o.key).push(o);
  }
 }
 const labels=[];
 for(const entry of snapshot.predictions||[]){
  for(const horizon of horizonList){
   const target=first+horizon*3600000;
   const matured=evaluation>=target;
   const valid=matured&&Number.isFinite(entry.last_observed_price_usd)&&entry.last_observed_price_usd>0;
   const possibilities=valid?(later.get(entry.key)||[]).filter(o=>
    Math.abs(ms(o.captured_at_utc)-target)<=toleranceMinutes*60000
    &&o.liquidity_usd!==null&&o.liquidity_usd>=5000):[];
   possibilities.sort((a,b)=>Math.abs(ms(a.captured_at_utc)-target)-Math.abs(ms(b.captured_at_utc)-target));
   const actual=possibilities[0]||null;
   const pct=actual?(actual.price_usd/entry.last_observed_price_usd-1)*100:null;
   labels.push({key:entry.key,decision_at_utc:snapshot.as_of_utc,
    horizon_hours:horizon,outcome_eligible_after_utc:iso(target),
    outcome_at_utc:actual?.captured_at_utc||null,
    observed_end_return_pct:pct,
    LABEL_FUTURE_up20:pct===null?null:pct>=20,
    LABEL_FUTURE_up50:pct===null?null:pct>=50,
    LABEL_FUTURE_up100:pct===null?null:pct>=100,
    status:!matured?'PENDING_HORIZON':
     entry.last_observed_price_usd===null?'UNKNOWN_UNRANKABLE_AT_DECISION':
     pct===null?'UNKNOWN_NO_VERIFIED_ENDPOINT_QUOTE':'OBSERVED_ENDPOINT_CHANGE',
    note:'Sparse future endpoint observation, NOT maximum intrahour return or executable PnL.'});
  }
 }
 return {schema:1,kind:'R29_PROSPECTIVE_ORACLE_FORECAST_LABELS',
  source_decision_at_utc:snapshot.as_of_utc,as_of_utc:iso(evaluation),
  labels,total_labels:labels.length,
  observed:labels.filter(x=>x.status==='OBSERVED_ENDPOINT_CHANGE').length,
  pending:labels.filter(x=>x.status==='PENDING_HORIZON').length,
  unknown:labels.filter(x=>x.status.startsWith('UNKNOWN')).length,
  feature_to_label_leakage:false,orders_authorized:0};
}
