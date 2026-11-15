import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {freshState} from './core.mjs';
import {applyAgentSignal} from './paper-agent-pipeline.mjs';
import {assessEvmSecurityRaw} from './live-paper-security.mjs';
import {r29LivePaperEntryGate,recordLivePaperSellRisk} from './live-paper-risk.mjs';
import {signLocalPaperAutopilot,choosePaperOpportunities,
 shouldSellPaperAutopilot} from './live-paper-autopilot.mjs';

const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40),now=Date.now();
const deviceId='device_'+'1'.repeat(32);
const validFlags={is_open_source:'1',is_proxy:'0',is_mintable:'0',
 hidden_owner:'0',can_take_back_ownership:'0',owner_change_balance:'0',
 transfer_pausable:'0',is_blacklisted:'0',is_whitelisted:'0',
 is_honeypot:'0',cannot_buy:'0',cannot_sell_all:'0',
 slippage_modifiable:'0'};
const security=(at=now)=>assessEvmSecurityRaw({chain:'base',token,pool,now:at,
 goplus:{code:1,result:{[token]:validFlags}},
 honeypot:{simulationSuccess:true,honeypotResult:{isHoneypot:false},
  simulationResult:{buyTax:0,sellTax:0},token:{address:token},
  pair:{pairAddress:pool},flags:[]}});
const quote=(price=0.02,at=now)=>({chain:'base',tokenAddress:token,
 poolAddress:pool,priceUsd:price,liquidityUsd:120000,
 volume5mUsd:14000,buys5m:57,sells5m:18,
 source:'DEX Screener',symbol:'MEME',name:'Example Paper Token',
 asOf:new Date(at).toISOString()});
const cand=(at=now)=>({candidate_id:'base:'+token+':'+pool,
 chain:'base',token_address:token,pool_address:pool,
 first_local_observed_at_utc:new Date(at).toISOString(),
 verification:'CROSS_PROVIDER_IDENTITY',promotion_biased:false});
