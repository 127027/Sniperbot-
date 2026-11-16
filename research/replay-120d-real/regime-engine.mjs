// Sniperbot R29: historical *CEX PRICE-ONLY* as-of regime and exposure study.
// Pure functions; NO GPT API calls, wallets, execution, orders, model "wins".
export const HOUR=3600000,DAY=24*HOUR;
export const TRAIN_START=Date.parse('2026-07-20T00:00:00Z');
export const HOLDOUT_START=Date.parse('2026-09-18T00:00:00Z');
export const HISTORIC_CUTOFF=Date.parse('2026-11-16T09:12:00Z');
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const iso=t=>new Date(t).toISOString();
const keyDays=['BTCUSDT','ETHUSDT','SOLUSDT'];
const valid=(map,t)=>{const b=map?.get(t);return b&&b.t===t&&
 finite(b.close)&&b.close>0&&b.visible_at_utc===iso(t+HOUR)};
export function classifyRegime(reference,T){
 if(!Number.isInteger(T)||T%HOUR!==0||T<TRAIN_START||T>HISTORIC_CUTOFF)
  throw Error('REGIME_INVALID_ASOF_UTC');
 const info={};
 for(const symbol of keyDays){
  const map=reference.maps?.get(symbol);
  const lastT=T-HOUR,oldWeek=T-169*HOUR,oldDay=T-25*HOUR;
  if(!valid(map,lastT)||!valid(map,oldWeek)||!valid(map,oldDay)){
   return {at_utc:iso(T),regime:'UNKNOWN_REFERENCE_DATA_GAP',
    asof_completed_spot_candles_only:true,reference_prices_included:false,
    latest_closed_at_utc:iso(lastT+HOUR)};
  }
  const last=map.get(lastT),week=map.get(oldWeek),day=map.get(oldDay);
  info[symbol]={last_close:last.close,
    return_7d:last.close/week.close-1,
    return_24h:last.close/day.close-1,
    source_closed_utc:last.visible_at_utc};
 }
 const btc=info.BTCUSDT,eth=info.ETHUSDT;
 const up=btc.return_7d>=.02&&eth.return_7d>=.025&&
  btc.return_24h>0&&eth.return_24h>0;
 const down=btc.return_7d<=-.02&&eth.return_7d<=-.025&&
  btc.return_24h<0&&eth.return_24h<0;
 return {at_utc:iso(T),regime:up?'BULL':down?'BEAR':'MIXED_OR_SIDEWAYS',
  asof_completed_spot_candles_only:true,
  reference_prices_included:true,
  reference:info,
  thresholds:{btc_7d_bull:.02,eth_7d_bull:.025,
   btc_7d_bear:-.02,eth_7d_bear:-.025},
  no_future_market_regime_or_outcome_used:true};
}
// Heldout intraday schedule: refresh each hourly market observation, no
// "morning choice remains frozen". Training quartiles are used only for the
// TEST phase; earlier training-phase frequencies use online prior train days.
export function scheduledFrequency(activity,bounds){
 if(!activity||!Array.isArray(bounds)||bounds.length!==3||
  !bounds.every(finite)||!(bounds[0]<=bounds[1]&&bounds[1]<=bounds[2]))
  return 1;
 const x=activity.score;
 if(!finite(x))return 1;
 return x<=bounds[0]?1:x<=bounds[1]?4:x<=bounds[2]?12:24;
}
export function intradayReviewSchedule({
 phase,start,stop,activityAt,quartilesAt,atLeastOne=true
}){
 if(!['TRAIN_IN_SAMPLE','HOLDOUT'].includes(phase)||
  !Number.isInteger(start)||!Number.isInteger(stop)||
  start%HOUR!==0||stop<=start||typeof activityAt!=='function'||
  typeof quartilesAt!=='function')throw Error('INTRADAY_INVALID_PLAN');
 const points=[],replans=[];
 let last=-Infinity,completed=0,previous=null;
 for(let T=start;T<stop;T+=HOUR){
  const activity=activityAt(T),bounds=quartilesAt(T);
  const frequency=scheduledFrequency(activity,bounds);
  if(frequency!==previous){
   replans.push({at_utc:iso(T),from:previous,to:frequency,
    evidence_status:activity?'CLOSED_REAL_CEX_PRICE_BARS':'UNKNOWN',
    no_retroactive_model_calls:true});
   previous=frequency;
  }
  if(completed>=24)break;
  // UTC daily schedule is a model environment, NOT the live Berlin scheduler.
  const due=completed===0?atLeastOne:
   T-last>=DAY/frequency;
  if(due){
   points.push({at_utc:iso(T),frequency_when_scanned:frequency,
    price_only_not_historic_GPT:true});
   last=T;completed++;
  }
 }
 if(points.length>24||points.some((p,i)=>i&&
  Date.parse(p.at_utc)-Date.parse(points[i-1].at_utc)<HOUR))
  throw Error('INTRADAY_24_SCAN_HOURLY_INVARIANT');
 return {phase,day_utc:iso(start).slice(0,10),scans:points,
  revisions:replans,completed_price_only_scans:points.length,
  actual_GPT_model_calls_at_past_time:0,
  no_laptop_position_or_wallet_mutation:true};
}
// Explicit risk ladder: allowable 50..5000 is NOT an entitlement to 5000.
// Distinguish paper sensitivity from unchanged live limits.
export function chooseVirtualPaperStake({
 availableCash,virtualEquity,openExposure=0,positions=0,
 regime,signalStrength=0,riskProfile='CAUTIOUS'
}){
 if(![availableCash,virtualEquity,openExposure,signalStrength].every(finite)||
  availableCash<0||virtualEquity<=0||openExposure<0||
  !Number.isInteger(positions)||positions<0||
  !['CAUTIOUS','STRESS'].includes(riskProfile))
  throw Error('INVALID_PAPER_STAKE_CONTEXT');
 if(positions>=3||['BEAR','UNKNOWN_REFERENCE_DATA_GAP'].includes(regime))
  return {stake:0,reason:'NO_NEW_ENTRY_REGIME_OR_SLOTS'};
 const ladder=[50,100,250,500,1000,2500,5000];
 const tier=regime==='BULL'?
  signalStrength>=3?6:signalStrength>=2?5:signalStrength>=1.5?4:3:
  signalStrength>=2?2:signalStrength>=1.5?1:0;
 const wanted=ladder[tier];
 const exposureMax=riskProfile==='CAUTIOUS'?.12:.95;
 const perPositionMax=riskProfile==='CAUTIOUS'?.05:.95;
 const budget=Math.min(availableCash,
  virtualEquity*perPositionMax,virtualEquity*exposureMax-openExposure);
 const allowed=ladder.filter(x=>x<=Math.min(wanted,budget));
 const stake=allowed.at(-1)??0;
 return {stake,reason:stake>0?'MODELED_PRIOR_EVIDENCE_AND_PORTFOLIO_BUDGET':
  'INSUFFICIENT_FREE_CAPITAL_OR_EXPOSURE',
  desired_without_risk_cap:wanted,
  risk_profile:riskProfile,
  maximum_stake_allowed_for_ISOLATED_PAPER_RESEARCH:5000,
  upper_risk_fraction_ISOLATED_PAPER_RESEARCH:perPositionMax,
  approved_for_running_laptop_paper_bot:false,
  actual_execution:false};
}
