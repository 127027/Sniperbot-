import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyDot3QuoteTime} from '../src/v19-dot3-quote-time.mjs';
import {auditDot3QuoteSourcePair} from '../src/v19-dot3-source-pairs.mjs';
import {observePositionShadow} from '../src/market-observer-v18.mjs';

const at='2026-11-22T08:00:00.000Z',capture='2026-11-22T07:59:45.000Z',
 pool='0x'+'b'.repeat(40),contract='0x'+'a'.repeat(40);
const quote=(changes={})=>({asOfUtc:at,capturedAtUtc:capture,...changes});
test('valid HTTP capture with missing provider quote time is INDICATIVE, never a trade',()=>{
 const q=classifyDot3QuoteTime(quote());
 assert.equal(q.status,'HTTP_CAPTURE_ONLY_INDICATIVE');
 assert.equal(q.research_usable,true);
 assert.equal(q.structurally_fresh_quote,false);
 assert.equal(q.provider_time_independently_proven,false);
 assert.equal(q.real_paper_trade_authorized,false);
});
test('supplied fresh provider timestamp is structurally fresh, not independently authenticated',()=>{
 const q=classifyDot3QuoteTime(quote({
  providerQuoteAsOfUtc:'2026-11-22T07:59:40.000Z'}));
 assert.equal(q.status,'PROVIDER_TIMESTAMP_CLAIMED_FRESH');
 assert.equal(q.structurally_fresh_quote,true);
 assert.equal(q.provider_time_independently_proven,false);
 assert.equal(q.real_paper_trade_authorized,false);
});
test('future, backdated November and impossible provider timestamps are blocked',()=>{
 const future=classifyDot3QuoteTime(quote({
   availableAtUtc:'2026-11-22T08:05:00.000Z'}));
 assert.equal(future.status,'FUTURE_NOT_AVAILABLE');
 const retro=classifyDot3QuoteTime({asOfUtc:'2026-10-12T08:00:00.000Z',
  capturedAtUtc:'2026-11-22T07:59:45.000Z',
  providerQuoteAsOfUtc:'2026-10-12T07:59:40.000Z'});
 assert.equal(retro.status,'FUTURE_NOT_AVAILABLE');
 const impossible=classifyDot3QuoteTime(quote({
  providerQuoteAsOfUtc:'2026-11-22T08:05:00.000Z'}));
 assert.equal(impossible.status,'INVALID_TIME_SEQUENCE');
});
test('old snapshots and stale provider updates are research-only or require recapture',()=>{
 assert.equal(classifyDot3QuoteTime(quote({
  capturedAtUtc:'2026-11-22T07:45:00.000Z'})).status,'STALE_HTTP_CAPTURE');
 assert.equal(classifyDot3QuoteTime(quote({
  providerQuoteAsOfUtc:'2026-11-22T07:55:00.000Z'
 })).status,'PROVIDER_TIMESTAMP_CLAIMED_STALE');
});
test('same time classifier reaches independent-domain audit with unknown provider time',()=>{
 const q=(provider)=>({chain:'base',pool,contract,source_url:provider==='gecko'
   ?'https://www.geckoterminal.com/base/pools/'+pool
   :'https://dexscreener.com/base/'+pool,
  captured_at_utc:capture,provider_quote_asof_utc:null,
  price_usdc:1,liquidity_usdc:20000});
 const x=auditDot3QuoteSourcePair({coin:{chain:'base',pool,contract},
   observations:[q('gecko'),q('dex')],asOfUtc:at});
 assert.equal(x.status,'TWO_DOMAIN_INDICATIVE_ONLY');
 assert.deepEqual(x.quote_time_classes.map(q=>q.status),
  ['HTTP_CAPTURE_ONLY_INDICATIVE','HTTP_CAPTURE_ONLY_INDICATIVE']);
 assert.equal(x.provider_quote_times_independently_verified,false);
});
test('existing read-only position observer labels uncited prices HTTP_CAPTURE_ONLY',async()=>{
 const gecko={data:{attributes:{address:pool,base_token_price_usd:'1.00',
  reserve_in_usd:'20000'},relationships:{base_token:{data:{id:'base-token-ref'}}}},
  included:[{id:'base-token-ref',attributes:{address:contract}}]};
 const dex={pairs:[{chainId:'base',pairAddress:pool,baseToken:{address:contract},
   priceUsd:'1.01',liquidity:{usd:21000}}]};
 const shadow=await observePositionShadow({coin:{chain:'base',pool,contract},
  observedAtUtc:at,fetchJson:async url=>url.includes('geckoterminal')?gecko:dex});
 assert.equal(shadow.observations.length,2);
 assert.equal(shadow.quote_time_classifications.length,2);
 assert.ok(shadow.quote_time_classifications.every(x=>
  x.timing.status==='HTTP_CAPTURE_ONLY_INDICATIVE'));
 assert.equal(shadow.provider_quote_times_verified,false);
 assert.equal(shadow.trade_authorized,false);
});
