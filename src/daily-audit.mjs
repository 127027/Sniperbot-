// R29 Cleanroom deterministic retrospective comparison. No network, prices, or trading.
const id = x => x && typeof x === 'object' && typeof x.chain==='string' && typeof x.contract==='string' && typeof x.pool==='string' && x.chain.length>0 && x.contract.length>0 && x.pool.length>0;
const key = x => id(x) ? [x.chain,x.contract,x.pool].map(v=>v.trim().toLowerCase()).join('|') : null;
const time = x => { const n=Date.parse(x); return Number.isFinite(n)?n:null; };
const matching = (xs,k) => (Array.isArray(xs)?xs:[]).filter(x=>key(x.coin||x)===k);
const within = (at,start,end) => {const t=time(at);return t!==null&&t>=start&&t<end;};
export function reconcileDailyAudit({window_start_utc,window_end_utc,external_gainers=[],events=[],orders=[],receipts=[]}){
  const start=time(window_start_utc),end=time(window_end_utc);
  if(start===null||end===null||end-start!==86400000)throw Error('AUDIT_WINDOW_MUST_BE_24_HOURS');
  for(const [name,value] of Object.entries({external_gainers,events,orders,receipts}))if(!Array.isArray(value))throw Error('INVALID_'+name.toUpperCase());
  const gainers=external_gainers.filter(x=>Number.isFinite(x.change_24h_pct)&&x.change_24h_pct>100);
  const seen=new Set();
  const rows=gainers.map(g=>{
    const k=key(g),matchKey=k||'UNVERIFIED:'+String(g.symbol||'unknown');
    const duplicate=seen.has(matchKey);
    seen.add(matchKey);
    const ev=k?matching(events,k).filter(x=>within(x.observed_at_utc,start,end)):[];
    const ord=k?matching(orders,k).filter(x=>within(x.created_at,start,end)):[];
    const buys=ord.filter(x=>x.action==='BUY'),sells=ord.filter(x=>x.action==='SELL');
    const orderIds=new Set(ord.map(x=>x.id));
    const rc=receipts.filter(x=>orderIds.has(x.id)&&within(x.timestamp,start,end));
    const filledBuys=rc.filter(x=>x.status==='PAPER_FILLED'&&x.action==='BUY');
    const rejected=rc.filter(x=>x.status==='PAPER_REJECTED');
    const stages=new Set(ev.map(x=>x.stage));
    let reason;
    if(!k)reason='COIN_POOL_IDENTITY_UNVERIFIED';
    else if(ev.length===0)reason='NOT_IN_DISCOVERY_JOURNAL';
    else if(!stages.has('STRATEGY_REVIEWED'))reason=stages.has('RISK_REJECTED')?'RISK_REJECTED_OR_DATA_GAP':'NO_RECORDED_GPT_REVIEW';
    else if(buys.length===0)reason='REVIEWED_NO_BUY_SIGNAL';
    else if(rejected.length>0&&filledBuys.length===0)reason='PAPER_REJECTED';
    else if(filledBuys.length===0)reason='BUY_PUBLISHED_NO_CONFIRMED_FILL';
    else reason='PAPER_BUY_CONFIRMED';
    return {chain:g.chain||null,contract:g.contract||null,pool:g.pool||null,symbol:g.symbol||null,
      reported_24h_change_pct:g.change_24h_pct,source_url:g.source_url||null,source_observed_at_utc:g.source_observed_at_utc||null,
      duplicate_identity:duplicate,stage_events:ev.length,buys_published:buys.length,sells_published:sells.length,
      paper_buy_fills:filledBuys.length,paper_rejects:rejected.length,first_discovered_utc:ev.find(x=>x.stage==='DISCOVERED')?.observed_at_utc||null,
      first_strategy_review_utc:ev.find(x=>x.stage==='STRATEGY_REVIEWED')?.observed_at_utc||null,
      root_cause_code:reason,client_receipt_status:rc.length? 'RECEIPTS_OBSERVED':'OFFLINE_OR_UNCONFIRMED'};
  });
  const deduped=rows.filter(x=>!x.duplicate_identity);
  const profitableOrNot=receipts.filter(r=>r.status==='PAPER_FILLED'&&within(r.timestamp,start,end));
  return {schema:1,kind:'R29_RETROSPECTIVE_24H',mode:'PAPER',window_start_utc,window_end_utc,
    coverage:'OBSERVED_PUBLIC_SOURCES_ONLY_NOT_COMPLETE_MARKET',threshold_pct_exclusive:100,
    observed_gainer_count:deduped.length,verified_identity_count:deduped.filter(x=>x.chain&&x.contract&&x.pool).length,
    paper_fills_observed:profitableOrNot.length,rows:deduped,
    all_client_fills:profitableOrNot.map(r=>({client_id:r.client_id||null,order_id:r.id,action:r.action,at_utc:r.timestamp,
      realized_pnl_test_usdc:Number.isFinite(r.realized_pnl_test_usdc)?r.realized_pnl_test_usdc:null})),
    notes:['24h percentage is a retrospective displayed change, not a return achievable by a historical BUY/SELL.',
      'Match only exact chain+contract+pool; symbol matches alone are invalid.',
      'No receipt means OFFLINE_OR_UNCONFIRMED, not a successful or failed local trade.']};
}
