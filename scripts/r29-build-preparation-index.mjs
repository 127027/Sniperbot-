import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync,gzipSync} from 'node:zlib';
import {buildCumulativePreparation,selectPreparationHours} from '../src/r29-preparation-plan.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const queue=await read('research/state/r29-preparation-queue.json'),plan=await read('research/state/r29-preparation-hour-plan.json');
const legacy=await read('research/preparation/archive-v42/midnight-candidates.json'),earlier=await read('research/audits/2026-11-24/r29-prepared-midnight-audit.json');
const hours=[];
for(const r of Object.values(queue.requests)){
 if(r.request.provider!=='SHRINE_ARCHIVE'||r.status!=='CAPTURED')continue;
 const path=r.receipt.artifact_path,raw=await readFile(path);if(hash(raw)!==r.receipt.sha256)throw Error('MANIFEST_RECEIPT_SHA_MISMATCH');
 const manifest=JSON.parse(raw),dir=path.slice(0,path.lastIndexOf('/')),p=await readFile(dir+'/pool-projection.json'),m=await readFile(dir+'/pool-minute-observations.jsonl.gz');
 if(hash(p)!==manifest.projection_sha256||hash(m)!==manifest.minute_sha256)throw Error('PROJECTION_SHA_MISMATCH');
 const projection=JSON.parse(p),minutes=gunzipSync(m).toString('utf8').trim().split('\n').map(JSON.parse);
 if(minutes.length!==manifest.minute_observations||minutes.reduce((s,x)=>s+x.buys+x.sells,0)!==manifest.counts.accepted)throw Error('MINUTE_EVENT_COUNT_MISMATCH');
 const recentMinutes=minutes.filter(x=>Date.parse(x.minute_utc)>=Date.parse('2026-10-11T23:50:00Z'));
 hours.push({manifest,projection,recentMinutes,path});
}
const result=buildCumulativePreparation({legacy,earlier,hours});
const out='research/preparation/cumulative';await mkdir(out,{recursive:true});
const data=gzipSync(JSON.stringify(result)+'\n');await writeFile(out+'/market-index.json.gz',data);
const summary={kind:result.kind,tick_utc:result.tick_utc,sources:result.sources,captured_hours:hours.length,accepted_source_observations:result.sources.reduce((s,x)=>s+x.accepted,0),minute_observations:result.sources.reduce((s,x)=>s+x.minute_observations,0),distinct_mints:result.candidates.length,distinct_pool_keys:result.pools.length,recent_two_sided_mints:result.candidates.filter(x=>x.has_recent_two_sided_swap_evidence).length,market_index_sha256:hash(data),market_index_bytes:data.length,plan:selectPreparationHours(plan,queue,new Date().toISOString()).states,prepared_trade_inputs:0,market_scope_complete:false,orders:0};
await writeFile(out+'/manifest.json',JSON.stringify(summary,null,2)+'\n');console.log('R29_CUMULATIVE_RESULT',JSON.stringify({...summary,plan:undefined}));
