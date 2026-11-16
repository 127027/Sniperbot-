// R29 read-only candidate research memory: archive EVERY observed pool, including
// rejects, illiquid candidates, and deterministic controls. Future quote changes
// stay in separate outcomes. Historical decision, risk gate, and user ledger
// are NEVER changed. Observed provider price != executable sell quote.
import {createHash} from "node:crypto";

const SNAP_SCHEMA="sniper_r29_candidate_watch_snapshot.v1";
const OUTCOME_SCHEMA="sniper_r29_candidate_watch_outcome.v1";
const SHA=/^[a-f0-9]{64}$/;
const EVM=/^0x[a-f0-9]{40}$/;
const SOL=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const CHAINS=new Set(["eth","base","bsc","solana"]);
const HOUR=3600000;
const sha=s=>createHash("sha256").update(s).digest("hex");
const iso=s=>typeof s==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&
  Number.isFinite(Date.parse(s))&&new Date(s).toISOString()!=="Invalid Date";
const numeric=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
const canonId=id=>{
 if(typeof id!=="string")return null;
 const bits=id.split(":");
 if(bits.length!==3||!CHAINS.has(bits[0]))return null;
 const [chain,token,pool]=bits;
 if(chain==="solana"?!SOL.test(token)||!SOL.test(pool):!EVM.test(token)||!EVM.test(pool))
  return null;
 return {chain,token_address:token,pool_address:pool,candidate_id:id};
};
function immutableObservation(c){
 const parsed=canonId(c?.candidate_id);
 if(!parsed||!["MARKET_ACTIVITY_SAMPLE","DETERMINISTIC_CONTROL"].includes(c.selection)||
  !numeric(c.indicative_price_usd)||!numeric(c.observed_liquidity_usd)||
  !numeric(c.volume_m5_usd)||!Number.isInteger(c.buys_m5)||c.buys_m5<0||
  !Number.isInteger(c.sells_m5)||c.sells_m5<0||
  !["UNKNOWN","REJECTED","VERIFIED"].includes(c.contract_security)||
  !["UNKNOWN","REJECTED","VERIFIED"].includes(c.sellability)||
  typeof c.paid_promotion_bias!=="boolean"||
  c.chain!==parsed.chain)return null;
 return {...parsed,
  selection:c.selection,
  price_usd_indicative:c.indicative_price_usd,
  liquidity_usd_indicative:c.observed_liquidity_usd,
  volume_m5_usd_indicative:c.volume_m5_usd,
  buys_m5_reported:c.buys_m5,
  sells_m5_reported:c.sells_m5,
  paid_promotion_bias:c.paid_promotion_bias,
  contract_security_source_status:c.contract_security,
  sellability_source_status:c.sellability,
  possible_liquidity_anomaly:c.observed_liquidity_usd<1000||
   (c.observed_liquidity_usd>0&&
    c.volume_m5_usd/c.observed_liquidity_usd>2),
  observed_buyers_are_not_necessarily_unique_wallets:true,
  paper_buy_allowed:false,
  actual_gpt_decision_here:null,
  real_trade_fill_proven:false};
}
export function normalizeResearchSnapshot(review,{at_utc,source_github_blob_sha=null}={}){
 if(review?.schema!=="sniper_r29_public_dynamic_review.v1"||
  !iso(review.observed_at_utc)||!SHA.test(review.review_sha256||"")||
  review.paper_only!==true||review.actionable!==false||
  review.real_trading_enabled!==false||
  !Array.isArray(review.candidates)||review.candidates.length>12||
  !iso(at_utc)||Date.parse(review.observed_at_utc)>Date.parse(at_utc)||
  Date.parse(at_utc)-Date.parse(review.observed_at_utc)>36*HOUR)
  throw Error("R29_RESEARCH_ARCHIVE_SOURCE_INVALID_OR_STALE");
 if(source_github_blob_sha!==null&&!/^[0-9a-f]{40}$/.test(source_github_blob_sha))
  throw Error("R29_INVALID_SOURCE_BLOB_SHA");
 const observations=review.candidates.map(immutableObservation);
 if(observations.some(x=>x===null)||new Set(observations.map(x=>x.candidate_id)).size!==observations.length)
  throw Error("R29_RESEARCH_CANDIDATE_INVALID_OR_DUPLICATE");
 const research=observations.filter(x=>x.selection!=="DETERMINISTIC_CONTROL");
 return {schema:SNAP_SCHEMA,
  research_observed_at_utc:review.observed_at_utc,
  research_review_sha256:review.review_sha256,
  source_github_blob_sha,
  source_github_path:"research/r29/channel/dynamic-research-review.json",
  archive_compiled_at_utc:at_utc,
  source_type:"ACTUAL_PUBLISHED_MARKET_RESEARCH_SAMPLE_NOT_EXECUTION_PROOF",
  market_sample_count:research.length,
  deterministic_controls_count:observations.length-research.length,
  all_observed_candidates_count:observations.length,
  observations,
  candidate_register_policy:"REGISTER_ALL_INCLUDING_REJECTED_AND_CONTROLS",
  watch_outcome_status:"WAITING_FOR_LATER_COMPARABLE_SOURCE",
  gpt_model_decisions_generated_by_this_module:0,
  candidate_new_buy_authorizations:0,
  paper_fills_created:0,
  existing_user_paper_ledger_mutated:false};
}
function derivedStatus(before,after){
 const priceValid=numeric(before.price_usd_indicative)&&before.price_usd_indicative>0&&
  numeric(after.price_usd_indicative)&&after.price_usd_indicative>0;
 const sameIdentity=before.candidate_id===after.candidate_id&&
  before.chain===after.chain&&before.pool_address===after.pool_address&&
  before.token_address===after.token_address;
 if(!sameIdentity)throw Error("R29_RESEARCH_IDENTITY_CHANGED");
 if(!priceValid)return {status:"UNKNOWN_NO_COMPARABLE_POSITIVE_REFERENCE",ratio:null};
 return {status:"COMPARABLE_PROVIDER_INDICATIVE_PRICE_ONLY",
  ratio:after.price_usd_indicative/before.price_usd_indicative};
}
export function compareResearchSnapshots(before,after,{
 evaluation_at_utc,threshold_multiple=1.75,minimum_elapsed_hours=1
}={}){
 if(before?.schema!==SNAP_SCHEMA||after?.schema!==SNAP_SCHEMA||
  !iso(before.research_observed_at_utc)||!iso(after.research_observed_at_utc)||
  !iso(evaluation_at_utc)||!SHA.test(before.research_review_sha256||"")||
  !SHA.test(after.research_review_sha256||"")||
  !Array.isArray(before.observations)||!Array.isArray(after.observations)||
  !Number.isFinite(threshold_multiple)||threshold_multiple<=1||
  !Number.isFinite(minimum_elapsed_hours)||minimum_elapsed_hours<0)
  throw Error("R29_POSTHOC_SNAPSHOT_SCHEMA_INVALID");
 const d=Date.parse(after.research_observed_at_utc)-
  Date.parse(before.research_observed_at_utc);
 if(d<minimum_elapsed_hours*HOUR||
  Date.parse(evaluation_at_utc)<Date.parse(after.research_observed_at_utc))
  throw Error("R29_POSTHOC_CANNOT_READ_FUTURE_OR_DUPLICATE_SNAPSHOT");
 const byId=new Map(after.observations.map(x=>[x.candidate_id,x]));
 if(byId.size!==after.observations.length)
  throw Error("R29_POSTHOC_DUPLICATE_LATER_CANDIDATES");
 const cases=[];
 for(const baseline of before.observations){
  if(!canonId(baseline.candidate_id))throw Error("R29_UNTRUSTED_BASELINE_ID");
  const later=byId.get(baseline.candidate_id);
  const control=baseline.selection==="DETERMINISTIC_CONTROL";
  const price=later?derivedStatus(baseline,later):
   {status:"UNKNOWN_NOT_IN_LATER_SAMPLE",ratio:null};
  const observed=price.ratio!==null&&Number.isFinite(price.ratio)&&price.ratio>0;
  const rally=observed&&price.ratio>=threshold_multiple;
  cases.push({candidate_id:baseline.candidate_id,chain:baseline.chain,
   token_address:baseline.token_address,pool_address:baseline.pool_address,
   origin_selection:baseline.selection,excluded_from_real_coin_performance:control,
   initial_research_at_utc:before.research_observed_at_utc,
   later_research_at_utc:after.research_observed_at_utc,
   same_source_review_series:true,
   before_price_usd_indicative:baseline.price_usd_indicative,
   later_price_usd_indicative:later?.price_usd_indicative??null,
   observed_indicative_price_multiple:observed?price.ratio:null,
   observed_rally_at_least_threshold:control?null:observed?rally:null,
   outcome_class:control?"CONTROL_ONLY_NOT_STRATEGY_EVIDENCE":
    !observed?price.status:rally?
     "INDICATIVE_SAME_POOL_LATER_PRICE_RALLY_NOT_EXECUTABLE":
     "INDICATIVE_SAME_POOL_PRICE_OBSERVED_NO_THRESHOLD_RALLY",
   initial_independent_sellability_proven:baseline.sellability_source_status==="VERIFIED",
   note:"Public provider indicative price observations only. This is NOT proof of contemporaneous liquidity, own execution, sellability or a missed USDC profit."});
 }
 return {schema:OUTCOME_SCHEMA,
  audit_created_at_utc:evaluation_at_utc,
  before_research_sha256:before.research_review_sha256,
  after_research_sha256:after.research_review_sha256,
  before_at_utc:before.research_observed_at_utc,
  after_at_utc:after.research_observed_at_utc,
  elapsed_hours:d/HOUR,
  threshold_multiple,
  source_class:"POSTHOC_PROVIDER_INDICATIVE_SAME_CHAIN_TOKEN_POOL",
  future_data_hidden_from_original_research:true,
  original_decisions_rewritten:false,
  user_account_changed:false,
  gpt_model_decisions_generated:0,
  actual_paper_fills_proven:0,
  proven_tradeable_usdc_pnl:null,
  observed_count:cases.filter(x=>!x.excluded_from_real_coin_performance).length,
  observed_rough_rallies:cases.filter(x=>x.observed_rally_at_least_threshold===true).length,
  unknown_outcomes:cases.filter(x=>!x.excluded_from_real_coin_performance&&
   x.observed_rally_at_least_threshold===null).length,
  cases};
}
export function stableResearchSnapshotName(snapshot){
 if(snapshot?.schema!==SNAP_SCHEMA||
  !SHA.test(snapshot.research_review_sha256||"")||
  !iso(snapshot.research_observed_at_utc))throw Error("R29_SNAPSHOT_FILENAME_INVALID");
 return snapshot.research_observed_at_utc.slice(0,10)+"/"+
  snapshot.research_observed_at_utc.replace(/[-:.]/g,"").replace("Z","Z")+"-"+
  snapshot.research_review_sha256.slice(0,16)+".json";
}
export function snapshotPayloadDigest(snapshot){
 return sha(JSON.stringify(snapshot));
}
