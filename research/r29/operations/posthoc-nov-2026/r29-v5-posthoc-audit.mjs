// R29 V5.0 – purely offline/post-hoc audit of user-supplied future winners.
// This module MUST NOT be imported into the forward GPT candidate selector.
// No network, orders, trade decisions, wallet data, invented fills, or prices.
// "First observed" means the first REAL capture in the provided historic tape,
// never a token's hindsight launch date or retrospectively published article.
const ISO=/^\d{4}-\d{2}-\d{2}T\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
const observed=s=>typeof s==='string'&&ISO.test(s)&&Number.isFinite(Date.parse(s));
const matching=(candidate,row)=>candidate?.chain===row.chain&&
 typeof candidate?.token_address==='string'&&
 (row.chain==='solana'
  ?candidate.token_address===row.external_contract_candidate
  :candidate.token_address.toLowerCase()===row.external_contract_candidate?.toLowerCase());
function validManifest(manifest){
 if(manifest?.schema!=='sniper_r29_v50_user_posthoc_benchmark.v1'||
  manifest.benchmark_only!==true||manifest.never_include_in_forward_model_input!==true||
  !Array.isArray(manifest.rows)||manifest.total_rows!==manifest.rows.length||
  manifest.rows.length!==36||
  new Set(manifest.rows.map(r=>r.id)).size!==manifest.rows.length||
  manifest.rows.some(r=>r.benchmark_only!==true||
   r.reported_gain_independently_verified!==false||
   r.contract_cross_provider_verified!==false||
   !/^(2026-10|2026-11)-\d\d$/.test(r.reported_start_date)|| // never force label to be an event
   !['SINCE_START','WEEK','24H','24H_STAR'].includes(r.reported_basis)||
   !(r.reported_pct>0)))
  throw Error('R29_V50_UNTRUSTED_POSTHOC_BENCHMARK');
 return manifest.rows;
}
export function auditUserWinnersAgainstAsOfCaptures({
 manifest,captures=[],modelReviews=[],receipts=[]
}={}){
 const rows=validManifest(manifest);
 if(!Array.isArray(captures)||captures.length>500000||
   !Array.isArray(modelReviews)||modelReviews.length>100000||
   !Array.isArray(receipts)||receipts.length>100000)
  throw Error('R29_V50_INVALID_AUDIT_SOURCE');
 const cleanCaptures=captures.filter(s=>
  s?.schema==='research_market_snapshot.v1'&&
  s.paper_only===true&&s.actionable===false&&
  observed(s.published_at_utc)&&Array.isArray(s.candidates)&&
  s.candidates.length<=500);
 cleanCaptures.sort((a,b)=>a.published_at_utc.localeCompare(b.published_at_utc));
 const result=rows.map(row=>{
  const targetCutoff=row.reported_measure_to_date+'T23:59:59.999Z';
  const basis={benchmark_id:row.id,name:row.display_name,
   reported_pct:row.reported_pct,reported_basis:row.reported_basis,
   historical_measure_end_date:row.reported_measure_to_date,
   contract_resolution_status:row.external_contract_candidate?
    'ONE_EXTERNAL_REFERENCE_CANDIDATE_NOT_CROSS_PROVIDER_VERIFIED':
    'MISSING_UNIQUE_CONTRACT',
   first_own_capture_at_utc:null,first_source_candidate_at_utc:null,
   first_own_capture_before_reported_measure_end:false,
   first_real_gpt_model_review_at_utc:null,
   first_proven_gpt_watch_or_buy_at_utc:null,
   first_real_personal_paper_buy_at_utc:null,
   first_real_personal_paper_sell_at_utc:null,
   realizable_net_pnl_test_usdc:null,
   classification:'INSUFFICIENT_CAPTURE_AND_MODEL_RECEIPT_EVIDENCE',
   blind_model_inputs_must_exclude_user_winner_list:true};
  if(!row.external_contract_candidate||!row.chain)return basis;
  const hit=cleanCaptures.find(s=>s.candidates.some(c=>
    matching(c,row)&&observed(c.observed_at_utc)&&
    Date.parse(c.observed_at_utc)<=Date.parse(s.published_at_utc)));
  if(!hit)return basis;
  const cand=hit.candidates.find(c=>matching(c,row)&&observed(c.observed_at_utc)&&
    Date.parse(c.observed_at_utc)<=Date.parse(hit.published_at_utc));
  basis.first_own_capture_at_utc=hit.published_at_utc;
  basis.first_source_candidate_at_utc=cand.observed_at_utc;
  const before=hit.published_at_utc<=targetCutoff;
  basis.first_own_capture_before_reported_measure_end=before;
  basis.classification=before?'TECHNICALLY_OBSERVED_NOT_MODEL_OR_TRADE_PROVEN':
    'ONLY_OBSERVED_AFTER_REPORTED_MEASURE_END';
  // A review is authentic only when an independent model attestation is
  // supplied. Owner-authored GitHub commits and collector reviews are NOT GPT.
  const proven=modelReviews.filter(r=>r?.model_call_attested===true&&
    observed(r.at_utc)&&r.at_utc>=hit.published_at_utc&&
    Array.isArray(r.candidate_ids)&&r.candidate_ids.includes(cand.candidate_id))
    .sort((a,b)=>a.at_utc.localeCompare(b.at_utc));
  if(proven.length){
   basis.first_real_gpt_model_review_at_utc=proven[0].at_utc;
   const choice=proven.find(r=>['WATCH','BUY'].includes(r.action)&&
      r.decision_id&&/^gpt_[a-f0-9]{32}$/.test(r.decision_id));
   if(choice)basis.first_proven_gpt_watch_or_buy_at_utc=choice.at_utc;
   basis.classification=choice?'MODEL_REVIEWED_WATCH_OR_BUY_ATTESTED':
    'MODEL_REVIEWED_BUT_NO_WATCH_BUY';
  }
  // Matching a public receipt alone is not permission to infer personal
  // ledger PnL, executable fees, or a genuine GPT-origin decision.
  const fills=receipts.filter(r=>r?.decision_id&&
    proven.some(d=>d.decision_id===r.decision_id)&&
    r.local_paper_ledger_verified===true&&r.status==='PAPER_FILLED'&&
    r.chain===row.chain&&r.token_address===row.external_contract_candidate&&
    observed(r.filled_at_utc)).sort((a,b)=>a.filled_at_utc.localeCompare(b.filled_at_utc));
  const buy=fills.find(r=>r.action==='BUY');
  const sell=buy&&fills.find(r=>r.action==='SELL'&&
    r.position_id===buy.position_id&&r.filled_at_utc>=buy.filled_at_utc);
  if(buy){
   basis.first_real_personal_paper_buy_at_utc=buy.filled_at_utc;
   basis.classification='PAPER_BUY_LEDGER_VERIFIED_EXIT_PENDING';
  }
  if(sell){
   basis.first_real_personal_paper_sell_at_utc=sell.filled_at_utc;
   basis.classification='PAPER_BUY_AND_SELL_LEDGER_VERIFIED_PNL_UNCALCULATED';
  }
  return basis;
 });
 return {schema:'sniper_r29_v50_posthoc_audit.v1',
  benchmark_rows:rows.length,
  captures_provided:captureCount(captures),
  verified_asof_market_frames:cleanCaptures.length,
  externally_suggested_contracts:rows.filter(r=>r.external_contract_candidate).length,
  first_seen_before_target:result.filter(r=>r.first_own_capture_before_reported_measure_end).length,
  proven_model_watches_or_buys:result.filter(r=>r.first_proven_gpt_watch_or_buy_at_utc).length,
  personal_paper_buy_fills:result.filter(r=>r.first_real_personal_paper_buy_at_utc).length,
  personal_paper_sell_fills:result.filter(r=>r.first_real_personal_paper_sell_at_utc).length,
  no_hindsight_winner_labels_in_model:true,
  cannot_derive_routable_net_pnl_without_real_quotes_fees_slippage:true,
  results:result};
}
function captureCount(xs){return xs.length}
