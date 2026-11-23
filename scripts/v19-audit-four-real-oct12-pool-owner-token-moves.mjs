// Purely offline final original-bytes audit of four historical Solana V1
// transaction receipts. NO API, NO order, NO paper wallet mutation.
// "Owned pool mint token change" is NOT a route, reserve in both assets,
// original provider-delivered quotes, or sellability authorization.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {R29_PINNED_FOUR_OCT12_TRANSACTION_SOURCE_DIGESTS as pins,
 analyzePinnedOriginalPoolOwnerBalanceDeltas}
 from '../src/v19-oct12-verified-pool-token-account-deltas.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';
const SHA=x=>createHash('sha256').update(x).digest('hex');
const run=process.env.GITHUB_RUN_ID,commit=process.env.GITHUB_SHA;
if(process.env.GITHUB_REF!=='refs/heads/codex/r29-cleanroom-paper-20261121'
 ||!/^[0-9a-f]{40}$/.test(commit||'')||!/^[0-9]{1,20}$/.test(run||''))
 throw Error('ONLY_EXPLICIT_R29_OFFLINE_CHAIN_RESEARCH_ACTION');
const paths=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const chosen=paths.filter(x=>
 /^research\/oct12-pool-owner-token-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(paths.length!==1||chosen.length!==1)
 throw Error('EXACT_ONE_ISOLATED_RESEARCH_REQUEST_REQUIRED');
const rawReq=await readFile(chosen[0]),q=JSON.parse(rawReq);
if(q?.schema!==1
 ||q.kind!=='R29_V19_FOUR_REAL_TRANSACTION_POOL_OWNER_BALANCE_DELTAS'
 ||q.original_v1_run_id!=='45135625789'
 ||q.original_v1_artifact_id!==14798694515
 ||q.expected_raw_transactions!==4||q.offline_only!==true
 ||q.no_provider_calls!==true||q.no_orders!==true
 ||q.no_quote_backtest_injection!==true)
 throw Error('INVALID_OR_UNAUTHORIZED_POSTRUN_POOL_DELTA_REQUEST');
const protect=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const original=await fingerprintProtectedFiles(protect);
const folder='probe-artifacts/original-v1-four-tx/r29-oct12-tx-v1-45135625789/';
const records=[];
for(let i=0;i<pins.length;i++){
 const body=await readFile(folder+pins[i].file,'utf8');
 records.push(analyzePinnedOriginalPoolOwnerBalanceDeltas({sourceRaw:body,index:i}));
}
if(records.length!==4||records.some((x,i)=>
 x.source_sha256!==pins[i].sha256
 ||x.proven_pool_owner_mint_token_balance_change_accounts!==1
 ||x.pool_owned_token_delta_rows.length!==1
 ||x.pool_owned_token_delta_rows[0].token_account_movement_direction!=='INCOMING_MINT_TOKENS'
 ||x.historical_five_dot_gpt_review_receipt_verified!==false
 ||x.dot3_issuer_or_sellability_authorization!==false
 ||x.trade_authorized!==false))
 throw Error('ORIGINAL_POOL_ACCOUNT_BALANCE_RESEARCH_INCONSISTENT');
const aggregate=records.reduce((acc,x)=>{
 const k=x.coin_label;
 if(!acc[k])acc[k]={scan:x.target_scan,
  token_movement_count:0,observed_incoming_raw_token_units:'0',
  earliest_block_time_utc:x.rpc_reported_block_time_utc,
  latest_block_time_utc:x.rpc_reported_block_time_utc,
  raw_token_decimals:x.pool_owned_token_delta_rows[0].decimals};
 acc[k].token_movement_count++;
 acc[k].observed_incoming_raw_token_units=(
  BigInt(acc[k].observed_incoming_raw_token_units)+
  BigInt(x.pool_owned_token_delta_rows[0].absolute_delta_raw_mint_tokens)).toString();
 if(x.rpc_reported_block_time_utc<acc[k].earliest_block_time_utc)
  acc[k].earliest_block_time_utc=x.rpc_reported_block_time_utc;
 if(x.rpc_reported_block_time_utc>acc[k].latest_block_time_utc)
  acc[k].latest_block_time_utc=x.rpc_reported_block_time_utc;
 return acc;
},{});
const report={schema:1,kind:'R29_V19_ORIGINAL_OCT12_POOL_OWNER_MINT_BALANCE_RESEARCH',
 run_id:run,source_commit:commit,request_path:chosen[0],
 original_v1_source_run_id:'45135625789',
 original_four_sha256s:pins.map(x=>x.sha256),
 four_tx_pre_scan_blocktimes_original_rpc_verified:true,
 four_token_owner_account_deltas_exactly_matched:true,
 exact_pool_owner_token_move_record_count:records.length,
 minted_original_quote_around_50usdc_verified:false,
 original_asof_provider_available_before_scan:false,
 tax_or_honeypot_sellability_verified:false,
 two_sided_pool_reserve_state_or_trade_route_verified:false,
 original_historical_five_gpt_dot_reviews_verified:false,
 original_windows_paper_fills_verified:false,
 actual_client_trade_orders:0,post_event_readonly_evidence_only:true,
 observations:records,per_coin:aggregate};
const dir='probe-artifacts/r29-original-pool-token-delta-'+run;
await mkdir(dir,{recursive:true});
await writeFile(dir+'/analysis-original-pool-token-deltas.json',
 JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const lines=[
 '# R29 – Original-Blockchain-Pool-Tokenbewegungen vor Scan',
 '',
 'Die vier genau SHA-verifizierten Original-RPC-TX-Responses sind nur',
 'post-event recherchierte Chain-Metadaten. Alle vier enthalten eine',
 'Tokenkontobewegung mit der exakten Pooladresse als Eigentümer.',
 '',
 '| Coin | Scan UTC | Zeitstempel vor Scan | Eingehende rohe Mint-Einheiten | Präzision |',
 '|---|---|---|---:|---:|',
 ...records.map(x=> '| '+x.coin_label+' | '+String(x.target_scan-1).padStart(2,'0')+
 ':00 | '+x.rpc_reported_block_time_utc+' ('+
 x.seconds_from_reported_block_time_to_scan+'s vorher) | '+
 x.pool_owned_token_delta_rows[0].absolute_delta_raw_mint_tokens+' | '+
 x.pool_owned_token_delta_rows[0].decimals+' |'),
 '',
 '**Originaler vollständiger Pool-Reservezustand beider Assets: NICHT BEWIESEN.**',
 '**Historisches 50-USDC-BUY-/SELL-Angebot/Slippage: NICHT BEWIESEN.**',
 '**Sellbarkeit, Freeze, Blacklist, Tax: NICHT BEWIESEN.**',
 '**GPT im Oktober und Windows-Paper-Fills: NICHT BEWIESEN.**',
 'Eine signierte Transaktion vor Scan zeigt nicht, wann ihr Finalitätsstatus',
 'für die damaligen Dots verfügbar gewesen wäre. Keine positive Dot3-Freigabe.',
 '',
 'Diese vier Transaktionen sind keine rückwärts hineinprojizierten',
 'Trades des Benutzers und kein messbarer Backtest-PnL.'
];
await writeFile(dir+'/bericht-de.md',lines.join('\n')+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(original,await fingerprintProtectedFiles(protect));
console.log('R29_FOUR_REAL_OCT12_POOL_OWNER_MOVEMENTS_COMPLETE',JSON.stringify({
 count:records.length,per_coin:aggregate,
 original_october_bidirectional_50usdc_quotes:0,
 independent_sellability:0,original_gpt_reviews:0,
 original_client_fills:0,order_writes:0}));
