import {createHash} from 'node:crypto';
export const FIRST='2026-10-12T00:00:00.000Z';
const tick=Date.parse(FIRST),MIN=60000,H=3600000;
const ms=s=>Date.parse(s),positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const key=m=>['solana',m.mint,m.pool,m.quote_mint].join(':');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sum=(rows,k)=>rows.reduce((s,r)=>s+r[k],0);
export function verifyDecisionMinutes(rows,{hourUtc,expectedCount,expectedSwaps}){
 const start=ms(hourUtc),ids=new Set();
 if(!Number.isFinite(start)||start%H||start+H>tick||rows.length!==expectedCount)throw Error('MINUTE_WINDOW_OR_COUNT');
 for(const m of rows){
  const t=ms(m.minute_utc),a=ms(m.first_capture_utc),b=ms(m.last_capture_utc),id=key(m)+':'+t;
  if(!Number.isFinite(t)||t%MIN||t<start||t>=start+H||!Number.isFinite(a)||!Number.isFinite(b)||a<t||b<a||b>=t+MIN||b+MIN>=tick||ids.has(id)||!Number.isSafeInteger(m.buys)||!Number.isSafeInteger(m.sells)||m.buys<0||m.sells<0||m.buys+m.sells<=0)throw Error('INVALID_OR_FUTURE_MINUTE');
  ids.add(id);
 }
 if(sum(rows,'buys')+sum(rows,'sells')!==expectedSwaps)throw Error('SWAP_RECONCILIATION');
 return rows;
}
function window(rows,minutes){
 const a=rows.filter(m=>ms(m.minute_utc)>=tick-minutes*MIN);
 // Marks are provider-reported in original quote units; ambiguous order is not an executable quote.
 const marks=a.filter(m=>m.order_tie===false&&positive(m.close));
 const first=marks[0],last=marks.at(-1);
 return {observations:a.length,reported_buys:sum(a,'buys'),reported_sells:sum(a,'sells'),reported_quote_buy_volume:sum(a,'quote_buy_volume_reported'),reported_quote_sell_volume:sum(a,'quote_sell_volume_reported'),missing_quote_amounts:sum(a,'quote_amount_missing'),ambiguous_order_minutes:a.filter(m=>m.order_tie!==false).length,first_mark:first?.close??null,last_mark:last?.close??null,first_mark_at:first?.last_capture_utc??null,last_mark_at:last?.last_capture_utc??null,observed_mark_change_pct:marks.length>1?100*(last.close/first.close-1):null};
}
export function buildDecisionEvidence({index,minuteRows,priorQuotes=[],priorReviews=[]}){
 if(index.kind!=='R29_CUMULATIVE_PREPARATION_INDEX'||ms(index.tick_utc)!==tick||!Array.isArray(index.candidates)||!Array.isArray(index.pools))throw Error('INDEX_SCOPE');
 const pmap=new Map(index.pools.map(p=>[p.key,p])),cmap=new Map(index.candidates.map(c=>[c.mint,c])),series=new Map();
 if(pmap.size!==index.pools.length||cmap.size!==index.candidates.length)throw Error('DUPLICATE_INDEX_IDENTITY');
 const globalIds=new Set();
 for(const m of minuteRows){
  const k=key(m),t=ms(m.minute_utc),last=ms(m.last_capture_utc),id=k+':'+t;
  if(!pmap.has(k)||!Number.isFinite(t)||!Number.isFinite(last)||last+MIN>=tick||globalIds.has(id))throw Error('MINUTE_NOT_IN_VERIFIED_INDEX');
  globalIds.add(id);if(!series.has(k))series.set(k,[]);series.get(k).push(m);
 }
 const pools=new Map();
 for(const [k,p] of pmap){
  const a=(series.get(k)||[]).sort((a,b)=>ms(a.minute_utc)-ms(b.minute_utc));
  if(!a.length||sum(a,'buys')!==p.reported_buys||sum(a,'sells')!==p.reported_sells)throw Error('POOL_ACTIVITY_RECONCILIATION');
  const windows={m10:window(a,10),m60:window(a,60),m180:window(a,180)};
  if(windows.m10.reported_buys!==p.recent_buys||windows.m10.reported_sells!==p.recent_sells)throw Error('RECENT_ACTIVITY_RECONCILIATION');
  const last=a.at(-1);
  pools.set(k,{key:k,pool:p.pool,quote_mint:p.quote_mint,protocols:p.latest.protocols,latest_observed_at:last.last_capture_utc,latest_reported_mark:last.order_tie===false&&positive(last.close)?last.close:null,latest_reported_reserve:last.order_tie===false&&positive(last.last_reserve)?last.last_reserve:null,latest_reported_token_reserve:last.order_tie===false&&positive(last.last_tokens)?last.last_tokens:null,latest_signature:last.last_signature??null,latest_order_ambiguous:last.order_tie!==false,windows,source_hours:p.hours,source_units_verified:false,execution_quote_verified:false});
 }
 const candidates=[];
 for(const c of cmap.values()){
  const ps=c.pool_keys.map(k=>{const p=pools.get(k);if(!p)throw Error('MISSING_POOL');return p;});
  if(new Set(c.pool_keys).size!==c.pool_keys.length||ps.some(p=>!p.key.startsWith('solana:'+c.mint+':')))throw Error('BAD_POOL_LINK');
  const recent=ps.filter(p=>p.windows.m10.reported_buys+p.windows.m10.reported_sells>0);
  const two=recent.filter(p=>p.windows.m10.reported_buys>0&&p.windows.m10.reported_sells>0);
  if((two.length>0)!==c.has_recent_two_sided_swap_evidence)throw Error('RECENCY_FLAG_MISMATCH');
  const quote=priorQuotes.filter(q=>q.mint===c.mint),review=priorReviews.filter(q=>q.mint===c.mint);
  // A priority is not a buy gate. Inactive and one-sided records stay retrievable.
  const priority=two.length?'RECENT_TWO_SIDED':recent.length?'RECENT_ONE_SIDED':c.earlier_model_candidate||c.legacy_feature&&!c.legacy_feature.needs_current_asof_refresh?'RECENT_FEATURE_ONLY':ps.length?'HISTORICAL_ACTIVITY':'HISTORICAL_FEATURE_ONLY';
  candidates.push({mint:c.mint,chain:'solana',priority,legacy_feature:c.legacy_feature,earlier_model_candidate:c.earlier_model_candidate,pools:ps,prior_indicative_quotes:quote,prior_diagnostic_reviews:review,memecoin_classification:'UNKNOWN',risk_status:'UNKNOWN',execution_status:'UNVERIFIED',decision_status:'NOT_YET_REVIEWED',missing_evidence:priority.startsWith('RECENT')?['MEME_CLASSIFICATION_AND_CONTEXT','POOL_PROTOCOL_UNITS_AND_FEES','CURRENT_ASOF_RISK_AND_SIZE_ADJUSTED_QUOTE']:['CURRENT_ACTIVITY_OR_REACTIVATION_EVIDENCE'],trade_authorized:false});
 }
 return {kind:'R29_PREDECISION_EVIDENCE_PACKETS',tick_utc:FIRST,inventory_count:candidates.length,pool_count:pools.size,candidates:candidates.sort((a,b)=>a.mint.localeCompare(b.mint)),prepared_trade_inputs:0,orders:0};
}
export function replayDayPlan({start=FIRST,preparedInputSha256}={}){
 if(ms(start)!==tick||! /^[a-f0-9]{64}$/.test(preparedInputSha256))throw Error('INVALID_REPLAY_PLAN');
 return {kind:'R29_OFFLINE_REPLAY_DAY_PLAN',start_utc:FIRST,end_exclusive_utc:new Date(tick+24*H).toISOString(),starting_cash_micro_usdc:'5000000000',entry_budget_micro_usdc:'50000000',reset_cash_between_ticks:false,initial_preparation_sha256:preparedInputSha256,oracle_visible:false,network_acquisition_during_decisions:false,frames:Array.from({length:24},(_,i)=>({scan:i+1,tick_utc:new Date(tick+i*H).toISOString(),previous_scan:i||null,requires_previous_portfolio:i>0,requires_five_role_handoff:true,status:i===0?'PREPARATION_INCOMPLETE':'REPLAY_INPUT_NOT_SEALED'})),valid_scans:0,orders:0};
}
