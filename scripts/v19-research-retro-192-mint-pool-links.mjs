// R29 USER-APPROVED RESEARCH ONLY. Exactly 7 bounded, keyless, public
// DexScreener token-pair batches for 192 neutral Solana historical MINTS.
// ALL provider responses are observed in November 2026 and CANNOT be used
// as if delivered in October 2026. No BUY/SELL, no GPT, no historical API
// price substitution, no GitHub writes, no Windows paper/wallet changes.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {R29_PINNED_NEUTRAL_OCT_SOURCE,
 auditRetrospectiveNeutral24HourlySource}
 from '../src/v19-retrospective-neutral-source-overlay.mjs';
import {flattenNeutralMintSample,makeCurrentDexTokenBatches,
 evaluatePostrunDexMintPools}
 from '../src/v19-postrun-solana-mint-pool-lookup.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';

const ref='refs/heads/codex/r29-cleanroom-paper-20261121';
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!==ref||!/^[a-f0-9]{40}$/.test(commit||'')
  ||!/^[0-9]{1,20}$/.test(run||''))
 throw Error('ONLY_EXPLICIT_CLEANROOM_ACTION_ALLOWED');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const matches=changed.filter(x=>/^research\/mint-pool-lookup-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||matches.length!==1)
 throw Error('ONE_EXPLICIT_UNMODIFIED_USER_REQUEST_REQUIRED');
const requestRaw=await readFile(matches[0]);
const request=JSON.parse(requestRaw.toString('utf8'));
if(request?.schema!==1||request?.kind!=='R29_V19_POSTRUN_192_MINT_PUBLIC_POOL_LOOKUP'
  ||request.date!=='2026-10-12'||request.max_source_api_calls!==7
  ||request.read_only===false||request.read_only!==true
  ||request.no_openai_api_key!==true||request.offline_gpt_model_decisions_frozen!==true
  ||request.no_order_signals!==true||request.no_historic_quote_backfill!==true
  ||request.original_source_artifact_id!==14312891173
  ||request.selected_from_future_winner_list!==false)
 throw Error('UNAUTHORIZED_OR_NONNEUTRAL_POOL_LOOKUP_REQUEST');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const protectedFiles=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(protectedFiles);
const sourceFolder='probe-artifacts/neutral-source-v2/';
const priorBytes=await readFile(sourceFolder+'2026-10-11.json');
const dayBytes=await readFile(sourceFolder+'2026-10-12.json');
if(digest(priorBytes)!==R29_PINNED_NEUTRAL_OCT_SOURCE.day_11_sha256
   ||digest(dayBytes)!==R29_PINNED_NEUTRAL_OCT_SOURCE.day_12_sha256)
 throw Error('FAILED_ORIGINAL_ARCHIVE_DAY_SHA256');
const neutral=auditRetrospectiveNeutral24HourlySource({
 priorDay:JSON.parse(priorBytes.toString('utf8')),
 tradingDay:JSON.parse(dayBytes.toString('utf8')),
 artifactDownloadedAtUtc:new Date().toISOString()
});
const rows=flattenNeutralMintSample(neutral);
const batches=makeCurrentDexTokenBatches(rows);
if(batches.length!==7||batches.reduce((n,x)=>n+x.mints.length,0)!==192)
 throw Error('SOURCE_BUDGET_OR_MINT_SAMPLE_CHANGED');
const target='probe-artifacts/r29-retro-mint-pool-'+run;
await mkdir(target,{recursive:true});
const providerPages=[];
for(const batch of batches){
 let http_status=0,content_type='text/plain',raw_text='';
 const started_at_utc=new Date().toISOString();
 try{
  const response=await fetch(batch.url,{method:'GET',
   headers:{'Accept':'application/json'},
   signal:AbortSignal.timeout(14000)});
  http_status=response.status;
  content_type=(response.headers.get('content-type')||'').toLowerCase();
  const raw=Buffer.from(await response.arrayBuffer());
  if(raw.byteLength>4_000_000)throw Error('PROVIDER_RESPONSE_TOO_LARGE');
  raw_text=raw.toString('utf8');
 }catch(error){
  if(http_status===200)http_status=0;
  content_type='text/plain';
  raw_text=JSON.stringify({source_capture_gap:true,
   kind:error?.name==='TimeoutError'?'PROVIDER_TIMEOUT':
    error?.message==='PROVIDER_RESPONSE_TOO_LARGE'?'PROVIDER_TOO_LARGE':
    'PROVIDER_REQUEST_FAILED'});
 }
 const captured_at_utc=new Date().toISOString();
 const sha256=digest(Buffer.from(raw_text,'utf8'));
 const page={index:batch.index,mints:batch.mints,url:batch.url,
  started_at_utc,captured_at_utc,http_status,content_type,raw_text,sha256};
 providerPages.push(page);
 // Store ORIGINAL raw HTTP text as artifact bytes to audit exact source
 // later. This is a PRESENT-DAY provider response, not historical quotes.
 await writeFile(target+'/source-http-'+String(batch.index).padStart(2,'0')+'.txt',raw_text+'',{flag:'wx'});
 console.log('R29_RETRO_POOL_BATCH',JSON.stringify({
  batch:batch.index,token_count:batch.mints.length,http_status,
  captured_at_utc,raw_sha256:sha256,raw_bytes:Buffer.byteLength(raw_text,'utf8'),
  present_day_only:true,orders:0}));
}
const report=evaluatePostrunDexMintPools({neutralMintRows:rows,
 providerPages});
