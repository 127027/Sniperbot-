// Explicit user-authorized one-shot, three public Solana getBlock reads.
// After-event research only. No wallet, orders, API keys, paper fills.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {OCT12_ORIGINAL_BLOCK_TARGETS as targets,
 makeR29OriginalSlotOrderRequest,auditR29OriginalSlotOrder}
 from '../src/v19-oct12-solana-verified-block-order.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';

const run=process.env.GITHUB_RUN_ID,commit=process.env.GITHUB_SHA;
if(process.env.GITHUB_REF!=='refs/heads/codex/r29-cleanroom-paper-20261121'
 ||!/^[0-9a-f]{40}$/.test(commit||'')
 ||!/^[0-9]{1,20}$/.test(run||''))
 throw Error('ONLY_EXPLICIT_POSTRUN_OCT12_RESEARCH_COMMIT_ALLOWED');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const requests=changed.filter(x=>
 /^research\/oct12-slot-order-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||requests.length!==1)
 throw Error('ONE_EXPLICIT_POSTRUN_BLOCK_ORDER_REQUEST_REQUIRED');
const data=await readFile(requests[0]),q=JSON.parse(data);
if(q?.schema!==1||q.kind!=='R29_V19_ORIGINAL_3_SOLANA_SLOTS_BLOCK_ORDER_POSTRUN'
 ||q.original_four_transaction_run_id!=='45135625789'
 ||q.original_pinned_pool_delta_run_id!=='45140096805'
 ||q.max_rpc_getblock_calls!==3
 ||q.no_trades!==true||q.read_only!==true
 ||q.no_history_retroactive_availability_claims!==true
 ||q.not_a_historical_50usdc_quote!==true)
 throw Error('UNAUTHORIZED_SOLANA_HISTORIC_BLOCK_RESEARCH');
const sha=x=>createHash('sha256').update(x).digest('hex');
const protectedPaths=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(protectedPaths);
const dir='probe-artifacts/r29-original-oct12-slot-order-'+run;
await mkdir(dir,{recursive:true});
const rows=[];
for(let i=0;i<targets.length;i++){
 const req=makeR29OriginalSlotOrderRequest(i);
 if(req.method!=='getBlock'||req.params[1].transactionDetails!=='signatures'
   ||req.params[1].maxSupportedTransactionVersion!==1)
  throw Error('READONLY_BLOCK_REQUEST_UNAUTHORIZED_METHOD');
 let raw_text='',http_status=0;
 try{
  const res=await fetch('https://api.mainnet.solana.com',{
   method:'POST',headers:{'content-type':'application/json',
    accept:'application/json'},body:JSON.stringify(req),
   signal:AbortSignal.timeout(14000)});
  http_status=res.status;
  const raw=Buffer.from(await res.arrayBuffer());
  if(raw.length>4_000_000)throw Error('PUBLIC_BLOCK_RESPONSE_TOO_BIG');
  raw_text=raw.toString('utf8');
 }catch(e){
  if(http_status===200)http_status=0;
  raw_text=JSON.stringify({source_gap:true,
   reason:e?.name==='TimeoutError'?'TIMEOUT':'PUBLIC_SOLANA_RPC_UNAVAILABLE'});
 }
 const receipt={url:'https://api.mainnet.solana.com',method:'POST',
  request:req,raw_text,http_status,
  raw_sha256:sha(Buffer.from(raw_text,'utf8')),
  captured_at_utc:new Date().toISOString()};
 await writeFile(dir+'/get-block-'+targets[i].slot+'.txt',
  raw_text,{flag:'wx'});
 const audit=auditR29OriginalSlotOrder({index:i,receipt});
 rows.push(audit);
 console.log('R29_ORIGINAL_BLOCK_ORDER_RESEARCH_ITEM',JSON.stringify({
  slot:targets[i].slot,coin:targets[i].coin,
  http_status,code:audit.code,
  signature_indices:audit.signature_indices??null,
  ariana_signature_order_compatible:audit.ariana_order_confirmed_by_slot_sequence??null,
  after_event_only:true,trade_authorized:false}));
}
const result={schema:1,
 kind:'R29_V19_ORIGINAL_OCT12_THREE_BLOCKS_SIGNATURE_ORDER_RESEARCH',
 source:'PUBLIC_SOLANA_MAINNET_ONE_RPC_NODE_POST_EVENT',
 run_id:run,source_commit:commit,
 original_four_tx_run_id:'45135625789',
 original_account_continuity_run_id:'45140096805',
 request_sha256:sha(data),
 three_original_target_slots:targets.map(x=>x.slot),
 public_rpc_requests:rows.length,max_requests:3,
 rpc_slots_with_all_requested_signatures:rows.filter(x=>x.exact_original_signature_membership===true).length,
 ariana_same_slot_accounting_chain_order_verified_by_block:
  rows[2].ariana_order_confirmed_by_slot_sequence===true,
 missing_original_block_data_is_data_gap:true,
 original_quote_provider_delivered_at_scan_verified:false,
 guaranteed_timing_finality_at_original_scan_verified:false,
 onchain_pool_virtual_reserves_and_50usdc_exits_verified:false,
 chain_sellability_issuer_authentication_verified:false,
 original_five_gpt_dot_reviews_verified:false,
 original_windows_paper_fills_verified:false,
 public_rpc_original_read_after_event:true,orders_created:0,
 blocks:rows};
await writeFile(dir+'/block-order-research.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
await writeFile(dir+'/report-de.md',[
 '# R29 – Solana Originalblock-Reihenfolge 12.10.2026',
 '',
 'Drei unveränderliche, durch die vier vorherigen getTransaction-Details',
 'ausgewählte Slots. Genau drei öffentliche RPC getBlock signaturen-Abfragen.',
 '**Kein** historischer BUY/SELL-, Sellability- oder USD-Quotenbeleg.',
 '',
 '| Slot | Coin | Alte Signaturen im Originalblock | Prüfstatus |',
 '|---:|---|---:|---|',
 ...rows.map((x,i)=>
  '| '+targets[i].slot+' | '+targets[i].coin+
  ' | '+(x.signature_indices?.filter(n=>n>=0).length??0)+' | '+x.code+' |'),
 '',
 'ARIANA: dieselbe Slot-Reihenfolge mit beiden Token-/SOL-Kontoständen vereinbar: '+
 (result.ariana_same_slot_accounting_chain_order_verified_by_block?'JA':'NICHT BELEGT'),
 'Die Originalquelle wurde erst am 23.11.2026 abgefragt.',
 'Kein Nachweis der tatsächlichen Original-GPT-Verfügbarkeit, Pool-Virtual-Reserven,',
 'echten 50-USDC-BUY+SELL-Route oder ursprünglichen Windows-Paper-Fills.'
].join('\n')+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(protectedPaths));
console.log('R29_ORIGINAL_BLOCK_SLOT_ORDER_COMPLETE',JSON.stringify({
 run_id:run,blocks_confirmed:result.rpc_slots_with_all_requested_signatures,
 ariana_original_signature_order_matches_two_asset_account_continuity:
  result.ariana_same_slot_accounting_chain_order_verified_by_block,
 original_historical_executable_quotes:0,actual_trades:0}));
