// GPT chooses the strategy. Evidence validation and execution remain separate.
// No network calls, no order authorization, no claim of authenticated GPT identity.
import {createHash} from 'node:crypto';
export const GPT_RESEARCH_POLICY='GPT_RESEARCH_V1';
export const decisionHash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const text=x=>typeof x==='string'&&x.trim().length>0;
export function checkResearchDecision({review,inputSha256,mint,pool,tickUtc,positionOpen=false}={}){
 const allowed=positionOpen?['HOLD','SELL','DATA_GAP']:['BUY','WATCH','NO_TRADE','DATA_GAP'];
 const valid=review&&review.input_sha256===inputSha256&&/^[a-f0-9]{64}$/.test(inputSha256)&&review.mint===mint&&review.pool===pool&&review.tick_utc===tickUtc&&allowed.includes(review.action)&&text(review.reason)&&text(review.counterargument)&&text(review.invalidation)&&text(review.review_id);
 return {action:valid?review.action:'DATA_GAP',reason:valid?review.reason:'NO_MATCHING_INDEPENDENT_STRATEGY_REVIEW',valid:!!valid,review_id:valid?review.review_id:null,actual_gpt_identity_verified:false,trade_authorized:false};
}