function ledger(){
 return {...freshState(),entriesEnabled:true,automaticPaperBuys:true,
  cashUsdc:5000,minTrade:50,maxTrade:5000,portfolioBudgetUsdc:5000};
}
test('5k TEST money can only buy 50 via 1% nominal, 3% total and risk limits',()=>{
 const g=r29LivePaperEntryGate({state:ledger(),candidate:cand(),quote:quote(),
   security:security(),now});
 assert.equal(g.allowed,true);assert.equal(g.amount_test_usdc,50);
 const bad={...ledger(),automaticPaperBuys:false};
 assert.equal(r29LivePaperEntryGate({state:bad,candidate:cand(),quote:quote(),
   security:security(),now}).allowed,false);
 const lowCash={...ledger(),cashUsdc:499};
 assert.equal(r29LivePaperEntryGate({state:lowCash,candidate:cand(),quote:quote(),
   security:security(),now}).allowed,false);
 const loss={...ledger(),paperLiveRisk:{...ledger().paperLiveRisk,
  day_realized_pnl:-100}};
 assert.equal(r29LivePaperEntryGate({state:loss,candidate:cand(),quote:quote(),
   security:security(),now}).reason,'DAILY_OR_WEEKLY_LOSS_CIRCUIT_BREAKER');
 const missing={...security(),approved:false};
 assert.equal(r29LivePaperEntryGate({state:ledger(),candidate:cand(),quote:quote(),
   security:missing,now}).allowed,false);
 assert.equal(r29LivePaperEntryGate({state:ledger(),candidate:{
  ...cand(),verification:'PROVIDER_ONLY'},quote:quote(),security:security(),now}).allowed,false);
});
test('signed real-market paper BUY -> position -> independent repricing SELL -> exactly one cash balance',()=>{
 const pair=generateKeyPairSync('ed25519');
 const trust=[{issuer:'sniper-paper-autopilot',key_id:'ephemeral-session',
  scope:'agent_execution',revoked:false,
  public_key_pem:pair.publicKey.export({format:'pem',type:'spki'})}];
 const entry=r29LivePaperEntryGate({state:ledger(),candidate:cand(),
   quote:quote(),security:security(),now});
 const buy=signLocalPaperAutopilot({action:'BUY',chain:'base',
  token,pool,amount:entry.amount_test_usdc,deviceId,keyPair:pair,now});
 const a=applyAgentSignal(ledger(),buy,trust,{deviceId,now,quote:quote(),
   source:'LOCAL_PAPER_AUTOPILOT',paperAutopilotCandidate:cand(),
   securityEvidence:security()});
 assert.equal(a.receipt.status,'PAPER_FILLED');
 assert.equal(a.receipt.real_trade_executed,false);
 assert.equal(a.next.cashUsdc,4950);
 assert.equal(a.next.positions.length,1);
 assert.equal(a.next.positions[0].paperAutopilot,true);
 assert.equal(a.next.positions[0].exitMode,'AUTO');
 assert.equal(a.next.defaultExitMode,'HOLD');
 assert.equal(a.receipt.execution_evidence,'PUBLIC_SECURITY_VERIFIED_INDICATIVE_DEX_QUOTE_NOT_EXECUTABLE');
 const duplicate=applyAgentSignal(a.next,buy,trust,{deviceId,now,quote:quote(),
  source:'LOCAL_PAPER_AUTOPILOT',paperAutopilotCandidate:cand(),securityEvidence:security()});
 assert.equal(duplicate.next,a.next);
 const exitQuote=quote(0.026,now+30000);
 assert.equal(shouldSellPaperAutopilot(a.next.positions[0],exitQuote).sell,true);
 const sell=signLocalPaperAutopilot({action:'SELL',chain:'base',token,pool,
  deviceId,keyPair:pair,now:now+30000});
 const b=applyAgentSignal(a.next,sell,trust,{deviceId,now:now+30000,
  quote:exitQuote,source:'LOCAL_PAPER_AUTOPILOT'});
 assert.equal(b.receipt.status,'PAPER_FILLED');
 assert.equal(b.next.positions.length,0);
 assert(b.next.cashUsdc>5000);
 assert(b.next.closedPnl>0);
 assert(b.next.paperLiveRisk.day_realized_pnl>0);
 assert.equal(b.next.agentOrderReceipts.length,2);
 assert.equal(b.receipt.sellability_verified,false);
 assert.equal(b.receipt.live_trading_enabled,false);
 assert.equal(b.receipt.wallet_debited,false);
 const attempted=applyAgentSignal(b.next,sell,trust,{deviceId,now:now+30000,quote:exitQuote,
   source:'LOCAL_PAPER_AUTOPILOT'});
 assert.equal(attempted.receipt.duplicate,true);
});
test('autopilot cannot buy without security and cannot sell user manual position',()=>{
 const pair=generateKeyPairSync('ed25519');
 const trust=[{issuer:'sniper-paper-autopilot',key_id:'ephemeral-session',
  scope:'agent_execution',revoked:false,
  public_key_pem:pair.publicKey.export({format:'pem',type:'spki'})}];
 const buy=signLocalPaperAutopilot({action:'BUY',chain:'base',
  token,pool,amount:50,deviceId,keyPair:pair,now});
 const a=applyAgentSignal(ledger(),buy,trust,{deviceId,now,quote:quote(),
  source:'LOCAL_PAPER_AUTOPILOT',paperAutopilotCandidate:cand()});
 assert.equal(a.receipt.status,'BLOCKED');
 assert.equal(a.next.positions.length,0);
 const manual={...ledger(),positions:[{
  id:'pos-existing',chain:'base',tokenAddress:token,poolAddress:pool,
  priceUsd:.02,entryPriceUsd:.02,markAt:new Date(now).toISOString(),
  qty:2475,amountUsdc:50}]};
 const sell=signLocalPaperAutopilot({action:'SELL',chain:'base',token,pool,
  deviceId,keyPair:pair,now});
 const b=applyAgentSignal(manual,sell,trust,{deviceId,now,quote:quote(),
  source:'LOCAL_PAPER_AUTOPILOT'});
 assert.equal(b.receipt.status,'BLOCKED');
 assert.equal(b.next.positions.length,1);
});
test('market scanner never upgrades unverified news/promoted token into order',()=>{
 const first={...cand(),observed_at_utc:new Date(now).toISOString(),
  liquidity_usd:120000,volume_m5_usd:14000,buys_m5:57,sells_m5:18};
 const snapshot={schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
  published_at_utc:new Date(now).toISOString(),
  candidates:[first]};
 assert.equal(choosePaperOpportunities(snapshot,{now}).length,1);
 assert.equal(choosePaperOpportunities({...snapshot,actionable:true},{now}).length,0);
 assert.equal(choosePaperOpportunities({...snapshot,candidates:[
  {...first,promotion_biased:true}]},{now}).length,0);
 assert.equal(choosePaperOpportunities(snapshot,{now:now+400000}).length,0);
});
