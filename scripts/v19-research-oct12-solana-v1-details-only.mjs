// R29 two-pool source-only targeted retry for four known October signatures.
// Previous original public RPC pages reached 597+1192 pre-scan signatures;
// getTransaction failed with documented RPC -32015 because version 1 was
// unsupported by the old maxSupportedTransactionVersion 0 client option.
// This script CHANGES ONLY THE REQUEST OPTION to V1, no page reharvest.
// Four PUBLIC RPC reads max, zero user keys, wallets, writes, swaps, orders.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {R29_OCT12_CHAIN_RESEARCH_TARGETS as targets,
 makeSolanaChainTransactionRpc,auditSolanaRpcEnvelope,
 auditSolanaChainTransactionDetail}
 from '../src/v19-october-solana-chain-research.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';
const SHA=x=>createHash('sha256').update(x).digest('hex');
const run=process.env.GITHUB_RUN_ID,commit=process.env.GITHUB_SHA;
if(process.env.GITHUB_REF!=='refs/heads/codex/r29-cleanroom-paper-20261121'
 ||!/^[0-9a-f]{40}$/.test(commit||'')||!/^[0-9]{1,20}$/.test(run||''))
 throw Error('ONLY_PREAPPROVED_TWO_POOL_GITHUB_READONLY_REQUEST');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const req=changed.filter(x=>/^research\/oct12-v1-details-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||req.length!==1)throw Error('EXPECTED_ONE_RESEARCH_ONLY_USER_REQUEST');
const bytes=await readFile(req[0]);
const q=JSON.parse(bytes);
if(q.schema!==1||q.kind!=='R29_V19_EXACT_FOUR_OCT12_SOLANA_TX_V1_RETRY'
 ||q.previous_signature_run_id!=='45135241060'
 ||q.previous_signature_artifact_id!==14798898526
 ||q.transaction_rpc_max_supported_version!==1
 ||q.max_public_rpc_get_transaction_calls!==4
 ||q.read_only!==true||q.no_orders!==true
 ||q.no_new_oracle_based_coin_discovery!==true
 ||q.no_historical_quote_invention!==true)
 throw Error('UNAUTHORIZED_HISTORICAL_V1_TRANSACTION_RETRY');
const protectedPaths=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(protectedPaths);
const original='probe-artifacts/original-onchain-run/r29-oct12-chain-45135241060/read-only-chain-audit.json';
const oldBytes=await readFile(original);
const PIN='1f0e711292d1775cfde4aa13a240932c63ba3eb42b79f86ba8bc029228ff2322';
if(SHA(oldBytes)!==PIN)throw Error('SOURCE_SIGNED_SIGNATURE_PAGE_REPORT_CHANGED');
const previous=JSON.parse(oldBytes);
if(previous.kind!=='R29_V19_READONLY_TWO_SOLANA_POOL_ONCHAIN_SOURCE_RESEARCH'
 ||previous.github_action_run_id!=='45135241060'
 ||previous.results?.length!==2
 ||previous.results.some((item,i)=>item.target?.pool!==targets[i].pool
  ||item.target?.mint!==targets[i].mint
  ||item.target?.scan!==targets[i].scan
  ||item.history?.suggested_detail_signatures?.length!==2
  ||item.history.candidate_successful_chain_signatures_until_scan.length<1
  ||item.details?.some(x=>x.status!=='RPC_METHOD_ERROR_DATA_GAP')))
 throw Error('NO_TRUSTED_FOUR_TRANSACTION_SIGNED_HISTORY_RETRY_TARGETS');
const output='probe-artifacts/r29-oct12-tx-v1-'+run;
await mkdir(output,{recursive:true});
const reports=[];
let calls=0,sourceGaps=0;
for(const [i,item] of previous.results.entries()){
 const results=[];
 for(const [j,signature] of item.history.suggested_detail_signatures.entries()){
  if(calls>=4)throw Error('RPC_TRANSACTION_DETAIL_BUDGET_EXCEEDED');
  const originalCandidate=item.history.candidate_successful_chain_signatures_until_scan
   .find(x=>x.signature===signature);
  if(!originalCandidate||originalCandidate.before_or_at_target_scan!==true
   ||originalCandidate.rpc_reported_err!==null)
   throw Error('RPC_QUERY_SIGNATURE_WAS_NOT_VERIFIED_PRE_SCAN');
  const query=makeSolanaChainTransactionRpc({
   target:targets[i],signature,index:0});
  if(query.method!=='getTransaction'
   ||query.params[1].maxSupportedTransactionVersion!==1)
   throw Error('SOLANA_RPC_V1_RETRY_METHOD_FAILED_CLOSED');
  calls++;
  let http_status=0,raw_text='';
  try{
   const response=await fetch('https://api.mainnet.solana.com',{
    method:'POST',headers:{'content-type':'application/json',
     'accept':'application/json'},body:JSON.stringify(query),
    signal:AbortSignal.timeout(13000)});
   http_status=response.status;
   const body=Buffer.from(await response.arrayBuffer());
   if(body.length>4_000_000)throw Error('RPC_LARGE_RESPONSE');
   raw_text=body.toString('utf8');
  }catch(e){
   if(http_status===200)http_status=0;
   raw_text=JSON.stringify({rpc_gap:true,
    reason:e?.name==='TimeoutError'?'TIMEOUT':'PUBLIC_RPC_FAILURE'});
  }
  const receipt={endpoint:'https://api.mainnet.solana.com',
   http_method:'POST',json_rpc_request:query,
   http_status,raw_text,captured_at_utc:new Date().toISOString(),
   raw_sha256:SHA(Buffer.from(raw_text,'utf8'))};
  await writeFile(output+'/original-tx-response-'+(i+1)+'-'+(j+1)+'.txt',
   raw_text,{flag:'wx'});
  const envelope=auditSolanaRpcEnvelope({request:query,receipt});
  if(envelope.kind!=='RPC_OK')sourceGaps++;
  const verified=auditSolanaChainTransactionDetail({
   target:targets[i],signature,receipt});
  results.push({...verified,original_signature_status:originalCandidate,
   rpc_http_status:http_status,response_sha256:receipt.raw_sha256,
   rpc_result_class:envelope.kind,
   no_provider_quote_or_execution_permission:true});
  console.log('R29_ONCHAIN_VERSION1_TX_DETAIL',JSON.stringify({
   coin:targets[i].coin_label,scan_at_utc:targets[i].scan_at_utc,
   signature,rpc_method:query.method,http_status,
   rpc_kind:envelope.kind,verified_status:verified.status,
   token_balance_changes:verified.mint_balance_changes_observed,
   original_provider_quote_verified:false,orders:0}));
 }
 reports.push({coin:targets[i].coin_label,scan:targets[i].scan,
  pool:targets[i].pool,mint:targets[i].mint,transactions:results});
}
const confirmed=reports.reduce((n,x)=>n+x.transactions.filter(t=>
 t.historical_onchain_tx_at_or_before_scan_verified===true).length,0);
