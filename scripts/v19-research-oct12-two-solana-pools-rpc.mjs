// R29: user-authorized bounded Solana mainnet READ-ONLY transaction audit.
// Two exact naturally discovered neutral October 2026 SOL pools ONLY.
// The public node may refuse historical reads, rate-limit or omit history:
// record source gaps rather than forge any pass. NO order submission APIs.
// 8 maximum getSignaturesForAddress pages + 4 getTransaction = 12 RPC calls.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {R29_OCT12_CHAIN_RESEARCH_TARGETS as targets,
 MAX_CHAIN_HISTORY_PAGES_PER_POOL as maxPages,
 MAX_CHAIN_TRANSACTION_DETAILS_PER_POOL as maxTxs,
 makeSolanaChainHistoryRpc,makeSolanaChainTransactionRpc,
 auditSolanaRpcEnvelope,auditSolanaPoolSignatureHistory,
 auditSolanaChainTransactionDetail}
 from '../src/v19-october-solana-chain-research.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';
const githubBranch='refs/heads/codex/r29-cleanroom-paper-20261121';
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!==githubBranch
 ||!/^[a-f0-9]{40}$/.test(commit||'')
 ||!/^[0-9]{1,20}$/.test(run||''))
 throw Error('R29_CHAIN_RESEARCH_NEEDS_EXPLICIT_GITHUB_REQUEST');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const requestFiles=changed.filter(x=>
 /^research\/oct12-two-pool-chain-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||requestFiles.length!==1)
 throw Error('ONLY_ONE_PREAPPROVED_READONLY_REQUEST_FILE_ALLOWED');
const bytes=await readFile(requestFiles[0]),request=JSON.parse(bytes);
if(request?.schema!==1
 ||request.kind!=='R29_V19_POSTRUN_OCT12_TWO_POOL_ONCHAIN_AUDIT'
 ||request.date!=='2026-10-12'
 ||request.pools_to_research!==2||request.max_rpc_calls!==12
 ||request.read_only!==true||request.no_winner_oracle_seed!==true
 ||request.no_orders_or_simulations!==true
 ||request.no_historical_quote_fabrication!==true
 ||request.original_gecko_run_id!=='45132577450'
 ||request.original_gecko_artifact_id!==14798357350)
 throw Error('UNAUTHORIZED_TWO_POOL_RPC_PROBE');
const sha=content=>createHash('sha256').update(content).digest('hex');
const protectedPaths=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const originalFiles=await fingerprintProtectedFiles(protectedPaths);
const sourcePath='probe-artifacts/verified-two-pools/r29-retro-gecko-45132577450/gecko-crosscheck.json';
const originalBytes=await readFile(sourcePath);
const pinned='f3971e80cbf63bdcac15ea80606b417f0039b072d563d32d4d5e539cf0a05bbd';
if(sha(originalBytes)!==pinned)
 throw Error('TWO_POOL_INDEPENDENT_DOMAIN_SOURCE_CHANGED');
const source=JSON.parse(originalBytes.toString('utf8'));
if(source.kind!=='R29_V19_POSTRUN_TWO_PROVIDER_POOL_AND_HISTORIC_OHLCV_DIAGNOSTIC'
 ||source.results?.length!==2
 ||source.results.some((x,i)=>
   x.mint!==targets[i].mint||x.pool_address!==targets[i].pool
   ||x.scan!==targets[i].scan
   ||x.current_second_provider_pool_exact_mint_match!==true
   ||x.historical_50_usdc_buy_sell_quote_verified!==false)
 ||source.historically_executable_buy_quote_count!==0
 ||source.historically_executable_sell_quote_count!==0
 ||source.never_eligible_for_replay_or_live_paper_orders!==true)
 throw Error('RPC_TARGETS_NO_LONGER_PINNED_TO_ORIGINAL_TWO_SOURCE_RESULT');
