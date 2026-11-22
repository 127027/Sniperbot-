// SOURCE-PINNED OFFLINE AUDIT. No provider request, GPT or GitHub write.
// Called AFTER the existing independent 29h backtest CLI scenarios.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {newState,settlePaper} from '../src/core.mjs';
import {replayArchivedSixChainEvidence} from '../src/v19-offline-multichain-replay.mjs';
import {auditOfflineDot4OrderBoundary} from '../src/v19-offline-dot4-order-boundary.mjs';
import {auditOfflineDot3TrustAndSellability} from '../src/v19-offline-risk-verification-gaps.mjs';
import {makeNeutralEvaluationPopulation} from '../src/v19-neutral-evaluation-population.mjs';
import {
 auditOfflineRawArchive,summarizeOfflineOperationalReceipts,
 resolveHistoricalWinnerIdentity,auditDot3EvidenceDeadlines,
 auditOfflineExitLifecycle,auditPostEventWinnerCoverage
} from '../src/v19-offline-remaining-readiness.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const asOfUtc='2026-11-22T19:44:00.000Z';
const taskRegister=await read('research/audits/2026-11-22/r29-v19-offline-61-task-reconciliation.json');
if(taskRegister.status_counts.PASS!==13||taskRegister.status_counts.PARTIAL!==46
 ||taskRegister.status_counts.OPEN!==2||taskRegister.tasks.length!==61)
 throw Error('UNRECONCILED_ORIGINAL_61_TASK_REGISTER');
const runs=['45036887325','45044300013','45057658912'];
const all=[],rawFiles={};
for(const id of runs){
 const evidence=await read('research/feeds/2026-11-22/'+id+'/evidence.json');
 if(evidence.kind!=='DOT2_PUBLIC_CAPTURE_EVIDENCE')
  throw Error('UNEXPECTED_ORIGINAL_EVIDENCE_KIND_'+id+':'+evidence.kind);
 for(const receipt of evidence.api_evidence){
  if(rawFiles[receipt.body_path]!==undefined)
   throw Error('DUPLICATE_ORIGINAL_SOURCE_PATH');
  rawFiles[receipt.body_path]=await readFile(receipt.body_path,'utf8');
  all.push(receipt);
 }
}
const archive=auditOfflineRawArchive({apiEvidence:all,rawFiles,asOfUtc});
if(archive.failures.length||archive.archive_file_count!==all.length
 ||archive.compression_roundtrip_verified!==true)
 throw Error('RAW_ARCHIVE_HASH_OR_COMPRESSION_FAILURE');
const archiveRoot='probe-artifacts/v19-offline-raw-archive';
const receipts=[];
for(const record of archive.entries){
 const raw=Buffer.from(rawFiles[record.source_path],'utf8');
 const zipped=gzipSync(raw,{mtime:0});
 if(sha(zipped)!==record.compressed_sha256||!gunzipSync(zipped).equals(raw))
  throw Error('ARCHIVE_COMPRESSED_OBJECT_MISMATCH');
 const target=join(archiveRoot,record.day_partition,record.original_sha256+'.json.gz');
 await mkdir(join(archiveRoot,record.day_partition),{recursive:true});
 // Content-addressed copies are temporary CI artifacts; original source is
 // NEVER deleted/rewritten, and the Git repo is never packed/pruned by this.
 try{await writeFile(target,zipped,{flag:'wx'});}catch(err){
  if(err.code!=='EEXIST')throw err;
  if(sha(await readFile(target))!==record.compressed_sha256)
   throw Error('GZIP_CONTENT_ADDRESS_COLLISION_OR_MUTATION');
 }
 receipts.push({source_path:record.source_path,compressed_copy:target,
  original_sha256:record.original_sha256,compressed_sha256:record.compressed_sha256,
  bytes:record.compressed_bytes,http_status:record.http_status});
}
const [memory,winners,recheck,handoff,riskPreview]=await Promise.all([
 read('research/state/market-memory.json'),
 read('research/evaluation/2026-10-12/v19-winner-reference-identity-status.json'),
 read('research/feeds/2026-11-22/45057658912/dot3-next-evidence-rechecks.json'),
 read('research/feeds/2026-11-22/45057658912/dot2-to-dot3-handoff.json'),
 read('research/feeds/2026-11-22/45057658912/dot3-research-risk-status-preview.json')
]);
const multichain=replayArchivedSixChainEvidence({apiEvidence:all,rawFiles,asOfUtc});
if(multichain.archive_failures.length||multichain.total_original_http200_pages!==15
 ||multichain.total_original_http429_pages!==3
 ||multichain.chains_with_at_least_one_prior_real_http200!==6)
 throw Error('SIX_CHAIN_OFFLINE_ORIGINAL_REPLAY_FAILED');
