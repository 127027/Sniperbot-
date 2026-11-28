import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectMint,evaluateExtensions,TOKEN_2022,RISK_SCOPE} from './risk.mjs';
const a='A'.repeat(32),now=1795876980000;
const metadata=[{extension:'metadataPointer',state:{authority:null,metadataAddress:a}},{extension:'tokenMetadata',state:{mint:a,updateAuthority:null}}];
const fixture=(extensions,owner=TOKEN_2022)=>async(u,o)=>{
 const method=JSON.parse(o.body).method;
 const value=method==='getAccountInfo'?{owner,space:250,data:{parsed:{type:'mint',info:{isInitialized:true,supply:'10000',decimals:6,mintAuthority:null,freezeAuthority:null,extensions}}}}:
 [{address:'B'.repeat(32),amount:'1000',decimals:6}];
 return {ok:true,json:async()=>({result:{context:{slot:100},value}})};
};
test('metadata-only Token-2022 can pass scoped checks, no claim of general safety',async()=>{
 const r=await inspectMint(a,fixture(metadata),()=>now);assert.equal(r.risk,'PASS');assert.equal(r.scope,RISK_SCOPE);
});
test('all transfer affecting or unknown extensions fail closed',async()=>{
 for(const extension of ['transferFeeConfig','transferHook','permanentDelegate','defaultAccountState','nonTransferable','pausableConfig','mintCloseAuthority','confidentialTransferMint','futureExtension']){
  const r=await inspectMint(a,fixture([{extension,state:{}}]),()=>now);assert.equal(r.risk,'FAIL',extension);
 }
});
test('unparsed, duplicated or incomplete extension evidence never passes',async()=>{
 for(const e of [undefined,null,[{extension:'metadataPointer',state:{}}],[metadata[0],metadata[0]]]){
  assert.equal((await inspectMint(a,fixture(e),()=>now)).risk,'UNKNOWN');
 }
 assert.equal(evaluateExtensions([]).unknown,false);
});
