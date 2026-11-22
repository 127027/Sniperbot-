import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildDot5DiscoveryLedger,annotateDot5ResearchEvent}
 from '../src/v19-dot5-event-ledger.mjs';

const root='research/feeds/2026-11-22/45002280249/';
const load=async path=>JSON.parse(await readFile(root+path,'utf8'));
const make=async(extra={})=>{
 const [capture,handoff]=await Promise.all([load('evidence.json'),
  load('dot2-to-dot3-handoff.json')]);
 return {capture,handoff,asOfUtc:capture.captured_completed_at_utc,
  sourceEvidencePath:root+'evidence.json',...extra};
};

test('real 22 Nov Ethereum page3 preserves 2 accepted and 18 rejected source rows',async()=>{
 const ledger=buildDot5DiscoveryLedger(await make());
 assert.equal(ledger.summary.handoff_accepted_pools,2);
 assert.equal(ledger.summary.upstream_parser_rejections,18);
 assert.equal(ledger.summary.recorded_lifecycle_entities,20);
 assert.equal(ledger.summary.rejected_uniswap_v4_reported,18);
 assert.equal(ledger.original_api_row_count,20);
 assert.equal(ledger.summary.verified_orders,0);
 assert.equal(ledger.summary.known_evaluation_denominator,false);
 assert.equal(ledger.includes_only_this_capture_not_global_universe,true);
 assert.equal(ledger.events.filter(x=>x.current_stage==='DISCOVERY_REJECTED').length,18);
 assert.equal(ledger.events.filter(x=>x.current_stage==='DOT2_DISCOVERED').length,2);
 assert.equal(ledger.events.every(x=>x.outcome===null&&x.order===null&&x.client_receipt===null),true);
});
test('no fabricated first-seen or listing high-return label on 18 filtered V4 pools',async()=>{
 const ledger=buildDot5DiscoveryLedger(await make());
 const v4=ledger.events.filter(x=>x.current_stage==='DISCOVERY_REJECTED');
 assert.equal(v4.length,18);
 assert.equal(v4.every(x=>x.source_pool_id?.startsWith('eth_0x')
  &&x.reported_dex_id==='uniswap-v4-ethereum'),true);
 assert.equal(v4.every(x=>x.pool===null&&x.contract===null
  &&x.discovery_rejection_reason==='POOL_ADDRESS_MISSING_OR_INVALID'),true);
 assert.ok(v4.every(x=>x.lifecycle[0].actual_gpt_review===false));
});
test('event id is stable per observed pool even when capture time changes',async()=>{
 const a=await make(),first=buildDot5DiscoveryLedger(a);
 const later={...a,asOfUtc:'2026-11-22T08:21:00.000Z'};
 const second=buildDot5DiscoveryLedger(later);
 assert.deepEqual(first.events.map(x=>x.event_id),second.events.map(x=>x.event_id));
 assert.equal(new Set(first.events.map(x=>x.event_id)).size,20);
});
test('risk preview is a structured stage, never an authenticated Dot3 execution',async()=>{
 const a=await make();
 const risk={kind:'R29_V19_DOT3_RISK_STATUS_PREVIEW',
  as_of_utc:a.asOfUtc,candidates:a.handoff.candidates.map(c=>({
   pool_key:c.pool_key,status:'WATCH',reason:'LOW_LIQUIDITY_RESEARCH_ONLY',
   missing_fields:['INDEPENDENT_SELLABILITY_PROOF']}))};
 const ledger=buildDot5DiscoveryLedger({...a,dot3RiskPreview:risk});
 assert.equal(ledger.summary.dot3_watch,2);
 assert.equal(ledger.events.filter(x=>x.current_stage==='DOT3_RISK_PREVIEW').length,2);
 assert.equal(ledger.summary.verified_gpt_runs,0);
 assert.equal(ledger.events.filter(x=>x.current_stage==='DOT3_RISK_PREVIEW')
  .every(x=>x.lifecycle[1].trade_authorized===false),true);
});
test('later as-of data and post-event winner metadata cannot flow into research',async()=>{
 const a=await make();
 assert.throws(()=>buildDot5DiscoveryLedger({...a,
  asOfUtc:'2026-11-22T08:00:00.000Z'}),/INVALID_DOT5_SOURCE_TIMELINE/);
 const poison=structuredClone(a.handoff);
 poison.candidates[0].reported_gain_pct=50327;
 assert.throws(()=>buildDot5DiscoveryLedger({...a,handoff:poison}),
  /DOT5_POST_EVENT_ORACLE_IN_RESEARCH_INPUT/);
});
test('claimed Order/Receipt/Outcome is logged as UNVERIFIED without creating a fill',async()=>{
 const a=await make(),ledger=buildDot5DiscoveryLedger(a);
 const accepted=ledger.events.find(x=>x.pool_key);
 const annotated=annotateDot5ResearchEvent({ledger,eventId:accepted.event_id,
  stage:'RECEIPT_CLAIM',observedAtUtc:ledger.as_of_utc,
  sourcePath:'research/feeds/2026-11-22/example-receipt-claim.json'});
 const e=annotated.events.find(x=>x.event_id===accepted.event_id);
 assert.equal(e.client_receipt,null);
 assert.equal(annotated.summary.verified_client_receipts,0);
 assert.equal(e.lifecycle.at(-1).claim_recorded_not_authenticated,true);
 assert.equal(ledger.events.find(x=>x.event_id===accepted.event_id).lifecycle.length,1);
 const rejection=ledger.events.find(x=>x.current_stage==='DISCOVERY_REJECTED');
 assert.throws(()=>annotateDot5ResearchEvent({ledger,eventId:rejection.event_id,
  stage:'ORDER_CLAIM',observedAtUtc:ledger.as_of_utc,sourcePath:'research/foo.json'}),
  /DOT5_REJECTED_ROW_CANNOT_CLAIM_EXECUTION/);
});
test('identical archived capture is not silently a global market population',async()=>{
 const {capture,handoff,asOfUtc}=await make();
 const ledger=buildDot5DiscoveryLedger({capture,handoff,asOfUtc});
 assert.equal(ledger.summary.known_evaluation_denominator,false);
 assert.equal(ledger.no_trading_or_gpt_executed,true);
 assert.equal(ledger.source_blob_verified_independently,false);
 assert.ok(ledger.events.some(x=>x.source_page===3));
});


