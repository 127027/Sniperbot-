import test from 'node:test';
import assert from 'node:assert/strict';
import {measureDot1Activity} from '../src/v19-market-activity.mjs';
import {chooseCadence} from '../src/cadence.mjs';
import {replaySignalDecisions} from '../src/point-in-time-strategy.mjs';

const coin=(number,chain='base')=>({chain,pool:'0x'+number.toString(16).padStart(40,'0'),
 pool_created_at_utc:'2026-10-12T00:10:00.000Z',volume_24h_usd:1000});
const page=(chain,number,time,candidates,source_class='SYNTHETIC_TEST',
 available_at_utc=time)=>({kind:'R29_V19_GECKO_PAGE_ACTIVITY_CAPTURE',
 source_class,chain,page:number,captured_at_utc:time,available_at_utc,candidates});
const asOf='2026-10-12T00:35:00.000Z';
test('first scan jumps directly from four to 24 when 80 actual new pools are sampled',()=>{
 const captures=Array.from({length:4},(_,i)=>page('base',i+1,'2026-10-12T00:30:00.000Z',
  Array.from({length:20},(_,j)=>coin(i*20+j+1))));
 const m=measureDot1Activity({pageCaptures:captures,asOfUtc:asOf});
 assert.equal(m.metrics.newPools,80);
 assert.equal(m.active_chains,1);
 assert.equal(m.comparable_panel_complete,false);
 assert.equal(chooseCadence(m.metrics,4).target,24);
 const r=replaySignalDecisions({date:'2026-10-12',activityPageCaptures:captures});
 assert.equal(r.events[0].target_per_24h,24);
 assert.equal(r.events[0].full_review,true);
 assert.equal(r.events[0].measured_page_activity.metrics.newPools,80);
 assert.equal(r.summary.buys,0);
});
test('identical chain/page, two independently captured windows measure rising volume',()=>{
 const old=[{...coin(1),pool_created_at_utc:'2026-10-10T00:00:00.000Z',
  volume_24h_usd:100}];
 const current=old.map(c=>({...c,volume_24h_usd:350}));
 const m=measureDot1Activity({networks:['base'],asOfUtc:'2026-10-12T01:05:00.000Z',
  pageCaptures:[page('base',1,'2026-10-12T00:00:00.000Z',old),
   page('base',1,'2026-10-12T01:00:00.000Z',current)]});
 assert.equal(m.comparable_page_pairs,1);
 assert.equal(m.metrics.newPools,0);
 assert.equal(m.metrics.observed_volume_pairs,1);
 assert.equal(m.metrics.volumeChangePct,250);
 assert.equal(chooseCadence(m.metrics,4).target,24);
});
test('partial-chain coverage never downshifts, even when currently observed pools are quiet',()=>{
 const quiet=page('base',1,'2026-10-12T00:30:00.000Z',[coin(101)]);
 const m=measureDot1Activity({pageCaptures:[quiet],asOfUtc:asOf});
 assert.equal(m.metrics.dataAvailable,true);
 assert.equal(m.metrics.allowDownshift,false);
 assert.equal(chooseCadence({...m.metrics,consecutiveQuietChecks:8},24).target,24);
});
test('future, late arriving and Oracle pages are never counted as positive activity',()=>{
 const good=page('base',1,'2026-10-12T00:30:00.000Z',[coin(1)]);
 const future=page('base',2,'2026-10-12T01:00:00.000Z',[coin(2)]);
 const late=page('base',3,'2026-10-12T00:30:00.000Z',[coin(3)],
  'SYNTHETIC_TEST','2026-10-12T01:00:00.000Z');
 const oracle=page('base',4,'2026-10-12T00:30:00.000Z',[coin(4)],'POST_EVENT_ORACLE');
 const m=measureDot1Activity({pageCaptures:[good,future,late,oracle],asOfUtc:asOf});
 assert.equal(m.metrics.newPools,1);
 assert.equal(m.excluded.length,3);
});
test('duplicate pages and named winner fields cannot inflate signal counts or volume',()=>{
 const x=coin(99),tainted={...coin(100),reported_gain_pct:100000};
 const p1=page('base',1,'2026-10-12T00:30:00.000Z',[x,tainted]);
 const p2=page('base',2,'2026-10-12T00:30:01.000Z',[x]);
 const m=measureDot1Activity({pageCaptures:[p1,p2],asOfUtc:asOf});
 assert.equal(m.metrics.newPools,1);
 assert.equal(m.observed_unique_pools,1);
 assert.equal(m.rejected_post_event_candidate_rows,1);
});
test('first scan with no reliable captures remains DATA_GAP not a calm market',()=>{
 const m=measureDot1Activity({pageCaptures:[],asOfUtc:asOf});
 assert.equal(m.metrics.dataAvailable,false);
 assert.equal(m.market_quiet_confirmed,false);
 assert.equal(chooseCadence(m.metrics,4).reason,'DATA_GAP_HOLD_LAST_LEVEL');
});
