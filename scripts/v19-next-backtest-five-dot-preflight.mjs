// R29: explicit, GitHub-only, READ-ONLY evidence preflight for next user
// requested five-dot OCT12 24h diagnostic. NO backtest is run here.
// Never claim synthetic tests, source Git bytes, or Nov23 forensic traces
// independently prove the historical GPT Dots / original Oct12 quotes.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {auditLiveFiveDotJournalInventory,LIVE_DOT_IDS,validRoleJournalPath,isPendingDot2ForensicPointer}
 from '../src/v19-dot-journal-inventory.mjs';
import {auditFiveDotNextBacktestForensicFreshness}
 from '../src/v19-next-backtest-five-dot-freshness.mjs';
import {inspectR29OriginalAcceptanceReleaseGate}
 from '../src/v19-original-acceptance-release-gate.mjs';
import {build29HourAsOfTimeline}
 from '../src/v19-backtest-window.mjs';

const branch='refs/heads/codex/r29-cleanroom-paper-20261121';
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!==branch
 ||!/^[a-f0-9]{40}$/.test(commit??'')
 ||!/^[0-9]{1,20}$/.test(run??''))
 throw Error('R29_ONLY_ONE_USER_REQUEST_CLEANROOM_PREFLIGHT_ALLOWED');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const requestFiles=changed.filter(x=>
 /^research\/next-backtest-preflight-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||requestFiles.length!==1)
 throw Error('NEXT_BACKTEST_PREFLIGHT_REQUIRES_ONE_EXPLICIT_REQUEST_ONLY');
const reqBytes=await readFile(requestFiles[0]);
const req=JSON.parse(reqBytes.toString('utf8'));
if(req?.schema!==1||req.kind!=='R29_V19_FIVE_DOT_READONLY_NEXT_BACKTEST_PREFLIGHT'
 ||req.date!=='2026-10-12'||req.warmup_from_utc!=='2026-10-11T19:00:00.000Z'
 ||req.scan_from_utc!=='2026-10-12T00:00:00.000Z'
 ||req.scan_until_exclusive_utc!=='2026-10-13T00:00:00.000Z'
 ||req.expected_scans!==24||req.read_only!==true
 ||req.no_order_publication!==true||req.no_backtest_execution!==true
 ||req.no_dot_activation!==true||req.no_client_mutation!==true
 ||req.do_not_promote_postevent_evidence!==true)
 throw Error('INVALID_OR_UNSAFE_NEXT_BACKTEST_PREFLIGHT_REQUEST');
