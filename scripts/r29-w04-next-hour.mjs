import {readFile,mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {decodeHistoricalSwapFlow} from '../src/r29-historical-swap-flow.mjs';
import {decodePumpReserveEvent} from '../src/r29-pump-reserve-event.mjs';
import {correlateReserveState,compareReserveContinuity} from '../src/r29-reserve-continuity.mjs';
import {inspectHistoricalMintTransaction} from '../src/r29-historical-mint-risk.mjs';
import {parseBinanceHistoricalFx} from '../src/r29-historical-curve-model.mjs';
import {evaluateRetrospectiveEntry} from '../src/r29-retrospective-execution.mjs';
const run=process.env.GITHUB_RUN_ID,hash=x=>createHash('sha256').update(x).digest('hex'),tickUtc='2026-10-12T01:00:00.000Z',tick=Date.parse(tickUtc)/1000;
const changes=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',process.env.GITHUB_SHA],{encoding:'utf8'}).trim().split('\n');
if(process.env.GITHUB_REF!=='refs/heads/codex/r29-cleanroom-paper-20261121'||changes.length!==1||!changes[0].startsWith('research/w04-next-hour-requests/2026-11-24/'))throw Error('EXPLICIT_REQUEST_REQUIRED');
const q=JSON.parse(await readFile(changes[0],'utf8'));if(q.kind!=='R29_W04_NEXT_HOUR_MODEL_RESEARCH'||q.tick_utc!==tickUtc||q.max_rpc_calls!==12||q.no_orders!==true)throw Error('INVALID_REQUEST');
const source=JSON.parse(await readFile('research/audits/2026-11-24/r29-v210-actual-comparison-and-midnight-chain.json','utf8'));const frame=source.rows[1];if(frame.utc!==tickUtc||frame.new_mints.length!==2||frame.truncated!==0)throw Error('FRAME_MISMATCH');
const spec=JSON.parse(await readFile('research/reference/r29-pump-trade-event-idl-20261008.json','utf8'));
const out='probe-artifacts/w04-next-hour-'+run;await mkdir(out,{recursive:true});
let calls=0,halt=false;const receipts=[];
async function rpc(method,params){
 if(halt||calls>=12)return null;const id=++calls;let raw='',status=0,retry=null;
 try{const resp=await fetch('https://api.mainnet.solana.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params}),signal:AbortSignal.timeout(12000)});status=resp.status;retry=resp.headers.get('retry-after');raw=await resp.text();}catch(e){raw=JSON.stringify({error:String(e)});}
 if(status===429||status===503)halt=true;
 const receipt={id,method,params,http_status:status,sha256:hash(raw),retry_after:retry};receipts.push(receipt);await writeFile(out+'/rpc-'+id+'.json',raw);console.log('R29_NEXT_RPC',JSON.stringify(receipt));
 try{const x=JSON.parse(raw);if(status!==200||x.id!==id||x.error)return null;return {raw,receipt,result:x.result};}catch{return null;}
}
let fx=null,fxError=null,fxRaw=null,fxReceipt=null;
try{const end=tick*1000,url='https://data-api.binance.vision/api/v3/klines?symbol=SOLUSDC&interval=1m&startTime='+(end-600000)+'&endTime='+(end-1)+'&limit=10';const resp=await fetch(url,{signal:AbortSignal.timeout(12000)});fxRaw=await resp.text();await writeFile(out+'/fx-raw.json',fxRaw);fxReceipt={url,http_status:resp.status,sha256:hash(fxRaw),retry_after:resp.headers.get('retry-after')};if(!resp.ok)throw Error('FX_HTTP_'+resp.status);fx=parseBinanceHistoricalFx({raw:fxRaw,expectedSha256:fxReceipt.sha256,tickUtc});console.log('R29_NEXT_FX',JSON.stringify({fx,receipt:fxReceipt,raw:fxRaw}));}catch(e){fxError=e.message;}
const targets=[];
for(const mint of frame.new_mints){const p=await rpc('getSignaturesForAddress',[mint,{limit:1000,commitment:'finalized'}]);const arr=Array.isArray(p?.result)?p.result:[];const eligible=arr.filter(x=>x.err===null&&Number.isInteger(x.blockTime)&&x.blockTime<tick-60);const unique=[...new Map(eligible.map(x=>[x.signature,x])).values()].sort((a,b)=>b.blockTime-a.blockTime||b.slot-a.slot);const complete=!!p&&arr.length<1000&&arr.every(x=>Number.isInteger(x.blockTime));const selected=unique.length<=5?unique:[...unique.slice(0,4),unique.at(-1)];targets.push({mint,page_receipt:p?.receipt??null,expected:unique,selected,complete,states:[],mintRows:[],errors:[]});}
for(let i=0;i<5&&!halt;i++)for(const target of targets){
 const s=target.selected[i];if(!s||halt)continue;
 const p=await rpc('getTransaction',[s.signature,{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:1}]);
 if(!p?.result){target.errors.push({signature:s.signature,reason:'RPC_UNAVAILABLE'});continue;}
 try{const row=inspectHistoricalMintTransaction({raw:p.raw,expectedSha256:p.receipt.sha256,signature:s.signature,mint:target.mint,slot:s.slot,blockTime:s.blockTime,tickUtc});target.mintRows.push(row);}catch(e){target.errors.push({signature:s.signature,stage:'MINT',reason:e.message});}
 try{const flow=decodeHistoricalSwapFlow({raw:p.raw,expectedSha256:p.receipt.sha256,receiptId:p.receipt.id,signature:s.signature,mint:target.mint,slot:s.slot,blockTime:s.blockTime,scanAtUtc:tickUtc});if(!flow.side)continue;const decoded=decodePumpReserveEvent({raw:p.raw,flow,spec});const state=correlateReserveState({raw:p.raw,decoded});target.states.push(state);}catch(e){target.errors.push({signature:s.signature,stage:'RESERVE',reason:e.message});}
}
for(const target of targets){
 const ordered=target.states.sort((a,b)=>t(b.block_time_utc)-t(a.block_time_utc)||b.slot-a.slot);function t(x){return Date.parse(x);}
 const last=ordered[0],first=last&&ordered.filter(s=>s.pool===last.pool&&t(s.block_time_utc)<t(last.block_time_utc)).at(-1);
 const report={mint:target.mint,expected_prescan_signatures:target.expected.length,selected_count:target.selected.length,archive_exhausted:target.complete,page_receipt:target.page_receipt,states:target.states,mint_rows:target.mintRows,expected_signatures:target.expected.map(s=>s.signature),errors:target.errors,evaluation:null};
 if(last&&first&&fx){const pair={mint:target.mint,pool:last.pool,earlier:first.receipt_id,later:last.receipt_id,source_time:last.block_time_utc,source_signature:last.signature,source_sha256:last.source_sha256,asof_event_state:last.post,fee_observation:last.fees,adjacent_continuity:compareReserveContinuity(first,last)};
  try{const input={pair,states:target.states,fx,tickUtc,riskInput:{rows:target.mintRows,expectedSignatures:report.expected_signatures,archiveExhausted:target.complete}};report.evaluation=evaluateRetrospectiveEntry(input);report.review_input=input;}catch(e){report.errors.push({stage:'MODEL',reason:e.message});}}
 console.log('R29_NEXT_CANDIDATE',JSON.stringify(report));target.report=report;
}
const report={kind:'R29_W04_NEXT_HOUR_MODEL_RESEARCH',tick_utc:tickUtc,source_run:45351015863,fx,fx_error:fxError,fx_receipt:fxReceipt,rows:targets.map(x=>x.report),rpc_calls:calls,fx_calls:1,halted:halt,receipts,actual_gpt_reviews:0,orders:0};
await writeFile(out+'/next-hour.json',JSON.stringify(report,null,2)+'\n');console.log('R29_NEXT_RESULT',JSON.stringify({...report,rows:undefined,receipts:undefined}));
