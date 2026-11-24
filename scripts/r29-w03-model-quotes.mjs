import {readFile,mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {parseHistoricalFx,parseBinanceHistoricalFx,modelHistoricalCurve} from '../src/r29-historical-curve-model.mjs';
const run=process.env.GITHUB_RUN_ID,changes=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',process.env.GITHUB_SHA],{encoding:'utf8'}).trim().split('\n');
if(process.env.GITHUB_REF!=='refs/heads/codex/r29-cleanroom-paper-20261121'||changes.length!==1||!changes[0].startsWith('research/w03-model-requests/2026-11-24/'))throw Error('EXPLICIT_REQUEST_REQUIRED');
const q=JSON.parse(await readFile(changes[0],'utf8'));if(q.kind!=='R29_W03_HISTORICAL_FX_AND_CURVE_MODEL'||q.source_run!==45385336884||q.max_public_requests!==1||q.no_orders!==true)throw Error('INVALID_REQUEST');
const source=JSON.parse(await readFile('research/audits/2026-11-24/r29-w03-reserve-continuity.json','utf8'));if(source.source_run!==45385336884||source.workflow_conclusion!=='success'||source.pairs.length!==3)throw Error('SOURCE_MISMATCH');
const tickUtc='2026-10-12T00:00:00.000Z';
const provider=q.fx_provider??'COINBASE';
if(!['COINBASE','BINANCE_PUBLIC'].includes(provider)||provider==='BINANCE_PUBLIC'&&q.previous_failed_run!==45388592069)throw Error('UNAPPROVED_FX_PROVIDER');
const end=Date.parse(tickUtc);
const url=provider==='BINANCE_PUBLIC'?'https://data-api.binance.vision/api/v3/klines?symbol=SOLUSDC&interval=1m&startTime='+(end-600000)+'&endTime='+(end-1)+'&limit=10':'https://api.exchange.coinbase.com/products/SOL-USDC/candles?granularity=60&start=2026-10-11T23%3A50%3A00Z&end=2026-10-12T00%3A00%3A00Z';
const out='probe-artifacts/w03-model-'+run;await mkdir(out,{recursive:true});
let receipt,fx=null,rows=[],failure=null;
try{
 const resp=await fetch(url,{headers:{Accept:'application/json','User-Agent':'R29-research/1.0'},signal:AbortSignal.timeout(20000)});
 const raw=await resp.text(),sha=createHash('sha256').update(raw).digest('hex');
 await writeFile(out+'/fx-raw.json',raw);
 receipt={url,http_status:resp.status,source_sha256:sha,captured_at_utc:new Date().toISOString(),retry_after:resp.headers.get('retry-after'),raw_bytes:Buffer.byteLength(raw)};
 console.log('R29_W03_FX_RECEIPT',JSON.stringify(receipt));
 if(!resp.ok)throw Error('FX_HTTP_'+resp.status);
 fx=(provider==='BINANCE_PUBLIC'?parseBinanceHistoricalFx:parseHistoricalFx)({raw,expectedSha256:sha,tickUtc});console.log('R29_W03_FX',JSON.stringify(fx));
 console.log('R29_W03_FX_RAW',JSON.stringify({raw,sha}));
 for(const pair of source.pairs){try{const r=modelHistoricalCurve({pair,fx,tickUtc});rows.push(r);console.log('R29_W03_MODEL',JSON.stringify(r));}catch(e){rows.push({mint:pair.mint,status:'DATA_GAP',reason:e.message});}}
}catch(e){failure=e.message;}
const summary={kind:'R29_W03_HISTORICAL_FX_AND_CURVE_MODEL',tick_utc:tickUtc,source_run:45385336884,receipt,fx,rows,failure,indicative_models:rows.filter(x=>x.model_status==='INDICATIVE_ONLY').length,provider_calls_attempted:1,trade_authorized:0,orders:0};
await writeFile(out+'/model-report.json',JSON.stringify(summary,null,2)+'\n');
console.log('R29_W03_MODEL_RESULT',JSON.stringify({...summary,rows:undefined}));if(failure)process.exitCode=2;
