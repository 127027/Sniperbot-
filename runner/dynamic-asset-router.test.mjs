import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeBase58} from './local-solana-vault.mjs';
import {SOL_MINT} from './solana-swap-quote.mjs';
import {LEGACY_TOKEN_PROGRAM,TOKEN_2022_PROGRAM} from './solana-mint-risk.mjs';
import {previewDynamicAssetRoute} from './dynamic-asset-router.mjs';
const owner=encodeBase58(Buffer.alloc(32,8));
const usdc='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const NEW_A=encodeBase58(Buffer.alloc(32,9));
const NEW_B=encodeBase58(Buffer.alloc(32,10));
const makeMock=({sol=100000000,usdcAmount='50000000',newAmount='12345',
 outAtoms='123456789',quoteFailure=false,frozen=false}={})=>{
 const requests=[];
 const fetcher=async(url,opts)=>{
  requests.push({url,opts});
  if(new URL(url).hostname==='api.jup.ag'){
   if(quoteFailure)return new Response('{}',{status:503});
   const q=new URL(url).searchParams;
   assert.equal(opts.method,'GET');
   assert.equal(q.has('taker'),false);
   assert.equal(q.has('signedTransaction'),false);
   return new Response(JSON.stringify({transaction:null,
    router:'metis',inAmount:q.get('amount'),outAmount:outAtoms,feeBps:3}));
  }
  const req=JSON.parse(opts.body);
  assert.equal(req.jsonrpc,'2.0');
  let result;
  if(req.method==='getBalance'){
   result={context:{slot:10000},value:sol};
  }else if(req.method==='getTokenAccountsByOwner'){
   const program=req.params[1].programId;
   const token=program===LEGACY_TOKEN_PROGRAM?
    [{mint:usdc,amount:usdcAmount,decimals:6},
     {mint:NEW_A,amount:newAmount,decimals:9}]:[];
   result={context:{slot:10000},value:token.map(t=>({
    account:{owner:program,data:{program:'spl-token',parsed:{type:'account',
     info:{owner,mint:t.mint,state:frozen&&t.mint===usdc?'frozen':'initialized',
      tokenAmount:{amount:t.amount,decimals:t.decimals,
       uiAmountString:t.mint===usdc?'50':'0.000012345'}}}}}}
   }))};
  }else throw Error('UNEXPECTED_RPC_METHOD_'+req.method);
  return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result}),{status:200});
 };
 return {fetcher,requests};
};
test('arbitrary new Solana mint gets real USDC quote with exactly 50 USDC raw atoms, no coin allowlist',async()=>{
 const f=makeMock();
 const result=await previewDynamicAssetRoute({
  chain:'solana',owner,inputAsset:usdc,outputAsset:NEW_B,
  amountAtoms:'50000000',minReceiveAtoms:'100',fetcher:f.fetcher});
 assert.equal(result.status,'QUOTE_OBSERVED_NO_TRADE');
 assert.equal(result.input_mint,usdc);
 assert.equal(result.output_mint,NEW_B);
 assert.equal(result.indicative_output_atoms,'123456789');
 assert.equal(result.input_available_atoms,'50000000');
 assert.equal(result.token_universe,'DYNAMIC_NO_TICKER_LIST');
 assert.equal(result.trade_executed,false);
 assert.equal(result.signing_enabled,false);
 assert.equal(result.pay_pal_payment_completed,false);
 assert.equal(result.asset_route_verified,false);
 const quote=f.requests.filter(x=>new URL(x.url).hostname==='api.jup.ag');
 assert.equal(quote.length,1);
 assert.equal(new URL(quote[0].url).searchParams.get('inputMint'),usdc);
 assert.equal(new URL(quote[0].url).searchParams.get('outputMint'),NEW_B);
 assert.equal(new URL(quote[0].url).searchParams.get('amount'),'50000000');
});
test('new token can also be routed back to USDC on agent SELL instructions',async()=>{
 const f=makeMock({newAmount:'12345',outAtoms:'1000000'});
 const r=await previewDynamicAssetRoute({
  chain:'solana',owner,inputAsset:NEW_A,outputAsset:usdc,
  amountAtoms:'12345',minReceiveAtoms:'1',fetcher:f.fetcher});
 assert.equal(r.status,'QUOTE_OBSERVED_NO_TRADE');
 assert.equal(r.input_mint,NEW_A);
 assert.equal(r.output_mint,usdc);
 assert.equal(r.input_available_atoms,'12345');
});
test('agent asset IDs are actual contracts, never ticker strings or spoofed URLs',async()=>{
 let calls=0;
 for(const asset of ['LGT','DOGE','http://evil.invalid','0x1234']){
  const r=await previewDynamicAssetRoute({
   chain:'solana',owner,inputAsset:usdc,outputAsset:asset,
   amountAtoms:'50000000',fetcher:async()=>{calls++}});
  assert.equal(r.status,'BLOCKED');
 }
 assert.equal(calls,0);
});
test('insufficient real USDC or SOL gas blocks quote; virtual paper cash is irrelevant',async()=>{
 const poor=makeMock({usdcAmount:'49999999'});
 const a=await previewDynamicAssetRoute({
  chain:'solana',owner,inputAsset:usdc,outputAsset:NEW_B,
  amountAtoms:'50000000',fetcher:poor.fetcher});
 assert.equal(a.reason,'INSUFFICIENT_INPUT_TOKEN_BALANCE');
 assert.equal(poor.requests.filter(x=>new URL(x.url).hostname==='api.jup.ag').length,0);
 const noGas=makeMock({sol:1000});
 const b=await previewDynamicAssetRoute({
  chain:'solana',owner,inputAsset:usdc,outputAsset:NEW_B,
  amountAtoms:'50000000',fetcher:noGas.fetcher});
 assert.equal(b.reason,'INSUFFICIENT_SOL_NETWORK_GAS');
 assert.equal(noGas.requests.filter(x=>new URL(x.url).hostname==='api.jup.ag').length,0);
});
test('unfunded buyer cannot try native SOL beyond real balance plus fee reserve',async()=>{
 const f=makeMock({sol:7000000});
 const r=await previewDynamicAssetRoute({
  chain:'solana',owner,inputAsset:SOL_MINT,outputAsset:NEW_A,
  amountAtoms:'5000000',fetcher:f.fetcher});
 assert.equal(r.reason,'INSUFFICIENT_SOL_AFTER_GAS_RESERVE');
});
test('route below required minimum and Jupiter outage block; never imply sellability',async()=>{
 const f=makeMock({outAtoms:'12'});
 const below=await previewDynamicAssetRoute({
  chain:'solana',owner,inputAsset:usdc,outputAsset:NEW_B,
  amountAtoms:'50000000',minReceiveAtoms:'13',fetcher:f.fetcher});
 assert.equal(below.reason,'INDICATIVE_OUTPUT_BELOW_MINIMUM');
 const down=await previewDynamicAssetRoute({
  chain:'solana',owner,inputAsset:usdc,outputAsset:NEW_B,
  amountAtoms:'50000000',fetcher:makeMock({quoteFailure:true}).fetcher});
 assert.equal(down.status,'BLOCKED');
 assert.equal(down.signing_enabled,false);
});
test('EVM chains can accept arbitrary contract identity but cannot promise live adapter',async()=>{
 let called=0;
 for(const chain of ['base','eth','bsc']){
  const r=await previewDynamicAssetRoute({chain,owner:'0x'+'1'.repeat(40),
   inputAsset:'0x'+'a'.repeat(40),outputAsset:'0x'+'b'.repeat(40),
   amountAtoms:'50000000',fetcher:async()=>{called++}});
  assert.equal(r.reason,'CHAIN_EXECUTION_ADAPTER_NOT_IMPLEMENTED');
  assert.equal(r.trade_executed,false);
 }
 assert.equal(called,0);
});
