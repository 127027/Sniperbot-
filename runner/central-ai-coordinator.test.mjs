import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {encodeBase58} from './local-solana-vault.mjs';
import {freshState} from './core.mjs';
import {applyAgentSignal,verifyAgentSignal} from './paper-agent-pipeline.mjs';
import {snapshotForAi,planRecommendations,signLocalPaperSignal,
 startCentralAiCoordinator,requestCentralAiAdvice,
 nextR29RealModelDelayMs,reserveR29GptBudget} from './central-ai-coordinator.mjs';

const MINT=encodeBase58(Buffer.alloc(32,31));
const POOL=encodeBase58(Buffer.alloc(32,32));
const ID='solana:'+POOL;
const deviceId='device_'+'1'.repeat(32);
const now=Date.now();
const regime={schema:'r27_market_regime.v1',status:'NEUTRAL_OR_BETTER',buys_allowed:true,
 reason:'TEST_ONLY',observed_at_utc:new Date().toISOString(),evidence:{}};
const market=()=>({results:[{chain:'solana',tokenAddress:MINT,poolAddress:POOL,
 symbol:'TEST',name:'Paper-only meme',priceUsd:.1,liquidityUsd:250000,
 volume5mUsd:10000,buys5m:100,sells5m:30,score:90,asOf:new Date().toISOString(),
 isDemo:false}],errors:[]});
const news=()=>({leads:[{title:'Meme attention',source_name:'test',
 source_url:'https://news.example/test',original_published_at_utc:new Date().toISOString(),
 first_observed_at_utc:new Date().toISOString()}],coverage:[{feed:'test',status:'OK'}]});
const advice=(action='BUY',pct=3)=>({summary:'Source-dependent hypothetical paper decision',
 choices:[{candidate_id:ID,action,score_0_100:92,portfolio_pct:pct,
 reason:'liquidity and activity research lead',source_urls:['https://news.example/test']}]});
function ledger(){return {...freshState(),entriesEnabled:true,centralPaperFollow:true,
 cashUsdc:5000,minTrade:50,maxTrade:1000,portfolioBudgetUsdc:5000}}
function quote(price=.1,liq=250000,volume=10000){return {
 chain:'solana',tokenAddress:MINT,poolAddress:POOL,priceUsd:price,
 liquidityUsd:liq,volume5mUsd:volume,source:'DEX Screener',
 symbol:'TEST',name:'Paper test token',asOf:new Date().toISOString()}}