const targetDir='probe-artifacts/r29-oct12-chain-'+run;
await mkdir(targetDir,{recursive:true});
let used=0,errors=0;
async function rpc(request,id){
 if(used>=12)throw Error('R29_RPC_READ_BUDGET_EXCEEDED');
 used++;
 const start=new Date().toISOString(),endpoint='https://api.mainnet.solana.com';
 let http_status=0,raw_text='';
 try{
  const response=await fetch(endpoint,{method:'POST',
   headers:{'content-type':'application/json','accept':'application/json'},
   body:JSON.stringify(request),signal:AbortSignal.timeout(13000)});
  http_status=response.status;
  const raw=Buffer.from(await response.arrayBuffer());
  if(raw.length>4_000_000)throw Error('SOLANA_RPC_RESPONSE_TOO_BIG');
  raw_text=raw.toString('utf8');
 }catch(e){
  if(http_status===200)http_status=0;
  raw_text=JSON.stringify({local_source_gap:true,
   code:e?.name==='TimeoutError'?'PUBLIC_RPC_TIMEOUT':
    e?.message==='SOLANA_RPC_RESPONSE_TOO_BIG'?'PUBLIC_RPC_RESPONSE_TOO_LARGE':
    'RPC_UNAVAILABLE_NO_PUBLIC_READ'});
 }
 const receipt={endpoint,http_method:'POST',
  json_rpc_request:request,http_status,
  captured_at_utc:new Date().toISOString(),
  raw_text,raw_sha256:sha(Buffer.from(raw_text,'utf8'))};
 await writeFile(targetDir+'/rpc-raw-'+id+'.txt',raw_text,{flag:'wx'});
 const parsed=auditSolanaRpcEnvelope({request,receipt});
 if(parsed.kind!=='RPC_OK')errors++;
 console.log('R29_SOLANA_RPC_READ_RECEIPT',JSON.stringify({
  probe:id,method:request.method,http_status,parse_status:parsed.kind,
  original_provider_event_time_attested:false,
  raw_sha256:receipt.raw_sha256,raw_bytes:Buffer.byteLength(raw_text),
  orders:0}));
 return {receipt,parsed};
}
const report=[];
for(const target of targets){
 const pages=[];
 let before=null;
 for(let i=0;i<maxPages;i++){
  const request=makeSolanaChainHistoryRpc({target,index:i,before});
  const entry=await rpc(request,'pool-'+target.scan+'-history-'+(i+1));
  pages.push(entry.receipt);
  const result=entry.parsed.response;
  if(entry.parsed.kind!=='RPC_OK'||!Array.isArray(result))break;
  if(result.length===0||result.length<100)break;
  if(result.some(x=>!x?.signature||!Number.isSafeInteger(x.blockTime)))break;
  if(result.some(x=>x.blockTime*1000<=Date.parse('2026-10-11T19:00:00.000Z')))
   break;
  before=result.at(-1).signature;
 }
 const sigAudit=auditSolanaPoolSignatureHistory({target,pages});
 const details=[];
 for(const [i,signature] of sigAudit.suggested_detail_signatures.slice(0,maxTxs).entries()){
  const request=makeSolanaChainTransactionRpc({target,signature,index:0});
  const response=await rpc(request,'pool-'+target.scan+'-detail-'+(i+1));
  const inspected=auditSolanaChainTransactionDetail({
   target,signature,receipt:response.receipt});
  details.push(inspected);
 }
 report.push({target,history:sigAudit,details,
  independent_historical_issuer_signature_verified:false,
  actual_historical_50_usdc_quote_proven:false,
  sellability_proven:false,authorized_paper_trade:false});
}
const result={schema:1,kind:'R29_V19_READONLY_TWO_SOLANA_POOL_ONCHAIN_SOURCE_RESEARCH',
 source:'SOLANA_MAINNET_PUBLIC_RPC_SINGLE_NODE_UNAUTHENTICATED_UPSTREAM',
 source_artifact_from_two_domains_sha256:sha(originalBytes),
 github_action_run_id:run,source_commit:commit,request_path:requestFiles[0],
 request_sha256:sha(bytes),
 historical_window:'2026-10-11T19:00:00Z..2026-10-13T00:00:00Z_EXCLUSIVE',
 source_http_post_requests:used,maximum_source_http_post_requests:12,
 source_http_or_rpc_errors:errors,
 results:report,
 currently_verified_chain_transactions:
  report.reduce((n,x)=>n+x.details.filter(y=>
    y.historical_onchain_tx_at_or_before_scan_verified).length,0),
 unique_pool_addresses:2,
 original_2026_10_client_quote_delivery_verified:false,
 historical_50_usdc_buy_and_sell_route_verified:false,
 independently_authenticated_onchain_sellability:false,
 dot3_authentication_gate_unchanged:true,qa04_release_gate_unchanged:true,
 all_five_original_gpt_dot_runs_verified:false,
 original_windows_paper_order_fills_verified:false,
 original_65_winner_oracle_not_used_to_select_targets:true,
 no_live_or_paper_orders_ever_sent:true,
 public_rpc_truncation_or_missing_history_is_data_gap:true,
 postrun_chain_transaction_history_is_not_tradable_asof_quote:true};
