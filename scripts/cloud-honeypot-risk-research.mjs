// EXACTLY ONE external free public security-research GET on explicit GitHub request.
// No wallets, orders, real-money, GPT review or Paper trade permission.
// Supports only original ETH/BSC/Base V2/V3 pair addresses; never V4.
// Refer to https://docs.honeypot.is/ishoneypot and /chains; providers may change.
// Auth is not required under official API documentation as of Nov 22 2026.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildHoneypotResearchRequest,classifyHoneypotResearchCapture}
 from '../src/v19-honeypot-risk-research.mjs';
const branch='codex/r29-cleanroom-paper-20261121';
if(process.env.GITHUB_REF!=='refs/heads/'+branch)
 throw Error('WRONG_BRANCH_FOR_SECURITY_RESEARCH');
const commit=process.env.GITHUB_SHA;
if(!/^[a-f0-9]{40}$/.test(commit||''))throw Error('REQUIRE_EXACT_SOURCE_COMMIT');
const runId=process.env.GITHUB_RUN_ID;
if(!/^\d{1,20}$/.test(runId||''))throw Error('MISSING_GITHUB_RUN_ID');
const files=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).split(/\r?\n/).filter(p=>/^research\/risk-requests\/20\d{2}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\.json$/.test(p));
if(files.length!==1)throw Error('EXACTLY_ONE_SECURITY_RESEARCH_REQUEST_FILE');
const file=files[0],request=JSON.parse(await readFile(file,'utf8'));
const now=()=>new Date().toISOString(),capturedAt=now();
const sample=buildHoneypotResearchRequest(request);
if(request?.schema!==1||request.kind!=='R29_HONEYPOT_RESEARCH_CAPTURE_REQUEST'
 ||request.mode!=='PAPER_RESEARCH_ONLY'||request.requested_by!=='dot-3-risk'
 ||request.do_not_publish_orders!==true
 ||sample.status!=='RESEARCH_REQUEST_ELIGIBLE'
 ||!Number.isFinite(Date.parse(request.created_at_utc))
 ||Date.parse(request.created_at_utc)>Date.now()+1000
 ||Date.now()-Date.parse(request.created_at_utc)>10*60000)
 throw Error('INVALID_UNSAFE_OR_STALE_RISK_CAPTURE_REQUEST');
const statePath='research/risk/state/honeypot-provider-budget.json';
let state;
try{state=JSON.parse(await readFile(statePath,'utf8'))}
catch(e){if(e.code!=='ENOENT')throw e;
 state={schema:1,kind:'R29_HONEYPOT_RESEARCH_PROVIDER_BUDGET',
 last_attempt_at_utc:null,cooldown_until_utc:null,total_attempts:0,
 provider:'HONEYPOT_IS',orders_authorized:0};}
if(state?.kind!=='R29_HONEYPOT_RESEARCH_PROVIDER_BUDGET'
 ||state.schema!==1||state.provider!=='HONEYPOT_IS'
 ||state.orders_authorized!==0||!Number.isInteger(state.total_attempts)
 ||state.total_attempts<0)throw Error('CORRUPTED_HONEYPOT_PROVIDER_BUDGET');
const last=state.last_attempt_at_utc?Date.parse(state.last_attempt_at_utc):0;
const blocked=state.cooldown_until_utc?Date.parse(state.cooldown_until_utc):0;
if(!Number.isFinite(last)||!Number.isFinite(blocked)
 ||last>Date.now()||blocked>Date.now()+7*86400000)
 throw Error('CORRUPT_OR_FUTURE_HONEYPOT_STATE');
