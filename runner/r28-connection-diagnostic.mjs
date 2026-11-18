// R28: safe local loopback handoff/communication diagnostic.
// Runs no trades and never reads wallet, API credentials or paper balances.
// Isolated signature/BUY/SELL testing occurs only in a disposable in-memory
// ledger through the existing local selftest endpoint.
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const fmt=t=>Number.isFinite(Date.parse(t))?new Date(t).toISOString():null;
const clean=(x,max=90)=>typeof x==='string'?x.replace(/[^A-Za-z0-9_.:-]/g,'_').slice(0,max):null;
const bool=x=>x===true;
const age=(s,now)=>Number.isFinite(Date.parse(s))?now-Date.parse(s):null;
const CHECKS=[
 {name:'bot_health',path:'/api/health'},
 {name:'central_ai',path:'/api/central-ai/status'},
 {name:'github_gpt_receiver',path:'/api/gpt/paper/status'},
 {name:'r29_local_presence',path:'/api/r29/presence'},
 {name:'source_archive',path:'/api/r27/archive/status'},
 {name:'paper_agent_orders',path:'/api/paper/agent-orders'},
 {name:'paper_isolated_signature_roundtrip',path:'/api/paper/pipeline-selftest',post:true}
];
export async function makeR28ConnectionReport({
 port=3030,fetcher=fetch,now=Date.now(),timeoutMs=5500
}={}){
 if(!Number.isInteger(port)||port<1024||port>65535||
  !Number.isFinite(now)||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)
  throw Error('R28_INVALID_DIAGNOSTIC_CONFIG');
 const base='http://127.0.0.1:'+port;
 const result={},http={};
 for(const test of CHECKS){
  try{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),timeoutMs);
   let response;
   try{
    response=await fetcher(base+test.path,{
     method:test.post?'POST':'GET',
     headers:test.post?{'origin':base,'content-type':'application/json'}:
      {'accept':'application/json'},
     ...(test.post?{body:'{}'}:{}),
     signal:controller.signal});
   }finally{clearTimeout(timeout)}
   const good=response?.ok===true;
   http[test.name]={reachable:good,http_status:response?.status||null};
   if(good){
    const payload=await response.json();
    if(payload?.ok===true&&typeof payload==='object'&&
     JSON.stringify(payload).length<750000)result[test.name]=payload;
    else http[test.name].reachable=false;
   }
  }catch(e){
   http[test.name]={reachable:false,
    category:e?.name==='AbortError'?'TIMEOUT':
     e instanceof SyntaxError?'INVALID_JSON':'NOT_REACHABLE',http_status:null};
  }
 }
 const bot=result.bot_health||{};
 const coordinator=result.central_ai?.coordinator||{};
 const gpt=result.github_gpt_receiver||{};
 const presence=result.r29_local_presence||{};
 const gptReady=gpt.ok===true&&gpt.mode==='PAPER_ONLY'&&
  gpt.strategy==='GPT_ONLY'&&gpt.local_gpt_bridge_ready===true;
 // /api/r29/presence is a flattened, sanitized STATUS (not the raw file).
 // Earlier diagnostic incorrectly parsed legacy nested/raw field names and
 // reported a false negative even when the real Windows courier was online.
 const presenceStatus=presence.presence||presence.status||presence;
 const presenceAt=age(presenceStatus.checked_at_utc,now);
 const presenceRecent=presence.ok===true&&presenceStatus.connected===true&&
  presenceAt!==null&&presenceAt>=0&&presenceAt<4*60000&&
  presenceStatus.bot_http_healthy===true&&
  presenceStatus.github_courier_enabled===true;
 const archive=result.source_archive||{};
 const orders=result.paper_agent_orders||{};
 const paper=result.paper_isolated_signature_roundtrip||{};
 const proof=paper.proof||{};
 const resultAge=age(coordinator.last_run_utc,now);
 const recentModel=coordinator.enabled===true&&resultAge!==null&&
  resultAge>=0&&resultAge<=4*3600000&&
  typeof coordinator.response_id==='string'&&coordinator.response_id.length>0&&
  typeof coordinator.model==='string'&&coordinator.model.length>0&&
  coordinator.last_outcome!=='ERROR_NO_ORDERS';
 const validIsolated=paper.paper_state_unchanged===true&&
  paper.live_trading_enabled===false&&
  proof.status==='PASSED'&&proof.signed_buy_and_sell===true&&
  proof.existing_paper_account_changed===false&&
  proof.existing_wallet_accessed===false;
 const actualReceipts=Array.isArray(coordinator.receipts)?coordinator.receipts:[];
 const filled=actualReceipts.filter(r=>r?.status==='PAPER_FILLED').length;
 const meaningfulStatus=['RECOMMENDATIONS_SUBMITTED','NO_TRADE','NO_CANDIDATES','ERROR_NO_ORDERS'];
 const final={
  schema:'sniper_r28_connection_report.v1',
  checked_at_utc:new Date(now).toISOString(),
  mode:'PAPER_ONLY',real_trading_allowed:false,
  chat_session_direct_connection:false,
  local_only:true,no_wallet_or_private_balances_collected:true,
  bot:{online:bot.ok===true&&bot.mode==='PAPER_ONLY',
   uptime_seconds:Number.isFinite(bot.uptimeSec)?bot.uptimeSec:null},
  github_gpt_courier:{
   mode:'GITHUB_ONLY_NO_LOCAL_OPENAI_API',
   strategy:'GPT_ONLY',
   local_signed_receiver_ready:gptReady,
   gpt_follow_enabled:bool(gpt.gpt_follow_enabled),
   new_paper_entries_enabled:bool(gpt.paper_bot_enabled),
   old_local_autopilot_enabled:false,
   local_courier_heartbeat_recent:presenceRecent,
   local_courier_last_reported_at_utc:fmt(presenceStatus.checked_at_utc),
   local_courier_presence_connected:presenceStatus.connected===true,
   legacy_autopilot_orders_enabled:presenceStatus.paper_orders_automatically_enabled===true,
   received_gpt_decisions_in_local_replay:Number.isInteger(gpt.received_decision_count)?
    gpt.received_decision_count:0,
   last_decision_id:clean(gpt.last_decision_id),
   actual_strategic_gpt_model_response_verified:false,
   actual_gpt_paper_buy_sell_roundtrip_verified:false,
   note:'The local courier heartbeat uses the sanitized presence endpoint; its legacy-autopilot-orders flag is NOT the dashboard GPT paper entry switch. Receiver readiness is NOT proof of signed BUY or a live GPT exit fill.'},
  central_ai:{enabled:bool(coordinator.enabled),
   real_openai_exchange_observed:recentModel,
   last_run_at_utc:fmt(coordinator.last_run_utc),
   last_run_result:meaningfulStatus.includes(coordinator.last_outcome)?
    coordinator.last_outcome:(coordinator.last_outcome==='PENDING'?'PENDING':'NOT_VERIFIED'),
   model_name:clean(coordinator.model),
   last_run_age_minutes:resultAge!==null&&resultAge>=0?
    Math.floor(resultAge/60000):null,
   next_due_at_utc:fmt(coordinator.next_due_utc),
   api_key_configured:bool(coordinator.external_api_configured),
   local_run_audit_status:clean(coordinator.last_audit_status),
   market_filter:clean(coordinator.last_market_regime?.status),
   new_paper_fills_from_last_ai_cycle:filled,
   last_cycle_receipts:actualReceipts.length,
   model_not_confirmed_reason:recentModel?null:
     coordinator.enabled!==true?'LOCAL_PAID_API_DISABLED_BY_DESIGN_GITHUB_ONLY':
     coordinator.last_outcome==='ERROR_NO_ORDERS'?'LAST_RUN_FAILED':
     'NO_VERIFIED_COMPLETED_API_MODEL_EXCHANGE_YET'},
  research_archive:{active:bool(archive.active),
   saved_last_capture:bool(archive.archived),
   last_capture_at_utc:fmt(archive.last_check_at_utc),
   last_observed_pools:Number.isInteger(archive.pool_observations)?archive.pool_observations:0,
   last_observed_headlines:Number.isInteger(archive.news_headlines)?archive.news_headlines:0},
  isolated_signed_paper_roundtrip:{passed:validIsolated,
   original_paper_state_untouched:paper.paper_state_unchanged===true,
   actual_market_or_ai_trades_performed:false,
   signature_test_is_real_cloud_ai_connection:false},
  signed_order_receiver:{endpoint_reachable:orders.ok===true,
   publisher_connected:orders.signed_publisher_configured===true,
   publisher_connected_scope:'SEPARATE_GENERIC_SIGNED_AGENT_PUBLISHER',
   github_gpt_bridge_ready:gptReady,
   total_paper_fills_recorded:Number.isInteger(orders.paper_filled)?orders.paper_filled:null,
   real_trading_enabled:false},
  transport_results:http,
  conclusion:!bot.ok?'BOT_NOT_REACHABLE':
   !validIsolated?'ISOLATED_SIGNED_PIPELINE_NOT_VERIFIED':
   gptReady?'BOT_AND_GITHUB_GPT_RECEIVER_READY_NO_ORDER_PROOF':
   'BOT_AND_TEST_PIPELINE_OK_GITHUB_GPT_RECEIVER_NOT_READY',
  notes:[
   'Only local HTTP and the isolated in-memory signed paper path are actively tested.',
   'Canonical R29 uses ChatGPT-GitHub orders. A disabled local central-ai coordinator is expected; no separate OpenAI API key is needed.',
   'Signed GitHub ownership and receiver readiness never prove model authorship, safe continuous GPT exits or real paper fills.',
   'A GPT Paper trade needs a real, attributable GitHub decision and corresponding verified local paper-ledger receipt; a generic or isolated coordinator receipt does not prove it.'
  ]};
 return final;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const report=await makeR28ConnectionReport({
   port:Number(process.env.SNIPER_PORT||3030)});
  process.stdout.write('\n========== SNIPERBOT R28 VERBINDUNGSBERICHT ==========\n');
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.stdout.write('======================================================\n');
  process.stdout.write('Diesen Bericht (ohne API-Key, Wallet-Adresse, Seed oder Kontostand) hier in den Chat kopieren.\n');
  if(report.conclusion==='BOT_NOT_REACHABLE'||report.conclusion==='ISOLATED_SIGNED_PIPELINE_NOT_VERIFIED')
   process.exitCode=2;
 }catch(e){
  process.stderr.write('R28_DIAGNOSE_FEHLER: '+String(e.message).slice(0,110)+'\n');
  process.exitCode=2;
 }
}
