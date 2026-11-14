// Fixtures only; never presented as genuine historical coins or trades.
import test from 'node:test';
import assert from 'node:assert/strict';
import {decodePair,poolCandidate,discoverPairs,dateBlockRange,FACTORY,PAIR_TOPIC} from './r23-onchain-discovery.mjs';
const weth='0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const a=n=>'0x'+n.toString(16).padStart(40,'0');
const h=n=>'0x'+n.toString(16).padStart(64,'0');
function pair(i,block=100){
 return {address:FACTORY,topics:[PAIR_TOPIC,h(BigInt(weth)),h(BigInt(a(i+1000)))],
  data:'0x'+a(i+2000).slice(2).padStart(64,'0')+h(1).slice(2),
  blockNumber:'0x'+block.toString(16),blockHash:h(block+40),
  transactionHash:h(i+1),logIndex:'0x0',removed:false};
}
function mock(logs,wrongSecondary=false){
 return async (url,opts)=>{
  const {method,params}=JSON.parse(opts.body);
  let result;
  if(method==='eth_chainId')result='0x1';
  else if(method==='eth_getLogs')result=url.includes('secondary')&&wrongSecondary?[]:
   logs.filter(x=>Number(BigInt(x.blockNumber))>=Number(BigInt(params[0].fromBlock))&&
   Number(BigInt(x.blockNumber))<=Number(BigInt(params[0].toBlock)));
  else if(method==='eth_getBlockByNumber'){
   const n=Number(BigInt(params[0]));
   result={number:params[0],hash:h(n+40),timestamp:'0x'+(Date.parse('2023-04-14T00:00:00Z')/1000+n-100).toString(16)};
  }else if(method==='eth_blockNumber')result='0x64';
  else throw Error('UNEXPECTED_RPC_METHOD '+method);
  return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result})};
 };
}
const opts={primary:'https://primary.example',secondary:'https://secondary.example',
 fromBlock:100,toBlock:100,step:1,maxChunks:1,
 windowStart:'2023-04-14T00:00:00Z',windowEnd:'2023-04-14T23:59:59Z'};
test('decodes canonical PairCreated and never claims a memecoin classification',()=>{
 const p=decodePair(pair(1));
 assert.equal(p.token0,weth);
 assert.equal(poolCandidate(p).candidate_id,'eth:'+a(1001));
 assert.throws(()=>decodePair({...pair(1),address:a(99)}),/WRONG_FACTORY/);
 assert.throws(()=>decodePair({...pair(1),topics:[h(1),...pair(1).topics.slice(1)]}),/WRONG_TOPIC/);
});
test('two agreeing RPCs generate provenanced POOL records, not MARKET or buys',async()=>{
 const x=await discoverPairs({...opts,fetchFn:mock([pair(1),pair(2)])});
 assert.equal(x.distinct_pool_candidates,2);
 assert.equal(x.verified_memecoin_count,0);
 assert.equal(x.tradeable_candidates_verified,0);
 assert.equal(x.complete_block_range,true);
 assert.equal(x.asof_corpus.sources.length,2);
 assert.ok(x.asof_corpus.sources.every(s=>s.proof.verified&&s.proof.historical_ledger_verified&&s.kind==='POOL'));
 assert.equal(x.independently_attested_asof_cohort,false);
});
test('single endpoint must NOT mark evidence as independently ledger-verified',async()=>{
 const x=await discoverPairs({...opts,secondary:undefined,fetchFn:mock([pair(1)])});
 assert.equal(x.asof_corpus.sources[0].proof.verified,false);
 assert.equal(x.independently_cross_checked,false);
});
test('disagreeing RPCs fail closed rather than providing a false archive',async()=>{
 await assert.rejects(()=>discoverPairs({...opts,fetchFn:mock([pair(1)],true)}),/RPC_LOGS_DISAGREE/);
});
test('unrelated token pairs are not called quote-paired candidates',async()=>{
 const x=pair(2); x.topics[1]=h(BigInt(a(8001)));
 const y=await discoverPairs({...opts,fetchFn:mock([x])});
 assert.equal(y.distinct_pool_candidates,0);
});
test('50 synthetic pairs stay classified as candidates only, never as 50 memecoins',async()=>{
 const x=await discoverPairs({...opts,fetchFn:mock(Array.from({length:50},(_,i)=>pair(i+1)))});
 assert.equal(x.distinct_pool_candidates,50);
 assert.equal(x.verified_memecoin_count,0);
});
test('scans bounded blocks and returns an exact continuation marker',async()=>{
 const x=await discoverPairs({...opts,toBlock:105,step:2,maxChunks:2,fetchFn:mock([pair(1)])});
 assert.equal(x.complete_block_range,false);
 assert.equal(x.continuation_from_block,104);
 assert.deepEqual(x.chunks.map(c=>[c.from_block,c.to_block]),[[100,101],[102,103]]);
});
test('bad source, time or chain information refuses to proceed',async()=>{
 await assert.rejects(()=>discoverPairs({...opts,primary:'http://not-secure',fetchFn:mock([])}),/HTTPS_RPC_REQUIRED/);
 await assert.rejects(()=>discoverPairs({...opts,fromBlock:101,toBlock:100,fetchFn:mock([])}),/BAD_BLOCK_RANGE/);
 await assert.rejects(()=>discoverPairs({...opts,windowEnd:'2022-01-01T00:00:00Z',fetchFn:mock([])}),/BAD_WINDOW/);
});
