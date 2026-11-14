// V0.5 early-acceleration radar for repeated SAME-pool public research snapshots.
// An alert is a RESEARCH task, not social proof, a win probability or paper order.
import {candidateId} from './research-watchlist.mjs';
import {createHash} from 'node:crypto';

const MIN_INTERVAL_MS=60_000,MAX_INTERVAL_MS=30*60_000;
const isNum=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function key(c){
 if(!c||typeof c!=='object')return null;
 try{const id=candidateId(c.chain,c.token_address,c.pool_address);
  return id===c.candidate_id?id:null;
 }catch{return null}
}
function safeSources(c){
 if(!Array.isArray(c?.source_urls))return [];
 return c.source_urls.filter(x=>{
  if(typeof x!=='string'||x.length>900||/\s/.test(x))return false;
  try{const url=new URL(x);
   return url.protocol==='https:'&&!!url.hostname&&!url.username&&!url.password;
  }catch{return false}
 }).slice(0,5);
}
function change(current,previous){
 return Math.round((current/previous)*100)/100;
}
export function detectEarlyMarketAcceleration(previous,current){
 const empty={schema:'research_market_triggers.v1',paper_only:true,actionable:false,
  published_at_utc:current?.published_at_utc||null,events:[],
  evaluated_pairs:0,reason:'NEED_TWO_SEPARATE_TIMED_SNAPSHOTS'};
 if(previous?.schema!=='research_market_snapshot.v1'||
    current?.schema!=='research_market_snapshot.v1'||
    previous.paper_only!==true||current.paper_only!==true||
    previous.actionable!==false||current.actionable!==false||
    !Array.isArray(previous.candidates)||!Array.isArray(current.candidates))
  return empty;
 const a=Date.parse(previous.published_at_utc),b=Date.parse(current.published_at_utc);
 if(!Number.isFinite(a)||!Number.isFinite(b)||b-a<MIN_INTERVAL_MS||
    b-a>MAX_INTERVAL_MS)return empty;
 const before=new Map(previous.candidates.filter(c=>key(c)).map(c=>[c.candidate_id,c]));
 let evaluated=0;
 const events=[];
 for(const c of current.candidates){
  if(!key(c))continue;
  const p=before.get(c.candidate_id);
  if(!p)continue;
  evaluated++;
  if(!isNum(p.volume_m5_usd)||p.volume_m5_usd<100||
     !isNum(c.volume_m5_usd)||c.volume_m5_usd<2000||
     !isNum(p.liquidity_usd)||p.liquidity_usd<10000||
     !isNum(c.liquidity_usd)||c.liquidity_usd<25000||
     c.liquidity_usd<0.7*p.liquidity_usd||
     !isNum(c.buys_m5)||c.buys_m5<12||
     !isNum(c.sells_m5))continue;
  const ratio=c.volume_m5_usd/p.volume_m5_usd;
  if(ratio<3||c.buys_m5<c.sells_m5*1.3)continue;
  const priceRatio=isNum(c.price_usd)&&c.price_usd>0&&isNum(p.price_usd)&&p.price_usd>0?
   c.price_usd/p.price_usd:null;
  const liquidityRatio=c.liquidity_usd/p.liquidity_usd;
  if(priceRatio===null||(priceRatio<1.15&&liquidityRatio<1.5))continue;
  const basis=c.candidate_id+'|'+current.published_at_utc+'|MARKET_ACCELERATION';
  const id=createHash('sha256').update(basis).digest('hex').slice(0,32);
  events.push({
   event_id:'research-alert-'+id,event_type:'MARKET_ACCELERATION',
   candidate_id:c.candidate_id,chain:c.chain,token_address:c.token_address,
   pool_address:c.pool_address,observed_at_utc:current.published_at_utc,
   previous_observed_at_utc:previous.published_at_utc,
   previous_volume_m5_usd:p.volume_m5_usd,current_volume_m5_usd:c.volume_m5_usd,
   m5_volume_ratio:change(c.volume_m5_usd,p.volume_m5_usd),
   current_liquidity_usd:c.liquidity_usd,buy_transactions_m5:c.buys_m5,
   sell_transactions_m5:c.sells_m5,
   indicative_price_ratio:priceRatio===null?null:Math.round(priceRatio*100)/100,
   source_urls:safeSources(c),
   paper_only:true,actionable:false,probability_pct:null,
   recommended_action:'INDEPENDENT_FIVE_ROLE_REVIEW',
   unknown_checks:['ORGANIC_SOCIAL_PROOF','INDEPENDENT_WALLET_ANALYSIS',
    'CONTRACT_SECURITY','LP_CONTROL','SELLABILITY','SIZE_SPECIFIC_EXIT_QUOTE'],
   warning:'Volume and buy counts from DEX aggregator may include wash trading, bot clusters or self-trades. This is NOT a trade signal.'
  });
 }
 return {...empty,events:events.slice(0,24),evaluated_pairs:evaluated,
  reason:events.length?'POTENTIAL_ACTIVITY_ACCELERATION_FOR_REVIEW':'NO_VERIFIED_ACCELERATION_PATTERN'};
}
