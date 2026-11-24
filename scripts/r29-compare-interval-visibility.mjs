import {readFile,writeFile,mkdir} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {compareVisibilityCadence} from '../src/r29-hourly-interval-session.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const cm=await read('research/preparation/cumulative/manifest.json'),queue=await read('research/state/r29-preparation-queue.json'),minutes=[];
for(const s of cm.sources){
 const r=Object.values(queue.requests).find(r=>r.status==='CAPTURED'&&r.receipt.artifact_path===s.manifest_path);if(!r)throw Error('MISSING_RECEIPT');
 const raw=await readFile(s.manifest_path);if(sha(raw)!==r.receipt.sha256)throw Error('RECEIPT_SHA');
 const m=JSON.parse(raw),p=s.manifest_path.replace(/manifest\.json$/,'pool-minute-observations.jsonl.gz'),b=await readFile(p);if(sha(b)!==m.minute_sha256)throw Error('MINUTE_SHA');
 const rows=gunzipSync(b).toString('utf8').trim().split('\n').map(JSON.parse);if(rows.length!==m.minute_observations||rows.reduce((s,x)=>s+x.buys+x.sells,0)!==m.counts.accepted)throw Error('MINUTE_RECONCILIATION');minutes.push(...rows);
}
const startUtc='2026-10-11T21:00:00Z',endUtc='2026-10-12T00:00:00Z',comparisons=[1,5,10,15].map(stepMinutes=>{const {rows,...r}=compareVisibilityCadence({minutes,startUtc,endUtc,stepMinutes});return r;});
const report={kind:'R29_ACTUAL_ARCHIVED_INTERVAL_VISIBILITY_COMPARISON',source_manifest:'research/preparation/cumulative/manifest.json',source_minutes:minutes.length,source_swaps:cm.accepted_source_observations,comparisons,scope:'First observed activity in three archived pre-midnight hours; not new launches, GPT performance, fill or return comparison. No live calls.',new_market_requests:0,actual_dot_runs:0,valid_backtest_scans:0,orders:0};
await mkdir('probe-artifacts/r29-interval-comparison',{recursive:true});await writeFile('probe-artifacts/r29-interval-comparison/report.json',JSON.stringify(report,null,2)+'\n');console.log('R29_INTERVAL_COMPARISON_RESULT',JSON.stringify(report));
