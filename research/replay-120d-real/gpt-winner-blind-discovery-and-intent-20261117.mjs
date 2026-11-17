// R29 GPT-only, winner-blind historical candidate context and order-intent validator.
// This is intentionally RESEARCH_ONLY. It cannot call a model, sign an order,
// change a portfolio, or equate another trader's swap with our executable quote.
// A source frame must be generated from ORIGINAL provider capture timestamps
// before the virtual checkpoint; known winners / later outcomes never enter it.
import {createHash} from 'node:crypto';

const SHA=/^[a-f0-9]{64}$/i;
const SOL=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ISO=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s));
const sec=t=>Date.parse(t);
const good=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const string=s=>typeof s==='string'&&s.length>0;
const fail=message=>{throw Error(message)};
const must=(test,message)=>{if(!test)fail(message)};
const hash=x=>createHash('sha256').update(x).digest('hex');
const firstDay=Date.parse('2026-07-20T00:00:00Z');
const holdoutStart=Date.parse('2026-09-18T00:00:00Z');
const end=Date.parse('2026-11-17T00:00:00Z');
const stages=new Set(['LEARN_ASOF','BLIND_TEST']);
const actions=new Set(['BUY','SELL','HOLD','WATCH','NO_TRADE']);
const sourceHosts=new Set(['replay.shrine.trade','replay.pumpapi.io']);
function getSource(frame){
 const url=frame.archive_source_url||frame.neutral_eligible_source_hour;
 must(typeof url==='string','HISTORIC_NEUTRAL_ARCHIVE_REQUIRED');
 const u=new URL(url);
 must(u.protocol==='https:'&&sourceHosts.has(u.hostname)&&
 /\/2026\/(?:0[7-9]|1[01])\/(?:0[1-9]|[12]\d|3[01])\/(?:[01]\d|2[0-3])\.jsonl\.zst$/.test(u.pathname),
 'HISTORICAL_NEUTRAL_SOURCE_UNTRUSTED');
 return u.toString();
}
function normalizeCandidate(raw,form,asof){
 const token=form==='DAILY'?raw.mint:raw.token_address;
 const pool=raw.pool_address;
 const first=form==='DAILY'?raw.asof_initial_candidate_time_utc:raw.first_observed_at_utc;
 const last=form==='DAILY'?raw.observed_last_utc:raw.last_observed_at_utc;
 must(SOL.test(token||'')&&SOL.test(pool||'')&&ISO(first)&&ISO(last),'UNTRUSTED_ASOF_TOKEN_POOL');
 must(sec(first)<=sec(last)&&sec(last)<=asof,'FUTURE_CANDIDATE_OBSERVATION');
 const buyers=form==='DAILY'?raw.independently_counted_buy_wallets:raw.unique_buyers_observed;
 const sellers=form==='DAILY'?raw.independently_counted_sell_wallets:raw.unique_sellers_observed;
 const buys=raw.observed_buys,sells=raw.observed_sells;
 const buyQuote=form==='DAILY'?raw.observed_sol_buys:raw.buy_quote_volume_original_asset;
 const sellQuote=form==='DAILY'?raw.observed_sol_sells:raw.sell_quote_volume_original_asset;
 const reserve=form==='DAILY'?raw.latest_sol_pool_reserve_recorded:raw.latest_pool_quote_reserves_original_asset;
 const mark=form==='DAILY'?raw.latest_swap_mark_price_in_sol_not_usdc:raw.most_recent_trade_price_original_quote;
 for(const [k,v] of Object.entries({buyers,sellers,buys,sells,buyQuote,sellQuote}))
  must(good(v),'INVALID_SOURCE_METRIC_'+k);
 must(reserve===null||good(reserve),'INVALID_POOL_RESERVE');
 must(mark===null||good(mark),'INVALID_SOL_PRICE_MARK');
 const quote=form==='DAILY'?'SOL':raw.quote_currency;
 must(quote==='SOL','UNKNOWN_OR_NON_SOL_QUOTE_REQUIRES_SEPARATE_CONVERSION');
 const mintedSecurity=form==='DAILY'?
  raw.mint_and_freeze_authority_missing_asof_confirmed:
  raw.mint_or_freeze_authority_verified_absent;
 must(typeof mintedSecurity==='boolean','MINT_AUTHORITY_STATUS_UNKNOWN_OR_INVALID');
 const id='solana:'+token+':'+pool;
 return {
   candidate_id:id,chain:'solana',token_address:token,pool_address:pool,
   first_observed_at_utc:first,last_observed_at_utc:last,
   observed_buys:buys,observed_sells:sells,
   observed_unique_buyers:buyers,observed_unique_sellers:sellers,
   buy_quote_volume_sol:buyQuote,sell_quote_volume_sol:sellQuote,
   last_reported_quote_reserve_sol:reserve,
   last_reported_swap_price_sol_per_token:mark,
   provider_mint_and_freeze_authority_appeared_absent:mintedSecurity,
   creator_wallet_concentration_verified:false,
   wash_trading_excluded:false,
   independently_executable_bidirectional_order_quote_verified:false,
   source_recorded_swaps_are_not_our_executable_fills:true,
   source_capture_time_to_utc:last
 };
}
export function buildWinnerBlindResearchPacket(frame,{
 prior_positions=[],lessons=[],available_cash_test_usdc=null,
 source_document_sha256=null,scan_index_in_utc_day=1
}={}){
 must(frame&&typeof frame==='object'&&!Array.isArray(frame),'INVALID_SOURCE_FRAME');
 must(ISO(frame.virtual_asof_utc),'VIRTUAL_UTC_TIME_REQUIRED');
 const asof=sec(frame.virtual_asof_utc);
 must(asof>=firstDay&&asof<end,'SOURCE_OUTSIDE_120_DAY_WALKFORWARD');
 const stage=asof<holdoutStart?'LEARN_ASOF':'BLIND_TEST';
 must(stages.has(stage),'INVALID_STAGE');
 const daily=frame.schema==='r29_neutral_asof_daily_5min_source_frame_v1'||
             frame.schema==='r29_neutral_training_asof_daily_5min_source_frame_v1';
 const first=frame.schema==='r29_neutral_hour_0_first_5min_detached_gpt_candidate_frame.v1'||
             frame.schema==='r29_neutral_hour_1_first_20min_detached_gpt_candidate_frame.v1';
 must(daily||first,'UNSUPPORTED_OR_NONNEUTRAL_SOURCE_FRAME');
 must(frame.no_prior_future_gainers_used===true||(
   frame.source_future_coin_winners_used===false&&
   frame.known_winner_names_supplied===false),'HINDSIGHT_EXAMPLE_CONTAMINATION');
 must(daily?
   frame.complete_five_minute_original_capture_stream===true&&
   frame.no_later_rug_or_price_outcomes_seen===true:
   frame.stream_stopped_at_first_later_event===true&&
   frame.no_later_than_virtual_asof_events_in_candidate_frame===true,
 'SOURCE_NOT_PROVEN_CUTOFF_AT_VIRTUAL_TIME');
 must(source_document_sha256===null||SHA.test(source_document_sha256),
 'INVALID_SOURCE_DOCUMENT_HASH');
 const prefix=frame.original_source_first5_prefix_sha256||
  frame.source_prefix_asof_event_lines_sha256;
 must(SHA.test(prefix||''),'UNHASHED_ORIGINAL_NEUTRAL_EVENT_WINDOW');
 const url=getSource(frame);
 const m=/\/2026\/(\d{2})\/([0-2]\d|3[01])\/([01]\d|2[0-3])\.jsonl\.zst$/.exec(url);
 must(m,'INVALID_SOURCE_ARCHIVE_DATE');
 const archiveHour=Date.parse('2026-'+m[1]+'-'+m[2]+'T'+m[3]+':00:00Z');
 must(asof>=archiveHour&&asof<archiveHour+3600_000,'ASOF_SOURCE_HOUR_MISMATCH');
 const raw=daily?frame.neutral_ranked_solana_pools_in_frame:
   frame.ranked_neutral_cohort_not_all_market;
 must(Array.isArray(raw)&&raw.length<=60,'INVALID_CANDIDATE_FRAME_CAP');
 const ids=new Set();
 const candidates=raw.map(c=>{
   const n=normalizeCandidate(c,daily?'DAILY':'FIRST',asof);
   must(!ids.has(n.candidate_id),'DUPLICATE_TOKEN_POOL');
   ids.add(n.candidate_id);
   return n;
 });
 must(Number.isInteger(scan_index_in_utc_day)&&scan_index_in_utc_day>=1&&
   scan_index_in_utc_day<=24,'SCAN_FREQUENCY_MUST_BE_1_TO_24');
 must(available_cash_test_usdc===null||good(available_cash_test_usdc)&&
   available_cash_test_usdc<=5000,'UNPROVEN_OR_INVALID_PAPER_CASH');
 must(Array.isArray(prior_positions)&&prior_positions.length<=50,'INVALID_OPEN_POSITIONS');
 const positions=prior_positions.map(p=>{
  must(typeof p==='object'&&p.verified_paper_fill===true&&
    string(p.position_id)&&SOL.test(p.token_address||'')&&
    SOL.test(p.pool_address||'')&&ISO(p.opened_at_utc)&&
    sec(p.opened_at_utc)<=asof,'UNVERIFIED_OR_FUTURE_POSITION');
  return {position_id:p.position_id,token_address:p.token_address,
   pool_address:p.pool_address,opened_at_utc:p.opened_at_utc,
   current_sellable_quantity:'UNKNOWN_UNTIL_SELL_QUOTE',ownership:'VERIFIED_PAPER_FILL'};
 });
 must(Array.isArray(lessons)&&lessons.length<=200,'INVALID_LESSONS');
 const seenLesson=new Set();
 const safeLessons=lessons.map(l=>{
  must(l&&typeof l.lesson_id==='string'&&ISO(l.learned_at_utc)&&
    ISO(l.observation_at_utc)&&ISO(l.application_not_before_utc)&&
    SHA.test(l.evidence_sha256||'')&&string(l.lesson_de)&&
    sec(l.observation_at_utc)<=sec(l.learned_at_utc)&&
    sec(l.learned_at_utc)<=asof&&sec(l.application_not_before_utc)<=asof,
   'FUTURE_LESSON_OR_UNVERIFIED_SOURCE');
  must(!seenLesson.has(l.lesson_id),'DUPLICATE_LESSON');seenLesson.add(l.lesson_id);
  return {lesson_id:l.lesson_id,lesson_de:l.lesson_de,
    learned_at_utc:l.learned_at_utc,evidence_sha256:l.evidence_sha256};
 });
 // Important: output is WHITELISTED. Whole frame, current chat, symbols/names,
 // synthetic winner labels, later hype, event payload extras are NEVER forwarded.
 const packet={
  schema:'r29_gpt_only_neutral_research_packet.v1',
  phase:stage,virtual_asof_utc:frame.virtual_asof_utc,
  historical_archive_source_url:url,historical_source_prefix_sha256:prefix,
  source_document_sha256,scan_index_in_utc_day,
  candidate_discovery_policy:'CHRONOLOGICAL_NEUTRAL_EARLY_WALLET_ACTIVITY',
  candidate_selection_does_not_know_outcomes:true,
  archive_provider_capture_asof_claimed_not_independently_live_attested:true,
  source_only_subset_not_complete_market_census:true,
  social_and_news_evidence:'ABSENT_UNLESS_SEPARATELY_ORIGINALLY_CAPTURE_ATTESTED',
  candidates,prior_verified_open_positions:positions,prior_asof_lessons:safeLessons,
  paper_free_cash_test_usdc:available_cash_test_usdc,
  min_requested_buy_test_usdc:50,max_requested_buy_test_usdc:5000,
  gpt_must_choose_strategy:true,
  permitted_actions:stage==='LEARN_ASOF'?['WATCH','NO_TRADE']:
   ['BUY','HOLD','SELL','WATCH','NO_TRADE'],
  buyer_and_seller_risk_review_required:true,
  no_real_money_or_paypal_action:true,
  note:'GPT may express BUY intent, technical executor may BLOCK for no verified sell route. No profit is implied.'
 };
 return {packet,payload_sha256:hash(JSON.stringify(packet)),
  research_only:true,independent_clean_model_session_attested:false,
  actual_gpt_model_invocation_completed:false,
  created_executable_order:false,verified_pnl_test_usdc:null};
}
const shape=new Set(['action','token_address','pool_address','stake_test_usdc',
 'position_id','next_scan_tier','reason_de','source_payload_sha256']);
