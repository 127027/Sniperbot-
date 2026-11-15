// R27: timestamp-bound sell-RISK *research* alert from repeated public pools.
// Overlapping 5m window comparisons do not prove actual sellability or signal
// causality. Never executes BUY, SELL, wallet operations or paper fills.
const windowMs=10*60000;
const number=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function detectR27ExitRisk(previous,current){
 const empty={schema:'r27_exit_risk_reviews.v1',status:'INSUFFICIENT_PAIR_HISTORY',
  observed_at_utc:current?.published_at_utc||null,reviews:[],auto_sells:0};
 if(!previous||!current||previous.schema!=='research_market_snapshot.v1'||
  current.schema!=='research_market_snapshot.v1'||
  previous.paper_only!==true||current.paper_only!==true||
  previous.actionable!==false||current.actionable!==false||
  !Array.isArray(previous.candidates)||!Array.isArray(current.candidates))return empty;
 const a=Date.parse(previous.published_at_utc),b=Date.parse(current.published_at_utc);
 if(!Number.isFinite(a)||!Number.isFinite(b)||b-a<60000||b-a>windowMs)return empty;
 const prior=new Map(previous.candidates.filter(x=>typeof x.candidate_id==='string')
  .map(x=>[x.candidate_id,x]));
 const reviews=[];
 for(const x of current.candidates){
  const p=prior.get(x.candidate_id);
  if(!p||!number(x.price_usd)||!number(p.price_usd)||p.price_usd<=0||
   !number(x.liquidity_usd)||!number(p.liquidity_usd)||p.liquidity_usd<20000||
   !number(x.volume_m5_usd)||!number(p.volume_m5_usd)||
   !number(x.buys_m5)||!number(x.sells_m5))continue;
  const priceDecline=(1-x.price_usd/p.price_usd)*100;
  const liqDecline=(1-x.liquidity_usd/p.liquidity_usd)*100;
  const volumeDecline=(1-x.volume_m5_usd/Math.max(1,p.volume_m5_usd))*100;
  const sellPressure=x.sells_m5>=Math.max(5,1.5*x.buys_m5);
  const liquidityShock=priceDecline>=4&&liqDecline>=20;
  const exhaustion=priceDecline>=6&&volumeDecline>=35&&sellPressure;
  if(!liquidityShock&&!exhaustion)continue;
  reviews.push({candidate_id:x.candidate_id,chain:x.chain,
   pool_address:x.pool_address,token_address:x.token_address,
   source_at_utc:current.published_at_utc,previous_at_utc:previous.published_at_utc,
   indicative_price_decline_pct:Math.round(priceDecline*100)/100,
   indicative_liquidity_decline_pct:Math.round(liqDecline*100)/100,
   m5_volume_decline_pct:Math.round(volumeDecline*100)/100,
   sell_pressure_observed:sellPressure,
   reason:liquidityShock?'PRICE_AND_LIQUIDITY_SHOCK':'MOMENTUM_EXHAUSTION',
   sellability_verified:false,independent_contract_security_verified:false,
   recommended_action:'REVIEW_PAPER_POSITION_FOR_SELL',
   auto_sold:false,paper_only:true,actionable:false,
   warning:'Overlapping DEX-aggregator windows may reflect temporary bot/wash activity.'});
 }
 return {...empty,status:'TWO_SNAPSHOT_COMPARISON',
  reviews:reviews.slice(0,24)};
}
