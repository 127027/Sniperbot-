import test from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {freshState} from './core.mjs';
import {encodeBase58} from './local-solana-vault.mjs';
import {AGENT_SIGNAL_SCHEMA,unsignedAgentSignal,applyAgentSignal} from './paper-agent-pipeline.mjs';
import assert from 'node:assert/strict';
import {ORDER_FEED_URL,fetchSignedPaperOrderFeed,pollSignedPaperOrderFeed} from './github-signed-agent-feed.mjs';
const now=Date.parse('2026-11-11T10:00:00Z');
const make=(signals=[],other={})=>({schema:'sniper_signed_paper_signal_feed.v1',
 published_at_utc:new Date(now-2000).toISOString(),signals,...other});
function transport(feed){
 return async(url,options)=>{
  assert.equal(url,ORDER_FEED_URL);
  assert.equal(options.redirect,'error');
  assert.equal(options.method,'GET');
  return new Response(JSON.stringify(feed),{status:200});
 };
}
test('empty cloud courier does NOT invent any real Dot or Paper execution',async()=>{
 let received=0;
 const r=await pollSignedPaperOrderFeed({fetcher:transport(make()),now,
  consume:async()=>{received++}});
 assert.equal(r.received,0);
 assert.equal(r.authenticated_by_transport,false);
 assert.equal(received,0);
 const oldEmpty=make([],{published_at_utc:new Date(now-86400000).toISOString()});
 assert.equal((await fetchSignedPaperOrderFeed({fetcher:transport(oldEmpty),now})).signal_count,0);
});
test('GitHub is untrusted transport only: still delegates every signed command to local consumer',async()=>{
 const a={signal_id:'sig_'+'a'.repeat(32),untrusted_claim:'BUY'};
 const b={signal_id:'sig_'+'b'.repeat(32),untrusted_claim:'SELL'};
 const calls=[];
 const result=await pollSignedPaperOrderFeed({
  fetcher:transport(make([a,b])),now,
  consume:async cmd=>{calls.push(cmd.signal_id);return {status:'REJECTED_UNSIGNED'}}});
 assert.deepEqual(calls,[a.signal_id,b.signal_id]);
 assert.equal(result.received,2);
 assert(result.receipts.every(x=>x.status==='REJECTED_UNSIGNED'));
 assert.equal(result.authenticated_by_transport,false);
});
test('stale, duplicated, oversized, malformed and unexpected feeds fail closed',async()=>{
 const cases=[
  make([{signal_id:'old-signal'}],{published_at_utc:new Date(now-300001).toISOString()}),
  make([{signal_id:'abc'},{signal_id:'abc'}]),
  make([],{schema:'different'}),
  make([],{extra:'unexpected'}),
  make(Array.from({length:9},(_,i)=>({signal_id:String(i)})))
 ];
 for(const feed of cases)await assert.rejects(
  fetchSignedPaperOrderFeed({fetcher:transport(feed),now}));
 const tooLarge=async()=>new Response('z'.repeat(65537),{status:200});
 await assert.rejects(fetchSignedPaperOrderFeed({fetcher:tooLarge,now}),/TOO_LARGE/);
 const missing=async()=>new Response('{}',{status:404});
 await assert.rejects(fetchSignedPaperOrderFeed({fetcher:missing,now}),/NOT_AVAILABLE/);
});

test('a SIGNED public GitHub courier message reaches the same PAPER BUY/SELL ledger with no real swap',async()=>{
 const moment=Date.now()-1000;
 const device='device_'+'e'.repeat(32);
 const token=encodeBase58(Buffer.alloc(32,31));
 const pool=encodeBase58(Buffer.alloc(32,32));
 const pair=generateKeyPairSync('ed25519');
 const keys=[{issuer:'dot-bridge-ci',key_id:'dot-bridge-ci',
  scope:'agent_execution',public_key_pem:pair.publicKey.export({format:'pem',type:'spki'})}];
 const signed=(action,id)=>{
  const payload={schema:AGENT_SIGNAL_SCHEMA,target_device_id:device,
   signal_id:'sig_'+id.repeat(32),issuer:'dot-bridge-ci',key_id:'dot-bridge-ci',
   chain:'solana',action,token_address:token,pool_address:pool,
   size_test_usdc:action==='BUY'?'50.00':null,
   created_at_utc:new Date(moment).toISOString(),
   expires_at_utc:new Date(moment+60000).toISOString()};
  return {...payload,signature:sign(null,Buffer.from(unsignedAgentSignal(payload)),
   pair.privateKey).toString('base64')};
 };
 let state={...freshState(),entriesEnabled:true,cashEur:50,
  maxTrade:200,portfolioBudgetUsdc:200};
 for(const [signal,price] of [[signed('BUY','a'),0.05],[signed('SELL','b'),0.1]]){
  const received=await pollSignedPaperOrderFeed({
   now:moment+2000,
   fetcher:transport({schema:'sniper_signed_paper_signal_feed.v1',
    published_at_utc:new Date(moment).toISOString(),signals:[signal]}),
   consume:async cmd=>{
    const applied=applyAgentSignal(state,cmd,keys,{
     syntheticTest:true,deviceId:device,now:moment+2000,
     source:'GITHUB_SIGNED_COURIER',quote:{
      chain:'solana',tokenAddress:token,poolAddress:pool,priceUsd:price,
      liquidityUsd:100000,symbol:'REMOTE',name:'Remote Signed Paper Coin',
      asOf:new Date(moment).toISOString()}});
    state=applied.next;
    return applied.receipt;
   }});
  assert.equal(received.receipts[0].status,'PAPER_FILLED');
  assert.equal(received.receipts[0].command_source,'GITHUB_SIGNED_COURIER');
  assert.equal(received.receipts[0].real_trade_executed,false);
 }
 assert.equal(state.positions.length,0);
 assert.equal(state.agentOrderReceipts.length,2);
 assert(state.closedPnl>0);
});
