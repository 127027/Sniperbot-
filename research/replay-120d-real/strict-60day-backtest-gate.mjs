// Strict evidence preflight; never generates coins, GPT decisions, fills or PnL.
// Missing evidence is DATA_GAP, NOT an intentional strategic GPT NO_TRADE.
export const SCHEMA = 'r29_strict_60day_backtest_readiness.v1';
const REQUIRED = [
  'day_utc','historic_launch_record_count','historic_launch_source_sha256',
  'minute_asof_feature_rows_verified','minute_feature_sha256',
  'minute_asof_candidate_occurrences','recorded_full_day_swaps_for_neutral_group',
  'independent_contract_and_sellability_proved','historical_GPT_model_trades_proven',
  'historical_GPT_paper_PNL_test_USDC','coverage_class',
];
const hash = x => /^[a-f0-9]{64}$/i.test(x || '');
const good = x => /^\d+$/.test(x || '') && Number(x) > 0;
const present = x => typeof x === 'string' && x.trim().length > 0;
const day = date => date.toISOString().slice(0,10);
export function historicalHypeReferenceIsSafe(ref) {
  if (!ref || ref.reference_only !== true ||
    ref.may_be_used_as_asof_buy_signal !== false ||
    !hash(ref.source_sha256) || !Array.isArray(ref.historical_cases))
    throw Error('POSTHOC_HYPE_DATA_MUST_NOT_ENTER_ASOF_GPT_INPUT');
  return true;
}
export function audit60DayEvidence(csv, {start='2026-09-18'}={}) {
  if (typeof csv !== 'string' || !csv.trim()) throw Error('EMPTY_60D_MATRIX');
  const [header,...lines] = csv.trim().split(/\r?\n/);
  const fields = header.split(',');
  if (REQUIRED.some(f=>!fields.includes(f))) throw Error('MISSING_MATRIX_COLUMN');
  const base = Date.parse(start+'T00:00:00Z');
  if (!Number.isFinite(base) || day(new Date(base))!==start) throw Error('INVALID_START_DAY');
  const range = Array.from({length:60},(_,i)=>day(new Date(base+i*86400000)));
  const seen = new Map();
  for(const line of lines) {
    const values=line.split(',');
    if (values.length!==fields.length) throw Error('MALFORMED_MATRIX_ROW');
    const row=Object.fromEntries(fields.map((f,i)=>[f,values[i]]));
    if (!range.includes(row.day_utc) || seen.has(row.day_utc))
      throw Error('DUPLICATE_OR_EXTRA_DATE');
    seen.set(row.day_utc,row);
  }
  if (seen.size!==60) throw Error('MISSING_DAY_ROW');
  const missing={launch:[],minute:[],full_dex_swaps:[],security:[],
    archived_gpt_decisions:[],costed_gpt_paper_fills:[]};
  for(const date of range){
    const r=seen.get(date);
    if (!good(r.historic_launch_record_count)||!hash(r.historic_launch_source_sha256))
      missing.launch.push(date);
    if (!good(r.minute_asof_feature_rows_verified)||!hash(r.minute_feature_sha256))
      missing.minute.push(date);
    if (!present(r.recorded_full_day_swaps_for_neutral_group))
      missing.full_dex_swaps.push(date);
    if (r.independent_contract_and_sellability_proved!=='true')
      missing.security.push(date);
    // The existing matrix counts historical GPT TRADES (always 0), not
    // actual GPT decision transcripts. Numeric fields cannot prove as-of model calls.
    missing.archived_gpt_decisions.push(date);
    // No historical executable bidirectional quotes or timestamped PAPER_FILLED
    // receipts were included in the existing 60-day matrix.
    missing.costed_gpt_paper_fills.push(date);
  }
  const coverage=Object.fromEntries(Object.entries(missing).map(([key,arr])=>[key,60-arr.length]));
  return {
    schema:SCHEMA,mode:'RESEARCH_ONLY',period_utc:{start,end:range.at(-1)},
    days:60,covered_days:coverage,
    blockers:Object.entries(missing).filter(([,arr])=>arr.length)
      .map(([type,dates])=>({type,count:dates.length,days:dates})),
    genuine_gpt_memecoin_dex_backtest_complete:false,
    inferred_gpt_dex_pnl_test_usdc:null,
    cex_price_shadow_is_not_a_gpt_dex_backtest:true,
    historical_winner_reference_allowed_to_select_coins:false,
    live_paper_ledger_modified:false,
    real_trading_enabled:false,
    note:'Run this preflight again after attaching independent as-of GPT and costed-fill evidence; do not fabricate missing events.'
  };
}