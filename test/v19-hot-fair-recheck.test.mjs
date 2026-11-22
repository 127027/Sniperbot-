import test from 'node:test';
import assert from 'node:assert/strict';
import {planHotFairRechecks} from '../src/v19-hot-fair-recheck.mjs';
import {decodeGeckoNewPools} from '../src/live-pool-discovery.mjs';
import {readFile} from 'node:fs/promises';

const at='2026-11-22T09:00:00.000Z',token='0x'+'a'.repeat(40);
const pool=n=>'0x'+n.toString(16).padStart(40,'0');
const fresh=(n,volume=100,liquidity=7000)=>({
 chain:'base',pool:pool(n),contract:token,symbol:'COIN'+n,
 observed_at_utc:'2026-11-22T08:59:00.000Z',
 pool_created_at_utc:'2026-11-22T07:00:00.000Z',
 observed_price_usd:.001,volume_24h_usd:volume,liquidity_usd:liquidity
});
const fair=n=>({chain:'base',pool:pool(n),contract:token,symbol:'OLD'+n});
test('every new pool is scored; budget 8 allocates 4 hot and 4 fair, with explicit deferred backlog',()=>{
 const current=Array.from({length:20},(_,i)=>fresh(i+1,100*(i+1),7000+1000*(i+1)));
 const old=Array.from({length:6},(_,i)=>fair(i+100));
 const before=structuredClone(current);
 const p=planHotFairRechecks({asOfUtc:at,freshCandidates:current,
  fairCandidates:old,maxChecks:8});
 assert.equal(p.all_new_pool_count,20);
 assert.equal(p.selected_count,8);
 assert.equal(p.hot_selected,4);
 assert.equal(p.fair_selected,4);
 assert.equal(p.deferred_new_pool_count,16);
 assert.equal(p.deferred_new_pool_keys.length,16);
 assert.equal(p.selected[0].pool,pool(20));
 assert.deepEqual(current,before);
 assert.equal(p.trade_authorized,false);
 assert.equal(p.priority_uses_future_winners,false);
});
test('one available API crosscheck alternates hot and fair across hourly rounds',()=>{
 const args={asOfUtc:at,freshCandidates:[fresh(1)],fairCandidates:[fair(99)],maxChecks:1};
 const even=planHotFairRechecks({...args,round:2});
 const odd=planHotFairRechecks({...args,round:3});
 assert.equal(even.selected[0].queue,'HOT_CURRENT_CAPTURE');
 assert.equal(odd.selected[0].queue,'PERSISTENT_FAIR_RECHECK');
});
test('future observations and retro labels never score as early discoveries',()=>{
 const future={...fresh(1),observed_at_utc:'2026-11-22T10:00:00.000Z'};
 const winner={...fresh(2),reported_gain_pct:50000};
 const r=planHotFairRechecks({asOfUtc:at,freshCandidates:[future,winner,fresh(3)],maxChecks:3});
 assert.equal(r.all_new_pool_count,1);
 assert.equal(r.excluded.length,2);
 assert.equal(r.selected[0].pool,pool(3));
});
test('chain+pool deduplicates identical sources without discarding different pools',()=>{
 const a=fresh(1),b=fresh(2),c={...fresh(1),volume_24h_usd:5000};
 const p=planHotFairRechecks({asOfUtc:at,
  freshCandidates:[a,b,c],fairCandidates:[fair(1)],maxChecks:4});
 assert.equal(p.all_new_pool_count,2);
 assert.equal(new Set(p.selected.map(x=>x.key)).size,p.selected.length);
 assert.equal(p.selected_count,2);
});
test('unknown contract is retained for DEX-only identification, but never authorized to buy',()=>{
 const unknown={...fresh(1),contract:null};
 const r=planHotFairRechecks({asOfUtc:at,freshCandidates:[unknown],maxChecks:2});
 assert.equal(r.all_new_pool_count,1);
 assert.equal(r.selected[0].contract,null);
 assert.equal(r.trade_authorized,false);
});

