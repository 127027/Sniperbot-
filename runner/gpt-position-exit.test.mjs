import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {generateKeyPairSync} from 'node:crypto';
import {freshState} from './core.mjs';
import {applyAgentSignal} from './paper-agent-pipeline.mjs';
import {assessEvmSecurityRaw} from './live-paper-security.mjs';
import {createGptPaperLocalReceiver,signGptPaperSignal} from './gpt-paper-local-receiver.mjs';
import {contentSha256} from './gpt-paper-protocol.mjs';
import {validateGptExitPolicy,gptExitPolicyHash,assessGptPaperExit} from './gpt-position-exit.mjs';

const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40);
const deviceId='device_'+'7'.repeat(32);
const iso=x=>new Date(x).toISOString();
const time=Date.now();
const policy=()=>({schema:'sniper_gpt_position_exit_policy.v1',
 stop_loss_pct:12,take_profit_pct:50,trailing_drawdown_pct:20,
 max_hold_minutes:1440,min_exit_liquidity_usd:2000,quote_max_age_seconds:90});
const flags={is_open_source:'1',is_proxy:'0',is_mintable:'0',
 hidden_owner:'0',can_take_back_ownership:'0',owner_change_balance:'0',
 transfer_pausable:'0',is_blacklisted:'0',is_whitelisted:'0',
 is_honeypot:'0',cannot_buy:'0',cannot_sell_all:'0',slippage_modifiable:'0'};
const security=()=>assessEvmSecurityRaw({chain:'base',token,pool,now:Date.now(),
 goplus:{code:1,result:{[token]:flags}},
 honeypot:{simulationSuccess:true,honeypotResult:{isHoneypot:false},
  simulationResult:{buyTax:0,sellTax:0},token:{address:token},
  pair:{pairAddress:pool},flags:[]}});
const quote=(price=.02,now=Date.now())=>({
 chain:'base',tokenAddress:token,poolAddress:pool,priceUsd:price,
 liquidityUsd:120000,volume5mUsd:14000,buys5m:57,sells5m:18,
 symbol:'TEST',name:'Research Fixture',source:'DEX Screener',asOf:iso(now)});
const candidate=()=>({
 chain:'base',token_address:token,pool_address:pool,
 candidate_id:'base:'+token+':'+pool,source:'GECKOTERMINAL_NEW_POOLS',
 first_local_observed_at_utc:iso(Date.now()-3000),observed_at_utc:iso(Date.now()-3000),
 price_usd:.02,liquidity_usd:120000,
 volume_m5_usd:14000,buys_m5:57,sells_m5:18,
 promotion_biased:false,verification:'CROSS_PROVIDER_IDENTITY'});
function decision(action='BUY',id='1'.repeat(32),legacy=false){
 const now=Date.now(),trade=['BUY','SELL'].includes(action);
 return {schema:action==='BUY'&&!legacy?'sniper_r29_gpt_paper_decision.v2':
  'sniper_r29_gpt_paper_decision.v1',
  mode:'PAPER_ONLY',strategy:'GPT_ONLY',decision_id:'gpt_'+id,
  action,chain:trade?'base':null,token_address:trade?token:null,
  pool_address:trade?pool:null,amount_test_usdc:action==='BUY'?50:null,
  created_at_utc:iso(now-3000),expires_at_utc:iso(now+(trade?90000:3600000)),
  source_review_sha256:'f'.repeat(64),source_observed_at_utc:iso(now-5000),
  evidence_ids:['fresh_candidate','independent_security'],
  security_assessment:action==='BUY'?'VERIFIED':'UNKNOWN',
  score_0_100:action==='BUY'?85:null,
  reason_de:'Aktueller R29 isolierter Paper-Regressionsfall ohne echte Modellherkunft oder echte Marktorder.',
  risk_level:'HIGH',trade_type:'VIRTUAL_ONLY',real_trading_enabled:false,
  ...((action==='BUY'&&!legacy)?{exit_policy:policy()}:{})};
}
const envelope=d=>({schema:'sniper_r29_local_gpt_relay.v1',decision:d,
 archive_sha256:contentSha256(JSON.stringify(d,null,2)+'\n'),
 pointer_commit_sha:'a'.repeat(40),archive_commit_sha:'b'.repeat(40),
 github_owner_verified:true,real_trading_enabled:false});
