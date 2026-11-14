// R23 merges bounded historical RPC batches. No model, wallet or trade access.
// Disjoint contiguous blocks only: missing blocks must never look like a quiet day.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const check=(ok,why)=>{if(!ok)throw Error(why)};
const safeTime=x=>Number.isFinite(Date.parse(x));
export function mergeBatches(batches,{target=50}={}){
 check(Array.isArray(batches)&&batches.length>0,'NO_BATCHES');
 check(Number.isInteger(target)&&target>0,'INVALID_TARGET');
 const sorted=[...batches].sort((a,b)=>a.requested_blocks.from-b.requested_blocks.from);
 const first=sorted[0];
 check(first.schema==='r23_onchain_discovery.v1','INVALID_BATCH_SCHEMA');
 const window=first.window;
 check(window&&safeTime(window.start)&&safeTime(window.end),'INVALID_WINDOW');
 let prev=null,all=[],verified=true,coveredChunks=0;
 for(const b of sorted){
  check(b.schema===first.schema&&b.source===first.source,'MIXED_BATCH_SCHEMA');
  check(JSON.stringify(b.window)===JSON.stringify(window),'MIXED_HISTORY_WINDOWS');
  check(b.quote_pair_policy===first.quote_pair_policy,'MIXED_COHORT_FILTERS');
  check(b.requested_blocks&&Number.isSafeInteger(b.requested_blocks.from)&&
   Number.isSafeInteger(b.requested_blocks.to)&&b.requested_blocks.from<=b.requested_blocks.to,'INVALID_BLOCK_RANGE');
  check(b.completed_through_block>=b.requested_blocks.from&&
   b.completed_through_block<=b.requested_blocks.to,'INVALID_COMPLETED_RANGE');
  check(prev===null||b.requested_blocks.from===prev+1,'MISSING_OR_OVERLAPPING_BLOCKS');
  check(Array.isArray(b.chunks)&&b.chunks.length>0&&b.chunks[0].from_block===b.requested_blocks.from&&
   b.chunks.at(-1).to_block===b.completed_through_block,'CHUNK_COVERAGE_MISMATCH');
  for(let j=1;j<b.chunks.length;j++)check(b.chunks[j].from_block===b.chunks[j-1].to_block+1,'GAP_INSIDE_BATCH');
  check(b.asof_corpus?.schema==='asof_corpus.v1'&&Array.isArray(b.asof_corpus.sources),'MISSING_ASOF_SOURCES');
  check(b.asof_corpus.sources.length===b.observed_pair_events,'SOURCE_COUNT_MISMATCH');
  verified&&=b.independently_cross_checked===true;
  all.push(...b.asof_corpus.sources);
  prev=b.completed_through_block;coveredChunks+=b.chunks.length;
  // A bounded batch can end before its requested final block. Following
  // batches are valid when they begin EXACTLY at the prior completed+1;
  // the adjacency assertion above rejects any omitted/intersecting blocks.
  // An incomplete final batch leaves the merged result incomplete.
 }
 const ids=new Set(),pairs=new Set(),candidates=new Set(),days=new Set();
 for(const s of all){
  check(s.kind==='POOL'&&typeof s.candidate_id==='string'&&s.candidate_id.startsWith('eth:'),'UNTRUSTED_SOURCE_KIND');
  check(!ids.has(s.id),'DUPLICATE_SOURCE_EVENT');ids.add(s.id);
  check(typeof s.payload?.pool==='string'&&!pairs.has(s.payload.pool),'DUPLICATE_POOL');
  pairs.add(s.payload.pool);candidates.add(s.candidate_id);
  check(s.event_at>=window.start&&s.event_at<=window.end,'EVENT_OUTSIDE_WINDOW');
  days.add(s.event_at.slice(0,10));
 }
 all.sort((a,b)=>a.event_at.localeCompare(b.event_at)||a.id.localeCompare(b.id));
 const complete=sorted.at(-1).complete_block_range===true&&
  sorted[0].requested_blocks.from===first.requested_blocks.from;
 return {
  schema:'r23_merged_source_bundle.v1',mode:'RESEARCH_ONLY',window,
  requested_first_block:sorted[0].requested_blocks.from,
  scanned_last_block:prev,
  block_range_gaps:0,all_submitted_batches_complete:complete,
  all_sources_cross_checked:verified,
  pool_events:all.length,distinct_pools:pairs.size,distinct_pool_candidates:candidates.size,
  target_pool_candidates:target,target_pool_candidates_found:candidates.size>=target,
  verified_memecoins:0,confirmed_trades:0,covered_days_with_pair_events:days.size,
  no_events_proves_complete_day:false,source_kinds:{POOL:all.length,MARKET:0,SOCIAL:0,SECURITY:0},
  readiness:'NEEDS_MEME_CLASSIFICATION_MARKET_SOCIAL_SECURITY_COMPLETE_COHORT_ATTESTATION',
  asof_corpus:{schema:'asof_corpus.v1',window,
   universe:{selection:'ASOF_COHORT',provenance:'CHAIN_LOG_BATCHES_NOT_INDEPENDENTLY_ATTESTED_COMPLETE',
    selection_policy:'all Ethereum Uniswap V2 WETH/USDC/USDT quote-pairs in contiguous block span'},
   sources:all},
  limitations:['Pool candidates are not yet classified as historical memecoins.',
   'Time bounds alone do not prove a complete cohort: verify matching first and last chain blocks separately.',
   'Zero POOL events do not prove that SOCIAL, MARKET or SECURITY were historically absent.',
   'No buy/sell opportunity is proved until executable as-of price and security data exists.']
 };
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [output,...args]=process.argv.slice(2);
  const corpusArgs=args.filter(x=>x.startsWith('--corpus-output='));
  check(corpusArgs.length<=1,'MULTIPLE_CORPUS_OUTPUTS');
  const corpusOutput=corpusArgs.length?corpusArgs[0].slice('--corpus-output='.length):null;
  const files=args.filter(x=>!x.startsWith('--corpus-output='));
  check(output&&files.length>0,'USAGE: node r23-merge-batches.mjs OUTPUT.json BATCH1.json [BATCH2.json ...] [--corpus-output=PRIVATE/asof.json]');
  check(!fs.existsSync(output),'OUTPUT_ALREADY_EXISTS');
  check(!corpusOutput||(corpusOutput!==output&&!fs.existsSync(corpusOutput)),'CORPUS_OUTPUT_ALREADY_EXISTS');
  const result=mergeBatches(files.map(f=>JSON.parse(fs.readFileSync(f,'utf8'))));
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
  if(corpusOutput){
   fs.mkdirSync(path.dirname(path.resolve(corpusOutput)),{recursive:true});
   fs.writeFileSync(corpusOutput,JSON.stringify(result.asof_corpus,null,2)+'\n',{flag:'wx'});
  }
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({pool_candidates:result.distinct_pool_candidates,
   memecoins_verified:result.verified_memecoins,batches:files.length,
   sources_cross_checked:result.all_sources_cross_checked,
   status:result.readiness,output,corpusOutput}));
 }catch(e){console.error('R23_MERGE_BLOCKED: '+String(e.message).slice(0,190));process.exitCode=2;}
}