const result={schema:1,kind:'R29_V19_READONLY_ORIGINAL_OCT12_SOLANA_TX_VERSION1_DETAILS',
 github_run_id:run,source_commit:commit,
 original_signature_run_id:'45135241060',
 original_report_sha256:SHA(oldBytes),
 source_request_sha256:SHA(bytes),source_request_path:req[0],
 direct_public_rpc_calls:calls,public_rpc_budget:4,
 provider_errors:sourceGaps,
 historical_onchain_transactions_with_confirmed_metadata:confirmed,
 onchain_token_balance_change_event_count:reports.reduce((n,x)=>
  n+x.transactions.reduce((sum,t)=>sum+(t.mint_balance_changes_observed||0),0),0),
 exactly_one_public_rpc_upstream:true,
 original_historical_provider_delivery_to_gpt_proven:false,
 original_dex_pool_reserves_and_50_usdc_slippage_verified:false,
 independent_historical_issuer_signature_verified:false,
 historic_buy_sell_route_and_sellability_verified:false,
 windows_paper_fills_verified:false,actual_orders_created:0,
 dot3_04_dot3_05_and_qa04_not_promoted:true,
 chain_records_are_not_a_substitute_for_a_real_october_entry_exit_quote:true,
 results:reports};
await writeFile(output+'/verified-tx-v1-research.json',
 JSON.stringify(result,null,2)+'\n',{flag:'wx'});
await writeFile(output+'/report-auf-deutsch.md',[
 '# R29 – Vor-Scan Original-Solana-Transaktionen, Version 1',
 '',
 'Quelle: vier an der alten 12.10.-Zeitgrenze vorgefilterte Signaturen',
 'aus dem bereits SHA-256-gepinnten Quelllauf 45135241060. Einziger',
 'Unterschied zur fehlgeschlagenen ersten Detailprüfung:',
 '\x60maxSupportedTransactionVersion: 1\x60 statt 0.',
 '',
 'Öffentliche RPC-Detailabfragen: '+calls,
 'Lücken/Methodenfehler: '+sourceGaps,
 'Vollständige finale Onchain-Transaktionsdetails vor Scanzeiten: '+confirmed,
 '',
 '| Coin | Scan UTC | Solana-Details belegt | Tokenkontoänderungen belegt |',
 '|---|---|---:|---:|',
 ...reports.map(x=>'| '+x.coin+' | '+String(x.scan-1).padStart(2,'0')+
 ':00 | '+x.transactions.filter(t=>
   t.historical_onchain_tx_at_or_before_scan_verified===true).length+
 ' | '+x.transactions.reduce((n,t)=>n+(t.mint_balance_changes_observed||0),0)+' |'),
 '',
 'Ein Konto-/Pool-Bezug beweist keine reale 50-USDC-BUY/SELL-Order;',
 'kein unabhängiger Oktober-Quote-Beleg und kein Risikogate wurde aufgehoben.',
 'Open/Close-Kerzen, Gewinnerorakel und Livepreise werden NICHT als',
 'historische Handelsentscheidungen eingespielt.'
].join('\n')+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,
 await fingerprintProtectedFiles(protectedPaths));
console.log('R29_OCT12_SOLANA_V1_DETAIL_RETRY_COMPLETE',JSON.stringify({
 source_run:'45135241060',run_id:run,
 calls,source_gaps:sourceGaps,
 original_onchain_tx_confirmed:confirmed,
 token_account_balance_change_rows:result.onchain_token_balance_change_event_count,
 original_historical_provider_quotes:0,independent_sellability:0,
 original_five_gpt_reviews:0,actual_client_fills:0,orders:0}));
