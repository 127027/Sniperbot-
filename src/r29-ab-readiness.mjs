// Honest preflight of the existing archive; no scan, no fake fills, no source IO.
export function inspectHistoricalABReadiness({vault,packets,register}={}){
 if(vault?.kind!=='R29_USER_REQUESTED_BACKTEST_START_PREFLIGHT'||packets?.kind!=='R29_PREDECISION_EVIDENCE_PACKETS'||!Array.isArray(vault.rows)||vault.rows.length!==24)throw Error('INVALID_ARCHIVE_PREFLIGHT');
 const blockers=[];
 if(vault.preparation_status!=='READY_FOR_DECLARED_SCOPE')blockers.push('VAULT_NOT_READY');
 if(!Number.isInteger(packets.prepared_trade_inputs)||packets.prepared_trade_inputs<1)blockers.push('NO_VERIFIED_TRADE_INPUTS_IN_CURRENT_ARCHIVE');
 if(register?.predecision_preparation?.state!=='READY_FOR_DECLARED_SCOPE')blockers.push('PREDECISION_SOURCE_COVERAGE_UNRESOLVED');
 if(vault.rows.some((r,i)=>r.scan!==i+1||r.status!=='PREPARED_VERIFIED'))blockers.push('PARTIAL_OR_UNVERIFIED_HOURLY_FRAMES');
 // These reports alone cannot authenticate the neutral manifest or actual runs.
 return {kind:'R29_AB_ARCHIVE_PREFLIGHT',status:blockers.length?'BLOCKED_PENDING_VERIFIED_SEALED_INPUTS':'READY_FOR_SEALED_VERIFICATION',blockers:[...blockers,'SEALED_MARKET_AND_REVIEW_PROVENANCE_REQUIRED'],archived_hour_frames:vault.rows.length,inventory_count:packets.inventory_count,pending_evidence_jobs:packets.evidence_jobs,verified_trade_inputs:packets.prepared_trade_inputs,actual_valid_scans:0,orders:0,pnl:null};
}
