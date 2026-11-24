import {readFile,writeFile,mkdir,stat,rm} from 'node:fs/promises';import {createWriteStream,createReadStream} from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {pipeline} from 'node:stream/promises';import {Readable,Transform} from 'node:stream';
import {gzipSync} from 'node:zlib';
import {reservePreparationRequest,recordPreparationReceipt} from '../src/r29-preparation-queue.mjs';import {projectArchiveStream,combinePreparationCandidates} from '../src/r29-preparation-hour.mjs';
import {selectPreparationHours} from '../src/r29-preparation-plan.mjs';
const branch='codex/r29-cleanroom-paper-20261121',statePath='research/state/r29-preparation-queue.json',root='research/preparation/hourly-source',cutoffUtc='2026-10-12T00:00:00Z';
const now=()=>new Date().toISOString(),hash=b=>createHash('sha256').update(b).digest('hex'),git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const changed=git('diff-tree','--no-commit-id','--name-only','-r',process.env.GITHUB_SHA).split('\n');if(process.env.GITHUB_REF!=='refs/heads/'+branch||changed.length!==1||!changed[0].startsWith('research/preparation-hour-requests/'))throw Error('EXPLICIT_REQUEST_REQUIRED');
const req=JSON.parse(git('show',process.env.GITHUB_SHA+':'+changed[0]));
if(req.no_orders!==true||!['R29_PREPARATION_HOURLY_CAPTURE','R29_PREPARATION_PLAN_BATCH'].includes(req.kind))throw Error('INVALID_REQUEST');
if(req.kind==='R29_PREPARATION_PLAN_BATCH'&&(!Number.isInteger(req.max_hours)||req.max_hours<1||req.max_hours>3))throw Error('INVALID_BATCH');
if(git('show','HEAD:'+changed[0])!==git('show',process.env.GITHUB_SHA+':'+changed[0]))throw Error('REQUEST_BYTES_CHANGED');
let queue=JSON.parse(await readFile(statePath,'utf8'));
if(req.kind==='R29_PREPARATION_PLAN_BATCH'){const plan=JSON.parse(await readFile('research/state/r29-preparation-hour-plan.json','utf8'));req.hours=selectPreparationHours(plan,queue,now(),{maxHours:req.max_hours}).selected;}
if(!Array.isArray(req.hours)||req.hours.length>3||new Set(req.hours).size!==req.hours.length||req.hours.some(h=>!/^2026-10-(?:0[5-9]|1[01])T(?:[01]\d|2[0-3]):00:00Z$/.test(h)))throw Error('INVALID_HOURS');
async function persist(message,paths){await writeFile(statePath,JSON.stringify(queue,null,2)+'\n');git('add','-f',statePath,...paths);git('commit','-m',message);git('push','origin','HEAD:refs/heads/'+branch);}
const legacy=JSON.parse(await readFile('research/preparation/archive-v42/midnight-candidates.json','utf8')),earlier=JSON.parse(await readFile('research/audits/2026-11-24/r29-prepared-midnight-audit.json','utf8'));
for(const hourUtc of req.hours){
 const slug=hourUtc.slice(0,13).replace('T','-'),url='https://replay.shrine.trade/pump/'+hourUtc.slice(0,10).replaceAll('-','/')+'/'+hourUtc.slice(11,13)+'.jsonl.zst';
 const request={provider:'SHRINE_ARCHIVE',url},gate=reservePreparationRequest(queue,request,now());
 if(!gate.allowed){console.log('R29_HOUR_SKIP',JSON.stringify({hourUtc,reason:gate.reason}));continue;}
 queue=gate.state;const dir=root+'/'+slug+'/attempt-'+queue.requests[gate.key].attempts;await mkdir(dir,{recursive:true});await persist('R29 reserve historical preparation hour '+slug,[]);
 let httpStatus=null,retryAfter=null,usable=false,projection=null,error=null,archive_sha256=null,archive_bytes=null,stream_complete=false,error_body=null;
 try{
  const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(300000)});httpStatus=res.status;retryAfter=res.headers.get('retry-after');
  if(!res.ok){error_body=(await res.text()).slice(0,100000);throw Error('HTTP_'+res.status);}
  const out=await projectArchiveStream(Readable.fromWeb(res.body),{hourUtc,cutoffUtc});
  ({report:projection,archive_sha256,archive_bytes,stream_complete}=out);
  if(!projection.counts.accepted)throw Error('NO_VALID_SWAP_EVENTS');
  usable=true;
 }catch(e){error=String(e.message||e);}
 const manifest={kind:'R29_HOURLY_SOURCE_RECEIPT',hour_utc:hourUtc,url,http_status:httpStatus,retry_after:retryAfter,archive_sha256,archive_bytes,stream_complete,full_raw_archive_persisted:false,derived_data_only:true,usable,error,error_body,source_is_retro_archive_not_live_capture:true,valid_first_scan_started:false,orders:0};
 if(projection)Object.assign(manifest,{counts:projection.counts,invalid_reasons:projection.invalid_reasons,schema_type_sample:projection.schema_type_sample});
 if(usable){
  const minutes=projection.minute_observations;delete projection.minute_observations;
  const minutePath=dir+'/pool-minute-observations.jsonl.gz',minuteBytes=gzipSync(minutes.map(m=>JSON.stringify(m)).join('\n')+'\n');if(minuteBytes.length>90_000_000)throw Error('PROJECTION_FILE_LIMIT');
  await writeFile(minutePath,minuteBytes);
  await writeFile(dir+'/pool-projection.json',JSON.stringify(projection)+'\n');const union=combinePreparationCandidates({legacy,earlier,projection});await writeFile(dir+'/candidate-union.json',JSON.stringify(union)+'\n');Object.assign(manifest,{minute_observations:minutes.length,minute_sha256:hash(minuteBytes),minute_bytes:minuteBytes.length,projection_sha256:hash(await readFile(dir+'/pool-projection.json')),union_sha256:hash(await readFile(dir+'/candidate-union.json')),counts:projection.counts,pool_count:projection.pools.length,union_count:union.length,legacy_overlap:union.filter(x=>x.legacy_feature&&x.has_pre_midnight_swap_evidence).length,earlier_overlap:union.filter(x=>x.earlier_model_candidate&&x.has_pre_midnight_swap_evidence).length,recent_two_sided:union.filter(x=>x.has_recent_two_sided_swap_evidence).length,prepared_trade_inputs:0});
 }
 const manifestRaw=JSON.stringify(manifest,null,2)+'\n';await writeFile(dir+'/manifest.json',manifestRaw);
 queue=recordPreparationReceipt(queue,gate.key,{raw:manifestRaw,httpStatus,retryAfter,nowUtc:now(),usable,artifactPath:dir+'/manifest.json'});
 await persist('R29 persist streamed historical hour '+slug+' derived evidence',[dir]);console.log('R29_HOUR_CAPTURE',JSON.stringify(manifest));
 if(httpStatus===429||httpStatus===503)break;
}
