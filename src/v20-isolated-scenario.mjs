// R29 V2.0 deterministic in-memory TEST-ONLY scenario; no GitHub, wallet, API or FS imports.
// This is NOT an empirical October backtest, GPT invocation, authenticated risk issuer,
// or Windows paper client. Every market quote and decision here must be SYNTHETIC.
import {replayCausalResearch} from './v19-causal-replay-research.mjs';
import {DEFAULT_POLICY,CHAINS} from './core.mjs';

const ms=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  &&Number.isFinite(Date.parse(value))?Date.parse(value):null;
const round=n=>Math.round((n+Number.EPSILON)*1e8)/1e8;
const finitePositive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const key=e=>e.chain+':'+(e.chain==='solana'?e.contract:e.contract.toLowerCase())+':'+(e.chain==='solana'?e.pool:e.pool.toLowerCase());
const tokenKey=e=>e.chain+':'+(e.chain==='solana'?e.contract:e.contract.toLowerCase());
const validIdentity=e=>CHAINS.has(e?.chain)
  &&typeof e.contract==='string'&&/^[a-zA-Z0-9._-]{9,180}$/.test(e.contract)
  &&typeof e.pool==='string'&&/^[a-zA-Z0-9._-]{9,180}$/.test(e.pool);
const assert=condition=>{if(!condition)throw Error('INVALID_SYNTHETIC_SCENARIO_INPUT')};

