// Six bounded read-only public endpoint controls, using two already
// neutrally discovered Solana mints/pools. Neither winner oracle nor trades.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {V23_CONTROL_REQUESTS,auditV23EndpointControl}
 from '../src/v23-neutral-provider-endpoint-control.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';
const branch='refs/heads/codex/r29-cleanroom-paper-20261121';
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!==branch||!/^[0-9a-f]{40}$/.test(commit||'')
 ||!/^[0-9]+$/.test(run||''))throw Error('CONTROL_ONLY_EXPLICIT_GITHUB');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const files=changed.filter(x=>/^research\/neutral-endpoint-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||files.length!==1)
 throw Error('REQUIRE_EXACTLY_ONE_EXPLICIT_RESEARCH_REQUEST');
const request=JSON.parse(await readFile(files[0],'utf8'));
if(request.schema!==1||request.kind!=='R29_V23_NEUTRAL_TWO_POOL_SIX_PUBLIC_ENDPOINT_CONTROLS'
 ||request.max_public_get_requests!==6||request.no_winner_oracle_seed!==true
 ||request.no_historical_asof_promotion!==true||request.no_trades_or_wallet_changes!==true
 ||request.read_only!==true)throw Error('INVALID_NEUTRAL_ENDPOINT_REQUEST');
const protectedFiles=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(protectedFiles);
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir='probe-artifacts/v23-neutral-control-'+run;
await mkdir(dir,{recursive:true});
const audits=[];
for(const query of V23_CONTROL_REQUESTS){
 let status=0,raw='';
 try{
  const res=await fetch(query.url,{
   headers:{accept:'application/json','user-agent':'r29-research-only-v23/1.0'},
   signal:AbortSignal.timeout(15000)});
  status=res.status;
  const bytes=Buffer.from(await res.arrayBuffer());
  if(bytes.length>3_000_000)throw Error('RESPONSE_TOO_LARGE');
  raw=bytes.toString('utf8');
 }catch(e){
  status=0;raw=JSON.stringify({local_source_gap:true,
   reason:e?.name==='TimeoutError'?'TIMEOUT':'PUBLIC_ENDPOINT_UNAVAILABLE'});
 }
 const receipt={method:'GET',endpoint:query.url,status,
  captured_at_utc:new Date().toISOString(),raw_text:raw,sha256:sha(raw)};
 const result=auditV23EndpointControl({query,receipt});
 await writeFile(dir+'/probe-'+query.id+'.raw.json',raw,{flag:'wx'});
 audits.push(result);
 console.log('R29_V23_ENDPOINT_CONTROL_RESULT',JSON.stringify(result));
 if(query.id!==5)await new Promise(resolve=>setTimeout(resolve,1000));
}
const summary={schema:1,kind:'R29_V23_NEUTRAL_ENDPOINT_SOURCE_COMPARISON',
 commit,run_id:run,
 requests:audits.length,
 http200:audits.filter(x=>x.response_status===200).length,
 matched_exact_token_pool_associations:audits.filter(x=>x.matched_expected_token_and_pool).length,
 results:audits,
 source_data_captured_in_november_not_october:true,
 original_historical_provider_delivery_proven:false,
 tradeable_october_50_usdc_quotes_proven:false,
 sellability_historical_proven:false,actual_gpt_reviews:0,
 paper_orders:0,real_orders:0,existing_wallet_modified:false};
await writeFile(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(protectedFiles));
console.log('R29_V23_NEUTRAL_ENDPOINT_CONTROL_COMPLETE',JSON.stringify({
 requests:summary.requests,http200:summary.http200,
 exact_identity_matches:summary.matched_exact_token_pool_associations,
 paper_orders:0,original_historical_quotes:0,
 report:dir+'/summary.json'}));
