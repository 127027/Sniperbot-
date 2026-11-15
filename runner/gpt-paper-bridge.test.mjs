import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {freshState,action} from './core.mjs';
import {applyAgentSignal} from './paper-agent-pipeline.mjs';
import {assessEvmSecurityRaw} from './live-paper-security.mjs';
import {createGptPaperLocalReceiver} from './gpt-paper-local-receiver.mjs';
import {contentSha256,archivePath,validateGptPaperDecision,
 validateGptPaperPointer} from './gpt-paper-protocol.mjs';

const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40);
const deviceId='device_'+'2'.repeat(32),now=Date.now();
const iso=n=>new Date(n).toISOString();
const FLAGS={is_open_source:'1',is_proxy:'0',is_mintable:'0',
 hidden_owner:'0',can_take_back_ownership:'0',owner_change_balance:'0',
 transfer_pausable:'0',is_blacklisted:'0',is_whitelisted:'0',
 is_honeypot:'0',cannot_buy:'0',cannot_sell_all:'0',slippage_modifiable:'0'};
const safe=(time=Date.now())=>assessEvmSecurityRaw({chain:'base',token,pool,now:time,
 goplus:{code:1,result:{[token]:FLAGS}},
 honeypot:{simulationSuccess:true,honeypotResult:{isHoneypot:false},
 simulationResult:{buyTax:0,sellTax:0},token:{address:token},pair:{pairAddress:pool},flags:[]}});
const quote=(price=.02,time=Date.now())=>({
 chain:'base',tokenAddress:token,poolAddress:pool,priceUsd:price,
 liquidityUsd:120000,volume5mUsd:14000,buys5m:57,sells5m:18,
 symbol:'MEME',name:'Virtual Test Token',source:'DEX Screener',asOf:iso(time)});
const candidate=time=>({
 chain:'base',token_address:token,pool_address:pool,
 candidate_id:'base:'+token+':'+pool,source:'GECKOTERMINAL_NEW_POOLS',
 first_local_observed_at_utc:iso(time),observed_at_utc:iso(time),
 price_usd:.02,liquidity_usd:120000,
 volume_m5_usd:14000,buys_m5:57,sells_m5:18,
 promotion_biased:false,verification:'CROSS_PROVIDER_IDENTITY'});
function decision(actionName='BUY',time=now,id='1'.repeat(32)){
 const trade=['BUY','SELL'].includes(actionName);
 return {schema:'sniper_r29_gpt_paper_decision.v1',mode:'PAPER_ONLY',
 strategy:'GPT_ONLY',decision_id:'gpt_'+id,action:actionName,
 chain:trade?'base':null,token_address:trade?token:null,
 pool_address:trade?pool:null,
 amount_test_usdc:actionName==='BUY'?50:null,
 created_at_utc:iso(time),expires_at_utc:iso(time+(trade?150000:3600000)),
 source_review_sha256:'f'.repeat(64),source_observed_at_utc:iso(time-10000),
 evidence_ids:['research/r29/channel/dynamic-research-review.json',
  'research/r29/channel/dynamic-research-status.json'],
 security_assessment:actionName==='BUY'?'VERIFIED':'UNKNOWN',
 score_0_100:actionName==='BUY'?85:null,
 reason_de:'Rein virtuelle GPT-Entscheidung: unabhängige Sicherheits- und Marktprüfung erforderlich, keine Echtgeldorder.',
 risk_level:actionName==='BUY'?'HIGH':'UNKNOWN',
 trade_type:'VIRTUAL_ONLY',real_trading_enabled:false};
}
const envelope=d=>({schema:'sniper_r29_local_gpt_relay.v1',
 decision:d,archive_sha256:contentSha256(JSON.stringify(d,null,2)+'\n'),
 pointer_commit_sha:'a'.repeat(40),archive_commit_sha:'b'.repeat(40),
 github_owner_verified:true,real_trading_enabled:false});