export function verifyGptResearchIntent(envelope,response,{
 model_called_at_utc,actual_model_output_sha256,detached_model_origin_attested=false
}={}){
 const packet=envelope?.packet;
 must(packet?.schema==='r29_gpt_only_neutral_research_packet.v1'&&
   SHA.test(envelope.payload_sha256||''),'INVALID_NEUTRAL_GPT_INPUT_ENVELOPE');
 must(hash(JSON.stringify(packet))===envelope.payload_sha256,
  'NEUTRAL_GPT_INPUT_TAMPERED');
 must(ISO(model_called_at_utc)&&sec(model_called_at_utc)>=sec(packet.virtual_asof_utc),
  'MODEL_ACTUAL_RUN_TIME_MISSING_OR_BACKDATED');
 const json=JSON.stringify(response);
 must(SHA.test(actual_model_output_sha256||'')&&actual_model_output_sha256===hash(json),
  'HASHED_REAL_MODEL_RESPONSE_REQUIRED');
 must(response&&typeof response==='object'&&!Array.isArray(response)&&
   Object.keys(response).every(k=>shape.has(k)),'GPT_RESPONSE_FIELDS_INVALID');
 must(actions.has(response.action)&&[1,4,12,24].includes(response.next_scan_tier)&&
   string(response.reason_de)&&response.reason_de.length>=20&&
   response.source_payload_sha256===envelope.payload_sha256,
  'GPT_RESPONSE_MUST_BE_BOUNDED_AND_SOURCE_BOUND');
 const trade=response.action==='BUY'||response.action==='SELL';
 if(response.action==='BUY'){
  must(packet.phase==='BLIND_TEST','CANNOT_BUY_IN_TRAINING_PHASE');
  must(Number.isFinite(response.stake_test_usdc)&&response.stake_test_usdc>=50&&
    response.stake_test_usdc<=5000&&
    Math.abs(response.stake_test_usdc*100-Math.round(response.stake_test_usdc*100))<1e-6,
    'GPT_BUY_STAKE_50_TO_5000_INVALID');
  must(packet.candidates.some(x=>x.token_address===response.token_address&&
   x.pool_address===response.pool_address),'GPT_CANNOT_BUY_NONNEUTRAL_CANDIDATE');
 }else must(response.stake_test_usdc===null,'NONBUY_CANNOT_SPEND');
 if(response.action==='HOLD'||response.action==='SELL')
  must(packet.prior_verified_open_positions.some(x=>x.position_id===response.position_id&&
  x.token_address===response.token_address&&x.pool_address===response.pool_address),
    'GPT_MAY_ONLY_MANAGE_REAL_VERIFIED_PAPER_POSITION');
 if(response.action==='WATCH')
  must(packet.candidates.some(x=>x.token_address===response.token_address&&
    x.pool_address===response.pool_address),'GPT_WATCH_CANDIDATE_MISSING');
 const cash=packet.paper_free_cash_test_usdc;
 const budgetOkay=response.action==='BUY'&&cash!==null&&response.stake_test_usdc<=cash;
 const buyBlocked=response.action==='BUY'&&
  (!budgetOkay||!packet.candidates.find(x=>x.token_address===response.token_address&&
   x.pool_address===response.pool_address)?.independently_executable_bidirectional_order_quote_verified);
 return {
  schema:'r29_gpt_only_retrospective_intent_validation.v1',
  action:response.action,requested_stake_test_usdc:response.stake_test_usdc,
  planned_full_scans_per_day:response.next_scan_tier,
  actual_model_called_at_utc:model_called_at_utc,
  model_response_sha256:actual_model_output_sha256,
  clean_model_origin_verification:detached_model_origin_attested===true?
    'DECLARED_NOT_EXTERNALLY_ATTESTED':'NOT_ATTESTED',
  historical_decision_was_not_made_in_2026_at_that_original_time:true,
  execution_status:trade?'BLOCKED_REQUIRES_INDEPENDENT_EXECUTOR_QUOTE_AND_ORDER_RECEIPT':'RESEARCH_ONLY_NO_ORDER',
  model_detected_buy_opportunity:response.action==='BUY',
  buy_intent_blocked_for_missing_cash_or_quote:buyBlocked,
  actual_buys_filled:0,actual_sells_filled:0,
  realized_pnl_test_usdc:null,
  real_money_enabled:false
 };
}
