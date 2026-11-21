import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCaptureRequest,chooseNetwork,fromDexPairOnly,collectSampleMetrics,sha256} from '../src/discovery-feed.mjs';
const request={schema:1,kind:'DOT2_DISCOVERY_CAPTURE_REQUEST',mode:'PAPER_RESEARCH_ONLY',requested_by:'dot-2-discovery',
 created_at_utc:'2026-11-21T16:15:00Z',networks:['solana','base','ethereum','bsc','robinhood','cronos'],
 max_gecko_requests:1,max_dex_pairs:6,do_not_publish_orders:true};
const pool='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const contract='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
test('validates immutable capture intent and strict no trading flag',()=>{
 assert.equal(validateCaptureRequest(request).max_gecko_requests,1);
 assert.throws(()=>validateCaptureRequest({...request,do_not_publish_orders:false}),/REAL_ORDER_DISABLED/);
 assert.throws(()=>validateCaptureRequest({...request,max_gecko_requests:50}),/GECKO_BUDGET_EXCEEDED/);
});
test('rotates six chains using run number instead of always Solana',()=>{
 assert.equal(chooseNetwork(request,0).chain,'solana');
 assert.equal(chooseNetwork(request,4).chain,'robinhood');
 assert.equal(chooseNetwork(request,5).network,'cro');
});
test('DEX can recover contract from exact pool without authorizing BUY',()=>{
 const p={chainId:'bsc',pairAddress:pool,baseToken:{address:contract,symbol:'A'},priceUsd:'0.001',liquidity:{usd:15000}};
 const r=fromDexPairOnly({chain:'bsc',pool,response:{pairs:[p]},capturedAtUtc:'2026-11-21T16:15:00Z'});
 assert.equal(r.candidate.contract,contract);
 assert.equal(r.candidate.trade_authorized,false);
 assert.equal(r.candidate.proof_level,'SINGLE_DEX_PROVIDER_NOT_BUY_ELIGIBLE');
 assert.equal(fromDexPairOnly({chain:'bsc',pool,response:{pairs:[{...p,chainId:'ethereum'}]},capturedAtUtc:'2026-11-21T16:15:00Z'}).candidate,null);
});
test('metrics never count candidates as trades',()=>{
 const r=collectSampleMetrics({geckoDecoded:{network:'solana',candidates:[{contract:'abc'},{}]},
  fallbackCandidates:[{contract}],dexChecks:[{matched:true,status:'MISSING_PRICE_OR_LIQUIDITY'}]});
 assert.equal(r.gecko_complete_contracts,1);
 assert.equal(r.dex_fallback_full_contracts,1);
 assert.equal(r.actionable_orders,0);
});
test('public raw sha256 stable',()=>assert.equal(sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
