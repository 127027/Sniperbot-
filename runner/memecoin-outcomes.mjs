// Observational research, not orders or realized PnL.
// 2x/5x/10x/50x/200x mark-price excursions within 14 days from FIRST OBSERVED price.
// A raw DEX indicator cannot prove sellable proceeds, so observations are INDICATIVE.
export const MULTIPLIERS=Object.freeze([2,5,10,50,200]);
const HORIZON_MS=14*86400_000;
const MAX_GAP_MS=6*3600_000;
const date=s=>Date.parse(s);
const numeric=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
export function classifyMemecoinBreakouts({first_seen_at_utc,entry_price_usd,observations=[],
 observed_until_at_utc,independently_verified_quotes=false,complete_ohlcv_coverage=false}={}){
 const start=date(first_seen_at_utc),until=date(observed_until_at_utc),end=start+HORIZON_MS;
 const empty=Object.fromEntries(MULTIPLIERS.map(x=>[x,{multiple:x,hit:null,status:'INSUFFICIENT_DATA'}]));
 const base={schema:'memecoin_14d_excursions.v1',paper_only:true,actionable:false,
  horizon_days:14,first_seen_at_utc,observed_until_at_utc,
  quotes_independently_verified:independently_verified_quotes===true,
  full_ohlcv_coverage_verified:complete_ohlcv_coverage===true,
  simulated_sell_quote_available:false,outcomes:empty};
 if(!Number.isFinite(start)||!Number.isFinite(until)||until<start||!numeric(entry_price_usd)||
    !Array.isArray(observations)||observations.length>100000)return {...base,error:'INVALID_INPUT'};
 const series=observations.filter(o=>numeric(o?.price_usd)&&Number.isFinite(date(o.at_utc))&&
   date(o.at_utc)>=start&&date(o.at_utc)<=Math.min(until,end))
   .sort((a,b)=>date(a.at_utc)-date(b.at_utc));
 // Need at least one verified baseline, plus regular observations through the horizon
 // for NO_HIT. A hit can be observed sooner but is still not an executable sale.
 const dates=[start,...series.map(x=>date(x.at_utc))];
 const latest=dates.at(-1);
 const gaps=dates.slice(1).map((x,i)=>x-dates[i]);
 const coverage=until>=end&&latest>=end-2*3600_000&&
    gaps.every(g=>g<=MAX_GAP_MS)&&series.length>=14*4;
 // Sparse 15m/6h snapshots can miss even a 200x intraday spike.
 // Negative labels require independently verified full OHLCV HIGH coverage,
 // not just regular price sampling. The current free public collector
 // explicitly cannot provide this guarantee.
 const negativeVerified=coverage&&independently_verified_quotes===true&&complete_ohlcv_coverage===true;
 const high=Math.max(entry_price_usd,...series.map(x=>x.price_usd));
 const outcomes=Object.fromEntries(MULTIPLIERS.map(m=>{
  const first=series.find(o=>o.price_usd>=entry_price_usd*m);
  const hit=!!first;
  const status=hit?'INDICATIVE_PRICE_THRESHOLD_OBSERVED':negativeVerified?'VERIFIED_NO_OBSERVED_HIGH':'UNKNOWN_UNVERIFIED_INTERVAL_HIGHS';
  return [m,{multiple:m,hit:hit?true:negativeVerified?false:null,status,
    first_observed_at_utc:first?.at_utc||null}];
 }));
 return {...base,observations_used:series.length,max_indicative_multiple:Math.round(high/entry_price_usd*100)/100,
  coverage_complete:coverage,negative_outcomes_verified:negativeVerified,outcomes};
}
