// R23 fallback: no-key public Blockscout archive acquisition (if allowed by instance).
// Unverified SINGLE-source reconnaissance only. Never trade or mark meme success.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {FACTORY,PAIR_TOPIC,decodePair,poolCandidate} from './r23-onchain-discovery.mjs';
const check=(x,code)=>{if(!x)throw Error(code)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const baseUrl=x=>{const u=new URL(x);check(u.protocol==='https:'&&!u.username&&!u.password,'HTTPS_ARCHIVE_REQUIRED');return u};
async function getJson(base,route,params,fetchFn){
 const u=new URL(route,base);
 for(const [k,v] of Object.entries(params||{}))u.searchParams.set(k,String(v));
 const r=await fetchFn(u.toString(),{method:'GET',signal:AbortSignal.timeout(30000)});
 check(r.ok,'ARCHIVE_HTTP_'+r.status);
 return await r.json();
}
async function legacy(base,params,fetchFn){
 const result=await getJson(base,'/api',params,fetchFn);
 check(result&&typeof result==='object'&&'status'in result,'INVALID_ARCHIVE_ENVELOPE');
 check(result.status==='1'||(result.status==='0'&&Array.isArray(result.result)&&
  /no (logs|records|data) found/i.test(result.message||'')),'ARCHIVE_QUERY_FAILED:'+
  String(result.message||'UNKNOWN').slice(0,80));
 return result.result;
}
export async function dateBlockRangeBlockscout(base,start,end,fetchFn=fetch){
 baseUrl(base);check(validTime(start)&&validTime(end)&&Date.parse(start)<=Date.parse(end),'BAD_WINDOW');
 async function block(timestamp,closest){
  const result=await legacy(base,{module:'block',action:'getblocknobytime',
   timestamp:Math.floor(timestamp/1000),closest},fetchFn);
  const n=Number(result?.blockNumber);
  check(Number.isSafeInteger(n)&&n>=0,'INVALID_ARCHIVE_BLOCK_NUMBER');
  return n;
 }
 const fromBlock=await block(Date.parse(start),'after'),toBlock=await block(Date.parse(end),'before');
 check(fromBlock<=toBlock,'NO_BLOCKS_IN_WINDOW');
 return {fromBlock,toBlock};
}
export async function discoverBlockscout({base='https://eth.blockscout.com',fromBlock,toBlock,
 step=600,maxChunks=50,windowStart,windowEnd,fetchFn=fetch}){
 baseUrl(base);
 check(Number.isSafeInteger(fromBlock)&&Number.isSafeInteger(toBlock)&&fromBlock>=0&&toBlock>=fromBlock,'BAD_BLOCK_RANGE');
 check(Number.isInteger(step)&&step>0&&step<=1500,'BAD_STEP');
 check(Number.isInteger(maxChunks)&&maxChunks>0&&maxChunks<=20000,'BAD_CHUNK_LIMIT');
 check(validTime(windowStart)&&validTime(windowEnd)&&Date.parse(windowStart)<=Date.parse(windowEnd),'BAD_WINDOW');
 const blockCache=new Map(),sources=[],chunks=[];
 async function blockInfo(n){
  if(!blockCache.has(n)){
   const x=await getJson(base,'/api/v2/blocks/'+n,{},fetchFn);
   const date=new Date(x?.timestamp).toISOString();
   check(/^0x[0-9a-fA-F]{64}$/.test(x?.hash||'')&&validTime(date),'INVALID_ARCHIVE_BLOCK_INFO');
   blockCache.set(n,{at:date,hash:x.hash.toLowerCase()});
  }
  return blockCache.get(n);
 }
 let next=fromBlock;
 while(next<=toBlock&&chunks.length<maxChunks){
  const end=Math.min(toBlock,next+step-1);
  const logs=await legacy(base,{module:'logs',action:'getLogs',address:FACTORY,
   topic0:PAIR_TOPIC,fromBlock:next,toBlock:end},fetchFn);
  check(Array.isArray(logs)&&logs.length<1000,'ARCHIVE_PAGINATION_OR_TRUNCATION_RISK');
  let included=0,ignoredNonPair=0;
  for(const log of logs){
   // Some legacy explorer APIs return other factory events despite topic0.
   // Filter strictly on the client, and NEVER weaken decodePair's validation.
   // Legacy archive providers may pad topics arrays with trailing nulls.
   // Trim ONLY null padding: never discard a real fourth indexed topic.
   const topics=Array.isArray(log?.topics)?[...log.topics]:[];
   while(topics.length>3&&topics.at(-1)===null)topics.pop();
   if(log?.address?.toLowerCase()!==FACTORY ||
      topics.length!==3 || topics[0]?.toLowerCase()!==PAIR_TOPIC){
    ignoredNonPair++;
    continue;
   }
   // Legacy logs do not necessarily include blockHash. Lookup that same
   // block explicitly; this is single-explorer data, NOT independent proof.
   const parseUint=(raw,name)=>{
    check((typeof raw==='string'&&(/^(0x[0-9a-f]+|[0-9]+)$/i).test(raw))||
     (Number.isSafeInteger(raw)&&raw>=0),'INVALID_'+name);
    const n=BigInt(raw);
    check(n>=0n&&n<=BigInt(Number.MAX_SAFE_INTEGER),'OVERFLOW_'+name);
    return Number(n);
   };
   const blockNumber=parseUint(log.blockNumber,'BLOCK_NUMBER');
   const logIndex=parseUint(log.logIndex,'LOG_INDEX');
   check(blockNumber>=next&&blockNumber<=end,'ARCHIVE_LOG_OUTSIDE_RANGE');
   const b=await blockInfo(blockNumber);
   const normalized={...log,topics,blockNumber:'0x'+blockNumber.toString(16),
    logIndex:'0x'+logIndex.toString(16),
    blockHash:log.blockHash??b.hash};
   const p=decodePair(normalized);
   check(b.hash===p.block_hash,'ARCHIVE_BLOCK_HASH_CONFLICT');
   if(Date.parse(b.at)<Date.parse(windowStart)||Date.parse(b.at)>Date.parse(windowEnd))continue;
   const c=poolCandidate(p);
   if(!c)continue;
   const original=JSON.stringify({network:'ethereum',provider:'BLOCKSCOUT_ARCHIVE_UNVERIFIED',
    factory:FACTORY,block:p.block,block_hash:p.block_hash,tx_hash:p.tx_hash,log_index:p.log_index,
    token0:p.token0,token1:p.token1,pool:p.pool,event_at:b.at,
    block_hash_source:log.blockHash?'ARCHIVE_LOG_AND_BLOCK':'ARCHIVE_BLOCK_LOOKUP_ONLY'});
   sources.push({id:'pair:'+p.tx_hash.slice(2)+':'+p.log_index,kind:'POOL',candidate_id:c.candidate_id,
    event_at:b.at,payload:{chain:'ethereum',token:c.token,pool:p.pool},
    proof:{method:'ONCHAIN_LEDGER',original,sha256:sha(original),
     ref:'https://eth.blockscout.com/tx/'+p.tx_hash,block_time:b.at,
     historical_ledger_verified:false,verified:false},
    quote_token:c.quote,block_number:p.block});
   included++;
  }
  chunks.push({from_block:next,to_block:end,returned_log_count:logs.length,
   ignored_non_pair_logs:ignoredNonPair,eligible_quote_pair_events:included,
   second_provider_agreed:false});
  next=end+1;
 }
 const ids=new Set(),candidates=new Set();
 for(const s of sources){check(!ids.has(s.id),'DUPLICATE_LOG');ids.add(s.id);candidates.add(s.candidate_id);}
 return {
  schema:'r23_onchain_discovery.v1',source:'ETHEREUM_UNISWAP_V2_PAIRCREATED',
  mode:'RESEARCH_ONLY',data_provider:'BLOCKSCOUT_SINGLE_SOURCE',
  window:{start:windowStart,end:windowEnd},
  requested_blocks:{from:fromBlock,to:toBlock},
  completed_through_block:next-1,complete_block_range:next>toBlock,
  continuation_from_block:next>toBlock?null:next,chunks,
  observed_pair_events:sources.length,distinct_pool_candidates:candidates.size,
  independently_cross_checked:false,independently_attested_asof_cohort:false,
  verified_memecoin_count:0,tradeable_candidates_verified:0,
  quote_pair_policy:'WETH_USDC_USDT_ONLY_NO_OUTCOME_SELECTION',
  asof_corpus:{schema:'asof_corpus.v1',window:{start:windowStart,end:windowEnd},
   universe:{selection:'ASOF_COHORT',provenance:'BLOCKSCOUT_UNVERIFIED_SINGLE_ARCHIVE',
    selection_policy:'all Uniswap V2 WETH/USDC/USDT pairs in the scanned block range'},
   sources},
  limitations:[
   'No API key is required by this client but the Blockscout instance may rate-limit or reject historical requests.',
   'Single explorer output is not independently verified historical ledger evidence.',
   'Historical memecoin classification, market quotes, social, security and trading remain unavailable.',
   'If a source fails, the batch fails closed: no silent missing days or synthetic returns.',
   'Use a second independent ledger source before promoting this corpus to as-of verified evidence.'
  ]
 };
}
function arg(args,key,def){const x=args.find(a=>a.startsWith('--'+key+'='));return x?x.slice(key.length+3):def;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),output=arg(args,'output',null);
  const start=arg(args,'start','2023-03-14T00:00:00Z'),end=arg(args,'end','2023-05-14T23:59:59Z');
  check(output,'MISSING_OUTPUT');
  check(!fs.existsSync(output),'OUTPUT_EXISTS');
  const base=process.env.BLOCKSCOUT_BASE_URL||'https://eth.blockscout.com';
  const range=await dateBlockRangeBlockscout(base,start,end);
  const resume=arg(args,'resume-from-block',null);
  if(resume!==null){
   check(/^\d+$/.test(resume),'BAD_RESUME');
   range.fromBlock=Number(resume);
   check(Number.isSafeInteger(range.fromBlock)&&range.fromBlock<=range.toBlock,'RESUME_OUTSIDE_WINDOW');
  }
  const result=await discoverBlockscout({base,...range,windowStart:start,windowEnd:end,
   maxChunks:Number(arg(args,'max-chunks','50')),step:Number(arg(args,'step','600'))});
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:result.complete_block_range?'COMPLETE_BLOCK_RANGE':'PARTIAL_BATCH',
   pool_candidates:result.distinct_pool_candidates,
   memecoins_verified:0,provider:result.data_provider,
   asof_verified:false,continuation_from_block:result.continuation_from_block,output}));
 }catch(e){console.error('R23_BLOCKSCOUT_BLOCKED: '+String(e.message).slice(0,180));process.exitCode=2;}
}
