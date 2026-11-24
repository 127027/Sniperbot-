// R29 V2.9 research-to-strategy adapter. A retro SCREEN_PASS is NOT a
// tradable snapshot; no original provider, pool, risk, bid or ask is proven.
import {tokenValid} from './market-evidence.mjs';
import {asOfMillis} from './v19-asof-evidence.mjs';
const forbidden=['winner_rank','reported_gain_pct','future_price_usd',
 'later_outcome','oracle_label','backfilled_as_original_capture'];
const denial=['ORIGINAL_OCTOBER_PROVIDER_DELIVERY_NOT_AUTHENTICATED',
 'POOL_AND_ISSUER_SAFETY_NOT_AUTHENTICATED',
 'EXECUTABLE_50_TEST_USDC_BUY_AND_SELL_QUOTES_NOT_AUTHENTICATED'];
const nonnegative=x=>Number.isInteger(x)&&x>=0;

export function normalizeV29ResearchCandidateFrames(frames=[]){
 if(!Array.isArray(frames)||frames.length!==0&&frames.length!==24)
  throw Error('V29_RESEARCH_FRAMES_REQUIRE_ALL_24_OR_NONE');
 const map=new Map();
 for(const frame of frames){
  const tick=asOfMillis(frame?.at_utc);
  if(tick===null||!nonnegative(frame?.fresh_distinct_mints_in_last_10m_retro)
   ||!nonnegative(frame?.cumulative_distinct_mints_retro)
   ||!nonnegative(frame?.screen_pass_with_unknown_executable_quotes)
   ||!Array.isArray(frame?.top_research_candidates_not_orders)
   ||frame.top_research_candidates_not_orders.length>24
   ||frame.top_research_candidates_not_orders.length>frame.screen_pass_with_unknown_executable_quotes
   ||forbidden.some(x=>Object.hasOwn(frame,x))||map.has(frame.at_utc))
   throw Error('V29_INVALID_RETRO_RESEARCH_FRAME_OR_FUTURE_LABEL');
  const hour=map.size;
  const expected='2026-10-12T'+String(hour).padStart(2,'0')+':00:00.000Z';
  if(frame.at_utc!==expected||frame.scan!==hour+1)
   throw Error('V29_NON_CHRONOLOGICAL_RETRO_RESEARCH_FRAME');
  const reviewed=[],mintSeen=new Set();
  for(const c of frame.top_research_candidates_not_orders){
   const observed=asOfMillis(c?.feature_at_utc);
   if(!tokenValid('solana',c?.mint)||mintSeen.has(c.mint)
    ||c.scan_at_utc!==frame.at_utc||c.chain!=='solana'
    ||c.source_class!=='RETRO_ASOF_RECONSTRUCTION'
    ||c.original_provider_delivery_authenticated!==false
    ||c.real_quote_buy_50usdc_authenticated!==false
    ||c.real_quote_sell_50usdc_authenticated!==false
    ||c.issuer_and_sellability_authenticated!==false
    ||c.allowed_live_or_backtest_order!==false||c.pool!==null
    ||c.screen_status!=='SCREEN_PASS_REQUIRES_POOL_RISK_AND_TWO_WAY_QUOTES'
    ||!Array.isArray(c.screen_reasons)||c.screen_reasons.length!==0
    ||!Number.isFinite(c.research_score)
    ||observed===null||observed>tick-60000||observed<tick-600000
    ||forbidden.some(x=>Object.hasOwn(c,x)))
    throw Error('V29_RESEARCH_CANDIDATE_CANNOT_ENTER_BUY_GATE');
   mintSeen.add(c.mint);
   reviewed.push({mint:c.mint,chain:'solana',
    research_screen_score:c.research_score,
    feature_at_utc:c.feature_at_utc,exact_pool:null,
    review_outcome:'QUOTE_AND_ISSUER_EVIDENCE_REQUIRED',
    order_authorized:false});
  }
  map.set(frame.at_utc,{
   schema:1,kind:'R29_V29_DOT2_RESEARCH_QUEUE_DOT3_FAIL_CLOSED',
   research_screen_pass_count:frame.screen_pass_with_unknown_executable_quotes,
   research_recent_source_mints:frame.fresh_distinct_mints_in_last_10m_retro,
   research_cumulative_source_mints:frame.cumulative_distinct_mints_retro,
   representatives:reviewed,
   original_market_quote_snapshots_contributed:0,
   independent_risk_approvals_contributed:0,
   order_authorized:false,provenance:'RETROSPECTIVE_ONLY',
   blocked_reasons:denial});
 }
 return map;
}
export function researchPreviewAt(map,tick){
 return map.get(tick)||{schema:1,kind:'R29_V29_DOT2_RESEARCH_QUEUE_DOT3_FAIL_CLOSED',
   research_screen_pass_count:0,research_recent_source_mints:0,
   research_cumulative_source_mints:0,representatives:[],
   original_market_quote_snapshots_contributed:0,
   independent_risk_approvals_contributed:0,
   order_authorized:false,provenance:'NO_RETRO_SOURCE_SUPPLIED',
   blocked_reasons:denial};
}