const manifest=await read('research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json');
const originalPrice=manifest.snapshots.find(x=>x.observed_at_utc==='2026-10-12T05:34:00.000Z');
const buyInput=manifest.snapshots.find(x=>x.observed_at_utc==='2026-10-12T06:34:00.000Z');
const dot4Boundary=await auditOfflineDot4OrderBoundary({
 snapshot:buyInput,asOfUtc:'2026-10-12T06:35:00.000Z',
 priorObservation:{at_utc:originalPrice.observed_at_utc,price_usd:.001},
 fullReviewDue:true,syntheticRegressionOnly:true,
 proposedOrder:{id:'offline-buy-proof-0001',action:'BUY',coin:buyInput.coin}
});
if(dot4Boundary.action!=='BUY'||dot4Boundary.independent_dot3_status!=='BLOCKED'
 ||dot4Boundary.paper_order_authorized!==false)
 throw Error('OFFLINE_DOT4_ORDER_BOUNDARY_FAILED');
const population=makeNeutralEvaluationPopulation({memory,asOfUtc});
const operations=summarizeOfflineOperationalReceipts({apiEvidence:all,asOfUtc});
const identity=resolveHistoricalWinnerIdentity({winnerRegister:winners,memory,asOfUtc});
const risk=auditDot3EvidenceDeadlines({recheckPlan:recheck,asOfUtc});
const riskTrust=auditOfflineDot3TrustAndSellability({handoff,riskPreview,asOfUtc});
if(riskTrust.paired_with_risk_model_count!==79
 ||riskTrust.independent_dot3_issuer_verifications_completed!==0
 ||riskTrust.orders_authorized!==0)throw Error('DOT3_UNVERIFIED_RISK_NOT_BLOCKED');
const winnersAfter=auditPostEventWinnerCoverage({
 winnerRegister:winners,population,asOfUtc,decisionWindowEndUtc:'2026-10-13T00:00:00.000Z'
});
// D4-08 synthetic MODEL transaction lifecycle: never call actual client.
// Run STOP and Dot4 proposal concurrently, verify exactly ONE model receipt.
const t=Date.parse('2026-11-22T11:00:00.000Z');
const coin={chain:'base',contract:'0x'+'a'.repeat(40),
 pool:'0x'+'b'.repeat(40),symbol:'ISOLATED'};
const order=(id,action,at=t,extra={})=>({
 id,mode:'PAPER',action,authority:'dot-4-strategy',
 dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
 reason:'Offline synthetic model proof only no real paper client',
 created_at:new Date(at).toISOString(),expires_at:new Date(at+120000).toISOString(),
 coin,...(action==='BUY'?{amount_test_usdc:50}:{}),...extra,
 quotes:['gecko','dex'].map(provider_id=>({...coin,provider_id,
  price_usdc:action==='BUY'?1:.85,liquidity_usdc:20000,
  observed_at:new Date(at).toISOString()}))
});
const before=settlePaper(order('audit-buy-0001','BUY'),newState(),t+1000).state;
const values=['PROTECTIVE_STOP','DOT4_SELL'].map(origin=>({
 origin,coin,opening_buy_order_id:'audit-buy-0001',
 observed_at_utc:'2026-11-22T11:00:45.000Z',
 observations:['gecko','dex'].map((provider_id,i)=>({
  ...coin,provider_id,captured_at_utc:'2026-11-22T11:00:45.000Z',
  provider_quote_asof_utc:'2026-11-22T11:00:40.000Z',
  price_usdc:.85*(i?1.01:1),liquidity_usdc:20000,
  source_archive_blob_sha:(i?'b':'a').repeat(40),
  source_url:i?'https://dexscreener.com/base/'+coin.pool:
   'https://www.geckoterminal.com/base/pools/'+coin.pool
 }))
}));
const after=settlePaper(order('audit-sell-0001','SELL',t+2000,
 {exit_position_source_order_id:'audit-buy-0001'}),before,t+3000).state;
const exits=auditOfflineExitLifecycle({paperStateBefore:before,paperStateAfter:after,
 confirmedModelSellOrderId:'audit-sell-0001',proposals:values,
 asOfUtc:'2026-11-22T11:01:00.000Z'});
