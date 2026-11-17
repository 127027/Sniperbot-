// R29 FIRST OUTCOME AUDIT after an immutable GPT-authored AS-OF 00:05
// review already exists in Github; never changes earlier recommendations.
// Read one neutral archive hour completely (large) and show same-pool future
// movements vs earlier mark, NOT own executable trades or realized PnL.
import {Readable} from 'node:stream';
import {createZstdDecompress} from 'node:zlib';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const SOURCE='https://replay.shrine.trade/pump/2026/09/18/00.jsonl.zst';
const ASOF=Date.parse('2026-09-18T00:05:00Z'),START=Date.parse('2026-09-18T00:00:00Z'),
 END=Date.parse('2026-09-18T01:00:00Z');
const REVIEW_PATH='research/replay-120d-real/reviews/2026-11-17-first-five-minute-gpt-neutral-asof-decision-before-outcomes.json';
const REVIEW_BLOB_SHA='4ea19150ffa1edb4f6712f98f04465b0bc92c447';
const originalSourceHash='8ffb70fff70711208dba6aef76a526f768a51491bc52f0d8f415de36dd54fbb1';
const ms=x=>typeof x==='number'&&Number.isFinite(x)?(x<1e12?x*1000:x):NaN;
const numeric=x=>typeof x==='number'&&Number.isFinite(x)&&x>0?x:null;
const iso=t=>new Date(t).toISOString();
const validateReview=()=>{
 const content=readFileSync(REVIEW_PATH,'utf8');
 const h=createHash('sha1').update('blob '+Buffer.byteLength(content)+'\0').update(content).digest('hex');
 if(h!==REVIEW_BLOB_SHA)throw Error('FROZEN_GPT_REVIEW_CHANGED_OR_NOT_PRECOMMITTED');
 const r=JSON.parse(content);
 if(r.virtual_asof_utc!=='2026-09-18T00:05:00Z'||
   r.source_prefix_asof_event_lines_sha256!==originalSourceHash||
   r.future_outcome_audit_permitted_only_after_this_review_frozen!==true||
   r.decisions.length!==3)throw Error('FROZEN_GPT_REVIEW_CONTRACT_INVALID');
 return r;
};
function firstHit(e,when){
 return {at_utc:iso(when),price_original_sol:numeric(e.price),
 token_amount:numeric(e.tokenAmount),quote_amount_sol:numeric(e.quoteAmount),
 quote_reserve_sol:numeric(e.quoteInPool),transaction_signature_sha256:
  createHash('sha256').update(String(e.signature||'UNKNOWN')).digest('hex')};
}
export function summarizeAfterScan(review,frame,observations){
 const results=review.decisions.map(d=>{
  const c=frame.ranked_neutral_cohort_not_all_market.find(x=>
   x.token_address===d.token_address&&x.pool_address===d.pool_address);
  if(!c)throw Error('FROZEN_DECISION_NOT_IN_NEUTRAL_ASOF_SOURCE');
  const o=observations.find(x=>x.mint===d.token_address&&x.pool===d.pool_address)||null;
  const entry=numeric(c.most_recent_trade_price_original_quote);
  const peak=o?.peak?.price_original_sol||null;
  const last=o?.last?.price_original_sol||null;
  return {chain:d.chain,token_address:d.token_address,pool_address:d.pool_address,
    frozen_research_action:d.action,
    asof_utc:review.virtual_asof_utc,
    early_asof_quote_currency:c.quote_currency,
    earliest_asof_quote_mark_original_sol:entry,
    asof_source_record_buy_count:c.observed_buys,
    asof_source_record_sell_count:c.observed_sells,
    later_source_event_count:o?.events||0,
    later_same_pool_buys:o?.buys||0,later_same_pool_sells:o?.sells||0,
    earliest_later_trade:o?.first||null,
    earliest_later_sell_trade:o?.firstSell||null,
    highest_later_recorded_trade:o?.peak||null,
    lowest_later_recorded_trade:o?.trough||null,
    last_recorded_trade_before_01utc:o?.last||null,
    hypothetical_absolute_max_change_percent:entry&&peak?Number(((peak/entry-1)*100).toFixed(4)):null,
    hypothetical_last_change_percent:entry&&last?Number(((last/entry-1)*100).toFixed(4)):null,
    original_asof_action_revised:false,
    own_50_to_5000_usdc_executable_buy_sell_fills_proven:false,
    external_traders_swap_prices_are_not_personal_fills:true,
    original_quote_asset_price_is_not_usdc_price:true,
    realized_test_usdc_pnl:null};
 });
 return results;
}
export async function auditLaterHour({fetcher=fetch,framePath}={}){
 const review=validateReview();
 if(!framePath)throw Error('ORIGINAL_NEUTRAL_ASOF_FRAME_REQUIRED');
 const frame=JSON.parse(readFileSync(framePath,'utf8'));
 if(frame.virtual_asof_utc!=='2026-09-18T00:05:00.000Z'||
   frame.source_prefix_asof_event_lines_sha256!==originalSourceHash||
   frame.stream_stopped_at_first_later_event!==true)throw Error('ORIGINAL_NEUTRAL_FRAME_MISMATCH');
 const targets=review.decisions.map(d=>({mint:d.token_address,pool:d.pool_address}));
 const byKey=new Map(targets.map(x=>[x.mint+':'+x.pool,{
  mint:x.mint,pool:x.pool,events:0,buys:0,sells:0,first:null,
  firstSell:null,peak:null,trough:null,last:null}]));
 const abort=new AbortController();
 const timeout=setTimeout(()=>abort.abort(),9*60_000);
 let input,decoder,lines;
 try{
  const response=await fetcher(SOURCE,{redirect:'error',signal:abort.signal});
  if(!response.ok||!response.body)throw Error('FAILED_HOUR_COMPLETE_SOURCE_'+response.status);
  input=Readable.fromWeb(response.body);
  decoder=createZstdDecompress();
  input.pipe(decoder);
  lines=createInterface({input:decoder,crlfDelay:Infinity});
  const hourHash=createHash('sha256'),prefixHash=createHash('sha256');
  let events=0,afterEvents=0,malformed=0,untrusted=0,
   prefixCount=0,sawAnyAfterCutoff=false,sawTailHour=false;
  for await(const line of lines){
   if(!line)continue;
   hourHash.update(line+'\n');events++;
   let e;
   try{e=JSON.parse(line)}catch{malformed++;continue}
   const observed=ms(e.localTimestamp),eventAt=ms(e.timestamp);
   if(!Number.isFinite(observed)||!Number.isFinite(eventAt)||observed<START||
     observed>=END+60000||eventAt>observed+60000){untrusted++;continue}
   if(observed<=ASOF&&eventAt<=ASOF){
    prefixHash.update(line+'\n');prefixCount++;
    continue;
   }
   if(observed<ASOF){untrusted++;continue}
   sawAnyAfterCutoff=true;
   if(observed>=END)sawTailHour=true;
   if(!['buy','sell'].includes(e.action)||!Number.isFinite(observed)||observed>=END)continue;
   afterEvents++;
   const key=e.mint+':'+e.pool;
   const o=byKey.get(key);
   if(!o)continue;
   o.events++;
   if(e.action==='buy')o.buys++;else o.sells++;
   const price=numeric(e.price);
   if(price===null)continue;
   const hit=firstHit(e,observed);
   if(!o.first)o.first=hit;
   if(e.action==='sell'&&!o.firstSell)o.firstSell=hit;
   if(!o.peak||hit.price_original_sol>o.peak.price_original_sol)o.peak=hit;
   if(!o.trough||hit.price_original_sol<o.trough.price_original_sol)o.trough=hit;
   o.last=hit;
  }
  const actualPrefixHash=prefixHash.digest('hex');
  if(actualPrefixHash!==originalSourceHash)throw Error('ORIGINAL_ASOF_EVENT_PREFIX_DIFFERS_FROM_FROZEN_RESEARCH');
  if(!sawAnyAfterCutoff)throw Error('LATER_HOUR_NOT_SEEN');
  const outcomes=summarizeAfterScan(review,frame,[...byKey.values()]);
  return {schema:'r29_posthoc_first_historical_5min_gpt_review_later_hour_actual_swap_marks.v1',
   review_git_blob_sha:REVIEW_BLOB_SHA,
   first5_source_prefix_sha256:originalSourceHash,
   entire_historical_hour_computed_event_lines_sha256:hourHash.digest('hex'),
   same_source_archive_url:SOURCE,
   no_future_outcomes_seen_by_model_before_precommitted_review:true,
   source_events_total:events,events_seen_after_asof:afterEvents,
   prefix_event_count_verified:prefixCount,
   malformed_event_lines:malformed,untrusted_event_timestamps:untrusted,
   source_had_later_events:sawAnyAfterCutoff,
   source_last_event_reached_hour_end_or_later:sawTailHour,
   review_belongs_to_same_retrospective_conversation_not_clean_model_context:true,
   all_initial_actions_preserved:true,
   outcome_from_other_peoples_executed_swaps_not_proof_of_own_fill:true,
   USDC_to_SOL_fx_quote_verified:false,
   source_archive_only_sol_price_not_automatically_usdc:true,
   5000_test_usdc_start_not_used:5000,
   5000_test_usdc_verifiable_final_equity:null,
   confirmed_own_paper_buys:0,confirmed_own_paper_sells:0,
   outcomes};
 }finally{
  clearTimeout(timeout);
  try{lines?.close()}catch{}
  try{input?.destroy()}catch{}
  try{decoder?.destroy()}catch{}
  try{abort.abort()}catch{}
 }
}
if(process.argv[1]?.endsWith('audit-frozen-first5-gpt-future-hour.mjs')){
 try{
  const report=await auditLaterHour({framePath:process.argv[2]});
  const target=resolve(process.argv[3]);
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,JSON.stringify(report,null,2)+'\n');
  console.log('R29_FIRST_FROZEN_GPT_ASOF_POSTHOC',JSON.stringify({
   raw_hour_events:report.source_events_total,prefix_events:report.prefix_event_count_verified,
   matched_source:report.outcomes.map(o=>({
    action:o.frozen_research_action,
    mint:o.token_address,
    trades_after:o.later_source_event_count,
    max_relative_change_pct:o.hypothetical_absolute_max_change_percent,
    last_relative_change_pct:o.hypothetical_last_change_percent
   })),
   no_personal_historical_fills:true}));
 }catch(e){console.error('R29_FROZEN_FIRST_5M_POSTHOC_FAILED',String(e.message||e));process.exitCode=1;}
}
