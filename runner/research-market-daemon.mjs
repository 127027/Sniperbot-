// Optional local 24/7 read-only research process. Never imports trade/order state.
// Local cache: .local/research-market/. Automatic cleanup ONLY inside its history/ folder.
import {collectSnapshot,writeSnapshot} from './research-market-collector.mjs';
import {runFollowups} from './memecoin-followups.mjs';
import {publishResearchSnapshot,publishingEnabled} from './research-market-publisher.mjs';
import {mkdir,readdir,stat,unlink,open,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {attachSupervisedStop} from './supervised-stop.mjs';
import {setTimeout as sleep} from 'node:timers/promises';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache=path.join(root,'.local','research-market');
const history=path.join(cache,'history');
const PERIOD_MS=120_000;                  // 2 min pool observations, not sub-second trading
const PUB_PERIOD_MS=15*60_000;           // at most once per 15 min if explicitly enabled
const RETAIN_MS=45*24*60*60_000;         // supports 14/30-day indicative research, if byte cap permits
const MAX_FILES=40_000;
const MAX_BYTES=512*1024*1024;          // 512 MiB maximum local compressed history
const entryName=/^snapshot-\d{8}T\d{9}Z\.json\.gz$/;
const fileTimestamp=iso=>iso.replace(/[-:.]/g,'');
const statusFile=path.join(cache,'status.json');
const latestFile=path.join(cache,'latest.json');
const followupFile=path.join(root,'.local','research-learning','pools.json');

async function atomicJson(filename,value){
  await mkdir(path.dirname(filename),{recursive:true});
  const tmp=filename+'.tmp-'+process.pid;
  await writeFile(tmp,JSON.stringify(value,null,2)+'\n','utf8');
  await rename(tmp,filename);
}
export async function saveHistory(snapshot,{folder=history}={}){
  if(snapshot.schema!=='research_market_snapshot.v1'||snapshot.paper_only!==true||snapshot.actionable!==false)throw Error('Non-tradable research only');
  await mkdir(folder,{recursive:true});
  const name='snapshot-'+fileTimestamp(snapshot.published_at_utc)+'.json.gz';
  if(!entryName.test(name))throw Error('Invalid history timestamp');
  const file=path.join(folder,name),tmp=file+'.tmp-'+process.pid;
  await writeFile(tmp,gzipSync(Buffer.from(JSON.stringify(snapshot)+'\n','utf8')));
  await rename(tmp,file);
  return file;
}
export async function pruneHistory({folder=history,now=Date.now(),
   retainMs=RETAIN_MS,maxFiles=MAX_FILES,maxBytes=MAX_BYTES}={}){
  await mkdir(folder,{recursive:true});
  const entries=[];
  for(const name of await readdir(folder)){
    if(!entryName.test(name))continue;
    const filepath=path.join(folder,name);
    const info=await stat(filepath);
    if(!info.isFile())continue;
    entries.push({filepath,mtime:info.mtimeMs,size:info.size});
  }
  // Oldest first; never delete any unknown file, state, portfolio or watchlist.
  entries.sort((a,b)=>a.mtime-b.mtime);
  let total=entries.reduce((sum,x)=>sum+x.size,0),remaining=entries.length,deleted=0;
  for(const item of entries){
    if(now-item.mtime>retainMs||remaining>maxFiles||total>maxBytes){
      await unlink(item.filepath);
      total-=item.size;remaining--;deleted++;
    }
  }
  return {deleted,remaining,bytes:total};
}
async function acquireLock(){
  await mkdir(cache,{recursive:true});
  const filename=path.join(cache,'collector.pid');
  try{
    const handle=await open(filename,'wx');
    await handle.writeFile(String(process.pid));await handle.close();
  }catch(e){
    if(e.code!=='EEXIST')throw e;
    const previous=Number(await readFile(filename,'utf8').catch(()=>''));
    if(Number.isInteger(previous)&&previous>0){
      try{process.kill(previous,0);throw Error('RESEARCH_COLLECTOR_ALREADY_RUNNING')}
      catch(err){if(err.code!=='ESRCH')throw err}
    }
    await unlink(filename);
    const handle=await open(filename,'wx');
    await handle.writeFile(String(process.pid));await handle.close();
  }
  const unlock=async()=>{try{
    const current=await readFile(filename,'utf8');
    if(current.trim()===String(process.pid))await unlink(filename);
  }catch{}};
  return unlock;
}
async function runCycle({fetcher=fetch,publisher=publishResearchSnapshot,
 now=new Date().toISOString(),publish=false}={}){
  const snapshot=await collectSnapshot({fetcher,now});
  const success=snapshot.collection_status!=='BLOCKED_RESEARCH_DATA_ACCESS';
  if(success){
    await writeSnapshot(snapshot,latestFile);
    await saveHistory(snapshot);
  }
  const clean=await pruneHistory();
  let followups=null,followupError=null;
  if(success){
    try{followups=await runFollowups(snapshot,{filename:followupFile,fetcher,now})}
    catch(e){followupError=String(e?.message||'FOLLOWUP_FAILED').replace(/[^a-zA-Z0-9_. -]/g,'').slice(0,100)}
  }
  let published=null,publishError=null;
  if(success&&publish){
    try{published=await publisher(snapshot,{token:process.env.SNIPER_MARKET_GITHUB_TOKEN})}
    catch(e){publishError=(e?.message||'GITHUB_RESEARCH_PUBLICATION_FAILED').replace(/[^a-zA-Z0-9_. -]/g,'').slice(0,100)}
  }
  await atomicJson(statusFile,{
    schema:'research_market_collector_status.v1',paper_only:true,actionable:false,
    last_check_at_utc:now,latest_local_snapshot_at_utc:success?now:null,
    status:success?'RUNNING_RESEARCH':'BLOCKED_RESEARCH_DATA_ACCESS',
    candidate_count:snapshot.candidates.length,
    coverage:snapshot.coverage,history:clean,followups,followup_error:followupError,
    publishing_enabled:publishingEnabled(),published_commit:published?.commit_sha||null,
    publish_error:publishError
  });
  console.log('[MARKT]',now,success?'Identities='+snapshot.summary.identities:'BLOCKED_RESEARCH_DATA_ACCESS',
    'history='+clean.remaining,published?'GitHubCommit='+published.commit_sha:'',
    publishError?'GitHubPublishError='+publishError:'',
    followups?'FollowupOK='+followups.followup_ok+' Active='+followups.monitored_active:'',
    followupError?'FollowupError='+followupError:'');
  return {snapshot,published};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const once=process.argv.includes('--once');
  let unlocked=null;
  try{
    unlocked=await acquireLock();
    console.log('Sniper research market collector – PAPER ONLY / NO TRADES');
    console.log('Polling every 120 seconds; max 45 days local gzip history (512 MiB cap) + bounded research followups; paper only.');
    console.log(publishingEnabled()?'GitHub market publication explicitly enabled.':
      'GitHub publication OFF: local-only until separately configured. Dots cannot read local files.');
    let lastPublishedAt=0,active=true;
    const shutdownSignal=new AbortController();
    const stop=()=>{active=false;shutdownSignal.abort()};
    process.on('SIGINT',stop);process.on('SIGTERM',stop);
    attachSupervisedStop(stop);
    do{
      const shouldPublish=publishingEnabled()&&Date.now()-lastPublishedAt>=PUB_PERIOD_MS;
      try{
        const result=await runCycle({publish:shouldPublish});
        if(result.published)lastPublishedAt=Date.now();
      }catch(e){
        console.error('[MARKT] LOCAL_CYCLE_ERROR',e?.name||'UNKNOWN');
        await atomicJson(statusFile,{schema:'research_market_collector_status.v1',
          paper_only:true,actionable:false,status:'ERROR',last_check_at_utc:new Date().toISOString()});
      }
      if(!once&&active){
        try{await sleep(PERIOD_MS,undefined,{signal:shutdownSignal.signal})}
        catch(e){if(e?.name!=='AbortError')throw e}
      }
    }while(!once&&active);
  }catch(e){console.error('[MARKT]',e.message||'Cannot start collector');process.exitCode=1}
  finally{if(unlocked)await unlocked()}
}