if(exits.convergent_intent_count!==1
 ||exits.trace[0].modeled_separate_exit_receipt_consistent!==true
 ||exits.trace[0].repeated_proposals_collapsed!==1
 ||exits.genuine_client_fills!==0||after.trade_history.filter(x=>x.action==='SELL').length!==1)
 throw Error('SYNTHETIC_EXIT_CONVERGENCE_FAILED');
if(operations.measured_http_attempts!==archive.archive_file_count
 ||identity.reference_count!==65||identity.name_only_unresolved!==57
 ||identity.source_pool_link_count!==8||identity.exact_pool_link_count!==4
 ||population.population_size!==488||winnersAfter.neutral_observed_pool_count!==488
 ||risk.candidate_count!==79||winnersAfter.recall!==null
 ||operations.actual_gpt_reviews_verified_from_http!==0)
 throw Error('PROVENANCE_OR_NEUTRAL_DENOMINATOR_BASELINE_MISMATCH');
const summary={schema:1,kind:'R29_V19_FINAL_OFFLINE_READINESS_AUDIT',
 as_of_utc:asOfUtc,
 source_commit:process.env.GITHUB_SHA||null,
 original_61_task_ledger_status:taskRegister.status_counts,
 technically_touched_pct:taskRegister.technically_touched_pct,
 fully_accepted_pct:taskRegister.fully_accepted_pct,
 workflow_run_id:process.env.GITHUB_RUN_ID||null,
 archived_prior_real_provider_runs:runs,
 original_http_receipt_count:archive.archive_file_count,
 http_200:operations.http200,http_429:operations.http429,
 original_archive_raw_sha256_manifest:archive.sha256_manifest,
 original_archive_copy_count:receipts.length,
 compressed_copy_original_bytes:archive.raw_total_bytes,
 compressed_copy_gzip_bytes:archive.compressed_total_bytes,
 source_day_partitions:archive.day_partition_paths,
 compressed_copy_receipts:receipts,
 source_provider_metrics:operations,
 postevent_identity_research:identity,
 original_multichain_replay:multichain,
 shared_dot4_order_boundary:dot4Boundary,
 neutral_pool_count:population.population_size,
 risk_field_deadlines:risk,
 independent_dot3_and_chain_sellability_gap_audit:riskTrust,
 postevent_winner_coverage:winnersAfter,
 synthetic_model_stop_and_dot4_convergence:exits,
 nine_original_items_implemented_for_offline_review:[
  'SYS-10','SYS-14','D2-03','D3-07','D4-08','D5-01',
  'D2-01','D2-04','D4-01'
 ],
 all_nine_only_partial_not_completed:true,
 no_live_http_called_by_this_job:true,
 gpt_dots_executed:0,real_paper_client_fills:0,real_money_orders:0,
 paper_order_inbox_written:false,remote_windows_state_not_inspected:true,
 historical_october_29h_original_universe_still_unverified:true,
 compressed_objects_are_ci_artifacts_not_permanent_repo_archives:true
};
await mkdir('probe-artifacts',{recursive:true});
const out='probe-artifacts/v19-six-offline-final-readiness.json';
await writeFile(out,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log('R29_V19_FINAL_OFFLINE_READINESS',JSON.stringify({
 status:'PASS',task_counts:summary.original_61_task_ledger_status,
 technically_touched_pct:summary.technically_touched_pct,
 archived_raw_receipts:summary.original_http_receipt_count,
 compressed_copy_count:receipts.length,archive_original_bytes:archive.raw_total_bytes,
 archive_gzip_bytes:archive.compressed_total_bytes,
 archive_integrity_sha256:archive.sha256_manifest,
 measured_http200:operations.http200,http429:operations.http429,
 neutral_pools:population.population_size,
 winner_references:identity.reference_count,source_pool_links:identity.source_pool_link_count,
 typed_valid_pool_links:identity.exact_pool_link_count,
 risk_field_tasks:risk.field_task_count,
 replayed_gecko200_pages:multichain.total_original_http200_pages,
 replayed_six_chains:multichain.chains_with_at_least_one_prior_real_http200,
 real_november_price_pairs:multichain.observed_price_pairs_5_to_240min_total,
 dot4_shared_buy_still_blocked:dot4Boundary.paper_order_authorized===false,
 independently_authenticated_risk_pools:riskTrust.independent_dot3_issuer_verifications_completed,
 sellability_checks_still_unverified:riskTrust.unverified_sellability_count,
 model_convergent_exit:exits.convergent_intent_count,
 actual_gpt_runs:0,real_fills:0,output:out
}));
