// R29 V1.9 D4-09: read-only local PAPER monitoring projection.
// Never infers a current market price from a position's entry price.
// Missing Dot3 proof, observed price, remote receipt and sellability stay UNKNOWN.
const timestamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const finite=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const safeStatus=x=>typeof x==='string'&&/^[A-Z_]{2,45}$/.test(x)?x:null;
export function projectPaperMonitoring({state,policy=null,nowUtc=new Date().toISOString()}={}){
 const at=timestamp(nowUtc);
 if(state?.mode!=='PAPER_ONLY'||at===null)throw Error('INVALID_PAPER_MONITOR_SOURCE');
 const positions=Object.values(state.positions||{}).map((p,i)=>{
  const captured=timestamp(p?.last_market_observation?.captured_at_utc);
  const quoted=timestamp(p?.last_market_observation?.provider_quote_asof_utc);
  const eventIsFuture=captured!==null&&captured>at;
  const capturedValid=captured!==null&&!eventIsFuture;
  const quoteValid=quoted!==null&&capturedValid&&quoted<=captured;
  const age=capturedValid?Math.floor((at-captured)/1000):null;
  return {index:i,symbol:String(p?.coin?.symbol??'Unbekannt'),
   chain:String(p?.coin?.chain??'?'),pool:String(p?.coin?.pool??'?'),
   contract:String(p?.coin?.contract??'?'),
   quantity:finite(p?.quantity),entry_price_usdc:finite(p?.entryPrice),
   cost_test_usdc:finite(p?.costTestUsdc),
   opened_at_utc:timestamp(p?.openedAt)!==null?p.openedAt:null,
   opening_buy_order_id:p?.sourceOrderId??null,
   last_capture_at_utc:capturedValid?p.last_market_observation.captured_at_utc:null,
   last_reported_quote_at_utc:quoteValid?
     p.last_market_observation.provider_quote_asof_utc:null,
   capture_age_seconds:age,
   quote_state:!capturedValid?(eventIsFuture?'FUTURE_CAPTURE_INVALID':'NO_CAPTURE'):
     !quoteValid?'PROVIDER_TIME_UNVERIFIED':'PROVIDER_TIME_REPORTED_UNATTESTED',
   quote_is_not_independently_verified:true,
   verified_dot3_risk_status:'UNKNOWN_NO_ATTESTED_RISK',
   estimated_current_market_value_test_usdc:null,
   current_pnl_test_usdc:null,
   actual_sellability_proven:false};
 });
 const receipts=Object.entries(state.receipts||{}).map(([id,r])=>{
  const v=r?.data||{},when=timestamp(v.timestamp),
   elapsed=when!==null&&when<=at?Math.floor((at-when)/1000):null;
  return {id:String(v.id??id),action:String(v.action??'-'),
    status:safeStatus(v.status)??'UNKNOWN',
    timestamp:when===null?null:v.timestamp,
    reason_code:String(v.reason_code??'-'),
    published:r?.published===true,
    minutes_since_receipt:elapsed===null?null:Math.floor(elapsed/60),
    delivery_delay_minutes:r?.published===true?null:
      (elapsed===null?null:Math.floor(elapsed/60)),
    actual_github_delivery_verified:r?.published===true,
    modeled_receipt_is_not_a_real_blockchain_fill:true};
 }).sort((a,b)=>(b.timestamp??'').localeCompare(a.timestamp??''))
  .slice(0,30);
 const availableCash=finite(state.cash);
 const exposure=positions.reduce((n,p)=>n+(p.cost_test_usdc??0),0);
 const pending=receipts.filter(r=>!r.published).length;
 return {schema:1,kind:'R29_V19_PAPER_MONITOR',
  mode:'PAPER_ONLY',as_of_utc:nowUtc,
  cash_test_usdc:availableCash,open_position_count:positions.length,
  open_cost_basis_test_usdc:exposure,
  stake_per_coin_test_usdc:finite(policy?.entryAmount),
  max_positions:Number.isInteger(policy?.maxPositions)?policy.maxPositions:null,
  completed_order_count:Object.keys(state.processed||{}).length,
  pending_receipts_in_last_30:pending,
  observed_rejected_receipts:receipts.filter(r=>r.status==='PAPER_REJECTED').length,
  positions,receipts,
  no_real_time_market_feed_claimed:true,
  no_buy_sell_buttons:true,
  does_not_mutate_account:true};
}
