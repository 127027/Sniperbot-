import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planEvidenceRepairRechecks} from '../src/v19-evidence-repair-queue.mjs';
import {scoreAsOf} from '../src/forward-learning.mjs';
const t='2026-11-22T15:20:00.000Z',pool=n=>'0x'+n.toString(16).padStart(40,'0');
const key=n=>'base:'+pool(n);
const mem=()=>({kind:'R29_PERSISTENT_MARKET_MEMORY',pools:Object.fromEntries([1,2,3,4].map(n=>
 [key(n),{chain:'base',pool:pool(n),first_seen_at_utc:'2026-11-22T14:50:00Z'}])),rechecks:{}});
const item=(n,status,at='2026-11-22T15:11:00Z')=>({key:key(n),
 chain:'base',pool:pool(n),contract:pool(100+n),symbol:'TOK',status,
 last_capture_at_utc:at});
const rank=(items)=>({kind:'R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING',
 as_of_utc:t,candidates:items});
test('single-sample and long-gap WATCHs receive real recheck proposals but no orders',()=>{
 const r=planEvidenceRepairRechecks({ranking:rank([
  item(1,'WATCH_INSUFFICIENT_REPEATED_EVIDENCE'),
  item(2,'WATCH_PRICE_OBSERVATION_GAP'),
  item(3,'RESEARCH_PRIORITY_ONLY_NOT_RISK_APPROVED')
 ]),memory:mem(),asOfUtc:t});
 assert.deepEqual(r.selected.map(x=>x.key),[key(2),key(1)]);
 assert.equal(r.all_due_candidates,2);
 assert.ok(r.selected.every(x=>x.trade_authorized===false));
 assert.equal(r.actual_requests,0);
 assert.equal(r.actual_gpt_reviews,0);
 assert.equal(r.paper_orders_authorized,0);
});
test('five-minute separation and 120-minute freshness bound prevent fake momentum',()=>{
 const r=planEvidenceRepairRechecks({ranking:rank([
  item(1,'WATCH_INSUFFICIENT_REPEATED_EVIDENCE','2026-11-22T15:17:00Z'),
  item(2,'WATCH_PRICE_OBSERVATION_GAP','2026-11-22T13:00:00Z'),
  item(3,'WATCH_PRICE_OBSERVATION_GAP','2026-11-22T15:11:00Z')
 ]),memory:mem(),asOfUtc:t});
 assert.deepEqual(r.selected.map(x=>x.key),[key(3)]);
 assert.equal(r.skipped.not_due,1);
 assert.equal(r.skipped.stale,1);
});
test('a new recent attempt cannot consume the same provider pair slot again',()=>{
 const m=mem();m.rechecks[key(1)]={attempt_at_utc:'2026-11-22T15:18:00Z'};
 const r=planEvidenceRepairRechecks({ranking:rank([
  item(1,'WATCH_PRICE_OBSERVATION_GAP'),
  item(2,'WATCH_INSUFFICIENT_REPEATED_EVIDENCE')
 ]),memory:m,asOfUtc:t});
 assert.deepEqual(r.selected.map(x=>x.key),[key(2)]);
 assert.equal(r.skipped.recent_attempt,1);
});
test('future timestamps, missing memory and retro winner features cannot be promoted',()=>{
 const inputs=[{...item(1,'WATCH_PRICE_OBSERVATION_GAP'),reported_gain_pct:6000},
  item(2,'WATCH_PRICE_OBSERVATION_GAP','2026-11-22T16:00:00Z'),
  item(4,'WATCH_PRICE_OBSERVATION_GAP'),
  item(99,'WATCH_PRICE_OBSERVATION_GAP')];
 const m=mem();m.pools[key(4)].first_seen_at_utc='2026-11-22T16:00:00Z';
 const r=planEvidenceRepairRechecks({ranking:rank(inputs),memory:m,asOfUtc:t});
 assert.equal(r.all_due_candidates,0);
 assert.equal(r.skipped.oracle,1);
 assert.equal(r.skipped.future,2);
 assert.equal(r.skipped.not_in_memory,1);
});
test('real archived Nov observation batch creates due forward-only repairs after five minutes',async()=>{
 const [batch,memory]=await Promise.all([
  readFile('research/observations/2026-11-22/45036887325.json','utf8'),
  readFile('research/state/market-memory.json','utf8')
 ]);
 const asOfUtc='2026-11-22T15:19:00.000Z';
 const ranking=scoreAsOf({batches:[JSON.parse(batch)],asOfUtc,maxCandidates:100000});
 const q=planEvidenceRepairRechecks({ranking,memory:JSON.parse(memory),asOfUtc,maxCandidates:20});
 assert.ok(ranking.counts.observed_unique_pools>=99);
 assert.ok(q.all_due_candidates>0);
 assert.equal(q.selected.length,20);
 assert.ok(q.selected.every(x=>Date.parse(x.last_capture_at_utc)<Date.parse(asOfUtc)));
 assert.ok(q.selected.every(x=>x.queue==='EVIDENCE_REPAIR'));
 assert.equal(q.paper_orders_authorized,0);
});