await writeFile(targetDir+'/read-only-chain-audit.json',
 JSON.stringify(result,null,2)+'\n',{flag:'wx'});
const lines=[
 '# R29 OCT12 – Solana-Onchain-Originaldaten, zwei Pools (Research-Only)',
 '',
 'Public RPC JSON-RPC POST: **getSignaturesForAddress**, optional',
 '**getTransaction** für höchstens 2 passende Signaturen je Pool.',
 'Keine Handelsoperationen, keine Broker-, Wallet- oder GPT-APIs.',
 'Diese Recherche fand am 23.11.2026 statt – spätere RPC-Antwort ist kein',
 'Oktober-Provider-Quote-/Sellability-Beleg.',
 '',
 'Maximal 12 RPC-Aufrufe, tatsächlich: '+used,
 'Fehlende, ungültige, begrenzte HTTP/RPC-Antworten: '+errors,
 'Verifizierte Erfolgstransaktionen vor den jeweiligen Stundenscans: '+
  result.currently_verified_chain_transactions,
 '',
 '| Scan | Pool | historische Signaturbelege bis Scan | RPC-Verlaufsabdeckung | verifizierte Vor-Scan Transaktionsdetails |',
 '|---:|---|---:|---|---:|',
 ...report.map(x=>'| '+String(x.target.scan).padStart(2,'0')+':00 | '+
 x.target.pool+' | '+x.history.candidate_successful_chain_signatures_until_scan.length+
 ' | '+x.history.signature_history_boundary_status+
 ' | '+x.details.filter(d=>d.historical_onchain_tx_at_or_before_scan_verified).length+' |'),
 '',
 'Unvollständige Chain-Historie ist **kein Beleg**, dass der Coin nicht handelbar war.',
 '**0** unabhängig belegt tatsächlich exekutierbare 50-TEST-USDC-BUY+SELL-Quote.',
 '**0** vollständig nachgewiesene originale Chain-Sellability-/Issuer-Gates.',
 '**0** tatsächliche historische GPT-/Windows-Fills.',
 '',
 'Original-RPC-Bodies, SHA-256 und prüfbare Zeitstempel liegen im GitHub-Artefakt.'
];
await writeFile(targetDir+'/report-german.md',lines.join('\n')+'\n',{flag:'wx'});
await writeFile(targetDir+'/audit-receipt.json',JSON.stringify({
 run_id:run,source_request_path:requestFiles[0],
 source_sha256:sha(originalBytes),api_calls:used,source_errors:errors,
 raw_files_were_content_addressed:true,
 exactly_two_pinned_neutral_historical_mints:true,
 order_submissions:0,existing_paper_ledger_changed:false
},null,2)+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(originalFiles,
 await fingerprintProtectedFiles(protectedPaths));
console.log('R29_ORIGINAL_CHAIN_READONLY_RESEARCH_COMPLETE',JSON.stringify({
  run_id:run,read_calls:used,source_gaps:errors,
  pool1_history_status:report[0].history.signature_history_boundary_status,
  pool2_history_status:report[1].history.signature_history_boundary_status,
  candidate_signatures_before_scans:report.map(x=>
   x.history.candidate_successful_chain_signatures_until_scan.length),
  original_onchain_transactions_verified:result.currently_verified_chain_transactions,
  original_50usdc_buy_sell_quotes:0,original_sellability_fully_verified:0,
  historical_five_dot_decisions:0,client_paper_fills:0,orders:0}));
