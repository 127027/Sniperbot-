import test from 'node:test';
import assert from 'node:assert/strict';
import {collectSnapshot,MARKETS} from './research-market-collector.mjs';
const now='2026-11-09T17:00:00.000Z';
const token='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40),token2='0x'+'3'.repeat(40),pool2='0x'+'4'.repeat(40);
const response=json=>({ok:true,json:async()=>json});
const validPool=(m,address=token,pair=pool)=>({attributes:{address:pair,pool_created_at:'2026-11-09T16:00:00Z',
  reserve_in_usd:'80000',volume_usd:{m5:'5000'}},
  relationships:{base_token:{data:{id:m.gecko+'_'+address}}}});
function fakeGT(m){
  return {data:m.chain==='solana'?[]:[validPool(m)]};
}
const getChain=url=>MARKETS.find(m=>url.includes('/networks/'+m.gecko+'/'));
test('one Gecko pool per EVM chain is a research observation, not a sellability confirmation',async()=>{
  const calls=[];
  const fetcher=async url=>{
    calls.push(url);
    if(url.includes('geckoterminal'))return response(fakeGT(getChain(url)));
    return response({pairs:[{chainId:'base',baseToken:{address:token},pairAddress:pool}]});
  };
  const snapshot=await collectSnapshot({fetcher,now});
  assert.equal(snapshot.schema,'research_market_snapshot.v1');
  assert.equal(snapshot.paper_only,true);assert.equal(snapshot.actionable,false);
  assert.equal(snapshot.collection_status,'OBSERVED_OR_PARTIAL');
  assert.equal(snapshot.candidates.length,3);
  assert.ok(snapshot.candidates.every(c=>c.unresolved_checks.includes('SELLABILITY')&&c.unresolved_checks.includes('CONTRACT')));
  assert.equal(snapshot.candidates.find(c=>c.chain==='base').verification,'CROSS_PROVIDER_IDENTITY');
  assert.equal(snapshot.candidates.find(c=>c.chain==='eth').verification,'PROVIDER_ONLY');
  assert.equal(calls.filter(x=>x.includes('/new_pools?')).length,4);
  assert.ok(calls.every(x=>x.startsWith('https://api.geckoterminal.com/')||x.startsWith('https://api.dexscreener.com/')));
});
test('malformed contract and pool addresses never enter candidate list',async()=>{
  const fetcher=async url=>{
    if(url.includes('geckoterminal')){
      const m=getChain(url);
      return response({data:[validPool(m,token,'BAD_POOL'),validPool(m,'BAD_TOKEN',pool)]});
    }
    throw Error('Unexpected secondary fetch');
  };
  const result=await collectSnapshot({fetcher,now});
  assert.equal(result.summary.identities,0);
  assert.equal(result.collection_status,'OBSERVED_OR_PARTIAL');
});
test('partial outage does not erase available chain observations',async()=>{
  const fetcher=async url=>{
    if(url.includes('/networks/base/')){const e=Error('rate');e.status=429;throw e}
    if(url.includes('geckoterminal'))return response(fakeGT(getChain(url)));
    if(url.includes('token-profiles'))return response([]);
    return response({pairs:[]});
  };
  const result=await collectSnapshot({fetcher,now});
  assert.equal(result.collection_status,'OBSERVED_OR_PARTIAL');
  assert.equal(result.coverage.find(x=>x.chain==='base'&&x.source==='GECKOTERMINAL').status,'HTTP_429_RATE_LIMIT');
  assert.equal(result.candidates.length,2);
});
test('when all providers fail the result is a fail-closed blocked observation',async()=>{
  const snapshot=await collectSnapshot({fetcher:async()=>{throw Object.assign(Error('offline'),{code:'ENOTFOUND'})},now});
  assert.equal(snapshot.collection_status,'BLOCKED_RESEARCH_DATA_ACCESS');
  assert.equal(snapshot.candidates.length,0);
  assert.equal(snapshot.paper_only,true);assert.equal(snapshot.actionable,false);
  assert.ok(snapshot.coverage.some(x=>x.status==='NETWORK_ENOTFOUND'));
});
test('DEX profile fallback includes ONLY pair-verified chain/address and marks promotional bias',async()=>{
  const fetcher=async url=>{
    if(url.includes('geckoterminal'))throw Error('unavailable');
    if(url.includes('token-profiles/latest/v1'))return response([{chainId:'base',tokenAddress:token},{chainId:'unknown',tokenAddress:token}]);
    if(url.includes('/token-pairs/v1/base/'))return response([
      {chainId:'base',baseToken:{address:token},pairAddress:pool,pairCreatedAt:1794240000000,liquidity:{usd:70000}},
      {chainId:'eth',baseToken:{address:token2},pairAddress:pool2}
    ]);
    throw Error('unexpected');
  };
  const snapshot=await collectSnapshot({fetcher,now});
  assert.equal(snapshot.candidates.length,1);
  const c=snapshot.candidates[0];
  assert.equal(c.candidate_id,'base:'+token+':'+pool);
  assert.equal(c.promotion_biased,true);
  assert.equal(c.verification,'PROVIDER_ONLY');
  assert.ok(c.unresolved_checks.includes('PAID_PROFILE_BIAS'));
  assert.equal(snapshot.collection_status,'OBSERVED_OR_PARTIAL');
});
test('identity cross-check rejects a wrong pool with same base token',async()=>{
  const fetcher=async url=>{
    if(url.includes('geckoterminal'))return response(fakeGT(getChain(url)));
    return response({pairs:[{chainId:'base',baseToken:{address:token},pairAddress:pool2}]});
  };
  const result=await collectSnapshot({fetcher,now});
  assert.equal(result.candidates.find(c=>c.chain==='base').verification,'PROVIDER_ONLY');
});
