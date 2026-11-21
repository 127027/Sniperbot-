// V1.6: hindsight-only Oracle. Never import into the paper-order publisher.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const ms=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
const iso=t=>new Date(t).toISOString();
const valid=c=>ms(c?.known_no_earlier_than_utc)!==null&&
 [c.open_usd,c.high_usd,c.low_usd,c.close_usd].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0)
 &&typeof c.volume_usd==='number'&&Number.isFinite(c.volume_usd)&&c.volume_usd>=0
 &&c.high_usd>=Math.max(c.open_usd,c.close_usd,c.low_usd)
 &&c.low_usd<=Math.min(c.open_usd,c.close_usd);
export function auditOracleManifest(manifest){
 if(manifest?.items?.length!==65)throw Error('EXPECTED_65_ARCHIVE_ROWS');
 const seen=new Set(),items=manifest.items.map(m=>{
  if(!Number.isInteger(m.id)||seen.has(m.id))throw Error('DUPLICATE_OR_INVALID_MANIFEST_ID');
  seen.add(m.id);
  const chain=canonicalChain(m.chain),hasPool=poolValid(chain,m.pool_id),hasContract=tokenValid(chain,m.token_contract);
  if(!chain)throw Error('UNSUPPORTED_MANIFEST_CHAIN');
  return {id:m.id,name:m.name,chain,pool:m.pool_id||null,contract:m.token_contract||null,
   archive_pct:m.reported_rolling_24h_pct??null,source_url:m.pool_source_url||m.archive_source_url||null,
   has_pool:hasPool,has_contract:hasContract,
   identity_status:hasPool&&hasContract?'ARCHIVE_ADDRESSES_NOT_INDEPENDENTLY_VERIFIED':
    hasPool?'POOL_ONLY_CONTRACT_UNKNOWN':'POOL_ID_MISSING',
   original_archive_is_not_exact_day_oracle:true,
   historical_discovery_verified:false,buy_authorized:false};
 }).sort((a,b)=>a.id-b.id);
 return {kind:'R29_POST_EVENT_ORACLE_MANIFEST',schema:1,items,
  counts:{total:items.length,with_pool:items.filter(x=>x.has_pool).length,
   with_contract:items.filter(x=>x.has_contract).length,
   missing_pool:items.filter(x=>!x.has_pool).length},
  only_available_after_historical_decisions:true,no_orders:true};
}
export function normalizeOracleTape(raw,{date='2026-10-12',sourceSha256=null}={}){
 if(!Array.isArray(raw?.tape?.candles))throw Error('NO_PROVIDER_CANDLE_TAPE');
 const start=Date.parse(date+'T00:00:00Z'),end=start+86400000;
 const dedupe=new Map(),issues=[];
 for(const [i,c] of raw.tape.candles.entries()){
  const t=ms(c?.known_no_earlier_than_utc);
  if(t===null||t<=start||t>end)continue;
  if(!valid(c)){issues.push({row:i,issue:'INVALID_CANDLE'});continue;}
  if(dedupe.has(t))issues.push({row:i,issue:'DUPLICATE_TIME'});
  dedupe.set(t,c);
 }
 const candles=[...dedupe.values()].sort((a,b)=>a.known_no_earlier_than_utc.localeCompare(b.known_no_earlier_than_utc));
 return {kind:'R29_FROZEN_ORACLE_CANDLES',symbol:raw.symbol,chain:canonicalChain(raw.chain),
  pool:raw.pool,source_sha256:sourceSha256,
  candles,issues,post_event_reconstructed:true,verified_original_dot2_capture:false};
}
export function bestCloseOracle(tape){
 const candles=(tape?.candles||[]).filter(valid).sort((a,b)=>a.known_no_earlier_than_utc.localeCompare(b.known_no_earlier_than_utc));
 let low=null,lowWick=null,best=null,wick=null;
 for(const c of candles){
  if(low&&ms(low.known_no_earlier_than_utc)<ms(c.known_no_earlier_than_utc)){
   const pct=(c.close_usd/low.close_usd-1)*100;
   if(!best||pct>best.gain_pct)best={buy_close_at_utc:low.known_no_earlier_than_utc,
    sell_close_at_utc:c.known_no_earlier_than_utc,buy_price_usd:low.close_usd,
    sell_price_usd:c.close_usd,gain_pct:pct};
  }
  if(lowWick&&ms(lowWick.known_no_earlier_than_utc)<ms(c.known_no_earlier_than_utc)){
   const pct=(c.high_usd/lowWick.low_usd-1)*100;
   if(!wick||pct>wick.gain_pct)wick={low_candle_at_utc:lowWick.known_no_earlier_than_utc,
    high_candle_at_utc:c.known_no_earlier_than_utc,gain_pct:pct,executable:false};
  }
  if(!low||c.close_usd<low.close_usd)low=c;
  if(!lowWick||c.low_usd<lowWick.low_usd)lowWick=c;
 }
 return {kind:'R29_HINDSIGHT_ORACLE',symbol:tape?.symbol||null,chain:tape?.chain||null,
  pool:tape?.pool||null,candles_available:candles.length,source_sha256:tape?.source_sha256||null,
  best_close_to_later_close:best,wick_upper_bound:wick,
  actual_trade_verified:false,actual_buy_sell_quote_verified:false,
  warning:'Theoretical maximum from retrospective closes, not executable profit.'};
}
const pct=(a,b)=>a!==null&&b!==null&&b>0?(a/b-1)*100:null;
export function forecastFeatureLabelSeparation(tape,{date='2026-10-12'}={}){
 const origin=Date.parse(date+'T00:00:00Z');
 if(!Number.isFinite(origin))throw Error('BAD_DAY');
 const end=origin+86400000,all=(tape?.candles||[]).filter(valid)
  .sort((a,b)=>a.known_no_earlier_than_utc.localeCompare(b.known_no_earlier_than_utc));
 const features=[],labels=[];
 for(let h=0;h<24;h++){
  const decision=origin+h*3600000+35*60000;
  const prior=all.filter(c=>ms(c.known_no_earlier_than_utc)+60000<=decision);
  const last=prior.at(-1),time=ms(last?.known_no_earlier_than_utc);
  const fresh=time!==null&&decision-time<=15*60000;
  const earlier=mins=>prior.filter(c=>ms(c.known_no_earlier_than_utc)<=time-mins*60000).at(-1);
  const prev5=fresh?earlier(5):null,prev15=fresh?earlier(15):null,prev60=fresh?earlier(60):null;
  const vol=fresh?prior.filter(c=>ms(c.known_no_earlier_than_utc)>time-15*60000):[];
  const key=(tape?.chain||'unknown')+':'+(tape?.pool||'unknown')+':'+iso(decision);
  features.push({key,scan:h+1,decision_at_utc:iso(decision),symbol:tape?.symbol,chain:tape?.chain,pool:tape?.pool,
   FEATURES_PAST_ONLY_last_candle_at_utc:last?.known_no_earlier_than_utc||null,
   FEATURES_PAST_ONLY_close_usd:fresh?last.close_usd:null,
   FEATURES_PAST_ONLY_momentum_5m_pct:fresh?pct(last.close_usd,prev5?.close_usd??null):null,
   FEATURES_PAST_ONLY_momentum_15m_pct:fresh?pct(last.close_usd,prev15?.close_usd??null):null,
   FEATURES_PAST_ONLY_momentum_1h_pct:fresh?pct(last.close_usd,prev60?.close_usd??null):null,
   FEATURES_PAST_ONLY_volume_15m_usd:fresh&&vol.length>=3?vol.reduce((a,c)=>a+c.volume_usd,0):null,
   data_status:fresh?'ASOF_CANDLE_RESEARCH':'DATA_GAP',
   forecast_probability_20pct:null,forecast_probability_50pct:null,forecast_probability_100pct:null,
   buy_authorized:false});
  for(const horizonHours of [1,3,6]){
   const horizonEnd=decision+horizonHours*3600000;
   const next=horizonEnd<=end&&fresh?all.filter(c=>{
    const t=ms(c.known_no_earlier_than_utc);return t>decision&&t<=horizonEnd;
   }):[];
   let complete=next.length>0&&ms(next[0].known_no_earlier_than_utc)-decision<=15*60000
    &&horizonEnd-ms(next.at(-1).known_no_earlier_than_utc)<=15*60000;
   for(let i=1;i<next.length&&complete;i++)
    if(ms(next[i].known_no_earlier_than_utc)-ms(next[i-1].known_no_earlier_than_utc)>10*60000)complete=false;
   const max=complete?Math.max(...next.map(c=>c.close_usd)):null;
   const min=complete?Math.min(...next.map(c=>c.close_usd)):null;
   const final=complete?next.at(-1).close_usd:null;
   const gain=pct(max,fresh?last.close_usd:null);
   labels.push({key,horizon_hours:horizonHours,evaluation_after_utc:iso(horizonEnd+60000),
    label_status:complete?'POST_EVENT_FUTURE_PROVIDER_CANDLES':'UNKNOWN_FUTURE_DATA_GAP',
    LABEL_FUTURE_max_close_return_pct:gain,LABEL_FUTURE_min_close_return_pct:pct(min,fresh?last.close_usd:null),
    LABEL_FUTURE_end_close_return_pct:pct(final,fresh?last.close_usd:null),
    LABEL_FUTURE_up20:gain===null?null:gain>=20,
    LABEL_FUTURE_up50:gain===null?null:gain>=50,
    LABEL_FUTURE_up100:gain===null?null:gain>=100});
  }
 }
 return {kind:'R29_ISOLATED_ORACLE_FEATURE_LABELS',features_past_only:features,
  labels_future_after_horizon_only:labels,market_universe_is_posthoc_selected:true,
  trading_authorized:false};
}
export function oracleMissReason(x={}){
 if(!x.pool)return 'NOT_DISCOVERED';
 if(!x.original_first_capture)return 'DATA_GAP_FIRST_CAPTURE';
 if(x.quote_status==='STALE')return 'STALE_DATA';
 if(!x.risk_status)return 'DATA_GAP_RISK';
 if(x.risk_status==='REJECTED')return 'RISK_REJECT';
 if(x.gpt_due===false)return 'GPT_NOT_DUE';
 if(x.order_published===false)return 'BUY_GATE';
 if(!x.client_receipt)return 'DATA_GAP_CLIENT_RECEIPT';
 return 'NO_PROVEN_MISSED_TRADE';
}
