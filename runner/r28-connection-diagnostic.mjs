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
     coordinator.enabled!==true?'CENTRAL_AI_NOT_ACTIVE':
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
   total_paper_fills_recorded:Number.isInteger(orders.paper_filled)?orders.paper_filled:null,
   real_trading_enabled:false},
  transport_results:http,
  conclusion:!bot.ok?'BOT_NOT_REACHABLE':
   !validIsolated?'ISOLATED_SIGNED_PIPELINE_NOT_VERIFIED':
   !coordinator.enabled?'BOT_AND_TEST_PIPELINE_OK_AI_DISABLED':
   !recentModel?'LOCAL_AI_CONFIGURED_API_EXCHANGE_NOT_YET_PROVEN':
   'LOCAL_AI_TO_BOT_REPORTS_PRESENT_NOT_CHAT_CLOUD_CONNECTION',
  notes:[
   'Only local HTTP and the isolated in-memory signed paper path are actively tested.',
   'A recent model response proves local OpenAI API contact, not direct access from this ChatGPT conversation.',
   'A real AI-generated paper trade is proven only by an actual recorded coordinator receipt; no dummy trade is counted.'
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
