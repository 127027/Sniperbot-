import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyOhlcvBackfillState,planOhlcvBackfill,recordOhlcvBackfill}
 from '../src/v19-ohlcv-backfill-queue.mjs';
import {makeGeckoOhlcvRequest,decodeGeckoOhlcv} from '../src/v19-gecko-ohlcv.mjs';
import {validateCaptureRequest} from '../src/discovery-feed.mjs';
const base='2026-11-22T10:00:00.000Z',pool='0x'+'a'.repeat(40),contract='0x'+'b'.repeat(40);
const candidate={chain:'base',pool,contract};
const req={schema:1,kind:'DOT2_DISCOVERY_CAPTURE_REQUEST',mode:'PAPER_RESEARCH_ONLY',
 requested_by:'dot-2-discovery',do_not_publish_orders:true,
 networks:['base'],created_at_utc:base,max_gecko_requests:3,max_ohlcv_requests:2,max_dex_pairs:0};
test('requested OHLCV calls are reserved from the existing hard Gecko request budget',()=>{
 assert.equal(validateCaptureRequest(req).max_ohlcv_requests,2);
 assert.throws(()=>validateCaptureRequest({...req,max_gecko_requests:2}),
  /OHLCV_RESERVATION_INVALID/);
 assert.throws(()=>validateCaptureRequest({...req,max_ohlcv_requests:3}),
  /OHLCV_RESERVATION_INVALID/);
 assert.equal(validateCaptureRequest({...req,max_ohlcv_requests:0}).max_gecko_requests,3);
});
test('prior unknown pools, duplicates, and oracle rows never seed fetches',()=>{
 const p=planOhlcvBackfill({asOfUtc:base,candidates:[
  candidate,candidate,{...candidate,contract:null},
  {...candidate,reported_gain_pct:50000},
  {...candidate,source_class:'POST_EVENT_ORACLE'}
 ],maxRequests:2});
 assert.equal(p.targets.length,1);
 assert.equal(p.rejected.length,3);
 assert.equal(p.provider_calls_performed,0);
 assert.equal(p.targets[0].next_before_timestamp,Math.floor(Date.parse(base)/1000)+1);
});
test('one proven page progresses the same exact pool cursor; does not authorize fills',()=>{
 const first=planOhlcvBackfill({asOfUtc:base,candidates:[candidate],maxRequests:1}).targets[0];
 const request=makeGeckoOhlcvRequest({...candidate,tokenContract:contract,
  beforeTimestamp:first.next_before_timestamp,limit:2});
 const c=Math.floor(Date.parse('2026-10-12T00:00:00Z')/1000);
 const archive=decodeGeckoOhlcv({request,response:{
  data:{attributes:{ohlcv_list:[[c+60,2,2,2,2,9],[c,1,1,1,1,8]]}},
  meta:{base:{address:contract}}
 },capturedAtUtc:base,sourceRawPath:'research/feeds/2026-11-22/1/raw.json',
 sourceSha256:'a'.repeat(64)});
 const state=recordOhlcvBackfill(emptyOhlcvBackfillState(),{target:first,
  page:archive,status:'OK',asOfUtc:base,sourceRawPath:archive.source_raw_path,
  sourceSha256:archive.source_raw_sha256});
 assert.equal(state.markets[first.key].next_before_timestamp,c);
 assert.equal(state.markets[first.key].successful_pages,1);
 assert.equal(state.markets[first.key].source_refs.length,1);
 const next=planOhlcvBackfill({state,asOfUtc:'2026-11-22T11:00:00.000Z',
  candidates:[candidate],maxRequests:1});
 assert.equal(next.targets[0].next_before_timestamp,c);
 assert.equal(next.trade_authorized,false);
});
test('429 keeps original cursor, sets cooldown, and never creates fictional evidence',()=>{
 const t=planOhlcvBackfill({asOfUtc:base,candidates:[candidate],maxRequests:1}).targets[0];
 const s=recordOhlcvBackfill(emptyOhlcvBackfillState(),{target:t,status:'HTTP_429',
  asOfUtc:base,retryAfterUtc:'2026-11-22T11:00:00.000Z'});
 const before=planOhlcvBackfill({state:s,candidates:[candidate],
  asOfUtc:'2026-11-22T10:30:00.000Z',maxRequests:1});
 assert.equal(before.targets.length,0);
 assert.equal(before.rejected[0].reason,'PROVIDER_RETRY_COOLDOWN');
 const after=planOhlcvBackfill({state:s,candidates:[candidate],
  asOfUtc:'2026-11-22T11:00:00.000Z',maxRequests:1});
 assert.equal(after.targets[0].next_before_timestamp,t.next_before_timestamp);
 assert.equal(s.markets[t.key].source_refs.length,0);
});
