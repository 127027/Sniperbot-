import {readFile,writeFile,mkdir} from 'node:fs/promises';import {gunzipSync,gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {prioritizeEvidence,selectSustainedEvidencePilot,selectNextLiquidityEvidencePilot} from '../src/r29-evidence-enrichment.mjs';
import {reservePreparationRequest,recordPreparationReceipt} from '../src/r29-preparation-queue.mjs';
import {inspectHistoricalMintTransaction} from '../src/r29-historical-mint-risk.mjs';
import {decodeHistoricalSwapFlow} from '../src/r29-historical-swap-flow.mjs';import {decodePumpReserveEvent} from '../src/r29-pump-reserve-event.mjs';import {correlateReserveState,compareReserveContinuity} from '../src/r29-reserve-continuity.mjs';import {latestObservedCurve,evaluateRetrospectiveEntry} from '../src/r29-retrospective-execution.mjs';import {parseBinanceHistoricalFx} from '../src/r29-historical-curve-model.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),checked=async(p,h)=>{const b=await readFile(p);if(sha(b)!==h)throw Error('SHA_MISMATCH '+p);return b;};
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(),run=process.env.GITHUB_RUN_ID,branch='codex/r29-cleanroom-paper-20261121',tickUtc='2026-10-12T00:00:00.000Z',tick=Date.parse(tickUtc)/1000;
const paths=git('diff-tree','--no-commit-id','--name-only','-r',process.env.GITHUB_SHA).split('\n');
if(process.env.GITHUB_REF!=='refs/heads/'+branch||paths.length!==1||!paths[0].startsWith('research/enrichment-requests/'))throw Error('EXPLICIT_REQUEST_REQUIRED');
const req=JSON.parse(git('show',process.env.GITHUB_SHA+':'+paths[0]));if(req.kind!=='R29_ENRICH_MIDNIGHT_EVIDENCE'||req.max_rpc!==8||req.no_orders!==true)throw Error('REQUEST');
const root='research/preparation/enrichment/'+run,vault='research/replay-vault/source-receipts/'+run,statePath='research/state/r29-preparation-queue.json';
await mkdir(root,{recursive:true});await mkdir(vault,{recursive:true});
let queue=await read(statePath);
async function persist(msg,files){
 await writeFile(statePath,JSON.stringify(queue,null,2)+'\n');git('add','-f',statePath,...files);
 try{git('diff','--cached','--quiet');return;}catch(e){if(e.status!==1)throw e;}
 git('commit','-m',msg);
 for(let i=0;i<4;i++){
  const local=git('rev-parse','HEAD'),parent=git('rev-parse','HEAD^');
  try{git('push','origin','HEAD:refs/heads/'+branch);return;}catch(e){
   git('fetch','origin','refs/heads/'+branch);
   const remote=git('rev-parse','FETCH_HEAD');
   if(remote===local)return;
   if(remote!==parent){
    git('merge-base','--is-ancestor',parent,remote);
    const own=new Set(git('diff','--name-only',parent,local).split('\n'));
    const changed=git('diff','--name-only',parent,remote).split('\n');
    if(changed.some(p=>own.has(p)||p===statePath))throw Error('CONCURRENT_EVIDENCE_CHANGE_STOP_NO_FORCE');
    git('rebase','--onto',remote,parent);
   }
   if(i===3)throw e;
   await new Promise(r=>setTimeout(r,2500*(i+1)));
  }
 }
}
const p='research/preparation/decision-input/',manifest=await read(p+'manifest.json');
let selection,target;
if(req.next_liquidity_selection===true){
 const old='research/preparation/enrichment/45450122787/',prev=await read(old+'selection.json');
 if(prev.source_packet_sha256!==manifest.packet_sha256||prev.total_jobs!==manifest.evidence_jobs)throw Error('RESUME_INPUT_CHANGED');
 const rows=JSON.parse(gunzipSync(await checked(old+'ranked-evidence-queue.json.gz',prev.ranked_queue_sha256)));
 const reviewed=await Promise.all([45450391897,45452592950].map(id=>read('research/preparation/enrichment/'+id+'/current-chat-review.json')));
 const excluded=[...new Set([...manifest.prior_quote_mints,...reviewed.map(r=>r.mint)])];
 const x=selectNextLiquidityEvidencePilot(rows,{excluded});
 target=x.pilot;
 selection={...prev,pilot:target,pilot_count:x.eligible_pilot_count,reused_selection_run:45450122787,selection_mode:'FRESH_LIQUIDITY_PROXY_BOUNDED_HISTORY',excluded_mints:excluded,ranking_is_not_buy_signal:true,reported_reserve_is_not_verified_liquidity:true};
 await writeFile(root+'/selection.json',JSON.stringify(selection,null,2)+'\n');await persist('R29 select next distinct liquidity-priority evidence candidate',[root]);
}else if(req.sustained_selection===true){
 const old='research/preparation/enrichment/45450122787/',prev=await read(old+'selection.json');
 if(prev.source_packet_sha256!==manifest.packet_sha256||prev.total_jobs!==manifest.evidence_jobs)throw Error('RESUME_INPUT_CHANGED');
 const rows=JSON.parse(gunzipSync(await checked(old+'ranked-evidence-queue.json.gz',prev.ranked_queue_sha256)));
 const resolved=await read('research/preparation/enrichment/45450391897/current-chat-review.json');
 const x=selectSustainedEvidencePilot(rows,{excluded:[resolved.mint,...manifest.prior_quote_mints]});
 target=x.pilot;selection={...prev,pilot:target,pilot_count:x.eligible_pilot_count,reused_selection_run:45450122787,selection_mode:'SUSTAINED_BOUNDED_HISTORY',excluded_mints:[resolved.mint,...manifest.prior_quote_mints]};
 await writeFile(root+'/selection.json',JSON.stringify(selection,null,2)+'\n');await persist('R29 select sustained activity candidate from saved rank',[root]);
}else if(req.resume_selection_run===45450122787){
 const old='research/preparation/enrichment/45450122787/';
 selection=await read(old+'selection.json');
 if(selection.source_packet_sha256!==manifest.packet_sha256||selection.total_jobs!==manifest.evidence_jobs)throw Error('RESUME_INPUT_CHANGED');
 await checked(old+'ranked-evidence-queue.json.gz',selection.ranked_queue_sha256);
 target=selection.pilot;selection={...selection,reused_selection_run:45450122787};
 await writeFile(root+'/selection.json',JSON.stringify(selection,null,2)+'\n');await persist('R29 resume durable pilot selection without reranking',[root]);
}else{
 const packet=JSON.parse(gunzipSync(await checked(p+'all-candidates.json.gz',manifest.packet_sha256)));
 const am=await read('research/preparation/archive-v42/manifest.json'),launchPath='source-audit/all-launches/2026-10-11.jsonl.gz',launchMeta=am.files.find(x=>x.path===launchPath);
 const launches=new Map(gunzipSync(await checked('research/preparation/archive-v42/'+launchPath,launchMeta.sha256)).toString('utf8').trim().split('\n').map(s=>{const r=JSON.parse(s);return [r.mint,r];}));
 const pri=prioritizeEvidence(packet.candidates,launches,{tickUtc,excluded:manifest.prior_quote_mints});
 if(pri.rows.length!==manifest.evidence_jobs)throw Error('QUEUE_COUNT_MISMATCH');
 const ranked=root+'/ranked-evidence-queue.json.gz';await writeFile(ranked,gzipSync(JSON.stringify(pri.rows)));
 target=pri.pilot;selection={kind:'R29_EVIDENCE_PRIORITY_BATCH',tick_utc:tickUtc,total_jobs:pri.rows.length,pilot_count:pri.eligible_pilot_count,pilot:target,source_packet_sha256:manifest.packet_sha256,ranked_queue_sha256:sha(await readFile(ranked)),ranking_is_not_buy_signal:true,full_market_coverage:false};
 await writeFile(root+'/selection.json',JSON.stringify(selection,null,2)+'\n');await persist('R29 persist priority queue and independent pilot selection',[root]);
}
console.log('R29_ENRICH_SELECTION',JSON.stringify(selection));
let calls=0,halt=false;const receipts=[];
async function rpc(method,params){
 const body={jsonrpc:'2.0',id:1,method,params},request={provider:'SOLANA_RPC',url:'https://api.mainnet.solana.com',body},gate=reservePreparationRequest(queue,request,new Date().toISOString());
 if(!gate.allowed){
  if(gate.reason==='ALREADY_CAPTURED'){const r=queue.requests[gate.key].receipt,raw=(await checked(r.artifact_path,r.sha256)).toString('utf8');return {raw,receipt:r,result:JSON.parse(raw).result};}
  console.log('R29_ENRICH_SKIP',gate.reason);return null;
 }
 if(halt||calls>=req.max_rpc)return null;
 queue=gate.state;await persist('R29 reserve targeted historical RPC '+method,[]);
 let raw='',httpStatus=null,retryAfter=null,parsed=null;calls++;
 try{const res=await fetch(request.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});httpStatus=res.status;retryAfter=res.headers.get('retry-after');raw=await res.text();parsed=JSON.parse(raw);}catch(e){if(!raw)raw=JSON.stringify({local_error:String(e)});}
 const file=vault+'/'+gate.key+'-attempt-'+queue.requests[gate.key].attempts+'.json';await writeFile(file,raw);
 const usable=httpStatus===200&&parsed?.id===1&&!parsed.error&&parsed.result!==undefined&&parsed.result!==null;
 queue=recordPreparationReceipt(queue,gate.key,{raw,httpStatus,retryAfter,nowUtc:new Date().toISOString(),usable,artifactPath:file});
 const r=queue.requests[gate.key].receipt;receipts.push({key:gate.key,method,http_status:httpStatus,sha256:r.sha256,artifact_path:file,usable});
 await persist('R29 retain targeted historical RPC receipt '+method,[file]);
 if(httpStatus===429||httpStatus===503)halt=true;
 return usable?{raw,receipt:r,result:parsed.result}:null;
}
const result={kind:'R29_TARGETED_MIDNIGHT_ENRICHMENT',selection,receipts,expected_prescan_signatures:[],decoded_mint_rows:[],states:[],errors:[],evaluation:null,review_input:null,model_trade_inputs_verified:0,actual_gpt_reviews:0,orders:0};
if(target){
 const page=await rpc('getSignaturesForAddress',[target.mint,{limit:1000,commitment:'finalized'}]);
 const arr=Array.isArray(page?.result)?page.result:[];
 const eligible=arr.filter(s=>s.err===null&&Number.isInteger(s.blockTime)&&s.blockTime<tick-60);
 const unique=[...new Map(eligible.map(x=>[x.signature,x])).values()].sort((a,b)=>a.blockTime-b.blockTime||a.slot-b.slot);
 const complete=!!page&&arr.length<1000&&arr.every(s=>Number.isInteger(s.blockTime));
 result.archive_exhausted_as_reported=complete;result.expected_prescan_signatures=unique.map(s=>s.signature);
 const selected=unique.length<=7?unique:[unique[0],...unique.slice(-6)];
 result.unfetched_signatures=unique.filter(s=>!selected.includes(s)).map(s=>s.signature);
 const spec=await read('research/reference/r29-pump-trade-event-idl-20261008.json');
 for(const s of selected){
  const p=await rpc('getTransaction',[s.signature,{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:1}]);if(!p){result.errors.push({signature:s.signature,reason:'RPC_UNAVAILABLE_OR_BUDGET'});continue;}
  try{result.decoded_mint_rows.push(inspectHistoricalMintTransaction({raw:p.raw,expectedSha256:p.receipt.sha256,signature:s.signature,mint:target.mint,slot:s.slot,blockTime:s.blockTime,tickUtc}));}catch(e){result.errors.push({signature:s.signature,stage:'MINT',reason:e.message});}
  try{const flow=decodeHistoricalSwapFlow({raw:p.raw,expectedSha256:p.receipt.sha256,receiptId:1,signature:s.signature,mint:target.mint,slot:s.slot,blockTime:s.blockTime,scanAtUtc:tickUtc});if(!flow.side)continue;const state=correlateReserveState({raw:p.raw,decoded:decodePumpReserveEvent({raw:p.raw,flow,spec})});result.states.push({...state,receipt_id:s.signature});}catch(e){result.errors.push({signature:s.signature,stage:'RESERVE',reason:e.message});}
 }
 const states=result.states.filter(s=>s.pool===target.pool&&s.event_flow_verified),last=latestObservedCurve(states),first=last&&states.filter(s=>Date.parse(s.block_time_utc)<Date.parse(last.block_time_utc)).sort((a,b)=>Date.parse(b.block_time_utc)-Date.parse(a.block_time_utc))[0];
 const fxReport=await read('research/audits/2026-11-24/r29-w03-50usdc-model-quotes.json'),fx=parseBinanceHistoricalFx({raw:(await checked(fxReport.original_fx_raw_path,fxReport.receipt.source_sha256)).toString('utf8'),expectedSha256:fxReport.receipt.source_sha256,tickUtc});
 if(first&&last){
  const pair={mint:target.mint,pool:target.pool,earlier:first.receipt_id,later:last.receipt_id,source_time:last.block_time_utc,source_signature:last.signature,source_sha256:last.source_sha256,asof_event_state:last.post,fee_observation:last.fees,adjacent_continuity:compareReserveContinuity(first,last)};
  try{const input={pair,states:result.states,fx,tickUtc,riskInput:{rows:result.decoded_mint_rows,expectedSignatures:result.expected_prescan_signatures,archiveExhausted:complete},strategyPolicy:'GPT_RESEARCH_V1'};result.evaluation=evaluateRetrospectiveEntry(input);result.review_input=input;result.model_trade_inputs_verified=result.evaluation.reasons.filter(r=>!['GPT_STRATEGY_NOT_BUY','NO_MATCHING_CURRENT_GPT_BUY_REVIEW'].includes(r)).length===0?1:0;}catch(e){result.errors.push({stage:'MODEL',reason:e.message});}
 }
}
result.rpc_calls=calls;result.provider_stopped=halt;
const dest=root+'/result.json';await writeFile(dest,JSON.stringify(result,null,2)+'\n');await persist('R29 persist targeted candidate model evidence and unresolved jobs',[dest]);console.log('R29_ENRICH_RESULT',JSON.stringify({selection:result.selection,expected:result.expected_prescan_signatures.length,decoded:result.decoded_mint_rows.length,states:result.states.length,archive_exhausted:result.archive_exhausted_as_reported,errors:result.errors,evaluation:result.evaluation,model_trade_inputs_verified:result.model_trade_inputs_verified,rpc_calls:calls,provider_stopped:halt,orders:0}));
