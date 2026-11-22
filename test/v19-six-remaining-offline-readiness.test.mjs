import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newState,settlePaper,Reject} from '../src/core.mjs';
import {makeNeutralEvaluationPopulation} from '../src/v19-neutral-evaluation-population.mjs';
import {
 auditOfflineRawArchive,summarizeOfflineOperationalReceipts,
 resolveHistoricalWinnerIdentity,auditDot3EvidenceDeadlines,
 auditOfflineExitLifecycle,auditPostEventWinnerCoverage
} from '../src/v19-offline-remaining-readiness.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const evalEnd='2026-10-13T00:00:00.000Z';
const asOf='2026-11-22T19:44:00.000Z';

test('SYS-10: archive original multi-run raw bytes with content hashes, round-trip compression and immutable originals',async()=>{
 const evidence=await read('research/feeds/2026-11-22/45057658912/evidence.json');
 const rawFiles={};
 for(const e of evidence.api_evidence)rawFiles[e.body_path]=
  await readFile(e.body_path,'utf8');
 const report=auditOfflineRawArchive({apiEvidence:evidence.api_evidence,rawFiles,asOfUtc:asOf});
 assert.equal(report.archive_file_count,evidence.api_evidence.length);
 assert.equal(report.failures.length,0);
 assert.equal(report.compression_roundtrip_verified,true);
 assert.ok(report.raw_total_bytes>report.compressed_total_bytes);
 assert.ok(report.day_partition_paths['2026-11-22'].length>0);
 assert.ok(report.entries.some(x=>x.http_status===429));
 assert.ok(report.entries.every(x=>x.compressed_copy_tested&&x.original_sha256.length===64));
 assert.equal(report.never_delete_original_raw,true);
 const first=evidence.api_evidence[0];
 const tampered={...rawFiles,[first.body_path]:rawFiles[first.body_path]+'x'};
 const bad=auditOfflineRawArchive({apiEvidence:evidence.api_evidence,rawFiles:tampered,asOfUtc:asOf});
 assert.ok(bad.failures.some(x=>x.path===first.body_path));
 assert.equal(bad.compression_roundtrip_verified,false);
});
test('SYS-14: provider 200 and 429 telemetry is measured, never GPT or billing',async()=>{
 const e=await read('research/feeds/2026-11-22/45057658912/evidence.json');
 const out=summarizeOfflineOperationalReceipts({apiEvidence:e.api_evidence,asOfUtc:asOf});
 assert.equal(out.measured_http_attempts,e.api_evidence.length);
 assert.equal(out.http429,1);
 assert.equal(out.actual_gpt_reviews_verified_from_http,0);
 assert.equal(out.gpt_token_cost_usd,null);
 assert.equal(out.github_actions_minutes_cost_usd,null);
 assert.ok(out.utc_minute_buckets.length>=1);
 const future={...e.api_evidence[0],received_at_utc:'2026-11-23T00:00:00.000Z'};
 const protectedResult=summarizeOfflineOperationalReceipts({apiEvidence:[future],asOfUtc:asOf});
 assert.equal(protectedResult.measured_http_attempts,0);
 assert.equal(protectedResult.invalid_receipt_indices.length,1);
});
test('D2-03: 65 post-event winner references are never converted to October discovery by symbol',async()=>{
 const [winner,memory]=await Promise.all([
  read('research/evaluation/2026-10-12/v19-winner-reference-identity-status.json'),
  read('research/state/market-memory.json')]);
 const out=resolveHistoricalWinnerIdentity({winnerRegister:winner,memory,asOfUtc:asOf});
 assert.equal(out.reference_count,65);
 assert.equal(out.name_only_unresolved,57);
 assert.equal(out.exact_pool_link_count,8);
 assert.ok(out.retrospective_archived_contract_matches<=8);
 assert.ok(out.rows.every(x=>!x.safe_to_replay_as_historical_early_discovery
  &&!x.eligible_as_automatic_buy_candidate));
 assert.equal(out.exact_historical_october_detection_verified,0);
 const custom=structuredClone(winner);
 custom.entries[0].pool='0x'+'e'.repeat(40);
 const alt=resolveHistoricalWinnerIdentity({winnerRegister:custom,memory,asOfUtc:asOf});
 assert.equal(alt.rows[0].match_status,'LINKED_POOL_NOT_IN_ARCHIVED_MEMORY');
});
test('D3-07: every missing risk field yields a due or future-cooldown deadline without false approvals',()=>{
 const r={kind:'R29_V19_DOT3_EVIDENCE_RECHECK_PLAN',watchlist:[
  {key:'base:pool',missing_fields:['SELLABILITY_ATTESTATION','SECURITY_ATTESTATION',
   'SELLABILITY_ATTESTATION'],next_recheck_at_utc:'2026-11-22T19:50:00Z',
   evidence_deadline_at_utc:'2026-11-22T19:30:00Z',
   next_action:'VERIFY_SELLABILITY_AND_TAX'},
  {key:'ethereum:pool',missing_fields:['PROVIDER_QUOTE_ASOF'],
   next_recheck_at_utc:'2026-11-22T19:43:00Z',
   evidence_deadline_at_utc:'2026-11-22T19:55:00Z',next_action:'VERIFY_SOURCE_TIME'}]};
 const out=auditDot3EvidenceDeadlines({recheckPlan:r,asOfUtc:asOf});
 assert.equal(out.candidate_count,2);
 assert.equal(out.field_task_count,3);
 assert.equal(out.expired_task_count,2);
 assert.equal(out.provider_wait_task_count,2);
 assert.equal(out.no_provider_requests_made,true);
 assert.ok(out.tasks.every(x=>x.authenticated_new_risk_evidence===false&&x.buy_authorized===false));
});
const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40),symbol:'SAFE'};
const t=Date.parse('2026-11-22T11:00:00.000Z');
const order=(id,action,at=t,extra={})=>({
 id,mode:'PAPER',action,authority:'dot-4-strategy',
 dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
 reason:'Only synthetic in-memory test of paper model accounting',
 created_at:new Date(at).toISOString(),expires_at:new Date(at+120000).toISOString(),
 coin,...(action==='BUY'?{amount_test_usdc:50}:{}),
 quotes:['gecko','dex'].map(provider_id=>({...coin,provider_id,
  price_usdc:action==='BUY'?1:.85,liquidity_usdc:20000,
  observed_at:new Date(at).toISOString()})),...extra});
