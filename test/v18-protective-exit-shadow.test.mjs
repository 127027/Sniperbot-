import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectProtectiveExit} from '../src/protective-exit.mjs';
const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40),symbol:'SHADOW'};
const now='2026-11-22T09:00:00Z';
const position={coin,sourceOrderId:'paper-buy-demo-001',entryPrice:1,quantity:50,costTestUsdc:50};
const obs=(price=1,liquidity=20000)=>[
 {...coin,provider_id:'gecko',source_url:'https://www.geckoterminal.com/base/pools/'+coin.pool,
   captured_at_utc:'2026-11-22T08:59:50Z',provider_quote_asof_utc:'2026-11-22T08:59:45Z',
   price_usdc:price,liquidity_usdc:liquidity,source_archive_blob_sha:'a'.repeat(40)},
 {...coin,provider_id:'dex',source_url:'https://dexscreener.com/base/'+coin.pool,
   captured_at_utc:'2026-11-22T08:59:52Z',provider_quote_asof_utc:'2026-11-22T08:59:46Z',
   price_usdc:price,liquidity_usdc:liquidity,source_archive_blob_sha:'b'.repeat(40)}];
const run=(observations=obs(),p=position)=>inspectProtectiveExit({position:p,observations,asOfUtc:now});
test('ordinary current price returns HOLD without creating order or changing portfolio',()=>{
 const saved=structuredClone(position),result=run();
 assert.equal(result.status,'SHADOW_HOLD');
 assert.equal(result.paper_filled,false);
 assert.equal(result.trade_authorized,false);
 assert.deepEqual(position,saved);
});
test('steep fall between GPT scans creates only an estimated stop-exit candidate, not a fill',()=>{
 const result=run(obs(.65));
 assert.equal(result.status,'SHADOW_SELL_CANDIDATE');
 assert.equal(result.trigger_reason,'STOP_LOSS');
 assert.ok(result.estimated_pnl_test_usdc<0);
 assert.equal(result.estimated_only_not_executable_quote,true);
 assert.equal(result.paper_filled,false);
});
test('strong gain marks take-profit candidate but never records realized PnL',()=>{
 const result=run(obs(1.4));
 assert.equal(result.trigger_reason,'TAKE_PROFIT');
 assert.equal(result.status,'SHADOW_SELL_CANDIDATE');
 assert.ok(result.estimated_pnl_test_usdc>0);
 assert.equal(result.paper_filled,false);
});
test('liquidity loss, stale quote, source conflict block imaginary stop execution',()=>{
 const low=run(obs(.65,1000));
 assert.equal(low.status,'EXIT_BLOCKED');
 assert.equal(low.paper_filled,false);
 const stale=obs(.65);stale[0].provider_quote_asof_utc='2026-11-22T08:50:00Z';
 assert.equal(run(stale).code,'STALE_OR_UNDATED_PRICE');
 const mismatch=obs(.65);mismatch[1].price_usdc=.2;
 assert.equal(run(mismatch).code,'PROVIDER_PRICE_CONFLICT');
});
test('one provider or a wrong token contract is not a sell quote',()=>{
 assert.equal(run(obs(.65).slice(0,1)).code,'TWO_QUOTES_REQUIRED');
 const swapped=obs(.65);swapped[1].contract='0x'+'c'.repeat(40);
 assert.equal(run(swapped).code,'SOURCE_IDENTITY_CONFLICT');
});
