import test from 'node:test';
import assert from 'node:assert/strict';
import {Scanner,extract,upsert,nextBatch,prune,normalize,TTL,sources} from './scanner.mjs';
const a='A'.repeat(32), b='B'.repeat(32), p='C'.repeat(32);
const t=1795876980000;
const lead=(address,kind='new_pool')=>({address,kind,source:'fixture'});
const pair={chainId:'solana',baseToken:{address:a,symbol:'FIXTURE'},pairAddress:p,priceUsd:'0.01',liquidity:{usd:null}};
test('first observation persists, promotion labeled, case sensitive',()=>{
  const u=new Map(); upsert(u,lead(a),t);upsert(u,lead(a,'boost'),t+1000);upsert(u,lead(a.toLowerCase()),t+1000);
  assert.equal(u.get(a).first_seen,t);assert.equal(u.get(a).promoted,true);assert.equal(u.size,2);
});
test('rotation prioritizes unattempted; age from last actual sighting',()=>{
  const u=new Map();upsert(u,lead(a),t);upsert(u,lead(b),t+1);u.get(a).last_attempt=t+2;
  assert.equal(nextBatch(u,1)[0].address,b);prune(u,t+TTL+1);assert.equal(u.has(a),false);assert.equal(u.has(b),true);
});
test('pool extraction uses base token not pool ID',()=>{
  const j={data:[{id:'solana_'+p,relationships:{base_token:{data:{id:'solana_'+a}}}}]};
  assert.deepEqual(extract(j,sources[0]).map(x=>x.address),[a]);
  assert.equal(normalize(b,[pair],t),null);assert.equal(normalize(a,[pair],t).liquidity_usd,null);
});
test('full discovery to exact quote observation, no trading approval',async()=>{
  const f=async url=>({ok:true,status:200,json:async()=>url.includes('geckoterminal')?
    {data:[{relationships:{base_token:{data:{id:'solana_'+a}}}}]}:url.includes('/tokens/v1/')?[pair]:[]});
  const s=new Scanner({fetcher:f,clock:()=>t});const r=await s.cycle();
  assert.equal(r.coverage.identities,1);assert.equal(r.coverage.fresh_market,1);
  assert.equal(r.candidates[0].market.risk,'UNKNOWN');assert.equal(r.candidates[0].market.sellability,'UNKNOWN');
});
test('429 backoff, keep last data but mark stale after failure',async()=>{
  let fail=false,now=t;
  const f=async url=>url.includes('/tokens/v1/')&&fail?{ok:false,status:429,headers:{get:()=> '120'}}:
    {ok:true,status:200,json:async()=>url.includes('geckoterminal')?
    {data:[{relationships:{base_token:{data:{id:'solana_'+a}}}}]}:url.includes('/tokens/v1/')?[pair]:[]};
  const s=new Scanner({fetcher:f,clock:()=>now});await s.cycle();fail=true;now+=60000;
  const r=await s.cycle();assert.equal(r.candidates[0].market.price_usd,0.01);
  assert.equal(r.candidates[0].market_stale,true);assert.equal(r.backoff['api.dexscreener.com'],now+120000);
});

test('fresh Dot discoveries have bounded priority without starving rotation',()=>{
 const u=new Map();upsert(u,lead(a),t);upsert(u,lead(b),t+1);u.get(b).dot_priority_until=t+100000;
 assert.equal(nextBatch(u,3,t)[0].address,b);assert.equal(nextBatch(u,3,t).length,2);
});
