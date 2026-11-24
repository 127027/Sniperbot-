import {readFile,writeFile,mkdir,stat,rm} from 'node:fs/promises';import {createWriteStream,createReadStream} from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {pipeline} from 'node:stream/promises';import {Readable,Transform} from 'node:stream';
import {reservePreparationRequest,recordPreparationReceipt} from '../src/r29-preparation-queue.mjs';import {projectArchive,combinePreparationCandidates} from '../src/r29-preparation-hour.mjs';
const branch='codex/r29-cleanroom-paper-20261121',statePath='research/state/r29-preparation-queue.json',root='research/preparation/hourly-source',cutoffUtc='2026-10-12T00:00:00Z';
const now=()=>new Date().toISOString(),hash=b=>createHash('sha256').update(b).digest('hex'),git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const changed=git('diff-tree','--no-commit-id','--name-only','-r',process.env.GITHUB_SHA).split('\n');if(process.env.GITHUB_REF!=='refs/heads/'+branch||changed.length!==1||!changed[0].startsWith('research/preparation-hour-requests/'))throw Error('EXPLICIT_REQUEST_REQUIRED');
const req=JSON.parse(git('show',process.env.GITHUB_SHA+':'+changed[0]));if(req.kind!=='R29_PREPARATION_HOURLY_CAPTURE'||req.no_orders!==true||!Array.isArray(req.hours)||req.hours.length<1||req.hours.length>2||new Set(req.hours).size!==req.hours.length||req.hours.some(h=>!/^2026-10-(?:0[5-9]|1[01])T(?:[01]\d|2[0-3]):00:00Z$/.test(h)))throw Error('INVALID_REQUEST');
if(git('show','HEAD:'+changed[0])!==git('show',process.env.GITHUB_SHA+':'+changed[0]))throw Error('REQUEST_BYTES_CHANGED');
let queue=JSON.parse(await readFile(statePath,'utf8'));
async function persist(message,paths){await writeFile(statePath,JSON.stringify(queue,null,2)+'\n');git('add','-f',statePath,...paths);git('commit','-m',message);git('push','origin','HEAD:refs/heads/'+branch);}
const legacy=JSON.parse(await readFile('research/preparation/archive-v42/midnight-candidates.json','utf8')),earlier=JSON.parse(await readFile('research/audits/2026-11-24/r29-prepared-midnight-audit.json','utf8'));
for(const hourUtc of req.hours){
 const slug=hourUtc.slice(0,13).replace('T','-'),dir=root+'/'+slug,url='https://replay.shrine.trade/pump/'+hourUtc.slice(0,10).replaceAll('-','/')+'/'+hourUtc.slice(11,13)+'.jsonl.zst';
 const request={provider:'SHRINE_ARCHIVE',url},gate=reservePreparationRequest(queue,request,now());
 if(!gate.allowed){console.log('R29_HOUR_SKIP',JSON.stringify({hourUtc,reason:gate.reason}));continue;}
 queue=gate.state;await mkdir(dir,{recursive:true});await persist('R29 reserve historical preparation hour '+slug,[]);
 const tmp='/tmp/r29-hour-'+slug+'.zst';let httpStatus=null,retryAfter=null,raw=Buffer.alloc(0),usable=false,projection=null,error=null;
 try{
  const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(180000)});httpStatus=res.status;retryAfter=res.headers.get('retry-after');
  if(!res.ok){raw=Buffer.from(await res.arrayBuffer());throw Error('HTTP_'+res.status);}
  let bytes=0;await pipeline(Readable.fromWeb(res.body),new Transform({transform(chunk,enc,cb){bytes+=chunk.length;if(bytes>160_000_000)return cb(Error('ARCHIVE_SIZE_LIMIT'));cb(null,chunk);}}),createWriteStream(tmp));
  raw=await readFile(tmp);projection=await projectArchive(tmp,{hourUtc,cutoffUtc});if(!projection.counts.accepted)throw Error('NO_VALID_SWAP_EVENTS');
  usable=true;
 }catch(e){error=String(e.message||e);if(!raw.length)raw=Buffer.from(JSON.stringify({error}));}
 const chunks=[];for(let i=0;i<raw.length;i+=32_000_000){const b=raw.subarray(i,i+32_000_000),p=dir+'/response-'+String(chunks.length).padStart(2,'0')+'.bin';await writeFile(p,b);chunks.push({path:p,bytes:b.length,sha256:hash(b)});}
 const manifest={kind:'R29_HOURLY_SOURCE_RECEIPT',hour_utc:hourUtc,url,http_status:httpStatus,retry_after:retryAfter,raw_sha256:hash(raw),raw_bytes:raw.length,chunks,usable,error,source_is_retro_archive_not_live_capture:true,valid_first_scan_started:false,orders:0};
 if(usable){await writeFile(dir+'/pool-projection.json',JSON.stringify(projection)+'\n');const union=combinePreparationCandidates({legacy,earlier,projection});await writeFile(dir+'/candidate-union.json',JSON.stringify(union)+'\n');Object.assign(manifest,{projection_sha256:hash(await readFile(dir+'/pool-projection.json')),union_sha256:hash(await readFile(dir+'/candidate-union.json')),counts:projection.counts,pool_count:projection.pools.length,union_count:union.length,legacy_overlap:union.filter(x=>x.legacy_feature&&x.has_pre_midnight_swap_evidence).length,earlier_overlap:union.filter(x=>x.earlier_model_candidate&&x.has_pre_midnight_swap_evidence).length,recent_two_sided:union.filter(x=>x.has_recent_two_sided_swap_evidence).length,prepared_trade_inputs:0});}
 await writeFile(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 queue=recordPreparationReceipt(queue,gate.key,{raw,httpStatus,retryAfter,nowUtc:now(),usable,artifactPath:dir+'/manifest.json'});
 await persist('R29 persist historical hour '+slug+' receipt and preparation data',[dir]);await rm(tmp,{force:true});console.log('R29_HOUR_CAPTURE',JSON.stringify(manifest));
 if(httpStatus===429||httpStatus===503)break;
}
