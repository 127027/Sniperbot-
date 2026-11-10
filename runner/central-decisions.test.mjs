import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {allocatePaper} from './allocation.mjs';
import {receiveDecision,unsigned} from './central-decisions.mjs';
import {freshState,applyExits} from './core.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const keys=[{key_id:'test-key-001',issuer:'test-central',scope:'synthetic',public_key_pem:publicKey.export({type:'spki',format:'pem'})}];
const now=Date.now();
const signed=d=>({...d,signature:sign(null,Buffer.from(unsigned(d)),privateKey).toString('base64')});
function buy(extra={}){return signed({schema:'paper_execution_decision.v1',paper_only:true,signal_id:'signal-buy-001',decision_id:'decision-001',decision_revision:1,action:'PAPER_BUY',chain:'demo',token_address:'test-token',pool_address:'test-pool',candidate_id:'demo:test-token:test-pool',decision_at_utc:new Date(now-1000).toISOString(),expires_at_utc:new Date(now+60000).toISOString(),score_0_100:92,allocation_intent:'EXPLORATORY',target_test_usdc:null,research_snapshot_id:'snapshot-001',quorum_policy:'FIVE_INDEPENDENT_YES',votes_ref:'synthetic-five-role-proof',independent_risk_ref:'synthetic-risk-proof',issuer:'test-central',key_id:'test-key-001',...extra});}
function sell(){const d=buy();for(const k of ['score_0_100','allocation_intent','target_test_usdc','quorum_policy','votes_ref','independent_risk_ref','signature'])delete d[k];return signed({...d,signal_id:'signal-sell-001',decision_id:'decision-sell-001',action:'PAPER_SELL',close_fraction:1,reason_code:'CENTRAL_RESEARCH_EXIT',exit_policy_ref:'synthetic-exit-policy'});}
const funded=(cash=1000)=>({...freshState(),cashUsdc:cash,minTrade:50,maxTrade:1000,centralPaperFollow:true,entriesEnabled:true});
const options=(d=buy(),extra={})=>({now,allowSynthetic:true,syntheticQuote:{candidate_id:d.candidate_id,priceUsd:1,asOf:now,sellable:true,riskPass:true,quorumPass:true,convictionPass:true,maxGross:10000,...extra}});
test('capital examples: no fixed 200 cap, free capital and equal bounds',()=>{
 for(const [intent,min,max,free,capacity,targetUsdc,expected] of [
  ['EXPLORATORY',50,1000,1000,Infinity,null,50],
  ['HIGH_CONVICTION',50,1000,1000,Infinity,null,1000],
  ['HIGH_CONVICTION',50,1000,350,Infinity,null,350],
  ['HIGH_CONVICTION',500,5000,3500,Infinity,null,3500],
  ['TARGET',50,1000,1000,Infinity,325,325],
  ['TARGET',50,100,1000,Infinity,1000,100],
  ['HIGH_CONVICTION',500,5000,3500,1000,null,1000],
  ['HIGH_CONVICTION',200,200,150,Infinity,null,0],
  ['EXPLORATORY',50,1000,49,Infinity,null,0],
 ]){
  assert.equal(allocatePaper({intent,min,max,free,capacity,targetUsdc}),expected);
 }
 assert.equal(allocatePaper({score:95,min:50,max:1000,free:1000}),50,'Uncalibrated score cannot authorize max allocation');
 assert.equal(allocatePaper({intent:'TARGET',min:50,max:100,free:100}),0,'TARGET requires an explicit amount');
});
test('same authenticated central decision respects three isolated budgets',()=>{
 const d=buy({allocation_intent:'HIGH_CONVICTION'});const states=[50,200,1000].map(cash=>receiveDecision(funded(cash),d,keys,options(d)));
 assert.deepEqual(states.map(s=>s.positions[0].amountUsdc),[50,200,1000]);
 assert(states.every(s=>s.cashUsdc===0));
 assert.deepEqual(states.map(s=>s.positions[0].qty),[49.5,198,990]);
 assert(states.every(s=>s.paperDecisions.receipts[0].signal_id===d.signal_id));
});
test('sequential decisions use remaining funds; persisted duplicate never buys again',()=>{
 const d=buy({score_0_100:95,allocation_intent:'EXPLORATORY'});let s=receiveDecision({...funded(200),maxTrade:200},d,keys,options(d));assert.equal(s.cashUsdc,150);
 s=JSON.parse(JSON.stringify(s));assert.equal(receiveDecision(s,d,keys,options(d)),s);
 const second=buy({signal_id:'signal-buy-002',decision_id:'decision-002',token_address:'token-two',candidate_id:'demo:token-two:test-pool',score_0_100:80,allocation_intent:'HIGH_CONVICTION'});
 s=receiveDecision(s,second,keys,options(second));assert.equal(s.cashUsdc,0);assert.deepEqual(s.positions.map(p=>p.amountUsdc),[150,50]);
});
test('sell acts only on own exact position, works with new entries OFF',()=>{
 let s=receiveDecision(funded(),buy({allocation_intent:'HIGH_CONVICTION'}),keys,options());s.entriesEnabled=false;
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

test('three 500 USDC exploratory positions leave 3500 for a separate high-conviction decision',()=>{
 let s={...funded(5000),minTrade:500,maxTrade:5000};
 for(let i=1;i<=3;i++){
  const d=buy({signal_id:'exploratory-'+i,decision_id:'decision-small-'+i,
    token_address:'token-small-'+i,candidate_id:'demo:token-small-'+i+':test-pool',score_0_100:95});
  s=receiveDecision(s,d,keys,options(d));
  assert.equal(s.positions.length,i);
  assert.equal(s.positions[0].amountUsdc,500);
 }
 assert.equal(s.cashUsdc,3500);
 const d=buy({signal_id:'conviction-fourth',decision_id:'decision-big-fourth',
    token_address:'token-big-fourth',candidate_id:'demo:token-big-fourth:test-pool',
    score_0_100:50,allocation_intent:'HIGH_CONVICTION'});
 s=receiveDecision(s,d,keys,options(d));
 assert.equal(s.positions[0].amountUsdc,3500,'Residual cash instead of a percentage of score');
 assert.equal(s.cashUsdc,0);
 assert.equal(s.positions.length,4);
});
test('high-conviction without separate conviction verification never buys',()=>{
 const d=buy({allocation_intent:'HIGH_CONVICTION'});
 const s=receiveDecision(funded(),d,keys,options(d,{convictionPass:false}));
 assert.equal(s.positions.length,0);
 assert.equal(s.paperDecisions.receipts[0].reason,'INDEPENDENT_CONVICTION_PROOF_UNAVAILABLE');
});
test('signed target is independent of breakout rating, respects local 50-100 range',()=>{
 const d=buy({allocation_intent:'TARGET',target_test_usdc:100,score_0_100:42});
 const s=receiveDecision({...funded(1000),maxTrade:100},d,keys,options(d));
 assert.equal(s.positions[0].amountUsdc,100);
 assert.equal(s.cashUsdc,900);
 assert.throws(()=>receiveDecision(funded(),buy({allocation_intent:'TARGET',target_test_usdc:null}),keys,options()),/Kapitalstrategie/);
});

test('synthetic 5-role approved demo enters, rides 3x pump and autonomously trailing-exits with bot OFF',()=>{
 const initial={...funded(100),defaultExitMode:'TRAILING',trailingPercent:25,stopLoss:10};
 const d=buy({allocation_intent:'HIGH_CONVICTION'});
 let s=receiveDecision(initial,d,keys,options(d));
 assert.equal(s.positions.length,1);
 assert.equal(s.cashUsdc,0);
 assert.equal(s.positions[0].isDemo,true);
 const quoteAt=new Date().toISOString();
 s={...s,positions:s.positions.map(p=>({...p,priceUsd:3,markAt:quoteAt}))};
 s=applyExits(s);
 assert.equal(s.positions.length,1,'3x price rise must not auto-cap gains at +15%');
 assert.equal(s.positions[0].highWaterPrice,3);
 s={...s,entriesEnabled:false,positions:s.positions.map(p=>({...p,priceUsd:2.15,markAt:quoteAt}))};
 s=applyExits(s);
 assert.equal(s.positions.length,0,'drawdown from high triggers autonomous demo exit even with entries OFF');
 assert(s.cashUsdc>100,'hypothetical demo profit does not imply real sellable profit');
 assert(s.history.some(h=>h.title?.includes('AUTO-EXIT')));
});