const sha=x=>createHash('sha256').update(x).digest('hex');
const hashBlob=x=>{const bytes=Buffer.from(x,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')};
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const now=new Date().toISOString();
const [originalCatalog,taskRegister,holdout,marketMemory,feedPointer]=await Promise.all([
 readFile('docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md','utf8'),
 read('research/audits/2026-11-22/r29-v19-offline-61-task-reconciliation.json'),
 read('research/state/prospective-holdout-freeze.json'),
 read('research/state/market-memory.json'),read('research/feeds/latest.json')
]);
const original=inspectR29OriginalAcceptanceReleaseGate({
 originalCatalog,taskRegister,holdout,currentMarketMemory:marketMemory,asOfUtc:now});
const latestByRole={},rawJournalsByPath={};
for(const role of LIVE_DOT_IDS){
 const pointer=await read('research/latest/'+role+'.json');
 latestByRole[role]=pointer;
 const path=pointer?.journal_path;
 if(validRoleJournalPath(role,path)){
  try{rawJournalsByPath[path]=await readFile(path,'utf8')}
  catch(e){if(e.code!=='ENOENT')throw e}
 }
 if(role==='dot-2'&&isPendingDot2ForensicPointer(pointer)){
  try{rawJournalsByPath[pointer.forensic_audit_path]=
   await readFile(pointer.forensic_audit_path,'utf8')}
  catch(e){if(e.code!=='ENOENT')throw e}
 }
}
const inventory=auditLiveFiveDotJournalInventory({
 latestByRole,rawJournalsByPath,feedPointer,asOfUtc:now});
const days=['2026-11-22','2026-11-23'];
const tracked=execFileSync('git',['ls-files','--',
 ...days.map(d=>'research/audits/dot-traces/'+d+'/')],{encoding:'utf8'})
 .split(/\r?\n/).filter(p=>
  /^research\/audits\/dot-traces\/2026-11-2[23]\/[A-Za-z0-9_-]{8,120}\/dot-[1-5]-(?:tempo|discovery|risk|strategy|control)\.json$/.test(p));
const rawForensicByPath={};
for(const path of tracked){
 try{rawForensicByPath[path]=await readFile(path,'utf8')}
 catch(e){if(e.code!=='ENOENT')throw e}
}
const forensic=auditFiveDotNextBacktestForensicFreshness({
 latestByRole,rawForensicByPath,feedPointer,asOfUtc:now});
const feedRun=feedPointer.evidence_path?.match(
 /^research\/feeds\/2026-11-23\/(\d{8,20})\/evidence\.json$/)?.[1]??null;
let capturedProof=null;
try{
 const evidenceRaw=await readFile(feedPointer.evidence_path,'utf8');
 const evidence=JSON.parse(evidenceRaw);
 const sameRun=evidence.kind==='DOT2_PUBLIC_CAPTURE_EVIDENCE'
   &&evidence.request_path===feedPointer.request_path
   &&evidence.captured_completed_at_utc===feedPointer.captured_at_utc;
 capturedProof={feed_run_id:feedRun,same_run_request_and_utc_match:sameRun,
  feed_evidence_git_blob_sha:hashBlob(evidenceRaw),
  feed_evidence_raw_sha256:sha(evidenceRaw),
  provider_http_captured_by_github_actions:true,
  original_gpt_review_of_that_capture_independently_verified:false};
}catch(e){
 if(e.code!=='ENOENT')throw e;
 capturedProof={feed_run_id:feedRun,same_run_request_and_utc_match:false,
  source_evidence_missing:true};
}
const timeline=build29HourAsOfTimeline({
 date:'2026-10-12',warmupHours:5,firstScanAtStart:true,snapshots:[]});
if(timeline.hourly_ticks!==29||timeline.decision_hours!==24
 ||timeline.first_decision_opportunity_utc!=='2026-10-12T00:00:00.000Z'
 ||timeline.ticks.filter(x=>x.phase==='PAPER_DECISION_WINDOW').length!==24
 ||timeline.ticks.at(-1).at_utc!=='2026-10-12T23:00:00.000Z'
 ||timeline.ticks.some(x=>x.orders_authorized!==0||x.actual_gpt_runs!==0))
 throw Error('24_HOUR_TIMELINE_OR_ISOLATION_REGRESSION');
const output={schema:1,kind:'R29_V19_NEXT_FIVE_DOT_BACKTEST_SOURCE_PREFLIGHT',
 as_of_utc:now,source_commit:commit,branch,
 request_path:requestFiles[0],request_sha256:sha(reqBytes),
 original_acceptance:original,
 current_five_dot_journal_inventory:inventory,
 freshest_forensic_source_audit:forensic,
 current_latest_http_capture:capturedProof,
 diagnostic_29h_clock_isolation_test:{
  warmup_ticks:5,paper_hourly_ticks:24,first:'2026-10-12T00:00:00.000Z',
  last:'2026-10-12T23:00:00.000Z',
  correct_first_scan_cadence:true,
  source_inputs_supplied_in_this_preflight:0,
  this_is_not_an_october_market_replay:true,
  this_is_not_a_five_gpt_dot_execution:true},
 can_request_separate_isolated_24_scan_software_diagnostic:true,
 enough_contemporaneous_original_market_inputs_for_meaningful_october_performance:false,
 all_five_current_independently_authenticated_gpt_reviews:false,
 original_qa04_five_dot_backtest_ready:original.release_authorized,
 original_qa04_blockers:original.blockers.map(x=>x.gate),
 no_historical_winner_oracle_read:true,
 no_historical_buy_sell_simulated:true,
 no_current_source_promoted_to_october:true,
 no_dot_activated:true,no_local_paper_or_wallet_changed:true,
 no_orders_written:true};
await mkdir('probe-artifacts',{recursive:true});
const prefix='probe-artifacts/v19-next-five-dot-preflight-'+run;
await writeFile(prefix+'.json',JSON.stringify(output,null,2)+'\n',{flag:'wx'});
const lines=[
 '# R29 – Nächster 24-Stunden-Backtest: Fünf-Dot-Originalquellen-Preflight',
 '',
 'Stand: '+now,
 'Branch: '+branch,
 'Originalabnahme: **'+original.strict_fully_accepted_pct+
 '%** ('+original.original_status_counts.PASS+' PASS / '+
 original.original_status_counts.PARTIAL+' PARTIAL / '+
 original.original_status_counts.OPEN+' OPEN)',
 'Original-QA04 freigegeben: **'+(original.release_authorized?'JA':'NEIN')+'**',
 '',
 '24 genau stündliche technische Entscheidungen 00:00–23:00 UTC: **JA (nur Uhr/Isolation geprüft)**',
 'Diese Aufgabe hat **keinen Backtest** gestartet, keine GPT-Dots aktiviert',
 'und keine Oktober-Handelsdaten aus heutigen Marktdaten erfunden.',
 '',
 '| Dot | Letzter offizieller Verweis | Neuster heute nachprüfbarer Git-Forensikeintrag | Offene Übergabebefunde |',
 '|---|---|---|---|',
 ...forensic.roles.map(x=>'| '+x.role+' | '+
  (x.latest_pointer_at_utc??'FEHLT')+' | '+
  (x.freshest_forensic_trace?.at_utc??'FEHLT')+' | '+
  (x.issues.join(', ')||'Git-Bytes konsistent, GPT extern UNBELEGT')+' |'),
 '',
 'Neuester veröffentlichter Dot2-Quellfeed: '+(feedRun??'FEHLT'),
 'HTTP-Quellfeed-Anfrage und UTC passen zusammen: '+
 (capturedProof?.same_run_request_and_utc_match?'JA':'NICHT BELEGT'),
 'Bei nachgereichtem Feed ist eine neue GPT-Auswertung **nicht** automatisch geschehen.',
 '',
 '## Fehlende Originalfreigaben',
 ...original.blockers.map(x=>'- '+x.gate+' – '+x.reason),
 '',
 '## Nächste echten Schritte',
 '- Dot3/Dot4 offizielle latest-Verweise anhand eigener neuen Journale nachführen, ohne GPT-Freigabe zu fälschen',
 '- Dot2 neue Capture-Quellen gesondert vom bereits gelaufenen GPT-Wake sauber reconciliieren',
 '- Original-Oktober 6-Chain-Quoten/Issuer/Sellability/50-USDC-Routen nachweisen',
 '- Echte fünf-GPT-Journals mit unabhängigem Lauf- und Windows-Paper-Receipt koppeln',
 '- Vordefinierten Holdout erst nach 25.11.2026 06:54 UTC auswerten; bis dahin keinen Original-QA04-PASS melden',
 '',
 'Alle roten Original-Gates bleiben **fail closed**. Die stündliche Uhr ist technisch startfähig, aber die vollständige historisch handelbare Datenbasis nicht.'
 ];
await writeFile(prefix+'.md',lines.join('\n')+'\n',{flag:'wx'});
console.log('R29_NEXT_FIVE_DOT_PREFLIGHT_COMPLETED',JSON.stringify({
 run_id:run,code_clock_scans:24,roles:forensic.role_count,
 valid_role_traces:forensic.roles_with_valid_trace,
 fresh_role_traces:forensic.roles_with_recent_trace,
 stale_latest_role_pointers:forensic.role_latest_pointers_behind_newer_traces,
 journal_inventory_issues:inventory.issue_count,
 latest_source_run:feedRun,latest_source_same_run_check:
  capturedProof?.same_run_request_and_utc_match,
 original_gate:original.readiness,original_pass:original.original_status_counts.PASS,
 original_partial:original.original_status_counts.PARTIAL,
 original_open:original.original_status_counts.OPEN,
 release_authorized:false,backtest_executed:false,orders:0}));
