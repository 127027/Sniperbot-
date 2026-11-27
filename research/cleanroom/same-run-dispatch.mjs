import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nextBatch} from './ranked-deep-cycle.mjs';
const mode={mode:'RESEARCH_ONLY',non_executable:true};
function prepare(p,rows,{run,commit,at}){
 if(p?.schema!=='r31.broad-research.v1'||p.mode!==mode.mode||p.non_executable!==true||p.provenance.run_id!==run||p.provenance.commit!==commit)throw Error('SCAN_PROVENANCE_MISMATCH');
 const s=p.summary;
 if(!Array.isArray(rows)||rows.length!==s.universe||s.attempted!==s.universe||s.batch_429!==0||s.batch_requests!==s.batch_http200)throw Error('INCOMPLETE_BROAD_SCAN');
 const key=x=>x.chain+':'+(x.chain==='solana'?x.contract:x.contract.toLowerCase());
 const m=new Map(rows.map(x=>[key(x),x]));if(m.size!==rows.length)throw Error('DUPLICATE_OBSERVATION');
 const ranked=[...p.selected,...p.backlog];
 const expected=rows.filter(x=>Number.isFinite(x.priority)&&['solana','ethereum','bsc','base','optimism'].includes(x.chain)).sort((a,b)=>b.priority-a.priority||key(a).localeCompare(key(b)));
 if(ranked.length!==expected.length||ranked.length<10||ranked.some((x,i)=>key(x)!==key(expected[i])||x.priority!==expected[i].priority||JSON.stringify(x)!==JSON.stringify(m.get(key(x)))))throw Error('INCOMPLETE_OR_WRONG_RANK_ORDER');
 const out={schema:'r31.broad-dispatch.v1',...mode,source_run:run,source_commit:commit,observed_at:s.finished_at,cursor:0,ranked};
 const batch=nextBatch(out,at);assert.equal(batch.selected.length,10);return out;
}
const sha=b=>createHash('sha256').update(b).digest('hex');
function test(){
 const at='2026-11-27T20:00:00Z',run='fixture',commit='a'.repeat(40);
 const rows=Array.from({length:12},(_,i)=>({chain:'base',contract:'0x'+i.toString(16).padStart(40,'0'),priority:12-i}));
 const p={schema:'r31.broad-research.v1',...mode,provenance:{run_id:run,commit},summary:{universe:12,attempted:12,batch_429:0,batch_requests:1,batch_http200:1,finished_at:at},selected:rows.slice(0,10),backlog:rows.slice(10)};
 const args={run,commit,at};assert.equal(prepare(p,rows,args).ranked.length,12);
 assert.throws(()=>prepare({...p,backlog:[]},rows,args),/RANK_ORDER/);
 assert.throws(()=>prepare(p,rows,{...args,run:'foreign'}),/PROVENANCE/);
 assert.throws(()=>prepare(p,rows,{...args,at:'2026-11-27T20:20:00Z'}),/STALE/);
 assert.throws(()=>prepare({...p,summary:{...p.summary,attempted:10}},rows,args),/INCOMPLETE_BROAD/);
 console.log('SAME_RUN_FIXTURE_PASS stale, foreign, truncated backlog, incomplete coverage rejected');
}
test();if(!process.argv.includes('--self-test')){
 const p=fs.readFileSync('broad-research.json'),r=fs.readFileSync('broad-observations.json');
 const m=prepare(JSON.parse(p),JSON.parse(r),{run:process.env.GITHUB_RUN_ID,commit:process.env.GITHUB_SHA,at:new Date().toISOString()});
 m.source_artifact_sha256={broad:sha(p),observations:sha(r)};
 fs.writeFileSync('ranked-dispatch.json',JSON.stringify(m,null,2));console.log('SAME_RUN_HANDOFF '+JSON.stringify({source_run:m.source_run,source_commit:m.source_commit,observed_at:m.observed_at,ranked:m.ranked.length,cursor:m.cursor,first:m.ranked.slice(0,10).map(x=>({chain:x.chain,contract:x.contract,priority:x.priority})),source_artifact_sha256:m.source_artifact_sha256}));
}
