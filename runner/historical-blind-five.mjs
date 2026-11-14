// Five historical public-source cases: 45 simulated UTC days each.
// Labels and outcomes are intentionally withheld from runDailyBlindReplay.
// This tool NEVER fetches today's pages as historical data or initiates trades.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runDailyBlindReplay,scoreSealedReplay} from './historical-blind-replay.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
export function runPublicFiveReplay(){
 const manifest=JSON.parse(readFileSync(path.join(root,'fixtures','historical-public-five-cases-20261110.json'),'utf8'));
 if(manifest.schema!=='historical_public_five_case_manifest.v1'||manifest.cases.length!==5)
  throw Error('FIVE_CASE_MANIFEST_INVALID');
 const cases=manifest.cases.map(c=>{
  const {ground_truth_reserved_for_scoring:truth,replay_events,...blinded}=c;
  const r=runDailyBlindReplay({...blinded,events:replay_events,
   budget_test_usdc:5000,preferred_test_usdc:50});
  const assessment=scoreSealedReplay(r,truth);
  return {assessment,original_source_references:replay_events.map(e=>({
    source_kind:e.source_kind,original_published_at_utc:e.original_published_at_utc,
    source_url:e.source_url,historical_capture_verified:e.historical_capture_verified})),replay:r};
 });
 return {schema:'public_five_historical_blind_report.v1',
  research_date_utc:manifest.investigation_date_utc,
  mode:'STRICT_ASOF_ARCHIVE_ONLY',paper_only:true,actionable:false,
  inputs_from_confidential_workbook_republished:false,
  case_selection:'FIVE_HINDSIGHT_KNOWN_CASES_NOT_RANDOM_HOLDOUT',
  cases_evaluated:cases.length,simulated_days:cases.reduce((s,c)=>s+c.replay.total_days,0),
  historically_confirmed_timely_discoveries:0,
  historically_confirmed_paper_buy_fills:0,
  historically_confirmed_paper_exit_fills:0,
  untestable_case_count:cases.filter(c=>c.assessment.status.startsWith('UNTESTABLE')).length,
  conclusion:'NO_PREDICTIVE_PERFORMANCE_ESTABLISHED',
  limitations:['NO_ASOF_ARCHIVED_SOURCE_BODY','NO_COMPLETE_LAUNCH_AND_FAILURE_COHORT',
    'NO_2013_DOGECOIN_NATIVE_CHAIN_ADAPTER','NO_HISTORICAL_POOL_AND_EXIT_QUOTES',
    'NO_AUTHENTICATED_FIVE_ROLE_HISTORIC_MESSAGES','NO_REAL_EXTERNAL_PAPER_VALIDATOR'],
  cases};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=runPublicFiveReplay();
 if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(report,null,2)+'\n');
 else{
  process.stdout.write('HISTORICAL BLIND REPLAY (NOT predictive validation)\n'+
    'Scenarios: '+report.cases_evaluated+'; UTC days: '+report.simulated_days+
    '; untestable: '+report.untestable_case_count+'; confirmed buys: 0; confirmed exits: 0\n');
  for(const c of report.cases){
   process.stdout.write(c.assessment.scenario_id+': '+c.assessment.case_name+
    ' | admissible historical captures '+c.replay.admitted_historical_captures+
    ' | claimed published '+c.replay.earliest_retrospective_publication_claim_utc+
    ' | '+c.assessment.primary_blocker+'\n');
  }
 }
}
