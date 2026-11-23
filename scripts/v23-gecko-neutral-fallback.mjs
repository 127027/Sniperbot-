// Four user-approved GeckoTerminal keyless GET controls. No trading.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {V23_GECKO_FALLBACK_REQUESTS,auditV23GeckoFallback}
 from '../src/v23-gecko-neutral-fallback.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';
const branch='refs/heads/codex/r29-cleanroom-paper-20261121';
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!==branch||!/^[0-9a-f]{40}$/.test(commit||'')
 ||!/^\d+$/.test(run||''))throw Error('NEEDS_EXPLICIT_CLEANROOM_GITHUB_REQUEST');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const requested=changed.filter(x=>/^research\/gecko-fallback-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||requested.length!==1)throw Error('EXPECTED_ONE_GUARDED_REQUEST');
const r=JSON.parse(await readFile(requested[0],'utf8'));
if(r.schema!==1||r.kind!=='R29_V23_EXPLICIT_FOUR_PUBLIC_GECKO_NEUTRAL_CONTROLS'
 ||r.max_public_http_get!==4||r.no_winner_seed!==true||r.research_only!==true
 ||r.no_paper_or_real_orders!==true||r.no_original_asof_claim!==true)
 throw Error('UNAUTHORIZED_GECKO_NEUTRAL_CONTROL');
const protectedFiles=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(protectedFiles);
const sha=x=>createHash('sha256').update(x).digest('hex');
const folder='probe-artifacts/v23-gecko-neutral-'+run;
await mkdir(folder,{recursive:true});
const results=[];
for(const q of V23_GECKO_FALLBACK_REQUESTS){
 let http_status=0,raw_text='';
 try{
  const res=await fetch(q.url,{
   headers:{accept:'application/json','user-agent':'r29-neutral-research-only/1.0'},
   signal:AbortSignal.timeout(18000)});
  http_status=res.status;
  const buff=Buffer.from(await res.arrayBuffer());
  if(buff.length>4_000_000)throw Error('PUBLIC_RESPONSE_TOO_LARGE');
  raw_text=buff.toString('utf8');
 }catch(e){http_status=0;raw_text=JSON.stringify({
  research_network_error:e?.name==='TimeoutError'?'TIMEOUT':'PUBLIC_ENDPOINT_UNAVAILABLE'});}
 const receipt={method:'GET',url:q.url,http_status,raw_text,
  raw_sha256:sha(raw_text),captured_at_utc:new Date().toISOString()};
 await writeFile(folder+'/gecko-'+q.index+'.raw.json',raw_text,{flag:'wx'});
 const audit=auditV23GeckoFallback({request:q,receipt});
 results.push(audit);
 console.log('R29_V23_GECKO_SOURCE_EVIDENCE',JSON.stringify(audit));
 if(q.index<3)await new Promise(resolve=>setTimeout(resolve,1800));
}
const summary={kind:'R29_V23_NEUTRAL_GECKO_FALLBACK_POSTEVENT_RESEARCH',
 source_commit:commit,github_run_id:run,
 public_http_attempts:results.length,
 public_http200:results.filter(r=>r.http_status===200).length,
 current_exact_mint_and_pool_confirmations:results.filter(r=>
  r.exact_pool_and_mint_currently_confirmed).length,
 results,original_october_provider_delivery_proven:false,
 historical_sellability_or_50_usdc_quotes_proven:false,
 known_65_winners_not_used_for_scanner:true,
 no_order_signals_written:true,original_QA04_gate_not_promoted:true};
await writeFile(folder+'/audit.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(protectedFiles));
console.log('R29_V23_GECKO_FALLBACK_DONE',JSON.stringify({
 public_http:4,http200:summary.public_http200,
 matched:summary.current_exact_mint_and_pool_confirmations,
 actual_historical_trades:0,orders:0,
 report:folder+'/audit.json'}));
