import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {freshState} from './core.mjs';
import {encodeBase58} from './local-solana-vault.mjs';
import {AGENT_SIGNAL_SCHEMA,unsignedAgentSignal,verifyAgentSignal,
 applyAgentSignal} from './paper-agent-pipeline.mjs';
const deviceId='device_'+'a'.repeat(32);
const pool=encodeBase58(Buffer.alloc(32,11));
const token=encodeBase58(Buffer.alloc(32,12));
const token2=encodeBase58(Buffer.alloc(32,13));
// Core's paper ledger intentionally uses the wall clock to reject stale marks.
const at=Date.now()-2000;
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const keys=[{issuer:'sniper-dot-publisher',key_id:'test-controller-2026',
 scope:'agent_execution',public_key_pem:publicKey.export({format:'pem',type:'spki'})}];
function signal(overrides={}){
 const payload={schema:AGENT_SIGNAL_SCHEMA,target_device_id:deviceId,
 signal_id:'sig_'+'a'.repeat(32),issuer:'sniper-dot-publisher',key_id:'test-controller-2026',
 chain:'solana',action:'BUY',token_address:token,pool_address:pool,
 size_test_usdc:'50.00',created_at_utc:new Date(at-1000).toISOString(),
 expires_at_utc:new Date(at+35000).toISOString(),...overrides};
 return {...payload,
  signature:sign(null,Buffer.from(unsignedAgentSignal(payload),'utf8'),privateKey).toString('base64')};
}
function quote(p=0.05,overrides={}){
 return {chain:'solana',tokenAddress:token,poolAddress:pool,
  priceUsd:p,liquidityUsd:250000,symbol:'MEME-TEST',name:'Memecoin for Pipeline',
  asOf:new Date(at).toISOString(),...overrides};
}
function balance(){return {...freshState(),entriesEnabled:true,cashEur:50,
 cashUsdc:0,minTrade:50,maxTrade:200,portfolioBudgetUsdc:200}}
