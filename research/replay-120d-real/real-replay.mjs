// R29 retrospective real-market price-only walk-forward. No fictitious coins.
// CRITICAL: this is not a GPT memecoin discovery backtest. Model is deterministic,
// cohort is retrospectively preselected CEX pairs, "fills" are modelled next-hour
// opens, NOT DEX swap execution or verified buy/sell liquidity.
// Full multi-source GPT trading remains DATA_GAP; user ledger untouched.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {TRAIN_START,TEST_START,STOP,END_EXCLUSIVE,HOUR,DAY,
 KNOWN_RETROSPECTIVE_SYMBOLS} from './source-collector.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const ms=s=>Date.parse(s),iso=n=>new Date(n).toISOString();
const round=n=>Math.round(n*1000000)/1000000;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const median=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y);
 return b.length%2?b[(b.length-1)/2]:(b[b.length/2-1]+b[b.length/2])/2;};
export function quantile(data,p){
 if(!Array.isArray(data)||!data.length||!finite(p)||p<0||p>1)
  throw Error('REAL_REPLAY_QUANTILE_NO_DATA');
 const a=[...data].filter(finite).sort((x,y)=>x-y);
 if(a.length!==data.length)throw Error('REAL_REPLAY_QUANTILE_BAD_VALUE');
 const f=p*(a.length-1),j=Math.floor(f);
 return a[j]+(a[Math.min(a.length-1,j+1)]-a[j])*(f-j);
}
export function calendar(){
 const out=[];
 for(let t=ms(TRAIN_START);t<ms(END_EXCLUSIVE);t+=DAY){
  out.push({date:iso(t).slice(0,10),start:t,
   phase:t<ms(TEST_START)?'TRAIN':'HOLDOUT'});
 }
 if(out.length!==120||out.filter(x=>x.phase==='TRAIN').length!==60)
  throw Error('REAL_REPLAY_CALENDAR_WRONG');
 return out;
}
export function indexSource(source){
 if(source?.schema!=='sniper_r29_real120_collected_sources.v1'||
  source.source_class!=='HISTORICAL_RECORDED_EXTERNAL_DATA_NO_FICTITIOUS_TOKENS'||
  source.window?.training_start!==TRAIN_START||
  source.window?.testing_start!==TEST_START||
  source.window?.last_replay_scan_at_or_before!==STOP||
  source.known_cex_meme_cohort!=='R30_RETROSPECTIVELY_SELECTED_NOT_ASOF_DISCOVERY'||
  !Array.isArray(source.binance))throw Error('REAL_REPLAY_EXTERNAL_SOURCE_INVALID');
 const maps=new Map(),reports=[];
 const expectedStart=ms(TRAIN_START)-48*HOUR;
 const expectedEnd=Math.floor(ms(STOP)/HOUR)*HOUR;
 const expected=(expectedEnd-expectedStart)/HOUR;
 for(const s of source.binance){
  if(!KNOWN_RETROSPECTIVE_SYMBOLS.includes(s.symbol))throw Error('REAL_REPLAY_SYMBOL_ID_INVALID');
  if(s.status!=='COMPLETE'){reports.push({symbol:s.symbol,status:s.status});continue;}
  if(s.bars.length!==expected||s.normalized_sha256!==sha(JSON.stringify(s.bars))||
   s.bars.some((b,i)=>b.t!==expectedStart+i*HOUR||
    b.t+HOUR>expectedEnd||b.visible_at_utc!==iso(b.t+HOUR)||
    ![b.open,b.high,b.low,b.close,b.quote_vol].every(finite)||
    b.low<=0||b.low>Math.min(b.open,b.close)||b.high<Math.max(b.open,b.close)))
   throw Error('REAL_REPLAY_PRICE_CHAIN_INVALID_'+s.symbol);
  maps.set(s.symbol,new Map(s.bars.map(x=>[x.t,x])));
  reports.push({symbol:s.symbol,status:'COMPLETE',
   hourly_bars:s.bars.length,normalized_sha256:s.normalized_sha256,
   raw_source_parts:s.source_parts});
 }
 if(maps.size<6)throw Error('REAL_REPLAY_INSUFFICIENT_ACTUAL_CEX_HISTORY');
 return {maps,source_reports:reports,cutoff:expectedEnd};
}
const lastBar=(map,T)=>map.get(T-HOUR);
const sum=(a,key)=>a.reduce((t,x)=>t+x[key],0);
const asofBars=(map,T,back)=>{
 const a=[];
 for(let h=back;h>=1;h--){
  const b=map.get(T-h*HOUR);if(!b||b.t+HOUR>T)return [];
  a.push(b);
 }
 return a;
};
export function marketSnapshot(index,T){
 const out=[];
 for(const [symbol,map] of index.maps){
  const a=asofBars(map,T,26);
  if(a.length!==26)continue;
  const last=a.at(-1),six=a[19],twentyFour=a[1],
   before6=a.slice(14,20),recent6=a.slice(20,26);
  const v0=sum(before6,'quote_vol'),v1=sum(recent6,'quote_vol');
  const return6=last.close/six.close-1;
  const return24=last.close/twentyFour.close-1;
  const volume_ratio=v0>0?v1/v0:null;
  if(![return6,return24].every(finite))continue;
  out.push({symbol,observed_bar_utc:iso(last.t),visible_after_utc:iso(last.t+HOUR),
   close:last.close,return6,return24,
   volume_ratio,quote_volume_6h_usd:v1,
   reference:'HISTORICAL_BINANCE_SPOT_1H_CLOSED_BAR_NOT_DEX_QUOTE'});
 }
 return out;
}
export function dailyActivity(index,T){
 // The current day's decision sees ONLY 00:00 UTC and prior COMPLETE hours.
 // Nothing from the current day is used to select today's scan frequency.
 let values=[];
 for(const [,map] of index.maps){
  const a=asofBars(map,T,48);
  if(a.length!==48)continue;
  const y=a.slice(-24),prior=a.slice(0,24);
  const last=y.at(-1),first=prior.at(-1);
  const change=last.close/first.close-1;
  const ratio=sum(y,'quote_vol')/Math.max(1,sum(prior,'quote_vol'));
  if(![change,ratio].every(finite))continue;
  values.push({abs_return:Math.abs(change),volume_ratio:ratio});
 }
 if(values.length<6)return null;
 return {at_utc:iso(T),asset_count:values.length,
  abs_return_median:median(values.map(x=>x.abs_return)),
  volume_ratio_median:median(values.map(x=>x.volume_ratio)),
  score:100*median(values.map(x=>x.abs_return))+
   6*Math.abs(Math.log(Math.max(0.01,median(values.map(x=>x.volume_ratio))))),
  provenance:'RECONSTRUCTED_FROM_PRIOR_CLOSED_REAL_BINANCE_1H',
  zero_same_day_or_future_information:true};
}
export function frozenPolicy(index){
 const days=calendar().filter(x=>x.phase==='TRAIN');
 const activities=days.map(d=>dailyActivity(index,d.start))
  .filter(x=>x&&finite(x.score));
 if(activities.length<40)throw Error('TRAIN_ACTIVITY_EVIDENCE_GAP');
 const thresholds=[.25,.5,.75].map(q=>quantile(activities.map(x=>x.score),q));
 const momentum=[];
 for(const d of days){
  for(const s of marketSnapshot(index,d.start))
   if(s.return6>0)momentum.push(s.return6);
 }
 if(momentum.length<120)throw Error('TRAIN_MOMENTUM_NOT_PROVABLE');
 const min6=Math.max(.012,Math.min(.12,quantile(momentum,.7)));
 const frozen={
  schema:'r29_real_price_only_shadow_policy.v1',
  frozen_at_utc:TEST_START,
  threshold_train_days:activities.length,
  price_only_momentum_6h_threshold:min6,
  scan_frequency_train_quartile_bounds:thresholds,
  volume_ratio_gate:1.05,requires_positive_24h:true,
  next_hour_open_fill_model:true,buy_cost_fraction:.01,
  sell_cost_fraction:.01,stop_loss_fraction:.10,
  take_profit_fraction:.20,
  max_holding_hours:336,
  first_60_days_outcome_not_used_to_tune_holdout:true,
  no_model_or_gpt_calls:true,not_a_historic_dex_risk_gate:true,
  no_security_or_sellability_verified:true};
 return {...frozen,policy_sha256:sha(JSON.stringify(frozen))};
}
function pickFreq(v,bounds){
 if(!v)return null;
 return v.score<=bounds[0]?1:v.score<=bounds[1]?4:v.score<=bounds[2]?12:24;
}
export function planRealScans(index,policy){
 const out=[],days=calendar(),prior=[];
 for(const d of days){
  const activity=dailyActivity(index,d.start);
  const bounds=d.phase==='HOLDOUT'?policy.scan_frequency_train_quartile_bounds:
   prior.length>=4?[.25,.5,.75].map(q=>quantile(prior,q)):null;
  const freq=bounds&&activity?pickFreq(activity,bounds):1;
  const scanTimes=Array.from({length:freq},(_,i)=>d.start+i*DAY/freq)
   .filter(t=>t<ms(STOP));
  out.push({date:d.date,phase:d.phase,activity,frequency_per_day:freq,
   scan_times_utc:scanTimes.map(iso),
   asof_status:activity?'ACTUAL_PRIOR_DAY_CEX_EVIDENCE':'INSUFFICIENT_PRIOR_PRICE_BARS',
   frequency_derived_from:activity?
    (d.phase==='HOLDOUT'?'FROZEN_60D_TRAIN_QUARTILES':'ONLINE_PRIOR_TRAIN_DAYS'):
    'MINIMUM_RESEARCH_CLOCK_ONLY',
   asof_cex_shortlist_only:true});
  if(activity)prior.push(activity.score);
 }
 return out;
}
export function priceOnlySignal(snapshot,policy){
 // Deterministic price-only comparator, NOT GPT, not a DEX BUY endorsement.
 return snapshot.filter(s=>s.return6>=policy.price_only_momentum_6h_threshold&&
  s.return24>0&&finite(s.volume_ratio)&&s.volume_ratio>=policy.volume_ratio_gate)
  .sort((a,b)=>b.return6-a.return6||a.symbol.localeCompare(b.symbol));
}
export function simulateCexShadow(index,policy,schedule,{risk='A_CONSERVATIVE'}={}){
 if(!['A_CONSERVATIVE','B_DYNAMIC_EXPERIMENTAL'].includes(risk))
  throw Error('REAL_SHADOW_RISK_MODE_INVALID');
 let cash=5000,closedPnl=0,serial=0;
 const positions=new Map(),orders=[],decisions=[],daily=[],pendingSell=new Set();
 const maxPositions=risk==='A_CONSERVATIVE'?3:5;
 let lastGuardHour=ms(TEST_START)-HOUR;
 const nextOpen=(symbol,t)=>{
  const b=index.maps.get(symbol)?.get(t+HOUR);
  if(!b||t+HOUR>ms(STOP))return null;
  return {at:t+HOUR,price:b.open};
 };
 const sell=(symbol,triggerTime,reason,kind)=>{
  const p=positions.get(symbol),exec=nextOpen(symbol,triggerTime);
  if(!p||!exec||exec.at<=p.opened_at)return false;
  const proceeds=p.quantity*exec.price*(1-policy.sell_cost_fraction);
  const pnl=proceeds-p.invested_usdc;
  cash+=proceeds;closedPnl+=pnl;positions.delete(symbol);
  orders.push({id:'shadow_'+(++serial),kind:'PRICE_ONLY_CEX_SHADOW_NOT_GPT',
   risk_variant:risk,action:'SELL',symbol,signal_at_utc:iso(triggerTime),
   fill_at_utc:iso(exec.at),entry_at_utc:iso(p.opened_at),
   holding_hours:(exec.at-p.opened_at)/HOUR,
   modeled_exit_price_usdc:exec.price,modeled_proceeds_test_usdc:round(proceeds),
   modeled_realized_pnl_test_usdc:round(pnl),
   reason,actor:kind,
   actual_exchange_execution_verified:false,actual_dex_swap_verified:false});
  return true;
 };
 for(const day of schedule.filter(x=>x.phase==='HOLDOUT')){
  const before=orders.length,scanned=[];
  for(const tText of day.scan_times_utc){
   const T=ms(tText);
   // Separate hourly price-only guard checks the last COMPLETED hourly bar.
   for(let h=lastGuardHour+HOUR;h<T;h+=HOUR){
    for(const [symbol,p] of [...positions]){
     const closed=index.maps.get(symbol)?.get(h-HOUR);
     if(closed&&closed.close<=p.entry_price*(1-policy.stop_loss_fraction))
      sell(symbol,h,'CEX_PRICE_STOP_TRIGGER_PRIOR_CLOSED_BAR',
       'LOCAL_SHADOW_GUARD_NOT_REAL_BOT');
    }
   }
   lastGuardHour=Math.max(lastGuardHour,T);
   const market=marketSnapshot(index,T);
   const picks=priceOnlySignal(market,policy),top=picks.slice(0,5);
   const missing_market=market.length<6;
   for(const [symbol,p] of [...positions]){
    const s=market.find(x=>x.symbol===symbol);
    if(!s)continue;
    const h=(T-p.opened_at)/HOUR;
    const gain=s.close/p.entry_price-1;
    const reason=gain>=policy.take_profit_fraction?'PRICE_ONLY_20PCT_TARGET':
     gain<=-policy.stop_loss_fraction?'PRICE_ONLY_10PCT_STOP':
     h>=policy.max_holding_hours?'PRICE_ONLY_14D_MAX_HOLD':
     s.return6<-.04?'PRICE_ONLY_FLOW_REVERSAL':null;
    if(reason)sell(symbol,T,reason,'STRATEGY_DETERMINISTIC_NOT_GPT');
    else decisions.push({at_utc:tText,symbol,action:'HOLD',
     source:'REAL_CEX_PRICE_ONLY_SHADOW_NOT_GPT'});
   }
   for(const s of top){
    if(positions.has(s.symbol)||positions.size>=maxPositions)continue;
    const fill=nextOpen(s.symbol,T);
    if(!fill)continue;
    const wanted=risk==='A_CONSERVATIVE'?50:
     Math.max(50,Math.min(5000,cash,
      cash*(s.return6>=2*policy.price_only_momentum_6h_threshold?1:
        s.return6>=1.5*policy.price_only_momentum_6h_threshold?.75:.35)));
    const amount=Math.min(cash,wanted);
    if(amount<50)continue;
    if(risk==='A_CONSERVATIVE'&&[...positions.values()]
     .reduce((n,p)=>n+p.invested_usdc,0)+amount>150)continue;
    cash-=amount;
    positions.set(s.symbol,{
     quantity:amount*(1-policy.buy_cost_fraction)/fill.price,
     entry_price:fill.price,opened_at:fill.at,invested_usdc:amount});
    orders.push({id:'shadow_'+(++serial),kind:'PRICE_ONLY_CEX_SHADOW_NOT_GPT',
     risk_variant:risk,action:'BUY',symbol:s.symbol,
     signal_at_utc:tText,fill_at_utc:iso(fill.at),
     modeled_entry_price_usdc:fill.price,modeled_stake_test_usdc:round(amount),
     why:'ASOF_6H_MOMENTUM_AND_VOLUME_CEX_PUBLISHED_CANDLE',
     source_candle_at_utc:s.observed_bar_utc,
     actual_exchange_execution_verified:false,actual_dex_swap_verified:false});
   }
   scanned.push({at_utc:tText,available_cex_symbols:market.length,
    research_shortlist_top5:top.map(x=>({
     symbol:x.symbol,visible_after_utc:x.visible_after_utc,
     last_close:x.close,return_6h:round(x.return6),
     return_24h:round(x.return24),volume_ratio_6h:round(x.volume_ratio)})),
    actual_gpt_call_performed:false,real_dex_security_verified:false,
    real_historic_gpt_trade_intent:null,
    missing_market_sources:missing_market?'CEX_SOURCE_GAP':null});
   decisions.push({at_utc:tText,action:'PRICE_ONLY_SCREEN',
    source:'REAL_HISTORICAL_CEX_MARKET_DETERMINISTIC_NOT_GPT',
    top_symbols:top.map(x=>x.symbol)});
  }
  const freshOrders=orders.slice(before);
  daily.push({date:day.date,risk_variant:risk,
   frequency_per_day:day.frequency_per_day,actual_price_only_scans:scanned.length,
   modeled_buy_count:freshOrders.filter(x=>x.action==='BUY').length,
   modeled_sell_count:freshOrders.filter(x=>x.action==='SELL').length,
   open_price_only_positions:positions.size,
   modeled_cash_test_usdc:round(cash),
   realized_model_pnl_test_usdc:round(closedPnl),
   trading_status:'CEX_PRICE_SHADOW_ONLY_NEVER_VERIFIED_GPT_DEX'});
 }
 const lastPriceTime=Math.floor(ms(STOP)/HOUR)*HOUR;
 const valued=[...positions].map(([symbol,p])=>{
  const last=index.maps.get(symbol)?.get(lastPriceTime-HOUR);
  return {symbol,invested_usdc:p.invested_usdc,
   last_indicative_close:last?.close||null,
   indicative_only_value_usdc:last?round(p.quantity*last.close*(1-policy.sell_cost_fraction)):null};
 });
 const endingEquity=valued.every(x=>x.indicative_only_value_usdc!==null)?
  cash+valued.reduce((a,p)=>a+p.indicative_only_value_usdc,0):null;
 return {risk_variant:risk,source_type:'REAL_CEX_PRICE_ONLY_SHADOW',
  retrospective_symbol_selection_bias:true,
  actual_gpt_calls:0,actual_dex_fills:0,
  strategy_is_deterministic_not_gpt:true,
  modeled_buy_count:orders.filter(x=>x.action==='BUY').length,
  modeled_sell_count:orders.filter(x=>x.action==='SELL').length,
  modeled_closed_pnl_test_usdc:round(closedPnl),
  open_shadow_positions:valued,remaining_cash_test_usdc:round(cash),
  indicative_equity_if_marked_usdc:endingEquity===null?null:round(endingEquity),
  orders,decisions,daily};
}
export function evaluateRealHistorical(source){
 const index=indexSource(source);
 const policy=frozenPolicy(index);
 const days=planRealScans(index,policy);
 const shadowA=simulateCexShadow(index,policy,days,{risk:'A_CONSERVATIVE'});
 const shadowB=simulateCexShadow(index,policy,days,{risk:'B_DYNAMIC_EXPERIMENTAL'});
 const pmap=new Map(source.pump.days.map(x=>[x.date_utc,x]));
 const hf=source.hf.sets.flatMap(x=>x.first_sample_mints||[])
  .filter(x=>x&&x.launched_at);
 const daily=days.map(d=>({
  date:d.date,phase:d.phase,analysis_cadence_from_real_cex:d.frequency_per_day,
  price_only_virtual_scan_count:d.scan_times_utc.length,
  scan_times_utc:d.scan_times_utc,
  historic_pump_launches_retrospectively_reported:pmap.get(d.date)?.launches??null,
  historic_pump_graduations_retrospectively_reported:pmap.get(d.date)?.graduated??null,
  pump_daily_available_asof_not_attested:true,
  actual_gpt_model_calls_at_historical_t_by_this_replay:0,
  genuine_dex_new_coin_discovery_proven:false,
  verified_full_gpt_buy_count:null,verified_full_gpt_sell_count:null,
  verified_full_gpt_hold_count:null,proven_gpt_portfolio_pnl_test_usdc:null,
  strict_full_strategy_status:'DATA_GAP_NO_ASOF_SECURITY_LP_SOCIAL_EXECUTABLE_DEX_QUOTE',
  price_only_shadow_A:{
   modeled_buy_count:shadowA.daily.find(x=>x.date===d.date)?.modeled_buy_count??0,
   modeled_sell_count:shadowA.daily.find(x=>x.date===d.date)?.modeled_sell_count??0},
  price_only_shadow_B:{
   modeled_buy_count:shadowB.daily.find(x=>x.date===d.date)?.modeled_buy_count??0,
   modeled_sell_count:shadowB.daily.find(x=>x.date===d.date)?.modeled_sell_count??0}
 }));
 const totalPriceScans=days.reduce((n,d)=>n+d.scan_times_utc.length,0);
 const a={
  schema:'sniper_r29_real120_replay_audit.v1',
  timeframe:{training_start_utc:TRAIN_START,holdout_start_utc:TEST_START,
   last_replay_cutoff_utc:STOP,train_days:60,holdout_days:60},
  original_source_collection_utc:source.fetch_time_utc,
  historical_data_provenance:source.provider_status,
  source_limitations:{
   inherited_cex_cohort:'RETROSPECTIVELY_SELECTED; NOT HISTORICALLY UNBIASED NEW DEX MEME LAUNCH UNIVERSE',
   pump:'MONTHLY DATA RETROSPECTIVELY COMPUTED; STRICT HISTORICAL AVAILABILITY NOT ATTESTED',
   dex:'PEPE HISTORIC DEX CANDLES, NO HISTORIC FULL SELLABILITY/LP AT DECISION',
   hf:'SMALL SANITIZED THIRD PARTY SOLANA LAUNCH SAMPLE, NOT COMPLETE OR INDEPENDENTLY RPC VERIFIED',
   news_social:'NO_COMPLETE_ARCHIVED_POINT_IN_TIME_CANDIDATE_NARRATIVE',
   no_fabricated_trades:true},
  full_gpt_backtest:{historical_real_gpt_model_calls_created_by_replay:0,
   genuine_historic_gpt_buy_count_proven:null,
   genuine_historic_gpt_sell_count_proven:null,
   genuine_historic_gpt_hold_count_proven:null,
   historical_gpt_pnl_test_usdc:null,
   active_user_paper_account_modified:false,real_trading_enabled:false,
   status:'NOT_YET_PROVEN_NO_FULL_ASOF_DEX_SECURITY_OR_HISTORIC_GPT_CALLS'},
  training_frozen_policy:policy,
  deterministic_real_price_research:{
   scheduled_price_only_virtual_scans:totalPriceScans,
   actual_price_only_source_bars:index.source_reports
    .filter(x=>x.status==='COMPLETE').reduce((n,x)=>n+x.hourly_bars,0),
   completed_source_symbols:index.maps.size,
   every_scan_uses_only_completed_real_past_bars:true,
   not_actual_historic_gpt_model_calls:true},
  shadow_price_only_comparisons:{
   A:{...shadowA,orders:undefined,decisions:undefined,daily:undefined},
   B:{...shadowB,orders:undefined,decisions:undefined,daily:undefined}
  },
  report_monthly_history_pump_days:source.pump.days.length,
  historical_dex_pepe_ohlcv_days:source.dex.rows.length,
  historical_sol_sample_records:source.hf.sets.reduce((s,x)=>s+(x.sampled_rows||0),0),
  daily};
 return {summary:a,daily,days,shadowA,shadowB};
}
const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
 const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'generated');
 const source=JSON.parse(readFileSync(path.join(folder,'real-sources.json'),'utf8'));
 const o=evaluateRealHistorical(source);
 mkdirSync(folder,{recursive:true});
 const save=(p,data)=>writeFileSync(path.join(folder,p),JSON.stringify(data,null,2)+'\n');
 save('real120-summary.json',{...o.summary,daily:undefined});
 save('real120-every-day.json',o.daily);
 save('real120-scan-schedule.json',o.days);
 save('price-only-shadow-A-trades.json',o.shadowA.orders);
 save('price-only-shadow-B-trades.json',o.shadowB.orders);
 save('price-only-shadow-A-daily.json',o.shadowA.daily);
 save('price-only-shadow-B-daily.json',o.shadowB.daily);
 const h=['date,phase,price_only_scans,actual_gpt_calls,reported_pump_launches,shadow_A_BUY,shadow_A_SELL,shadow_B_BUY,shadow_B_SELL,verified_real_dex_gpt_trades,status'];
 const lines=o.daily.map(x=>[x.date,x.phase,x.price_only_virtual_scan_count,
  0,x.historic_pump_launches_retrospectively_reported??'UNKNOWN',
  x.price_only_shadow_A.modeled_buy_count,x.price_only_shadow_A.modeled_sell_count,
  x.price_only_shadow_B.modeled_buy_count,x.price_only_shadow_B.modeled_sell_count,
  'NOT_VERIFIABLE',x.strict_full_strategy_status].join(','));
 writeFileSync(path.join(folder,'real120-daily.csv'),[...h,...lines].join('\n')+'\n');
 const root=o.summary;
 console.log('REAL120_COVERAGE',JSON.stringify(root.historical_data_provenance));
 console.log('REAL120_ASOF_SCANS',root.deterministic_real_price_research.scheduled_price_only_virtual_scans);
 console.log('REAL120_FROZEN_TRAIN_POLICY',JSON.stringify(root.training_frozen_policy));
 console.log('REAL120_CEX_SHADOW_A',JSON.stringify(root.shadow_price_only_comparisons.A));
 console.log('REAL120_CEX_SHADOW_B',JSON.stringify(root.shadow_price_only_comparisons.B));
 console.log('REAL120_STRICT_GPT',JSON.stringify(root.full_gpt_backtest));
 console.log('REAL120_DAILY_CSV',path.join(folder,'real120-daily.csv'));
}
