// D3-04 / D3-05: source-grounded blocker inventory from existing Dot2/Dot3
// archived research. It cannot verify an issuer or onchain sale using
// unchecked strings, and it never authorizes BUY/SELL or calls APIs.
import {assessChainSellability} from './v19-dot3-sellability.mjs';
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function auditOfflineDot3TrustAndSellability({
 handoff,riskPreview,asOfUtc
}={}){
 const now=utc(asOfUtc);
 if(now===null||handoff?.kind!=='DOT2_TO_DOT3_EVIDENCE_HANDOFF'
  ||riskPreview?.kind!=='R29_V19_DOT3_RISK_STATUS_PREVIEW'
  ||!Array.isArray(handoff.candidates)||!Array.isArray(riskPreview.candidates))
  throw Error('INVALID_OFFLINE_DOT3_PROOF_AUDIT');
 const byKey=new Map(riskPreview.candidates.map(r=>[r.pool_key,r]));
 const rows=[],missingStatus=[];
 for(const c of handoff.candidates){
  const state=byKey.get(c.pool_key);
  if(!state){missingStatus.push(c.pool_key);continue;}
  if(utc(c.captured_at_utc)>now
   ||state.trade_authorized===true||state.paper_filled===true)
   throw Error('UNTRUSTED_FUTURE_OR_PRETEND_CLIENT_RISK_STATUS');
  let sell=null;
  try{
   sell=assessChainSellability({coin:{
    chain:c.chain,pool:c.pool,pool_kind:c.pool_kind,contract:c.contract
   },evidence:null,asOfUtc,mode:'LIVE_PAPER'});
  }catch{}
  rows.push({pool_key:c.pool_key,chain:c.chain,
   archived_model_risk_status:state.status,
   archived_model_risk_missing_fields:state.missing_fields,
   source_quote_time_verified:false,
   independent_issuer_public_key_trusted_in_this_audit:false,
   risk_attestation_signature_verified:false,
   actual_onchain_sell_route_verified:false,
   offline_sellability_status:sell?.status??'UNSUPPORTED_OR_INVALID_POOL_IDENTITY',
   chain_specific_required_checks:sell?.required_provider_checks??[],
   risk_authorization_expected_to_stay_blocked:true,
   paper_order_authorized:false});
 }
 if(rows.some(r=>r.paper_order_authorized!==false))
  throw Error('FAKE_AUTHENTICATED_RISK_APPROVAL');
 return {schema:1,kind:'R29_V19_D304_D305_OFFLINE_PROOF_GAP_AUDIT',
  as_of_utc:asOfUtc,source_unchanged_archived_handoff_count:handoff.candidates.length,
  paired_with_risk_model_count:rows.length,missing_risk_model_entries:missingStatus,
  risk_status_data_gap_count:rows.filter(x=>x.archived_model_risk_status==='DATA_GAP').length,
  risk_status_watch_count:rows.filter(x=>x.archived_model_risk_status==='WATCH').length,
  unverified_sellability_count:rows.filter(x=>x.offline_sellability_status!=='SYNTHETIC_POSSIBLE_SELLABILITY').length,
  independent_dot3_issuer_verifications_completed:0,
  onchain_sells_or_simulations_executed:0,
  actual_paper_client_fills:0,orders_authorized:0,
  original_http_proof_not_issuer_authentication:true,
  cannot_complete_original_d304_d305_without_independent_sources:true,
  rows};
}
