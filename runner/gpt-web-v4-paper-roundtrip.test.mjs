import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {freshState} from './core.mjs';
import {applyAgentSignal} from './paper-agent-pipeline.mjs';
import {createGptPaperLocalReceiver} from './gpt-paper-local-receiver.mjs';
import {validateGptPaperDecision,contentSha256} from './gpt-paper-protocol.mjs';
import {GPT_WEB_PRICE_SCHEMA} from './gpt-web-price-evidence.mjs';
import {paperDashboardView} from './dashboard-portfolio.mjs';

const token='619pqYDbUcNpCuobgg2Ed8sxeocfmGzwfHWsTCe2pump';
const pool='GEcf96TkXvnYJqzr1Tr6GQQBwixt6hpPTGxLuGGoiNwk';
const deviceId='device_'+'9'.repeat(32),iso=x=>new Date(x).toISOString();
const market=(price,now=Date.now())=>{
 const asof=iso(now-15000),liq=50000;
 return {schema:GPT_WEB_PRICE_SCHEMA,mode:'PAPER_ONLY',
  chain:'solana',token_address:token,pool_address:pool,
  observed_at_utc:asof,price_usd:price,liquidity_usd:liq,
  quote_quality:'INDICATIVE_WEB_ONLY',sellability_verified:false,
  executable_quote_verified:false,sources:[
   {url:'https://dexscreener.com/solana/'+pool,
    observed_at_utc:asof,price_usd:price*1.01,liquidity_usd:liq*.99},
   {url:'https://www.geckoterminal.com/solana/pools/'+pool,
    observed_at_utc:asof,price_usd:price*.99,liquidity_usd:liq*1.01}
  ]};
};
const decision=(action,id,price,when=Date.now())=>({
 schema:'sniper_r29_gpt_paper_decision.v4',
 mode:'PAPER_ONLY',strategy:'GPT_ONLY',decision_id:'gpt_'+id,action,
 chain:'solana',token_address:token,pool_address:pool,
 amount_test_usdc:null,created_at_utc:iso(when),
 expires_at_utc:iso(when+150000),source_review_sha256:'f'.repeat(64),
 source_observed_at_utc:iso(when-20000),evidence_ids:[
  'https://dexscreener.com/solana/'+pool,
  'https://www.geckoterminal.com/solana/pools/'+pool
 ],
 security_assessment:'UNKNOWN',score_0_100:86,
 reason_de:'Rein virtuelle, indikative Web-Signal-Strategie: kein nachgewiesener realer Swap, Verlust und Sellability unbekannt.',
 risk_level:'HIGH',trade_type:'VIRTUAL_ONLY',real_trading_enabled:false,
 sizing_mode:action==='BUY'?'LOCAL_USER_COIN_STAKE':null,
 exit_policy:action==='BUY'?{
  schema:'sniper_gpt_position_exit_policy.v1',
  stop_loss_pct:12,take_profit_pct:50,trailing_drawdown_pct:20,
  max_hold_minutes:1440,min_exit_liquidity_usd:2000,
  quote_max_age_seconds:90}:null,
 web_market_evidence:market(price,when)
});
const envelope=d=>({schema:'sniper_r29_local_gpt_relay.v1',
 decision:d,archive_sha256:contentSha256(JSON.stringify(d,null,2)+'\n'),
 pointer_commit_sha:'a'.repeat(40),archive_commit_sha:'b'.repeat(40),
 github_owner_verified:true,real_trading_enabled:false});

