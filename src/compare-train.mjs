// Comparison deliberately separates October post-hoc research from actual Nov cloud roles.
import {tokenValid} from './market-evidence.mjs';
export function compareTrain({oldReplay,newReplay,dot2,feed,dot3,dot4,dot5,index}){
 if(oldReplay?.scans!==24||newReplay?.scans!==24)throw Error('BACKTEST_24_SCANS_REQUIRED');
 const before={candidates:6,full_contracts:0,source_dot2_blob_sha:'054723009a0a64809227831564c61edbe4a53058',
  as_of_utc:'2026-11-21T16:15:31Z',source_commit:'02e18866ac76b0bca0ee1bcef9d3f0f5e055df89'};
 const afterCandidates=dot2?.candidates??[],contracts=afterCandidates.filter(x=>tokenValid(x.chain,x.contract)).length;
 const feedConnected=!!dot2?.feed_evidence_path&&dot2.feed_evidence_path===feed?.evidence_path;
 const dt=x=>Date.parse(x)||0;
 const strategyInfo=(oldReplay.strategies||[]).map(old=>{
  const now=newReplay.model_experiments?.[old.preset];
  return {preset:old.preset,
   before_buys:old.buy_experiments,before_sells:old.sell_experiments,before_model_pnl:old.realized_model_pnl,
   now_buys:now?.counts?.buys??null,now_sells:now?.counts?.sells??null,
   now_model_pnl:now?.hypothetical_realized_test_usdc??null,
   performance_delta_valid:false,
   reason:'RECONSTRUCTED_HISTORICAL_TAPES_NOT_BYTEWISE_LOCKED; POST_HOC_SAMPLE_AND_RATE_LIMIT'};
 });
 return {schema:1,kind:'V09_REPEAT_BACKTEST_COMPARE_WITH_ACTUAL_DOT_EVIDENCE',
  training_date:'2026-10-12',window_utc:['2026-10-12T00:00:00Z','2026-10-13T00:00:00Z'],
  old_historical_scans:24,new_historical_scans:24,
  old_historical_pool_tapes:oldReplay.historical_pool_tapes?.length??null,
  new_historical_pool_tapes:newReplay.source_eligible_pool_tapes??null,
  source_65_winners_not_unbiased: true,
  historical_actual_dot_discoveries:0,historical_actual_dot_orders:0,historical_actual_client_fills:0,
  model_research_only:strategyInfo,
  current_cloud_dot2:{baseline:before,
    current_report_utc:dot2?.updated_at_utc,
    current_candidates:afterCandidates.length,
    candidate_gain:afterCandidates.length-before.candidates,
    candidate_gain_pct:(afterCandidates.length/before.candidates-1)*100,
    current_full_contracts:contracts,contract_gain:contracts-before.full_contracts,
    contract_gain_pct:null,
    actual_feed_consumed:feedConnected,
    source_feed_chain:feed?.source_chain||null,
    source_feed_full_contracts:feed?.handoff_counts?.full_contracts??null,
    source_feed_independent_quote_pairs:feed?.handoff_counts?.independently_quote_matched??null},
  role_chain:{
    dot3_at_utc:dot3?.updated_at_utc??null,
    dot3_after_current_dot2:dt(dot3?.updated_at_utc)>=dt(dot2?.updated_at_utc),
    dot3_latest_eligible:dot3?.counts?.ELIGIBLE??0,
    dot4_at_utc:dot4?.updated_at_utc??null,
    dot4_after_current_dot2:dt(dot4?.updated_at_utc)>=dt(dot2?.updated_at_utc),
    dot4_latest_buy:dot4?.counts?.buy??0,dot4_latest_sell:dot4?.counts?.sell??0,
    dot5_at_utc:dot5?.updated_at_utc??null,
    dot5_after_current_dot2:dt(dot5?.updated_at_utc)>=dt(dot2?.updated_at_utc),
    git_paper_orders:Array.isArray(index?.orders)?index.orders.length:0,
    verified_client_fills:dot5?.counts?.confirmed_paper_filled??0},
  warning:'Current dated source feed from November cannot be used retroactively to manufacture Oct12 candidate discoveries or profit. Model PnL cannot be honestly compared as a performance gain without identical frozen source tapes.'};
}
