// Called only AFTER the workflow commits research and partial recovery state.
// An incomplete 429/deferred sample must cause the GitHub job to FAIL, but
// cannot erase the authenticated raw evidence or its resume cursor.
import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assessCaptureCompletion} from '../src/v19-capture-completion-gate.mjs';

const runId=process.env.GITHUB_RUN_ID;
if(!/^\d{1,20}$/.test(runId||''))throw Error('MISSING_GITHUB_CAPTURE_RUN_ID');
const journals=(await readdir('research/feeds',{recursive:true}))
 .filter(s=>new RegExp('^\\d{4}-\\d{2}-\\d{2}/'+runId+'/inflight-capture\\.json$').test(s));
if(journals.length!==1)throw Error('EXACTLY_ONE_RUN_JOURNAL_REQUIRED');
const base='research/feeds/'+journals[0].slice(0,-'inflight-capture.json'.length);
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const [journal,evidence]=await Promise.all([
 readJson(base+'inflight-capture.json'),readJson(base+'evidence.json')
]);
const path=evidence.request_path;
if(typeof path!=='string'
 ||!/^research\/requests\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\.json$/.test(path))
 throw Error('INVALID_CAPTURE_REQUEST_PROVENANCE');
const request=await readJson(path);
const outcome=assessCaptureCompletion({request,journal,evidence,runId});
const rawIssues=[];
for(const r of journal.http_receipts){
 const p=r?.body_path;
 if(typeof p!=='string'||!p.startsWith(base)
  ||!/\/(?:gecko|dex)-[A-Za-z0-9_-]+\.raw\.json$/.test(p)
  ||!/^[0-9a-f]{64}$/.test(r.response_sha256||''))
  {rawIssues.push('UNTRUSTED_RAW_RECEIPT_PATH_OR_SHA');continue;}
 try{
  const raw=await readFile(p,'utf8');
  const sha=createHash('sha256').update(raw,'utf8').digest('hex');
  if(sha!==r.response_sha256)rawIssues.push('RAW_BYTES_SHA_MISMATCH');
 }catch{rawIssues.push('RAW_BYTES_MISSING');}
}
const result={...outcome,run_id:runId,raw_receipts_checked:journal.http_receipts.length,
 raw_receipt_integrity_errors:rawIssues.length?rawIssues:null,
 evidence_committed_before_verification:true};
console.log('DOT2_CAPTURE_COMPLETION_VERDICT',JSON.stringify(result));
if(!outcome.workflow_may_report_success||rawIssues.length)process.exitCode=1;
