// R29-W01: historical REVIEW eligibility, not product release or a trade gate.
// A hash pins bytes, not truth of the upstream market. Model execution remains separately gated.
import {createHash} from 'node:crypto';
import {normalizeV29ResearchCandidateFrames,researchPreviewAt} from './v29-retro-research-bridge.mjs';
import {asOfMillis} from './v19-asof-evidence.mjs';
export function inspectHistoricalResearchReadiness({archiveBytes,expectedSha256,asOfUtc}={}){
 const verdict=(status,reason,extra={})=>({kind:'R29_HISTORICAL_RESEARCH_READINESS',status,reason,virtual_at_utc:asOfUtc,allow_historical_review:status==='REVIEW_READY',allow_model_execution:false,production_release_authorized:false,live_order_authorized:false,client_writes_authorized:false,original_historical_gpt_execution_required:false,original_windows_receipt_required:false,source_authenticity_proven:false,...extra});
 const at=asOfMillis(asOfUtc);
 if(at===null||!(Buffer.isBuffer(archiveBytes)||typeof archiveBytes==='string')||!/^[a-f0-9]{64}$/.test(expectedSha256||''))return verdict('BLOCKED','MISSING_PIN_OR_VIRTUAL_TIME');
 const digest=createHash('sha256').update(archiveBytes).digest('hex');
 if(digest!==expectedSha256)return verdict('BLOCKED','ARCHIVE_SHA_MISMATCH');
 try{
  const a=JSON.parse(archiveBytes.toString());
  if(a.kind!=='R29_V29_24_SCAN_ACTUAL_FEATURE_FUNNEL_RESEARCH_NOT_TRADING'||a.postevent_winners_or_future_outcomes_loaded!==false||a.original_provider_data_delivered_to_gpt_at_october_ticks_proven!==false||a.original_historical_two_way_50usdc_quotes_proven!==false||a.screened_candidates_never_promoted_to_orders!==true||a.scans?.length!==24)return verdict('BLOCKED','UNSUPPORTED_OR_MISLABELED_ARCHIVE');
  const frames=normalizeV29ResearchCandidateFrames(a.scans);
  const frame=a.scans.find(s=>asOfMillis(s.at_utc)===at);
  if(!frame)return verdict('BLOCKED','NO_EXACT_VIRTUAL_TICK');
  const preview=researchPreviewAt(frames,frame.at_utc);
  if(preview.representatives.some(x=>asOfMillis(x.feature_at_utc)>=at-60000))return verdict('BLOCKED','NOT_FINALIZED_AT_VIRTUAL_TICK');
  // Return ONLY the allowlisted current frame; not the whole day, future outcomes or future frames.
  const candidates=preview.representatives.map(x=>({mint:x.mint,chain:x.chain,feature_at_utc:x.feature_at_utc,research_score:x.research_screen_score,source_class:'RETRO_ASOF_RECONSTRUCTION',knowledge_time_basis:'MODELED_EVENT_FINALITY_60S',modeled_knowledge_at_utc:new Date(asOfMillis(x.feature_at_utc)+60000).toISOString(),original_provider_delivery_proven:false,quote_status:'UNKNOWN'}));
  return verdict(candidates.length?'REVIEW_READY':'DATA_GAP',candidates.length?'TIME_GATED_RETROSPECTIVE_CANDIDATES':'NO_CANDIDATE_AT_THIS_TICK',{source_sha256:digest,source_class:'RETRO_ASOF_RECONSTRUCTION',candidates,screen_pass_count:preview.research_screen_pass_count,unrepresented_count:preview.research_screen_pass_count-candidates.length,actual_gpt_review_completed:false,model_execution_reason:'INDEPENDENT_HISTORICAL_POOL_QUOTE_AND_RISK_NOT_VERIFIED'});
 }catch{return verdict('BLOCKED','INVALID_RESEARCH_ARCHIVE_OR_FUTURE_INPUT');}
}
