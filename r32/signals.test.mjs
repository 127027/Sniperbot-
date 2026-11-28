import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeSignals,MAX_TTL} from './signals.mjs';
const now=1795876980000,at=new Date(now).toISOString(),a='A'.repeat(32);
const advisory=(action='BUY',o={})=>({mode:'PAPER_ONLY',chain:'solana',address:a,action,observed_at:at,expires_at:new Date(now+MAX_TTL).toISOString(),rank:1,thesis:'fixture thesis',sources:['https://example.org/source'],risks:[],...o});
const wrap=(id,advisories,extra={})=>({expected_dot:id,feed:{version:1,mode:'PAPER_ONLY',dot:id,run_at:at,advisories,...extra}});
test('repeat BUY independent of portfolio, SELL wins until expiry',()=>{
 assert.equal(mergeSignals([wrap(1,[advisory()])],now).buys.length,1);
 const r=mergeSignals([wrap(1,[advisory()]),wrap(2,[advisory('SELL')])],now);
 assert.equal(r.buys.length,0);assert.equal(r.sells.length,1);
});
test('stale, malformed, spoofed and future evidence fail closed',()=>{
 for(const x of [wrap(1,[advisory()],{dot:2}),wrap(1,[advisory('BUY',{sources:[]})]),wrap(1,[advisory('BUY',{observed_at:new Date(now+1).toISOString()})]),wrap(1,[advisory('HOLD')]),wrap(1,[advisory()],{run_at:new Date(now-MAX_TTL-1).toISOString()})]){
 assert.equal(mergeSignals([x],now).buys.length,0);
 }
});
test('targeted cross-dot objection vetoes, unrelated or same-dot objection does not',()=>{
 const o={chain:'solana',address:a,target_dot:1,reason:'fixture objection',observed_at:at};
 assert.equal(mergeSignals([wrap(1,[advisory()]),wrap(2,[],{objections:[o]})],now).buys.length,0);
 assert.equal(mergeSignals([wrap(1,[advisory()],{objections:[o]})],now).buys.length,1);
 assert.equal(mergeSignals([wrap(1,[advisory()]),wrap(2,[],{objections:[{...o,target_dot:3}]})],now).buys.length,1);
});
