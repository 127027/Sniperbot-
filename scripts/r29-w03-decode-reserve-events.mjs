import {readFile,mkdir,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {decodePumpReserveEvent} from '../src/r29-pump-reserve-event.mjs';
const run=process.env.GITHUB_RUN_ID;
const changes=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',process.env.GITHUB_SHA],{encoding:'utf8'}).trim().split('\n');
if(process.env.GITHUB_REF!=='refs/heads/codex/r29-cleanroom-paper-20261121'||changes.length!==1||!changes[0].startsWith('research/w03-reserve-requests/2026-11-24/'))throw Error('EXPLICIT_REQUEST_REQUIRED');
const q=JSON.parse(await readFile(changes[0],'utf8'));if(q.kind!=='R29_W03_PUMP_RESERVE_EVENT_OFFLINE'||q.source_run!==45384807888||q.offline_only!==true)throw Error('INVALID_REQUEST');
const f=JSON.parse(await readFile('research/audits/2026-11-24/r29-w03-archived-economic-flow.json','utf8'));
const spec=JSON.parse(await readFile('research/reference/r29-pump-trade-event-idl-20261008.json','utf8'));
const rows=[];
for(const flow of f.rows){const raw=await readFile('probe-artifacts/w03-original/v210-evidence-45351015863/rpc-'+flow.receipt_id+'.json','utf8');const r=decodePumpReserveEvent({raw,flow,spec});rows.push(r);console.log('R29_W03_RESERVE',JSON.stringify(r));}
const result={kind:'R29_W03_PUMP_RESERVE_EVENT_OFFLINE',source_run:45384807888,source_idl_commit:spec.source_commit,transactions:rows.length,decoded_events:rows.reduce((a,r)=>a+r.decoded_event_count,0),corroborated_reserve_events:rows.filter(r=>r.status==='CORROBORATED_HISTORICAL_RESERVE_EVENT').length,model_quote_ready:0,provider_calls:0,orders:0,rows};
const out='probe-artifacts/w03-reserves-'+run;await mkdir(out,{recursive:true});await writeFile(out+'/reserve-events.json',JSON.stringify(result,null,2)+'\n');console.log('R29_W03_RESERVE_RESULT',JSON.stringify({...result,rows:undefined}));
