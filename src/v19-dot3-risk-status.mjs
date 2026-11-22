// R29 V1.9 D3-01 – one Dot3 risk-status state machine for paper research.
// Both LIVE_PAPER and HISTORICAL_ASOF use these same evidence checks.
// A SYNTHETIC_REGRESSION_ONLY complete positive packet exercises a modeled
// PAPER_ELIGIBLE state but NEVER grants an executable paper order.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
import {asOfMillis} from './v19-asof-evidence.mjs';
import {inspectDot3Attestation} from './risk-authorization-v18.mjs';
import {assessChainSellability} from './v19-dot3-sellability.mjs';
import {auditDot3QuoteSourcePair} from './v19-dot3-source-pairs.mjs';

const time=asOfMillis;
const canon=(chain,id)=>chain==='solana'?id:String(id).toLowerCase();
const RESEARCH_MODES=Object.freeze(['LIVE_PAPER','HISTORICAL_ASOF','SYNTHETIC_REGRESSION_ONLY']);
export const DOT3_RISK_STATES=Object.freeze(['DISCOVERED','DATA_GAP','WATCH','REJECTED','PAPER_ELIGIBLE']);
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x)?x:null;

export function assessDot3RiskStatus({
 candidate,asOfUtc,attestation=null,expectedBlobSha=null,
 mode='LIVE_PAPER',previousStatus='DISCOVERED',hardBlock=null
}={}){
 const now=time(asOfUtc);
 if(now===null||!RESEARCH_MODES.includes(mode)
   ||!DOT3_RISK_STATES.includes(previousStatus)||!candidate
   ||typeof candidate!=='object')throw Error('INVALID_DOT3_RISK_STATUS_INPUT');
 const chain=canonicalChain(candidate.chain),pool=candidate.pool,
   contract=candidate.contract;
 const validPool=poolValid(chain,pool,candidate.pool_kind);
 const validContract=tokenValid(chain,contract);
 const key=validPool?chain+':'+canon(chain,pool):null;
 let sourcePair=null,sellabilityResearch=null;
 const result=(status,reason,missing=[],additional={})=>({
   schema:1,kind:'R29_V19_DOT3_RISK_STATE',mode,
   as_of_utc:asOfUtc,pool_key:key,chain:chain??null,
   pool:validPool?pool:null,pool_kind:validPool?(candidate.pool_kind??null):null,
   contract:validContract?contract:null,
   previous_status:previousStatus,status,reason,
   missing_fields:missing,
   candidate_preserved_for_recheck:status!=='REJECTED',
   status_is_modeled_not_verified_authorization:true,
   original_risk_evidence_verified:false,
   issuer_authentication_verified:false,
   source_pair_audit:sourcePair,
   sellability_research:sellabilityResearch,
   trade_authorized:false,paper_filled:false,
   next_action:status==='PAPER_ELIGIBLE'?'WAIT_FOR_INDEPENDENT_ORDER_AUTHORITY':
     status==='REJECTED'?'ARCHIVE_PROVEN_HARD_BLOCK':
     status==='WATCH'?'RECHECK_PRICE_LIQUIDITY_AND_RISK':
     status==='DISCOVERED'?'ENRICH_POOL_IDENTITY':
     'RESOLVE_MISSING_RISK_EVIDENCE',
   ...additional
 });
 // Explicitly prevent post-event winner labels from entering live/replay risk.
 if(candidate.reported_gain_pct!==undefined||candidate.future_winner_label!==undefined
   ||candidate.source_class==='POST_EVENT_ORACLE')
   return result('DATA_GAP','POST_EVENT_INPUT_QUARANTINED',['VALID_PRE_EVENT_SOURCE']);
 if(!validPool)
   return result('DISCOVERED','POOL_IDENTITY_MISSING',['VALID_CHAIN_AND_POOL']);
 if(!validContract)
   return result('DATA_GAP','CONTRACT_IDENTITY_MISSING',['EXACT_TOKEN_CONTRACT']);

 const captured=time(candidate.captured_at_utc);
 if(captured===null||captured>now||now-captured>10*60000)
   return result('DATA_GAP','POOL_CAPTURE_MISSING_STALE_OR_FUTURE',['FRESH_ORIGINAL_POOL_CAPTURE']);

 // This is the SAME two-domain audit used for the real Dot2 handoff and
 // historical as-of status preview. Unknown upstream/time never becomes proof.
 if(Array.isArray(candidate.source_observations)&&candidate.source_observations.length){
   sourcePair=auditDot3QuoteSourcePair({coin:{chain,pool,contract,
     pool_kind:candidate.pool_kind},observations:candidate.source_observations,
     asOfUtc});
 }
 // Chain-specific sell-route research belongs to the same Dot3 decision
 // path in LIVE_PAPER and HISTORICAL_ASOF. A fixture never authorizes a trade.
 if(candidate.sellability_research_evidence!==undefined){
   sellabilityResearch=assessChainSellability({
     coin:{chain,pool,contract,pool_kind:candidate.pool_kind},
     evidence:candidate.sellability_research_evidence,
     asOfUtc,mode});
   if(sellabilityResearch.warnings.length)
     return result('WATCH','INDICATIVE_CHAIN_SELLABILITY_WARNING',[
       ...sellabilityResearch.missing_fields,...sellabilityResearch.warnings]);
 }
 const comparison=finite(candidate.price_disagreement_pct);
 const prices=[candidate.primary_quote_usd,candidate.second_source_price_usd].map(finite);
 const liquidities=[candidate.primary_liquidity_usd,candidate.second_source_liquidity_usd].map(finite);
 // A reported disagreement percentage must never override the two actual
 // quote values, including when the reported figure is understated.
 const derivedDisagreementPct=prices.every(p=>p!==null&&p>0)
   ?100*Math.abs(prices[0]-prices[1])/((prices[0]+prices[1])/2):null;
 const effectiveDisagreementPct=Math.max(comparison??0,derivedDisagreementPct??0);
 const lowLiquidity=liquidities.some(x=>x!==null&&x<5000)
   ||sourcePair?.status==='INDICATIVE_LOW_LIQUIDITY';
 const conflicting=effectiveDisagreementPct>3
   ||sourcePair?.status==='INDICATIVE_PRICE_DISAGREEMENT';
 const quoteMissing=!candidate.independent_price_liquidity_ready
   ||prices.some(x=>x===null||x<=0)||liquidities.some(x=>x===null||x<=0)
   ||(sourcePair!==null&&sourcePair.status!=='TWO_DOMAIN_INDICATIVE_ONLY');
 // Contradictory fresh quotes are WATCH, even if a self-declared attestation
 // attempts to upgrade the market. Keep that candidate visible for rechecks.
 if(sourcePair&&['INDICATIVE_PRICE_DISAGREEMENT','INDICATIVE_LOW_LIQUIDITY',
     'SAME_REPORTED_UPSTREAM'].includes(sourcePair.status))
   return result('WATCH','PROVIDER_SOURCE_PAIR_'+sourcePair.status,[
     'RECHECK_CORRELATED_OR_CONFLICTING_QUOTES','INDEPENDENT_UPSTREAM_PROOF']);

 // This is NOT an on-chain security certificate. A user-written verified:true
 // hard-block claim is insufficient for permanent REJECTED in a live run.
 if(hardBlock?.code&&mode==='SYNTHETIC_REGRESSION_ONLY'
   &&hardBlock.synthetic_fixture===true)
   return result('REJECTED','SYNTHETIC_CONFIRMED_HARD_BLOCK',[],{
     simulated_block_code:String(hardBlock.code),negative_regression_only:true});

 if(!attestation){
   const reasons=[];
   if(quoteMissing)reasons.push('INDEPENDENT_CURRENT_QUOTES');
   if(conflicting)reasons.push('PRICE_CONFLICT_RECHECK');
   if(lowLiquidity)reasons.push('LIQUIDITY_DEPTH_RECHECK');
   if(sellabilityResearch&&sellabilityResearch.status!=='SYNTHETIC_POSSIBLE_SELLABILITY')
     reasons.push(...sellabilityResearch.missing_fields);
   if(sourcePair)reasons.push('INDEPENDENT_UPSTREAM_CORROBORATION',
     'INDEPENDENT_SOURCE_ARCHIVE');
   reasons.push('SECURITY_AND_SELLABILITY_ATTESTATIONS','VERIFIED_PROVIDER_QUOTE_TIMES');
   return result((conflicting||lowLiquidity)?'WATCH':'DATA_GAP',
     conflicting?'INDICATIVE_PRICE_DISAGREEMENT':
       lowLiquidity?'INDICATIVE_LOW_LIQUIDITY':'MISSING_RISK_ATTESTATION',reasons,{
     observed_price_disagreement_pct:effectiveDisagreementPct,
     computed_from_two_quote_prices_pct:derivedDisagreementPct,
     reported_price_disagreement_pct:comparison,
     indicative_liquidity_too_low:lowLiquidity});
 }
 // Candidate observation constraints must also hold when a synthetic
 // attestation looks structurally positive. Otherwise the test-only model
 // can mark a contradictory or under-liquid pool as PAPER_ELIGIBLE.
 if(conflicting||lowLiquidity)
   return result('WATCH',conflicting?'INDICATIVE_PRICE_DISAGREEMENT':
     'INDICATIVE_LOW_LIQUIDITY',[
     conflicting?'RECHECK_CONFLICTING_CANDIDATE_QUOTES':'RECHECK_CANDIDATE_LIQUIDITY',
     'ATTESTATION_CANNOT_OVERRIDE_OBSERVED_RISK'],{
     observed_price_disagreement_pct:effectiveDisagreementPct,
     computed_from_two_quote_prices_pct:derivedDisagreementPct,
     reported_price_disagreement_pct:comparison,
     indicative_liquidity_too_low:lowLiquidity});
 if(quoteMissing)
   return result('DATA_GAP','CANDIDATE_QUOTE_EVIDENCE_INCOMPLETE',[
     'CANDIDATE_CURRENT_INDEPENDENT_QUOTES',
     'ATTESTATION_CANNOT_REPAIR_MISSING_CANDIDATE_EVIDENCE']);
 if(!sha(expectedBlobSha))
   return result('DATA_GAP','DOT3_ATTESTATION_BLOB_UNKNOWN',['ATTESTATION_BLOB_SHA']);
 const structural=inspectDot3Attestation({
   attestation,order:{coin:{chain,pool,contract,pool_kind:candidate.pool_kind??null}},
   nowUtc:asOfUtc,expectedBlobSha
 });
 if(structural.status!=='STRUCTURAL_PASS_EXTERNAL_VERIFICATION_REQUIRED')
   return result('DATA_GAP','ATTESTATION_STRUCTURAL_'+(structural.code??'UNKNOWN'),[
     'REPAIR_DOT3_ATTESTATION'],{structural_preflight:structural.status});
 // The same structural validations are required in all modes. Only an
 // explicitly isolated software regression may model PAPER_ELIGIBLE without
 // authentic provider/issuer proof. The real path remains blocked until D3-04.
 if(mode!=='SYNTHETIC_REGRESSION_ONLY')
   return result('DATA_GAP','EXTERNAL_ORIGIN_AND_ISSUER_VERIFICATION_MISSING',[
     'INDEPENDENT_SOURCE_BYTES_AND_ISSUER_AUTHENTICATION'],{
     structural_preflight:structural.status});
 return result('PAPER_ELIGIBLE','SYNTHETIC_COMPLETE_RISK_PACKET_ONLY',[],{
   simulated_paper_eligibility:true,
   structural_preflight:structural.status,
   eligible_for_real_paper_order:false});
}

