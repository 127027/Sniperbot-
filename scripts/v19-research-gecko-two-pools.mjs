// R29 23 NOV: strictly post-event read-only second source research for exactly
// two public 2026-10-12 Solana mint/pool hints from pinned DexScreener capture.
// A historical USD candle, if present today, does NOT establish original
// provider delivery, 50-USDC BUY/SELL execution or chain sellability.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {makeTwoPoolGeckoResearchPlan,evaluateGeckoPoolAndOldCandles}
 from '../src/v19-postrun-two-pool-gecko-crosscheck.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';

const ref='refs/heads/codex/r29-cleanroom-paper-20261121';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceCommit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!==ref||!/^[0-9a-f]{40}$/.test(sourceCommit||'')
  ||!/^[0-9]{1,20}$/.test(run||''))
 throw Error('ONLY_EXPLICIT_ISOLATED_GITHUB_RESEARCH_ACTION_ALLOWED');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',sourceCommit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const chosen=changed.filter(x=>
 /^research\/gecko-two-pool-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||chosen.length!==1)
 throw Error('ONE_ISOLATED_USER_RESEARCH_REQUEST_COMMIT_REQUIRED');
const requestRaw=await readFile(chosen[0]),req=JSON.parse(requestRaw);
if(req.schema!==1||req.kind!=='R29_V19_SECOND_POSTRUN_PROVIDER_POOL_OHLCV'
 ||req.date!=='2026-10-12'||req.max_public_http_requests!==4
 ||req.dex_earlier_run_id!=='45132061221'
 ||req.dex_artifact_id!==14798535846
 ||req.read_only!==true||req.no_openai_api_key!==true
 ||req.no_historic_asof_claim!==true||req.no_orders!==true
 ||req.no_winner_oracle_seed!==true)
 throw Error('UNAUTHORIZED_EXTERNAL_SECOND_SOURCE_RESEARCH');
const protectedFiles=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const old=await fingerprintProtectedFiles(protectedFiles);
const dexPath='probe-artifacts/prior-dex-research/r29-retro-mint-pool-45132061221/result-mint-to-pool.json';
const dexBytes=await readFile(dexPath);
const pinnedDexJsonSha='8e9f24d5a33c6b1a00518dd66f8e8fa331ad6346505f5d33d4d0907c7fe068c4';
if(sha(dexBytes)!==pinnedDexJsonSha)
 throw Error('DEX_ORIGINAL_RESEARCH_REPORT_SHA_CHANGED');
const dexReport=JSON.parse(dexBytes);
const plan=makeTwoPoolGeckoResearchPlan(dexReport);
const target='probe-artifacts/r29-retro-gecko-'+run;
await mkdir(target,{recursive:true});
const pages=[];
for(const p of plan){
 let http_status=0,raw_text='',content_type='text/plain';
 const started_at_utc=new Date().toISOString();
 try{
  const res=await fetch(p.url,{method:'GET',
   headers:{Accept:'application/json'},
   signal:AbortSignal.timeout(14000)});
  http_status=res.status;
  content_type=(res.headers.get('content-type')||'').toLowerCase();
  const raw=Buffer.from(await res.arrayBuffer());
  if(raw.length>2_000_000)throw Error('SOURCE_RESPONSE_TOO_LARGE');
  raw_text=raw.toString('utf8');
 }catch(e){
  if(http_status===200)http_status=0;
  content_type='text/plain';
  raw_text=JSON.stringify({source_gap:true,reason:e?.name==='TimeoutError'
   ?'TIMEOUT':e?.message==='SOURCE_RESPONSE_TOO_LARGE'
   ?'OVERSIZE':'NETWORK_FAILURE'});
 }
 const captured_at_utc=new Date().toISOString();
 const page={...p,started_at_utc,captured_at_utc,raw_text,
  sha256:sha(Buffer.from(raw_text,'utf8')),http_status,content_type};
 pages.push(page);
 await writeFile(target+'/source-http-'+String(p.index).padStart(2,'0')+'.txt',
  raw_text,{flag:'wx'});
 console.log('R29_CURRENT_GECKO_PROBE',JSON.stringify({
  index:p.index,kind:p.kind,mint:p.mint,pool:p.pool,status:http_status,
  captured_at_utc,raw_sha256:page.sha256,source_only:true}));
}
const report=evaluateGeckoPoolAndOldCandles({dexReport,pages});
const receipt={schema:1,kind:'R29_V19_READONLY_TWO_SOURCE_POST_EVENT_CAPTURE_RECEIPT',
 run_id:run,source_commit:sourceCommit,user_request_path:chosen[0],
 user_request_sha256:sha(requestRaw),
 dex_capture_run_id:'45132061221',
 dex_capture_json_sha256:sha(dexBytes),
 gecko_current_requests:plan.length,
 source_http_validated:report.provider_http_capture_receipts.length,
 confirmed_real_october_executable_buy_sell_quotes:0,
 confirmed_historic_onchain_sellability:0,
 historical_24_scan_decisions_not_rewritten:true,
 live_or_paper_orders_written:0,no_wallet_or_local_paper_state_modified:true};
await writeFile(target+'/gecko-crosscheck.json',
 JSON.stringify(report,null,2)+'\n',{flag:'wx'});
await writeFile(target+'/request-receipt.json',
 JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
const lines=['# R29 – 2 Solana-Pools bei GeckoTerminal nachgeprüft',
 '',
 'Zweiter Anbieter nur heutige Abfrage; alte Minutenkerzen bleiben nachträglich',
 'abgerufene Daten, niemals unabhängiger historischer USD-Kauf-/Verkaufskurs.',
 '',
 '| Historischer Scan | Token-Mint | Pool | 2. Anbieter exakte Identität | Minutencandles vor dem Scan |',
 '|---:|---|---|---|---:|',
 ...report.results.map(q=>'| '+String(q.scan).padStart(2,'0')+':00 | '+
  q.mint+' | '+q.pool_address+' | '+
  (q.current_second_provider_pool_exact_mint_match?'JA, HEUTE':'NICHT BESTÄTIGT')+
  ' | '+q.postevent_reported_closed_candle_count+' |'),
 '',
 'Original-Oktober-USD-BUY: **0**; Original-Oktober-USD-SELL: **0**.',
 'Original-Oktober-Sellability-Beleg: **0**.',
 'Original-24-Stunden-GPT-/Windows-Orderbeleg: **0**.',
 'Der fehlende Schluss ist 50 USDC tatsächlich vor Ort ausführbar?',
 'Der aktuelle Anbieter-Rohtext und seine SHA256 liegen im GitHub-Artefakt.'
 ];
await writeFile(target+'/two-pool-report.md',lines.join('\n')+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(old,await fingerprintProtectedFiles(protectedFiles));
console.log('R29_TWO_SOURCE_POOL_RESEARCH_COMPLETE',JSON.stringify({
 run_id:run,dex_report_verified:true,requested_pool_addresses:2,
 provider_http_requests:4,failed_sources:report.failed_or_missing_http_responses,
 current_crossprovider_pair_identity:report.currently_crossprovider_exact_pool_mint_quote_matches,
 reported_historical_closed_minutes:report.postevent_candle_rows_in_two_query_windows,
 original_historical_buy_sell_quote_count:0,
 independent_historical_sellability_count:0,orders:0}));
