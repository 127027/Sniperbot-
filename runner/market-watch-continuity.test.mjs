import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMarketWatch,updateMarketWatch,publicMarketWatch} from './market-watch-continuity.mjs';
import {assertResearch} from './research-market-publisher.mjs';
import {canonicalPublicMarketProjection} from './r29-canonical-market-relay.mjs';

const token='0x'+'a'.repeat(40),poolA='0x'+'b'.repeat(40),
 poolB='0x'+'c'.repeat(40),poolC='0x'+'d'.repeat(40);
const t0='2026-11-19T10:00:00.000Z';
const ts=n=>new Date(Date.parse(t0)+n*60_000).toISOString();
const candidate=(pool,seen,volume=1500)=>({
 chain:'base',token_address:token,pool_address:pool,
 candidate_id:'base:'+token+':'+pool,observed_at_utc:seen,
 pool_created_at_utc:ts(0),price_usd:0.02,liquidity_usd:90000,
 volume_m5_usd:volume,buys_m5:20,sells_m5:4,
 source:'GECKOTERMINAL_NEW_POOLS',verification:'CROSS_PROVIDER_IDENTITY',
 promotion_biased:false,
 source_urls:['https://api.geckoterminal.com/api/v2/networks/base/new_pools?page=1'],
 unresolved_checks:['CONTRACT','SELLABILITY']
});
const snapshot=(when,items)=>({schema:'research_market_snapshot.v1',paper_only:true,
 actionable:false,collection_status:'OBSERVED_OR_PARTIAL',
 producer:'Local read-only research market collector',
 published_at_utc:when,candidates:items,coverage:[],summary:{identities:items.length}});
test('V5.6 read-only watch continuity retains vanished pool, exact token/pool and first seen timestamp',()=>{
 const a=updateMarketWatch(emptyMarketWatch(),snapshot(ts(0),[
  candidate(poolA,ts(0)),candidate(poolB,ts(0),3500)]),{now:Date.parse(ts(0))});
 assert.equal(a.admitted,2);
 const b=updateMarketWatch(a.state,snapshot(ts(2),[
  candidate(poolB,ts(2),9000),candidate(poolC,ts(2),3000)]),{now:Date.parse(ts(2))});
 assert.equal(b.refreshed,1);assert.equal(b.admitted,1);
 assert.equal(b.retained_absent,1);
 const watch=publicMarketWatch(b.state,{now:Date.parse(ts(2))});
 assert.equal(watch.length,3);
 const vanished=watch.find(x=>x.pool_address===poolA);
 assert.equal(vanished.last_seen_at_utc,ts(0));
 assert.equal(vanished.first_seen_at_utc,ts(0));
 assert.equal(vanished.observation_count,1);
 assert.equal(vanished.paper_entry_authorized,false);
 assert.equal(vanished.research_status,'SCOUT_WATCH_NOT_GPT_DECISION');
 const changed=watch.find(x=>x.pool_address===poolB);
 assert.equal(changed.last_seen_at_utc,ts(2));
 assert.equal(changed.observation_count,2);
 assert.equal(changed.last_indicative_volume_m5_usd,9000);
 const withWatch={...snapshot(ts(2),[candidate(poolB,ts(2))]),
  watch_candidates:watch};
 assert.doesNotThrow(()=>assertResearch(withWatch));
 const published=canonicalPublicMarketProjection(withWatch,{now:Date.parse(ts(2))});
 assert.equal(published.watch_candidates.length,3);
 assert.equal(published.watch_candidates.find(x=>x.pool_address===poolA).last_seen_at_utc,ts(0));
 assert.equal(published.actionable,false);
 assert.equal(published.watch_candidates.every(x=>x.paper_entry_authorized===false),true);
});
test('same token with different pool remains different candidate, stale observation not refreshed',()=>{
 const first=updateMarketWatch(emptyMarketWatch(),snapshot(ts(0),[
  candidate(poolA,ts(0)),candidate(poolB,ts(0))]),{now:Date.parse(ts(0))});
 const duplicate=updateMarketWatch(first.state,snapshot(ts(2),[
  candidate(poolA,ts(0)),candidate(poolA,ts(0))]),{now:Date.parse(ts(2))});
 assert.equal(duplicate.refreshed,0);
 assert.equal(duplicate.state.records.length,2);
 assert.equal(duplicate.state.records.find(x=>x.pool_address===poolA).observation_count,1);
 assert.notEqual(duplicate.state.records[0].candidate_id,duplicate.state.records[1].candidate_id);
});
test('research-only schema forbids BUY authority, forged timestamps, balances and unsafe watch state',()=>{
 const fresh=updateMarketWatch(emptyMarketWatch(),snapshot(ts(0),[candidate(poolA,ts(0))]),
  {now:Date.parse(ts(0))});
 const data=publicMarketWatch(fresh.state,{now:Date.parse(ts(0))});
 const s={...snapshot(ts(0),[candidate(poolA,ts(0))]),watch_candidates:data};
 assert.doesNotThrow(()=>assertResearch(s));
 assert.throws(()=>assertResearch({...s,watch_candidates:[{...data[0],
  paper_entry_authorized:true}]}),/Unsafe/);
 assert.throws(()=>assertResearch({...s,watch_candidates:[{...data[0],
  available_cash_test_usdc:5000}]}),/Unsafe/);
 assert.throws(()=>assertResearch({...s,watch_candidates:[{...data[0],
  last_seen_at_utc:ts(10)}]}),/Unsafe/);
 assert.throws(()=>assertResearch({...s,watch_candidates:[data[0],data[0]]}),/Unsafe/);
 assert.throws(()=>updateMarketWatch({...fresh.state,paper_only:false},
  snapshot(ts(2),[]),{now:Date.parse(ts(2))}),/INVALID/);
 const old=publicMarketWatch(fresh.state,{now:Date.parse(ts(0))+24*3600_000+1});
 assert.deepEqual(old,[],'no stale WATCH can silently be refreshed');
});
test('invalid new observations do not overwrite already-validated earlier pool history',()=>{
 const a=updateMarketWatch(emptyMarketWatch(),
  snapshot(ts(0),[candidate(poolA,ts(0))]),{now:Date.parse(ts(0))});
 const wrong={...candidate(poolA,ts(2)),candidate_id:'base:'+token+':'+poolB};
 const b=updateMarketWatch(a.state,snapshot(ts(2),[wrong]),{now:Date.parse(ts(2))});
 assert.equal(b.ignored,1);
 assert.equal(b.state.records[0].last_seen_at_utc,ts(0));
});