test('a REAL Ed25519-signed agent BUY consumes 50 virtual EUR and adds visible PAPER position',()=>{
 const {next,receipt}=applyAgentSignal(balance(),signal(),keys,{deviceId,now:at,quote:quote()});
 assert.equal(receipt.status,'PAPER_FILLED');
 assert.equal(receipt.real_trade_executed,false);
 assert.equal(receipt.wallet_debited,false);
 assert.equal(receipt.issuer,'sniper-dot-publisher');
 assert.equal(receipt.action,'BUY');
 assert.equal(receipt.requested_test_usdc,50);
 assert.equal(next.cashEur,0);
 assert.equal(next.cashUsdc,0);
 assert.equal(next.positions.length,1);
 const p=next.positions[0];
 assert.equal(p.tokenAddress,token);
 assert.equal(p.poolAddress,pool);
 assert.equal(p.chain,'solana');
 assert.equal(p.status,'PAPER_ONLY');
 assert.equal(p.isDemo,false);
 assert.equal(p.amountUsdc,50);
 assert(p.qty>0);
 assert.equal(next.agentOrderReceipts.length,1);
 const again=applyAgentSignal(next,signal(),keys,{deviceId,now:at,quote:quote()});
 assert.equal(again.receipt.duplicate,true);
 assert.equal(again.next,next,'exact replay cannot double buy');
});
test('market rises and signed SELL closes that exact PAPER position with P&L but no blockchain transaction',()=>{
 const bought=applyAgentSignal(balance(),signal(),keys,{deviceId,now:at,quote:quote()}).next;
 const sell=signal({action:'SELL',size_test_usdc:null,signal_id:'sig_'+'b'.repeat(32)});
 const {next,receipt}=applyAgentSignal(bought,sell,keys,{deviceId,now:at+1000,
  quote:quote(0.1,{asOf:new Date(at+1000).toISOString()})});
 assert.equal(receipt.status,'PAPER_FILLED');
 assert.equal(receipt.action,'SELL');
 assert.equal(next.positions.length,0);
 assert(next.cashUsdc>50,'profit re-enters PAPER USD account');
 assert(next.closedPnl>0);
 assert.equal(receipt.closed_pnl_test_usdc,next.closedPnl);
 assert.equal(receipt.real_trade_executed,false);
 assert.equal(next.agentOrderReceipts.length,2);
 assert.equal(next.agentOrderReceipts[0].status,'PAPER_FILLED');
});
test('market drops and signed SELL records negative paper return',()=>{
 const bought=applyAgentSignal(balance(),signal(),keys,{deviceId,now:at,quote:quote()}).next;
 const sell=signal({action:'SELL',size_test_usdc:null,signal_id:'sig_'+'c'.repeat(32)});
 const {next,receipt}=applyAgentSignal(bought,sell,keys,{deviceId,now:at+1000,
  quote:quote(0.01,{asOf:new Date(at+1000).toISOString()})});
 assert.equal(receipt.status,'PAPER_FILLED');
 assert(next.closedPnl<0);
 assert(next.cashUsdc<50);
});
test('unspecified signer, tampering, wrong device or expired signals cannot touch paper ledger',()=>{
 const initial=balance();
 for(const modified of [
  {...signal(),target_device_id:'device_'+'b'.repeat(32)},
  {...signal(),size_test_usdc:'150.00'},
  {...signal(),token_address:token2},
  {...signal(),signature:'bad'}
 ]){
  assert.throws(()=>applyAgentSignal(initial,modified,keys,{deviceId,now:at,quote:quote()}));
 }
 assert.throws(()=>verifyAgentSignal(signal(),[],{deviceId,now:at}),/UNTRUSTED/);
 assert.throws(()=>applyAgentSignal(initial,signal(),keys,{deviceId,now:at+120000,quote:quote()}),/STALE/);
 assert.equal(initial.cashEur,50);
 assert.equal(initial.positions.length,0);
});
test('off bot, insufficient budget and wrong/fabricated quote are recorded BLOCKED without fills',()=>{
 const b=balance();b.entriesEnabled=false;
 const x=applyAgentSignal(b,signal(),keys,{deviceId,now:at,quote:quote()});
 assert.equal(x.receipt.status,'BLOCKED');assert.equal(x.receipt.reason,'PAPER_BOT_OFF');
 assert.equal(x.next.positions.length,0);
 const poor=balance();poor.cashEur=20;
 const y=applyAgentSignal(poor,signal(),keys,{deviceId,now:at,quote:quote()});
 assert.equal(y.receipt.reason,'PAPER_BUDGET_OR_FUNDS_INSUFFICIENT');
 for(const q of [
  null,quote(-1),quote(0.02,{liquidityUsd:200}),
  quote(0.02,{tokenAddress:token2}),quote(0.02,{poolAddress:token2}),
  quote(0.02,{asOf:new Date(at-100000).toISOString()})
 ]){
  const z=applyAgentSignal(balance(),signal(),keys,{deviceId,now:at,quote:q});
  assert.equal(z.receipt.status,'BLOCKED');
  assert.equal(z.next.positions.length,0);
  assert.equal(z.next.cashEur,50);
 }
});
test('different token and same symbol do not accidentally sell somebody else\'s position',()=>{
 const bought=applyAgentSignal(balance(),signal(),keys,{deviceId,now:at,quote:quote()}).next;
 const other=signal({action:'SELL',size_test_usdc:null,token_address:token2,
  signal_id:'sig_'+'d'.repeat(32)});
 const {next,receipt}=applyAgentSignal(bought,other,keys,{deviceId,now:at,
  quote:quote(0.1,{tokenAddress:token2})});
 assert.equal(receipt.status,'NOOP');
 assert.equal(next.positions.length,1);
 assert.equal(next.positions[0].tokenAddress,token);
});