test('model sees only bounded token candidates, no private funds or wallet secrets',()=>{
 const privateState={...ledger(),walletPassword:'TOPSECRET',
  positions:[],candidates:[]};
 const snapshot=snapshotForAi(privateState,market().results,news(),{now:Date.now(),marketRegime:regime});
 assert.equal(snapshot.paper.cash_test_usdc,5000);
 assert.equal(snapshot.real_wallet.connected,false);
 assert.equal(snapshot.candidates.length,1);
 assert(!JSON.stringify(snapshot).includes('TOPSECRET'));
});
test('real wallet is read-only aggregated metadata and never exposes owner address',()=>{
 const raw={verified:true,sol_display:'0.143',usdc_display:'210.20',
  observed_positive_token_accounts:3,sol_finalized_slot:310101, tokens_finalized_slot:310102,
  wallet_address:'PRIVATE_OWNER_ADDRESS_SHOULD_NOT_BE_EMITTED'};
 const input=snapshotForAi(ledger(),market().results,news(),{now:Date.now(),realWallet:raw,marketRegime:regime});
 assert.equal(input.real_wallet.connected,true);
 assert.equal(input.real_wallet.observed_sol,'0.143');
 assert.equal(input.real_wallet.real_pnl,null);
 assert.equal(input.real_wallet.live_trading_enabled,false);
 assert(!JSON.stringify(input).includes('PRIVATE_OWNER_ADDRESS'));
});
test('model output is fail-closed and never freeforms token targets',()=>{
 const input=snapshotForAi(ledger(),market().results,news(),{now:Date.now(),marketRegime:regime});
 const p=planRecommendations(input,advice(),{webSearchUsed:true});
 assert.equal(p.orders.length,1);
 assert.equal(p.orders[0].size_test_usdc,'150.00');
 assert.equal(planRecommendations(input,advice(),{webSearchUsed:false}).orders.length,0);
 assert.equal(planRecommendations({...input,paper:{...input.paper,central_follow_enabled:false}},
   advice(),{webSearchUsed:true}).orders.length,0);
 assert.equal(planRecommendations(input,advice('BUY',70),{webSearchUsed:true}).orders.length,0);
 const unknown=advice();unknown.choices[0].candidate_id='solana:unapproved';
 assert.throws(()=>planRecommendations(input,unknown,{webSearchUsed:true}),/UNKNOWN_CANDIDATE/);
 const dup=advice();dup.choices.push({...dup.choices[0]});
 assert.throws(()=>planRecommendations(input,dup,{webSearchUsed:true}),/BAD_CHOICE_FIELDS/);
});
test('R27 unknown or risk-off market blocks BUY but not a SELL recommendation',()=>{
 const input=snapshotForAi(ledger(),market().results,news(),{now:Date.now()});
 assert.equal(input.market_regime.status,'UNKNOWN');
 assert.equal(planRecommendations(input,advice(),{webSearchUsed:true}).orders.length,0);
 const bearish={...regime,status:'RISK_OFF',buys_allowed:false};
 const candidate=snapshotForAi(ledger(),market().results,news(),{marketRegime:bearish});
 assert.equal(planRecommendations(candidate,advice(),{webSearchUsed:true}).orders.length,0);
 const safe={...candidate,paper:{...candidate.paper,positions:[{
  candidate_id:ID,chain:'solana',token_address:MINT,pool_address:POOL,
  is_demo:false,qty:10,last_indicative_price_usd:1}] }};
 const orders=planRecommendations(safe,advice('SELL',0),{webSearchUsed:true}).orders;
 assert.equal(orders.length,1);
 assert.equal(orders[0].action,'SELL');
});
test('ephemeral signed coordinator BUY and SELL use only indicative paper ledger, repeat is blocked',()=>{
 let state=ledger();
 const keys=generateKeyPairSync('ed25519');
 const trusted=[{issuer:'sniper-central-ai',key_id:'ephemeral-central-session',
  public_key_pem:keys.publicKey.export({format:'pem',type:'spki'}),scope:'agent_execution'}];
 const input=snapshotForAi(state,market().results,news(),{now:Date.now(),marketRegime:regime});
 const buy=signLocalPaperSignal(planRecommendations(input,advice(),{webSearchUsed:true}).orders[0],
  {deviceId,keyPair:keys});
 assert.equal(verifyAgentSignal(buy,trusted,{deviceId}).amount,150);
 let result=applyAgentSignal(state,buy,trusted,{deviceId,source:'CENTRAL_AI_LOCAL',
  indicativePaper:true,quote:quote()});
 assert.equal(result.receipt.status,'PAPER_FILLED');
 assert.equal(result.receipt.execution_evidence,'INDICATIVE_DEX_QUOTE_NOT_EXECUTABLE');
 assert.equal(result.receipt.live_trading_enabled,false);
 assert.equal(result.receipt.real_trade_executed,false);
 assert.equal(result.next.positions.length,1);
 const repeated=applyAgentSignal(result.next,buy,trusted,{deviceId,source:'CENTRAL_AI_LOCAL',
  indicativePaper:true,quote:quote()});
 assert.equal(repeated.receipt.duplicate,true);
 assert.equal(repeated.next.cashUsdc,result.next.cashUsdc);
 state=result.next;
 const after=snapshotForAi(state,market().results,news(),{now:Date.now(),marketRegime:regime});
 const order=planRecommendations(after,advice('SELL',0),{webSearchUsed:true}).orders[0];
 assert.equal(order.action,'SELL');
 const signed=signLocalPaperSignal(order,{deviceId,keyPair:keys});
 const exit=applyAgentSignal(state,signed,trusted,{deviceId,source:'CENTRAL_AI_LOCAL',
  indicativePaper:true,quote:quote(.15)});
 assert.equal(exit.receipt.status,'PAPER_FILLED');
 assert.equal(exit.next.positions.length,0);
 assert(exit.next.closedPnl>0);
 assert.equal(exit.receipt.wallet_debited,false);
 assert.equal(exit.receipt.sellability_verified,false);
});
test('external and unverified agents cannot activate indicative paper fills',()=>{
 const keys=generateKeyPairSync('ed25519');
 const trust=[{issuer:'sniper-central-ai',key_id:'ephemeral-central-session',scope:'agent_execution',
  public_key_pem:keys.publicKey.export({format:'pem',type:'spki'})}];
 const input=snapshotForAi(ledger(),market().results,news(),{now:Date.now(),marketRegime:regime});
 const signed=signLocalPaperSignal(planRecommendations(input,advice(),{webSearchUsed:true}).orders[0],
  {deviceId,keyPair:keys});
 const external=applyAgentSignal(ledger(),signed,trust,{deviceId,source:'SIGNED_LOCAL_ADAPTER',
  indicativePaper:true,quote:quote()});
 assert.equal(external.receipt.status,'BLOCKED');
 const unverified=applyAgentSignal(ledger(),signed,trust,{deviceId,source:'CENTRAL_AI_LOCAL',
  indicativePaper:true,quote:quote(.1,1000)});
 assert.equal(unverified.receipt.status,'BLOCKED');
 const disabled=applyAgentSignal({...ledger(),centralPaperFollow:false},signed,trust,{
  deviceId,source:'CENTRAL_AI_LOCAL',indicativePaper:true,quote:quote()});
 assert.equal(disabled.receipt.status,'BLOCKED');
});
test('response parser requires completed web search and structured JSON',async()=>{
 let parsed;
 const fakeFetch=async(_url,options)=>{
  parsed=JSON.parse(options.body);
  return {ok:true,json:async()=>({status:'completed',id:'resp_local_test_123456789',
   model:'mock-model',output:[{type:'web_search_call',status:'completed'},
   {type:'message',content:[{type:'output_text',text:JSON.stringify(advice())}]}]})};
 };
 const res=await requestCentralAiAdvice({schema:'test'},{
  apiKey:'sk-testonly-fakekey-notreal-123',model:'gpt-4.1-mini',fetcher:fakeFetch});
 assert.equal(res.webSearchUsed,true);
 assert.equal(res.advice.choices[0].action,'BUY');
 assert.deepEqual(parsed.tools,[{type:'web_search'}]);
 assert.equal(parsed.store,false);
 assert.equal(parsed.input[1].role,'user');
 assert.equal(parsed.text.format.strict,true);
});
test('single AI run shares the local bot state and logs actual simulated receipts',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'sniper-central-ai-test-'));
 let state=ledger();
 const service=startCentralAiCoordinator({deviceId,dataDir:dir,apiKey:'sk-fake',
  getState:()=>state,scan:async()=>market(),collectNews:async()=>news(),
  collectMarketRegime:async()=>regime,
  submit:async(order,{source,localTrust,indicativePaper})=>{
   const result=applyAgentSignal(state,order,localTrust,{deviceId,source,
    indicativePaper,quote:quote()});
   state=result.next;return result;
  },initialDelayMs:1000000});
 try{
  const result=await service.runOnce({modelApi:async()=>({
   advice:advice(),webSearchUsed:true,model:'mock-only',response_id:'local-test'})});
  assert.equal(result.status,'RECOMMENDATIONS_SUBMITTED');
  assert.equal(result.receipts.length,1);
  assert.equal(state.positions.length,1);
  const status=service.status();
  assert.equal(status.live_trading_enabled,false);
  assert.equal(status.remote_chat_session_connected,false);
  assert.equal(status.receipts[0].status,'PAPER_FILLED');
  assert.equal(JSON.parse(readFileSync(path.join(dir,'central-ai','latest.json'))).mode,'PAPER_ONLY');
 }finally{service.stop();rmSync(dir,{recursive:true,force:true})}
});

