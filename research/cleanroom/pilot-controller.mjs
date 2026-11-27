// Bounded, real GitHub handoff pilot. One independent worker, one contract.
// This is not a trading signal, execution service or 24h scheduler.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {readInputs} from './queue-ingest.mjs';
import {openRemoteCoordinator} from './queue-remote.mjs';
import {blobSha} from './queue-artifact.mjs';
const stateRef='refs/heads/cleanroom-coordinator-r31-pilot-v1';
const trustedRef='refs/remotes/origin/codex/r31-autonomy-recovery';
const prefix='r31/research/cleanroom/autonomy-acceptance/';
const worker='r31-pilot-worker',scan='r31-pilot-v1';
const now=()=>new Date().toISOString(),ts=x=>Date.parse(x);
const sha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const https=x=>typeof x==='string'&&/^https:\/\/[^\s/]+/.test(x);
const valid=(c,a)=>['solana','ethereum','bsc','base','arbitrum','polygon','optimism','avalanche'].includes(c)&&typeof a==='string'&&(c==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a):/^0x[0-9a-fA-F]{40}$/.test(a));
const key=(c,a)=>c+':'+(c==='solana'?a:a.toLowerCase());
function parseJson(bytes,label){
 if(typeof bytes!=='string'&& !Buffer.isBuffer(bytes))throw Error('JSON_INPUT_MISSING:'+label);
 const s=String(bytes);if(!s.trim())throw Error('JSON_INPUT_EMPTY:'+label);
 if(Buffer.byteLength(s)>2*1024*1024)throw Error('JSON_INPUT_TOO_LARGE:'+label);
 let v;try{v=JSON.parse(s)}catch{throw Error('JSON_INPUT_INVALID:'+label)}
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('JSON_OBJECT_REQUIRED:'+label);
 return v;
}
function git(repo,args){
 const r=spawnSync('git',['--no-replace-objects','-C',repo,...args],{timeout:45000,maxBuffer:8*1024*1024});
 if(r.error||r.status!==0)throw Error('PILOT_GIT_FAILED:'+args[0]);
 return r.stdout;
}
function pick(data,at){
 if(!Number.isFinite(ts(data.snapshot))||ts(data.snapshot)>ts(at)||ts(at)-ts(data.snapshot)>300000)throw Error('PILOT_STALE_SNAPSHOT');
 const found=[];
 for(const r of data.candidates)for(const i of r.identities??[]){
  if(!valid(i.chain,i.contract)||!https(i.pool?.source_url)||!Number.isFinite(ts(i.pool?.retrieved_at))||ts(i.pool.retrieved_at)>ts(at)||ts(at)-ts(i.pool.retrieved_at)>300000)continue;
  const id=key(i.chain,i.contract);
  // Select for evidence availability, not price or potential profit.
  found.push({id,r,i,fresh:r.research_ready===true&&Number.isFinite(ts(r.observed_at_utc))&&ts(r.observed_at_utc)<=ts(at)&&ts(at)-ts(r.observed_at_utc)<=900000});
 }
 found.sort((a,b)=>Number(b.fresh)-Number(a.fresh)||ts(b.i.pool.retrieved_at)-ts(a.i.pool.retrieved_at)||a.id.localeCompare(b.id));
 const x=found[0];if(!x)throw Error('PILOT_NO_CURRENT_IDENTITY');
 const {r,i}=x;
 // Keep exactly one identity and minimal evidence. No asset-level price is an execution quote.
 const candidate={id:r.id,coin:r.coin,discovery_origin:r.discovery_origin,price_eur:r.price_eur,observed_at_utc:r.observed_at_utc,quote_scope:r.quote_scope,source_url:r.source_url,fallback_identity:r.fallback_identity,identities:[{chain:i.chain,contract:i.contract,pool:i.pool,security:i.security,secondary_security:i.secondary_security,execution_costs:i.execution_costs}]};
 const registry=data.registry.filter(y=>valid(y.chain,y.contract)&&key(y.chain,y.contract)===x.id).map(y=>({...y,sources:(y.sources??[]).slice(-4)}));
 return {registry,candidates:[candidate],id:x.id};
}
function readArtifact(repo,commit,path){
 const tree=git(repo,['ls-tree',commit,'--',path]).toString('utf8').trim();
 if(!tree)return null; // explicit absence, not malformed JSON
 const m=tree.match(/^100644 blob ([0-9a-f]{40})\t(.+)$/);
 if(!m||m[2]!==path)throw Error('PILOT_BAD_ARTIFACT_LOCATOR');
 const bytes=git(repo,['cat-file','blob',m[1]]);
 if(blobSha(bytes)!==m[1])throw Error('PILOT_BLOB_HASH_MISMATCH');
 return {doc:parseJson(bytes,path),commit,artifact:path,blob_sha:m[1]};
}
function validateWorker(doc,packet,row,kind,at){
 if(doc.schema!=='cleanroom.worker-artifact.v1'||doc.mode!=='RESEARCH_ONLY'||doc.non_executable!==true||doc.scan_id!==packet.scan_id||doc.worker!==packet.worker||doc.chain!==row.chain||doc.contract!==row.contract||doc.token!==row.token)throw Error('PILOT_WORKER_BINDING_INVALID');
 if(!Number.isFinite(ts(doc.assessed_at_utc))||ts(doc.assessed_at_utc)<ts(packet.prepared_at)||ts(doc.assessed_at_utc)>ts(at)||ts(doc.assessed_at_utc)>=ts(row.lease_expires_at))throw Error('PILOT_ASSESSMENT_TIME_INVALID');
 if(!Array.isArray(doc.sources)||!doc.sources.length||doc.sources.some(s=>!https(s.url)||!Number.isFinite(ts(s.observed_at))||ts(s.observed_at)>ts(doc.assessed_at_utc)))throw Error('PILOT_SOURCE_INVALID');
 if(kind==='checkpoint'&&doc.status!=='NOT_FINAL')throw Error('PILOT_CHECKPOINT_REQUIRED');
 if(kind==='final'&&(doc.status!=='FINAL'||!['WATCH','REJECT','DATA_GAP'].includes(doc.decision)||typeof doc.reason!=='string'||!doc.reason.trim()||!Array.isArray(doc.actual_attempts)||!doc.actual_attempts.length||doc.actual_attempts.some(a=>!https(a.url)||typeof a.result!=='string'||!a.result.trim())))throw Error('PILOT_FINAL_INCOMPLETE');
}
async function dispatch(cache){
 const remote=openRemoteCoordinator(cache,stateRef),initial=remote.refresh();
 if(Object.hasOwn(initial.bundle.packets,scan)){console.log(JSON.stringify({mode:'RESEARCH_ONLY',event:'DISPATCH_ALREADY_EXISTS',state:initial.head}));return}
 const root='research/cleanroom',h=parseJson(fs.readFileSync(root+'/collector-health.json'),'collector-health');
 const data=await readInputs(root),at=now();
 if(h.status!=='OK'||h.run_id!==process.env.GITHUB_RUN_ID||h.snapshot!==data.snapshot||h.fresh_research_quotes<1)throw Error('PILOT_COLLECTOR_NOT_FRESH');
 const selection=pick(data,at);
 const result=remote.transact(initial.head,'assignClaimed',{scan_id:scan,worker,at,registry:selection.registry,candidates:selection.candidates,limit:1,lease_seconds:3600});
 const packet=result.bundle.packets[scan];
 assert.equal(packet.rows.length,1);assert.equal(packet.rows[0].id,selection.id);
 const readback=remote.refresh();assert.equal(readback.head,result.head);
 console.log(JSON.stringify({mode:'RESEARCH_ONLY',event:'REAL_GITHUB_DISPATCH',state_commit:result.head,scan,worker,identity:selection.id,snapshot:data.snapshot,collector_run:h.run_id,lease_expires_at:packet.rows[0].lease_expires_at,readback:true}));
}
function reconcile(cache,artifactRepo){
 const remote=openRemoteCoordinator(cache,stateRef);let state=remote.refresh();
 const packet=state.bundle.packets[scan];if(!packet)throw Error('PILOT_PACKET_MISSING');
 const row=packet.rows[0];
 git(artifactRepo,['fetch','--no-tags','origin','+refs/heads/codex/r31-autonomy-recovery:'+trustedRef]);
 const commit=git(artifactRepo,['rev-parse','--verify',trustedRef+'^{commit}']).toString().trim();
 if(!sha(commit))throw Error('PILOT_TRUSTED_COMMIT_INVALID');
 const outcomes=[];
 for(const kind of ['checkpoint','final']){
  const event_id=scan+':'+kind;
  const prior=state.bundle.queue.events.find(e=>e.id===event_id);
  if(prior){outcomes.push({kind,status:'ALREADY_ACCEPTED'});continue}
  const a=readArtifact(artifactRepo,commit,prefix+scan+'-'+kind+'.json');
  if(!a){outcomes.push({kind,status:'MISSING'});break}
  const at=now();validateWorker(a.doc,packet,row,kind,at);
  const {doc,...pin}=a;
  state=remote.transact(state.head,'receipt',artifactRepo,trustedRef,{...pin,scan_id:scan,worker,chain:row.chain,contract:row.contract,token:row.token,at,event_id});
  outcomes.push({kind,status:'ACCEPTED',blob_sha:pin.blob_sha,commit:pin.commit});
 }
 const readback=remote.refresh(),j=readback.bundle.queue.jobs[row.id];
 const final=j.history.find(x=>x.scan_id===scan);
 console.log(JSON.stringify({mode:'RESEARCH_ONLY',event:'REAL_GITHUB_RECEIPT',state_commit:readback.head,outcomes,final_accepted:Boolean(final),decision:final?.decision??null,checkpoint_accepted:readback.bundle.queue.events.some(e=>e.id===scan+':checkpoint'),readback:true,limitations:'Structural worker handoff only; DATA_GAP is not full market assessment or profitability.'}));
}
function selfTest(){
 assert.throws(()=>parseJson('','empty'),/JSON_INPUT_EMPTY/);
 assert.throws(()=>parseJson('{"a":','truncated'),/JSON_INPUT_INVALID/);
 assert.throws(()=>parseJson('[]','array'),/JSON_OBJECT_REQUIRED/);
 assert.deepEqual(parseJson('{"ok":true}','valid'),{ok:true});
 const t='2026-11-27T08:00:00Z',a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40);
 const mk=(contract,retrieved_at)=>({id:'lead:'+key('ethereum',contract),identities:[{chain:'ethereum',contract,pool:{source_url:'https://example.org/pool',retrieved_at}}]});
 assert.throws(()=>pick({snapshot:'2026-11-27T07:00:00Z',candidates:[],registry:[]},t),/STALE_SNAPSHOT/);
 const x=pick({snapshot:t,candidates:[mk(a,'2026-11-27T07:00:00Z'),mk(b,t)],registry:[]},t);assert.equal(x.id,key('ethereum',b));
 const packet={scan_id:scan,worker,prepared_at:t},row={chain:'ethereum',contract:a,token:'fixture',lease_expires_at:'2026-11-27T09:00:00Z'};
 const d={schema:'cleanroom.worker-artifact.v1',mode:'RESEARCH_ONLY',non_executable:true,scan_id:scan,worker,chain:row.chain,contract:a,token:row.token,assessed_at_utc:t,status:'FINAL',decision:'DATA_GAP',reason:'fixture',sources:[{url:'https://example.org',observed_at:t}],actual_attempts:[{url:'https://example.org',result:'fixture'}]};
 validateWorker(d,packet,row,'final',t);assert.throws(()=>validateWorker({...d,decision:'PAPER_BUY'},packet,row,'final',t),/PILOT_FINAL_INCOMPLETE/);
 assert.throws(()=>validateWorker({...d,token:'wrong'},packet,row,'final',t),/BINDING/);
 assert.throws(()=>validateWorker({...d,assessed_at_utc:'2026-11-27T07:59:00Z'},packet,row,'final',t),/TIME_INVALID/);
 console.log('Pilot fixtures passed: malformed and empty JSON, stale snapshots, identity selection, lease binding, final validation, no BUY');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode,cache]=process.argv.slice(2);
 if(mode==='--self-test')selfTest();else if(mode==='dispatch'&&cache)await dispatch(cache);else if(mode==='reconcile'&&cache)reconcile(cache,process.cwd());else throw Error('Usage: --self-test | dispatch CACHE | reconcile CACHE');
}
