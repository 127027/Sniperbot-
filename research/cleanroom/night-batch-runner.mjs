import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {nextBatch} from './ranked-deep-cycle.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
function accept(m,p,s,cursor){
 const ids=m.ranked.slice(cursor,cursor+10),count=ids.length;
 if(p?.schema!=='r31.prefetched-analysis-packet.v1'||p.mode!=='RESEARCH_ONLY'||p.non_executable!==true||p.provenance?.broad_source_run!==m.source_run||p.provenance?.broad_source_commit!==m.source_commit||p.provenance?.ranked_cursor!==cursor||p.candidates?.length!==count||s?.selected!==count||s.ranked_cursor!==cursor||s.verified_buys!==0||ids.some((x,i)=>x.chain!==p.candidates[i]?.chain||x.contract!==p.candidates[i]?.contract))throw Error('BATCH_ACCEPTANCE_FAILED');
 return cursor+count;
}
function canContinue(m,cursor,at,estimateMs){const age=Date.parse(at)-Date.parse(m.observed_at);return cursor<m.ranked.length&&Number.isFinite(age)&&age>=0&&age+estimateMs<=900000;}
function test(){
 const at='2026-11-27T20:00:00Z',m={schema:'r31.broad-dispatch.v1',mode:'RESEARCH_ONLY',non_executable:true,source_run:'fixture',source_commit:'a'.repeat(40),observed_at:at,cursor:0,ranked:Array.from({length:20},(_,i)=>({chain:'base',contract:'0x'+i.toString(16).padStart(40,'0'),priority:20-i}))};
 const p={schema:'r31.prefetched-analysis-packet.v1',mode:'RESEARCH_ONLY',non_executable:true,provenance:{broad_source_run:m.source_run,broad_source_commit:m.source_commit,ranked_cursor:0},candidates:m.ranked.slice(0,10)};
 assert.equal(accept(m,p,{selected:10,ranked_cursor:0,verified_buys:0},0),10);
 assert.equal(nextBatch({...m,cursor:10},at).selected[0].contract,m.ranked[10].contract);
 assert.throws(()=>accept(m,{...p,candidates:p.candidates.slice(1)}, {selected:10,ranked_cursor:0,verified_buys:0},0),/BATCH_ACCEPTANCE/);
 assert.throws(()=>nextBatch(m,'2026-11-27T20:20:00Z'),/STALE/);
 assert.equal(accept(m,{...p,provenance:{...p.provenance,ranked_cursor:19},candidates:m.ranked.slice(19)}, {selected:1,ranked_cursor:19,verified_buys:0},19),20);
 assert.ok(canContinue(m,0,at,300000));assert.ok(canContinue(m,10,'2026-11-27T20:09:00Z',300000));assert.ok(!canContinue(m,10,'2026-11-27T20:11:00Z',300000));assert.ok(!canContinue(m,20,at,0));
 console.log('NIGHT_BATCH_FIXTURES_PASS');
}
test();
if(!process.argv.includes('--self-test')){
 const m=JSON.parse(fs.readFileSync('ranked-dispatch.json')),dir='night-evidence';fs.mkdirSync(dir,{recursive:true});
 const j={schema:'r31.night-batch-journal.v1',mode:'RESEARCH_ONLY',non_executable:true,source_run:m.source_run,source_commit:m.source_commit,observed_at:m.observed_at,next_cursor:m.cursor,attempts:[],qualified_buys:0};
 const save=()=>{fs.writeFileSync(dir+'/journal.json.tmp',JSON.stringify(j,null,2));fs.renameSync(dir+'/journal.json.tmp',dir+'/journal.json');};save();
 let estimateMs=240000;
 while(canContinue(m,j.next_cursor,new Date().toISOString(),estimateMs)){
  const cursor=j.next_cursor;const attempt={cursor,started_at:new Date().toISOString(),status:'STARTED'};j.attempts.push(attempt);save();
  try{
   const b=nextBatch({...m,cursor},attempt.started_at);
   if(!b.selected.length)break;
   const mp=dir+'/manifest-'+cursor+'.json';fs.writeFileSync(mp,JSON.stringify({...m,cursor}));
   for(const f of ['ranked-packet.json','ranked-summary.json'])fs.rmSync(f,{force:true});
   execFileSync('node',['research/cleanroom/ranked-deep-cycle.mjs'],{env:{...process.env,R31_DISPATCH_PATH:mp,R31_SAME_RUN:'1'},stdio:'inherit',timeout:480000});
   const pb=fs.readFileSync('ranked-packet.json'),sb=fs.readFileSync('ranked-summary.json'),p=JSON.parse(pb),s=JSON.parse(sb);
   const next=accept(m,p,s,cursor);
   fs.writeFileSync(dir+'/packet-'+cursor+'.json',pb);fs.writeFileSync(dir+'/summary-'+cursor+'.json',sb);
   Object.assign(attempt,{status:'ACQUISITION_VERIFIED_NOT_WORKER_REVIEW',packet_id:p.id,packet_sha256:hash(pb),summary_sha256:hash(sb),finished_at:new Date().toISOString()});j.next_cursor=next;estimateMs=Math.max(60000,Date.parse(attempt.finished_at)-Date.parse(attempt.started_at)+15000);save();
  }catch(e){Object.assign(attempt,{status:'BLOCKED',error:String(e.message).slice(0,500),finished_at:new Date().toISOString()});save();console.log('NIGHT_BATCH_JOURNAL '+JSON.stringify(j));throw e}
 }
 j.remaining=Math.max(0,m.ranked.length-j.next_cursor);j.stop_reason=j.remaining?'FRESHNESS_BUDGET_REFRESH_REQUIRED':'ALL_RANKED_ACQUIRED';save();
 console.log('NIGHT_BATCH_JOURNAL '+JSON.stringify(j));
}
