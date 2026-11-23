// R29: forensic-only repair of a misleading "latest eligible" candle label
// in November's two-pool OCT12 backfill. An OHLCV minute closing at the
// EXACT scan time is not necessarily already finalized/published at that
// instant. Even a safely closed retrospective candle never proves it was
// delivered to an October GPT decision, nor can it supply a 50-USDC quote.
import {normalizeHistoricalCandles,closeAsOf} from './historical-candles.mjs';
import {R29_OCT12_CHAIN_RESEARCH_TARGETS}
 from './v19-october-solana-chain-research.mjs';

export const V25_RETRO_CANDLE_FINALIZATION_GUARD_MS=60_000;
const sourceDay='2026-10-12';

export function auditV25TwoPoolCandleFinality({
 target,apiResponse,reportedLatestPosthoc=null
}={}){
 if(!R29_OCT12_CHAIN_RESEARCH_TARGETS.some(t=>
   t.mint===target?.mint&&t.pool===target?.pool
    &&t.scan===target?.scan&&t.scan_at_utc===target?.scan_at_utc))
  throw Error('V25_UNAUTHORIZED_NEUTRAL_CANDLE_TARGET');
 const tape=normalizeHistoricalCandles({
  apiResponse,day:sourceDay,aggregateMinutes:1,
  source_url:'GECKOTERMINAL_POST_EVENT_PINNED_ARCHIVE_ONLY'});
 const at=target.scan_at_utc;
 const noDelay=closeAsOf(tape,at,{
  maxAgeMinutes:15,minimumFinalizationDelayMs:0});
 const guarded=closeAsOf(tape,at,{
  maxAgeMinutes:15,
  minimumFinalizationDelayMs:V25_RETRO_CANDLE_FINALIZATION_GUARD_MS});
 const reported=reportedLatestPosthoc?.minute_closed_utc??null;
 const reportAtScan=reported===at;
 return {schema:1,kind:'R29_V25_POSTEVENT_TWO_POOL_MINUTE_CANDLE_FINALITY_RESEARCH',
  historical_scan_at_utc:at,scan_index:target.scan,
  chain:'solana',mint:target.mint,pool:target.pool,
  retrospective_candle_rows_in_archive:tape.candle_count,
  minimum_finalization_guard_ms:V25_RETRO_CANDLE_FINALIZATION_GUARD_MS,
  unguarded_last_candle_close_utc:noDelay?.candle_end_utc??null,
  predecision_finalized_research_candle_close_utc:
   guarded?.candle_end_utc??null,
  predecision_finalized_research_candle_start_utc:
   guarded?.candle_start_utc??null,
  predecision_retro_close_usd:guarded?.close_usd??null,
  predecision_retro_volume_usd:guarded?.volume_usd??null,
  retrospective_latest_report_label_closed_at_scan:reportAtScan,
  retrospective_latest_report_label_utc:reported,
  at_scan_close_must_not_be_considered_finalized:
   noDelay?.candle_end_utc===at,
  finalization_guard_excluded_at_scan_candle:
   noDelay?.candle_end_utc===at&&guarded?.candle_end_utc!==at,
  retrospective_price_is_not_original_provider_delivery:true,
  original_october_provider_delivery_authenticated:false,
  full_market_population_attested:false,
  historical_50_usdc_executable_buy_quote:false,
  historical_50_usdc_executable_sell_quote:false,
  independent_sellability_attested:false,
  actual_gpt_dot_reviews:0,
  trade_authorized:false,orders_written:0,
  caveat:'60s lag is a conservative research feature cutoff, not authentication that this provider response existed in October.'};
}