test('GPT research cadence targets 1, 6, 12, 24 reviews daily without generating BUY instructions',()=>{
 const input={paper:{positions:[]},candidates:[],early_discovery:{alerts:[]},news:{leads:[]}};
 assert.equal(nextR29RealModelDelayMs(input),24*3600000);
 assert.equal(nextR29RealModelDelayMs({...input,candidates:[{}]}),4*3600000);
 assert.equal(nextR29RealModelDelayMs({...input,candidates:Array(5).fill({}),news:{leads:[{}]}}),2*3600000);
 assert.equal(nextR29RealModelDelayMs({...input,paper:{positions:[{}]}}),3600000);
 assert.equal(nextR29RealModelDelayMs({...input,early_discovery:{alerts:[{},{}]}}),3600000);
});
test('24 real HTTP attempt daily budget is durable across restarts, not bypassed by bad data',()=>{
 const t=Date.parse('2026-11-17T12:00:00.000Z');
 const requests=Array.from({length:24},(_,i)=>new Date(t+i*1000).toISOString());
 const full=reserveR29GptBudget(requests,new Date(t+25000).toISOString());
 assert.equal(full.allowed,false);assert.equal(full.used,24);
 const tomorrow=reserveR29GptBudget(requests,'2026-11-18T01:00:00.000Z');
 assert.equal(tomorrow.allowed,true);assert.equal(tomorrow.used,1);
 assert.throws(()=>reserveR29GptBudget(requests,'garbage'),/BUDGET_INVALID/);
});
test('local model can decline an unproven new candidate without converting WATCH into a trade',()=>{
 const input=snapshotForAi(ledger(),market().results,news(),{now:Date.now(),marketRegime:regime});
 assert.equal(planRecommendations(input,advice('NO_TRADE',0),{webSearchUsed:true}).orders.length,0);
 assert.equal(planRecommendations(input,advice('WATCH',0),{webSearchUsed:true}).orders.length,0);
});
test('test-injected fake model response may simulate a Paper trade but cannot masquerade as an actual model invocation',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'r29-true-model-only-test-'));
 let state=ledger();
 const service=startCentralAiCoordinator({deviceId,dataDir:dir,apiKey:'sk-fake',
  getState:()=>state,scan:async()=>market(),collectNews:async()=>news(),
  collectMarketRegime:async()=>regime,submit:async()=>({receipt:{status:'BLOCKED',reason:'SYNTHETIC_TEST'}}),
  initialDelayMs:1000000});
 try{
  const outcome=await service.runOnce({modelApi:async()=>({
   advice:advice('WATCH',0),webSearchUsed:true,model:'mock-only',response_id:'resp_mock_123456789'})});
  assert.equal(outcome.status,'NO_TRADE');
  const status=service.status();
  assert.equal(status.last_api_response_is_real_provider_invocation,false);
  assert.equal(status.actual_provider_response_count,0);
  assert.equal(status.provider_requests_utc.length,1);
  assert.equal(status.mode,'PAPER_ONLY');
 }finally{service.stop();rmSync(dir,{recursive:true,force:true})}
});

