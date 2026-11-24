import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged} from '../src/v19-replay-isolation.mjs';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=process.env.GITHUB_RUN_ID, commit=process.env.GITHUB_SHA;
if(process.env.GITHUB_REF!=='refs/heads/codex/r29-cleanroom-paper-20261121'||!/^\d+$/.test(run||''))throw Error('wrong branch');
const paths=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],{encoding:'utf8'}).trim().split('\n');
if(paths.length!==1||!/^research\/v210-evidence-requests\/2026-11-24\/[\w-]+\.json$/.test(paths[0]))throw Error('single explicit request required');
const q=JSON.parse(await readFile(paths[0],'utf8'));
if(q.kind!=='R29_V210_COMPARE_AND_MIDNIGHT_CHAIN_RESEARCH'||q.old_run!==45344389914||q.new_run!==45348562128||q.max_rpc_calls!==12||q.read_only!==true)throw Error('wrong request');
const protect=[resolve('signals/index.json'),resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(protect);
const oldB=await readFile('probe-artifacts/v210-old/v29-real-feature-candidate-24h-45344389914/24-scans.json');
const newB=await readFile('probe-artifacts/v210-new/v29-real-feature-candidate-24h-45348562128/24-scans.json');
if(sha(oldB)!=='3922c0d9fee93e3e54ba68e5a397d148269fdacfc38aad17459ae2ca50724fea')throw Error('old source changed');
const old=JSON.parse(oldB),now=JSON.parse(newB);
for(const [s,n] of [[old,61],[now,88]]){
 if(s.kind!=='R29_V29_24_SCAN_ACTUAL_FEATURE_FUNNEL_RESEARCH_NOT_TRADING'||s.original_raw_rows!==259851||s.research_screen_pass_occurrences!==n||s.scans.length!==24||s.postevent_winners_or_future_outcomes_loaded!==false||s.original_historical_two_way_50usdc_quotes_proven!==false||s.original_provider_data_delivered_to_gpt_at_october_ticks_proven!==false)throw Error('source gate');
}
if(JSON.stringify(old.source_sha256_by_day)!==JSON.stringify(now.source_sha256_by_day))throw Error('different sources');
const replay=backtestOnRequest({date:'2026-10-12',manifest:{schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',date:'2026-10-12',selected_from_future_winner_list:false,snapshots:[],activity_observations:[],research_only_candidate_frames:now.scans,claimed_gpt_journals:[]},forceHourlyDiagnostic:true,firstScanAtStart:true});
const timeline=replay.role_audit.dot4_strategy.timeline;
if(timeline.length!==24||replay.retro_candidate_research_only_pass_occurrences!==88||replay.model_replay_summary.buys!==0||replay.model_replay_summary.sells!==0||replay.confirmed_paper_fills!==0||replay.historical_gpt_dot_runs!==0)throw Error('integrated source mismatch');
const rows=now.scans.map((s,i)=>{
 const o=old.scans[i],t=timeline[i],r=t.dot2_research_only_candidate_review;
 if(s.at_utc!==o.at_utc||s.at_utc!==t.at_utc||s.cumulative_distinct_mints_retro!==o.cumulative_distinct_mints_retro||r.research_screen_pass_count!==s.screen_pass_with_unknown_executable_quotes||r.order_authorized!==false||t.actions.some(a=>['BUY','HOLD','SELL'].includes(a.action)))throw Error('hour mismatch');
 const a=o.top_research_candidates_not_orders.map(x=>x.mint),b=s.top_research_candidates_not_orders.map(x=>x.mint);
 return {scan:i+1,utc:s.at_utc,old:o.screen_pass_with_unknown_executable_quotes,new:s.screen_pass_with_unknown_executable_quotes,delta:s.screen_pass_with_unknown_executable_quotes-o.screen_pass_with_unknown_executable_quotes,old_mints:a,new_mints:b,added_represented:b.filter(x=>!a.includes(x)),truncated:s.truncated_screen_pass_candidates,finalized_fallback:s.finalized_fallback_mints,BUY:[],HOLD:[],SELL:[]};
});
const out='probe-artifacts/v210-evidence-'+run;await mkdir(out,{recursive:true});
const comparison={kind:'R29_V210_24_HOUR_SOURCE_AND_SHARED_STRATEGY_COMPARISON',old_run:45344389914,new_run:45348562128,old_source_sha256:sha(oldB),new_source_sha256:sha(newB),old_count:61,new_count:88,represented_unique_mints:new Set(rows.flatMap(r=>r.new_mints)).size,unrepresented_count:rows.reduce((a,r)=>a+r.truncated,0),model_buy:0,model_hold:0,model_sell:0,actual_client_fills:0,original_historical_gpt_reviews:0,rows};
await writeFile(out+'/comparison.json',JSON.stringify(comparison,null,2)+'\n');
for(const r of rows)console.log('R29_V210_HOUR',JSON.stringify(r));
console.log('R29_V210_COMPARISON',JSON.stringify({...comparison,rows:undefined}));
let calls=0,halt=false;
async function rpc(method,params){
 if(halt||calls>=12)return {state:'UNATTEMPTED_LIMIT'};
 const id=++calls;let status=0,raw='',result;
 try{const response=await fetch('https://api.mainnet.solana.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params}),signal:AbortSignal.timeout(15000)});status=response.status;raw=await response.text();if(raw.length>6000000)throw Error('size');const parsed=JSON.parse(raw);if(status===200&&parsed.id===id&&!parsed.error)result=parsed.result;}catch(e){if(!raw)raw=JSON.stringify({local_error:String(e)});}
 await writeFile(out+'/rpc-'+id+'.json',raw);
 if(status===429||status===503)halt=true;
 const receipt={id,method,params,http_status:status,sha256:sha(raw),captured_at_utc:new Date().toISOString(),state:result===undefined?'UNKNOWN':'RETURNED'};
 console.log('R29_V210_RPC',JSON.stringify(receipt));
 return {...receipt,result};
}
const tick=Date.parse(now.scans[0].at_utc)/1000;
const targets=now.scans[0].top_research_candidates_not_orders;
if(targets.length!==3)throw Error('midnight target mismatch');
const chain=[];
for(const target of targets){
 let cursor=null,signatures=[],pages=[],boundary=false;
 for(let i=0;i<2&&!halt;i++){
  const options={limit:1000,commitment:'finalized',...(cursor?{before:cursor}:{})};
  const p=await rpc('getSignaturesForAddress',[target.mint,options]);
  pages.push({id:p.id,state:p.state});
  if(!Array.isArray(p.result))break;
  const arr=p.result;
  signatures.push(...arr.filter(x=>Number.isInteger(x.blockTime)&&x.blockTime<tick-60&&x.blockTime>=tick-600&&x.err===null));
  if(arr.length<1000||arr.some(x=>Number.isInteger(x.blockTime)&&x.blockTime<tick-600)){boundary=true;break;}
  cursor=arr.at(-1)?.signature;if(!cursor)break;
 }
 const details=[];
 for(const s of [...new Map(signatures.map(x=>[x.signature,x])).values()].sort((a,b)=>b.blockTime-a.blockTime).slice(0,2)){
  const p=await rpc('getTransaction',[s.signature,{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:1}]);
  const tx=p.result;
  const ok=!!tx&&tx.meta?.err===null&&tx.blockTime===s.blockTime&&tx.slot===s.slot&&tx.transaction?.signatures?.includes(s.signature);
  const balances=ok?[...(tx.meta.preTokenBalances||[]),...(tx.meta.postTokenBalances||[])].filter(b=>b.mint===target.mint):[];
  const logs=ok?(tx.meta.logMessages||[]).filter(x=>/Instruction: (Buy|Sell)/i.test(x)):[];
  details.push({signature:s.signature,block_time:s.blockTime,slot:s.slot,receipt_id:p.id,transaction_metadata_verified:ok,matching_mint_balance_records:balances.length,observed_instruction_labels:logs,exact_pool_or_two_way_quote_verified:false});
 }
 chain.push({mint:target.mint,scan_at:target.scan_at_utc,feature_at:target.feature_at_utc,pages,history_boundary_observed:boundary,matching_prescan_success_signatures:signatures.length,details,independent_risk_or_quote_verified:false});
}
await writeFile(out+'/midnight-chain.json',JSON.stringify({chain,calls,halt,original_provider_delivery_proven:false,orders:0},null,2)+'\n');
console.log('R29_V210_MIDNIGHT_CHAIN',JSON.stringify({chain,calls,halt}));
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(protect));
