// D4-06: distinct end-return vs INTRA-horizon observed peak/drawdown.
// Price path outcomes are only research labels matured at the evaluation
// timestamp. Sparse samples, oracle winner labels or future data => null.
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const pos=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const rnd=x=>Math.round(x*1e6)/1e6;
const ORACLE=x=>x&&('reported_gain_pct' in x||'future_winner_label' in x
 ||'post_event_rank' in x||x.source_class==='POST_EVENT_ORACLE');
export function analyzeAsOfForecastPath({
 startAtUtc,entryPriceUsd,observations=[],asOfUtc,
 horizonHours=[1,3,6],maximumSamplingGapMinutes=30
}={}){
 const start=ms(startAtUtc),now=ms(asOfUtc);
 if(start===null||now===null||start>now||!pos(entryPriceUsd)
  ||!Array.isArray(observations)||observations.length>20000
  ||JSON.stringify(horizonHours)!==JSON.stringify([1,3,6])
  ||!Number.isInteger(maximumSamplingGapMinutes)
  ||maximumSamplingGapMinutes<5||maximumSamplingGapMinutes>60)
  throw Error('INVALID_ASOF_FORECAST_PATH');
 const valid=[],excluded=[];
 for(const [index,o] of observations.entries()){
  const at=ms(o?.observed_at_utc),available=ms(o?.available_at_utc);
  if(ORACLE(o)||!['ORIGINAL_CAPTURE','SYNTHETIC_TEST'].includes(o?.source_class)
   ||at===null||available===null||at<start||at>now||available<at||available>now
   ||!pos(o.price_usd)||typeof o.source_path!=='string'
   ||!o.source_path.startsWith('research/')){
   excluded.push({index,reason:'NOT_ASOF_CAPTURE_OR_POST_EVENT_ORACLE'});continue;
  }
  valid.push(o);
 }
 valid.sort((a,b)=>ms(a.observed_at_utc)-ms(b.observed_at_utc));
 const outcomes={};
 for(const h of horizonHours){
  const end=start+h*3600000;
  const observed=valid.filter(o=>ms(o.observed_at_utc)<=end);
  const exactEndpoint=observed.findLast(o=>ms(o.observed_at_utc)===end);
  const fullyMature=now>=end&&!!exactEndpoint;
  const path=[{at:start,price:entryPriceUsd},
   ...observed.map(o=>({at:ms(o.observed_at_utc),price:o.price_usd}))];
  const continuous=fullyMature&&path.every((p,i)=>
   i===0||p.at-path[i-1].at<=maximumSamplingGapMinutes*60000)
   &&path.at(-1).at===end;
  let peak=null,drawdown=null;
  if(continuous){
   let highest=entryPriceUsd,maxDrawdown=0,maxPrice=entryPriceUsd;
   for(const p of path){
    highest=Math.max(highest,p.price);
    maxPrice=Math.max(maxPrice,p.price);
    maxDrawdown=Math.max(maxDrawdown,100*(highest-p.price)/highest);
   }
   peak=rnd(100*(maxPrice/entryPriceUsd-1));
   drawdown=rnd(maxDrawdown);
  }
  outcomes[h]={horizon_hours:h,horizon_end_utc:new Date(end).toISOString(),
   endpoint_label_mature_and_present:fullyMature,
   observed_end_return_pct:fullyMature
    ?rnd(100*(exactEndpoint.price_usd/entryPriceUsd-1)):null,
   observed_intrahorizon_peak_return_pct:peak,
   observed_intrahorizon_max_drawdown_pct:drawdown,
   dense_sampling_within_horizon:continuous,
   observed_samples:observed.length,
   missing_endpoint_is_null:!fullyMature,
   sparse_path_peak_is_null:!continuous,
   assumed_executable_peak_price:false};
 }
 return {schema:1,kind:'R29_V19_ASOF_FORECAST_END_VS_PEAK_DRAWDOWN',
  start_at_utc:startAtUtc,as_of_utc:asOfUtc,
  accepted_captured_samples:valid.length,excluded,
  horizon_metrics:outcomes,
  source_authenticity_not_independently_verified:true,
  realized_trading_pnl_test_usdc:null,
  model_orders_authorized:0,actual_gpt_forecasts_verified:0};
}