function setup(){
 const dir=mkdtempSync(path.join(tmpdir(),'r29-v46-exit-'));
 let state={...freshState(),entriesEnabled:true,gptPaperFollow:true,
  cashUsdc:5000,maxTrade:5000,minTrade:50,portfolioBudgetUsdc:5000};
 let price=.02,failQuote=false,submissions=0;
 function create(){
  return createGptPaperLocalReceiver({deviceId,dataDir:dir,
   marketFile:path.join(dir,'latest.json'),
   getState:()=>state,commit:s=>{state=s;},
   loadMarket:()=>({ok:true,snapshot:{candidates:[candidate()]}}),
   lookup:async()=>{if(failQuote)throw Error('INJECTED_PROVIDER_OFFLINE');return quote(price);},
   securityCheck:async()=>security(),
   submit:async(signed,options)=>{
    submissions++;
    const result=applyAgentSignal(state,signed,options.localTrust,{
     deviceId,now:Date.now(),quote:options.qaQuote,source:options.source,
     paperAutopilotCandidate:options.paperAutopilotCandidate,
     securityEvidence:options.securityEvidence,
     gptExitAuth:options.gptExitAuth,gptPolicyExit:options.gptPolicyExit,
     gptExitMonitorReady:true});
    state=result.next;return {receipt:result.receipt};
   }});
 }
 return {create,dir,get state(){return state;},setState:s=>{state=s},
  setPrice:p=>{price=p},setQuoteFailed:b=>{failQuote=b},
  get submissions(){return submissions},
  cleanup:()=>rmSync(dir,{recursive:true,force:true})};
}
test('GPT exit policy schema fails closed on missing, tampered and unrealistic terms',()=>{
 assert.equal(validateGptExitPolicy(policy()).stop_loss_pct,12);
 for(const invalid of [{...policy(),max_hold_minutes:0},
  {...policy(),stop_loss_pct:0},{...policy(),quote_max_age_seconds:3600},
  {...policy(),extra:true},{}])
  assert.throws(()=>validateGptExitPolicy(invalid),/INVALID/);
 const p={...policy()};
 assert.notEqual(gptExitPolicyHash(p),gptExitPolicyHash({...p,stop_loss_pct:13}));
 const position={id:'p1',chain:'base',tokenAddress:token,poolAddress:pool,
  gptPaperDecision:true,gptExitAuthorizedDecisionId:'gpt_'+'f'.repeat(32),
  gptExitPolicy:p,gptExitPolicyDigest:gptExitPolicyHash(p),
  entryPriceUsd:.02,highWaterPrice:.02,priceUsd:.02,qty:2475,
  amountUsdc:50,openedAt:iso(time-16000)};
 const stale={...quote(.015,time-120000),asOf:iso(time-120000)};
 assert.equal(assessGptPaperExit(position,stale,{now:time}).due,false);
 assert.equal(assessGptPaperExit({...position,gptExitPolicy:{...p,stop_loss_pct:2}},
  quote(.015,time),{now:time}).due,false);
 assert.equal(assessGptPaperExit(position,quote(.015,time),{now:time}).reason,
  'GPT_EXIT_STOP_LOSS');
 assert.equal(assessGptPaperExit({...position,openedAt:iso(time-1441*60000)},quote(.02,time),
  {now:time}).reason,'GPT_EXIT_MAX_HOLD_EXPIRED');
});
test('V1 legacy GPT BUY and unsigned direct GPT BUY cannot open Paper position',async()=>{
 const a=setup();
 try{
  const r=a.create();
  const legacy=await r.receive(envelope(decision('BUY','b'.repeat(32),true)));
  assert.equal(legacy.status,'BLOCKED');
  assert.equal(legacy.reason,'GPT_BUY_REQUIRES_SIGNED_POSITION_EXIT_POLICY');
  assert.equal(a.submissions,0);
  assert.equal(a.state.positions.length,0);
  const kp=generateKeyPairSync('ed25519');
  const order=signGptPaperSignal(decision('BUY','c'.repeat(32)),{deviceId,keyPair:kp});
  const keys=[{issuer:order.issuer,key_id:order.key_id,scope:'agent_execution',
   revoked:false,public_key_pem:kp.publicKey.export({type:'spki',format:'pem'})}];
  const direct=applyAgentSignal(a.state,order,keys,{
   deviceId,quote:quote(),source:'GPT_GITHUB_LOCAL',
   paperAutopilotCandidate:candidate(),securityEvidence:security()});
  assert.equal(direct.receipt.status,'BLOCKED');
  assert.equal(direct.receipt.reason,'GPT_BUY_REQUIRES_SIGNED_POSITION_EXIT_POLICY');
  assert.equal(direct.next.positions.length,0);
 }finally{a.cleanup()}
});
test('V2 GPT signed BUY fails closed when continuous 30s exit monitor has no valid heartbeat',()=>{
 const a=setup();
 try{
  const kp=generateKeyPairSync('ed25519');
  const buy=decision('BUY','a'.repeat(32));
  const signed=signGptPaperSignal(buy,{deviceId,keyPair:kp});
  const keys=[{issuer:signed.issuer,key_id:signed.key_id,scope:'agent_execution',
   revoked:false,public_key_pem:kp.publicKey.export({type:'spki',format:'pem'})}];
  const result=applyAgentSignal(a.state,signed,keys,{
   deviceId,quote:quote(),source:'GPT_GITHUB_LOCAL',
   paperAutopilotCandidate:candidate(),securityEvidence:security(),
   gptExitAuth:{decision_id:buy.decision_id,policy:buy.exit_policy},
   gptExitMonitorReady:false});
  assert.equal(result.receipt.status,'BLOCKED');
  assert.equal(result.receipt.reason,'GPT_BUY_REQUIRES_HEALTHY_CONTINUOUS_EXIT_MONITOR');
  assert.equal(result.next.positions.length,0);
 }finally{a.cleanup()}
});
test('V2 signed GPT BUY persists policy; monitor SELLs after stop loss with Bot OFF + follow OFF',async()=>{
 const a=setup();
 try{
  const recv=a.create(),buy=decision('BUY','d'.repeat(32));
  const opened=await recv.receive(envelope(buy));
  assert.equal(opened.status,'PAPER_FILLED');
  assert.equal(a.state.positions.length,1);
  assert.equal(a.state.positions[0].gptExitAuthorizedDecisionId,buy.decision_id);
  assert.equal(a.state.positions[0].gptExitPolicyDigest,gptExitPolicyHash(buy.exit_policy));
  a.setPrice(.015);
  a.setState({...a.state,entriesEnabled:false,gptPaperFollow:false});
  const review=await recv.monitor();
  assert.equal(review.due,1);
  assert.equal(review.filled,1);
  assert.equal(a.state.positions.length,0);
  assert(a.state.closedPnl<0);
  assert.equal(a.state.agentOrderReceipts.length,2);
  assert.equal(a.state.agentOrderReceipts[1].reason,'GPT_POLICY_AUTHORIZED_EXIT_PAPER_ONLY');
  assert.equal(a.state.agentOrderReceipts[1].real_trade_executed,false);
  // The REAL local policy monitor audit must bind the BUY to the EXIT,
  // report the provider mark, and never leak portfolio cash or wallet data.
  const daily=path.join(a.dir,'gpt-paper','decision-journal',iso(Date.now()).slice(0,10)+'.jsonl');
  const events=readFileSync(daily,'utf8').trim().split('\n').map(JSON.parse);
  const sells=events.filter(e=>e.schema==='sniper_r29_gpt_policy_exit_audit.v1');
  assert.equal(sells.length,1);
  assert.equal(sells[0].parent_gpt_buy_decision_id,buy.decision_id);
  assert.equal(sells[0].position_id,a.state.agentOrderReceipts[1].position_id);
  assert.equal(sells[0].trigger,'GPT_EXIT_STOP_LOSS');
  assert.equal(sells[0].receipt_status,'PAPER_FILLED');
  assert.equal(sells[0].quote_source,'DEX Screener');
  assert.equal(sells[0].quote_price_usd,.015);
  assert.equal(sells[0].account_balance_or_wallet_logged,false);
  assert.equal(sells[0].price_evidence_class,'PUBLIC_INDICATIVE_QUOTE_PAPER_ONLY');
  assert.equal(sells[0].executable_buy_sell_quote_verified,false);
  assert.equal(Object.hasOwn(sells[0],'synthetic_fixture'),false);
  assert.equal(a.state.gptExitMonitorLast.audit_status,'LOCAL_JOURNAL_WRITTEN');
  assert(!JSON.stringify(sells).includes('cashUsdc'));
  assert(!JSON.stringify(sells).includes('private_key'));
  assert.equal((await recv.monitor()).filled,0);
  assert.equal(a.state.agentOrderReceipts.length,2);
 }finally{a.cleanup()}
});
test('Restart keeps policy, provider outage never fabricates SELL; later quote permits exit',async()=>{
 const a=setup();
 try{
  const orig=a.create();
  assert.equal((await orig.receive(envelope(decision('BUY','e'.repeat(32))))).status,'PAPER_FILLED');
  a.setPrice(.014);
  a.setQuoteFailed(true);
  const offline=a.create(); // Simulates restart, new ephemeral signing key + same ledger
  const first=await offline.monitor();
  assert.equal(first.filled,0);
  assert.equal(a.state.positions.length,1);
  assert.equal(a.state.positions[0].gptExitReviewStatus,'GPT_EXIT_EXACT_POOL_FRESH_LIQUID_QUOTE_UNAVAILABLE');
  a.setQuoteFailed(false);
  const later=await offline.monitor();
  assert.equal(later.filled,1);
  assert.equal(a.state.positions.length,0);
  assert.equal(a.submissions,2); // BUY + one exit; no synthetic failure trade.
  const events=readFileSync(path.join(a.dir,'gpt-paper','decision-journal',
    iso(Date.now()).slice(0,10)+'.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(events.filter(e=>e.schema==='sniper_r29_gpt_policy_exit_audit.v1').length,1);
 }finally{a.cleanup()}
});

test('independent executor refuses forged early GPT policy SELL before GPT threshold',async()=>{
 const a=setup();
 try{
  const recv=a.create();
  const buy=decision('BUY','f'.repeat(32));
  assert.equal((await recv.receive(envelope(buy))).status,'PAPER_FILLED');
  const p=a.state.positions[0];
  const kp=generateKeyPairSync('ed25519');
  const sell=signGptPaperSignal({
   action:'SELL',chain:'base',token_address:token,pool_address:pool,
   decision_id:'gpt_'+'9'.repeat(32)}, {deviceId,keyPair:kp});
  const keys=[{issuer:sell.issuer,key_id:sell.key_id,scope:'agent_execution',
    revoked:false,public_key_pem:kp.publicKey.export({format:'pem',type:'spki'})}];
  const attempt=applyAgentSignal(a.state,sell,keys,{
   deviceId,quote:quote(.02),source:'GPT_GITHUB_POLICY_EXIT',
   gptPolicyExit:{position_id:p.id,authorizing_decision_id:buy.decision_id,
    policy_digest:p.gptExitPolicyDigest,trigger:'GPT_EXIT_STOP_LOSS'}
  });
  assert.equal(attempt.receipt.status,'BLOCKED');
  assert.equal(attempt.receipt.reason,'GPT_POLICY_EXIT_TRIGGER_NOT_DUE_OR_QUOTE_INVALID');
  assert.equal(attempt.next.positions.length,1);
  assert.equal(attempt.next.cashUsdc,4950);
 }finally{a.cleanup()}
});
