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
 token:{address:token},pairAddress:pool,
 chain:{id:'8453'},pair:{chainId:'8453',pair:{address:pool}},
 flags:[]});
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
 hp.simulationResult.sellTax=1;hp.pairAddress='0x'+'c'.repeat(40);
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

test('V5.5: only signed GPT PAPER may tolerate missing GoPlus flags with exact simulated sell',()=>{
 const now=Date.now(),partial=go();
 delete partial.result[token].hidden_owner;
 const s=assessEvmSecurityRaw({chain:'base',token,pool,goplus:partial,
  honeypot:honey(),now});
 const approved={chain:'base',token,pool,now,
  allowUnknownGoPlusRiskForGptPaper:true};
 assert.equal(s.approved,false);
 assert.equal(s.paper_unknown_goplus_risk_eligible,true);
 assert.equal(s.contract_authorities_ok,false);
 assert.equal(validatePaperSecurityEvidence(s,{chain:'base',token,pool,now}),false);
 assert.equal(validatePaperSecurityEvidence(s,approved),true);
 assert.equal(validatePaperSecurityEvidence(s,{...approved,now:now+121000}),false);
 assert.equal(validatePaperSecurityEvidence({...s,
  risk_flags:['GOPLUS_MISSING_HIDDEN_OWNER','GOPLUS_RISK_IS_PROXY']},approved),false);
 const explicitlyUnsafe=go();explicitlyUnsafe.result[token].is_proxy='1';
 assert.equal(validatePaperSecurityEvidence(assessEvmSecurityRaw({
  chain:'base',token,pool,goplus:explicitlyUnsafe,honeypot:honey(),now}),approved),false);
 const notMatched=honey();notMatched.pairAddress='0x'+'c'.repeat(40);
 assert.equal(validatePaperSecurityEvidence(assessEvmSecurityRaw({
  chain:'base',token,pool,goplus:partial,honeypot:notMatched,now}),approved),false);
 assert.equal(validatePaperSecurityEvidence(assessEvmSecurityRaw({
  chain:'base',token,pool,goplus:null,honeypot:honey(),now}),approved),false);
});

test('V5.6: real Honeypot.is v2 pool schema is accepted with correct token, chain and buy/sell simulation',async()=>{
 const at=Date.now(),doc=honey();
 assert.equal(doc.pairAddress,pool);
 assert.equal(doc.pair.pair.address,pool);
 const matches=assessEvmSecurityRaw({chain:'base',token,pool,
  goplus:go(),honeypot:doc,now:at});
 assert.equal(matches.approved,true);
 assert.equal(matches.exact_token_and_pair_verified,true);
 assert.equal(validatePaperSecurityEvidence(matches,{chain:'base',token,pool,now:at}),true);
 const topOnly={...doc,pair:undefined};
 assert.equal(assessEvmSecurityRaw({chain:'base',token,pool,
  goplus:go(),honeypot:topOnly,now:at}).approved,true,
  'documented root pairAddress is sufficient with token+chain');
 const nestedOnly={...doc,pairAddress:undefined};
 assert.equal(assessEvmSecurityRaw({chain:'base',token,pool,
  goplus:go(),honeypot:nestedOnly,now:at}).approved,true,
  'documented pair.pair.address is sufficient with token+chain');
 const wrongChain={...doc,chain:{id:'56'}};
 assert.equal(assessEvmSecurityRaw({chain:'base',token,pool,
  goplus:go(),honeypot:wrongChain,now:at}).approved,false);
 const wrongNestedChain={...doc,pair:{...doc.pair,chainId:'56'}};
 assert.equal(assessEvmSecurityRaw({chain:'base',token,pool,
  goplus:go(),honeypot:wrongNestedChain,now:at}).approved,false);
 const conflicting={...doc,pair:{...doc.pair,
  pair:{address:'0x'+'c'.repeat(40)}}};
 assert.equal(assessEvmSecurityRaw({chain:'base',token,pool,
  goplus:go(),honeypot:conflicting,now:at}).approved,false,
  'contradictory vendor aliases must fail closed');
 const missingIdentity={...doc,pairAddress:undefined,pair:undefined};
 assert.equal(assessEvmSecurityRaw({chain:'base',token,pool,
  goplus:go(),honeypot:missingIdentity,now:at}).approved,false);
 const mismatchedToken={...doc,token:{address:'0x'+'c'.repeat(40)}};
 assert.equal(assessEvmSecurityRaw({chain:'base',token,pool,
  goplus:go(),honeypot:mismatchedToken,now:at}).approved,false);
 const noSell={...doc,simulationSuccess:false};
 assert.equal(assessEvmSecurityRaw({chain:'base',token,pool,
  goplus:go(),honeypot:noSell,now:at}).approved,false);
 const fetched=await collectEvmSecurity({chain:'base',token,pool,now:at,
  fetcher:async url=>({ok:true,text:async()=>JSON.stringify(
   url.includes('gopluslabs')?go():doc)})});
 assert.equal(fetched.approved,true,'HTTP result with actual Honeypot v2 fields passes');
});