test('original archived 20-pool Base page 3 is wholly considered, including 11 V4 IDs',async()=>{
 const body=JSON.parse(await readFile(new URL(
  '../research/feeds/2026-11-22/44997708364/gecko-base-page3.raw.json',
  import.meta.url),'utf8'));
 const decoded=decodeGeckoNewPools({network:'base',response:body,
  capturedAtUtc:'2026-11-22T07:19:41.241Z',page:3});
 const selected=planHotFairRechecks({asOfUtc:'2026-11-22T07:20:00.000Z',
  freshCandidates:decoded.candidates,maxChecks:8});
 assert.equal(decoded.candidates.length,20);
 assert.equal(decoded.candidates.filter(x=>x.pool_kind==='UNISWAP_V4_POOL_ID').length,11);
 assert.equal(selected.all_new_pool_count,20);
 assert.equal(selected.selected_count,8);
 assert.equal(selected.deferred_new_pool_count,12);
 assert.equal(selected.selected_count+selected.deferred_new_pool_count,20);
 assert.equal(selected.trade_authorized,false);
});

test('two DEX slots rotate FAIR and genuine evidence repair while HOT still discovers new coins',()=>{
 const hot=[fresh(1,1000),fresh(2,900)],older=[fair(101),fair(102)];
 const repair={...fresh(88),queue:'EVIDENCE_REPAIR',urgency:2,
  repair_reason:'WATCH_PRICE_OBSERVATION_GAP',
  risk_eligible:false,trade_authorized:false,last_capture_age_minutes:12};
 const common={asOfUtc:at,freshCandidates:hot,fairCandidates:older,
  repairCandidates:[repair],maxChecks:2};
 const even=planHotFairRechecks({...common,round:2});
 const odd=planHotFairRechecks({...common,round:3});
 assert.equal(even.selected_count,2);
 assert.equal(odd.selected_count,2);
 assert.equal(even.hot_selected,1);
 assert.equal(odd.hot_selected,1);
 assert.equal(even.fair_selected,1);
 assert.equal(even.repair_selected,0);
 assert.equal(odd.repair_selected,1);
 assert.equal(odd.fair_selected,0);
 assert.equal(odd.trade_authorized,false);
});
test('four slots reserve HOT, FAIR and repair with preserved deduplication',()=>{
 const repair={...fresh(88),queue:'EVIDENCE_REPAIR',urgency:2,
  risk_eligible:false,trade_authorized:false,last_capture_age_minutes:8};
 const result=planHotFairRechecks({asOfUtc:at,maxChecks:4,
  freshCandidates:[fresh(1),fresh(2),fresh(3)],fairCandidates:[fair(101)],
  repairCandidates:[repair],round:6});
 assert.equal(result.hot_selected,2);
 assert.equal(result.fair_selected,1);
 assert.equal(result.repair_selected,1);
 assert.equal(result.all_evidence_repair_count,1);
 assert.equal(result.deferred_repair_pool_count,0);
 assert.equal(new Set(result.selected.map(x=>x.key)).size,4);
});
test('when there is no FAIR backlog, available slots still serve price repairs',()=>{
 const repair={...fresh(88),queue:'EVIDENCE_REPAIR',urgency:2,
  risk_eligible:false,trade_authorized:false,last_capture_age_minutes:8};
 const result=planHotFairRechecks({asOfUtc:at,maxChecks:4,
  freshCandidates:[fresh(1),fresh(2),fresh(3),fresh(4)],
  repairCandidates:[repair]});
 assert.equal(result.hot_selected,2);
 assert.equal(result.repair_selected,1);
 assert.equal(result.selected_count,4);
 assert.equal(result.trade_authorized,false);
});
test('invalid winner-oracle and authorization claims cannot enter price-repair queue',()=>{
 const base={...fresh(88),queue:'EVIDENCE_REPAIR',urgency:2,
  risk_eligible:false,trade_authorized:false,last_capture_age_minutes:8};
 const result=planHotFairRechecks({asOfUtc:at,maxChecks:5,repairCandidates:[
  {...base,future_winner_label:'WINNER'},
  {...base,trade_authorized:true},
  {...base,risk_eligible:true},
  {...base,observed_at_utc:'2026-11-23T00:00:00Z'},
  base
 ]});
 assert.equal(result.all_evidence_repair_count,1);
 assert.equal(result.selected_count,1);
 assert.equal(result.repair_selected,1);
});