test('V4 independent public-web quote BUY -> real local PAPER LEDGER -> SELL; no external API and never executable',async()=>{
 const folder=mkdtempSync(path.join(tmpdir(),'r29-v411-web-paper-'));
 let state={...freshState(),cashUsdc:5000,entriesEnabled:true,
  gptPaperFollow:true,automaticPaperBuys:false,
  maxTrade:5000,minTrade:50,portfolioBudgetUsdc:5000,
  paperCoinStakeUsdc:50},apiCalls=0,submitCalls=0;
 const receiver=createGptPaperLocalReceiver({
  deviceId,dataDir:folder,marketFile:path.join(folder,'no-market.json'),
  getState:()=>state,commit:s=>{state=s},
  now:()=>Date.now(),
  loadMarket:()=>{apiCalls++;throw Error('LOCAL_COLLECTOR_DISABLED')},
  lookup:async()=>{apiCalls++;throw Error('NO_EXTERNAL_API_ALLOWED')},
  securityCheck:async()=>{apiCalls++;throw Error('NO_EXTERNAL_SECURITY_API_ALLOWED')},
  submit:async(order,opts)=>{
   submitCalls++;
   const {next,receipt}=applyAgentSignal(state,order,opts.localTrust,{
    deviceId,now:Date.now(),quote:opts.qaQuote,source:opts.source,
    paperAutopilotCandidate:opts.paperAutopilotCandidate,
    securityEvidence:opts.securityEvidence,gptWebEvidence:opts.gptWebEvidence,
    gptExitAuth:opts.gptExitAuth,gptPolicyExit:opts.gptPolicyExit,
    gptExitMonitorReady:true});
   state=next;return {receipt};
  }
 });
 try{
  const buy=decision('BUY','1'.repeat(32),.000012);
  assert.equal(validateGptPaperDecision(buy,{now:Date.now()}).trade,true);
  const receipt=await receiver.receive(envelope(buy));
  assert.equal(receipt.status,'PAPER_FILLED',receipt.reason);
  assert.equal(state.positions.length,1);
  assert.equal(state.cashUsdc,4950);
  assert.equal(state.positions[0].chain,'solana');
  assert.equal(state.positions[0].gptPaperDecision,true);
  assert.equal(state.positions[0].safety,'INDICATIVE_WEB_PRICE_SELLABILITY_UNKNOWN');
  assert.equal(state.agentOrderReceipts.at(-1).indicative_only,true);
  assert.equal(state.agentOrderReceipts.at(-1).sellability_verified,false);
  assert.equal(state.agentOrderReceipts.at(-1).real_trade_executed,false);
  assert.match(state.agentOrderReceipts.at(-1).execution_evidence,/INDICATIVE.*NOT_EXECUTABLE/);
  assert.equal(paperDashboardView(state).open_position_count,1);
  assert.equal(apiCalls,0);
  const replay=await receiver.receive(envelope(buy));
  assert.equal(replay.duplicate,true);
  assert.equal(submitCalls,1);

  const sell=decision('SELL','2'.repeat(32),.000018);
  const result=await receiver.receive(envelope(sell));
  assert.equal(result.status,'PAPER_FILLED',result.reason);
  assert.equal(state.positions.length,0);
  assert(state.cashUsdc>5000,'this is an isolated INDICATIVE profit, not a verified DEX profit');
  assert.equal(paperDashboardView(state).open_position_count,0);
  assert.equal(apiCalls,0,'no GeckoTerminal/DexScreener/GoPlus/Honeypot API used');
  assert.equal(state.agentOrderReceipts.length,2);
  assert.equal(state.agentOrderReceipts.every(x=>x.real_trade_executed===false),true);
 }finally{rmSync(folder,{recursive:true,force:true})}
});
test('V4 cannot turn a high-risk web-only PAPER price into VERIFIED/LOW risk or live trade',()=>{
 const d=decision('BUY','3'.repeat(32),.000012);
 for(const altered of [
  {...d,security_assessment:'VERIFIED'},
  {...d,risk_level:'LOW'},
  {...d,mode:'LIVE'},
  {...d,web_market_evidence:{...d.web_market_evidence,sellability_verified:true}}
 ]){
  assert.throws(()=>validateGptPaperDecision(altered,{now:Date.now()}));
 }
});
