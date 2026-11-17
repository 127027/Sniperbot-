// R29 BLIND historical market/media input gate.
// This module is NOT a coin picker or a model! A separate GPT model invocation
// must receive ONLY the output from this gate, not the user conversation or
// posthoc winner examples. Never publishes/signs an order or changes balances.
import {createHash} from 'node:crypto';
export const GATE_SCHEMA='r29_no_winner_shortlist_historical_market_gate.v1';
const hex=/^[a-f0-9]{64}$/i,actions=new Set(['BUY','HOLD','SELL','WATCH','NO_TRADE']);
const eventTypes=new Set(['TOKEN_CREATE','DEX_BUY','DEX_SELL','POOL_CREATE','POOL_LIQUIDITY','DEX_SWAP','MIGRATION','CONTRACT_AUTHORITY']);
const domains=new Set(['social','news','community','onchain_social']);
const keys={event:new Set(['event_id','event_type','event_at_utc','provider_captured_at_utc','chain','token_address','pool_address','venue','source_sha256','source_id','quote_asset','buy_count_60s','sell_count_60s','unique_buyers_60s','liquidity_usd','indicative_price_usd','quote_confirmed_at_utc','transaction_signature','transaction_finality','data_quality',
 'source_recorded_trade_price_quote','source_recorded_token_amount',
 'source_recorded_quote_amount','source_recorded_token_reserve','source_recorded_quote_reserve']),
 media:new Set(['item_id','channel','source_id','source_sha256','url','published_at_utc','archived_at_utc','observed_at_utc','edited_at_utc','title','body_excerpt','token_address','chain','pool_address','metrics_observed_at_utc','engagement_metrics','source_archival_method']),
 lesson:new Set(['lesson_id','original_decision_id','learned_at_utc','observation_at_utc','source_sha256','category','lesson_de','application_not_before_utc']),
 position:new Set(['position_id','chain','token_address','pool_address','opened_at_utc','opened_fill_id','tokens_owned','cost_basis_test_usdc','last_verified_quote_at_utc','last_verified_quote_test_usdc','asof_context_at_utc'])
};
const requireValid=(ok,msg)=>{if(!ok)throw Error(msg)};
const timestamp=x=>{
 requireValid(typeof x==='string'&&x.endsWith('Z')&&Number.isFinite(Date.parse(x)),'INVALID_UTC_TIMESTAMP');
 return Date.parse(x);
};
const when=(x,t,msg)=>{requireValid(timestamp(x)<=t,msg);};
const noExtra=(obj,which)=>{
 requireValid(obj&&typeof obj==='object'&&!Array.isArray(obj),'BAD_'+which);
 requireValid(Object.keys(obj).every(k=>keys[which].has(k)),which.toUpperCase()+'_UNTRUSTED_OR_FUTURE_FIELD');
};
const digest=x=>createHash('sha256').update(x).digest('hex');
const str=(x)=>typeof x==='string'&&x.trim().length>0;
const source=x=>requireValid(hex.test(x),'UNVERIFIED_SOURCE_SHA');
const identity=x=>{
 requireValid(str(x.chain)&&str(x.token_address),'MISSING_CONTRACT_IDENTITY');
 requireValid(x.pool_address===null||str(x.pool_address),'INVALID_POOL_IDENTITY');
};
const cp=x=>structuredClone(x);
export function buildNeutralHistoricalModelInput(input){
 const asof=timestamp(input?.virtual_asof_utc);
 const domain={train:[Date.parse('2026-07-20T00:00:00Z'),Date.parse('2026-09-18T00:00:00Z')],
 test:[Date.parse('2026-09-18T00:00:00Z'),Date.parse('2026-11-17T00:00:00Z')]};
 const phase=input.phase==='LEARN'?'train':input.phase==='TRADE_TEST'?'test':null;
 requireValid(phase&&asof>=domain[phase][0]&&asof<domain[phase][1],'DAY_OUTSIDE_60_PLUS_60');
 requireValid(input.discovery_mode==='NEUTRAL_ALL_AVAILABLE_EVENTS'&&input.candidate_source!=='POSTHOC_WINNER_LIST',
  'WINNER_SHORTLIST_OR_NONNEUTRAL_SOURCE_FORBIDDEN');
 requireValid(input.current_user_conversation_included===false&&
  input.retrospective_winners_supplied===false,'CONVERSATION_WINNER_LEAK');
 requireValid(Array.isArray(input.market_events)&&input.market_events.length<=100000,'INVALID_MARKET_INPUT');
 requireValid(Array.isArray(input.media_items)&&input.media_items.length<=10000,'INVALID_MEDIA_INPUT');
 requireValid(Array.isArray(input.prior_lessons)&&input.prior_lessons.length<=10000,'INVALID_LESSONS_INPUT');
 requireValid(Array.isArray(input.open_positions)&&input.open_positions.length<=100,'INVALID_POSITION_INPUT');
 const market=input.market_events.map(x=>{
  noExtra(x,'event');identity(x);source(x.source_sha256);
  requireValid(str(x.event_id)&&str(x.source_id)&&eventTypes.has(x.event_type),'INVALID_NEUTRAL_EVENT');
  when(x.event_at_utc,asof,'FUTURE_MARKET_EVENT');
  // A retrospective DATASET RELEASE is not proof of what a historic trader saw.
  // Immutable original provider observation times must be captured in source.
  when(x.provider_captured_at_utc,asof,'MARKET_DATA_CAPTURED_AFTER_DECISION');
  requireValid(timestamp(x.provider_captured_at_utc)>=timestamp(x.event_at_utc)-60000,
    'PROVIDER_EVENT_TIME_INCONSISTENT');
  if(x.quote_confirmed_at_utc!==undefined&&x.quote_confirmed_at_utc!==null)
   when(x.quote_confirmed_at_utc,asof,'FUTURE_PRICE_QUOTE');
  if(x.transaction_finality!==undefined)
   requireValid(['confirmed','unverified'].includes(x.transaction_finality),'INVALID_TX_FINALITY');
  return cp(x);
 });
 const media=input.media_items.map(x=>{
  noExtra(x,'media');source(x.source_sha256);
  requireValid(str(x.item_id)&&str(x.source_id)&&domains.has(x.channel),'INVALID_MEDIA_ITEM');
  requireValid(/^https:\/\//.test(x.url||''),'ARCHIVED_MEDIA_PERMALINK_REQUIRED');
  when(x.published_at_utc,asof,'FUTURE_MEDIA_POST');
  when(x.archived_at_utc,asof,'RETROSPECTIVE_MEDIA_CAPTURE_NOT_ASOF');
  when(x.observed_at_utc,asof,'FUTURE_MEDIA_OBSERVATION');
  if(x.edited_at_utc!==undefined&&x.edited_at_utc!==null)when(x.edited_at_utc,asof,'POST_EDITED_IN_FUTURE');
  if(x.metrics_observed_at_utc!==undefined&&x.metrics_observed_at_utc!==null)
   when(x.metrics_observed_at_utc,asof,'ENGAGEMENT_METRICS_FROM_FUTURE');
  requireValid(str(x.source_archival_method),'ARCHIVAL_METHOD_REQUIRED');
  return cp(x);
 });
 const lessons=input.prior_lessons.map(x=>{
  noExtra(x,'lesson');source(x.source_sha256);
  requireValid(str(x.lesson_id)&&str(x.lesson_de),'BAD_HISTORIC_LESSON');
  when(x.learned_at_utc,asof,'LESSON_LEARNED_AFTER_DECISION');
  when(x.observation_at_utc,asof,'FUTURE_LESSON_OBSERVATION');
  when(x.application_not_before_utc,asof,'LESSON_RETROFIT_TO_PAST');
  return cp(x);
 });
 const positions=input.open_positions.map(x=>{
  noExtra(x,'position');identity(x);
  requireValid(str(x.position_id)&&str(x.opened_fill_id),'POSITION_WITHOUT_PROVEN_FILL_ID');
  when(x.opened_at_utc,asof,'FUTURE_POSITION');
  when(x.asof_context_at_utc,asof,'FUTURE_BOT_POSITION_SNAPSHOT');
  if(x.last_verified_quote_at_utc!==null&&x.last_verified_quote_at_utc!==undefined)
   when(x.last_verified_quote_at_utc,asof,'FUTURE_POSITION_QUOTE');
  return cp(x);
 });
 requireValid(Number.isInteger(input.reviews_completed_today)&&
  input.reviews_completed_today>=0&&input.reviews_completed_today<=24,'INVALID_SCAN_COUNT');
 requireValid(input.reviews_completed_today<24,'DAILY_SCAN_LIMIT_REACHED');
 const chronological=(a,b)=>timestamp(a.event_at_utc)-timestamp(b.event_at_utc)||
  a.chain.localeCompare(b.chain)||a.token_address.localeCompare(b.token_address);
 market.sort(chronological);
 media.sort((a,b)=>timestamp(a.published_at_utc)-timestamp(b.published_at_utc)||
  a.item_id.localeCompare(b.item_id));
 lessons.sort((a,b)=>timestamp(a.learned_at_utc)-timestamp(b.learned_at_utc)||
  a.lesson_id.localeCompare(b.lesson_id));
 const facts={schema:GATE_SCHEMA,virtual_asof_utc:input.virtual_asof_utc,
  phase:input.phase,discovery_mode:'NEUTRAL_ALL_AVAILABLE_EVENTS',
  model_input_is_only_archived_neutral_market_and_asof_social:true,
  user_supplied_winner_examples_excluded:true,
  retrospective_success_or_rug_outcomes_excluded:true,
  market_events:market,media_items:media,prior_lessons:lessons,
  open_positions:positions,reviews_completed_today:input.reviews_completed_today,
  complete_market_and_media_universe_claimed:false,
  missing_source_categories:Array.isArray(input.missing_source_categories)?
   input.missing_source_categories.map(x=>String(x).slice(0,100)):[],
  trading_and_wallet_actions_permitted:false,
  model_must_choose_from:['BUY','HOLD','SELL','WATCH','NO_TRADE'],
  model_must_set_next_24h_scan_tier:[1,4,12,24],
  historical_decision_will_not_be_assumed_an_actual_past_GPT_call:true
 };
 requireValid(facts.missing_source_categories.length<=20,'TOO_MANY_GAPS');
 return {payload:facts,payload_sha256:digest(JSON.stringify(facts)),
  asof_visibility_guards_passed:true,real_money_enabled:false,
  clean_model_session_required:true,
  independent_model_context_purity_proven:false};
}
export function validateDetachedGptReview(original,decision,{
 model_called_at_utc,model_response_sha256,model_response_json
}={}){
 requireValid(original?.asof_visibility_guards_passed===true,'BAD_SOURCE_FRAME');
 const at=timestamp(original.payload.virtual_asof_utc);
 requireValid(timestamp(model_called_at_utc)>=at,'GPT_CALL_CANNOT_BE_BACKDATED');
 requireValid(hex.test(model_response_sha256||'')&&
   digest(model_response_json||'')===model_response_sha256,
   'REAL_MODEL_RESPONSE_HASH_REQUIRED');
 requireValid(JSON.stringify(decision)===model_response_json,'MODEL_RESPONSE_DECISION_MISMATCH');
 requireValid(actions.has(decision.action),'INVALID_STRATEGIC_ACTION');
 requireValid([1,4,12,24].includes(decision.next_scan_tier),'GPT_NEXT_SCAN_TIER_REQUIRED');
 requireValid(str(decision.reason_de),'EXPLAINED_GPT_DECISION_REQUIRED');
 if(decision.action==='BUY'){
  requireValid(original.payload.phase==='TRADE_TEST','TRAINING_TRADE_NOT_ALLOWED');
  requireValid(Number.isFinite(decision.stake_test_usdc)&&decision.stake_test_usdc>=50&&
   decision.stake_test_usdc<=5000,'INVALID_GPT_STAKE');
  requireValid(str(decision.pool_address)&&str(decision.token_address),
   'BUY_IDENTITY_MISSING');
  const found=original.payload.market_events.some(e=>e.token_address===decision.token_address&&
    e.pool_address===decision.pool_address&&e.chain===decision.chain);
  requireValid(found,'GPT_MUST_BUY_DISCOVERED_SOURCE_CANDIDATE');
 }
 if(['HOLD','SELL'].includes(decision.action)){
  requireValid(original.payload.open_positions.some(p=>
   p.position_id===decision.position_id),'GPT_MUST_MANAGE_ACTUALLY_OPEN_POSITION');
 }
 return {status:'GPT_AUTHORED_RETROSPECTIVE_RESEARCH_NOT_EXECUTION',
  actual_model_called_at_utc:model_called_at_utc,
  virtual_asof_utc:original.payload.virtual_asof_utc,
  prompt_source_sha256:original.payload_sha256,
  model_response_sha256,action:decision.action,
  next_scan_tier:decision.next_scan_tier,
  actual_historical_gpt_call_claimed:false,paper_fill_test_usdc:null,
  realized_pnl_test_usdc:null};
}
