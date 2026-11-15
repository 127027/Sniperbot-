import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {planAdaptiveReview,buildAdaptiveReview} from './dynamic-research-scheduler.mjs';
import {RESEARCH_HORIZONS,advanceResearchObservations,
  updateResearchOutcomes} from './dynamic-research-outcomes.mjs';
const now=Date.parse('2026-11-15T10:00:00.000Z');
const iso=n=>new Date(n).toISOString();
const id='base:0x'+'1'.repeat(40)+':0x'+'2'.repeat(40);
const candidate={candidate_id:id,chain:'base',
 token_address:'0x'+'1'.repeat(40),pool_address:'0x'+'2'.repeat(40),
 price_usd:1,liquidity_usd:120000,volume_m5_usd:15000,
 pool_created_at_utc:iso(now-60_000),
 promotion_biased:false};
function market(at,candidates=[candidate]){
 return {schema:'research_market_snapshot.v1',paper_only:true,
  actionable:false,collection_status:'OBSERVED_OR_PARTIAL',
  published_at_utc:iso(at),candidates};
}
const initial=market(now);
const review=buildAdaptiveReview(initial,planAdaptiveReview(initial));
test('prospective outcomes record observed same-pool prices, NOT executable gains',()=>{
 const a=advanceResearchObservations(initial,undefined,{review});
 assert.equal(a.changed,true);
 assert.equal(a.state.active.length,1);
 assert.equal(a.state.active[0].selection,'MARKET_ACTIVITY_SAMPLE');
 const b=advanceResearchObservations(market(now+3600000,[{...candidate,price_usd:2}]),a.state);
 assert.equal(b.state.active.length,1);
 assert.equal(b.state.active[0].marks['1h'].indicative_ratio,2);
 assert.equal(b.state.active[0].marks['1h'].status,'INDICATIVE_SAME_POOL_PRICE_OBSERVED');
 assert.equal(b.state.active[0].marks['6h'].status,'PENDING');
 assert.equal(b.state.active[0].marks['30d'].status,'PENDING');
 const unrelated={...candidate,candidate_id:'base:other-token:other-pool',price_usd:9999};
 const c=advanceResearchObservations(market(now+6*3600000,[unrelated]),b.state);
 assert.equal(c.state.active[0].marks['6h'].status,'PENDING');
 const d=advanceResearchObservations(market(now+7*3600000+1,[]),c.state);
 assert.equal(d.state.active[0].marks['6h'].status,'UNKNOWN_NO_MATCHING_QUOTE_IN_WINDOW');
 const e=advanceResearchObservations(market(now+31*24*3600000,[]),d.state);
 assert.equal(e.completed.length,1);
 assert.equal(e.state.active.length,0);
 assert.equal(e.state.completed_count,1);
 assert.equal(e.completed[0].marks['24h'].indicative_ratio,null);
 assert.equal(e.completed[0].marks['30d'].status,'UNKNOWN_NO_MATCHING_QUOTE_IN_WINDOW');
});
test('immutable completed 30d outcome, restart-safe and no private trading ledger access',async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),'r29-forward-outcome-'));
 try{
  const a=await updateResearchOutcomes(initial,{folder,review});
  assert.equal(a.changed,true);
  assert.equal(a.active,1);
  const b=await updateResearchOutcomes(initial,{folder});
  assert.equal(b.changed,false);
  const c=await updateResearchOutcomes(market(now+31*24*3600000,[]),{folder});
  assert.equal(c.completed,1);
  const records=await readdir(path.join(folder,'outcomes','completed'));
  assert.equal(records.length,1);
  const record=JSON.parse(await readFile(path.join(folder,'outcomes','completed',records[0]),'utf8'));
  assert.equal(record.realized_pnl,null);
  assert.equal(record.executed_fills,0);
  assert.equal(record.complete_price_history,false);
  assert.equal(record.outcome.marks['14d'].status,'UNKNOWN_NO_MATCHING_QUOTE_IN_WINDOW');
  const d=await updateResearchOutcomes(market(now+31*24*3600000,[]),{folder});
  assert.equal(d.completed,0);
  assert.equal((await readdir(path.join(folder,'outcomes','completed'))).length,1);
 }finally{await rm(folder,{recursive:true,force:true});}
});
test('no future label enters an earlier time, no trade authority, invalid source rejected',()=>{
 const a=advanceResearchObservations(initial,undefined,{review});
 assert.throws(()=>advanceResearchObservations(market(now-60000,[]),a.state),
  /CLOCK_BACKWARDS/);
 assert.throws(()=>advanceResearchObservations({...initial,actionable:true}),
  /UNTRUSTED_MARKET/);
 assert.equal(RESEARCH_HORIZONS.length,6);
 assert.equal(RESEARCH_HORIZONS.at(-1).label,'30d');
 const item=a.state.active[0];
 assert(!JSON.stringify(item).includes('buy_order'));
});