test('real multi-chain aggregation retains parser rejects per original chain/page',async()=>{
 const a=await make();
 const capture={...a.capture,source_chain:'MULTI_CHAIN',
  gecko:{...a.capture.gecko,network:'MULTI_CHAIN',page:null,
   rejected:a.capture.gecko.rejected.map(r=>({...r,chain:'ethereum',
     source_page:3,source_http_captured_at_utc:a.capture.gecko.captured_at_utc}))},
  page_capture_failures:[{chain:'base',page:2,status:'HTTP_429',
   attempt_at_utc:'2026-11-22T08:19:45.500Z',
   retry_after_utc:'2026-11-22T08:20:45.500Z'}],
  page_capture_deferred:[{chain:'solana',page:1,status:'NOT_CAPTURED_DEFERRED'}]};
 const ledger=buildDot5DiscoveryLedger({...a,capture});
 assert.equal(ledger.summary.recorded_lifecycle_entities,22);
 assert.equal(ledger.summary.page_capture_failures,1);
 assert.equal(ledger.summary.page_capture_deferred,1);
 assert.equal(ledger.summary.rejected_uniswap_v4_reported,18);
 assert.equal(ledger.events.filter(x=>x.current_stage==='DISCOVERY_REJECTED')
  .every(x=>x.source_chain==='ethereum'&&x.source_page===3),true);
 assert.equal(ledger.events.find(x=>x.current_stage==='PAGE_CAPTURE_FAILED')
  .page_failure_status,'HTTP_429');
 assert.equal(ledger.events.find(x=>x.current_stage==='PAGE_CAPTURE_DEFERRED')
  .lifecycle[0].page_was_observed,false);
});
test('zero successful Gecko pages after 429 still yield a truthful gap journal',async()=>{
 const a=await make();
 const empty={...a.capture,gecko:null,source_chain:'MULTI_CHAIN',
  page_capture_failures:[{chain:'base',page:3,status:'HTTP_429',
   attempt_at_utc:'2026-11-22T08:19:45.500Z',
   retry_after_utc:'2026-11-22T08:20:45.500Z'}],
  page_capture_deferred:[]};
 const handoff={...a.handoff,candidates:[],counts:{unique_pools:0}};
 const ledger=buildDot5DiscoveryLedger({...a,capture:empty,handoff});
 assert.equal(ledger.summary.handoff_accepted_pools,0);
 assert.equal(ledger.summary.upstream_parser_rejections,0);
 assert.equal(ledger.summary.page_capture_failures,1);
 assert.equal(ledger.summary.recorded_lifecycle_entities,1);
 assert.equal(ledger.events[0].pool,null);
 assert.equal(ledger.events[0].outcome,null);
 assert.equal(ledger.summary.verified_orders,0);
});
test('future page-failure timestamp cannot enter a historical event ledger',async()=>{
 const a=await make();
 const capture={...a.capture,page_capture_failures:[{
  chain:'base',page:3,status:'HTTP_429',
  attempt_at_utc:'2026-11-23T12:00:00.000Z'}]};
 assert.throws(()=>buildDot5DiscoveryLedger({...a,capture}),
  /DOT5_INVALID_PAGE_GAP/);
});
