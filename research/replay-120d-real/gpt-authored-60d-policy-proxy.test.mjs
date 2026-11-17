import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAsOfCandidate,cadence,stressNotional} from './gpt-authored-60d-policy-proxy.mjs';
const base={mint:'7xWcYfVmBwXx1vHZgN5MrdYNX3gzJ35frhqRJoGbdqyo',
 f_n_buys:100,f_rep_n:40,f_rep_rug:.05,f_dev_share:.01,f_insider_share:.01,
 flag_creator_sold:false,flag_bundle_dumped:false,flag_serial_rugger_creator:false,
 flag_pool_drained:false,flag_curve_closed_low:false,flag_migrate_below_grad:false};
test('positive early signals result in WATCH only (not BUY)',()=>{
 const x=evaluateAsOfCandidate(base);
 assert.equal(x.verdict,'WATCH_FOR_INDEPENDENT_PROOFS');
 assert.ok(x.score>70);
 assert.ok([50,250,500,1000].includes(stressNotional(base.f_n_buys,x.score)));
});
test('flagged developer or bundled dump always vetoes',()=>{
 for(const k of ['flag_creator_sold','flag_bundle_dumped','flag_serial_rugger_creator','flag_pool_drained']){
   assert.equal(evaluateAsOfCandidate({...base,[k]:true}).verdict,'RISK_REJECT');
 }
});
test('missing reputation is UNKNOWN, not treated as zero rug risk',()=>{
 assert.equal(evaluateAsOfCandidate({...base,f_rep_rug:null}).verdict,'RESEARCH_ONLY');
 assert.equal(evaluateAsOfCandidate({...base,f_rep_n:0}).verdict,'RESEARCH_ONLY');
});
test('strong trading activity never overrides insider concentration',()=>{
 assert.equal(evaluateAsOfCandidate({...base,f_n_buys:900,f_insider_share:.52}).verdict,'RISK_REJECT');
});
test('adaptive cadence chooses between 1,4,12,24 only from prior-hour sample',()=>{
 assert.deepEqual([cadence(0),cadence(2600),cadence(5000),cadence(7000)],[1,4,12,24]);
 assert.throws(()=>cadence(-1),/INVALID_HOURLY/);
});
test('research sizing has no direct 5000-USDC position on sample-only data',()=>{
 assert.equal(stressNotional(30,65),null);
 assert.equal(stressNotional(30,85),50);
});
