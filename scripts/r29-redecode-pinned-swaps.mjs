import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {decodeHistoricalSwapFlow} from '../src/r29-historical-swap-flow.mjs';import {decodePumpReserveEvent} from '../src/r29-pump-reserve-event.mjs';import {correlateReserveState,correlateCreationBuyPostState,compareReserveContinuity} from '../src/r29-reserve-continuity.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8')),sha=s=>createHash('sha256').update(s).digest('hex');
const spec=await read('research/reference/r29-pump-trade-event-idl-20261008.json'),reports=[];
for(const run of [45450391897,45452592950]){
 const r=await read('research/preparation/enrichment/'+run+'/result.json'),tick=r.selection.tick_utc,states=[],creations=[],errors=[],swaps=[];
 for(const rec of r.receipts.filter(x=>x.method==='getTransaction')){
  const raw=await readFile(rec.artifact_path,'utf8');if(sha(raw)!==rec.sha256)throw Error('RAW_SHA_MISMATCH');
  const tx=JSON.parse(raw).result,signature=tx.transaction.signatures[0];if(!r.expected_prescan_signatures.includes(signature))throw Error('NOT_PRE_TICK');
  try{
   const flow=decodeHistoricalSwapFlow({raw,expectedSha256:rec.sha256,receiptId:1,signature,mint:r.selection.pilot.mint,slot:tx.slot,blockTime:tx.blockTime,scanAtUtc:tick});if(!flow.side)continue;
   const decoded=decodePumpReserveEvent({raw,flow,spec});swaps.push({signature,side:flow.side,instruction:decoded.matched_instruction?.name??null,user:decoded.matched_instruction?.user??null,at:flow.block_time_utc,event:decoded.matched_event?.event??null});
   try{states.push(correlateReserveState({raw,decoded}));}catch(e){try{creations.push(correlateCreationBuyPostState({raw,decoded}));}catch(c){errors.push({signature,reason:e.message,creation_reason:c.message});}}
  }catch(e){errors.push({signature,reason:e.message});}
 }
 states.sort((a,b)=>a.slot-b.slot);const continuity=states.slice(1).map((s,i)=>({from:states[i].signature,to:s.signature,verified:compareReserveContinuity(states[i],s)}));
 reports.push({run,mint:r.selection.pilot.mint,swaps,states,creations,errors,continuity,unresolved_swap_count:swaps.length-states.length-creations.length,trade_authorized:false});
}
const result={kind:'R29_PINNED_V3_AND_CREATION_REDECODE',source_commit:spec.source_commit,source_blob:spec.source_git_blob_sha,source_runs:[45450391897,45452592950],reports,new_market_requests:0,orders:0};
await mkdir('probe-artifacts/r29-redecode',{recursive:true});await writeFile('probe-artifacts/r29-redecode/report.json',JSON.stringify(result,null,2)+'\n');console.log('R29_REDECODE_RESULT',JSON.stringify({reports:reports.map(r=>({...r,swaps:r.swaps.map(s=>({signature:s.signature,side:s.side,instruction:s.instruction,user:s.user,at:s.at,real_sol:s.event?.real_sol_reserves,virtual_sol:s.event?.virtual_sol_reserves,virtual_token:s.event?.virtual_token_reserves})),states:r.states.map(s=>({signature:s.signature,side:s.side,post:s.post,vault:s.vault})),creations:r.creations,errors:r.errors})),new_market_requests:0,orders:0}));
