import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {allocatePaper} from './allocation.mjs';
import {receiveDecision,unsigned} from './central-decisions.mjs';
import {freshState} from './core.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const keys=[{key_id:'test-key-001',issuer:'test-central',scope:'synthetic',public_key_pem:publicKey.export({type:'spki',format:'pem'})}];
const now=Date.now();
const signed=d=>({...d,signature:sign(null,Buffer.from(unsigned(d)),privateKey).toString('base64')});
function buy(extra={}){return signed({schema:'paper_execution_decision.v1',paper_only:true,signal_id:'signal-buy-001',decision_id:'decision-001',decision_revision:1,action:'PAPER_BUY',chain:'demo',token_address:'test-token',pool_address:'test-pool',candidate_id:'demo:test-token:test-pool',decision_at_utc:new Date(now-1000).toISOString(),expires_at_utc:new Date(now+60000).toISOString(),score_0_100:92,research_snapshot_id:'snapshot-001',quorum_policy:'FIVE_INDEPENDENT_YES',votes_ref:'synthetic-five-role-proof',independent_risk_ref:'synthetic-risk-proof',issuer:'test-central',key_id:'test-key-001',...extra});}
function sell(){const d=buy();for(const k of ['score_0_100','quorum_policy','votes_ref','independent_risk_ref','signature'])delete d[k];return signed({...d,signal_id:'signal-sell-001',decision_id:'decision-sell-001',action:'PAPER_SELL',close_fraction:1,reason_code:'CENTRAL_RESEARCH_EXIT',exit_policy_ref:'synthetic-exit-policy'});}
const funded=(cash=1000)=>({...freshState(),cashUsdc:cash,minTrade:50,maxTrade:1000,centralPaperFollow:true,entriesEnabled:true});
const options=(d=buy(),extra={})=>({now,allowSynthetic:true,syntheticQuote:{candidate_id:d.candidate_id,priceUsd:1,asOf:now,sellable:true,riskPass:true,quorumPass:true,maxGross:10000,...extra}});
test('capital examples: no fixed 200 cap, free capital and equal bounds',()=>{
 for(const [score,min,max,free,expected] of [[79,50,1000,1000,0],[80,50,1000,1000,50],[86,50,200,200,125],[92,50,1000,1000,1000],[92,50,1000,50,50],[92,50,200,150,150],[92,200,200,150,0],[80,200,200,200,200],[92,50,1000,49,0]])assert.equal(allocatePaper({score,min,max,free}),expected);
 assert.equal(allocatePaper({score:NaN,min:50,max:1000,free:1000}),0);
});
test('same authenticated central decision respects three isolated budgets',()=>{
 const d=buy();const states=[50,200,1000].map(cash=>receiveDecision(funded(cash),d,keys,options(d)));
 assert.deepEqual(states.map(s=>s.positions[0].amountUsdc),[50,200,1000]);
 assert(states.every(s=>s.cashUsdc===0));
 assert.deepEqual(states.map(s=>s.positions[0].qty),[49.5,198,990]);
 assert(states.every(s=>s.paperDecisions.receipts[0].signal_id===d.signal_id));
});
test('sequential decisions use remaining funds; persisted duplicate never buys again',()=>{
 const d=buy({score_0_100:80});let s=receiveDecision({...funded(200),maxTrade:200},d,keys,options(d));assert.equal(s.cashUsdc,150);
 s=JSON.parse(JSON.stringify(s));assert.equal(receiveDecision(s,d,keys,options(d)),s);
 const second=buy({signal_id:'signal-buy-002',decision_id:'decision-002',token_address:'token-two',candidate_id:'demo:token-two:test-pool'});
 s=receiveDecision(s,second,keys,options(second));assert.equal(s.cashUsdc,0);assert.deepEqual(s.positions.map(p=>p.amountUsdc),[150,50]);
});
test('sell acts only on own exact position, works with new entries OFF',()=>{
 let s=receiveDecision(funded(),buy(),keys,options());s.entriesEnabled=false;
 const d=sell();s=receiveDecision(s,d,keys,options(d));assert.equal(s.positions.length,0);assert.equal(s.cashUsdc,980.1);
 assert.equal(receiveDecision(funded(),d,keys,options(d)).paperDecisions.receipts[0].status,'NOOP');
});
test('unknown key, changed content, revoked key, expiry, extra fields and unapproved synthetic mode rejected',()=>{
 const d=buy();
 assert.throws(()=>receiveDecision(funded(),d,[],options()),/Publisher/);
 assert.throws(()=>receiveDecision(funded(),{...d,score_0_100:80},keys,options()),/Signatur/);
 assert.throws(()=>receiveDecision(funded(),d,[{...keys[0],revoked:true}],options()),/Publisher/);
 assert.throws(()=>receiveDecision(funded(),buy({expires_at_utc:new Date(now-1).toISOString()}),keys,options()),/Entscheidung/);
 assert.throws(()=>receiveDecision(funded(),buy({amount:1000}),keys,options()),/Felder/);
 assert.throws(()=>receiveDecision(funded(),d,keys,{now}),/Synthetische/);
 const saved=receiveDecision(funded(),d,keys,options());
 assert.throws(()=>receiveDecision(saved,buy({score_0_100:81}),keys,options()),/Konflikt/);
 assert.throws(()=>receiveDecision(saved,buy({signal_id:'signal-buy-002'}),keys,options()),/revision/i);
});
test('off, missing quote and missing central proof cannot fill; external coins remain blocked',()=>{
 const d=buy();
 for(const state of [{...funded(),entriesEnabled:false},{...funded(),centralPaperFollow:false}])assert.equal(receiveDecision(state,d,keys,options()).positions.length,0);
 for(const patch of [{sellable:false},{riskPass:false},{quorumPass:false},{asOf:now-11000}])assert.equal(receiveDecision(funded(),d,keys,options(d,patch)).positions.length,0);
 const token='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40);
 const real=buy({chain:'base',token_address:token,pool_address:pool,candidate_id:`base:${token}:${pool}`});
 const s=receiveDecision(funded(),real,[{...keys[0],scope:'external'}],{now});assert.equal(s.positions.length,0);assert.equal(s.paperDecisions.receipts[0].reason,'REAL_VALIDATOR_UNAVAILABLE');
});
