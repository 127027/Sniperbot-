import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchResearchNetwork,RESEARCH_ROLES} from './research-network.mjs';
const now=Date.parse('2026-11-09T20:30:00Z');
const published=new Date(now-60000).toISOString();
function fixture(role){
 if(role==='watchlist')return {schema:'research_watchlist.v1',published_at_utc:published,
  paper_only:true,actionable:false,candidates:Array.from({length:9},()=>({state:'DEEP_REVIEW'}))};
 return {schema:'research_role_snapshot.v1',role,published_at_utc:published,paper_only:true,
  actionable:false,candidates:[],status:'NO_VERIFIED_CANDIDATE'};
}
function mock(overrides={}){
 return async url=>{
  const role=url.includes('watchlist')?'watchlist':RESEARCH_ROLES.find(r=>url.includes('/'+r+'/'));
  return new Response(JSON.stringify(overrides[role]||fixture(role)),{status:200});
 };
}
test('five fresh GitHub roles and 9 watchlist candidates are visible but not executable',async()=>{
 const n=await fetchResearchNetwork({fetcher:mock(),now});
 assert.equal(n.current_roles,5);
 assert.equal(n.watchlist.candidate_count,9);
 assert.equal(n.transport,'PUBLIC_GITHUB_PULL_ONLY');
 assert.equal(n.actionable,false);
 assert.equal(n.local_execution,'BLOCKED_REAL_VALIDATOR_UNAVAILABLE');
 assert(n.roles.every(r=>r.status==='NO_VERIFIED_CANDIDATE'));
});
test('stale or invalid role reports never become confirmed current agents',async()=>{
 const n=await fetchResearchNetwork({fetcher:mock({
  news_discovery:{...fixture('news_discovery'),published_at_utc:'2026-11-09T17:00:00Z'},
  opportunity_qa:{...fixture('opportunity_qa'),actionable:true}
 }),now});
 assert.equal(n.current_roles,3);
 assert(n.roles.find(r=>r.role==='news_discovery').stale);
 assert.equal(n.roles.find(r=>r.role==='opportunity_qa').status,'UNAVAILABLE');
});
test('read access errors fail closed with no synthetic trade signal',async()=>{
 const network=await fetchResearchNetwork({fetcher:async()=>new Response('unavailable',{status:403}),now});
 assert.equal(network.current_roles,0);
 assert.equal(network.watchlist.candidate_count,null);
 assert(network.roles.every(r=>r.status==='UNAVAILABLE'));
 assert.equal(network.actionable,false);
});
