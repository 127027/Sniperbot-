// Verify actual committed diagnosis bytes before a research scan is closed.
// The coordinator supplies a trusted checkout; a worker cannot set its path.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='r31/research/cleanroom/autonomy-acceptance/';
const sha40=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const eqIds=(actual,expected)=>Array.isArray(actual)&&actual.every(x=>typeof x==='string')&&actual.length===expected.length&&new Set(actual).size===actual.length&&JSON.stringify([...actual].sort())===JSON.stringify([...expected].sort());
export function verifyDiagnosis(q,action,repo=process.cwd()){
 const fail=reason=>{throw Error('DIAGNOSIS_NOT_VERIFIED:'+reason)};
 const s=q.scans[action.scan_id],p=action.diagnosis_artifact,c=action.diagnosis_commit;
 if(!s||!sha40(c)||!sha40(action.diagnosis_sha)||typeof p!=='string'||!p.startsWith(root)||!/^[A-Za-z0-9_.-]+\.json$/.test(p.slice(root.length))||p.includes('..'))fail('INVALID_LOCATOR');
 const git=args=>{const r=spawnSync('git',['--no-replace-objects','-C',repo,...args],{timeout:15000,maxBuffer:2*1024*1024});if(r.status!==0||!r.stdout)fail('PINNED_GIT_READ_FAILED');return r.stdout};
 if(git(['rev-parse','--verify',c+'^{commit}']).toString('utf8').trim()!==c)fail('NOT_PINNED_COMMIT');
 const blob=git(['rev-parse','--verify',c+':'+p]).toString('utf8').trim();
 if(!sha40(blob)||blob!==action.diagnosis_sha||git(['cat-file','-t',blob]).toString('utf8').trim()!=='blob')fail('BLOB_ID_MISMATCH');
 const bytes=git(['cat-file','blob',blob]);
 const hash=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 if(hash!==blob)fail('BLOB_HASH_MISMATCH');
 let doc;try{doc=JSON.parse(bytes.toString('utf8'))}catch{fail('INVALID_JSON')}
 if(doc?.schema!=='cleanroom.scan-diagnosis.v1'||doc.mode!=='RESEARCH_ONLY'||doc.non_executable!==true||doc.scan_id!==action.scan_id||doc.queue_revision!==q.revision||typeof doc.reason!=='string'||!doc.reason.trim())fail('DIAGNOSIS_BINDING_MISMATCH');
 const at=Date.parse(doc.assessed_at_utc);
 if(!Number.isFinite(at)||at<Date.parse(s.started_at)||at>Date.parse(action.at))fail('DIAGNOSIS_TIME_MISMATCH');
 const results=s.ids.map(id=>q.jobs[id].history.findLast(h=>h.scan_id===action.scan_id));
 const completed=s.ids.filter((_,i)=>Boolean(results[i])),unfinished=s.ids.filter((_,i)=>!results[i]);
 if(!eqIds(doc.completed_ids,completed)||!eqIds(doc.unfinished_ids,unfinished)||doc.buy_count!==results.filter(h=>h?.decision==='PAPER_BUY').length)fail('DIAGNOSIS_RESULT_MISMATCH');
 return {commit:c,artifact:p,blob_sha:blob};
}
