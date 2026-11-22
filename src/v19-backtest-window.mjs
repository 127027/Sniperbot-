// R29 V1.9: one point-in-time input schedule: 5h warmup + 24h paper simulation.
// This is a time-gated REPLAY data view, not a second trading strategy.
import {classifyAsOfEvidence,asOfMillis} from './v19-asof-evidence.mjs';
import {buildAsOfLookback} from './v19-asof-lookback.mjs';

const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)
 &&Number.isFinite(Date.parse(x+'T00:00:00.000Z'))?Date.parse(x+'T00:00:00.000Z'):null;
const iso=x=>new Date(x).toISOString();
export function build29HourAsOfTimeline({date,snapshots=[],warmupHours=5,
 firstScanAtStart=false}={}){
 const start=day(date);
 if(start===null||!Array.isArray(snapshots)||!Number.isInteger(warmupHours)
    ||warmupHours<1||warmupHours>48||typeof firstScanAtStart!=='boolean')
    throw Error('INVALID_V19_WINDOW');
 const end=start+86400000,begin=start-warmupHours*3600000;
 const ticks=[];
 for(let i=0;i<warmupHours+24;i++){
   // Explicit opt-in for the immediate 00:00 decision, while retaining
   // legacy :35 diagnostics for existing unchanged benchmark comparisons.
   const tick=begin+i*3600000+
     (firstScanAtStart&&i===warmupHours?0:35*60000);
   const at=iso(tick);
   const lookback=buildAsOfLookback({snapshots,asOfUtc:at});
   // The trading gate has a separate 10-minute quote age limit. A historical
   // feature older than this limit remains useful, not EXECUTION_ELIGIBLE.
   let fresh=0,retro=0,oracle=0,notYetAvailable=0,invalid=0;
   for(const row of snapshots){
     const verdict=classifyAsOfEvidence(row,{asOfUtc:at});
     if(['PROVISIONAL_ASOF','SYNTHETIC_REGRESSION_ONLY'].includes(verdict.status)){
       const observed=asOfMillis(row.observed_at_utc);
       if(observed!==null&&tick-observed<=600000)fresh++;
     }else if(verdict.status==='RETROSPECTIVE_RESEARCH_ONLY')retro++;
     else if(verdict.status==='POST_EVENT_ONLY')oracle++;
     else if(verdict.reason==='EVENT_IN_FUTURE'||verdict.reason==='NOT_YET_AVAILABLE_AT_VIRTUAL_TIME')
       notYetAvailable++;
     else invalid++;
   }
   const warmup=tick<start;
   ticks.push({at_utc:at,phase:warmup?'WARMUP_RESEARCH_NO_TRADING':'PAPER_DECISION_WINDOW',
     past_only_history_observations:lookback.observation_count,
     past_only_markets:lookback.market_count,
     fresh_source_snapshots: fresh,
     retro_data_for_research_only:retro,
     oracle_labels_not_for_decisions:oracle,
     excluded_future_or_unavailable:notYetAvailable,
     invalid_source_rows:invalid,
     orders_authorized:0,actual_gpt_runs:0});
 }
 return {schema:1,kind:'R29_V19_29H_ASOF_INPUT_TIMELINE',
   date,warmup_hours:warmupHours,decision_hours:24,
   first_decision_opportunity_utc:firstScanAtStart?iso(start):iso(start+35*60000),
   first_decision_wait_minutes:firstScanAtStart?0:35,
   first_scan_at_start_enabled:firstScanAtStart,
   begin_utc:iso(begin),decision_start_utc:iso(start),end_utc:iso(end),
   hourly_ticks:ticks.length,ticks,
   requires_separate_dot4_replay:true,
   no_future_inputs_promoted:true,orders_written:0,
   disclaimer:'Replay timeline labels do not imply historical GPT tasks or actual provider availability proof.'};
}
