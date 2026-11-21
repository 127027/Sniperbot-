import test from 'node:test';
import assert from 'node:assert/strict';
import {GitHubTransport,BRANCH} from '../src/github.mjs';
import {gitBlobSha,newState,settlePaper,Reject} from '../src/core.mjs';
test('simulated Dot -> SHA index -> Windows paper fill -> GitHub receipt',async()=>{
 const now=Date.now(),coin={chain:'solana',contract:'ExampleContract12345',pool:'ExamplePool12345',symbol:'EX'};
 const quotes=['source-a','source-b'].map(provider_id=>({
   provider_id,observed_at:new Date(now).toISOString(),price_usdc:0.01,liquidity_usdc:25000,...coin
 }));
 const order={id:'test-buy-00001',mode:'PAPER',action:'BUY',
 authority:'dot-4-strategy',dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
 reason:'Independent paper signal for offline pipeline test',
 coin,quotes,amount_test_usdc:50,created_at:new Date(now).toISOString(),
 expires_at:new Date(now+60000).toISOString()};
 const orderText=JSON.stringify(order);
 const indexText=JSON.stringify({schema:1,mode:'PAPER',orders:[
   {path:'signals/orders/test-buy-00001.json',sha:gitBlobSha(orderText)}]});
 const previous=globalThis.fetch;let posted;
 globalThis.fetch=async(url,opts)=>{
   assert.ok(String(url).includes(encodeURIComponent(BRANCH))||opts.method==='PUT');
   if(opts.method==='PUT'){
     posted=JSON.parse(opts.body);
     return new Response(JSON.stringify({commit:{sha:'mock'}}),{status:201});
   }
   const body=String(url).includes('/signals/index.json')?indexText:orderText;
   return new Response(JSON.stringify({type:'file',encoding:'base64',sha:gitBlobSha(body),
     content:Buffer.from(body).toString('base64')}),{status:200});
 };
 try{
   const t=new GitHubTransport('TEST_ONLY_NOT_REAL');
   const index=(await t.read('signals/index.json')).data;
   const signal=(await t.read(index.orders[0].path,index.orders[0].sha)).data;
   const result=settlePaper(signal,newState(),now);
   assert.equal(result.receipt.status,'PAPER_FILLED');
   assert.equal(result.receipt.cash_after_test_usdc,4950);
   await t.publishReceipt(signal.id,result.receipt);
   assert.equal(posted.branch,BRANCH);
   assert.equal(JSON.parse(Buffer.from(posted.content,'base64').toString()).status,'PAPER_FILLED');
 }finally{globalThis.fetch=previous;}
});
test('wrong manifest SHA is rejected',async()=>{
 const previous=globalThis.fetch;
 const body=JSON.stringify({mode:'PAPER'});
 globalThis.fetch=async()=>new Response(JSON.stringify({type:'file',encoding:'base64',sha:gitBlobSha(body),
   content:Buffer.from(body).toString('base64')}),{status:200});
 try{
  await assert.rejects(new GitHubTransport('TEST_ONLY').read('signals/orders/bad-order-0001.json','0'.repeat(40)),
    e=>e instanceof Reject&&e.code==='POINTER_SHA_MISMATCH');
 }finally{globalThis.fetch=previous;}
});