test('fake HTTP Responses endpoint can test the data path but never inflate real-model counters',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'r29-mock-http-provenance-'));
 const httpStub=async()=>({ok:true,json:async()=>({
  id:'resp_mock_api_123456789',status:'completed',model:'gpt-4.1-mini',
  output:[{type:'web_search_call',status:'completed'},
   {type:'message',content:[{type:'output_text',
    text:JSON.stringify(advice('WATCH',0))}]}]})});
 let state=ledger();
 const svc=startCentralAiCoordinator({deviceId,dataDir:dir,
  apiKey:'sk-local-fixture-only-123456789',
  getState:()=>state,scan:async()=>market(),collectNews:async()=>news(),
  collectMarketRegime:async()=>regime,
  submit:async()=>{throw Error('NO_ORDERS_EXPECTED')},
  fetcher:httpStub,initialDelayMs:1000000});
 try{
  const result=await svc.runOnce();
  assert.equal(result.status,'NO_TRADE');
  assert.equal(svc.status().last_api_response_is_real_provider_invocation,false);
  assert.equal(svc.status().actual_provider_response_count,0);
  assert.equal(svc.status().provider_requests_utc.length,1);
 }finally{svc.stop();rmSync(dir,{recursive:true,force:true})}
});

test('previously invisible low-liquidity unknown memecoin reaches GPT WATCH, never unsafe BUY',()=>{
 const tiny=market().results[0];
 const early={...tiny,liquidityUsd:1500,volume5mUsd:15,buys5m:1,
  sells5m:0,score:0};
 const input=snapshotForAi(ledger(),[early],news(),{now:Date.now(),marketRegime:regime});
 assert.equal(input.candidates.length,0);
 assert.equal(input.research_candidates.length,1);
 assert.equal(input.research_candidates[0].can_buy,false);
 assert.equal(nextR29RealModelDelayMs(input),4*3600000);
 const modelReason='Early unproven organic buy activity; reserve too small for a safe trading order.';
 const choice=action=>({summary:'Still unknown pre-breakout potential, not trading authority',
  choices:[{candidate_id:ID,action,score_0_100:99,
    portfolio_pct:3,reason:modelReason,source_urls:['https://news.example/test']}]});
 const watch=planRecommendations(input,choice('WATCH'),{webSearchUsed:true});
 assert.equal(watch.reviews.length,1);
 assert.equal(watch.orders.length,0);
 const unsafe=planRecommendations(input,choice('BUY'),{webSearchUsed:true});
 assert.equal(unsafe.orders.length,0);
});
