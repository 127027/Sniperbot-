// D1-04: separate MARKET/PRICE observation cadence from the five paused
// GPT Dot reviews. A lightweight capture never spends a GPT review or creates
// a paper trade. Existing Cloud Dot2 runner remains the sole HTTP capture path.
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const LEVELS=[4,8,12,24];
export function planIndependentObservations({asOfUtc,priorCaptureAtUtc=null,
 reviewTarget=4,hotPoolCount=0,unresolvedPageCount=0,
 openPaperPositions=null,capturedPagesThisRun=0}={}){
 const now=ms(asOfUtc),prior=priorCaptureAtUtc===null?null:ms(priorCaptureAtUtc);
 if(now===null||(priorCaptureAtUtc!==null&&(prior===null||prior>now))
  ||!LEVELS.includes(reviewTarget)
  ||![hotPoolCount,unresolvedPageCount,capturedPagesThisRun]
    .every(x=>Number.isInteger(x)&&x>=0)
  ||(openPaperPositions!==null&&(!Number.isInteger(openPaperPositions)||openPaperPositions<0)))
   throw Error('INVALID_INDEPENDENT_MARKET_OBSERVATION_INPUT');
 // Positions (when independently supplied by an authenticated, read-only
 // client snapshot) need faster checks than ordinary market-wide discovery.
 // Unknown Windows positions MUST NOT be treated as zero.
 const interval=openPaperPositions>0?5:hotPoolCount>0?15:
   unresolvedPageCount>0?30:60;
 const due=prior===null||now-prior>=interval*60000;
 const nextDue=prior===null?asOfUtc:new Date(prior+interval*60000).toISOString();
 return {schema:1,kind:'R29_V19_DUAL_CADENCE_RESEARCH_ADVISORY',
  as_of_utc:asOfUtc,
  lightweight_capture:{suggested_interval_minutes:interval,
   next_due_utc:nextDue,due_for_new_capture:due,
   theoretical_windows_per_24h:1440/interval,
   captured_http_pages_in_this_run:capturedPagesThisRun,
   previous_capture_at_utc:priorCaptureAtUtc,
   needs_actual_external_capture_request:true,
   API_budget_and_provider_cooldown_override:false},
  full_gpt_review:{target_per_24h:reviewTarget,
   completed_reviews_inferred_from_http:0,
   execution_is_separate_and_must_be_authenticated:true},
  positions:{confirmed_open_positions_in_capture_process:openPaperPositions,
   count_unknown:openPaperPositions===null,
   monitored_here_without_client_data:false,
   independent_exit_observer_required:true},
  urgency:{hot_pool_candidates:hotPoolCount,
   unresolved_chain_pages:unresolvedPageCount},
  no_global_market_completeness_claim:true,
  market_quote_age_is_not_tradeable_price_proof:true,
  orders_authorized:0,actual_gpt_reviews_claimed:0};
}
