// R29 V1.9: validated inputs for ONE manually triggered history-replay job.
// Not a second strategy, no automation trigger, no orders, and no winner manifest.
const BRANCH='refs/heads/codex/r29-cleanroom-paper-20261121';
export function validateManualBacktestRequest({
  date,inputPath='',ref=BRANCH
}={}){
 if(ref!==BRANCH)throw Error('CLEANROOM_BRANCH_REQUIRED');
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)){
   throw Error('INVALID_BACKTEST_DATE');
 }
 const ms=Date.parse(date+'T00:00:00.000Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==date){
   throw Error('NONEXISTENT_BACKTEST_DATE');
 }
 if(typeof inputPath!=='string')throw Error('INVALID_MANIFEST_PATH');
 const normalized=inputPath.trim();
 if(normalized && !/^research\/backtest-inputs\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.json$/.test(normalized)){
   throw Error('MANIFEST_MUST_BE_STORED_UNDER_RESEARCH_BACKTEST_INPUTS');
 }
 return {schema:1,kind:'R29_V19_MANUAL_BACKTEST_REQUEST',
   date,source_branch:BRANCH,input_path:normalized||null,
   historical_warmup_hours:5,decision_hours:24,
   cli_args:['--date',date,'--first-scan-at-start',
     ...(normalized?['--input',normalized]:[])],
   first_scan_at_start_enabled:true,
   first_scan_utc:date+'T00:00:00.000Z',
   permitted_market_data_sources:'POINT_IN_TIME_GATE_ONLY',
   winner_reference_oracle_input_allowed:false,
   manual_trigger_only:true,automations_activated:0,
   paper_order_publication_allowed:false,
   existing_paper_account_mutation_allowed:false};
}