function ledger(){
 return {...freshState(),cashUsdc:5000,entriesEnabled:true,gptPaperFollow:true,
  maxTrade:5000,portfolioBudgetUsdc:5000,minTrade:50,
  automaticPaperBuys:false};
}
function makeReceiver(d){
 let state=ledger(),price=.02,signCount=0;
 const folder=mkdtempSync(path.join(tmpdir(),'gpt-paper-e2e-'));
 const r=createGptPaperLocalReceiver({
  deviceId,dataDir:folder,marketFile:path.join(folder,'latest.json'),
  getState:()=>state,commit:s=>{state=s;},
  now:()=>Date.now(),
  loadMarket:()=>({ok:true,snapshot:{
    schema:'research_market_snapshot.v1',
    paper_only:true,actionable:false,candidates:[candidate(Date.now())]}}),
  lookup:async()=>quote(price),
  securityCheck:async()=>safe(),
  submit:async(o,opts)=>{
    signCount++;
    const result=applyAgentSignal(state,o,opts.localTrust,{
     deviceId,now:Date.now(),quote:opts.qaQuote,source:opts.source,
     paperAutopilotCandidate:opts.paperAutopilotCandidate,
     securityEvidence:opts.securityEvidence});
    state=result.next;return {receipt:result.receipt};
  }
 });
 return {r,get state(){return state},setState:x=>{state=x},
  setPrice:x=>{price=x},get signCount(){return signCount},
  cleanup:()=>rmSync(folder,{force:true,recursive:true})};
}
test('strict ChatGPT protocol never promotes invalid, stale, unsigned research to a BUY',()=>{
 const d=decision();assert.equal(validateGptPaperDecision(d,{now}).trade,true);
 assert.throws(()=>validateGptPaperDecision({...d,score_0_100:79},{now}),/UNSAFE/);
 assert.throws(()=>validateGptPaperDecision({...d,security_assessment:'UNKNOWN'},{now}),/UNSAFE/);
 assert.throws(()=>validateGptPaperDecision({...d,mode:'LIVE'},{now}),/INVALID/);
 assert.throws(()=>validateGptPaperDecision({...d,expires_at_utc:iso(now+3600000)},{now}),/TTL/);
 assert.throws(()=>validateGptPaperDecision({...d,evidence_ids:[]},{now}),/UNSAFE/);
 const no=decision('NO_TRADE');
 assert.equal(validateGptPaperDecision(no,{now}).trade,false);
 assert.equal(archivePath(no.decision_id,no.created_at_utc),
  'research/r29/gpt-decisions/'+no.created_at_utc.slice(0,10)+'/'+no.decision_id+'.json');
 const pointer={schema:'sniper_r29_gpt_paper_pointer.v1',mode:'PAPER_ONLY',
  decision_id:d.decision_id,archive_path:archivePath(d.decision_id,d.created_at_utc),
  archive_sha256:contentSha256(JSON.stringify(d,null,2)+'\n'),
  published_at_utc:d.created_at_utc,real_trading_enabled:false};
 assert.equal(validateGptPaperPointer(pointer,{now}).decision_id,d.decision_id);
 assert.throws(()=>validateGptPaperPointer({...pointer,archive_path:'../secret'},{now}),/INVALID/);
});
test('authorized GPT BUY -> signed local PAPER only -> GPT SELL -> replay protected one ledger',async()=>{
 const a=makeReceiver();
 try{
  const buy=decision(),buyEnvelope=envelope(buy);
  const first=await a.r.receive(buyEnvelope);
  assert.equal(first.status,'PAPER_FILLED');
  assert.equal(a.state.positions.length,1);
  assert.equal(a.state.cashUsdc,4950);
  assert.equal(a.state.positions[0].gptPaperDecision,true);
  assert.equal(a.state.positions[0].exitMode,'GPT_GUARD');
  assert.equal(a.state.automaticPaperBuys,false);
  const duplicate=await a.r.receive(buyEnvelope);
  assert.equal(duplicate.duplicate,true);
  assert.equal(a.signCount,1);
  assert.equal(a.state.positions.length,1);
  assert.equal(a.state.gptPaperFollow,true);
 }catch(e){if(e.code==='ERR_ASSERTION')throw e;throw e}
 finally{a.cleanup()}
});
test('GPT SELL closes owned position, updates cash and PnL only when local owner is authorized',async()=>{
 const a=makeReceiver();
 try{
  const bought=await a.r.receive(envelope(decision('BUY',now,'1'.repeat(32))));
  assert.equal(bought.status,'PAPER_FILLED');
  a.setPrice(.026);
  const sold=await a.r.receive(envelope(decision('SELL',now,'2'.repeat(32))));
  assert.equal(sold.status,'PAPER_FILLED');
  assert.equal(a.state.positions.length,0);
  assert(a.state.cashUsdc>5000);
  assert(a.state.closedPnl>0);
  assert(a.state.paperLiveRisk.day_realized_pnl>0);
  assert.equal(a.state.agentOrderReceipts.length,2);
  const old=await a.r.receive(envelope(decision('SELL',now,'2'.repeat(32))));
  assert.equal(old.duplicate,true);
  assert.equal(a.signCount,2);
 }finally{a.cleanup()}
});
test('no GPT local follow opt-in, unsafe archive mismatch, and NO_TRADE never execute BUY',async()=>{
 const a=makeReceiver();
 try{
  a.setState({...a.state,gptPaperFollow:false});
  const blocked=await a.r.receive(envelope(decision('BUY',now,'3'.repeat(32))));
  assert.equal(blocked.status,'BLOCKED');
  assert.equal(a.signCount,0);
  const p=decision('BUY',now,'4'.repeat(32));
  const tampered={...envelope(p),archive_sha256:'0'.repeat(64)};
  await assert.rejects(a.r.receive(tampered),/HASH_MISMATCH/);
  const no=await a.r.receive(envelope(decision('NO_TRADE',now,'5'.repeat(32))));
  assert.equal(no.status,'NO_TRADE');
  assert.equal(a.signCount,0);
  assert.equal(a.state.positions.length,0);
  assert.equal(a.state.cashUsdc,5000);
 }finally{a.cleanup()}
});
test('GPT oversized amount is rejected by local risk even if its text says VERIFIED',async()=>{
 const a=makeReceiver();
 try{
  const big=decision('BUY',now,'6'.repeat(32));
  big.amount_test_usdc=100;
  const blocked=await a.r.receive(envelope(big));
  assert.equal(blocked.status,'BLOCKED');
  assert.equal(blocked.reason,'GPT_SIZE_EXCEEDS_INDEPENDENT_RISK_CAP');
  assert.equal(a.state.positions.length,0);
  assert.equal(a.signCount,0);
 }finally{a.cleanup()}
});
