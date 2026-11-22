// R29 post-run evaluation ONLY. This module must never be imported by
// discovery, model strategy, risk gating, capture or live/PAPER execution.
// The 65 names and gains are future knowledge, not a blind discovery stream.
// This compares an ALREADY archived source-gap baseline, not the new final run.
import {canonicalChain,parsePoolUrl} from './market-evidence.mjs';

const goodNumber=n=>typeof n==='number'&&Number.isFinite(n);
const key=(chain,pool)=>chain==='solana'?chain+':'+pool:
 chain+':'+String(pool).toLowerCase();
export function compareOct12SourceGapBaselineAfterRun({
 blindBaseline,winnerRegister,blindBaselineBlobSha,registerBlobSha
}={}){
 if(blindBaseline?.schema!==1||
   blindBaseline?.kind!=='R29_CLEANROOM_RANDOM_HISTORICAL_DAY_SHADOW_REPLAY'
   ||blindBaseline.day?.date!=='2026-10-12'
   ||blindBaseline.selection?.date!=='2026-10-12'
   ||blindBaseline.simulation?.type!=='EVIDENCE_ONLY_BLIND_SHADOW'
   ||blindBaseline.status!=='DATA_GAP_UNABLE_TO_CERTIFY_TRADING_PERFORMANCE'
   ||blindBaseline.evidence?.intraday_snapshots_eligible!==0
   ||blindBaseline.evidence?.contemporaneous_dot_decisions!==0
   ||blindBaseline.simulation?.simulated_orders!==0
   ||blindBaseline.simulation?.simulated_fills!==0
   ||blindBaseline.simulation?.real_github_orders!==0
   ||blindBaseline.simulation?.real_client_receipts!==0
   ||winnerRegister?.schema!==1
   ||winnerRegister?.kind!=='R29_V19_POST_EVENT_WINNER_REFERENCE_REGISTER'
   ||winnerRegister?.source_class!=='POST_EVENT_ORACLE'
   ||winnerRegister?.purpose!=='EVALUATION_ONLY_AFTER_DECISIONS'
   ||winnerRegister?.statistics?.entries!==65
   ||!Array.isArray(winnerRegister?.entries)
   ||winnerRegister.entries.length!==65
   ||new Set(winnerRegister.entries.map(e=>e.rank)).size!==65
   ||winnerRegister.entries.some((x,i)=>x.rank!==i+1
     ||typeof x.name!=='string'||x.name.length<1
     ||!goodNumber(x.reported_gain_pct)||x.reported_gain_pct<=100
     ||x.contract!==null
     ||!['NAME_ONLY_AMBIGUOUS','POOL_LINK_CONTRACT_UNVERIFIED'].includes(x.identity_status))
   ||!(/^[0-9a-f]{40}$/.test(blindBaselineBlobSha||''))
   ||!(/^[0-9a-f]{40}$/.test(registerBlobSha||'')))
  throw Error('POSTRUN_BASELINE_OR_REFERENCE_INVALID_OR_LEAK_RISK');
 const seen=new Set();
 const entries=winnerRegister.entries.map(e=>{
  const chain=canonicalChain(e.reported_chain);
  if(!chain)throw Error('WINNER_CHAIN_UNKNOWN');
  const parsed=e.pool_url?parsePoolUrl(e.pool_url):null;
  if(e.pool_url&&!e.pool)throw Error('WINNER_POOL_LINK_MISSING_POOL');
  // A malformed retrospective source ID is a row-level DATA_GAP, not a
  // reason to erase all 65 comparisons or silently guess the real address.
  const invalidPoolLink=Boolean(e.pool_url&&!parsed);
  if(e.pool_url&&parsed
    &&(parsed.chain!==chain||key(chain,parsed.pool)!==key(chain,e.pool)))
   throw Error('WINNER_POOL_LINK_IDENTITY_INVALID');
  const identity=!e.pool_url?'NAME_ONLY_NOT_UNIQUE':
    invalidPoolLink?'POOL_LINK_SYNTAX_INVALID':'POOL_LINK_BUT_CONTRACT_UNKNOWN';
  if(e.pool_url){
   if(seen.has(key(chain,e.pool)))throw Error('DUPLICATE_REFERENCE_POOL_ID');
   seen.add(key(chain,e.pool));
  }
  const perfect=Number((50*(1+e.reported_gain_pct/100)).toFixed(4));
  return {rank:e.rank,name:e.name,chain,reported_gain_pct:e.reported_gain_pct,
   pool:e.pool??null,contract:null,identity,
   report_is_post_event:true,
   known_available_as_of_oct12:false,
   verified_historical_bot_discovery:false,
   verified_bot_buy:false,verified_bot_sell:false,
   proved_executable_opportunity:false,
   comparison_outcome:'UNKNOWN_NOT_A_VERIFIED_FALSE_NEGATIVE',
   first_unproven_step:invalidPoolLink?
     'ORIGINAL_REFERENCE_POOL_ID_SYNTAX':e.pool_url?
     'OCT12_TIMELY_DISCOVERY_AND_EXACT_CONTRACT_AND_QUOTE_PROOF':
     'EXACT_CHAIN_CONTRACT_POOL_IDENTITY',
   indicative_perfect_full_reported_movement_from_50_test_usdc:perfect,
   indicative_value_is_not_tradable_pnl:true};
 });
 const withPool=entries.filter(e=>e.pool!==null).length;
 const validPoolLinks=entries.filter(e=>e.identity==='POOL_LINK_BUT_CONTRACT_UNKNOWN').length;
 const invalidPoolLinks=entries.filter(e=>e.identity==='POOL_LINK_SYNTAX_INVALID').length;
 const byChain=Object.fromEntries(['solana','ethereum','base','bsc','robinhood','cronos']
   .map(chain=>[chain,entries.filter(x=>x.chain===chain).length]));
 if(withPool!==8||validPoolLinks!==7||invalidPoolLinks!==1
   ||entries.length-withPool!==57)throw Error('WINNER_REGISTER_COUNTS_CHANGED');
 return {schema:1,kind:'R29_V19_OCT12_POSTRUN_ORACLE_VS_ARCHIVED_SOURCE_GAP_BASELINE',
  date:'2026-10-12',
  baseline_provenance:'PRIOR_ARCHIVED_EVIDENCE_ONLY_REPLAY_NOT_NEW_BACKTEST',
  baseline_report_path:'research/backtests/2026-10-12/report.json',
  baseline_report_blob_sha:blindBaselineBlobSha,
  reference_path:'research/evaluation/2026-10-12/v19-winner-reference-identity-status.json',
  reference_blob_sha:registerBlobSha,
  reference_source_file:winnerRegister.source_file,
  comparison_performed_only_after_archived_baseline:true,
  reference_never_used_as_discovery_input:true,
  total_reference_rows:entries.length,reference_pool_links:withPool,
  syntactically_valid_reference_pool_links:validPoolLinks,
  invalid_reference_pool_links:invalidPoolLinks,
  reference_name_only:entries.length-withPool,
  rows_by_chain:byChain,
  baseline_asof_eligible_market_snapshots:0,
  baseline_confirmed_dot_decisions:0,
  baseline_model_orders:0,baseline_model_fills:0,
  baseline_verified_windows_client_receipts:0,
  original_historical_gpt_runs_proven:0,
  verified_executable_winner_opportunities:0,
  independently_established_winner_recall:null,
  independently_established_missed_opportunity_count:null,
  realized_pnl_from_historical_trade: null,
  nominal_paper_cash_after_no_orders_test_usdc:blindBaseline.simulation.closing_test_usdc,
  stake_per_coin_test_usdc:50,
  statement:'The archive lists after-the-fact price rises, not achievable entry and exit prices. All 65 are unscorable against this source-gap baseline. Zero orders is NOT a measured 0% recall or proof of a safe market.',
  results:entries};
}
