import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeGeckoNewPools,crossCheckDexPair} from '../src/live-pool-discovery.mjs';
const pool='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',contract='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const raw={data:[{id:'bsc_'+pool,attributes:{address:pool,pool_created_at:'2026-11-21T14:00:00Z',reserve_in_usd:'13000',
 base_token_price_usd:'0.001',volume_usd:{h24:'50000'}},relationships:{base_token:{data:{id:'bsc_'+contract}}}}],
 included:[{id:'bsc_'+contract,attributes:{address:contract,symbol:'TEST'}}]};
test('Gecko new pools include actual base contract rather than pool address',()=>{
 const r=decodeGeckoNewPools({network:'bsc',response:raw,page:2,capturedAtUtc:'2026-11-21T14:01:00Z'});
 assert.equal(r.with_full_contract,1);assert.equal(r.candidates[0].contract,contract);
 assert.equal(r.candidates[0].pool,pool);assert.equal(r.candidates[0].source_page,2);
});
test('missing included response cannot manufacture a contract',()=>{
 const r=decodeGeckoNewPools({network:'bsc',response:{data:raw.data},capturedAtUtc:'2026-11-21T14:01:00Z'});
 assert.equal(r.with_full_contract,0);assert.equal(r.candidates[0].contract,null);
});
test('Dex comparison matches chain+pool+base token, not symbol or quote token',()=>{
 const candidate=decodeGeckoNewPools({network:'bsc',response:raw,capturedAtUtc:'2026-11-21T14:01:00Z'}).candidates[0];
 const good={chainId:'bsc',pairAddress:pool,baseToken:{address:contract},priceUsd:'0.00101',liquidity:{usd:14000}};
 const r=crossCheckDexPair({candidate,response:{pairs:[{...good,baseToken:{address:'0x'+'c'.repeat(40)}},good]},checkedAtUtc:'2026-11-21T14:02:00Z'});
 assert.equal(r.status,'TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY');assert.ok(r.price_divergence_pct<3);
 assert.equal(r.trade_authorized,false);
 assert.equal(crossCheckDexPair({candidate,response:{pairs:[{...good,chainId:'base'}]},checkedAtUtc:'2026-11-21T14:02:00Z'}).matched,false);
});
test('liquidity and missing original prices remain explicit blocker',()=>{
 const candidate=decodeGeckoNewPools({network:'bsc',response:raw,capturedAtUtc:'2026-11-21T14:01:00Z'}).candidates[0];
 const good={chainId:'bsc',pairAddress:pool,baseToken:{address:contract},priceUsd:'0.00101',liquidity:{usd:4000}};
 assert.equal(crossCheckDexPair({candidate,response:{pairs:[good]},checkedAtUtc:'2026-11-21T14:02:00Z'}).status,'LOW_LIQUIDITY');
});