export function runV20IsolatedScenario({
  scenario_kind='SYNTHETIC_REGRESSION_ONLY',
  observations=[],plans=[],
  warmup_start_utc='2026-10-11T19:00:00.000Z',
  trade_start_utc='2026-10-12T00:00:00.000Z',
  trade_end_utc='2026-10-13T00:00:00.000Z',
  opening_cash_test_usdc=5000,
  stake_per_coin_test_usdc=50,
  stop_loss_pct=10,take_profit_pct=30
}={}){
  const begin=ms(warmup_start_utc),start=ms(trade_start_utc),end=ms(trade_end_utc);
  assert(scenario_kind==='SYNTHETIC_REGRESSION_ONLY'
    &&begin!==null&&start!==null&&end!==null&&begin<start&&start<end
    &&(start-begin)===5*3600000&&(end-start)===24*3600000
    &&Array.isArray(observations)&&observations.length<=50000
    &&Array.isArray(plans)&&plans.length<=5000
    &&finitePositive(opening_cash_test_usdc)
    &&stake_per_coin_test_usdc===DEFAULT_POLICY.entryAmount
    &&Number.isFinite(stop_loss_pct)&&stop_loss_pct>0&&stop_loss_pct<100
    &&Number.isFinite(take_profit_pct)&&take_profit_pct>0&&take_profit_pct<=10000);
  // This module deliberately refuses non-fixture evidence. Real source authenticity,
  // D3 issuer approval and route-based sellability are NOT established here.
  const invalidQuotes=[];
  const eligibleObservations=[];
  for(const [index,e] of observations.entries()){
    if(!validIdentity(e)||e?.synthetic_fixture!==true||e?.event_kind!=='SYNTHETIC_QUOTE'
      ||!finitePositive(e.price_test_usdc)||!finitePositive(e.liquidity_test_usdc)
      ||typeof e.source_provider!=='string'||!/^[a-zA-Z0-9._-]{3,80}$/.test(e.source_provider)){
      invalidQuotes.push({index,reason:'UNSUPPORTED_NON_SYNTHETIC_OR_INVALID_QUOTE'});
      continue;
    }
    eligibleObservations.push({...e,_scenario_original_index:index});
  }
  const timeline=replayCausalResearch({events:eligibleObservations,
    start_utc:warmup_start_utc,end_utc:trade_end_utc,step_minutes:60});
  const seen=new Map(),positions=new Map(),executions=[],rejections=[],ticks=[];
  const planIds=new Set(),validPlans=new Map();
  for(const [index,p] of plans.entries()){
    const time=ms(p?.at_utc),precommit=ms(p?.precommitted_at_utc);
    const id=p?.plan_id;
    // Avoid accepting arbitrary outcome-driving directives in a test plan:
    // "force_no_fill" is the sole permitted injected execution failure.
    const approved=(p?.synthetic_fixture===true&&p?.plan_kind==='FIXED_TEST_PLAN'
      &&typeof id==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(id)
      &&!planIds.has(id)&&time!==null&&time>=start&&time<end
      &&(time-start)%3600000===0&&precommit!==null&&precommit<=begin
      &&['BUY','SELL','HOLD'].includes(p?.action)
      &&validIdentity(p)
      &&(p.force_no_fill===undefined||p.force_no_fill===true)
      &&!Object.hasOwn(p,'reported_gain_pct')&&!Object.hasOwn(p,'future_winner_label')
      &&!Object.hasOwn(p,'post_event_rank'));
    if(!approved){rejections.push({plan_index:index,reason:'INVALID_OR_NOT_PRECOMMITTED_TEST_PLAN'});continue}
    planIds.add(id);
    const when=new Date(time).toISOString();
    if(!validPlans.has(when))validPlans.set(when,[]);
    validPlans.get(when).push(p);
  }
  let cash=round(opening_cash_test_usdc),realized=0,seq=0,buys=0,sells=0,noFills=0;
  const observationsForTick=[];
  const pairAt=(market,at)=>{
    const history=seen.get(market)||[];
    const latest=new Map();
    // A quote is usable only after *actual synthetic capture* and within 90 sec.
    for(const q of history){
      const age=at-ms(q.captured_at_utc);
      if(age<0||age>DEFAULT_POLICY.maxQuoteAgeMs)continue;
      const old=latest.get(q.source_provider);
      if(!old||ms(old.captured_at_utc)<ms(q.captured_at_utc))latest.set(q.source_provider,q);
    }
    const rows=[...latest.values()].sort((a,b)=>a.source_provider.localeCompare(b.source_provider));
    if(rows.length<2)return {ok:false,reason:'NO_FRESH_TWO_SOURCE_QUOTES'};
    // Reject correlated/replayed bytes as independent observations.
    if(new Set(rows.map(q=>q.source_blob_sha)).size<rows.length)
      return {ok:false,reason:'DUPLICATE_SOURCE_BYTES'};
    const prices=rows.map(q=>q.price_test_usdc).sort((a,b)=>a-b);
    const price=prices.length%2?prices[(prices.length-1)/2]:
      (prices[prices.length/2-1]+prices[prices.length/2])/2;
    if((prices.at(-1)-prices[0])/price*100>DEFAULT_POLICY.maxQuoteDivergencePct)
      return {ok:false,reason:'SOURCE_PRICE_DIVERGENCE'};
    const liquidity=Math.min(...rows.map(q=>q.liquidity_test_usdc));
    if(liquidity<DEFAULT_POLICY.minLiquidityUsd)
      return {ok:false,reason:'INSUFFICIENT_LIQUIDITY'};
    return {ok:true,price,liquidity,provider_count:rows.length};
  };
  const simulate=(action,k,quote,at,planId,reason,forceNoFill=false)=>{
    const position=positions.get(k);
    const size=action==='BUY'?stake_per_coin_test_usdc:
      (position?.quantity||0)*quote.price;
    if(size/quote.liquidity*100>DEFAULT_POLICY.maxLiquidityUtilizationPct)
      return {status:'NO_FILL',reason:'POOL_CAPACITY_EXCEEDED'};
    if(forceNoFill)return {status:'NO_FILL',reason:'INJECTED_TEST_NO_FILL'};
    const impact=Math.min(0.03,size/quote.liquidity*DEFAULT_POLICY.simulatedImpactMultiplier);
    const spread=DEFAULT_POLICY.simulatedSpreadBps/10000;
    const feeRate=DEFAULT_POLICY.feeBps/10000;
    const executionPrice=quote.price*(action==='BUY'
      ?1+spread+impact:Math.max(0.01,1-spread-impact));
    let quantity,fee,proceeds=null,pnl=null;
    if(action==='BUY'){
      if(positions.size>=DEFAULT_POLICY.maxPositions)
        return {status:'NO_FILL',reason:'MAX_OPEN_POSITIONS'};
      if(cash+1e-8<stake_per_coin_test_usdc)
        return {status:'NO_FILL',reason:'INSUFFICIENT_TEST_CASH'};
      fee=stake_per_coin_test_usdc*feeRate;
      quantity=(stake_per_coin_test_usdc-fee)/executionPrice;
      cash=round(cash-stake_per_coin_test_usdc);
      positions.set(k,{quantity,cost:stake_per_coin_test_usdc,
        source_plan_id:planId,entry_price_test_usdc:executionPrice,opened_at_utc:at,
        token_key:tokenKey({chain:k.split(':')[0],contract:k.split(':')[1]})});
      buys++;
    }else{
      if(!position)return {status:'NO_FILL',reason:'POSITION_NOT_FOUND'};
      quantity=position.quantity;
      const gross=quantity*executionPrice;fee=gross*feeRate;
      proceeds=round(gross-fee);
      pnl=round(proceeds-position.cost);
      cash=round(cash+proceeds);
      realized=round(realized+pnl);
      positions.delete(k);sells++;
    }
    const receipt={sequence:++seq,at_utc:at,plan_id:planId,action,
      market_key:k,trigger:reason,status:'SYNTHETIC_MODEL_FILL_NOT_CLIENT',
      quantity,entry_or_exit_price_test_usdc:executionPrice,
      fee_test_usdc:round(fee),cash_after_test_usdc:cash,
      ...(proceeds===null?{}:{proceeds_test_usdc:proceeds,
        realized_pnl_test_usdc:pnl}),
      reported_real_trade:false,client_receipt:false};
    executions.push(receipt);
    return {status:'SYNTHETIC_MODEL_FILL_NOT_CLIENT',sequence:receipt.sequence};
  };
  for(const tick of timeline.ticks){
    const at=ms(tick.virtual_time_utc),phase=at<start?'WARMUP_NO_TRADING':'TEST_DECISION';
    const validNew=[];
    for(const row of tick.newly_available){
      const q=eligibleObservations[row.input_index];
      if(!q)continue; // never interpret a raw scenario index as a verified quote
      const k=key(q);
      if(!seen.has(k))seen.set(k,[]);
      seen.get(k).push(q);
      validNew.push({market_key:k,source_provider:q.source_provider});
    }
    const row={at_utc:tick.virtual_time_utc,phase,
      synthetic_quote_observations:validNew.length,attempts:[],
      open_positions_after:positions.size,cash_after_test_usdc:cash};
    if(phase==='WARMUP_NO_TRADING'){ticks.push(row);continue}
    const handled=new Set();
    // Intrahour exits are NOT fabricated: stop/take can only trigger at this tick
    // when two fresh synthetic quotes exist. Missing quotes => risk remains open.
    for(const [k,position] of [...positions]){
      const q=pairAt(k,at);
      if(!q.ok){row.attempts.push({market_key:k,action:'HOLD',
        reason:'CANNOT_CHECK_EXIT_'+q.reason});continue}
      const change=(q.price/position.entry_price_test_usdc-1)*100;
      let reason=null;
      if(change<=-stop_loss_pct)reason='HOURLY_STOP_LOSS';
      else if(change>=take_profit_pct)reason='HOURLY_TAKE_PROFIT';
      if(reason){
        const outcome=simulate('SELL',k,q,tick.virtual_time_utc,
          'auto-exit-'+String(at),reason);
        row.attempts.push({market_key:k,action:'SELL',trigger:reason,...outcome});
        if(outcome.status==='SYNTHETIC_MODEL_FILL_NOT_CLIENT')handled.add(k);
        else noFills++;
      }
    }
    for(const p of validPlans.get(tick.virtual_time_utc)||[]){
      const k=key(p);
      if(p.action==='HOLD'){row.attempts.push({market_key:k,action:'HOLD',
        reason:'PRECOMMITTED_FIXED_TEST_PLAN'});continue}
      if(handled.has(k)){row.attempts.push({market_key:k,action:p.action,
        status:'NO_FILL',reason:'ONE_MARKET_ACTION_PER_TICK'});noFills++;continue}
      const q=pairAt(k,at);
      if(!q.ok){row.attempts.push({market_key:k,action:p.action,
        status:'NO_FILL',reason:q.reason});noFills++;continue}
      if(p.action==='BUY'){
        if(positions.has(k)){row.attempts.push({market_key:k,action:'BUY',
          status:'NO_FILL',reason:'POSITION_ALREADY_OPEN'});noFills++;continue}
        if([...positions].some(([other,pos])=>tokenKey(p)===pos.token_key)){
          row.attempts.push({market_key:k,action:'BUY',status:'NO_FILL',
            reason:'TOKEN_POSITION_ALREADY_OPEN_OTHER_POOL'});noFills++;continue;
        }
      }else if(!positions.has(k)){
        row.attempts.push({market_key:k,action:'SELL',status:'NO_FILL',
          reason:'POSITION_NOT_FOUND'});noFills++;continue
      }
      const outcome=simulate(p.action,k,q,tick.virtual_time_utc,p.plan_id,
        'PRECOMMITTED_FIXED_TEST_PLAN',p.force_no_fill===true);
      row.attempts.push({market_key:k,action:p.action,...outcome});
      if(outcome.status==='SYNTHETIC_MODEL_FILL_NOT_CLIENT')handled.add(k);
      else noFills++;
    }
    row.open_positions_after=positions.size;
    row.cash_after_test_usdc=cash;
    ticks.push(row);
  }
  // No fictitious liquidations or end-of-day fills. Unpriced open lots remain
  // explicitly unmarked; final equity and unrealized PnL cannot be proven.
  return {schema:1,kind:'R29_V20_SYNTHETIC_IN_MEMORY_SCENARIO',
    mode:'SYNTHETIC_REGRESSION_ONLY',warmup_start_utc,trade_start_utc,trade_end_utc,
    decision_hour_count:ticks.filter(x=>x.phase==='TEST_DECISION').length,
    warmup_hour_count:ticks.filter(x=>x.phase==='WARMUP_NO_TRADING').length,
    starting_cash_test_usdc:opening_cash_test_usdc,
    stake_per_coin_test_usdc,ending_cash_test_usdc:cash,
    synthetic_buys:buys,synthetic_sells:sells,synthetic_no_fills:noFills,
    synthetic_realized_pnl_test_usdc:realized,
    synthetic_open_positions:[...positions].map(([market_key,p])=>({
      market_key,quantity:p.quantity,source_plan_id:p.source_plan_id,
      initial_cost_test_usdc:p.cost,unrealized_pnl_unverified:true})),
    synthetic_receipts:executions,ticks,
    quarantined_source_events:timeline.quarantined,
    invalid_synthetic_quote_inputs:invalidQuotes,invalid_plans:rejections,
    reported_external_pnl:null,reported_real_paper_fills:0,
    actual_gpt_reviews:0,orders_published:0,actual_network_requests:0,
    windows_state_read_or_modified:false,real_wallet_modified:false,
    external_historical_market_authenticated:false,original_QA04_pass:false,
    limitations:['Only manually supplied synthetic test fixtures and precommitted test plans',
      'Not autonomous GPT BUY/HOLD/SELL; no authentic market risk or route attestations',
      'Stop/take decisions are hourly, not proof of intrahour execution',
      'No fill without two distinct fresh synthetic providers and pool capacity',
      'Open positions are not forcibly liquidated or assigned hindsight exit prices']};
}
