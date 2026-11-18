import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeR28ConnectionReport} from './r28-connection-diagnostic.mjs';
import {r28CycleRecord,appendR28CycleAudit} from './r28-cycle-audit.mjs';
const now=Date.parse('2026-11-15T09:30:00Z');
const okay=(payload)=>({ok:true,status:200,json:async()=>({ok:true,...payload})});
function mockApi({ai=false,gptReady=true,failBot=false}={}){
 const seen=[];
 const fetcher=async(url,options)=>{
  seen.push({url,method:options.method,origin:options.headers.origin,body:options.body});
  if(failBot)throw Error('offline');
  if(url.endsWith('/api/health'))return okay({mode:'PAPER_ONLY',uptimeSec:82});
  if(url.endsWith('/api/gpt/paper/status'))return okay({
   mode:'PAPER_ONLY',strategy:'GPT_ONLY',local_gpt_bridge_ready:gptReady,
   gpt_follow_enabled:true,paper_bot_enabled:false,received_decision_count:0,
   old_local_autopilot_enabled:false,last_decision_id:null});
  if(url.endsWith('/api/r29/presence'))return okay({presence:{
   checked_at_utc:'2026-11-15T09:29:00.000Z',
   courier_enabled:true,local_paper_http_healthy:true}});
  if(url.endsWith('/api/central-ai/status'))return okay({coordinator:{
   enabled:ai,mode:'PAPER_ONLY',external_api_configured:ai,
   last_run_utc:'2026-11-15T09:28:00Z',
   last_outcome:ai?'NO_TRADE':'PENDING',
   model:ai?'gpt-4.1-mini':null,response_id:ai?'resp_v1':null,
   last_audit_status:'LOCALLY_SAVED',last_market_regime:{status:'RISK_OFF'},
   receipts:[],wallet_secret:'SECRET_SHOULD_NEVER_PRINT'}});
  if(url.endsWith('/api/r27/archive/status'))return okay({active:true,archived:true,
   last_check_at_utc:'2026-11-15T09:29:00Z',
   pool_observations:24,news_headlines:4,
   private_wallet:'SECRET_SHOULD_NEVER_PRINT'});
  if(url.endsWith('/api/paper/agent-orders'))return okay({
   signed_publisher_configured:ai,paper_filled:0,
   secret_state:'SECRET_SHOULD_NEVER_PRINT'});
  if(url.endsWith('/api/paper/pipeline-selftest'))return okay({
   paper_state_unchanged:true,live_trading_enabled:false,
   proof:{status:'PASSED',signed_buy_and_sell:true,
    existing_paper_account_changed:false,existing_wallet_accessed:false}});
  throw Error('BAD_TEST_URL');
 };
 return {fetcher,seen};
}
test('R29 local report proves GitHub receiver readiness with isolated signed test; never claims a live trade',async()=>{
 const m=mockApi();
 const result=await makeR28ConnectionReport({fetcher:m.fetcher,now});
 assert.equal(result.conclusion,'BOT_AND_GITHUB_GPT_RECEIVER_READY_NO_ORDER_PROOF');
 assert.equal(result.github_gpt_courier.local_signed_receiver_ready,true);
 assert.equal(result.github_gpt_courier.local_courier_heartbeat_recent,true);
 assert.equal(result.github_gpt_courier.actual_gpt_paper_buy_sell_roundtrip_verified,false);
 assert.equal(result.central_ai.model_not_confirmed_reason,'LOCAL_PAID_API_DISABLED_BY_DESIGN_GITHUB_ONLY');
 assert.equal(result.signed_order_receiver.publisher_connected_scope,'SEPARATE_GENERIC_SIGNED_AGENT_PUBLISHER');
 assert.equal(result.signed_order_receiver.github_gpt_bridge_ready,true);
 assert.equal(result.central_ai.real_openai_exchange_observed,false);
 assert.equal(result.isolated_signed_paper_roundtrip.passed,true);
 assert.equal(result.chat_session_direct_connection,false);
 assert.equal(result.no_wallet_or_private_balances_collected,true);
 assert.equal(result.research_archive.active,true);
 assert(!JSON.stringify(result).includes('SECRET_SHOULD_NEVER_PRINT'));
 const post=m.seen.filter(x=>x.method==='POST');
 assert.equal(post.length,1);
 assert.equal(post[0].url,'http://127.0.0.1:3030/api/paper/pipeline-selftest');
 assert.equal(post[0].origin,'http://127.0.0.1:3030');
 assert.equal(post[0].body,'{}');
});
test('R28 bot can be up and signed in-memory tests pass without any external AI API calls',async()=>{
 const {fetcher}=mockApi({ai:false});
 const r=await makeR28ConnectionReport({fetcher,now});
 assert.equal(r.conclusion,'BOT_AND_GITHUB_GPT_RECEIVER_READY_NO_ORDER_PROOF');
 assert.equal(r.github_gpt_courier.mode,'GITHUB_ONLY_NO_LOCAL_OPENAI_API');
 assert.equal(r.github_gpt_courier.new_paper_entries_enabled,false);
 assert.equal(r.central_ai.real_openai_exchange_observed,false);
 assert.equal(r.isolated_signed_paper_roundtrip.passed,true);
});
test('R28 preserves honest no-GPT-transport flag when local GitHub receiver not ready',async()=>{
 const {fetcher}=mockApi({gptReady:false});
 const r=await makeR28ConnectionReport({fetcher,now});
 assert.equal(r.conclusion,'BOT_AND_TEST_PIPELINE_OK_GITHUB_GPT_RECEIVER_NOT_READY');
 assert.equal(r.github_gpt_courier.local_signed_receiver_ready,false);
 assert.equal(r.isolated_signed_paper_roundtrip.passed,true);
});
test('R28 cannot claim successful communication with offline laptop',async()=>{
 const {fetcher}=mockApi({failBot:true});
 const r=await makeR28ConnectionReport({fetcher,now});
 assert.equal(r.conclusion,'BOT_NOT_REACHABLE');
 assert.equal(r.isolated_signed_paper_roundtrip.passed,false);
});
test('R28 immutable model-cycle audit redacts original source and wallet secrets',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'r28-audit-'));
 const secret='FAKE_WALLET_SEED_NEVERSEND';
 const record=r28CycleRecord({runId:'0123456789abcdef',
  startedAt:'2026-11-15T09:27:00Z',finishedAt:'2026-11-15T09:27:45Z',
  status:'NO_TRADE',model:'gpt-4.1-mini',modelResponseId:'resp123',
  input:{schema:'sniper_central_ai_input.v1',wallet_private_key:secret,
   candidates:[{candidate_id:'solana:test',heuristic_market_score:82,
    observed_liquidity_usd:25000,observed_volume_5m_usd:1200,
    asOf:'2026-11-15T09:27:00Z',tokenSecret:secret}],
   market_regime:{status:'NEUTRAL_OR_BETTER',buys_allowed:true},
   paper:{cash_test_usdc:5000,private_wallet:secret},
   news:{leads:[]},early_discovery:{alerts:[]}},
  recommendations:[{candidate_id:'solana:test',action:'WATCH',score_0_100:82,
   portfolio_pct:0,reason:'NO TRADE',sources:[]}],
  receipts:[],summary:'NO_TRADE'});
 assert.equal(record.paper_receipt_count,0);
 assert.equal(record.real_wallet_balances_excluded,true);
 assert(!JSON.stringify(record).includes(secret));
 try{
  const first=appendR28CycleAudit({dataDir:dir,record});
  const second=appendR28CycleAudit({dataDir:dir,record});
  assert.equal(first.written,true);
  assert.equal(second.written,false);
  const raw=readFileSync(first.filename,'utf8');
  assert.equal(JSON.parse(raw).record_sha256,record.record_sha256);
  assert(!raw.includes(secret));
  const changed={...record,research_status:'PAPER_FILLED'};
  assert.throws(()=>appendR28CycleAudit({dataDir:dir,record:changed}),/R28_AUDIT_TAMPERED/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
