// R29: STRICT isolated GitHub-paper transport contract (no live execution).
// ChatGPT writes ONE intent; GitHub Actions or a *separate* Windows sandbox
// signs internally with an ephemeral QA key, applies the existing paper
// agent ledger, and writes a receipt. Never touches the user's portfolio.
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {freshState} from '../../runner/core.mjs';
import {encodeBase58} from '../../runner/local-solana-vault.mjs';
import {AGENT_SIGNAL_SCHEMA,unsignedAgentSignal,applyAgentSignal} from '../../runner/paper-agent-pipeline.mjs';
export const R29_SCHEMA='sniper_r29_isolated_paper_intent.v1';
export const R29_LEDGER_SCHEMA='sniper_r29_isolated_ledger.v1';
export const R29_RECEIPT_SCHEMA='sniper_r29_isolated_receipt.v1';
export const R29_MASTER_PATH='research/r29/MASTER_ANALYSE.md';
export const R29_BRANCH='codex/r29-chatgpt-github-paper-cycle-20261115';
export const R29_INTENT_PATH='research/r29/channel/latest-intent.json';
export const R29_LEDGER_PATH='research/r29/channel/ci-ledger.json';
export const R29_RECEIPT_PATH='research/r29/channel/ci-receipt.json';
export const R29_WINDOWS_STATUS_PATH='research/r29/channel/windows-status.json';
export const R29_TEST_ASSET='R29_SYNTHETIC_DISPOSABLE';
export const R29_TEST_MINT=encodeBase58(Buffer.alloc(32,41));
export const R29_TEST_POOL=encodeBase58(Buffer.alloc(32,42));
const DEVICE='device_'+'a'.repeat(32);
const SESSION_ISSUER='r29-isolated-sandbox';
const SESSION_KEY='r29-ephemeral-qa-key';
const sha=x=>createHash('sha256').update(x).digest('hex');
const canon=x=>JSON.stringify(x,Object.keys(x).sort());
const must=(v,why)=>{if(!v)throw Error(why)};
const time=t=>typeof t==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(t)?
 Date.parse(t):NaN;
