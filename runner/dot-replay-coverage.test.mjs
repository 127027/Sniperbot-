import test from 'node:test';
import assert from 'node:assert/strict';
import {assessReplayCoverage,asOfResearchEvidence,classifyResearchObservation,readR07Reports} from './dot-replay-coverage.mjs';
test('five completed R07 results are evidence-starved, not evidence of missed winners',()=>{
 const v=assessReplayCoverage(readR07Reports());
 assert.equal(v.completed_role_reports,5);
 assert.equal(v.roles_blocked,5);
 assert.equal(v.total_verified_asof_events_reported,0);
 assert.equal(v.distinct_candidate_discoveries_reported,0);
 assert.equal(v.total_qualified_paper_advisories_reported,0);
 assert.equal(v.root_cause_class,'INPUT_DATA_UNAVAILABLE_DO_NOT_SCORE_DETECTION');
 assert.equal(v.test_outcome,'UNTESTABLE_NOT_MISSED_WINNER');
 assert.equal(v.real_five_model_historical_daily_replay_proven,false);
 assert.equal(v.role_metrics.find(r=>r.role==='onchain_liquidity').daily_lines,61);
 assert.equal(v.role_metrics.find(r=>r.role==='onchain_liquidity').days_with_verified_asof_sources,0);
 assert.equal(v.role_metrics.find(r=>r.role==='news_discovery').daily_lines,0);
});
test('cannot treat 61 generic UNAVAILABLE_ASOF lines as 61 market-data days',()=>{
 const v=assessReplayCoverage(readR07Reports());
 assert(v.role_metrics.every(x=>x.days_with_verified_asof_sources===0));
});
test('historical immutable chain transaction can be admissible without Wayback HTML when its ledger facts are replayed',()=>{
 const source={provenance_class:'IMMUTABLE_LEDGER_TX',event_at_utc:'2024-10-11T09:00:00Z',
 available_from_utc:'2024-10-11T09:00:00Z',content_verified:true,content_sha256:'a'.repeat(64),
 chain:'solana',block_slot:294444444,tx_id:'ExampleOnlyDoNotTradeAAAA1111111',
 original_tx_retrieved:true,historical_state_replayed:true};
 assert.equal(asOfResearchEvidence(source,'2024-10-10T23:59:59Z').admissible,false);
 assert.equal(asOfResearchEvidence(source,'2024-10-11T23:59:59Z').admissible,true);
 assert.equal(asOfResearchEvidence({...source,historical_state_replayed:false},'2024-10-11T23:59:59Z').admissible,false);
});
test('unverified retro article, fabricated archive and later source timestamps fail closed',()=>{
 const common={provenance_class:'WARC_CAPTURE',event_at_utc:'2024-10-11T09:00:00Z',
 available_from_utc:'2024-10-12T09:00:00Z',content_verified:true,content_sha256:'a'.repeat(64),
 capture_url:'https://web.archive.org/web/20241012090000/https://example.org',archived_bytes_verified:true};
 assert.equal(asOfResearchEvidence(common,'2024-10-10T23:59:59Z').admissible,false);
 assert.equal(asOfResearchEvidence({...common,archived_bytes_verified:false},'2024-10-13T23:59:59Z').admissible,false);
 assert.equal(asOfResearchEvidence({...common,provenance_class:'PUBLISHED_DATE_ONLY'},'2024-10-13T23:59:59Z').admissible,false);
 assert.equal(asOfResearchEvidence({...common,capture_url:'https://web.archive.org/web/20241011090000/https://example.org'},'2024-10-13T23:59:59Z').reason,'ARCHIVE_CAPTURE_TIME_MISMATCH');
 assert.equal(asOfResearchEvidence(common,'2024-10-13T23:59:59Z').admissible,true);
});
test('narrative first and coin identity are research events, security is a later gate',()=>{
 assert.equal(classifyResearchObservation({hasVerifiedNarrative:true}),'EARLY_NARRATIVE_WATCH_ONLY');
 assert.equal(classifyResearchObservation({hasVerifiedPool:true}),'TOKEN_FOUND_TRADE_NOT_EVALUABLE');
 assert.equal(classifyResearchObservation({hasVerifiedPool:true,hasDatedSecurityReview:true,hasDatedMarketQuote:true}),'TOKEN_FOUND_TRADE_NOT_EVALUABLE');
 assert.equal(classifyResearchObservation({hasVerifiedPool:true,hasDatedSecurityReview:true,hasDatedMarketQuote:true,hasDatedSellRoute:true}),'CANDIDATE_FOR_QA_REVIEW_NOT_AN_ORDER');
});
test('invalid or duplicate R07 role set is never scored',()=>{
 const r=readR07Reports();
 assert.throws(()=>assessReplayCoverage(r.slice(0,4)),/INVALID_REPORT_SET/);
 assert.throws(()=>assessReplayCoverage([r[0],r[0],...r.slice(2)]),/MISSING_OR_DUPLICATED_ROLES/);
});
