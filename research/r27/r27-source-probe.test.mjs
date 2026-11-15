import test from 'node:test';
import assert from 'node:assert/strict';
import {probeR27Gdelt,r27GeckoPoolBackfill} from './r27-source-probe.mjs';
import {buildR27Report,r27ReportMarkdown} from './r27-report.mjs';

const at='2026-11-15T12:00:00Z';
test('GDELT hindsight news metadata does not become contemporaneous historical evidence',async()=>{
 let requested='';
 const probe=await probeR27Gdelt({maxWindows:1,now:at,fetcher:async url=>{
  requested=url;
  return {ok:true,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify({articles:[{url:'https://example.org/2026/11/01/meme',
    title:'Article title',seendate:'20261101T180000Z',domain:'example.org'}]})};
 }});
 assert.match(requested,/startdatetime=20261030000000/);
 assert.equal(probe.observed_url_metadata_count,1);
 assert.equal(probe.verified_historical_asof_news_items,0);
 assert.equal(probe.entire_memecoin_news_universe_verified,false);
 assert.equal(probe.headlines[0].contemporaneous_archive_verified,false);
});
test('GDELT rate limiter stops immediately after first 429 and reports missing coverage',async()=>{
 let calls=0;
 const x=await probeR27Gdelt({maxWindows:5,now:at,
  fetcher:async()=>{calls++;return {status:429,ok:false}}});
 assert.equal(calls,1);
 assert.deepEqual(x.date_buckets.map(d=>d.status),[
  'HTTP_429_RATE_LIMIT','SKIPPED_AFTER_429','SKIPPED_AFTER_429',
  'SKIPPED_AFTER_429','SKIPPED_AFTER_429']);
});
test('Gecko historical pool candles are retrospective, not known early discovery or tradable quote',async()=>{
 const second=Math.floor(Date.parse('2026-11-02T00:00:00Z')/1000);
 let url=null;
 const q=await r27GeckoPoolBackfill({chain:'eth',pool_address:'0x'+'a'.repeat(40),
  fetcher:async u=>{url=u;return {ok:true,json:async()=>({data:{attributes:{
   ohlcv_list:[[second,1,1.2,.9,1.1,23000]]}}})}}});
 assert.match(url,/before_timestamp=/);
 assert.equal(q.rows,1);
 assert.equal(q.executable_buy_sell_quotes_verified,false);
 assert.equal(q.historical_candidate_discovery_verified,false);
 assert.equal(q.retrospective_only,true);
});
test('R27 German report never replaces unknown AI PnL with earlier R26 price PnL',async()=>{
 const old={schema:'sniper_r26_frequency_comparison.v1',
  runs:[{frequency_per_day:1,equity_if_liquidated_test_usdc:4087.69,net_pnl_test_usdc:-912.31}]};
 const x=await buildR27Report({baseline:old});
 assert.equal(x.report.summary.total_scheduled_analyses,615);
 assert.equal(x.report.runs[0].net_pnl_test_usdc,null);
 assert.equal(x.previous_price_only_reference.frequencies[0].price_only_virtual_net,-912.31);
 const doc=r27ReportMarkdown(x);
 assert(doc.includes('NICHT ERMITTELBAR'));
 assert(doc.includes('R26'));
});
