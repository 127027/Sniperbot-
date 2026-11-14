// R23: read-only, batched historical Ethereum Uniswap V2 pool discovery.
// No model/API spending, no orders, wallets, trading, or updates to the existing replay.
// Pool-created != memecoin, accessible liquidity, safe contract, or executable quote.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const FACTORY='0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f';
export const PAIR_TOPIC='0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';
export const QUOTES=new Set([
 '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
 '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
 '0xdac17f958d2ee523a2206206994597c13d831ec7'  // USDT
]);
const hex=n=>'0x'+n.toString(16);
const num=n=>Number(BigInt(n));
const sha=s=>createHash('sha256').update(s).digest('hex');
const need=(x,s)=>{if(!x)throw Error(s);};
const time=s=>Date.parse(s);
const address=s=>typeof s==='string'&&/^0x[0-9a-fA-F]{40}$/.test(s);
const id=s=>typeof s==='string'&&/^0x[0-9a-fA-F]{64}$/.test(s);
const lc=s=>s.toLowerCase();
const safeRpcUrl=u=>{need(/^https:\/\//.test(u||''),'HTTPS_RPC_REQUIRED');return u};
export function decodePair(log){
 need(lc(log.address||'')===FACTORY,'WRONG_FACTORY');
 need(Array.isArray(log.topics)&&log.topics.length===3&&lc(log.topics[0])===PAIR_TOPIC,'WRONG_TOPIC');
 need(log.topics.slice(1).every(x=>id(x)&&/^0{24}[0-9a-f]{40}$/.test(x.slice(2).toLowerCase())),'INVALID_TOKEN_TOPIC');
 need(/^0x[0-9a-fA-F]{128}$/.test(log.data||''),'INVALID_PAIR_DATA');
 need(id(log.transactionHash)&&id(log.blockHash)&&/^0x[0-9a-fA-F]+$/.test(log.blockNumber||'')&&/^0x[0-9a-fA-F]+$/.test(log.logIndex||''),'INVALID_LOG_ID');
 need(log.removed!==true,'REORGED_LOG');
 const token0='0x'+log.topics[1].slice(-40).toLowerCase(),token1='0x'+log.topics[2].slice(-40).toLowerCase();
 const pool='0x'+log.data.slice(26,66).toLowerCase();
 need(address(pool)&&token0!==token1,'INVALID_PAIR_ADDRESS');
 return {token0,token1,pool,block:Number(BigInt(log.blockNumber)),block_hash:lc(log.blockHash),
  tx_hash:lc(log.transactionHash),log_index:Number(BigInt(log.logIndex))};
}
export function poolCandidate(pair){
 // Quote-paired token selection is rule-based at the time of pool creation,
 // never selected using future price, meme label, survival or outcome.
 const q0=QUOTES.has(pair.token0),q1=QUOTES.has(pair.token1);
 if(q0===q1)return null;
 return {candidate_id:'eth:'+ (q0?pair.token1:pair.token0),
  token:q0?pair.token1:pair.token0,quote:q0?pair.token0:pair.token1};
}
export async function jsonRpc(url,method,params,fetchFn=fetch){
 safeRpcUrl(url);
 const reply=await fetchFn(url,{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(30000)});
 if(!reply.ok)throw Error('RPC_HTTP_'+reply.status);
 const data=await reply.json();
 if(data.error||data.result===undefined||data.result===null)throw Error('RPC_ERROR_'+(data.error?.code??'EMPTY'));
 return data.result;
}
export async function discoverPairs({primary,secondary,fromBlock,toBlock,step=1200,maxChunks=50,
 fetchFn=fetch,windowStart,windowEnd}){
 safeRpcUrl(primary);
 if(secondary){safeRpcUrl(secondary);need(primary!==secondary,'SECONDARY_MUST_BE_DISTINCT');}
 need(Number.isSafeInteger(fromBlock)&&fromBlock>=0&&Number.isSafeInteger(toBlock)&&toBlock>=fromBlock,'BAD_BLOCK_RANGE');
 need(Number.isInteger(step)&&step>0&&step<=5000,'BAD_STEP');
 need(Number.isInteger(maxChunks)&&maxChunks>0&&maxChunks<=20000,'BAD_MAX_CHUNKS');
 need(Number.isFinite(time(windowStart))&&Number.isFinite(time(windowEnd))&&time(windowEnd)>=time(windowStart),'BAD_WINDOW');
 // Historical RPC results may be unavailable from free providers. Fail closed.
 const rpc=(url,method,params)=>jsonRpc(url,method,params,fetchFn);
 need(await rpc(primary,'eth_chainId',[])==='0x1','WRONG_PRIMARY_CHAIN');
 if(secondary)need(await rpc(secondary,'eth_chainId',[])==='0x1','WRONG_SECONDARY_CHAIN');
 const blockCache=new Map(),rows=[],errors=[],chunks=[];
 async function getBlock(block){
  if(!blockCache.has(block)){
   const b=await rpc(primary,'eth_getBlockByNumber',[hex(block),false]);
   need(b&&Number(BigInt(b.number))===block&&id(b.hash),'BLOCK_UNVERIFIABLE');
   blockCache.set(block,{at:new Date(num(b.timestamp)*1000).toISOString(),hash:lc(b.hash)});
  }
  return blockCache.get(block);
 }
 let next=fromBlock;
 while(next<=toBlock&&chunks.length<maxChunks){
  const end=Math.min(toBlock,next+step-1),filter={address:FACTORY,topics:[PAIR_TOPIC],fromBlock:hex(next),toBlock:hex(end)};
  const primaryLogs=await rpc(primary,'eth_getLogs',[filter]);
  need(Array.isArray(primaryLogs),'INVALID_LOG_RESPONSE');
  const secondaryLogs=secondary?await rpc(secondary,'eth_getLogs',[filter]):null;
  if(secondaryLogs){
   need(Array.isArray(secondaryLogs),'SECONDARY_INVALID_LOG_RESPONSE');
   const canonical=a=>a.map(x=>{
    const p=decodePair(x);
    return [p.block,p.log_index,p.tx_hash,p.block_hash,p.token0,p.token1,p.pool].join('|');
   }).sort();
   need(JSON.stringify(canonical(primaryLogs))===JSON.stringify(canonical(secondaryLogs)),'RPC_LOGS_DISAGREE');
  }
  for(const log of primaryLogs){
   const p=decodePair(log);
   need(p.block>=next&&p.block<=end,'LOG_OUTSIDE_REQUESTED_BLOCKS');
   const b=await getBlock(p.block);
   need(b.hash===p.block_hash,'BLOCK_HASH_DISAGREES');
   if(time(b.at)<time(windowStart)||time(b.at)>time(windowEnd))continue;
   const c=poolCandidate(p);
   if(!c)continue;
   const original=JSON.stringify({chain:'ethereum',factory:FACTORY,block:p.block,block_hash:p.block_hash,tx_hash:p.tx_hash,
    log_index:p.log_index,token0:p.token0,token1:p.token1,pool:p.pool,block_time:b.at});
   rows.push({id:'pair:'+p.tx_hash.slice(2)+':'+p.log_index,kind:'POOL',candidate_id:c.candidate_id,
    event_at:b.at,payload:{chain:'ethereum',token:c.token,pool:p.pool},
    proof:{method:'ONCHAIN_LEDGER',original,sha256:sha(original),
     ref:'https://etherscan.io/tx/'+p.tx_hash,block_time:b.at,
     historical_ledger_verified:!!secondary,verified:!!secondary},
    quote_token:c.quote,block_number:p.block});
  }
  chunks.push({from_block:next,to_block:end,returned_log_count:primaryLogs.length,
   eligible_quote_pair_events:rows.filter(x=>x.block_number>=next&&x.block_number<=end).length,
   second_provider_agreed:!!secondary});
  next=end+1;
 }
 rows.sort((a,b)=>time(a.event_at)-time(b.event_at)||a.id.localeCompare(b.id));
 const unique=[...new Set(rows.map(x=>x.candidate_id))];
 return {
  schema:'r23_onchain_discovery.v1',source:'ETHEREUM_UNISWAP_V2_PAIRCREATED',
  mode:'RESEARCH_ONLY',window:{start:windowStart,end:windowEnd},
  requested_blocks:{from:fromBlock,to:toBlock},completed_through_block:next-1,
  complete_block_range:next>toBlock,continuation_from_block:next>toBlock?null:next,
  chunks,observed_pair_events:rows.length,distinct_pool_candidates:unique.length,
  independently_cross_checked:!!secondary,independently_attested_asof_cohort:false,
  verified_memecoin_count:0,tradeable_candidates_verified:0,
  quote_pair_policy:'WETH_USDC_USDT_ONLY_NO_OUTCOME_SELECTION',
  asof_corpus:{schema:'asof_corpus.v1',window:{start:windowStart,end:windowEnd},
   universe:{selection:'ASOF_COHORT',provenance:'RPC_PAIRCREATED_NEEDS_INDEPENDENT_COMPLETENESS_ATTESTATION',
    selection_policy:'all factory-created WETH/USDC/USDT quote-pairs within covered block ranges'},
   sources:rows},
  limitations:[
   'Raw pool creation does not establish memecoin classification, liquidity, contract safety or executable BUY/SELL.',
   'Data is only a partial cohort until every block covering the window has been scanned.',
   'Two agreeing RPC endpoints do not independently attest completeness, timestamp authenticity or that no logs were omitted.',
   'Price, social, security, fee, gas, slippage and later outcomes are NOT inferred or fabricated.',
   'This scanner never calls any model, trading endpoint or wallet.'
  ]
 };
}
export async function dateBlockRange(primary,start,end,fetchFn=fetch){
 const rpc=(method,params)=>jsonRpc(primary,method,params,fetchFn);
 need(Number.isFinite(time(start))&&Number.isFinite(time(end))&&time(start)<time(end),'BAD_DATES');
 need(await rpc('eth_chainId',[])==='0x1','WRONG_CHAIN');
 const latest=num(await rpc('eth_blockNumber',[]));
 const cache=new Map();
 const when=async n=>{
  if(!cache.has(n)){
   const b=await rpc('eth_getBlockByNumber',[hex(n),false]);
   need(b&&Number(BigInt(b.number))===n,'BAD_BLOCK_LOOKUP');
   cache.set(n,num(b.timestamp)*1000);
  }
  return cache.get(n);
 };
 const bound=async target=>{
  let lo=0,hi=latest+1;
  while(lo<hi){const mid=Math.floor((lo+hi)/2);if(await when(mid)<target)lo=mid+1;else hi=mid;}
  return lo;
 };
 const from=await bound(time(start)),to=(await bound(time(end)+1))-1;
 need(from<=to&&to<=latest,'NO_BLOCKS_IN_WINDOW');
 return {fromBlock:from,toBlock:to};
}
function getArg(args,key,fallback){
 const a=args.find(x=>x.startsWith('--'+key+'='));
 return a?a.slice(key.length+3):fallback;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),target=getArg(args,'output',null);
  const start=getArg(args,'start','2023-03-14T00:00:00Z'),end=getArg(args,'end','2023-05-14T23:59:59Z');
  const primary=process.env.RESEARCH_RPC_URL,secondary=process.env.RESEARCH_RPC_SECONDARY_URL||undefined;
  need(target&&primary,'USAGE: RESEARCH_RPC_URL=https://... node r23-onchain-discovery.mjs --output=PATH [--start=ISO] [--end=ISO] [--max-chunks=50] [--step=1200]');
  need(!fs.existsSync(target),'OUTPUT_EXISTS_REFUSING_OVERWRITE');
  const range=await dateBlockRange(primary,start,end);
  const result=await discoverPairs({primary,secondary,...range,
   step:Number(getArg(args,'step','1200')),maxChunks:Number(getArg(args,'max-chunks','50')),
   windowStart:start,windowEnd:end});
  fs.mkdirSync(path.dirname(path.resolve(target)),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:result.complete_block_range?'BLOCK_RANGE_COMPLETE':'PARTIAL_BLOCK_BATCH',
   output:target,from:range.fromBlock,to:range.toBlock,scanned_to:result.completed_through_block,
   continuation:result.continuation_from_block,pool_candidates:result.distinct_pool_candidates,
   confirmed_memecoins:0,second_rpc_verified:result.independently_cross_checked}));
 }catch(e){console.error('R23_BLOCKED: '+String(e.message).slice(0,180));process.exitCode=2;}
}