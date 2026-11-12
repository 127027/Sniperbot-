// Research-only R07 diagnostic. Do not score a model's accuracy when its input feed was empty.
// Never exposes hindsight labels or sends a trading instruction.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const roles=['news_discovery','social_acceleration','onchain_liquidity','contract_security','opportunity_qa'];
const roleFile=(r)=>new URL('../research/historical/R07/'+r+'.json',import.meta.url);
const validIso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
export function assessReplayCoverage(reports,{days=61}={}){
 if(!Array.isArray(reports)||reports.length!==roles.length||!Number.isInteger(days)||days<1)throw Error('INVALID_REPORT_SET');
 if(new Set(reports.map(x=>x?.role)).size!==roles.length||roles.some(r=>!reports.some(x=>x.role===r)))throw Error('MISSING_OR_DUPLICATED_ROLES');
 const statuses=reports.map(r=>{
  if(!['BLOCKED','COMPLETED','PENDING'].includes(r.state)||!r.coverage)throw Error('INVALID_ROLE_REPORT');
  const daily=Array.isArray(r.daily_findings)?r.daily_findings:[];
  const evidenceDays=new Set(daily.filter(x=>x&&validIso((x.date_utc||'')+'T00:00:00Z')&&
   (Array.isArray(x.verified_asof_sources)&&x.verified_asof_sources.length>0)).map(x=>x.date_utc));
  return {role:r.role,state:r.state,days_claimed_reviewed:r.coverage.virtual_days_reviewed??0,
   daily_lines:daily.length,days_with_verified_asof_sources:evidenceDays.size,
   verified_events_claimed:r.coverage.independently_verified_asof_events??0,
   first_discovers:r.first_discovers?.length??0,
   qualified_buy_advisories:r.qualified_paper_buy_advisories?.length??0,
   availability_assessment_only:daily.every(x=>x.status==='UNAVAILABLE_ASOF')};
 });
 const verifiedEvents=statuses.reduce((n,r)=>n+r.verified_events_claimed,0);
 const candidates=statuses.reduce((n,r)=>n+r.first_discovers,0);
 const decisions=statuses.reduce((n,r)=>n+r.qualified_buy_advisories,0);
 const missing=verifiedEvents===0&&statuses.every(r=>r.days_with_verified_asof_sources===0);
 return {schema:'dot_r07_diagnosis.v1',expected_days:days,
  completed_role_reports:statuses.filter(r=>r.state!=='PENDING').length,
  roles_blocked:statuses.filter(r=>r.state==='BLOCKED').length,
  real_five_model_historical_daily_replay_proven:false,
  total_verified_asof_events_reported:verifiedEvents,
  distinct_candidate_discoveries_reported:candidates,
  total_qualified_paper_advisories_reported:decisions,
  root_cause_class:missing?'INPUT_DATA_UNAVAILABLE_DO_NOT_SCORE_DETECTION':
   verifiedEvents>0&&candidates===0?'INPUT_OBSERVED_BUT_DETECTION_NOT_VALIDATED':'REQUIRES_EVENT_LEVEL_AUDIT',
  test_outcome:missing?'UNTESTABLE_NOT_MISSED_WINNER':'INCOMPLETE_VALIDATION',
  next_actions:['Build a dated, source-hashed, complete multi-coin historical event cohort',
   'Preserve independent early narrative leads even without a mint/pool',
   'Backfill immutable on-chain transactions by 2024 block slot, not current account state',
   'Only after candidate/contract route checks generate non-executable BUY_ADVISORY',
   'Measure discovery lead time and misses on negative+positive holdout cohorts'],
  role_metrics:statuses};
}
/**
 * Accept source artifacts with explicit original-time provenance, never today's article
 * given an old "published on" date. On-chain finalized ledger records may be
 * reconstructed later IF the actual historical tx/slot and facts are verified.
 */
export function asOfResearchEvidence(source,virtualDate){
 const d=Date.parse(virtualDate);
 const at=Date.parse(source?.event_at_utc),observed=Date.parse(source?.historical_observed_at_utc);
 if(!Number.isFinite(d)||!Number.isFinite(at)||!Number.isFinite(observed)||at>d||observed>d||observed<at)
  return {admissible:false,reason:'FUTURE_OR_UNVERIFIED_OBSERVATION_TIME'};
 if(source?.content_verified!==true||typeof source.content_sha256!=='string'||!/^[0-9a-f]{64}$/.test(source.content_sha256))
  return {admissible:false,reason:'CONTENT_NOT_VERIFIED'};
 if(source.provenance_class==='WARC_CAPTURE'){
   if(!source.capture_url?.startsWith('https://')||source.archived_bytes_verified!==true)
     return {admissible:false,reason:'ARCHIVE_BYTES_NOT_VERIFIED'};
   return {admissible:true,reason:'ORIGINAL_ARCHIVE'};
 }
 if(source.provenance_class==='IMMUTABLE_LEDGER_TX'){
   if(source.chain!=='solana'&&!['eth','base','bsc'].includes(source.chain))
    return {admissible:false,reason:'CHAIN_UNSUPPORTED'};
   if(!Number.isSafeInteger(source.block_slot)||source.block_slot<0||
      typeof source.tx_id!=='string'||source.tx_id.length<16||
      source.original_tx_retrieved!==true||source.historical_state_replayed!==true)
    return {admissible:false,reason:'HISTORICAL_TRANSACTION_UNVERIFIED'};
   return {admissible:true,reason:'RECONSTRUCTED_IMMUTABLE_LEDGER'};
 }
 return {admissible:false,reason:'SOURCE_TYPE_UNTRUSTED'};
}
/** Research discovery is not the same stage as being safe enough to recommend buying. */
export function classifyResearchObservation({hasVerifiedNarrative=false,hasVerifiedPool=false,
  hasDatedSecurityReview=false,hasDatedSellRoute=false,hasDatedMarketQuote=false}={}){
 if(!hasVerifiedNarrative&&!hasVerifiedPool)return 'NO_VERIFIED_EVIDENCE';
 if(!hasVerifiedPool)return 'EARLY_NARRATIVE_WATCH_ONLY';
 if(!hasDatedSecurityReview||!hasDatedSellRoute||!hasDatedMarketQuote)return 'TOKEN_FOUND_TRADE_NOT_EVALUABLE';
 return 'CANDIDATE_FOR_QA_REVIEW_NOT_AN_ORDER';
}
export function readR07Reports(){return roles.map(role=>JSON.parse(readFileSync(roleFile(role),'utf8')));}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 process.stdout.write(JSON.stringify(assessReplayCoverage(readR07Reports()),null,2)+'\n');
}
