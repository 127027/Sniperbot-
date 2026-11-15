// R29 opt-in ONE-CYCLE test of the *regular* Paper account (dashboard).
// Never transfers funds: only existing localhost /api/command DEMO_SIGNAL,
// fixed 50 TEST-USDC BUY, fixed synthetic position id SELL. No live orders,
// arbitrary tokens, new deposits, balance resets or wallet access.
// Only runs when supervisor sets SNIPER_R29_MAIN_PAPER_DEMO=1.
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';

export const R29_MAIN_INTENT_PATH='research/r29/channel/main-paper-intent.json';
export const R29_MAIN_STATUS_PATH='research/r29/channel/main-paper-status.json';
export const R29_MAIN_INTENT_SCHEMA='sniper_r29_main_paper_demo_intent.v1';
export const R29_MAIN_STATUS_SCHEMA='sniper_r29_main_paper_demo_status.v1';
const amount=50;
const DEMO_MINT='DEMO-MINT-001';
const DEMO_POOL='DEMO-POOL-001';
const DEMO_ID='demo:signal-1';
const API='http://127.0.0.1:3030';
const LIMIT=30*60*1000;
const auditError=(msg)=>{throw Error(msg)};
const validIso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s));
export function validateR29MainIntent(x,{now=Date.now()}={}){
 if(!x||typeof x!=='object'||Array.isArray(x)||
  Object.keys(x).sort().join(',')!=='action,amount_test_usdc,asset,created_at_utc,expires_at_utc,intent_id,mode,reason,schema,target'||
  x.schema!==R29_MAIN_INTENT_SCHEMA||x.target!=='MAIN_PAPER_DEMO'||
  x.mode!=='PAPER_ONLY'||x.asset!=='R29_FIXED_TEST_COIN'||
  !['BUY','SELL'].includes(x.action)||
  !/^r29main_[0-9a-f]{32}$/.test(x.intent_id)||
  (x.action==='BUY'?x.amount_test_usdc!=='50.00':x.amount_test_usdc!==null)||
  typeof x.reason!=='string'||x.reason.length<10||x.reason.length>170||
  !validIso(x.created_at_utc)||!validIso(x.expires_at_utc))
  auditError('R29_MAIN_UNAUTHORIZED_INTENT');
 const created=Date.parse(x.created_at_utc),expires=Date.parse(x.expires_at_utc);
 if(created>now+30000||expires<=now||expires-created>LIMIT||expires<=created)
  auditError('R29_MAIN_EXPIRED_OR_FUTURE_INTENT');
 return x;
}
export function freshR29MainCycle(){
 return {schema:'sniper_r29_main_demo_local_cycle.v1',
  paper_only:true,real_wallet_untouched:true,
  consumed:false,buy_intent_id:null,buy_pos_id:null,
  sell_intent_id:null,completed:false,records:{}};
}
function validateCycle(c){
 if(c?.schema!=='sniper_r29_main_demo_local_cycle.v1'||
  c.paper_only!==true||c.real_wallet_untouched!==true||
  c.records===null||typeof c.records!=='object'||Array.isArray(c.records)||
  typeof c.completed!=='boolean'||typeof c.consumed!=='boolean')
  auditError('R29_MAIN_CYCLE_NOT_TRUSTED');
 return c;
}
function demoPosition(p){
 return p&&p.isDemo===true&&p.chain==='demo'&&
  p.tokenAddress===DEMO_MINT&&p.poolAddress===DEMO_POOL&&
  p.symbol==='TEST';
}
function safeMainState(s){
 if(!s||!Array.isArray(s.positions)||typeof s.entriesEnabled!=='boolean'||
  !Number.isFinite(s.cashUsdc)||!Number.isFinite(s.cashEur)||
  !Number.isFinite(s.closedPnl)||s.cashUsdc<0||s.cashEur<0)
  auditError('R29_MAIN_PAPER_STATE_INVALID');
 return s;
}
async function localhostCommand(fetcher,method,route,command=null){
 const config={method,redirect:'error',headers:{
  'accept':'application/json','origin':API,
  ...(method==='POST'?{'content-type':'application/json'}:{})
 },signal:AbortSignal.timeout(5500)};
 if(method==='POST')config.body=JSON.stringify(command);
 const res=await fetcher(API+route,config);
 if(!res?.ok)throw Error('R29_MAIN_LOCAL_HTTP_'+(res?.status||'FAIL'));
 const payload=await res.json();
 if(payload?.ok!==true)throw Error('R29_MAIN_LOCAL_RESPONSE_INVALID');
 return payload;
}
export async function processR29MainIntent(cycle,intent,{
 now=Date.now(),fetcher=fetch
}={}){
 validateCycle(cycle);
 const x=validateR29MainIntent(intent,{now});
 if(Object.hasOwn(cycle.records,x.intent_id))
  return {cycle,receipt:cycle.records[x.intent_id],duplicate:true};
 const state=safeMainState((await localhostCommand(fetcher,'GET','/api/state')).state);
 if(x.action==='BUY'){
  if(cycle.consumed||cycle.buy_intent_id||cycle.completed)
   auditError('R29_MAIN_ONE_BUY_ONLY_LOCKED');
  if(state.entriesEnabled!==true) auditError('R29_MAIN_BOT_NOT_ENABLED');
  if(state.cashEur+state.cashUsdc<amount) auditError('R29_MAIN_INSUFFICIENT_TEST_FUNDS');
  if(state.positions.some(demoPosition))auditError('R29_MAIN_EXISTING_DEMO_POSITION_BLOCKED');
  // A manual demo trade must never close someone else's open position, or
  // submit a real token/contract address to the local bot.
  await localhostCommand(fetcher,'POST','/api/command',{type:'DEMO_SIGNAL'});
  const bought=await localhostCommand(fetcher,'POST','/api/command',{
   type:'BUY',id:DEMO_ID,amount});
  const after=safeMainState(bought.state);
  const newPositions=after.positions.filter(p=>demoPosition(p)&&
   !state.positions.some(q=>q.id===p.id)&&p.amountUsdc===amount);
  if(newPositions.length!==1) auditError('R29_MAIN_BUY_UNCONFIRMED_RECONCILE_LOCALLY');
  const pos=newPositions[0];
  const receipt={intent_id:x.intent_id,action:'BUY',status:'PAPER_FILLED',
   asset:'R29_FIXED_TEST_COIN',size_test_usdc:50,
   local_position_created:true,open_demo_position:true,
   wallet_accessed:false,real_trade_executed:false,
   at_utc:new Date(now).toISOString()};
  const next={...cycle,consumed:true,buy_intent_id:x.intent_id,
   buy_pos_id:pos.id,records:{...cycle.records,[x.intent_id]:receipt}};
  return {cycle:next,receipt,duplicate:false};
 }
 if(!cycle.buy_intent_id||!cycle.buy_pos_id||cycle.completed||
  cycle.sell_intent_id) auditError('R29_MAIN_SELL_NOT_AUTHORIZED_BY_MATCHING_BUY');
 const p=state.positions.find(p=>p.id===cycle.buy_pos_id&&demoPosition(p));
 if(!p)auditError('R29_MAIN_ORIGINAL_DEMO_POSITION_MISSING');
 // Refresh *only* the existing synthetic demo mark with a zero-percent
 // demo move so the normal 3-minute quote freshness guard still applies.
 const moved=await localhostCommand(fetcher,'POST','/api/command',{
  type:'DEMO_MOVE',id:p.id,percent:0});
 if(!moved.state?.positions?.some(k=>k.id===p.id&&demoPosition(k)))
  auditError('R29_MAIN_DEMO_POSITION_CHANGED_AFTER_REFRESH');
 const sold=await localhostCommand(fetcher,'POST','/api/command',{
  type:'SELL',id:p.id});
 const after=safeMainState(sold.state);
 if(after.positions.some(k=>k.id===p.id)||after.positions.filter(demoPosition).length)
  auditError('R29_MAIN_SELL_UNCONFIRMED_RECONCILE_LOCALLY');
 const pnl=Math.round((after.closedPnl-state.closedPnl)*1e8)/1e8;
 const receipt={intent_id:x.intent_id,action:'SELL',status:'PAPER_FILLED',
  asset:'R29_FIXED_TEST_COIN',size_test_usdc:null,
  local_position_closed:true,open_demo_position:false,
  modelled_trade_pnl_test_usdc:pnl,
  wallet_accessed:false,real_trade_executed:false,
  at_utc:new Date(now).toISOString()};
 return {cycle:{...cycle,sell_intent_id:x.intent_id,completed:true,
  buy_pos_id:null,records:{...cycle.records,[x.intent_id]:receipt}},receipt,duplicate:false};
}
export function publicR29MainStatus(cycle,receipt,{now=Date.now(),error=null}={}){
 validateCycle(cycle);
 return {schema:R29_MAIN_STATUS_SCHEMA,target:'MAIN_PAPER_DEMO',
  mode:'PAPER_ONLY',checked_at_utc:new Date(now).toISOString(),
  dashboard_positions_updated_by_local_http:receipt?.status==='PAPER_FILLED',
  main_paper_demo_opt_in:true,
  wallet_accessed:false,real_trade_executed:false,
  no_balance_or_wallet_published:true,
  completed:cycle.completed,buy_verified:!!cycle.buy_intent_id,
  sell_verified:!!cycle.sell_intent_id,
  last_intent_id:receipt?.intent_id||null,
  last_action:receipt?.action||null,
  last_result:receipt?.status||null,
  modelled_trade_pnl_test_usdc:typeof receipt?.modelled_trade_pnl_test_usdc==='number'?
   receipt.modelled_trade_pnl_test_usdc:null,
  error:typeof error==='string'?error.slice(0,120):null,
  warning:'Only TEST coin in EXISTING user Paper account, never an executable market trade.'};
}
export function loadR29MainCycle(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))auditError('R29_MAIN_BAD_FILE');
 if(!existsSync(filename))return freshR29MainCycle();
 const raw=readFileSync(filename,'utf8');
 if(raw.length>30000)auditError('R29_MAIN_LOCAL_FILE_TOO_LARGE');
 return validateCycle(JSON.parse(raw));
}
export function saveR29MainCycle(filename,cycle){
 validateCycle(cycle);
 mkdirSync(path.dirname(filename),{recursive:true});
 const temp=filename+'.pending-'+process.pid;
 writeFileSync(temp,JSON.stringify(cycle,null,2)+'\n',{mode:0o600});
 renameSync(temp,filename);
}
