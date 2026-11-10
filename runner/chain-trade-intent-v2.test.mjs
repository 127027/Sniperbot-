import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {encodeBase58} from './local-solana-vault.mjs';
import {verifySignedTradeIntent,unsignedTradeIntent,TRADE_V2_SCHEMA} from './chain-trade-intent-v2.mjs';
const device='device_'+'a'.repeat(32),other='device_'+'b'.repeat(32);
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const registry=[{issuer:'research-control',key_id:'central-2026',
 scope:'agent_execution',public_key_pem:publicKey.export({format:'pem',type:'spki'})}];
const at=Date.parse('2026-11-10T20:00:00Z');
const usdc='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const first=encodeBase58(Buffer.alloc(32,21)),second=encodeBase58(Buffer.alloc(32,22));
function signed(mods={}){
 const base={schema:TRADE_V2_SCHEMA,target_device_id:device,
  command_id:'cmd_'+'1'.repeat(32),issuer:'research-control',key_id:'central-2026',
  chain:'solana',action:'BUY',token_address:first,pool_address:null,
  input_asset:usdc,output_asset:first,
  input_amount_atoms:'50000000',min_receive_atoms:'2000',
  max_slippage_bps:300,created_at_utc:new Date(at-2000).toISOString(),
  expires_at_utc:new Date(at+50000).toISOString(),...mods};
 return {...base,signature:sign(null,Buffer.from(unsignedTradeIntent(base)),privateKey).toString('base64')};
}
test('new dynamic Solana mint is addressed by chain/mint, not any hardcoded token symbol',()=>{
 const cmd=signed();
 const v=verifySignedTradeIntent(cmd,registry,{deviceId:device,now:at});
 assert.equal(v.verified,true);assert.equal(v.action,'BUY');
 assert.equal(v.token_address,first);assert.equal(v.input_asset,usdc);
 assert.equal(v.amount_atoms,'50000000');assert.equal(v.live_trading_enabled,false);
 const another=signed({token_address:second,output_asset:second,
  command_id:'cmd_'+'2'.repeat(32)});
 assert.equal(verifySignedTradeIntent(another,registry,{deviceId:device,now:at}).token_address,second);
});
test('agent sell can return dynamic new token to user-chosen output asset without naming whitelist',()=>{
 const sell=signed({action:'SELL',token_address:first,input_asset:first,
  output_asset:usdc,command_id:'cmd_'+'3'.repeat(32)});
 const v=verifySignedTradeIntent(sell,registry,{deviceId:device,now:at});
 assert.equal(v.action,'SELL');assert.equal(v.output_asset,usdc);
 assert.equal(v.signing_enabled,false);
});
test('future Base/Ethereum/BNB contract-based orders validate identity but never gain live status',()=>{
 for(const chain of ['eth','base','bsc']){
  const token='0x'+'a'.repeat(40),input='0x'+'b'.repeat(40);
  const cmd=signed({chain,input_asset:input,output_asset:token,
   token_address:token,pool_address:'0x'+'c'.repeat(40)});
  const v=verifySignedTradeIntent(cmd,registry,{deviceId:device,now:at});
  assert.equal(v.network,chain==='base'?'eip155:8453':chain==='eth'?'eip155:1':'eip155:56');
  assert.equal(v.live_trading_enabled,false);
 }
});
test('wrong device, modified coin, tampering, expired or unknown publisher blocked',()=>{
 const cmd=signed();
 assert.throws(()=>verifySignedTradeIntent(cmd,registry,{deviceId:other,now:at}),/DIFFERENT_DEVICE/);
 for(const update of [
  {input_amount_atoms:'50000001'},{min_receive_atoms:'1'},
  {token_address:second},{output_asset:second},{action:'SELL'},
  {chain:'base'},{pool_address:'javascript:attack'},
  {max_slippage_bps:1500},{signature:'invalid'},
  {extra_field:'BAD'},{expires_at_utc:new Date(at-5).toISOString()}
 ]){
  assert.throws(()=>verifySignedTradeIntent({...cmd,...update},registry,{deviceId:device,now:at}));
 }
 assert.throws(()=>verifySignedTradeIntent(cmd,[],{deviceId:device,now:at}),/NO_TRUSTED/);
 assert.throws(()=>verifySignedTradeIntent(cmd,[{...registry[0],revoked:true}],{deviceId:device,now:at}),/NO_TRUSTED/);
});
test('BUY/SELL asset mismatch and unknown chain are invalid even when signed',()=>{
 for(const p of [
  {token_address:second},{action:'SELL'}, {output_asset:usdc},
  {chain:'dogecoin'},{input_asset:first,output_asset:first},
  {chain:'base',input_asset:usdc,output_asset:first}
 ]){
  assert.throws(()=>verifySignedTradeIntent(signed(p),registry,{deviceId:device,now:at}));
 }
});
