// On-demand, IN-MEMORY Paper pipeline diagnostic for a user's laptop.
// This is a TEST SENDER, emphatically NOT any of the five real Cloud Dots.
// No existing paper account, private wallet or external network is accessed.
import {generateKeyPairSync,sign,randomBytes} from 'node:crypto';
import {freshState} from './core.mjs';
import {encodeBase58} from './local-solana-vault.mjs';
import {AGENT_SIGNAL_SCHEMA,unsignedAgentSignal,
 applyAgentSignal} from './paper-agent-pipeline.mjs';
const MINT=encodeBase58(Buffer.alloc(32,41));
const POOL=encodeBase58(Buffer.alloc(32,42));
const ISSUER='isolated-laptop-qa-sender';
const KEY_ID='disposable-qa-only';
export function runIsolatedPaperAgentSelfTest({deviceId,now=Date.now()}={}){
 if(!/^device_[a-f0-9]{32}$/.test(deviceId||''))
  throw Error('SELFTEST_INVALID_LOCAL_DEVICE');
 const pair=generateKeyPairSync('ed25519');
 const pub=pair.publicKey.export({format:'pem',type:'spki'});
 const trust=[{issuer:ISSUER,key_id:KEY_ID,scope:'agent_execution',
  public_key_pem:pub}];
 const message=action=>{
  const payload={schema:AGENT_SIGNAL_SCHEMA,target_device_id:deviceId,
   signal_id:'sig_'+randomBytes(16).toString('hex'),issuer:ISSUER,key_id:KEY_ID,
   chain:'solana',action,token_address:MINT,pool_address:POOL,
   size_test_usdc:action==='BUY'?'50.00':null,
   created_at_utc:new Date(now-500).toISOString(),
   expires_at_utc:new Date(now+45000).toISOString()};
  return {...payload,signature:sign(null,Buffer.from(unsignedAgentSignal(payload)),
   pair.privateKey).toString('base64')};
 };
 const quote=(price,at)=>({
  chain:'solana',tokenAddress:MINT,poolAddress:POOL,
  priceUsd:price,liquidityUsd:1000000,
  symbol:'LOCAL_QA',name:'Disposable In-Memory Sniper Coin',
  asOf:new Date(at).toISOString()
 });
 const createLedger=()=>({...freshState(),entriesEnabled:true,
  cashEur:50,minTrade:50,maxTrade:100,portfolioBudgetUsdc:100});
 const roundTrip=exitPrice=>{
  const buy=applyAgentSignal(createLedger(),message('BUY'),trust,{
   syntheticTest:true,deviceId,now,quote:quote(0.05,now)});
  if(buy.receipt.status!=='PAPER_FILLED'||buy.next.positions.length!==1)
   throw Error('SELFTEST_SIGNED_BUY_NOT_FILLED');
  const sell=applyAgentSignal(buy.next,message('SELL'),trust,{
   syntheticTest:true,deviceId,now,quote:quote(exitPrice,now)});
  if(sell.receipt.status!=='PAPER_FILLED'||sell.next.positions.length!==0||
   sell.next.agentOrderReceipts.length!==2)
   throw Error('SELFTEST_SIGNED_SELL_NOT_FILLED');
  return {buy_status:buy.receipt.status,sell_status:sell.receipt.status,
   quote_entry_price_usd:0.05,quote_exit_price_usd:exitPrice,
   pnl_test_usdc:sell.next.closedPnl,
   final_paper_cash_test_usdc:sell.next.cashUsdc,
   open_positions:0};
 };
 const rising=roundTrip(0.1),falling=roundTrip(0.02);
 if(!(rising.pnl_test_usdc>0&&falling.pnl_test_usdc<0))
  throw Error('SELFTEST_PNL_DIRECTION_INVALID');
 return {
  schema:'sniper_paper_pipeline_selftest.v1',
  status:'PASSED',sender:'ISOLATED_LOCAL_TEST_SENDER_NOT_A_REAL_DOT',
  signed_buy_and_sell:true,
  paper_ledger_events_per_scenario:2,
  rising_market:rising,falling_market:falling,
  cloud_dot_order_received:false,cloud_dot_signer_verified:false,
  existing_paper_account_changed:false,
  existing_wallet_accessed:false,private_key_saved:false,
  remote_payment_or_trade:false,
  message:'Nur ein isolierter Testsender. Prüft die lokale Paper-Orderlogik; bestätigt KEINE Verbindung zu den fünf echten Cloud-Dots.'
 };
}
