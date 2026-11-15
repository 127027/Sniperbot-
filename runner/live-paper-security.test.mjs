import test from 'node:test';
import assert from 'node:assert/strict';
import {assessEvmSecurityRaw,validatePaperSecurityEvidence,
 collectEvmSecurity} from './live-paper-security.mjs';

const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40);
const fields={is_open_source:'1',is_proxy:'0',is_mintable:'0',
 hidden_owner:'0',can_take_back_ownership:'0',owner_change_balance:'0',
 transfer_pausable:'0',is_blacklisted:'0',is_whitelisted:'0',
 is_honeypot:'0',cannot_buy:'0',cannot_sell_all:'0',
 slippage_modifiable:'0'};
const go=()=>({code:1,result:{[token]:{...fields}}});
const honey=()=>({simulationSuccess:true,honeypotResult:{isHoneypot:false},
 simulationResult:{buyTax:1,sellTax:1},
 token:{address:token},pair:{pairAddress:pool},flags:[]});
test('independent GoPlus + exact Honeypot simulation can pass ONLY known explicit fields',()=>{
 const at=Date.now();
 const r=assessEvmSecurityRaw({chain:'base',token,pool,
  goplus:go(),honeypot:honey(),now:at});
 assert.equal(r.approved,true);
 assert.equal(r.security_is_guaranteed,false);
 assert.equal(r.independent_executable_quote_verified,false);
 assert.equal(r.risk_flags.length,0);
 assert.equal(validatePaperSecurityEvidence(r,{chain:'base',token,pool,now:at}),true);
 assert.equal(validatePaperSecurityEvidence(r,{chain:'base',token,pool,now:at+121000}),false);
 assert.equal(validatePaperSecurityEvidence(r,{chain:'bsc',token,pool,now:at}),false);
});
test('reject risky or absent contract checks, honeypots, unsimulated sells, taxes, wrong token or pool',()=>{
 const base={chain:'base',token,pool,goplus:go(),honeypot:honey()};
 for(const key of ['is_proxy','is_mintable','hidden_owner','transfer_pausable',
   'is_blacklisted','cannot_sell_all','is_honeypot']){
  const copy=go();copy.result[token][key]='1';
  assert.equal(assessEvmSecurityRaw({...base,goplus:copy}).approved,false,key);
  delete copy.result[token][key];
  assert.equal(assessEvmSecurityRaw({...base,goplus:copy}).approved,false,'missing '+key);
 }
 const noSource=go();noSource.result[token].is_open_source='0';
 assert.equal(assessEvmSecurityRaw({...base,goplus:noSource}).approved,false);
 const hp=honey();hp.honeypotResult.isHoneypot=true;
 assert.equal(assessEvmSecurityRaw({...base,honeypot:hp}).approved,false);
 hp.honeypotResult.isHoneypot=false;hp.simulationSuccess=false;
 assert.equal(assessEvmSecurityRaw({...base,honeypot:hp}).approved,false);
 hp.simulationSuccess=true;hp.simulationResult.sellTax=55;
 assert.equal(assessEvmSecurityRaw({...base,honeypot:hp}).approved,false);
 hp.simulationResult.sellTax=1;hp.pair.pairAddress='0x'+'c'.repeat(40);
 assert.equal(assessEvmSecurityRaw({...base,honeypot:hp}).approved,false);
 assert.equal(assessEvmSecurityRaw({...base,honeypot:null}).approved,false);
});
test('free read-only providers are restricted and fail closed on network errors',async()=>{
 const calls=[];
 const fake=async url=>{
  calls.push(url);
  if(url.includes('goplus'))return {ok:true,text:async()=>JSON.stringify(go())};
  return {ok:true,text:async()=>JSON.stringify(honey())};
 };
 const s=await collectEvmSecurity({chain:'base',token,pool,fetcher:fake});
 assert.equal(s.approved,true);
 assert.equal(calls.length,2);
 assert(calls[0].startsWith('https://api.gopluslabs.io/api/v1/token_security/8453'));
 assert(calls[1].startsWith('https://api.honeypot.is/v2/IsHoneypot'));
 const fail=await collectEvmSecurity({chain:'base',token,pool,
  fetcher:async()=>{throw Error('failed')}});
 assert.equal(fail.approved,false);
 assert.equal(fail.provider_errors.length,2);
 await assert.rejects(collectEvmSecurity({chain:'solana',token,pool,fetcher:fake}),/INVALID_EVM_IDENTITY/);
});
