import test from 'node:test';
import assert from 'node:assert/strict';
import {observePositionShadow} from '../src/market-observer-v18.mjs';
import {inspectProtectiveExit} from '../src/protective-exit.mjs';
import {newState} from '../src/core.mjs';

test('read-only market observation with no original quote-asof never fabricates protective SELL or changes paper cash',async()=>{
 const c={chain:'base',pool:'0x'+'b'.repeat(40),contract:'0x'+'a'.repeat(40),symbol:'SHADOW'};
 const at='2026-11-22T09:30:00Z',ref='base_'+c.contract;
 const gecko={data:{attributes:{address:c.pool,base_token_price_usd:'0.0006',reserve_in_usd:'15000'},
   relationships:{base_token:{data:{id:ref}}}},included:[{id:ref,attributes:{address:c.contract}}]};
 const dex={pairs:[{chainId:'base',pairAddress:c.pool,baseToken:{address:c.contract},
   priceUsd:'0.0006',liquidity:{usd:16000}}]};
 const previous=newState();
 const prevCash=previous.cash;
 const market=await observePositionShadow({coin:c,observedAtUtc:at,fetchJson:async url=>
   url.includes('geckoterminal')?gecko:dex});
 assert.equal(market.independent_provider_observations,2);
 assert.equal(market.trade_authorized,false);
 const paperPosition={coin:c,entryPrice:.001,quantity:50000,costTestUsdc:50,sourceOrderId:'shadow-order-sample'};
 const exit=inspectProtectiveExit({position:paperPosition,observations:market.observations,asOfUtc:at});
 assert.equal(exit.status,'EXIT_DATA_GAP');
 assert.equal(exit.code,'STALE_OR_UNDATED_PRICE');
 assert.equal(exit.paper_filled,false);
 assert.equal(previous.cash,prevCash);
 assert.deepEqual(previous.positions,{});
 assert.deepEqual(previous.processed,{});
});
