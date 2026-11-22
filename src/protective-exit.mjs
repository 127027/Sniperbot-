// V1.8 SHADOW-ONLY protective exit evaluator for existing R29 PAPER positions.
// NEVER changes portfolio, emits GitHub orders or creates PAPER_FILLED receipts.
// A later explicitly authorized integration must require immutable verified quotes.
import {canonicalChain,tokenValid,poolValid,parsePoolUrl,exactPoolUrl} from './market-evidence.mjs';
import {decideUnifiedMarket} from './unified-decision-v18.mjs';

const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const pos=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const sha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const ckey=(ch,x)=>ch==='solana'?x:String(x).toLowerCase();
const fail=(code)=>({schema:1,kind:'R29_V18_SHADOW_PROTECTIVE_EXIT',
 status:'EXIT_DATA_GAP',code,mode:'SHADOW_ONLY',trade_authorized:false,paper_filled:false});
export function inspectProtectiveExit({position,observations=[],asOfUtc,policy={}}={}){
 const now=time(asOfUtc),c=position?.coin,ch=canonicalChain(c?.chain);
 const p={stopLossPct:10,takeProfitPct:20,maxQuoteAgeMs:90000,
  minLiquidityUsd:5000,maxPriceDivergencePct:3,maxLiquidityUtilizationPct:1,
  feeBps:75,spreadBps:40,impactMultiplier:0.5,...policy};
 if(now===null||!ch||!tokenValid(ch,c?.contract)||!poolValid(ch,c?.pool,c?.pool_kind)
    ||!pos(position?.entryPrice)||!pos(position?.quantity)||!pos(position?.costTestUsdc)
    ||!Number.isFinite(p.stopLossPct)||p.stopLossPct<=0||!Number.isFinite(p.takeProfitPct)||p.takeProfitPct<=0
    ||!Number.isFinite(p.maxQuoteAgeMs)||p.maxQuoteAgeMs<=0||!Number.isFinite(p.minLiquidityUsd)||p.minLiquidityUsd<=0)
    return fail('INVALID_POSITION_OR_POLICY');
 if(!Array.isArray(observations)||observations.length!==2)return fail('TWO_QUOTES_REQUIRED');
 const domains=new Set(),sources=new Set(),prices=[],liquidities=[];
 for(const q of observations){
   const parsed=parsePoolUrl(q?.source_url),seen=time(q?.captured_at_utc),updated=time(q?.provider_quote_asof_utc);
   if(!parsed||!exactPoolUrl(q.source_url,ch,c.pool)||domains.has(parsed.host)
      ||!q.provider_id||sources.has(q.provider_id)
      ||q.chain!==ch||ckey(ch,q.contract)!==ckey(ch,c.contract)
      ||ckey(ch,q.pool)!==ckey(ch,c.pool))return fail('SOURCE_IDENTITY_CONFLICT');
   if(seen===null||updated===null||seen>now||updated>seen||now-seen>p.maxQuoteAgeMs
      ||now-updated>p.maxQuoteAgeMs)return fail('STALE_OR_UNDATED_PRICE');
   if(!pos(q.price_usdc)||!pos(q.liquidity_usdc)||!sha(q.source_archive_blob_sha))
      return fail('INVALID_MARKET_EVIDENCE');
   domains.add(parsed.host);sources.add(q.provider_id);prices.push(q.price_usdc);liquidities.push(q.liquidity_usdc);
 }
 const mid=(prices[0]+prices[1])/2,drift=100*Math.abs(prices[0]-prices[1])/mid;
 if(drift>p.maxPriceDivergencePct)return fail('PROVIDER_PRICE_CONFLICT');
 const worst=Math.min(...prices);
 // Identical signal kernel and reference price as Dot4/replay; conservative
 // worse observed price is used only for an estimated (never filled) exit.
 const reference=(prices[0]+prices[1])/2;
 const decision=decideUnifiedMarket({asOfUtc,observedAtUtc:observations.reduce((latest,q)=>
    q.captured_at_utc>latest?q.captured_at_utc:latest,observations[0].captured_at_utc),
    observedPriceUsd:reference,position,fullReviewDue:false,
    params:{stopLossPct:p.stopLossPct,takeProfitPct:p.takeProfitPct,maxObservationAgeMs:p.maxQuoteAgeMs}});
 const movePct=decision.observed_move_pct;
 const trigger=decision.action==='SELL'?decision.reason:null;
 const context={schema:1,kind:'R29_V18_SHADOW_PROTECTIVE_EXIT',mode:'SHADOW_ONLY',
   as_of_utc:asOfUtc,source_order_id:position.sourceOrderId||null,
   observed_worst_provider_price_usdc:worst,observed_move_pct:movePct,
   price_disagreement_pct:drift,trigger_reason:trigger,
   trade_authorized:false,paper_filled:false};
 if(!trigger)return {...context,status:'SHADOW_HOLD',code:'NO_EXIT_TRIGGER'};
 const liquidity=Math.min(...liquidities);
 const utilizationPct=100*position.quantity*worst/liquidity;
 if(liquidity<p.minLiquidityUsd||utilizationPct>p.maxLiquidityUtilizationPct)
   return {...context,status:'EXIT_BLOCKED',code:'LIQUIDITY_INSUFFICIENT',
      observed_min_liquidity_usd:liquidity,utilization_pct:utilizationPct};
 const impact=Math.min(.03,(utilizationPct/100)*p.impactMultiplier);
 const fillEstimate=worst*(1-p.spreadBps/10000-impact);
 const gross=position.quantity*fillEstimate,fee=gross*p.feeBps/10000,estimatedProceeds=gross-fee;
 return {...context,status:'SHADOW_SELL_CANDIDATE',code:trigger,
   estimated_exit_price_usdc:fillEstimate,estimated_net_proceeds_test_usdc:estimatedProceeds,
   estimated_pnl_test_usdc:estimatedProceeds-position.costTestUsdc,
   estimated_only_not_executable_quote:true,
   source_blobs_actually_verified:false,
   note:'Do not settle or publish until a separate verified-authority and executable-PAPER gate is implemented.'};
}
