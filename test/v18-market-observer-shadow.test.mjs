import test from 'node:test';
import assert from 'node:assert/strict';
import {observePositionShadow} from '../src/market-observer-v18.mjs';
const now='2026-11-22T09:30:00Z';
const coin={chain:'base',pool:'0x'+'b'.repeat(40),contract:'0x'+'a'.repeat(40),symbol:'SHADOW'};
function fixture(c=coin){
 const ref='base_'+c.contract;
 return {
 gecko:{data:{attributes:{address:c.pool,base_token_price_usd:'0.01',reserve_in_usd:'20000'},
  relationships:{base_token:{data:{id:ref}}}},included:[{id:ref,attributes:{address:c.contract}}]},
 dex:{pairs:[{chainId:'base',pairAddress:c.pool,baseToken:{address:c.contract},priceUsd:'0.0101',liquidity:{usd:21000}}]}
 };
}
const sample=(c=coin,override={})=>{
 const x={...fixture(c),...override};
 return observePositionShadow({coin:c,observedAtUtc:now,fetchJson:async url=>
  url.includes('geckoterminal')?x.gecko:x.dex});
};
test('two source captures are research only and never pretend to prove original quote time',async()=>{
 const r=await sample();
 assert.equal(r.independent_provider_observations,2);
 assert.equal(r.provider_quote_times_verified,false);
 assert.equal(r.trade_authorized,false);
 assert.equal(r.paper_filled,false);
 assert.ok(r.observations.every(x=>x.provider_quote_asof_utc===null&&x.source_archive_blob_sha===null));
});
test('mismatched token or missing second provider stays DATA_GAP',async()=>{
 const x=fixture();x.dex.pairs[0].baseToken.address='0x'+'c'.repeat(40);
 const result=await sample(coin,{dex:x.dex});
 assert.equal(result.independent_provider_observations,1);
 assert.equal(result.gaps[0].code,'EXACT_POOL_TOKEN_MISMATCH');
 const offline=await observePositionShadow({coin,observedAtUtc:now,fetchJson:async url=>{
  if(url.includes('dexscreener'))throw Error('HTTP_429');
  return fixture().gecko;
 }});
 assert.equal(offline.independent_provider_observations,1);
 assert.equal(offline.gaps[0].code,'HTTP_429');
});
test('typed Uniswap V4 pool ID is sampled without identity relaxation or trading',async()=>{
 const v4={...coin,pool:'0x'+'d'.repeat(64),pool_kind:'UNISWAP_V4_POOL_ID'};
 const r=await sample(v4);
 assert.equal(r.independent_provider_observations,2);
 assert.equal(r.trade_authorized,false);
});
