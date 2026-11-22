import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGeckoOhlcvRequest,decodeGeckoOhlcv,planNextGeckoOhlcvPage} from '../src/v19-gecko-ohlcv.mjs';
const pool='0x'+'a'.repeat(40),contract='0x'+'b'.repeat(40);
const captured='2026-11-22T10:00:00.000Z';
const rawPath='research/feeds/2026-11-22/123/gecko-base-ohlcv.raw.json';
const hash='a'.repeat(64);
const first=Math.floor(Date.parse('2026-10-12T00:00:00Z')/1000);
const req=makeGeckoOhlcvRequest({chain:'base',pool,tokenContract:contract,
 beforeTimestamp:first+2000,limit:3});
const row=(t,price)=>[t,price,price*1.1,price*.9,price,1000];
const response=(rows,metaContract=contract)=>({data:{attributes:{ohlcv_list:rows}},
 meta:{base:{address:metaContract}}});
test('Gecko endpoint uses strict bounded back-page cursor, no paid API',()=>{
 assert.match(req.source_url,/ohlcv\/minute/);
 assert.match(req.source_url,/before_timestamp=/);
 assert.match(req.source_url,/token=base/);
 assert.equal(req.trade_authorized,false);
 assert.throws(()=>makeGeckoOhlcvRequest({chain:'base',pool,beforeTimestamp:first,limit:1001}),/INVALID_GECKO_OHLCV_REQUEST/);
});
test('archived October data fetched in November cannot have been available in October',()=>{
 const page=decodeGeckoOhlcv({request:req,response:response([row(first+120,2),row(first+60,1.5),row(first,1)]),
 capturedAtUtc:captured,sourceRawPath:rawPath,sourceSha256:hash,
 asOfUtc:'2026-10-12T01:00:00.000Z'});
 assert.equal(page.decoded_candle_count,3);
 assert.equal(page.retrospective_candle_count,3);
 assert.equal(page.visible_at_requested_asof_candles,0);
 assert.equal(page.original_http_captured_at_utc,captured);
 assert.equal(page.candles[0].original_capture_at_candle_time_proven,false);
 assert.equal(page.orders_authorized,0);
 const cursor=planNextGeckoOhlcvPage({previousRequest:req,previousPage:page,remainingPages:1});
 assert.equal(cursor.status,'CONTINUE');
 assert.equal(cursor.next_request.before_timestamp,first);
});
test('live capture can see only fully closed candles already available at capture',()=>{
 const now='2026-10-12T00:04:45.000Z';
 const page=decodeGeckoOhlcv({request:req,response:response([
 row(first+240,2.5),row(first+180,2),row(first+120,1.5)]),
 capturedAtUtc:now,sourceRawPath:rawPath,sourceSha256:hash,asOfUtc:now});
 assert.equal(page.visible_at_requested_asof_candles,2);
 assert.equal(page.candles[0].known_no_earlier_than_utc,'2026-10-12T00:03:00.000Z');
 assert.equal(page.candles[0].source_class,'ORIGINAL_CAPTURE');
 assert.equal(page.candles[0].available_at_utc,now);
 assert.equal(page.orders_authorized,0);
});
test('wrong provider base contract, invalid OHLC and duplicate timestamps cannot create a usable candle',()=>{
 const no=decodeGeckoOhlcv({request:req,response:response([row(first,1)],'0x'+'c'.repeat(40)),
 capturedAtUtc:captured,sourceRawPath:rawPath,sourceSha256:hash});
 assert.equal(no.decoded_candle_count,0);
 assert.ok(no.excluded_rows.includes('BASE_CONTRACT_MISMATCH_OR_UNKNOWN'));
 const bad=decodeGeckoOhlcv({request:req,response:response([row(first,1),row(first,1),
 [first+60,2,1,2,2,500]]),capturedAtUtc:captured,
 sourceRawPath:rawPath,sourceSha256:hash});
 assert.equal(bad.decoded_candle_count,1);
 assert.ok(bad.excluded_rows.includes('DUPLICATE_CANDLE_TIMESTAMP'));
 assert.ok(bad.excluded_rows.includes('INVALID_OHLCV_VALUES'));
});
test('provider short page stops cursor; no rewriting page data',()=>{
 const page=decodeGeckoOhlcv({request:req,response:response([row(first,1)]),
 capturedAtUtc:captured,sourceRawPath:rawPath,sourceSha256:hash});
 const next=planNextGeckoOhlcvPage({previousRequest:req,previousPage:page,remainingPages:1});
 assert.equal(next.status,'STOP');
 assert.equal(next.reason,'SOURCE_PAGE_UNDER_LIMIT');
});
