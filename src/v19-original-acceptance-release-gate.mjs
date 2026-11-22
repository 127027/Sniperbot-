// R29 formal pre-backtest stop/go: first 60 NON-BACKTEST tasks must PASS.
// QA-04 is the FINAL backtest, so cannot be a prerequisite of itself.
// No outbound HTTP, no order/fill, no historical replay. All inputs are
// from read-only original docs/state. Gate is deliberately FAIL-CLOSED
// on externally unverified issuer/sellability/Windows or October sources.
import {validateFrozenHoldout} from './v19-prospective-holdout-freeze.mjs';

const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const ids=s=>[...s.matchAll(/^\| ((?:SYS|D[1-5]|QA)-\d{2})\s*\|/gm)].map(m=>m[1]);
const count=(a,v)=>a.filter(x=>x.status===v).length;

export function inspectR29OriginalAcceptanceReleaseGate({
 originalCatalog,taskRegister,holdout,
 currentMarketMemory,asOfUtc,
 independentWindowsProof=null
}={}){
 const now=ms(asOfUtc);
 if(now===null||typeof originalCatalog!=='string'
  ||taskRegister?.kind!=='R29_V19_STRICT_OFFLINE_RECONCILED_61_TASK_REGISTER'
  ||!Array.isArray(taskRegister.tasks)
  ||!currentMarketMemory||typeof currentMarketMemory.pools!=='object'
  ||!holdout)
  throw Error('INVALID_R29_RELEASE_GATE_INPUT');
 validateFrozenHoldout(holdout);
 const original=ids(originalCatalog);
 const registered=taskRegister.tasks.map(x=>x.id);
 if(original.length!==61||registered.length!==61
  ||new Set(original).size!==61||new Set(registered).size!==61
  ||original.some(x=>!registered.includes(x))
  ||taskRegister.tasks.some(x=>!['PASS','PARTIAL','OPEN'].includes(x.status)))
  throw Error('ORIGINAL_61_TASKS_CANNOT_BE_RECONCILED');
 const status={
  PASS:count(taskRegister.tasks,'PASS'),
  PARTIAL:count(taskRegister.tasks,'PARTIAL'),
  OPEN:count(taskRegister.tasks,'OPEN')
 };
 if(JSON.stringify(status)!==JSON.stringify(taskRegister.status_counts))
  throw Error('REPORTED_ACCEPTANCE_STATUS_NOT_EQUAL_TO_ORIGINAL_61');
 const nonBacktest=taskRegister.tasks.filter(t=>t.id!=='QA-04');
 const backtestTask=taskRegister.tasks.find(t=>t.id==='QA-04');
 if(nonBacktest.length!==60||!backtestTask)
  throw Error('QA04_FINAL_BACKTEST_TASK_REQUIRED_IN_ORIGINAL_61');
 const acceptedNonBacktest=nonBacktest.filter(t=>t.status==='PASS').length;
 const blockers=[];
 if(acceptedNonBacktest!==60)
  blockers.push({gate:'NON_BACKTEST_ORIGINAL_TASK_ACCEPTANCE',
   reason:'ALL_60_NON_BACKTEST_ORIGINAL_CRITERIA_NOT_PASS',
   outstanding_task_ids:nonBacktest.filter(t=>t.status!=='PASS')
     .map(t=>t.id)});
 const holdoutEnd=ms(holdout.holdout_end_utc);
 const holdoutMature=now>=holdoutEnd;
 if(!holdoutMature)blockers.push({gate:'PROSPECTIVE_HOLDOUT',
  reason:'PRECOMMITTED_HOLDOUT_WINDOW_NOT_YET_ELAPSED',
  not_before_utc:holdout.holdout_end_utc});
 // A forged boolean in a JSON manifest NEVER provides these trust anchors.
 // Our currently available verifiers only prove Git bytes and modeled
 // sellability; neither proves upstream quote-age, on-chain solvency,
 // or trusted end-to-end Windows paper receipts.
 blockers.push({gate:'ORIGINAL_OCTOBER_MARKET_POPULATION',
  reason:'COMPLETE_NEUTRAL_OCTOBER_ASOF_SOURCES_NOT_INDEPENDENTLY_VERIFIED'});
 blockers.push({gate:'PROSPECTIVE_HOLDOUT_OUTCOMES',
  reason:'COMPLETE_INDEPENDENT_MATURE_POSITIVE_AND_NEGATIVE_LABELS_NOT_VERIFIED'});
 blockers.push({gate:'DOT3_INDEPENDENT_ISSUER_AND_QUOTE',
  reason:'UPSTREAM_ISSUER_AND_QUOTE_TIME_ATTESTATION_NOT_AUTHENTICATED'});
 blockers.push({gate:'DOT3_CHAIN_SELLABILITY',
  reason:'EXACT_POOL_ONCHAIN_SELL_ROUTE_TAX_AND_BLACKLIST_NOT_AUTHENTICATED'});
 blockers.push({gate:'FIVE_DOT_GPT_JOURNALS',
  reason:'FIVE_ROLE_GITHUB_ATTESTED_REVIEWS_NOT_VERIFIED'});
 let local=null;
 if(independentWindowsProof!==null){
  // The optional local proof is still a SUPPLIED snapshot rather than
  // remotely authenticated Windows evidence. It cannot clear this gate.
  local=independentWindowsProof;
  if(local.kind!=='R29_V19_READ_ONLY_SUPPLIED_LOCAL_PAPER_PROOF')
   throw Error('INVALID_LOCAL_CLIENT_PROOF_KIND');
 }
 blockers.push({gate:'WINDOWS_CLIENT_END_TO_END',
  reason:local?.status==='LOCAL_PAPER_STATE_ACCOUNTING_CONSISTENT'
   ?'SUPPLIED_FILE_CONSISTENT_BUT_WINDOWS_ORIGIN_AND_GITHUB_FILL_NOT_VERIFIED'
   :'NO_INDEPENDENT_WINDOWS_PAPER_ORIGINAL_RECEIPTS'});
 const poolCount=Object.keys(currentMarketMemory.pools).length;
 if(poolCount<1)blockers.push({gate:'CURRENT_MARKET_MEMORY',
  reason:'NO_RESEARCH_POOLS_CAPTURED'});
 return {schema:1,kind:'R29_V19_ORIGINAL_ACCEPTANCE_PREBACKTEST_GATE',
  as_of_utc:asOfUtc,mode:'PAPER_RESEARCH_ONLY',branch:taskRegister.branch,
  original_task_count:61,
  non_backtest_original_task_count:60,
  actual_non_backtest_pass_count:acceptedNonBacktest,
  strict_non_backtest_fully_accepted_pct:Math.round(acceptedNonBacktest/60*10000)/100,
  final_qa04_backtest_status:backtestTask.status,
  original_status_counts:status,
  strict_fully_accepted_pct:Math.round(status.PASS/61*10000)/100,
  technical_touched_pct:Math.round((status.PASS+status.PARTIAL)/61*10000)/100,
  persisted_pool_count:poolCount,
  all_nonbacktest_original_acceptance_items_passed:acceptedNonBacktest===60,
  precommitted_holdout_window_elapsed:holdoutMature,
  independently_authenticated_historical_market:false,
  independent_risk_and_sellability_proven:false,
  locally_supplied_paper_state_consistent:local?.status==='LOCAL_PAPER_STATE_ACCOUNTING_CONSISTENT',
  windows_origin_and_external_client_receipts_verified:false,
  genuine_five_dot_gpt_journals_verified:false,
  readiness:'NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE',
  release_authorized:false,
  allow_backtest_run:false,
  client_state_read_or_written:false,
  live_trade_authorized:false,orders_published:0,
  blockers,
  source_of_truth:'60 non-backtest original acceptance tasks plus independent authenticated source/position evidence; QA-04 is a final Backtest check, never a prerequisite of itself'};
}