const proposal=origin=>({origin,coin,opening_buy_order_id:'synthetic-buy-0001',
 observed_at_utc:'2026-11-22T11:00:45.000Z',
 observations:[
  {provider_id:'gecko',source_url:'https://www.geckoterminal.com/base/pools/'+coin.pool},
  {provider_id:'dex',source_url:'https://dexscreener.com/base/'+coin.pool}
 ].map((x,i)=>({...x,...coin,captured_at_utc:'2026-11-22T11:00:45.000Z',
  provider_quote_asof_utc:'2026-11-22T11:00:40.000Z',
  price_usdc:.85*(i===0?1:1.01),liquidity_usdc:20000,
  source_archive_blob_sha:(i===0?'a':'b').repeat(40)}))});
test('D4-08: parallel STOP/Dot4 converge to one in-memory exit and one receipt, never client fills',()=>{
 const b=settlePaper(order('synthetic-buy-0001','BUY'),newState(),t+1000);
 const merged=auditOfflineExitLifecycle({paperStateBefore:b.state,
  proposals:[proposal('PROTECTIVE_STOP'),proposal('DOT4_SELL')],
  asOfUtc:'2026-11-22T11:01:00.000Z'});
 assert.equal(merged.convergent_intent_count,1);
 assert.equal(merged.trace[0].repeated_proposals_collapsed,1);
 assert.equal(merged.candidate_count,1);
 assert.equal(merged.genuine_client_fills,0);
 const sold=settlePaper(order('synthetic-sell-001','SELL',t+2000,{
  exit_position_source_order_id:'synthetic-buy-0001'}),b.state,t+3000);
 const audited=auditOfflineExitLifecycle({paperStateBefore:b.state,paperStateAfter:sold.state,
  confirmedModelSellOrderId:'synthetic-sell-001',
  proposals:[proposal('PROTECTIVE_STOP'),proposal('DOT4_SELL')],
  asOfUtc:'2026-11-22T11:01:00.000Z'});
 assert.equal(audited.trace[0].modeled_separate_exit_receipt_consistent,true);
 assert.equal(audited.genuine_signed_git_order_count,0);
 assert.throws(()=>settlePaper(order('synthetic-sell-002','SELL',t+2000,{
  exit_position_source_order_id:'synthetic-buy-0001'}),sold.state,t+3000),Reject);
 assert.equal(sold.state.trade_history.filter(x=>x.action==='SELL').length,1);
});
test('D5-01: 65 postevent labels compared only against 488 neutral archived pools, no fake historical recall',async()=>{
 const [winner,memory]=await Promise.all([
  read('research/evaluation/2026-10-12/v19-winner-reference-identity-status.json'),
  read('research/state/market-memory.json')]);
 const pop=makeNeutralEvaluationPopulation({memory,asOfUtc:asOf});
 const out=auditPostEventWinnerCoverage({winnerRegister:winner,population:pop,
  asOfUtc:asOf,decisionWindowEndUtc:evalEnd});
 assert.equal(pop.population_size,488);
 assert.equal(out.postevent_winner_reference_count,65);
 assert.equal(out.neutral_observed_pool_count,488);
 assert.equal(out.exact_pool_reference_count,8);
 assert.equal(out.actual_original_october_early_detection_confirmed,0);
 assert.equal(out.recall,null);
 assert.equal(out.precision,null);
 assert.equal(out.original_65_oracle_used_for_discovery,false);
 assert.ok(out.rows.every(x=>!x.historical_tradeable_entry_proven));
 assert.throws(()=>auditPostEventWinnerCoverage({winnerRegister:winner,population:pop,
  asOfUtc:'2026-10-12T08:00:00.000Z',decisionWindowEndUtc:evalEnd}),
  /INVALID_POSTEVENT_WINNER_EVALUATION/);
});
