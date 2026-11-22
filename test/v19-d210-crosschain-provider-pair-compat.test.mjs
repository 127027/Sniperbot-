import test from 'node:test';
import assert from 'node:assert/strict';
import {crossCheckDexPair} from '../src/live-pool-discovery.mjs';
import {fromDexPairOnly} from '../src/discovery-feed.mjs';
const at='2026-11-22T18:45:00.000Z';
const observed='2026-11-22T18:44:00.000Z';
const e=n=>'0x'+n.toString(16).padStart(40,'0');
const solPool='So'+'1'.repeat(38),solToken='So'+'2'.repeat(38);
const v4='0x'+'A'.repeat(64);
const cases=[
 {chain:'robinhood',dexChain:'robinhoodchain',linkChain:'robinhood',
  pool:e(1),contract:e(31),pool_kind:null},
 {chain:'solana',dexChain:'solana',linkChain:'solana',
  pool:solPool,contract:solToken,pool_kind:null},
 {chain:'bsc',dexChain:'bsc',linkChain:'bsc',
  pool:e(2),contract:e(32),pool_kind:null},
 {chain:'ethereum',dexChain:'eth',linkChain:'eth',
  pool:v4,contract:e(33),pool_kind:'UNISWAP_V4_POOL_ID'},
 {chain:'cronos',dexChain:'cro',linkChain:'cro',
  pool:e(3),contract:e(34),pool_kind:null}
];
const link=x=>'https://www.geckoterminal.com/'+x.linkChain+'/pools/'+x.pool;
const candidate=x=>({...x,source_url:link(x),
 source_api:'GECKOTERMINAL_NEW_POOLS_JSON',observed_at_utc:observed,
 observed_price_usd:0.001,liquidity_usd:12000,symbol:'DUP'});
const pair=x=>({chainId:x.dexChain,pairAddress:x.pool,
 baseToken:{address:x.contract,symbol:'DUP'},
 quoteToken:{address:x.chain==='solana'?solToken:e(999)},
 priceUsd:'0.00101',liquidity:{usd:14000}});
for(const x of cases){
 test('D2-10 positive/negative '+x.chain+' pair and contract',()=>{
  const c=candidate(x),p=pair(x);
  const good=crossCheckDexPair({candidate:c,response:{pairs:[p]},
    checkedAtUtc:at});
  assert.equal(good.matched,true);
  assert.equal(good.status,'TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY');
  assert.ok(good.pool_identity_key);
  assert.ok(good.token_identity_key);
  assert.equal(good.trade_authorized,false);
  assert.equal(good.provider_quote_asof_verified,false);
  assert.equal(good.provider_quote_age_seconds,null);
  assert.equal(good.upstream_provider_independence_proven,false);
  assert.equal(good.quote_source_capture_at_utc,observed);
  const wrongChain=crossCheckDexPair({candidate:c,
    response:{pairs:[{...p,chainId:x.chain==='base'?'bsc':'base'}]},
    checkedAtUtc:at});
  assert.equal(wrongChain.matched,false);
  assert.equal(wrongChain.mismatch_counts.wrong_chain,1);
  const wrongPool=crossCheckDexPair({candidate:c,
   response:{pairs:[{...p,pairAddress:x.chain==='solana'?'So'+'3'.repeat(38):e(79)}]},
   checkedAtUtc:at});
  assert.equal(wrongPool.matched,false);
  assert.equal(wrongPool.mismatch_counts.wrong_pool,1);
  const wrongToken=crossCheckDexPair({candidate:c,
   response:{pairs:[{...p,baseToken:{address:x.chain==='solana'?'So'+'4'.repeat(38):e(90)}}]},
   checkedAtUtc:at});
  assert.equal(wrongToken.matched,false);
  assert.equal(wrongToken.mismatch_counts.wrong_base_token,1);
  const fallback=fromDexPairOnly({chain:x.chain,pool:x.pool,pool_kind:x.pool_kind,
   response:{pairs:[p]},capturedAtUtc:at});
  assert.equal(fallback.status,'SINGLE_PROVIDER_IDENTITY_NEEDS_SECOND_CONFIRMATION');
  assert.equal(fallback.candidate.pool,x.pool);
  assert.equal(fallback.candidate.trade_authorized,false);
  assert.equal(fallback.candidate.provider_quote_asof_verified,false);
  const fail=fromDexPairOnly({chain:x.chain,pool:x.pool,pool_kind:x.pool_kind,
   response:{pairs:[{...p,chainId:'base',baseToken:{address:e(101)}}]},
   capturedAtUtc:at});
  assert.equal(fail.candidate,null);
  assert.equal(fail.status,'NO_VERIFIED_EXACT_PAIR_AND_BASE');
 });
}
test('D2-10: source URL wrong chain or wrong exact pool is rejected, even when DEX pair matches',()=>{
 const bsc=cases[2],c=candidate(bsc);
 for(const altered of [
  'https://dexscreener.com/base/'+c.pool,
  'https://geckoterminal.com/bsc/pools/'+e(99),
  'http://geckoterminal.com/bsc/pools/'+c.pool
 ]){
  const x=crossCheckDexPair({candidate:{...c,source_url:altered},
   response:{pairs:[pair(bsc)]},checkedAtUtc:at});
  assert.equal(x.status,'SOURCE_URL_CHAIN_OR_POOL_CONFLICT');
  assert.equal(x.matched,false);
  assert.equal(x.trade_authorized,false);
 }
});
test('D2-10: an earlier DEX capture cannot corroborate a source observed in the future',()=>{
 const x=cases[0],c=candidate(x);
 const r=crossCheckDexPair({candidate:{...c,
  observed_at_utc:'2026-11-22T18:46:00Z'},
  response:{pairs:[pair(x)]},checkedAtUtc:at});
 assert.equal(r.status,'CROSSCHECK_PREDATES_SOURCE_OBSERVATION');
 assert.equal(r.matched,false);
 assert.equal(r.trade_authorized,false);
});
test('D2-10: 32-byte V4 pool ID and ordinary 20-byte EVM pair are not interchangeable',()=>{
 const eth=cases[3];
 const c=candidate(eth),p=pair(eth);
 const mismatch=crossCheckDexPair({candidate:c,
  response:{pairs:[{...p,pairAddress:e(42)}]},checkedAtUtc:at});
 assert.equal(mismatch.matched,false);
 assert.equal(mismatch.mismatch_counts.malformed_provider_pair,1);
 assert.throws(()=>fromDexPairOnly({chain:'ethereum',pool:e(12),
  pool_kind:'UNISWAP_V4_POOL_ID',response:{pairs:[p]},capturedAtUtc:at}),
  /INVALID_DEX_FALLBACK/);
});
test('D2-10: price timestamp and provider independence remain unknown even for matched quotes',()=>{
 const x=cases[2],r=crossCheckDexPair({candidate:candidate(x),
  response:{pairs:[{...pair(x),pairCreatedAt:Date.parse('2026-11-01T00:00:00Z')}]},
  checkedAtUtc:at});
 assert.equal(r.matched,true);
 assert.equal(r.provider_quote_asof_utc,null);
 assert.equal(r.provider_quote_asof_verified,false);
 assert.equal(r.provider_quote_age_seconds,null);
 assert.equal(r.trade_authorized,false);
});
