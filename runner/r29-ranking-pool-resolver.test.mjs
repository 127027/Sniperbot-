import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseRankingPoolSlots,resolveRankingPoolCandidates,
 RESOLVED_RANKING_SOURCE} from './r29-ranking-pool-resolver.mjs';

const at='2026-11-20T17:00:00.000Z';
const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40);
const other='0x'+'c'.repeat(40);
const lead=(addr=token,chain='bsc')=>({chain,token_address:addr,
 observed_at_utc:at,source:'SASA_PUBLIC_RANKING_RESEARCH',
 source_key:'BSC_NEW',paper_only:true,actionable:false,
 pool_address:null,candidate_id:null});
function fakes({differentPair=false,differentPrice=false,rateLimit=false}={}){
 const calls=[];
 const fetcher=async(url)=>{
  calls.push(url);
  if(rateLimit)return {ok:false,status:429};
  if(url.includes('api.dexscreener.com'))
   return {ok:true,headers:{get:()=>null},
    json:async()=>[{chainId:'bsc',baseToken:{address:token},
     pairAddress:pool,priceUsd:differentPrice?'9.8':'0.01',
     liquidity:{usd:80000}}]};
  return {ok:true,headers:{get:()=>null},json:async()=>({data:[{
   attributes:{address:differentPair?other:pool,
    pool_created_at:'2026-11-19T21:00:00.000Z',
    reserve_in_usd:'80000',base_token_price_usd:'0.01',
    volume_usd:{m5:'12000'},transactions:{m5:{buys:45,sells:22}}},
   relationships:{base_token:{data:{id:'bsc_'+token}}}
  }]})};
 };
 return {fetcher,calls};
}
test('independent provider pair-match promotes current ranking token to research pool only',async()=>{
 const mocked=fakes();
 const x=await resolveRankingPoolCandidates({leads:[lead()],now:at,fetcher:mocked.fetcher});
 assert.equal(mocked.calls.length,2);
 assert.equal(x.attempted,1);
 assert.equal(x.resolved.length,1);
 const c=x.resolved[0];
 assert.equal(c.source,RESOLVED_RANKING_SOURCE);
 assert.equal(c.candidate_id,'bsc:'+token+':'+pool);
 assert.equal(c.verification,'CROSS_PROVIDER_IDENTITY');
 assert.equal(c.price_usd,0.01);
 assert.equal(c.volume_m5_usd,12000);
 assert.equal(c.promotion_biased,false);
 assert(c.unresolved_checks.includes('SELLABILITY'));
 assert(c.unresolved_checks.includes('CONTRACT'));
 assert.equal(x.paper_only,true);
 assert.equal(x.actionable,false);
 assert.equal(Object.hasOwn(c,'paper_entry_authorized'),false);
});
test('wrong pool, divergent provider prices and 429 never invent a ranked pool',async()=>{
 for(const opts of [{differentPair:true},{differentPrice:true},{rateLimit:true}]){
  const {fetcher}=fakes(opts);
  const x=await resolveRankingPoolCandidates({leads:[lead()],now:at,fetcher});
  assert.equal(x.attempted,1);
  assert.equal(x.resolved.length,0);
  assert.equal(x.checks.length,1);
 }
});
test('stale, unsupported and already captured ranked token cannot consume another probe',()=>{
 const old={...lead(),observed_at_utc:'2026-11-20T15:00:00.000Z'};
 const unsupported=lead(other,'robinhood');
 const existing={chain:'bsc',token_address:token,pool_address:pool};
 assert.deepEqual(chooseRankingPoolSlots([old,unsupported],[existing],{now:at}),[]);
 assert.deepEqual(chooseRankingPoolSlots([lead()],[existing],{now:at}),[]);
 assert.throws(()=>chooseRankingPoolSlots([lead()],[],{now:at,limit:10}));
});
test('invalid future observed timestamp cannot seed a lookahead candidate',async()=>{
 const future={...lead(),observed_at_utc:'2026-11-20T19:00:00.000Z'};
 const {fetcher,calls}=fakes();
 const x=await resolveRankingPoolCandidates({leads:[future],now:at,fetcher});
 assert.equal(x.resolved.length,0);
 assert.equal(calls.length,0);
});
test('two-token cap is preserved with many simultaneous chain leads',()=>{
 const items=Array.from({length:40},(_,i)=>{
  const hex=i.toString(16).padStart(40,'0');
  return lead('0x'+hex,i%2===0?'bsc':'base');
 });
 const a=chooseRankingPoolSlots(items,[],{now:at,limit:2});
 const b=chooseRankingPoolSlots(items,[],{now:at,limit:2});
 assert.equal(a.length,2);
 assert.deepEqual(a,b);
});