const receipt={schema:1,kind:'R29_V19_RETRO_MINT_POOL_BOUNDED_CAPTURE_RECEIPT',
 request_file:matches[0],request_sha256:digest(requestRaw),source_commit:commit,
 github_run_id:run,source_artifact_id:R29_PINNED_NEUTRAL_OCT_SOURCE.artifact_id,
 source_day_11_sha256:digest(priorBytes),source_day_12_sha256:digest(dayBytes),
 current_provider_requests:providerPages.length,
 source_provider:'DEXSCREENER_PRESENT_DAY_ONLY',
 no_buy_sell_orders:true,no_wallet_or_paper_client_mutation:true,
 historical_source_independence_proven:false,
 historical_execution_quotes_verified:0,
 65_winner_oracle_was_not_opened:true,
 data_integrity_verified:'RAW_BYTES_SHA256_FOR_ALL_RESPONSES_NOT_HISTORICAL_PRICE_AUTHENTICATION'};
await writeFile(target+'/result-mint-to-pool.json',
 JSON.stringify(report,null,2)+'\n',{flag:'wx'});
await writeFile(target+'/source-receipt.json',
 JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
const header=['# R29 – 192 Solana-Mints: nachträgliche öffentliche Pool-Abfrage',
 '',
 'Quelle: DexScreener, **erst am Ausführungstag abgefragt**. Kann NICHT',
 'die originale Entdeckbarkeit, den damaligen Kurs, Liquidity, Tax oder',
 'Verkäuflichkeit am 12. Oktober 2026 nachweisen.',
 '',
 '## Messungen',
 '- 192 historische neutrale Mint-Adressen in sieben Batches',
 '- HTTP-200-Batches: '+report.current_provider_http200_batches,
 '- Quellenfehler/429/ungültige Antwort: '+report.failed_or_invalid_source_batches,
 '- Mints mit aktuell gemeldeten Poolhinweisen: '+report.current_provider_mints_with_any_pool,
 '- Aktuell gemeldete Poolzuordnungen: '+report.currently_reported_pool_hints,
 '- Vom Anbieter mit Erstellung VOR eigenem Stundenscan gemeldet: '+
     report.sample_mints_with_provider_reported_pool_before_their_scan,
 '- Historische originale BUY-/SELL-Quotes: 0; Onchain-Sellability: 0',
 '- Alle historischen Gewinn-Trades und vollständige +100%-Grundgesamtheit: UNBEKANNT',
 '',
 '| Scan | UTC | Mints der neutralen Stichprobe | Heute mit gemeldetem Pool | Unter den Poolhinweisen gemeldete Erstellung bis zum Scan |',
 '|---:|:---:|---:|---:|---:|',
 ...Array.from({length:24},(_,i)=>{
  const row=report.candidate_rows.filter(x=>x.scan===i+1);
  return '| '+(i+1)+' | '+String(i).padStart(2,'0')+':00 | '+row.length+
   ' | '+row.filter(x=>x.current_provider_pool_pair_count>0).length+
   ' | '+row.filter(x=>x.current_provider_token_pairs.some(y=>
      y.relation_to_historical_scan==='CURRENT_PROVIDER_REPORTS_CREATED_NO_LATER_THAN_SCAN_UNVERIFIED')).length+
   ' |';
 }),
 '',
 '## Exakt gemeldete Pool-Hinweise (nur post-event)',
 ...report.candidate_rows.filter(x=>x.current_provider_pool_pair_count>0)
  .flatMap(x=>[
   '### Scan '+String(x.scan).padStart(2,'0')+' '+x.mint,
   ...x.current_provider_token_pairs.map(p=>'- Pool '+p.pool_address+
    ' (Dex '+(p.dex_source||'?')+'), berichtet erstellt '+
    (p.reported_pool_created_at_utc||'UNBEKANNT')+
    ', Status '+p.relation_to_historical_scan+
    ', Original-Oktober-Quote: NEIN')
  ]),
 '',
 'Fehlende aktuelle Listings sind kein Beweis, dass ein Pool damals nicht existierte.',
 'Aktuelle DexScreener-Ticker/Preise werden NICHT als Oktober-Tradability bewertet.',
 'Quelle und HTTP-Originalbyte-SHA liegen im begleitenden Actions-Artefakt.'
];
await writeFile(target+'/report-24-scans.md',header.join('\n')+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(protectedFiles));
console.log('R29_RETRO_MINT_POOL_LOOKUP_COMPLETED',JSON.stringify({
 run_id:run,source_mints:report.original_neutral_sample_count,
 http200_batches:report.current_provider_http200_batches,
 source_gap_batches:report.failed_or_invalid_source_batches,
 matched_mints:report.current_provider_mints_with_any_pool,
 reported_pools:report.currently_reported_pool_hints,
 claimed_pre_scan_created_mints:report.sample_mints_with_provider_reported_pool_before_their_scan,
 original_october_quotes_verified:0,original_october_sells_verified:0,
 verified_historical_fills:0,live_orders:0,source_artifact:report.source_raw_http_receipts.length}));
