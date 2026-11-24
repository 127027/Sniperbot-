// First historical review: same deterministic signal kernel, explicit indicative basis.
import {decideUnifiedMarket} from './unified-decision-v18.mjs';
const ms=x=>Date.parse(x);
const n=x=>{const z=Number(x);if(!Number.isFinite(z)||z<=0)throw Error('INVALID_PRICE');return z;};
export function reviewHistoricalPair({pair,states,quote,fx,tickUtc}={}){
 if(quote.mint!==pair.mint||quote.pool!==pair.pool||quote.tick_utc!==tickUtc||quote.source_sha256!==pair.source_sha256||quote.fx_source_sha256!==fx.source_sha256||quote.model_status!=='INDICATIVE_ONLY')throw Error('MODEL_IDENTITY_MISMATCH');
 const a=states.find(x=>x.receipt_id===pair.earlier&&x.pool===pair.pool&&x.mint===pair.mint);
 const b=states.find(x=>x.receipt_id===pair.later&&x.pool===pair.pool&&x.mint===pair.mint);
 if(!a?.event_flow_verified||!b?.event_flow_verified||ms(a.block_time_utc)+60000>=ms(tickUtc)||ms(b.block_time_utc)+60000>=ms(tickUtc)||ms(fx.modeled_available_at_utc)>=ms(tickUtc))throw Error('INVALID_ASOF_STATE');
 // Use common pre-tick FX normalization of two SOL-denominated reserve states.
 // This measures curve movement in SOL, not independent historical USD candles.
 const price=s=>n(s.virtual_sol)/n(s.virtual_token)/1000*n(fx.close_usdc_per_sol);
 const prior=price(a.post),current=price(b.post);
 const decision=decideUnifiedMarket({asOfUtc:tickUtc,observedAtUtc:b.block_time_utc,observedPriceUsd:current,priorAtUtc:a.block_time_utc,priorPriceUsd:prior,fullReviewDue:true});
 return {mint:pair.mint,pool:pair.pool,tick_utc:tickUtc,prior_observed_at_utc:a.block_time_utc,latest_observed_at_utc:b.block_time_utc,prior_normalized_price_usdc:prior,latest_normalized_price_usdc:current,curve_move_pct:(current/prior-1)*100,price_basis:'SOL_CURVE_SPOT_NORMALIZED_WITH_COMMON_PRETICK_FX',shared_kernel_decision:decision,entry_impact_bps:quote.entry.price_impact_bps,roundtrip_cost_micro_usdc:quote.roundtrip_model_cost_micro_usdc,risk_status:quote.risk_status,model_execution_allowed:false,model_execution_reason:'HISTORICAL_TOKEN_RISK_AND_EXECUTION_UNCERTAINTY',actual_gpt_review_completed:false,orders:0};
}
