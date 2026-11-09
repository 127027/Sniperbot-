import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {candidateId,emptyWatchlist,validateWatchlist,mergeWatchlist,dueCandidates} from './research-watchlist.mjs';

const tok='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40),pool2='0x'+'3'.repeat(40);
const t1='2026-11-09T12:00:00Z',t2='2026-11-09T13:00:00Z',t3='2026-11-09T14:00:00Z';
const entry=(over={})=>({chain:'base',token_address:tok,pool_address:pool,
  candidate_id:candidateId('base',tok,pool),
  first_seen_at_utc:t1,last_checked_at_utc:t1,next_check_not_before_utc:t2,
  state:'NEW',priority:'NORMAL',source_urls:['https://example.com/token/1'],
  reason:'Nur Forschungsidentität, KEINE Kaufentscheidung',unresolved_checks:['SELLABILITY_UNKNOWN'],...over});

test('initial on-repo watchlist is explicitly empty, paper only, non-actionable',()=>{
  const initial=JSON.parse(readFileSync(new URL('../research/watchlist/current.json',import.meta.url),'utf8'));
  assert.deepEqual(initial,emptyWatchlist());
  validateWatchlist(initial);
  assert.equal(initial.candidates.length,0);
});
test('EVM identifiers canonicalize lowercase, two distinct pools remain distinct',()=>{
  const caps=candidateId('base',tok.toUpperCase().replace(/^0X/,'0x'),pool.toUpperCase().replace(/^0X/,'0x'));
  assert.equal(caps,'base:'+tok+':'+pool);
  assert.notEqual(caps,candidateId('base',tok,pool2));
  assert.throws(()=>candidateId('base','POPCAT',pool),/Contract/);
  assert.throws(()=>candidateId('ethereum',tok,pool),/Chain/);
});
test('watchlist merges observations while preserving first-seen and deduplicating',()=>{
  const initial=mergeWatchlist(emptyWatchlist(),[entry()],{publishedAt:t1});
  const updated=entry({first_seen_at_utc:t2,last_checked_at_utc:t2,next_check_not_before_utc:t3,
    state:'DEEP_REVIEW',priority:'HIGH',source_urls:['https://example.org/pair/2'],
    reason:'Quelle 2 bestätigt dasselbe Pair',unresolved_checks:['LP_RIGHTS_UNKNOWN']});
  const result=mergeWatchlist(initial,[updated],{publishedAt:t2});
  assert.equal(result.candidates.length,1);
  assert.equal(result.candidates[0].first_seen_at_utc,t1);
  assert.deepEqual(result.candidates[0].source_urls,['https://example.com/token/1','https://example.org/pair/2']);
  assert.equal(result.candidates[0].state,'DEEP_REVIEW');
  assert.equal(result.paper_only,true);assert.equal(result.actionable,false);
});
test('older observation cannot overwrite a newer candidate decision',()=>{
  const current=mergeWatchlist(emptyWatchlist(),[entry({last_checked_at_utc:t2,next_check_not_before_utc:t3,priority:'HIGH'})]);
  const next=mergeWatchlist(current,[entry({last_checked_at_utc:t1,priority:'LOW'})]);
  assert.equal(next.candidates[0].priority,'HIGH');
});
test('rejected/archived candidates are not accidentally resurrected',()=>{
  const rejected=mergeWatchlist(emptyWatchlist(),[entry({state:'REJECTED'})]);
  assert.throws(()=>mergeWatchlist(rejected,[entry({state:'WATCH',last_checked_at_utc:t2})]),/nicht automatisch/);
  const archived=mergeWatchlist(emptyWatchlist(),[entry({state:'ARCHIVED'})]);
  assert.throws(()=>mergeWatchlist(archived,[entry({state:'DEEP_REVIEW',last_checked_at_utc:t2})]),/nicht automatisch/);
});
test('priority and schedule determine due order, exclude rejected and future items',()=>{
  const w=mergeWatchlist(emptyWatchlist(),[
    entry({priority:'LOW',next_check_not_before_utc:t1}),
    entry({candidate_id:candidateId('base',tok,pool2),pool_address:pool2,priority:'HIGH',next_check_not_before_utc:t2,
      source_urls:['https://example.net/pair/3']})
  ]);
  assert.equal(dueCandidates(w,{now:t1}).length,1);
  const both=dueCandidates(w,{now:t2});
  assert.equal(both.length,2);assert.equal(both[0].priority,'HIGH');
  assert.equal(dueCandidates(w,{now:t2,limit:1}).length,1);
});
test('fails closed on invalid schema, unknown trade fields, duplicate IDs or fake URLs',()=>{
  const w=mergeWatchlist(emptyWatchlist(),[entry()]);
  for(const altered of [
    {...w,actionable:true},
    {...w,signature:'not a key'},
    {...w,candidates:[w.candidates[0],w.candidates[0]]},
    {...w,candidates:[{...w.candidates[0],eur:1000}]},
    {...w,candidates:[{...w.candidates[0],source_urls:['http://localhost/private']}]},
    {...w,candidates:[{...w.candidates[0],state:'PAPER_ELIGIBLE'}]}
  ])assert.throws(()=>validateWatchlist(altered));
  assert.throws(()=>mergeWatchlist(w,[entry(),entry()]),/Doppelte/);
});
