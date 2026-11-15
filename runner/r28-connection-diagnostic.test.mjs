import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeR28ConnectionReport} from './r28-connection-diagnostic.mjs';
import {r28CycleRecord,appendR28CycleAudit} from './r28-cycle-audit.mjs';
const now=Date.parse('2026-11-15T09:30:00Z');
const okay=(payload)=>({ok:true,status:200,json:async()=>({ok:true,...payload})});
function mockApi({ai=true,failBot=false}={}){
 const seen=[];
 const fetcher=async(url,options)=>{
  seen.push({url,method:options.method,origin:options.headers.origin,body:options.body});
  if(failBot)throw Error('offline');
  if(url.endsWith('/api/health'))return okay({mode:'PAPER_ONLY',uptimeSec:82});
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
test('R28 local report proves API exchange status and isolated signed paper roundtrip but not ChatGPT chat connection',async()=>{
 const m=mockApi();
 const result=await makeR28ConnectionReport({fetcher:m.fetcher,now});
 assert.equal(result.conclusion,'LOCAL_AI_TO_BOT_REPORTS_PRESENT_NOT_CHAT_CLOUD_CONNECTION');
 assert.equal(result.central_ai.real_openai_exchange_observed,true);
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
 assert.equal(r.conclusion,'BOT_AND_TEST_PIPELINE_OK_AI_DISABLED');
 assert.equal(r.central_ai.real_openai_exchange_observed,false);
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
