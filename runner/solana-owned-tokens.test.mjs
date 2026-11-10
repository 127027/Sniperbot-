import test from 'node:test';
import assert from 'node:assert/strict';
import {readSolanaOwnedTokens} from './solana-owned-tokens.mjs';
import {LEGACY_TOKEN_PROGRAM,TOKEN_2022_PROGRAM} from './solana-mint-risk.mjs';
import {SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';
const owner='So11111111111111111111111111111111111111112';
const mint='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const account=(program,amount='1234567',state='initialized')=>({
 account:{owner:program,data:{program:program===TOKEN_2022_PROGRAM?'spl-token-2022':'spl-token',
 parsed:{type:'account',
 info:{owner,mint,state,tokenAmount:{amount,decimals:6}}}}}});
function server({invalidOwner=false,freezeSecond=false}={}){
 const calls=[];
 const fetcher=async(url,opts)=>{
  assert.equal(url,SOLANA_MAINNET_RPC);
  const data=JSON.parse(opts.body);calls.push(data);
  const program=data.params[1].programId;
  const value=program===LEGACY_TOKEN_PROGRAM?
   [account(program),account(program,'100000')]:
   [account(program,'250000',freezeSecond?'frozen':'initialized')];
  if(invalidOwner)value[0].account.data.parsed.info.owner=mint;
  return new Response(JSON.stringify({
   jsonrpc:'2.0',id:1,result:{context:{slot:123456},value}}),{status:200});
 };
 return {fetcher,calls};
}
test('finalized SPL + token 2022 holdings are separate and not paper balance',async()=>{
 const mock=server({freezeSecond:true});
 const r=await readSolanaOwnedTokens(owner,{fetcher:mock.fetcher});
 assert.equal(mock.calls.length,2);
 assert(mock.calls.every(x=>x.method==='getTokenAccountsByOwner'));
 assert(mock.calls.every(x=>x.params[2].commitment==='finalized'));
 assert.equal(r.tokens.length,2);
 const legacy=r.tokens.find(x=>x.program_id===LEGACY_TOKEN_PROGRAM);
 assert.equal(legacy.ui_amount,'1.334567');
 const modern=r.tokens.find(x=>x.program_id===TOKEN_2022_PROGRAM);
 assert.equal(modern.ui_amount,'0.25');
 assert.equal(modern.account_state,'frozen');
 assert.equal(r.external_payment_confirmed,false);
 assert.equal(r.paper_ledger_unchanged,true);
 assert.equal(legacy.token_safety_verified,false);
});
test('wrong onchain account owner cannot inflate user holdings',async()=>{
 await assert.rejects(readSolanaOwnedTokens(owner,{fetcher:server({invalidOwner:true}).fetcher}),
  /TOKEN_ACCOUNT_DIFFERENT_OWNER/);
});
test('invalid wallet address cannot query arbitrary URLs',async()=>{
 let count=0;
 await assert.rejects(readSolanaOwnedTokens('https://attacker.test',{fetcher:async()=>{count++}}),
  /INVALID_SOLANA_ADDRESS/);
 assert.equal(count,0);
});
test('RPC failure never treats tokens as missing',async()=>{
 const fetcher=async()=>new Response('{}',{status:500});
 await assert.rejects(readSolanaOwnedTokens(owner,{fetcher}),/SOLANA_TOKEN_RPC_UNAVAILABLE/);
});

test('Solana RPC parsed program label at data.program must agree with actual owning program',async()=>{
 const fetcher=async(url,options)=>{
  const req=JSON.parse(options.body);
  const program=req.params[1].programId;
  const value=program===TOKEN_2022_PROGRAM?[account(LEGACY_TOKEN_PROGRAM)]:[];
  if(value.length)value[0].account.owner=program; // forged programId with legacy parsing
  return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{
   context:{slot:123},value}}),{status:200});
 };
 await assert.rejects(readSolanaOwnedTokens(owner,{fetcher}),/INVALID_SOLANA_TOKEN_ACCOUNT/);
});
