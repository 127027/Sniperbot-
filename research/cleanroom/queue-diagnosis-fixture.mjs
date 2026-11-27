// Isolated tests only: write an actual Git blob and commit in a disposable repo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
export function diagnosisFixture(q,scanId,at,override={}){
 const repo=fs.mkdtempSync(path.join(os.tmpdir(),'cleanroom-diagnosis-'));
 const cleanup=()=>fs.rmSync(repo,{recursive:true,force:true});
 try{
 const git=args=>{const r=spawnSync('git',['-C',repo,...args],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim()};
 git(['init','-q']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.invalid']);
 const s=q.scans[scanId],results=s.ids.map(id=>q.jobs[id].history.findLast(h=>h.scan_id===scanId));
 const doc={schema:'cleanroom.scan-diagnosis.v1',mode:'RESEARCH_ONLY',non_executable:true,scan_id:scanId,queue_revision:q.revision,assessed_at_utc:at,reason:'Isolated diagnosis test fixture',completed_ids:s.ids.filter((_,i)=>Boolean(results[i])),unfinished_ids:s.ids.filter((_,i)=>!results[i]),buy_count:results.filter(h=>h?.decision==='PAPER_BUY').length,...override};
 const artifact='r31/research/cleanroom/autonomy-acceptance/diagnosis-fixture.json';
 fs.mkdirSync(path.dirname(path.join(repo,artifact)),{recursive:true});fs.writeFileSync(path.join(repo,artifact),JSON.stringify(doc));
 git(['add','--',artifact]);git(['-c','core.hooksPath=/dev/null','commit','-qm','Diagnosis fixture']);
 const commit=git(['rev-parse','HEAD']),sha=git(['rev-parse',commit+':'+artifact]);
 return {repo,cleanup,action:{scan_id:scanId,diagnosis_artifact:artifact,diagnosis_commit:commit,diagnosis_sha:sha,readback_verified:true}};
 }catch(e){cleanup();throw e}
}
