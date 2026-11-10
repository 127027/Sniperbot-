import test from 'node:test';
import assert from 'node:assert/strict';
import {checkReadOnlyOnchainExistence} from './onchain-existence-readback.mjs';
const now='2026-11-10T14:00:00Z';
const evm={chain:'base',token_address:'0x'+'a'.repeat(40),
 pool_address:'0x'+'b'.repeat(40)};
evm.candidate_id='base:'+evm.token_address+':'+evm.pool_address;
const sol={chain:'solana',token_address:'So11111111111111111111111111111111111111112',
 pool_address:'9KNZ2WoEC2bpL3HeKaT3B7B73Wbv8Kgwz5NmRMT2qZ2H'};
sol.candidate_id='solana:'+sol.token_address+':'+sol.pool_address;
function evmFetcher({chain='0x2105',tokenCode='0x6001',poolCode='0x6002'}={}){
 const calls=[];
 const fetcher=async(url,opt)=>{
  const j=JSON.parse(opt.body);calls.push([url,j.method,j.params]);
  const result=j.method==='eth_chainId'?chain:j.params[0]===evm.token_address?tokenCode:poolCode;
  return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result}),{status:200});
 };
 return {fetcher,calls};
}
test('direct verified Base chain ID and bytecode existence never become contract safety PASS',async()=>{
 const f=evmFetcher();
 const r=await checkReadOnlyOnchainExistence(evm,{fetcher:f.fetcher,now});
 assert.equal(r.existence_status,'CODE_PRESENT',r.reason);
 assert.equal(r.token_account_or_contract_exists,true);
 assert.equal(r.pool_account_or_contract_exists,true);
 assert.equal(r.contract_security,'UNKNOWN');
 assert.equal(r.honeypot,'UNKNOWN');
 assert.equal(r.sellability,'UNKNOWN');
 assert.equal(r.amount_specific_sell_quote,false);
 assert.equal(r.paper_entry_authorized,false);
 assert.equal(f.calls.length,3);
 assert(f.calls.every(x=>x[1]==='eth_chainId'||x[1]==='eth_getCode'));
});
test('wrong chain, absent pool code, RPC outage all fail closed',async()=>{
 const wrong=evmFetcher({chain:'0x38'});
 const a=await checkReadOnlyOnchainExistence(evm,{fetcher:wrong.fetcher,now});
 assert.equal(a.reason,'RPC_WRONG_CHAIN');
 assert.equal(wrong.calls.length,1);
 const absent=evmFetcher({poolCode:'0x'});
 const b=await checkReadOnlyOnchainExistence(evm,{fetcher:absent.fetcher,now});
 assert.equal(b.existence_status,'UNKNOWN');
 assert.equal(b.pool_account_or_contract_exists,false);
 const blocked=await checkReadOnlyOnchainExistence(evm,{
  fetcher:async()=>{throw Error('NO_NETWORK')},now});
 assert.equal(blocked.reason,'RPC_UNAVAILABLE_OR_MALFORMED');
});
test('Solana direct account existence is only an observation, not a mint-risk audit',async()=>{
 let count=0;
 const fetcher=async(url,opt)=>{
  count++;const j=JSON.parse(opt.body);
  assert.equal(j.method,'getAccountInfo');
  return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,
   result:{context:{slot:1},value:{owner:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',lamports:3000}}}),
   {status:200});
 };
 const r=await checkReadOnlyOnchainExistence(sol,{fetcher,now});
 assert.equal(count,2);
 assert.equal(r.existence_status,'ACCOUNTS_REPORTED');
 assert.equal(r.honeypot,'UNKNOWN');
 assert.equal(r.paper_entry_authorized,false);
});
test('malicious address is refused before external network access',async()=>{
 let requests=0;
 const r=await checkReadOnlyOnchainExistence({...evm,pool_address:'http://evil.example'},{
  fetcher:async()=>{requests++;throw Error('SHOULD_NOT_RUN')},now});
 assert.equal(r.reason,'INVALID_CHAIN_TOKEN_POOL');
 assert.equal(requests,0);
});
