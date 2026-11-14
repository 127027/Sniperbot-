import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverBlockscout,dateBlockRangeBlockscout} from './r23-blockscout-discovery.mjs';
import {FACTORY,PAIR_TOPIC} from './r23-onchain-discovery.mjs';
const h=n=>'0x'+n.toString(16).padStart(64,'0');
const a=n=>'0x'+n.toString(16).padStart(40,'0');
const weth='0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const log=(i,block=100)=>({address:FACTORY,topics:[PAIR_TOPIC,h(BigInt(weth)),h(BigInt(a(i+1000)))],
 data:'0x'+a(i+2000).slice(2).padStart(64,'0')+h(1).slice(2),blockNumber:'0x'+block.toString(16),
 blockHash:h(block+40),transactionHash:h(i+1),logIndex:'0x0'});
function fake(events,{denied=false,missing=false}={}){
 return async(url,req)=>{
  const u=new URL(url);
  let result;
  if(u.pathname==='/api'&&u.searchParams.get('module')==='block')result={status:'1',result:{blockNumber:'100'}};
  else if(u.pathname==='/api'&&u.searchParams.get('module')==='logs'){
   const from=Number(u.searchParams.get('fromBlock')),to=Number(u.searchParams.get('toBlock'));
   result=denied?{status:'0',message:'rate limit',result:'ERROR'}:
    missing?{status:'0',message:'No logs found',result:[]}:
    {status:'1',message:'OK',result:events.filter(x=>Number(BigInt(x.blockNumber))>=from&&Number(BigInt(x.blockNumber))<=to)};
  }else if(u.pathname==='/api/v2/blocks/100')result={hash:h(140),timestamp:'2023-04-14T12:00:00.000Z'};
  else throw Error('UNEXPECTED_URL '+url);
  return {ok:true,json:async()=>result};
 };
}
const opts={base:'https://eth.blockscout.com',fromBlock:100,toBlock:100,step:1,maxChunks:1,
 windowStart:'2023-04-14T00:00:00Z',windowEnd:'2023-04-14T23:59:59Z'};
test('reads archived logs with no API key but never certifies a memecoin',async()=>{
 const x=await discoverBlockscout({...opts,fetchFn:fake([log(1),log(2)])});
 assert.equal(x.distinct_pool_candidates,2);
 assert.equal(x.verified_memecoin_count,0);
 assert.equal(x.independently_cross_checked,false);
 assert.ok(x.asof_corpus.sources.every(s=>s.proof.verified===false));
 assert.equal(x.complete_block_range,true);
});
test('legacy archive extraneous factory events are filtered, not mistaken for PairCreated',async()=>{
 const other={...log(2),topics:[h(12345),...log(2).topics.slice(1)]};
 const x=await discoverBlockscout({...opts,fetchFn:fake([log(1),other])});
 assert.equal(x.distinct_pool_candidates,1);
 assert.equal(x.chunks[0].ignored_non_pair_logs,1);
 assert.equal(x.chunks[0].returned_log_count,2);
});
test('legacy explorer trailing null topic padding is normalized without accepting extra indexed topics',async()=>{
 const padded={...log(1),topics:[...log(1).topics,null]};
 const extra={...log(2),topics:[...log(2).topics,h(999)]};
 const result=await discoverBlockscout({...opts,fetchFn:fake([padded,extra])});
 assert.equal(result.distinct_pool_candidates,1);
 assert.equal(result.chunks[0].ignored_non_pair_logs,1);
});
test('archive timestamp-to-block selection uses dates instead of winner IDs',async()=>{
 const x=await dateBlockRangeBlockscout(opts.base,opts.windowStart,opts.windowEnd,fake([]));
 assert.deepEqual(x,{fromBlock:100,toBlock:100});
});
test('empty response accepted only if explicitly marked no logs',async()=>{
 const x=await discoverBlockscout({...opts,fetchFn:fake([],{missing:true})});
 assert.equal(x.observed_pair_events,0);
 await assert.rejects(()=>discoverBlockscout({...opts,fetchFn:fake([],{denied:true})}),/ARCHIVE_QUERY_FAILED/);
});
test('pagination cap fails closed',async()=>{
 const x=Array.from({length:1000},(_,i)=>log(i+1));
 await assert.rejects(()=>discoverBlockscout({...opts,fetchFn:fake(x)}),/ARCHIVE_PAGINATION_OR_TRUNCATION_RISK/);
});
test('bounded collection returns continuation without looking ahead',async()=>{
 const x=await discoverBlockscout({...opts,toBlock:104,step:1,maxChunks:2,fetchFn:fake([log(1)])});
 assert.equal(x.complete_block_range,false);
 assert.equal(x.continuation_from_block,102);
});
