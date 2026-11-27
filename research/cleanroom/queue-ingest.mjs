// Single-writer research queue preparation. No trading or manual coin selection.
// Input files must come from one pinned collector checkout. Registry sightings
// are discovery locators, not executable quotes or verified meme classifications.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {empty,reduce,next} from './research-queue.mjs';
const schema='cleanroom.queue-inbox.v1';
const time=t=>{const n=Date.parse(t);if(!Number.isFinite(n))throw Error('INVALID_TIME');return n};
const digest=s=>createHash('sha256').update(s).digest('hex');
const id=(c,a)=>c+':'+(c==='solana'?a:a.toLowerCase());
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const allowed=new Set(['solana','ethereum','bsc','base','arbitrum','polygon','optimism','avalanche']);
const valid=(c,a)=>allowed.has(c)&&typeof a==='string'&&(c==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a):/^0x[0-9a-fA-F]{40}$/.test(a));
function sourceRow(c,a,s,t,at){
 if(!valid(c,a)||typeof s!=='string'||!s.startsWith('https://')||!Number.isFinite(Date.parse(t))||time(t)>time(at))return null;
 return {chain:c,contract:c==='solana'?a:a.toLowerCase(),source:s,observed_at:new Date(time(t)).toISOString()};
}
export function prepare(q,registry,candidates,at,scanId,limit=32){
 if(!Number.isInteger(limit)||limit<1||limit>128)throw Error('INVALID_PACKET_LIMIT');
 time(at);let state=q??empty(),seq=0;
 const emit=(type,payload)=>{const a={type,...payload,at,expected_revision:state.revision,event_id:scanId+':'+(++seq)+':'+type};state=reduce(state,a)};
 const observations=new Map(), evidence=new Map();
 function add(row){if(!row)return;const k=id(row.chain,row.contract)+'|'+row.source+'|'+row.observed_at;observations.set(k,row)}
 for(const r of registry){
  for(const s of r.sources??[])add(sourceRow(r.chain,r.contract,s.url,s.retrieved_at,at));
 }
 for(const r of candidates)for(const i of r.identities??[]){
  if(!valid(i.chain,i.contract))continue;
  const k=id(i.chain,i.contract),p=i.pool;
  add(sourceRow(i.chain,i.contract,p?.source_url,p?.retrieved_at,at));
  // A contract-addressed lead is discovery evidence even without a known pool.
  // Never bind a generic asset-level quote to a contract as discovery evidence.
  if(r.id==='lead:'+k&&typeof r.discovery_origin==='string'&&r.discovery_origin) add(sourceRow(i.chain,i.contract,r.source_url,r.observed_at_utc,at));
  if(!evidence.has(k))evidence.set(k,[]);
  evidence.get(k).push({asset_id:r.id,coin:r.coin??null,discovery_origin:r.discovery_origin??null,quote:{price_eur:r.price_eur??null,observed_at:r.observed_at_utc??null,scope:r.quote_scope??null,identity:r.fallback_identity??null,source:r.source_url??null},pool:p??null,security:i.security??null,secondary_security:i.secondary_security??null,execution_costs:i.execution_costs??null});
 }
 // Keep distinct source observations, not just latest token names.
 const rows=[...observations.values()];
 if(rows.length)emit('ENQUEUE',{rows});
 // Reopen when there is genuinely newer observed evidence; previous conclusions retained.
 for(const j of Object.values(state.jobs)){
  if(j.status==='DECIDED'&&j.last_seen&&time(j.last_seen)>time(j.history.at(-1).at))emit('REOPEN',{chain:j.chain,contract:j.contract,evidence_at:j.last_seen,reason:'New original-time discovery/pool evidence'});
 }
 const pending=next(state,at),pendingSet=new Set(pending);
 const age=k=>state.jobs[k].last_assigned_at??state.jobs[k].first_seen;
 const oldest=(a,b)=>age(a).localeCompare(age(b))||(state.jobs[a].assignments??0)-(state.jobs[b].assignments??0)||a.localeCompare(b);
 const resumed=pending.filter(k=>state.jobs[k].attempts>0&&state.jobs[k].status!=='DECIDED').sort(oldest);
 // A separate rotating backlog prevents starvation; prioritize recent observed
 // market evidence for acquisition only, never a price-based BUY decision.
 const recent=pending.filter(k=>!(state.jobs[k].assignments??0)&&!state.jobs[k].attempts&&evidence.has(k)).sort((a,b)=>state.jobs[b].last_seen.localeCompare(state.jobs[a].last_seen)||a.localeCompare(b));
 const backlog=[...pending].sort(oldest);
 const ids=[],used=new Set();
 function take(xs,n){let count=0;for(const k of xs){if(ids.length>=limit||count>=n)break;if(pendingSet.has(k)&&!used.has(k)){used.add(k);ids.push(k);count++}}}
 // Reserve capacity across categories, not merely within the never-assigned tier:
 // continuous arrivals must not permanently starve interrupted or old work.
 if(limit===1){
  const phase=Object.keys(state.scans).length%4;
  if(phase===0)take(resumed,1);else if(phase===1||phase===2)take(recent,1);
 }else{
  take(resumed,Math.max(1,Math.floor(limit/4)));
  take(recent,Math.min(Math.ceil(limit/2),Math.max(0,limit-ids.length-1)));
 }
 take(backlog,limit);
 if(ids.length)emit('START_SCAN',{scan_id:scanId,ids});
 const inbox={schema,mode:'RESEARCH_ONLY',non_executable:true,scan_id:scanId,prepared_at:at,queue_revision:state.revision,eligible_pending:pending.length,assigned:ids.length,remaining:pending.length-ids.length,rows:ids.map(k=>{const j=state.jobs[k];return {id:k,chain:j.chain,contract:j.contract,first_seen:j.first_seen,last_seen:j.last_seen,attempts:j.attempts,status:j.status,checkpoint:j.checkpoint??null,discovery_sources:j.evidence.slice(-6),evidence:evidence.get(k)??[]}}),limitations:'Unranked research work assignment. Not a shortlist of recommended purchases. Verify source identity, timestamps, prices, costs and safety independently. Missing evidence remains unknown.'};
 return {state,inbox};
}
async function readInputs(root){
 const ri=await read(path.join(root,'token-registry/index.json')),ci=await read(path.join(root,'candidate-pages/index.json'));
 if(ri.schema!=='cleanroom.token-registry.v1'||ci.schema!=='cleanroom.candidate-index.v1'||!Array.isArray(ri.shards)||!Array.isArray(ci.pages))throw Error('BAD_INPUT_INDEX');
 const registry=[],candidates=[],shards=new Set(),pages=new Set();
 for(const s of ri.shards){if(!/^[0-9a-f]{2}$/.test(s.id)||shards.has(s.id))throw Error('BAD_SHARD');shards.add(s.id);const p=await read(path.join(root,'token-registry',s.id+'.json'));if(!Array.isArray(p.rows)||p.rows.length!==s.count)throw Error('SHARD_COUNT_MISMATCH');for(const r of p.rows){if(!valid(r.chain,r.contract)||digest(id(r.chain,r.contract)).slice(0,2)!==s.id)throw Error('SHARD_IDENTITY_MISMATCH');registry.push(r)}}
 if(registry.length!==ri.total_contracts)throw Error('REGISTRY_TOTAL_MISMATCH');
 for(const p of ci.pages){if(!/^page-[0-9]{3,6}\.json$/.test(p.file)||pages.has(p.file))throw Error('BAD_PAGE');pages.add(p.file);const j=await read(path.join(root,'candidate-pages',p.file));if(j.snapshot!==ci.snapshot||!Array.isArray(j.rows)||j.rows.length!==p.count)throw Error('MIXED_OR_TRUNCATED_PAGES');candidates.push(...j.rows)}
 if(candidates.length!==ci.total_rows)throw Error('PAGE_TOTAL_MISMATCH');
 return {registry,candidates,snapshot:ci.snapshot,registry_snapshot:ri.updated_at};
}
function selfTest(){
 const t='2026-11-27T07:00:00Z',a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),c='0x'+'c'.repeat(40);
 const rows=[a,b,c].map(contract=>({chain:'ethereum',contract,sources:[{url:'https://example.org/discovery',retrieved_at:t}]}));
 const candidates=[{id:'asset',coin:'fixture',identities:[{chain:'ethereum',contract:a,pool:{source_url:'https://example.org/pool',retrieved_at:t}}]}];
 const p=prepare(null,rows,candidates,t,'scan1',2);
 assert.equal(Object.keys(p.state.jobs).length,3);assert.equal(p.inbox.assigned,2);assert.equal(p.inbox.remaining,1);assert.equal(p.inbox.rows[0].contract,a);
 assert.equal(p.inbox.rows[0].evidence[0].quote.price_eur,null);assert.equal(p.state.scans.scan1.status,'OPEN');
 const restored=JSON.parse(JSON.stringify(p.state));assert.equal(Object.keys(restored.jobs).length,3);
 const newer='2026-11-27T07:01:00Z';
 const q=prepare(restored,[...rows,{chain:'ethereum',contract:'bad',sources:[{url:'https://example.org',retrieved_at:t}]}],candidates,newer,'scan2',3);
 assert.equal(Object.keys(q.state.jobs).length,3);assert.equal(q.inbox.assigned,1);assert.equal(q.inbox.non_executable,true);
 assert.ok(q.inbox.rows.every(x=>!p.inbox.rows.some(y=>y.id===x.id)));
 const lead={id:'lead:ethereum:'+a,discovery_origin:'DOT_SUPPORT_DISCOVERY',source_url:'https://example.org/discovery',observed_at_utc:t,identities:[{chain:'ethereum',contract:a,pool:null}]};
 assert.equal(Object.keys(prepare(null,[],[lead],t,'lead',2).state.jobs).length,1);
 assert.equal(Object.keys(prepare(null,[],[{...lead,id:'asset'}],t,'asset',2).state.jobs).length,0);
 // Sustained fresh arrivals must not starve a previously interrupted task or
 // an older unseen backlog. Each round is a synthetic, expired reservation.
 const start=Date.parse(t),make=(n,at)=>({chain:'ethereum',contract:'0x'+n.toString(16).padStart(40,'0'),sources:[{url:'https://example.org/discovery',retrieved_at:at}]});
 const older=Array.from({length:12},(_,i)=>make(i+100,t));
 let z=prepare(null,older,[],t,'fair0',1).state,interrupted=z.scans.fair0.ids[0],job=z.jobs[interrupted];
 z=reduce(z,{type:'CLAIM',chain:job.chain,contract:job.contract,scan_id:'fair0',worker:'fixture',token:'fixture-token',lease_seconds:60,at:t,event_id:'fair-claim',expected_revision:z.revision});
 const seen=new Set();
 for(let round=1;round<=16;round++){
  const at=new Date(start+round*16*60000).toISOString();
  const newRows=Array.from({length:12},(_,i)=>make(1000+round*12+i,at));
  const evidence=newRows.map(r=>({id:'lead:'+id(r.chain,r.contract),discovery_origin:'FIXTURE',source_url:r.sources[0].url,observed_at_utc:at,identities:[{chain:r.chain,contract:r.contract,pool:null}]}));
  const p=prepare(z,newRows,evidence,at,'fair'+round,4);z=p.state;
  for(const r of p.inbox.rows)seen.add(r.id);
  if(round===1)assert.ok(p.inbox.rows.some(r=>r.id===interrupted),'Interrupted task starved by fresh leads');
  assert.equal(p.inbox.rows.length,4);
 }
 assert.ok(older.every(r=>seen.has(id(r.chain,r.contract))),'Old backlog starved by sustained new leads');
 console.log('Queue ingestion fixtures passed: registry coverage, bounded inbox, source provenance, missing quote and persistence');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--self-test'))selfTest();
 else{
  const [root,stateFile,scanId,at,limit='32']=process.argv.slice(2);
  if(!root||!stateFile||!scanId||!at)throw Error('Usage: queue-ingest.mjs COLLECTOR_ROOT STATE_JSON SCAN_ID ISO_TIME [LIMIT]');
  const data=await readInputs(root);if(time(data.snapshot)>time(at))throw Error('FUTURE_SNAPSHOT');
  let q;try{q=await read(stateFile)}catch(e){if(e.code!=='ENOENT')throw e;q=empty()}
  const p=prepare(q,data.registry,data.candidates,at,scanId,Number(limit));
  p.inbox.snapshot=data.snapshot;p.inbox.snapshot_age_seconds=(time(at)-time(data.snapshot))/1000;
  p.inbox.registry_snapshot=data.registry_snapshot;p.inbox.snapshot_status=p.inbox.snapshot_age_seconds<=900?'RECENT_SNAPSHOT':'STALE_SNAPSHOT';
  // Single writer only. Distributed application must atomically CAS the state;
  // inbox is reconstructed from committed state and pinned snapshot on failure.
  await fs.mkdir(path.dirname(stateFile),{recursive:true});
  await fs.writeFile(stateFile+'.tmp',JSON.stringify(p.state)+'\n');await fs.rename(stateFile+'.tmp',stateFile);
  console.log(JSON.stringify(p.inbox,null,2));
 }
}
