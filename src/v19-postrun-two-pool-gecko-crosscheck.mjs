// R29: TWO CURRENT-provider domains + retrospective OHLCV research only.
// This is NEVER evidence of execution or historical provider deliverability.
// Safe because this module runs only on a frozen post-decision 192-mint
// DexScreener artifact and cannot be consumed by any Dot trading gate.
import {createHash} from 'node:crypto';
import {asOfMillis} from './v19-asof-evidence.mjs';
import {tokenValid,poolValid} from './market-evidence.mjs';

const digest=t=>createHash('sha256').update(Buffer.from(t,'utf8')).digest('hex');
const TEST_END=asOfMillis('2026-10-13T00:00:00.000Z');
const format=t=>new Date(t).toISOString();

export function makeTwoPoolGeckoResearchPlan(dexReport){
 if(dexReport?.kind!=='R29_V19_POSTRUN_DEX_MINT_POOL_IDENTITY_RESEARCH_ONLY'
   ||dexReport?.never_eligible_to_seed_historical_discovery!==true
   ||dexReport?.never_eligible_for_entry_or_exit_quotes!==true
   ||dexReport.current_provider_mints_with_any_pool!==2
   ||dexReport.currently_reported_pool_hints!==2
   ||dexReport.original_neutral_sample_count!==192
   ||!Array.isArray(dexReport.candidate_rows)
   ||dexReport.candidate_rows.length!==192)
  throw Error('UNTRUSTED_OR_NOT_PRECOMMITTED_TWO_POOL_POSTRUN_REPORT');
 const matched=dexReport.candidate_rows
  .filter(x=>x.current_provider_pool_pair_count>0)
  .sort((a,b)=>a.scan-b.scan);
 const tasks=[];
 for(const record of matched){
  if(!tokenValid('solana',record.mint)
    ||!(record.scan===3||record.scan===19)
    ||record.current_provider_token_pairs.length!==1
    ||asOfMillis(record.scan_at_utc)===null)
   throw Error('TWO_POOL_RESEARCH_PAIR_IDENTITY_CHANGED');
  const pair=record.current_provider_token_pairs[0];
  if(!poolValid('solana',pair.pool_address)
    ||pair.original_october_quote_verified!==false
    ||pair.original_october_sellability_verified!==false
    ||pair.permitted_as_2026_10_12_live_quote!==false
    ||!tokenValid('solana',pair.quote_asset_address))
   throw Error('CURRENT_POOL_HINT_IS_NOT_VERIFIED_HISTORICAL_QUOTE');
  const base='https://api.geckoterminal.com/api/v2/networks/solana/pools/'+pair.pool_address;
  const hourSec=Math.floor(asOfMillis(record.scan_at_utc)/1000);
  tasks.push({index:tasks.length+1,mint:record.mint,pool:pair.pool_address,
   scan:record.scan,scan_at_utc:record.scan_at_utc,
   dex_quote_asset_address:pair.quote_asset_address,
   kind:'CURRENT_POOL_IDENTITY',
   url:base+'?include=base_token,quote_token'});
  tasks.push({index:tasks.length+1,mint:record.mint,pool:pair.pool_address,
   scan:record.scan,scan_at_utc:record.scan_at_utc,
   dex_quote_asset_address:pair.quote_asset_address,
   kind:'RETROSPECTIVE_MINUTE_OHLCV',
   url:base+'/ohlcv/minute?aggregate=1&before_timestamp='+hourSec+
     '&currency=usd&limit=100&token='+record.mint});
 }
 if(tasks.length!==4)throw Error('FOUR_BOUNDED_RESEARCH_CALLS_ONLY');
 return tasks;
}
export function evaluateGeckoPoolAndOldCandles({dexReport,pages}={}){
 const plan=makeTwoPoolGeckoResearchPlan(dexReport);
 if(!Array.isArray(pages)||pages.length!==4)
  throw Error('EXPECTED_FOUR_POSTRUN_GECKO_CAPTURES');
 const receipts=[],byTask=new Map();
 let failed=0;
 for(const [i,expected] of plan.entries()){
  const p=pages[i],captured=asOfMillis(p?.captured_at_utc);
  if(p?.index!==expected.index||p.url!==expected.url
    ||p.kind!==expected.kind||p.mint!==expected.mint||p.pool!==expected.pool
    ||captured===null||captured<=TEST_END
    ||!Number.isInteger(p.http_status)
    ||typeof p.raw_text!=='string'||typeof p.sha256!=='string'
    ||! /^[0-9a-f]{64}$/.test(p.sha256)
    ||p.sha256!==digest(p.raw_text))
   throw Error('UNTRUSTED_SECOND_PROVIDER_RAW_RESPONSE_'+i);
  const record={source:'GECKOTERMINAL',index:i+1,pool:p.pool,mint:p.mint,
   kind:p.kind,captured_at_utc:p.captured_at_utc,http_status:p.http_status,
   source_url:p.url,raw_sha256:p.sha256,
   source_http_raw_bytes:Buffer.byteLength(p.raw_text,'utf8'),
   historical_original_provider_capture:false};
  receipts.push(record);
  if(p.http_status!==200){failed++;byTask.set(p.index,null);continue;}
  try{byTask.set(p.index,JSON.parse(p.raw_text))}
  catch{failed++;record.parse_error=true;byTask.set(p.index,null);}
 }
 let exact=0,candles=0;
 const rows=plan.filter(p=>p.kind==='CURRENT_POOL_IDENTITY').map(item=>{
  const current=byTask.get(item.index);
  const ohlcv=byTask.get(item.index+1);
  const poolAttr=current?.data?.attributes;
  const poolAddress=poolAttr?.address;
  const base=current?.data?.relationships?.base_token?.data?.id;
  const quote=current?.data?.relationships?.quote_token?.data?.id;
  const ids=[base,quote];
  const exactPool=poolAddress===item.pool
    &&ids.includes('solana_'+item.mint)
    &&ids.includes('solana_'+item.dex_quote_asset_address);
  if(exactPool)exact++;
  const rawCandles=ohlcv?.data?.attributes?.ohlcv_list;
  const scanned=asOfMillis(item.scan_at_utc);
  const valid=[];
  if(Array.isArray(rawCandles)){
   for(const candle of rawCandles){
    if(!Array.isArray(candle)||candle.length<6)continue;
    const [sec,open,high,low,close,volume]=candle;
    if(!Number.isSafeInteger(sec)||sec<1
      ||![open,high,low,close].every(z=>typeof z==='number'&&Number.isFinite(z)&&z>0)
      ||!Number.isFinite(volume)||volume<0||high<low
      ||open>high||open<low||close>high||close<low)continue;
    const at=sec*1000;
    // A 1-minute candle must have CLOSED before the virtual scanner.
    if(at+60000>scanned||at<scanned-100*60000)continue;
    valid.push({minute_start_utc:format(at),minute_closed_utc:format(at+60000),
     observed_post_event_usd_ohlcv:[open,high,low,close],volume_reported:volume,
     available_to_actual_october_bot_independently_verified:false,
     exact_50_usdc_buy_sell_quote:false});
   }
  }
  valid.sort((a,b)=>a.minute_start_utc.localeCompare(b.minute_start_utc));
  candles+=valid.length;
  return {scan:item.scan,scan_at_utc:item.scan_at_utc,mint:item.mint,
   pool_address:item.pool,current_second_provider_pool_exact_mint_match:exactPool,
   current_second_provider_independent_upstream_attested:false,
   latest_eligible_closed_minute_candle_posthoc:valid.at(-1)??null,
   postevent_reported_closed_candle_count:valid.length,
   historic_provider_delivered_this_candle_at_october_scan:false,
   historical_50_usdc_buy_sell_quote_verified:false,
   historical_safety_sellability_attested:false,
   evidence_status:exactPool
    ?'CURRENT_SECOND_PROVIDER_POOL_IDENTITY_CORROBORATED_NOT_HISTORIC'
    :'SECOND_PROVIDER_IDENTITY_NOT_CONFIRMED_OR_NOT_LISTED',
   quote_status:valid.length
    ?'AFTER_EVENT_OHLCV_PRICE_RECONSTRUCTION_ONLY'
    :'NO_VALID_CLOSED_OHLCV_IN_REQUESTED_SCAN_LOOKBACK'};
 });
 return {schema:1,kind:'R29_V19_POSTRUN_TWO_PROVIDER_POOL_AND_HISTORIC_OHLCV_DIAGNOSTIC',
  all_requests_post_historic:pages.every(x=>asOfMillis(x.captured_at_utc)>TEST_END),
  date:'2026-10-12',pool_research_targets:2,
  source_provider:'GECKOTERMINAL',
  raw_response_count:receipts.length,failed_or_missing_http_responses:failed,
  currently_crossprovider_exact_pool_mint_quote_matches:exact,
  postevent_candle_rows_in_two_query_windows:candles,
  safely_historical_provider_attested_candles:0,
  historically_executable_buy_quote_count:0,historically_executable_sell_quote_count:0,
  independently_authenticated_october_sellability:0,
  actual_paper_orders_created:0,
  postrun_ohlcv_not_an_execution_bid_ask_quote:true,
  original_october_model_decisions_untouched:true,
  all_100pct_winner_market_universe_known:false,
  never_eligible_for_replay_or_live_paper_orders:true,
  provider_http_capture_receipts:receipts,results:rows};
}
