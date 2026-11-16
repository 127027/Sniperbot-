// Real external Solana swaps: explicitly limited FREE historical sample for 2026-10-15.
// This does not claim complete 120-day price coverage, exchange execution,
// historical GPT trading, token risk clearance, or a buyable/sellable pool.
// All proof is third-party retrospective and is NOT proof of at-time publication.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';

export const SAMPLE_DAY='2026-10-15';
export const DATASET='pumpdatafun/pump-fun-trades-sample';
export const WRAPPED_SOL='So11111111111111111111111111111111111111112';
export const SOURCE_URL='https://datasets-server.huggingface.co/rows?dataset='+
 encodeURIComponent(DATASET)+'&config=default&split=train&offset=0&length=100';
const hash=x=>createHash('sha256').update(x).digest('hex');
const number=x=>x===null||x===undefined?NaN:Number(x);
export function sanitizeTradeRow(row){
 if(!row||typeof row!=='object')throw Error('HISTORICAL_TRADE_ROW_INVALID');
 const ts=number(row.ts),slot=number(row.slot),idx=number(row.idx);
 const mint=row.mint,pool=row.pool,venue=row.venue,side=row.side;
 const maybeAmount=x=>x===null||x===undefined?null:Number(x);
 const amountSol=maybeAmount(row.sol_lamports);
 const amountTokens=maybeAmount(row.token_amount);
 const quoteMint=row.quote_mint,quoteAmount=maybeAmount(row.quote_amount);
 const amounts=[amountSol,amountTokens,quoteAmount];
 // Failed transactions may have NO executed amounts. Treat missing amounts
 // as unknown (null), not zero, and never derive prices from failed tx.
 const validAmounts=amounts.every(x=>x===null||
  (Number.isFinite(x)&&x>=0))&&
  (row.failed===true||amounts.every(Number.isFinite));
 if(!Number.isInteger(ts)||ts<Date.parse(SAMPLE_DAY+'T00:00:00Z')/1000||
 ts>=Date.parse('2026-10-16T00:00:00Z')/1000||
 !Number.isSafeInteger(slot)||!Number.isInteger(idx)||
 typeof mint!=='string'||mint.length<32||mint.length>44||
 !['curve','pumpswap'].includes(venue)||!['buy','sell'].includes(side)||
 !validAmounts||
 ![true,false].includes(row.failed))
  throw Error('HISTORICAL_TRADE_ROW_INVALID_OR_OTHER_DAY');
 return {
  chain:'solana',mint,pool:typeof pool==='string'?pool:null,
  at_utc:new Date(ts*1000).toISOString(),slot,idx,seq:Number(row.seq)||0,
  venue,side,failed:row.failed,
  sol_lamports:amountSol,raw_token_amount:amountTokens,
  quote_mint:quoteMint,quote_amount_raw:quoteAmount,
  quote_is_wrapped_SOL:quoteMint===WRAPPED_SOL,
  // No token decimals, cross-pool routing, or executable swap details yet.
  approximate_sol_per_raw_token:(!row.failed&&quoteMint===WRAPPED_SOL&&
    amountTokens!==null&&amountTokens>0&&quoteAmount!==null)
    ?quoteAmount/1e9/amountTokens:null,
  source:'REAL_ARCHIVED_SOLANA_TRADE_EVENT_RETRIEVED_RETROSPECTIVELY',
  historically_executable_again:false,
  independently_verified_onchain_signature:false
 };
}
export function visibleTradeEvents(rows,{asof_utc}={}){
 const t=Date.parse(asof_utc);
 if(!Number.isFinite(t)||!Array.isArray(rows))throw Error('HISTORIC_TRADE_ASOF_INPUT_INVALID');
 return rows.filter(r=>Date.parse(r.at_utc)<=t);
}
export function safeHistoricalTradeReview(rows,{asof_utc,desired_mint}={}){
 const visible=visibleTradeEvents(rows,{asof_utc}).filter(x=>x.mint===desired_mint)
  .sort((a,b)=>a.at_utc.localeCompare(b.at_utc)||a.slot-b.slot||a.idx-b.idx||a.seq-b.seq);
 const executed=visible.filter(x=>x.failed===false);
 const successfulBuyerCount=new Set(executed.filter(x=>x.side==='buy').map(x=>x.wallet).filter(Boolean)).size;
 return {
  at_utc:asof_utc,chain:'solana',mint:desired_mint,
  observed_samples_only:true,full_market_sample_complete:false,
  verified_historical_market_price_quotes:false,
  historically_executable_swap_quotes:false,
  independent_contract_security:false,
  independent_sellability:false,
  independently_verified_buyers:false,
  evidence_events:visible.length,successful_events:executed.length,
  buy_events_observed:executed.filter(x=>x.side==='buy').length,
  sell_events_observed:executed.filter(x=>x.side==='sell').length,
  // Must not assert "no buyers" if 100-row sample shows no matching events.
  claimed_total_organic_buyers:null,
  independently_claimed_historic_gpt_buy_decision:null,
  action_for_safety_gate:'NO_TRADE_DATA_GAP'
 };
}
export async function probeRealFreeSample({fetcher=fetch}={}){
 const controller=new AbortController();
 const response=await fetcher(SOURCE_URL,{headers:{accept:'application/json'},
  signal:controller.signal});
 if(!response.ok)throw Error('DATASET_HTTP_'+response.status);
 const text=await response.text();
 if(text.length>300000)throw Error('DATASET_SAMPLE_TOO_LARGE');
 let data;try{data=JSON.parse(text)}catch{throw Error('DATASET_NOT_JSON')}
 if(!Array.isArray(data.rows)||data.rows.length===0||data.rows.length>100)
  throw Error('DATASET_ROWS_UNAVAILABLE');
 const rejected=[];
 const records=[];
 for(const {row} of data.rows){
  try{records.push(sanitizeTradeRow(row))}
  catch(e){
   rejected.push({reason:String(e.message||e),
    fields:Object.fromEntries(['ts','slot','idx','mint','pool','venue',
      'side','failed','quote_mint','sol_lamports','token_amount','quote_amount']
     .map(key=>[key,{type:typeof row?.[key],
      value:row?.[key]===null?'NULL':String(row?.[key]??'UNDEFINED').slice(0,72)}]))});
  }
 }
 if(!records.length)throw Error('NO_COMPATIBLE_REAL_TRADE_ROWS_'+
  JSON.stringify(rejected.slice(0,3)));
 const earliest=records.reduce((m,r)=>r.at_utc<m?r.at_utc:m,records[0].at_utc);
 const latest=records.reduce((m,r)=>r.at_utc>m?r.at_utc:m,records[0].at_utc);
 const marketTokens=[...new Set(records.map(r=>r.mint))];
 const decisionAsOf=new Date(Math.min(Date.parse('2026-10-16T00:00:00Z')-1,
  Date.parse(earliest)+60*1000)).toISOString();
 const observations=marketTokens.slice(0,3).map(mint=>
  safeHistoricalTradeReview(records,{desired_mint:mint,asof_utc:decisionAsOf}));
 return {
  schema:'sniper_r29_real120_free_one_day_sol_trade_probe.v1',
  provider:'HUGGINGFACE_DATASET_VIEWER_PUBLIC',
  dataset:DATASET,utc_day:SAMPLE_DAY,source_url:SOURCE_URL,
  sha256_raw_http_response:hash(text),
  preview_rows:records.length,source_row_count:data.rows.length,
  discarded_incompatible_rows:rejected.length,
  incompatible_row_examples:rejected.slice(0,3),
  distinct_mints_in_preview:marketTokens.length,
  earliest_at_utc:earliest,latest_at_utc:latest,
  source_sample_is_first_page_not_random_or_complete:true,
  entire_one_day_dataset_reported_rows:42230410,
  dataset_reported_row_count_NOT_VERIFIED_HERE:true,
  executed_rows_in_preview:records.filter(r=>!r.failed).length,
  failed_rows_in_preview:records.filter(r=>r.failed).length,
  actual_trade_row_examples:records.slice(0,6),
  asof_safe_preliminary_reviews:observations,
  future_rows_included_in_decision_frames:false,
  verified_spot_USDC_entry_or_exit_available:false,
  complete_market_pools_available:false,
  no_rug_label_leaked:true,no_historical_GPT_model_orders:true,
  no_trade_fills:true,no_wallet_touched:true,
  limitation:'FIRST_100_RECORDS_ONLY_LARGE_DATASET_NOT_A_HISTORIC_FULL_COIN_PRICE_SERIES'};
}
const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
 const report=await probeRealFreeSample();
 const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'generated');
 mkdirSync(folder,{recursive:true});
 writeFileSync(path.join(folder,'real-2026-10-15-trade-sample-proof.json'),
  JSON.stringify(report,null,2)+'\n');
 console.log('REAL_Dex_SAMPLE_PROBE '+JSON.stringify({
  status:'SUCCEEDED',preview_rows:report.preview_rows,
  distinct_mints:report.distinct_mints_in_preview,
  source_rows:report.source_row_count,discarded:report.discarded_incompatible_rows,
  first_incompatible_examples:report.incompatible_row_examples.slice(0,2),
  executed:report.executed_rows_in_preview,failed:report.failed_rows_in_preview,
  sha256:report.sha256_raw_http_response,
  earliest:report.earliest_at_utc,latest:report.latest_at_utc,
  no_historic_trades_executed:true
 }));
}
