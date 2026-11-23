// R29 V2.1 OCT12: original Git blob integrity and source-class segregation.
// Read-only pure function: no orders, no requests, no simulated or actual fills.
// Internal SHA-1 matching verifies repository bytes, NOT October provider availability.
import {createHash} from 'node:crypto';
const blobHash=raw=>{
 const bytes=Buffer.from(raw,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
};
const fail=reason=>{throw Error('INVALID_OCTOBER_EVIDENCE_ARCHIVE_'+reason)};
const RAW_PATHS=Object.freeze({
 baseline:'research/backtests/2026-10-12/report.json',
 reference:'research/evaluation/2026-10-12/v19-winner-reference-identity-status.json',
 comparison:'research/evaluation/2026-10-12/v19-source-gap-baseline-vs-65-reference-20261122.json',
 qa04:'research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json',
 qa80:'research/backtest-inputs/2026-10-12/qa80-six-offline-shadows-synthetic.json'
});
const parse=(raw,name)=>{
 if(typeof raw!=='string'||raw.length<2||raw.length>10e6)fail('MISSING_OR_OVERSIZED_'+name.toUpperCase());
 try{const v=JSON.parse(raw);if(!v||typeof v!=='object'||Array.isArray(v))fail('BAD_OBJECT_'+name);return v}
 catch(e){fail('MALFORMED_JSON_'+name)}
};
export function inspectV21OctoberEvidenceInventory(rawByPath={}){
 if(!rawByPath||typeof rawByPath!=='object'||Array.isArray(rawByPath))
   fail('INVALID_FILE_MAP');
 const data={},fileHashes={};
 for(const [name,path] of Object.entries(RAW_PATHS)){
   const raw=rawByPath[path];
   data[name]=parse(raw,name);
   fileHashes[name]=blobHash(raw);
 }
 const {baseline,reference,comparison,qa04,qa80}=data;
 const integrityIssues=[];
 const issue=(code)=>integrityIssues.push(code);
 if(comparison.kind!=='R29_V19_OCT12_POSTRUN_ORACLE_VS_ARCHIVED_SOURCE_GAP_BASELINE'
   ||comparison.date!=='2026-10-12')issue('COMPARISON_IDENTITY_MISMATCH');
 if(comparison.baseline_report_path!==RAW_PATHS.baseline
    ||comparison.baseline_report_blob_sha!==fileHashes.baseline)
   issue('BASELINE_GIT_BLOB_MISMATCH');
 if(comparison.reference_path!==RAW_PATHS.reference
    ||comparison.reference_blob_sha!==fileHashes.reference)
   issue('WINNER_REFERENCE_GIT_BLOB_MISMATCH');
 if(baseline.kind!=='R29_CLEANROOM_RANDOM_HISTORICAL_DAY_SHADOW_REPLAY'
    ||baseline.status!=='DATA_GAP_UNABLE_TO_CERTIFY_TRADING_PERFORMANCE')
   issue('ORIGINAL_BASELINE_STATUS_NOT_DATA_GAP');
 if(reference.kind!=='R29_V19_POST_EVENT_WINNER_REFERENCE_REGISTER'
    ||reference.source_class!=='POST_EVENT_ORACLE'
    ||reference.purpose!=='EVALUATION_ONLY_AFTER_DECISIONS'
    ||reference.trade_authorized!==false
    ||reference.independent_contract_identity_verified!==false)
   issue('WINNER_REFERENCE_NOT_ORACLE_ONLY');
 if(comparison.reference_never_used_as_discovery_input!==true
   ||comparison.comparison_performed_only_after_archived_baseline!==true
   ||comparison.baseline_asof_eligible_market_snapshots!==0
   ||comparison.baseline_confirmed_dot_decisions!==0
   ||comparison.baseline_model_orders!==0
   ||comparison.baseline_model_fills!==0
   ||comparison.baseline_verified_windows_client_receipts!==0
   ||comparison.original_historical_gpt_runs_proven!==0
   ||comparison.independently_established_winner_recall!==null
   ||comparison.realized_pnl_from_historical_trade!==null)
   issue('COMPARISON_PROMOTES_UNPROVEN_TRADING_OR_RECALL');
 if(!Array.isArray(reference.entries)||reference.entries.length!==65
   ||comparison.total_reference_rows!==reference.entries.length
   ||!Array.isArray(comparison.results)
   ||comparison.results.length!==reference.entries.length
   ||reference.entries.some(e=>e.usable_as_discovery_seed!==false
     ||e.historical_risk_verified!==false
     ||e.earliest_original_discovery_at_utc!==null
     ||typeof e.reported_gain_pct!=='number'
     ||!Number.isFinite(e.reported_gain_pct))
   ||comparison.results.some(e=>e.report_is_post_event!==true
     ||e.verified_historical_bot_discovery!==false
     ||e.verified_bot_buy!==false||e.verified_bot_sell!==false))
   issue('WINNER_ROWS_NOT_SEPARATED_FROM_DECISION_INPUTS');
 for(const [name,doc] of [['qa04',qa04],['qa80',qa80]]){
   if(doc.kind!=='R29_V18_ASOF_REPLAY_INPUT'||doc.date!=='2026-10-12'
     ||doc.synthetic_fixture_no_actual_quotes!==true
     ||doc.real_historical_provider_evidence_count!==0
     ||!doc.source_purpose?.startsWith('SYNTHETIC_')
     ||!Array.isArray(doc.snapshots)||doc.snapshots.length===0
     ||doc.snapshots.some(s=>s.provenance!=='SYNTHETIC_TEST'
       ||s.source_class!=='SYNTHETIC_TEST'))
       issue(name.toUpperCase()+'_UNVERIFIED_FIXTURE_CLAIMS_REAL_MARKET');
 }
 const accepted=integrityIssues.length===0;
 return {
   schema:1,kind:'R29_V21_OCT12_READ_ONLY_EVIDENCE_CLASSIFICATION',
   date:'2026-10-12',
   original_document_integrity:accepted?'INTERNAL_GIT_BLOBS_MATCH':'BLOCKED_INCONSISTENT_ARCHIVE',
   file_count:Object.keys(RAW_PATHS).length,
   original_git_blob_sha_by_role:fileHashes,
   integrity_issues:integrityIssues,
   archived_shadow_baseline_status:baseline.status??null,
   post_event_winner_reference_rows:reference.entries?.length??null,
   reported_pool_link_count:comparison.reference_pool_links??null,
   synthetic_input_snapshot_counts:{qa04:qa04.snapshots?.length??null,qa80:qa80.snapshots?.length??null},
   genuine_market_source_proofs_verified:0,
   real_historical_quote_pairs_verified:0,
   genuine_gpt_october_reviews_verified:0,
   verified_historical_buy_sell_trades:0,
   independent_winner_recall:null,
   empirical_pnl_test_usdc:null,
   historically_permitted_discovery_inputs_from_these_files:0,
   QA04_release_authorized:false,
   orders_written:0,client_paper_fills_claimed:0,
   source_classification:accepted?'SYNTHETIC_AND_POST_EVENT_ONLY_NO_ASOF_MARKET':
     'BLOCKED_ARCHIVE_CORRUPTION_OR_HINDSIGHT_PROMOTION',
   limitations:[
     'Matching Git blob SHA attests repository byte integrity, not source-origin or October provider availability',
     'The 65 post-event reference rows are a retrospective evaluation set, not an unselected market denominator',
     'The two QA input fixtures explicitly assert synthetic provenance and cannot be submitted as original October evidence',
     'No authentic provider quote, risk issuer, independent sell route, GPT journal or local Windows client fill is established here'
   ]
 };
}
export const V21_OCTOBER_ARCHIVE_PATHS=RAW_PATHS;
