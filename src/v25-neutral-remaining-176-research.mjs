// R29 V2.5 - deterministic, research-only 176-mint recovery after the
// two completed historical neutral HOURS (02:00, 18:00). This is a
// NOVEMBER post-event provider lookup, NOT an October as-of scanner input.
// No winner names/labels, buys, executable quotes or GPT work enter here.
import {planV24GeckoHourlySlice} from './v24-gecko-neutral-hourly-queue.mjs';

export const V25_DONE_HOURS=Object.freeze([2,18]);
export const V25_NEUTRAL_REMAINING_HOURS=Object.freeze(
 Array.from({length:24},(_,i)=>i).filter(h=>!V25_DONE_HOURS.includes(h)));
export const V25_NEUTRAL_REMAINING_MINTS=176;

export function planV25NeutralRemaining176({retrospective}={}){
 if(retrospective?.kind!=='R29_V19_POSTRUN_RETROSPECTIVE_NEUTRAL_24_HOURS'
  ||retrospective?.never_eligible_to_seed_historical_discovery!==true
  ||retrospective?.never_eligible_for_entry_or_exit_quotes!==true
  ||retrospective?.original_provider_delivered_during_october_independently_verified!==false
  ||retrospective?.distinct_sample_mints!==192
  ||retrospective?.sampled_mint_occurrences!==192)
  throw Error('V25_FORBID_NON_NEUTRAL_ORIGINAL_OCTOBER_REPLAY');
 const requestRows=V25_NEUTRAL_REMAINING_HOURS.flatMap(hour=>
  planV24GeckoHourlySlice({retrospective,hour}).requests);
 if(requestRows.length!==V25_NEUTRAL_REMAINING_MINTS
  ||new Set(requestRows.map(x=>x.mint)).size!==requestRows.length
  ||requestRows.some(q=>V25_DONE_HOURS.includes(q.sample_hour_index))
  ||requestRows.some(q=>q.source_class!=='POST_EVENT_NEUTRAL_RESEARCH_ONLY'
    ||q.no_historical_knowledge_promotion!==true))
  throw Error('V25_NEUTRAL_176_UNIVERSE_INVARIANT_FAILURE');
 const ids=new Set(requestRows.map(q=>q.sample_hour_index+':'+q.row_index));
 if(ids.size!==176)throw Error('V25_DUPLICATE_HOUR_ROW');
 return {schema:1,kind:'R29_V25_POSTRUN_176_NEUTRAL_GECKO_QUEUE',
  original_neutral_population_mints:192,previously_recovered_mints:16,
  newly_to_research:176,previously_recovered_hours:[...V25_DONE_HOURS],
  hour_indices:[...V25_NEUTRAL_REMAINING_HOURS],
  requests:requestRows,source_provider:'GECKOTERMINAL_PUBLIC_KEYLESS',
  source_capture_not_historically_available_as_of_october:true,
  no_winner_reference_seed:true,no_wallet_or_order_writes:true,
  no_gpt_reviews:true,historical_sellability_not_proven:true,
  historical_quote_not_proven:true};
}

// Reconciliation must never transform HTTP errors or no provider result into
// "not historically existent", and it must report unattempted rows explicitly.
// The caller supplies only V24 audited results, never raw winner-list labels.
export function reconcileV25NeutralResearch({plan,results=[]}={}){
 if(plan?.kind!=='R29_V25_POSTRUN_176_NEUTRAL_GECKO_QUEUE'
  ||plan.newly_to_research!==176
  ||!Array.isArray(plan.requests)||plan.requests.length!==176
  ||!Array.isArray(results)||results.length>176)
  throw Error('INVALID_V25_NEUTRAL_RESEARCH_RECONCILIATION');
 const expected=new Map(plan.requests.map((q,i)=>[q.sample_hour_index+':'+q.row_index,{q,i}]));
 const seen=new Set();
 let responses=0,successes=0,providerRateLimit=0,empty=0,errors=0,confirmed=0,pools=0;
 const statuses=[];
 for(const x of results){
  const key=x?.historical_hour_index+':'+x?.row_index;
  const orig=expected.get(key);
  if(!orig||seen.has(key)||orig.q.mint!==x.mint
    ||x.historical_provider_delivery_proven!==false
    ||x.trade_authorized!==false||!Array.isArray(x.return_pools)
    ||x.return_pools.some(p=>p.mint!==x.mint
      ||p.original_october_discovery_proven!==false
      ||p.trade_authorized!==false))
    throw Error('V25_UNTRUSTED_OR_DUPLICATE_RESEARCH_ROW');
  seen.add(key);
  if(x.http_status!==null&&x.http_status!==undefined){
   responses++;
   if(x.http_status===200)successes++;
   if(x.http_status===429||x.http_status===503)providerRateLimit++;
   if(x.http_status!==200&&x.http_status!==429&&x.http_status!==503)errors++;
  }
  if(x.status==='HTTP200_NO_VERIFIED_IDENTITY_COVERAGE_UNKNOWN')empty++;
  if(x.return_pools.length>0){confirmed++;pools+=x.return_pools.length;}
  statuses.push({hour:x.historical_hour_index,row:x.row_index,mint:x.mint,
   status:x.status,http_status:x.http_status,
   captured_at_utc:x.captured_at_utc??null,
   raw_sha256:x.raw_sha256??null,
   exact_current_mint_pool_links:x.return_pools.map(p=>p.pool)});
 }
 const pending=plan.requests.filter(q=>!seen.has(q.sample_hour_index+':'+q.row_index))
  .map(q=>({hour:q.sample_hour_index,row:q.row_index,mint:q.mint}));
 return {schema:1,kind:'R29_V25_POSTRUN_NEUTRAL_176_MINT_RESEARCH_CHECKPOINT',
  original_neutral_sample_mints:192,
  previously_recovered_neutral_mints:16,
  remaining_mints_in_scope:176,
  submitted_source_receipts:results.length,
  actual_public_http_requests:responses,actual_http200:successes,
  provider_rate_limit_http429_or_503:providerRateLimit,
  http200_without_confirmed_pool:empty,
  other_http_or_json_failures:errors,
  additional_mints_with_current_exact_pool:confirmed,
  additional_current_exact_mint_pool_links:pools,
  combined_current_exact_mint_pool_mints:16+confirmed,
  unattempted_mints:pending.length,pending,results:statuses,
  no_october_asof_source_promoted:true,
  original_october_discovery_proven:0,
  historical_tradeable_buy_sell_quotes_verified:0,
  historical_safe_sellability_proven:0,
  actual_five_gpt_reviews:0,orders_published:0,
  winner_oracle_used:false,
  missing_source_does_not_prove_nonexistence:true,
  requires_independent_historic_source_verification:true};
}
