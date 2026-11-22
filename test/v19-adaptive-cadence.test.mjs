import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceAdaptiveCadence} from '../src/v19-adaptive-cadence.mjs';
import {chooseCadence} from '../src/cadence.mjs';

const time=i=>new Date(Date.parse('2026-10-12T00:00:00.000Z')
 +i*3600000).toISOString();
const active={dataAvailable:true,newPools:82,eligible:0,
 volumeChangePct:0,openPositions:0,observed_volume_pairs:1,
 allowDownshift:false,comparableWindowComplete:false};
const quiet={dataAvailable:true,newPools:0,eligible:0,
 volumeChangePct:0,openPositions:0,observed_volume_pairs:8,
 allowDownshift:true,comparableWindowComplete:true};
test('immediate 4→24 on first real observation without awaiting a second scan',()=>{
 const r=advanceAdaptiveCadence({asOfUtc:time(0),metrics:active});
 assert.equal(r.previous_target,4);
 assert.equal(r.target,24);
 assert.equal(r.reason,'IMMEDIATE_VERIFIED_ACTIVITY_UPSHIFT');
 assert.equal(r.actual_gpt_reviews,0);
 assert.equal(r.orders_authorized,0);
});
test('two verified quiet windows per ONE step: 24→12→8→4',()=>{
 let state=advanceAdaptiveCadence({asOfUtc:time(0),metrics:active}).state;
 const targets=[];
 for(let i=1;i<=6;i++){
   const result=advanceAdaptiveCadence({asOfUtc:time(i),previous:state,metrics:quiet});
   targets.push(result.target);state=result.state;
 }
 assert.deepEqual(targets,[24,12,12,8,8,4]);
});
test('missing or partial chain coverage breaks quiet streak without downshift',()=>{
 const first=advanceAdaptiveCadence({asOfUtc:time(0),metrics:active});
 const one=advanceAdaptiveCadence({asOfUtc:time(1),metrics:quiet,previous:first.state});
 const gap=advanceAdaptiveCadence({asOfUtc:time(2),metrics:null,previous:one.state});
 assert.equal(gap.target,24);
 assert.equal(gap.state.quiet_confirmations,0);
 const partial=advanceAdaptiveCadence({asOfUtc:time(3),
   metrics:{...quiet,allowDownshift:false,comparableWindowComplete:false},
   previous:gap.state});
 assert.equal(partial.target,24);
 assert.equal(partial.state.quiet_confirmations,0);
});
test('big negative volume shock is not quiet market, no downshift',()=>{
 const r=advanceAdaptiveCadence({asOfUtc:time(0),initialTarget:24,
  metrics:{...quiet,volumeChangePct:-80}});
 assert.equal(r.target,24);
 assert.equal(r.quiet_verified,false);
});
test('duplicate time is idempotent; backwards time rejected',()=>{
 const r=advanceAdaptiveCadence({asOfUtc:time(0),metrics:quiet,initialTarget:24});
 const same=advanceAdaptiveCadence({asOfUtc:time(0),metrics:quiet,previous:r.state});
 assert.equal(same.reason,'IDEMPOTENT_ALREADY_EVALUATED');
 assert.equal(same.state.quiet_confirmations,r.state.quiet_confirmations);
 assert.throws(()=>advanceAdaptiveCadence({asOfUtc:'2026-10-11T23:00:00.000Z',
  metrics:quiet,previous:r.state}),/CADENCE_TIMESTAMP_REGRESSION/);
});
test('legacy stateless cadence remains compatible and never downshifts on partial coverage',()=>{
 assert.equal(chooseCadence({...quiet,newPools:80},4).target,24);
 assert.equal(chooseCadence({...quiet,allowDownshift:false,consecutiveQuietChecks:99},24).target,24);
});