test('persistent last-attempt cursor prevents a repeatedly failing repair from starving unseen pools',()=>{
 const m=mem();
 m.rechecks[key(1)]={attempt_at_utc:'2026-11-22T15:00:00Z',status:'DEX_ERROR'};
 const ranking=rank([item(1,'WATCH_PRICE_OBSERVATION_GAP'),
  item(2,'WATCH_INSUFFICIENT_REPEATED_EVIDENCE'),
  item(3,'WATCH_INSUFFICIENT_REPEATED_EVIDENCE')]);
 const first=planEvidenceRepairRechecks({ranking,memory:m,asOfUtc:t,maxCandidates:1});
 assert.equal(first.selected[0].key,key(2));
 assert.equal(first.deferred_count,2);
 // A completed (even failed) genuine attempt advances the existing cursor.
 m.rechecks[key(2)]={attempt_at_utc:'2026-11-22T15:10:00Z',status:'DEX_ERROR'};
 const second=planEvidenceRepairRechecks({ranking,memory:m,asOfUtc:t,maxCandidates:1});
 assert.equal(second.selected[0].key,key(3));
 assert.equal(second.paper_orders_authorized,0);
});


test('real archived EHUNT 0.0005 USD liquidity is deferred behind higher-quality price repairs',async()=>{
 const {readFile}=await import('node:fs/promises');
 const original=JSON.parse(await readFile('research/observations/2026-11-22/45036887325.json','utf8'));
 const memory=JSON.parse(await readFile('research/state/market-memory.json','utf8'));
 const asOfUtc='2026-11-22T16:10:00.000Z';
 const ranking=scoreAsOf({batches:[original],asOfUtc,maxCandidates:100000});
 const full=planEvidenceRepairRechecks({ranking,memory,asOfUtc,maxCandidates:1000});
 const ehunt=full.selected.find(x=>x.symbol==='EHUNT');
 const urps=full.selected.find(x=>x.symbol==='URPS');
 assert.ok(ehunt&&urps);
 assert.equal(ehunt.last_observed_liquidity_usd,0.0005);
 assert.equal(ehunt.liquidity_repair_priority_tier,0);
 assert.ok(urps.last_observed_liquidity_usd>5000);
 assert.equal(urps.liquidity_repair_priority_tier,3);
 assert.ok(full.selected.indexOf(urps)<full.selected.indexOf(ehunt));
 assert.ok(full.low_liquidity_watch_repair_candidates>0);
 assert.equal(full.all_due_candidates,full.selected.length);
 const bounded=planEvidenceRepairRechecks({ranking,memory,asOfUtc,maxCandidates:1});
 assert.notEqual(bounded.selected[0].symbol,'EHUNT');
 assert.ok(bounded.deferred_count>0);
 assert.equal(bounded.paper_orders_authorized,0);
});
test('never-check fairness still applies inside the same liquidity tier',()=>{
 const m=mem();
 m.rechecks[key(1)]={attempt_at_utc:'2026-11-22T15:00:00Z',status:'DEX_ERROR'};
 const ranking=rank([
  {...item(1,'WATCH_PRICE_OBSERVATION_GAP'),latest_observed_liquidity_usd:7500,research_effective_volume_24h_usd:100},
  {...item(2,'WATCH_PRICE_OBSERVATION_GAP'),latest_observed_liquidity_usd:7500,research_effective_volume_24h_usd:100}
 ]);
 const q=planEvidenceRepairRechecks({ranking,memory:m,asOfUtc:t,maxCandidates:1});
 assert.equal(q.selected[0].key,key(2));
 assert.equal(q.selected[0].liquidity_repair_priority_tier,3);
 assert.equal(q.paper_orders_authorized,0);
});