export function summarizeDot3RiskStatuses({handoff,asOfUtc,
 attestationByPool={},mode='LIVE_PAPER'}={}){
 if(handoff?.kind!=='DOT2_TO_DOT3_EVIDENCE_HANDOFF'
   ||!Array.isArray(handoff.candidates)||time(asOfUtc)===null
   ||!RESEARCH_MODES.includes(mode))
   throw Error('INVALID_DOT3_RISK_SUMMARY_INPUT');
 const candidates=handoff.candidates.map(candidate=>{
   const chain=canonicalChain(candidate.chain),
     key=chain&&poolValid(chain,candidate.pool,candidate.pool_kind)
       ?chain+':'+canon(chain,candidate.pool):null;
   const doc=key?attestationByPool[key]:undefined;
   return assessDot3RiskStatus({candidate,asOfUtc,mode,
     attestation:doc?.attestation??null,expectedBlobSha:doc?.expectedBlobSha??null});
 });
 const counts=Object.fromEntries(DOT3_RISK_STATES.map(status=>[
   status,candidates.filter(x=>x.status===status).length
 ]));
 return {schema:1,kind:'R29_V19_DOT3_RISK_STATUS_PREVIEW',
   mode,as_of_utc:asOfUtc,source_kind:handoff.kind,
   counts,candidates,order_authorized_count:0,
   real_paper_fills:0,unverified_original_evidence:true,
   note:'This is a read-only status preview from the same risk checks, not a Dot3 signed trading order.'};
}
