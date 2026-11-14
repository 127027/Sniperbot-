import test from 'node:test';
import assert from 'node:assert/strict';
import {collectNarrativeLeads} from './research-narrative-radar.mjs';
const token='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40);
const now='2026-11-10T08:35:00Z';
const pools=[{chain:'base',token_address:token,pool_address:pool,
 candidate_id:'base:'+token+':'+pool}];
function fetcher({noMeta=false,invalid=false,unknown=false}={}){
 const called=[];
 return {called,fn:async url=>{
  called.push(url);
  if(unknown)throw Error('SOURCE_NOT_REACHABLE');
  const item={chainId:'base',tokenAddress:invalid?'0xnope':token,
    url:'https://dexscreener.com/base/'+pool};
  let rows=url.includes('token-profiles')?[item]:
   url.includes('community-takeovers')?(!noMeta?[item]:[]):
   url.includes('token-boosts')?[{...item,amount:500}]:[];
  return {ok:true,headers:{get:()=>null},json:async()=>rows};
 }};
}
test('all three non-price metadata streams combine exact matched chain/token without claiming social virality',async()=>{
 const f=fetcher();
 const d=await collectNarrativeLeads({fetcher:f.fn,now,pools});
 assert.equal(f.called.length,3);
 assert.equal(d.leads.length,1);
 assert.equal(d.leads[0].candidate_id,pools[0].candidate_id);
 assert.deepEqual(d.leads[0].signal_categories,[
  'NEW_TOKEN_PROFILE','COMMUNITY_TAKEOVER_UNVERIFIED','PAID_BOOST']);
 assert.equal(d.leads[0].paid_promotion_seen,true);
 assert.equal(d.leads[0].organic_social_verified,false);
 assert.equal(d.leads[0].probability_pct,null);
 assert.equal(d.leads[0].paper_only,true);
 assert.equal(d.leads[0].actionable,false);
 assert(!Object.hasOwn(d.leads[0],'buy'));
 assert(!Object.hasOwn(d.leads[0],'score'));
});
test('unmatched viral token is a lead with no fabricated pool ID and no automatic BUY',async()=>{
 const f=fetcher();
 const d=await collectNarrativeLeads({fetcher:f.fn,now,pools:[]});
 assert.equal(d.leads[0].candidate_id,null);
 assert.equal(d.leads[0].pool_address,null);
 assert.equal(d.leads[0].claim_status,'UNVERIFIED_COIN_OR_NARRATIVE');
 assert.equal(d.actionable,false);
});
test('invalid address and unavailable APIs do not generate imaginary leads',async()=>{
 let d=await collectNarrativeLeads({fetcher:fetcher({invalid:true}).fn,now,pools});
 assert.equal(d.leads.length,0);
 d=await collectNarrativeLeads({fetcher:fetcher({unknown:true}).fn,now,pools});
 assert.equal(d.leads.length,0);
 assert(d.coverage.every(x=>x.status==='SOURCE_UNAVAILABLE'));
});
test('different coin on another chain does not inherit matched Base pool',async()=>{
 const f=async url=>({ok:true,headers:{get:()=>null},
  json:async()=>url.includes('boosts')?[{chainId:'ethereum',tokenAddress:token}]:[]});
 const d=await collectNarrativeLeads({fetcher:f,now,pools});
 assert.equal(d.leads.length,1);
 assert.equal(d.leads[0].chain,'eth');
 assert.equal(d.leads[0].candidate_id,null);
});
