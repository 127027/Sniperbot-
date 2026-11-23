// R29: byte-pinned, 100% OFFLINE October retrospective OHLCV research.
// Detect and correct the 00-second finalization-lag error at 02/18 UTC.
// Never promote post-event Gecko candles as original October quotes.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {R29_OCT12_CHAIN_RESEARCH_TARGETS as targets}
 from '../src/v19-october-solana-chain-research.mjs';
import {auditV25TwoPoolCandleFinality}
 from '../src/v25-retro-two-pool-candle-finality-audit.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';
const branch='refs/heads/codex/r29-cleanroom-paper-20261121';
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
const sha=x=>createHash('sha256').update(x).digest('hex');
if(process.env.GITHUB_REF!==branch||!/^[a-f0-9]{40}$/.test(commit||'')
 ||!/^[0-9]{1,20}$/.test(run||''))
 throw Error('V25_REQUIRE_EXPLICIT_READONLY_ARTIFACT_AUDIT_REQUEST');
const files=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const reqFiles=files.filter(x=>
 /^research\/candle-finalization-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(files.length!==1||reqFiles.length!==1)
 throw Error('V25_REQUIRES_EXACTLY_ONE_REQUEST_FILE');
const req=JSON.parse(await readFile(reqFiles[0],'utf8'));
if(req?.schema!==1||req.kind!=='R29_V25_EXPLICIT_PINNED_TWO_POOL_CANDLE_FINALITY_AUDIT'
 ||req.source_run_id!==45132577450||req.source_artifact_id!==14798357350
 ||req.historical_date!=='2026-10-12'
 ||req.finalization_delay_ms!==60000
 ||req.offline_only!==true||req.read_only!==true
 ||req.no_original_provider_delivery_claim!==true
 ||req.no_buy_or_sell_signals!==true)
 throw Error('INVALID_V25_HISTORIC_CANDLE_AUDIT_CONTRACT');
const before=await fingerprintProtectedFiles([
 resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))]);
const base='probe-artifacts/verified-two-pools/r29-retro-gecko-45132577450/';
const pins=[
 {file:'source-http-02.txt',
  sha:'ae2cd3521a074aff3f9e25572bcc49354b7a749dffbf2cf166ca2721465df34b'},
 {file:'source-http-04.txt',
  sha:'9df3fa3e9de90a8f48ccfb923a42718e93ba020d6148062fb91990ce7b5b1ce3'}];
const crossBytes=await readFile(base+'gecko-crosscheck.json');
if(sha(crossBytes)!=='f3971e80cbf63bdcac15ea80606b417f0039b072d563d32d4d5e539cf0a05bbd')
 throw Error('V25_OLD_TWO_POOL_POSTEVENT_ARCHIVE_REPORT_CHANGED');
const cross=JSON.parse(crossBytes);
if(cross?.kind!=='R29_V19_POSTRUN_TWO_PROVIDER_POOL_AND_HISTORIC_OHLCV_DIAGNOSTIC'
 ||cross?.never_eligible_for_replay_or_live_paper_orders!==true
 ||cross?.results?.length!==2)
 throw Error('V25_NOT_EXPECTED_POSTEVENT_NEUTRAL_TWO_POOL_RESEARCH_SOURCE');
const result=[];
for(let i=0;i<2;i++){
 const t=targets[i],c=cross.results[i],pin=pins[i];
 if(c?.mint!==t.mint||c?.pool_address!==t.pool
  ||c?.scan!==t.scan||c?.scan_at_utc!==t.scan_at_utc
  ||c?.historical_50_usdc_buy_sell_quote_verified!==false
  ||c?.historic_provider_delivered_this_candle_at_october_scan!==false)
  throw Error('V25_HISTORIC_CANDLE_TARGET_OR_STATUS_TAMPERED');
 const b=await readFile(base+pin.file);
 if(sha(b)!==pin.sha)throw Error('V25_HISTORIC_GECKO_CANDLE_RAW_SHA_CHANGED');
 const audit=auditV25TwoPoolCandleFinality({
  target:t,apiResponse:JSON.parse(b),
  reportedLatestPosthoc:c.latest_eligible_closed_minute_candle_posthoc});
 if(!audit.finalization_guard_excluded_at_scan_candle
  ||audit.predecision_finalized_research_candle_close_utc===null
  ||audit.trade_authorized!==false)
  throw Error('V25_MISLEADING_RETRO_CANDLE_CUTOFF_WAS_NOT_CORRECTED');
 result.push({...audit,source_raw_sha256:pin.sha,
  original_archive_response:pin.file,
  report_sha256:sha(crossBytes)});
 console.log('R29_V25_PINNED_RETRO_MINUTE_CAUSALITY',JSON.stringify({
  scan_utc:t.scan_at_utc,mint:t.mint,pool:t.pool,
  prior_label_closed_utc:c.latest_eligible_closed_minute_candle_posthoc.minute_closed_utc,
  last_research_candle_after_60s_lag:audit.predecision_finalized_research_candle_close_utc,
  retro_close_usd:audit.predecision_retro_close_usd,
  source_capture_happened_after_october:true,
  trade_eligible:false}));
}
const dir='probe-artifacts/v25-retro-candle-finality-'+run;
await mkdir(dir,{recursive:true});
await writeFile(dir+'/research-report.json',JSON.stringify({
 schema:1,kind:'R29_V25_TWO_NEUTRAL_OCTOBER_RETRO_CANDLE_FINALITY_CORRECTION',
 source_commit:commit,github_run_id:run,original_source_run:45132577450,
 original_source_artifact:14798357350,
 original_crosscheck_sha256:sha(crossBytes),
 minute_finalization_delay_ms:60000,
 causality_boundary_in_original_report_misleading:true,
 original_report_was_postevent_research_not_a_trading_engine_receipt:true,
 results:result,no_original_october_provider_delivery_verified:true,
 historical_tradable_bids_or_asks_verified:0,
 original_sellability_verified:0,
 historical_real_gpt_decisions:0,
 client_trades:0,orders_written:0
},null,2)+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles([
 resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))]));
console.log('R29_V25_TWO_POOL_RETRO_CANDLE_FINALITY_COMPLETE',JSON.stringify({
 corrected_pool_candles:result.length,at_scan_candle_excluded_both:true,
 original_october_quote_evidence_added:0,trades:0,report_dir:dir
}));