const root='research/feeds/'+capturedAt.slice(0,10)+'/'+runId;
await mkdir(root,{recursive:true});
await mkdir('research/risk/state',{recursive:true});
let receipt=null,raw=null,summary=null,error=null,status=null;
const earliest=Math.max(last+10*60000,blocked);
const rawPath=root+'/honeypot-'+sample.chain+'-'+sample.contract.toLowerCase()+'.raw.json';
if(Date.now()<earliest){
 status='PROVIDER_BUDGET_DEFERRED';
 error='ONE_REQUEST_PER_TEN_MINUTES_OR_RETRY_AFTER';
}else{
 const started=now();
 state.last_attempt_at_utc=started;
 state.total_attempts++;
 // Reserve before the HTTP call, so even timeout or 429 count as an attempt.
 state.updated_at_utc=started;
 await writeFile(statePath,JSON.stringify(state,null,2)+'\n');
 try{
  const response=await fetch(sample.url,{
   headers:{Accept:'application/json'},redirect:'error',
   signal:AbortSignal.timeout(14000)
  });
  raw=await response.text();
  if(Buffer.byteLength(raw,'utf8')>1500000)throw Error('RISK_RESPONSE_TOO_LARGE');
  const received=now();
  receipt={provider:'HONEYPOT_IS',url:sample.url,
   http_status:response.status,http_ok:response.ok,
   started_at_utc:started,received_at_utc:received,
   response_sha256:createHash('sha256').update(raw).digest('hex'),
   raw_bytes_utf8:Buffer.byteLength(raw,'utf8'),body_path:rawPath,
   no_api_key_used:true,trade_authorized:false};
  await writeFile(rawPath,raw,{flag:'wx'});
  if(response.status===429||response.status>=500){
   const hint=response.headers.get('retry-after');
   const sec=hint&&/^\d{1,6}$/.test(hint)?Number(hint):null;
   const when=hint&&sec===null?Date.parse(hint):null;
   const delay=sec!==null?Math.min(sec*1000,7200000):
    Number.isFinite(when)?Math.max(0,when-Date.now()):60*60000;
   state.cooldown_until_utc=new Date(Date.now()+Math.max(10*60000,delay)).toISOString();
  }
  state.last_http_status=response.status;
  status=response.ok?'HTTP_200_RESEARCH':'HTTP_'+response.status+'_ARCHIVED';
  summary=classifyHoneypotResearchCapture({request,rawText:raw,
   evidence:receipt,asOfUtc:received});
 }catch(e){
  error=String(e.message||e).slice(0,160);
  status='PROVIDER_FETCH_OR_ARCHIVE_ERROR';
  state.cooldown_until_utc=new Date(Date.now()+60*60000).toISOString();
 }
 state.updated_at_utc=now();
}
await writeFile(statePath,JSON.stringify(state,null,2)+'\n');
const report={schema:1,kind:'R29_HONEYPOT_INDICATIVE_RISK_CAPTURE_EVIDENCE',
 source_commit:commit,workflow_run_id:runId,request_path:file,
 captured_at_utc:now(),original_requested_at_utc:request.created_at_utc,
 status,provider:'HONEYPOT_IS',pair_identity:{chain:sample.chain,
  chain_id:sample.chain_id,contract:sample.contract,pool:sample.pool,
  pool_kind:sample.pool_kind},
 original_raw_receipt:receipt,assessment:summary,
 actual_provider_requests:status==='PROVIDER_BUDGET_DEFERRED'?0:1,
 note:'Third-party simulation alone cannot independently attest live sellability, provider quote timestamp, trusted issuer or permission to PAPER buy',
 third_party_only:true,orders_published:0,actual_client_fills:0,
 real_money_orders:0,security_issuer_authenticated:false,
 onchain_sale_executed:false,error};
const reportPath=root+'/honeypot-research-evidence.json';
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
await writeFile('research/risk/state/honeypot-latest.json',JSON.stringify({
 schema:1,kind:'R29_HONEYPOT_LATEST_RESEARCH_POINTER',as_of_utc:report.captured_at_utc,
 run_id:runId,report_path:reportPath,raw_path:receipt?.body_path??null,
 status,orders:0},null,2)+'\n');
console.log('R29_HONEYPOT_READ_ONLY_CAPTURE',JSON.stringify({
 status,report_path:reportPath,original_raw:receipt?.body_path??null,
 http_status:receipt?.http_status??null,assessed_status:summary?.status??null,
 requested_chain:sample.chain,orders:0}));
if(!['HTTP_200_RESEARCH','PROVIDER_BUDGET_DEFERRED'].includes(status))
 process.exitCode=1;