export function validateR29Intent(raw,{now=Date.now(),target}={}){
 must(raw&&typeof raw==='object'&&!Array.isArray(raw) &&
  Object.keys(raw).sort().join(',')==='action,amount_test_usdc,asset,created_at_utc,expires_at_utc,intent_id,mode,reason,schema,target',
  'R29_INTENT_FIELDS_INVALID');
 must(raw.schema===R29_SCHEMA&&raw.mode==='ISOLATED_PAPER_TEST'&&
  ['CI_SANDBOX','WINDOWS_SANDBOX'].includes(raw.target)&&
  (!target||raw.target===target)&&
  /^r29_[0-9a-f]{32}$/.test(raw.intent_id)&&
  ['BUY','SELL'].includes(raw.action)&&
  raw.asset===R29_TEST_ASSET&&
  (raw.action==='BUY'?raw.amount_test_usdc==='50.00':raw.amount_test_usdc===null)&&
  typeof raw.reason==='string'&&raw.reason.length>=8&&raw.reason.length<=180,
  'R29_UNAUTHORIZED_TEST_INTENT');
 const created=time(raw.created_at_utc),expiry=time(raw.expires_at_utc);
 must(Number.isFinite(created)&&Number.isFinite(expiry)&&
  created<=now+30000&&expiry>now&&expiry>created&&expiry-created<=3600000,
  'R29_INTENT_STALE_OR_CLOCK_INVALID');
 return {...raw};
}
export function initialR29Ledger({target='CI_SANDBOX'}={}){
 must(['CI_SANDBOX','WINDOWS_SANDBOX'].includes(target),'R29_BAD_TARGET');
 return {schema:R29_LEDGER_SCHEMA,target,
  mode:'ISOLATED_PAPER_TEST',original_user_paper_untouched:true,
  real_trading_enabled:false,origin:'R29_SYNTHETIC_TEST_ONLY',
  initial_test_usdc:5000,
  state:{...freshState(),entriesEnabled:true,cashUsdc:5000,
   minTrade:50,maxTrade:50,portfolioBudgetUsdc:5000},
  applied_intents:{}};
}
export function projectR29SandboxState(ledger){
 must(ledger?.schema===R29_LEDGER_SCHEMA&&ledger.original_user_paper_untouched===true&&
  ledger.real_trading_enabled===false&&Array.isArray(ledger.state?.positions),
  'R29_LEDGER_INVALID');
 const s=ledger.state;
 return {schema:'sniper_r29_sandbox_status.v1',target:ledger.target,
  mode:'ISOLATED_PAPER_TEST',user_paper_modified:false,
  real_wallet_touched:false,real_trading_enabled:false,
  opening_balance_test_usdc:ledger.initial_test_usdc,
  cash_balance_test_usdc:Number((s.cashEur+s.cashUsdc).toFixed(8)),
  open_positions:s.positions.map(p=>({
   asset:R29_TEST_ASSET,amount_test_usdc:p.amountUsdc,
   quantity:p.qty,indicative_entry_price:p.entryPriceUsd,
   paper_only:true})),
  closed_pnl_test_usdc:s.closedPnl,
  completed_intent_count:Object.keys(ledger.applied_intents||{}).length,
  note:'Synthetic fixed prices, no real-market quotes or ChatGPT-live-coin research.'};
}
export function applyR29SandboxIntent(ledger,raw,{
 now=Date.now(),target='CI_SANDBOX'
}={}){
 const order=validateR29Intent(raw,{now,target});
 must(ledger?.schema===R29_LEDGER_SCHEMA&&ledger.target===target&&
  ledger.mode==='ISOLATED_PAPER_TEST'&&
  ledger.original_user_paper_untouched===true&&
  ledger.real_trading_enabled===false&&
  ledger.state?.entriesEnabled===true&&
  ledger.state.cashUsdc<=100000&&
  Array.isArray(ledger.state.agentOrderReceipts),
  'R29_SANDBOX_LEDGER_NOT_TRUSTED');
 const digest=sha(JSON.stringify(order));
 const seen=ledger.applied_intents||{};
 if(Object.hasOwn(seen,order.intent_id)){
  if(seen[order.intent_id]!==digest)throw Error('R29_INTENT_REPLAY_CONFLICT');
  return {ledger,receipt:{schema:R29_RECEIPT_SCHEMA,intent_id:order.intent_id,
   action:order.action,target,status:'DUPLICATE_ALREADY_APPLIED',
   original_user_paper_untouched:true,real_trading_enabled:false,
   sandbox_state:projectR29SandboxState(ledger),input_sha256:digest,
   observed_at_utc:new Date(now).toISOString()}};
 }
 // Fixed synthetic assets and price; incoming GPT has zero control over
 // quotes, key material, wallet path, target account, or capital.
 const pair=generateKeyPairSync('ed25519');
 const keys=[{issuer:SESSION_ISSUER,key_id:SESSION_KEY,
  scope:'agent_execution',
  public_key_pem:pair.publicKey.export({format:'pem',type:'spki'})}];
 const unsigned={schema:AGENT_SIGNAL_SCHEMA,
  target_device_id:DEVICE,signal_id:'sig_'+order.intent_id.slice(4),
  issuer:SESSION_ISSUER,key_id:SESSION_KEY,
  chain:'solana',action:order.action,
  token_address:R29_TEST_MINT,pool_address:R29_TEST_POOL,
  size_test_usdc:order.action==='BUY'?'50.00':null,
  created_at_utc:new Date(now-500).toISOString(),
  expires_at_utc:new Date(now+55000).toISOString()};
 const cmd={...unsigned,signature:sign(null,
  Buffer.from(unsignedAgentSignal(unsigned)),pair.privateKey).toString('base64')};
 const priceUsd=order.action==='BUY'?0.05:0.08;
 const quote={chain:'solana',tokenAddress:R29_TEST_MINT,poolAddress:R29_TEST_POOL,
  priceUsd,liquidityUsd:100000,volume5mUsd:10000,
  symbol:'R29_QA',name:R29_TEST_ASSET,asOf:new Date(now).toISOString()};
 const result=applyAgentSignal(ledger.state,cmd,keys,{
  deviceId:DEVICE,source:'GITHUB_SIGNED_COURIER',now,quote,syntheticTest:true});
 const next={...ledger,state:result.next,
  applied_intents:{...seen,[order.intent_id]:digest}};
 // Blocked test commands are still recorded as accepted tests, but are
 // never reported as executed.
 return {ledger:next,receipt:{
  schema:R29_RECEIPT_SCHEMA,intent_id:order.intent_id,
  action:order.action,target,
  status:result.receipt.status,
  reason:result.receipt.reason,
  signed_paper_command_verified:result.receipt.status==='PAPER_FILLED',
  synthetic_only:true,
  actual_windows_bot_connected:false,
  original_user_paper_untouched:true,real_trading_enabled:false,
  quote_execution_evidence:'SYNTHETIC_FIXTURE_NOT_EXECUTABLE_DEX',
  input_sha256:digest,
  sandbox_state:projectR29SandboxState(next),
  observed_at_utc:new Date(now).toISOString(),
  paper_receipt:{
   action:result.receipt.action,status:result.receipt.status,
   closed_pnl_test_usdc:result.receipt.closed_pnl_test_usdc,
   wallet_debited:result.receipt.wallet_debited,real_trade_executed:false
  }}};
}
