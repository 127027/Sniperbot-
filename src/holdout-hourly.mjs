// Deterministic historical 24h evidence replay. NO network, current market feeds,
// GitHub writes, winner selection, wallets, or future information.
// A scan without archived evidence is DATA_GAP, never a claim of no market opportunities.
import {replaySignalDecisions} from './point-in-time-strategy.mjs';
import {canonicalChain,tokenValid,poolValid,exactPoolUrl} from './market-evidence.mjs';

const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const time=v=>typeof v==='string'&&ISO.test(v)&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
const validSha=v=>typeof v==='string'&&/^[0-9a-f]{40}$/.test(v);
const minute=60000;
const stamp=t=>new Date(t).toISOString();
function asOfCandidate(c,tick){
  const observed=time(c?.observed_at_utc),archived=time(c?.archived_at_utc),
    published=time(c?.source_published_at_utc),chain=canonicalChain(c?.chain);
  if(c?.provenance!=='CONTEMPORANEOUS_RECORD')return {ok:false,reason:'RETROSPECTIVE_NOT_A_SCAN_INPUT'};
  if(!validSha(c?.source_archive_sha))return {ok:false,reason:'MISSING_IMMUTABLE_SOURCE_SHA'};
  if(observed===null||archived===null||published===null)return {ok:false,reason:'UNVERIFIED_SOURCE_TIME'};
  if(observed>tick||archived>tick||published>tick)return {ok:false,reason:'FUTURE_EVIDENCE'};
  if(!chain||!poolValid(chain,c.pool,c.pool_kind)||!exactPoolUrl(c.source_url,chain,c.pool))
    return {ok:false,reason:'INVALID_EXACT_POOL_IDENTITY'};
  return {ok:true,chain,contract_verified:tokenValid(chain,c.contract),
    observed_at_utc:c.observed_at_utc,key:chain+':'+String(c.pool).toLowerCase()};
}
// Observations are not artificially limited to top N. Already discovered candidates
// remain observable; quote freshness is a separate short-lived requirement.
export function replay24HourlyScans({date,archivedCandidates=[],archivedSnapshots=[],activityObservations=[],reviewTarget=24}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||time(date+'T00:00:00Z')===null)
    throw Error('INVALID_HOLDOUT_DATE');
  if(!Array.isArray(archivedCandidates)||!Array.isArray(archivedSnapshots)||!Array.isArray(activityObservations))
    throw Error('INVALID_HOLDOUT_INPUTS');
  if(reviewTarget!==24)throw Error('EXPLICIT_HOURLY_SCAN_REQUIRES_24');
  const start=time(date+'T00:00:00Z'),end=start+86400000;
  // Do not permit synthetic fixtures to masquerade as historical results.
  // Four phases are distinct. The candidate must have been visible to Dot 2 at
  // :15, risk reviewed no later than Dot 3 at :25 and only then quoted by Dot 4.
  // A pool first seen at :32 cannot be 'discovered' retroactively at :15.
  const discoveredByTick=new Map();
  const rejectedQuoteReasons=new Map();
  const matchingCandidateAt=(s,tick)=>{
    const chain=canonicalChain(s?.coin?.chain),pool=s?.coin?.pool,contract=s?.coin?.contract;
    if(!chain||!pool||!contract)return false;
    for(const c of archivedCandidates){
      const check=asOfCandidate(c,tick);
      if(!check.ok||check.chain!==chain||check.key!==chain+':'+String(pool).toLowerCase())continue;
      if(!check.contract_verified||String(c.contract).toLowerCase()!==String(contract).toLowerCase())continue;
      return true;
    }
    return false;
  };
  const verifiedSnapshots=archivedSnapshots.filter(s=>{
    if(s?.provenance!=='CONTEMPORANEOUS_RECORD')return false;
    const observed=time(s?.observed_at_utc);
    if(observed===null||observed<start||observed>=end)return true; // Pre-window baseline still checked by replay
    const hour=Math.floor((observed-start)/3600000);
    const dot2=start+hour*3600000+15*minute;
    const dot3=start+hour*3600000+25*minute;
    const riskAt=time(s?.risk?.observed_at_utc);
    const candidateReady=matchingCandidateAt(s,dot2);
    const riskReady=riskAt!==null&&riskAt<=dot3;
    // Date-scoped quote at :34 may be valid for :35 if the previously documented
    // risk decision was already available at :25, but cannot create Dot 2 identity.
    if(candidateReady&&riskReady)return true;
    const reason=!candidateReady?'NO_DOT2_IDENTITY_BEFORE_15':'NO_DOT3_RISK_BEFORE_25';
    rejectedQuoteReasons.set(reason,(rejectedQuoteReasons.get(reason)||0)+1);
    return false;
  });
  const replay=replaySignalDecisions({date,snapshots:verifiedSnapshots,activityObservations,targetPer24h:24,forceHourlyReview:true});
  const scans=[],cumulative=new Map(),excluded=new Map();
  for(let hour=0;hour<24;hour++){
    const at=start+hour*3600000+35*minute,discoveryAt=at-20*minute,riskAt=at-10*minute;
    const step=replay.events[hour];
    let newlySeen=0,identified=0;
    for(const c of archivedCandidates){
      const check=asOfCandidate(c,discoveryAt);
      if(!check.ok){excluded.set(check.reason,(excluded.get(check.reason)||0)+1);continue;}
      if(!cumulative.has(check.key)){cumulative.set(check.key,{chain:check.chain,pool:c.pool,symbol:c.symbol||null,first_observed_at_utc:check.observed_at_utc,contract_verified:check.contract_verified});newlySeen++;}
      if(check.contract_verified)identified++;
    }
    const hadEvent=newlySeen>0||step.eligible_snapshots>0;
    scans.push({
      scan_number:hour+1,
      scan_started_at_utc:stamp(start+hour*3600000),
      dot1_at_utc:stamp(start+hour*3600000+5*minute),
      dot2_at_utc:stamp(start+hour*3600000+15*minute),
      dot3_at_utc:stamp(start+hour*3600000+25*minute),
      dot4_decision_at_utc:stamp(at),
      dot5_qa_at_utc:stamp(start+hour*3600000+45*minute),
      eligible_cumulative_discoveries:cumulative.size,
      newly_verified_discoveries:newlySeen,
      candidates_with_full_contract_in_this_scan:identified,
      fresh_verified_quote_snapshots:step.eligible_snapshots,
      dot2_cutoff_at_utc:stamp(discoveryAt),
      dot3_cutoff_at_utc:stamp(riskAt),
      eligible_snapshot_inputs_after_dot_pipeline:verifiedSnapshots.length,
      strategy_action:step.actions.length?step.actions.map(a=>a.action).join(','):'NO_TRADE',
      data_status:hadEvent?step.status:'DATA_GAP_NO_CONTEMPORANEOUS_MARKET_EVIDENCE',
      full_review:step.full_review,
      simulated_order_count:step.actions.filter(a=>a.action==='BUY'||a.action==='SELL').length,
    });
  }
  return {
    schema:1,
    kind:'CLEANROOM_24_HOURLY_NO_LOOKAHEAD_HOLDOUT',
    mode:'HISTORICAL_SHADOW_PAPER_NOT_REAL_ORDER',
    date,window_start_utc:stamp(start),window_end_utc:stamp(end),
    decision_scan_count:scans.length,
    configured_review_target_per_24h:24,
    actual_full_reviews:replay.summary.fullReviews,
    archived_contemporaneous_candidate_inputs:archivedCandidates.length,
    archived_contemporaneous_eligible_snapshot_inputs:verifiedSnapshots.length,
    archived_synthetic_snapshots_ignored:archivedSnapshots.length-verifiedSnapshots.length,
    discovered_candidate_count:cumulative.size,
    strategy_buys:replay.summary.buys,
    strategy_sells:replay.summary.sells,
    confirmed_github_orders:0,
    confirmed_paper_client_fills:0,
    opening_test_usdc:replay.starting_cash_test_usdc,
    ending_test_usdc_without_trade_evidence:replay.ending_cash_test_usdc,
    historical_pnl_verified:false, // Timestamp-shaped data alone is NOT authenticated on-chain evidence.
    evidence_status:verifiedSnapshots.length?'UNVERIFIED_SUBMITTED_EVIDENCE':'NO_VALID_CONTEMPORANEOUS_SNAPSHOTS',
    excluded_evidence_counts:Object.fromEntries(excluded),
    rejected_snapshot_reasons:Object.fromEntries(rejectedQuoteReasons),
    scan_results:scans,
    caveat:'An empty authenticated historical input stream is DATA_GAP, NOT zero launch opportunities. Reviewer cannot reconstruct independent GPT historical decisions from hindsight winner lists. No source date is invented.'
  };
}
