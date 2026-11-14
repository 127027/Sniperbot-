// R21 deterministic, winner-neutral historical 62-day window planning.
// This schedules dates only. It does NOT claim a single archived source exists.
// Nothing here is authorized to read outcomes/PEPE winner database.
const day=86400000;
const iso=ms=>new Date(ms).toISOString().replace('.000Z','Z');
export function planNeutralWindows({
 start='2013-01-01T00:00:00Z',
 through='2026-11-14T23:59:59Z',
 daysPerCase=62,
 minimumCases=50
}={}){
 const s=Date.parse(start),end=Date.parse(through);
 if(!Number.isFinite(s)||!Number.isFinite(end)||s>=end||
    !Number.isInteger(daysPerCase)||daysPerCase<2||
    !Number.isInteger(minimumCases)||minimumCases<1)
  throw Error('R21_BAD_WINDOW_PLAN_CONFIG');
 if(!start.endsWith('T00:00:00Z')||!through.endsWith('T23:59:59Z'))
  throw Error('R21_ONLY_FULL_UTC_CALENDAR_DAYS');
 const windows=[],timeLength=daysPerCase*day;
 for(let cursor=s;cursor+timeLength-1000<=end;cursor+=timeLength){
  const i=windows.length,case_id='case_'+String(i+1).padStart(4,'0');
  windows.push({
   case_id,window:{start:iso(cursor),end:iso(cursor+timeLength-1000)},
   split:'DEVELOPMENT',mode:'BLIND',enabled:false,
   dataset_path:'PRIVATE/asof/'+case_id+'/dataset.private.json',
   labels_path:'PRIVATE/evaluation/'+case_id+'/outcomes.private.json',
   status:'PENDING_INDEPENDENT_ASOF_SOURCES_AND_ISOLATED_AGENTS'
  });
 }
 const dev=Math.floor(windows.length*.6),val=Math.floor(windows.length*.2);
 for(const [i,c]of windows.entries())
  c.split=i<dev?'DEVELOPMENT':i<dev+val?'VALIDATION':'HOLDOUT';
 if(windows.length<minimumCases)throw Error('R21_NOT_ENOUGH_FULL_NEUTRAL_WINDOWS');
 return {
  schema:'r21_case_catalog.v1',target_case_count:minimumCases,
  declared_window_count:windows.length,
  first_possible_window:windows[0]?.window||null,
  last_possible_window:windows.at(-1)?.window||null,
  period_start:start,period_end:through,days_per_case:daysPerCase,
  selection:'DATE_ONLY_DETERMINISTIC_NOT_KNOWN_WINNERS',
  data_readiness:'NO_INDEPENDENTLY_ATTESTED_COHORTS_STAGED',
  actual_prepared_cases:0,actual_completed_cases:0,
  notes:[
   'The registered historical windows are real calendar ranges, NOT 80 collected datasets.',
   'Every case is disabled until independent as-of evidence, neutral multi-coin cohort and clean agent adapter exist.',
   'Known-winner labels may be loaded only after the final historical agent decision is sealed.',
   'A 62-day calendar window may include many coins or none; winners are not chosen in advance.'
  ],
  cases:windows
 };
}
