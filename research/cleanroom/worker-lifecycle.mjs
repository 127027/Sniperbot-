// Deterministic diagnostic controller, not an AI worker or trading service.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const ts=x=>Date.parse(x);
const sha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const terminal=new Set(['completed','failed','no_update']);
export function classify(run,artifacts){
 if(!run?.id||!Number.isFinite(ts(run.started_at))||!Array.isArray(artifacts))throw Error('INVALID_OBSERVATION');
 for(const a of artifacts)if(!['CHECKPOINT','FINAL','BATCH'].includes(a.kind)||!sha(a.blob_sha)||!a.path||!sha(a.commit))throw Error('UNVERIFIED_ARTIFACT_LOCATOR');
 const ended=terminal.has(run.recorded_status);
 const final=artifacts.find(a=>a.kind==='FINAL'&&a.validated===true);
 const checkpoint=artifacts.findLast(a=>a.kind==='CHECKPOINT'||a.kind==='BATCH');
 const code=!ended?'RUN_NOT_TERMINAL':final?'FINAL_ARTIFACT_PRESENT_NEEDS_QUALITY_REVIEW':run.recorded_status==='failed'?'PLATFORM_REPORTED_FAILED_NO_FINAL':checkpoint?'RUN_ENDED_AFTER_CHECKPOINT_NO_FINAL':'RUN_ENDED_WITHOUT_CHECKPOINT_OR_FINAL';
 return {run_id:run.id,recorded_status:run.recorded_status,started_at:run.started_at,completed_at:run.completed_at??null,classification:code,accepted:false,terminal:ended,last_verified_artifact:checkpoint??null,final_verified:!!final,internal_stop_reason_available:false,internal_stop_reason:'Not exposed by scheduler run metadata; no inference about timeout or crash.',next_action:final?'Independent research-quality review':!ended?'Observe next transition':checkpoint?'Resume checkpoint next_work without repeating successful stages':'Start first unfinished stage and persist a checkpoint',resume_required:ended&&!final};
}
export function packets(data,health,runtimeCommit){
 if(!sha(runtimeCommit)||health.status!=='OK'||health.snapshot!==data.snapshot||!Number.isFinite(ts(data.snapshot)))throw Error('PACKET_SOURCE_INVALID');
 const pool=[];
 for(const r of data.candidates)for(const i of r.identities??[]){
  if(!i.chain||!i.contract||!i.pool?.source_url||!Number.isFinite(ts(i.pool.retrieved_at))||ts(i.pool.retrieved_at)>ts(data.snapshot))continue;
  const id=i.chain+':'+(i.chain==='solana'?i.contract:i.contract.toLowerCase());
  const scope=r.fallback_identity?.chain===i.chain&&r.fallback_identity?.contract===i.contract?r.quote_scope:null;
  pool.push({id,chain:i.chain,contract:i.contract,name:r.coin??r.id,classification:r.classification??null,discovery_origin:r.discovery_origin??null,source_url:i.pool.source_url,observed_at:i.pool.retrieved_at,market:{pool_address:i.pool.pool_address??null,price_usd:i.pool.price_usd??null,liquidity_usd:i.pool.liquidity_usd??null,volume_1h_usd:i.pool.volume_1h_usd??null,change_1h_pct:i.pool.change_1h_pct??null,buys_1h:i.pool.buys_1h??null,sells_1h:i.pool.sells_1h??null,indicative_eur:scope?r.price_eur??null:null,quote_scope:scope},security:{status:i.security?.status??'UNKNOWN',source_url:i.security?.source_url??null,observed_at:i.security?.retrieved_at??null,secondary_status:i.secondary_security?.status??'UNKNOWN'},costs:i.execution_costs??null,research_ready_at_capture:r.research_ready===true});
 }
 pool.sort((a,b)=>Number(b.research_ready_at_capture)-Number(a.research_ready_at_capture)||ts(b.observed_at)-ts(a.observed_at)||a.id.localeCompare(b.id));
 const seen=new Set();const unique=pool.filter(x=>!seen.has(x.id)&&seen.add(x.id));
 // The market reviewer must see the complete reachable universe, not just two chains.
 const roles={market:unique,discovery:unique.filter(x=>!['solana','base'].includes(x.chain))};
 // Chain round-robin prevents a tied retrieval timestamp from filling
 // every first packet with one alphabetically early chain.
 return Object.fromEntries(Object.entries(roles).map(([worker,rows])=>{
  const groups=new Map();
  for(const row of rows){if(!groups.has(row.chain))groups.set(row.chain,[]);groups.get(row.chain).push(row)}
  const ordered=[];
  while(ordered.length<rows.length)for(const group of groups.values())if(group.length)ordered.push(group.shift());
  const meta={schema:'r31.compact-research-packet.v1',mode:'RESEARCH_ONLY',non_executable:true,worker,snapshot:data.snapshot,collector_run_id:health.run_id,runtime_commit:runtimeCommit,total_available:ordered.length,limitations:'Research leads, not recommendations. Check individual identity, classification, freshness, risk and costs independently. No execution quote guaranteed.'};
  const pages=[];
  for(let offset=0;offset<ordered.length;offset+=6){
   const n=pages.length,name=worker+'-page-'+String(n).padStart(3,'0')+'.json';
   const next=offset+6<ordered.length?worker+'-page-'+String(n+1).padStart(3,'0')+'.json':null;
   pages.push({...meta,file:name,offset,rows:ordered.slice(offset,offset+6),remaining:Math.max(0,ordered.length-offset-6),next_file:next});
  }
  return [worker,{...meta,rows:pages[0]?.rows??[],remaining:pages[0]?.remaining??0,next_file:pages[0]?.next_file??null,pages}];
 }));

}
function test(){
 const run={id:'fixture',recorded_status:'completed',started_at:'2026-11-27T09:00:00Z',completed_at:'2026-11-27T09:00:20Z'};
 const checkpoint={kind:'CHECKPOINT',path:'fixture.json',commit:'a'.repeat(40),blob_sha:'b'.repeat(40),next_work:'read page'};
 assert.equal(classify(run,[]).classification,'RUN_ENDED_WITHOUT_CHECKPOINT_OR_FINAL');
 assert.equal(classify(run,[checkpoint]).classification,'RUN_ENDED_AFTER_CHECKPOINT_NO_FINAL');
 assert.equal(classify(run,[checkpoint]).resume_required,true);
 assert.equal(classify({...run,recorded_status:'failed'},[]).classification,'PLATFORM_REPORTED_FAILED_NO_FINAL');
 assert.equal(classify(run,[{...checkpoint,kind:'FINAL',validated:false}]).final_verified,false);
 assert.equal(classify(run,[{...checkpoint,kind:'FINAL',validated:true}]).accepted,false);
 const t='2026-11-27T09:00:00Z',row={coin:'fixture',research_ready:true,identities:[{chain:'base',contract:'0x'+'a'.repeat(40),pool:{source_url:'https://example.org',retrieved_at:t,price_usd:1}},{chain:'bsc',contract:'0x'+'b'.repeat(40),pool:{source_url:'https://example.org',retrieved_at:t,price_usd:2}}]};
 const p=packets({snapshot:t,candidates:[row,row]},{status:'OK',snapshot:t,run_id:'fixture'},'a'.repeat(40));
 assert.equal(p.market.rows.length,2);assert.equal(p.discovery.rows.length,1);assert.ok(p.market.rows.some(x=>x.chain==='bsc'));assert.ok(p.market.rows.every(x=>x.market.indicative_eur===null));assert.equal(p.market.non_executable,true);
 const many=Array.from({length:15},(_,n)=>({coin:'fixture'+n,research_ready:true,identities:[{chain:n%3===0?'ethereum':n%3===1?'bsc':'arbitrum',contract:'0x'+n.toString(16).padStart(40,'0'),pool:{source_url:'https://example.org',retrieved_at:t}}]}));
 const q=packets({snapshot:t,candidates:many},{status:'OK',snapshot:t,run_id:'fixture'},'a'.repeat(40)).discovery;
 assert.equal(q.pages.length,3);assert.equal(q.pages.flatMap(x=>x.rows).length,15);assert.equal(new Set(q.pages.flatMap(x=>x.rows.map(y=>y.id))).size,15);assert.equal(new Set(q.pages[0].rows.map(x=>x.chain)).size,3);assert.equal(q.pages[0].next_file,q.pages[1].file);assert.equal(q.pages[2].next_file,null);assert.equal(q.pages[2].remaining,0);
 console.log('Worker lifecycle fixtures passed: terminal without report, checkpoint resume, no false acceptance, complete market reviewer coverage and supplemental discovery packets');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.includes('--self-test'))test();else{const o=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));console.log(JSON.stringify(o.map(x=>classify(x.run,x.artifacts)),null,2))}}
