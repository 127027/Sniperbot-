// R25: checkpointed source-neutral historical pool sprint. No model or trade path.
// Every successful batch is written before the next network request, so a
// public RPC failure never erases previously collected historical evidence.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {discoverPairs} from './r23-onchain-discovery.mjs';
import {mergeBatches} from './r23-merge-batches.mjs';
const check=(ok,why)=>{if(!ok)throw Error(why)};
const arg=(key,fallback)=>{const a=process.argv.slice(2).find(x=>x.startsWith('--'+key+'='));
 return a?a.slice(key.length+3):fallback;};
const integer=(x,key)=>{check(/^\d+$/.test(String(x)),key+'_INVALID');const n=Number(x);
 check(Number.isSafeInteger(n),key+'_UNSAFE');return n;};
export async function archiveSprint({primary,fromBlock,toBlock,step=100,chunksPerBatch=20,
 maxBatches=30,windowStart,windowEnd,outputDir,discover=discoverPairs}){
 check(typeof primary==='string'&&primary.startsWith('https://'),'HTTPS_RPC_REQUIRED');
 check(Number.isSafeInteger(fromBlock)&&Number.isSafeInteger(toBlock)&&
  fromBlock>=0&&toBlock>=fromBlock,'BAD_RANGE');
 check(Number.isSafeInteger(step)&&step>0&&step<=5000,'BAD_STEP');
 check(Number.isSafeInteger(chunksPerBatch)&&chunksPerBatch>0&&chunksPerBatch<=2000,'BAD_CHUNKS');
 check(Number.isSafeInteger(maxBatches)&&maxBatches>=1&&maxBatches<=200,'BAD_BATCHES');
 check(outputDir&&!fs.existsSync(outputDir),'OUTPUT_DIR_ALREADY_EXISTS');
 fs.mkdirSync(outputDir,{recursive:true});
 const batches=[],batchPaths=[],startedAt=new Date().toISOString();
 let cursor=fromBlock,error=null;
 for(let idx=0;idx<maxBatches&&cursor<=toBlock;idx++){
  try{
   const result=await discover({primary,fromBlock:cursor,toBlock,step,maxChunks:chunksPerBatch,
     windowStart,windowEnd});
   check(result.completed_through_block>=cursor&&
     result.continuation_from_block===result.completed_through_block+1 ||
     (result.complete_block_range===true&&result.completed_through_block===toBlock),
     'NON_MONOTONIC_BATCH');
   const outfile=path.join(outputDir,'batch-'+String(idx+1).padStart(3,'0')+'.json');
   fs.writeFileSync(outfile,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
   batches.push(result);batchPaths.push(path.basename(outfile));
   cursor=result.continuation_from_block??toBlock+1;
  }catch(e){error=String(e.message||e).slice(0,160);break;}
 }
 let merge=null;
 if(batches.length){
   merge=mergeBatches(batches);
   fs.writeFileSync(path.join(outputDir,'merged-neutral-source.json'),
     JSON.stringify(merge,null,2)+'\n',{flag:'wx'});
 }
 const report={
   schema:'r25_archive_sprint_checkpoint.v1',mode:'READ_ONLY_RESEARCH_ONLY',
   started_at:startedAt,finished_at:new Date().toISOString(),
   from_block:fromBlock,requested_last_block:toBlock,
   scanned_to_block:cursor-1,continuation_from_block:cursor<=toBlock?cursor:null,
   complete_requested_block_range:cursor>toBlock,
   successful_batches:batches.length,chunk_size:step,chunks_per_batch:chunksPerBatch,
   batch_paths:batchPaths,last_error:error,
   pool_events:merge?.pool_events??0,
   pool_candidates:merge?.distinct_pool_candidates??0,
   verified_memecoins:0,executed_trades:0,independent_asof_verified:false,
   historical_source_gaps_must_not_be_interpreted_as_zero:true
 };
 fs.writeFileSync(path.join(outputDir,'progress.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
   const params={
    primary:process.env.RESEARCH_RPC_URL,
    fromBlock:integer(arg('from-block','17032888'),'FROM'),
    toBlock:integer(arg('to-block','17300000'),'TO'),
    step:integer(arg('step','100'),'STEP'),
    chunksPerBatch:integer(arg('chunks-per-batch','20'),'CHUNKS'),
    maxBatches:integer(arg('max-batches','30'),'BATCHES'),
    windowStart:arg('start','2023-04-12T14:00:00Z'),
    windowEnd:arg('end','2023-05-14T23:59:59Z'),
    outputDir:arg('output-dir','r25-archive-checkpoints')
   };
   const result=await archiveSprint(params);
   console.log(JSON.stringify(result));
   if(!result.successful_batches)process.exitCode=2;
 }catch(e){console.error('R25_SPRINT_ERROR:'+e.message);process.exitCode=2;}
}