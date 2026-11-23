// R29 V2.4: bounded 8-token, one-hour retrospective neutral research slice.
// A GeckoTerminal PUBLIC GET in November CANNOT become an October as-of quote.
// Strictly no wallet, GPT, trade, or retrospective winner selection.
import {createHash} from 'node:crypto';
import {asOfMillis} from './v19-asof-evidence.mjs';
import {poolValid,tokenValid} from './market-evidence.mjs';
import {makeV23NeutralBatches} from './v23-oct12-neutral-mint-batches.mjs';
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
const END=asOfMillis('2026-10-13T00:00:00.000Z');
const URL='https://api.geckoterminal.com/api/v2/networks/solana/tokens/';
export function planV24GeckoHourlySlice({retrospective,hour}={}){
 if(!Number.isInteger(hour)||hour<0||hour>23)
  throw Error('INVALID_NEUTRAL_HOURLY_SLICE_INDEX');
 const plan=makeV23NeutralBatches({retrospective});
 const rows=plan.neutral_rows.slice(hour*8,(hour+1)*8);
 const requests=rows.map((r,i)=>({
  sample_hour_index:hour,
  row_index:i,source_observation_utc:r.retrospective_observed_at_utc,
  scan_at_utc:r.retrospective_scan_at_utc,mint:r.mint,
  url:URL+r.mint+'/pools?include=base_token,quote_token',
  source_class:'POST_EVENT_NEUTRAL_RESEARCH_ONLY',
  no_historical_knowledge_promotion:true
 }));
 if(rows.length!==8||new Set(rows.map(r=>r.mint)).size!==8||
  requests.some(r=>!tokenValid('solana',r.mint)))
  throw Error('UNEXPECTED_NEUTRAL_HOURLY_8_SAMPLE');
 return {schema:1,kind:'R29_V24_EIGHT_NEUTRAL_MINT_GECKO_HOURLY_RESEARCH',
  historical_date:'2026-10-12',historical_hour_index:hour,
  scans_in_universe:24,full_population_mints:192,
  sample_mints:8,http_requests_budget:8,
  provider_request_limit_per_minute:10,
  requests,all_provider_reads_postevent:true,
  original_october_discovery_proven:false,
  original_historical_buy_sell_quotes_proven:false,
  oracle_winner_seed_used:false,no_orders:true};
}
export function interpretV24GeckoHourlyResponse({query,receipt}={}){
 if(!query||!Number.isInteger(query.sample_hour_index)
  ||query.sample_hour_index<0||query.sample_hour_index>23
  ||!Number.isInteger(query.row_index)||query.row_index<0||query.row_index>=8
  ||!tokenValid('solana',query.mint)
  ||query.url!==URL+query.mint+'/pools?include=base_token,quote_token'
  ||receipt?.url!==query.url||receipt?.method!=='GET'
  ||asOfMillis(receipt.captured_at_utc)===null
  ||asOfMillis(receipt.captured_at_utc)<=END
  ||!Number.isInteger(receipt.http_status)||receipt.http_status<0||receipt.http_status>599
  ||typeof receipt.raw_text!=='string'||sha(receipt.raw_text)!==receipt.raw_sha256)
  throw Error('V24_INVALID_HTTP_SHA_OR_EXACT_MINT_SOURCE');
 const base={mint:query.mint,historical_hour_index:query.sample_hour_index,
  captured_at_utc:receipt.captured_at_utc,http_status:receipt.http_status,
  raw_sha256:receipt.raw_sha256,return_pools:[],
  historical_provider_delivery_proven:false,
  historical_quote_valid:false,
  historical_pool_discoverability_verified:false,
  original_sellability_verified:false,trade_authorized:false};
 if(receipt.http_status!==200)
  return {...base,status:'PUBLIC_SOURCE_FAILURE_OR_RATE_LIMIT_COVERAGE_UNKNOWN'};
 let data;try{data=JSON.parse(receipt.raw_text)}catch{
  return {...base,status:'MALFORMED_PROVIDER_JSON_COVERAGE_UNKNOWN'};}
 if(!Array.isArray(data?.data)||data.data.length>100)
  return {...base,status:'INVALID_OR_TOO_LARGE_PROVIDER_POOL_PAGE'};
 const included=new Map((Array.isArray(data.included)?data.included:[])
  .filter(x=>typeof x?.id==='string').map(x=>[x.id,x]));
 const seen=new Set(),pools=[];
 let missingExactMint=0;
 for(const x of data.data){
  const addr=x?.attributes?.address;
  if(!poolValid('solana',addr))continue;
  const tokenRefs=[x?.relationships?.base_token?.data?.id,
   x?.relationships?.quote_token?.data?.id];
  const tokens=tokenRefs.map(t=>included.get(t)?.attributes?.address);
  if(!tokens.includes(query.mint)){missingExactMint++;continue;}
  if(seen.has(addr))continue;
  seen.add(addr);
  pools.push({chain:'solana',mint:query.mint,pool:addr,
   source_class:'POST_EVENT_CURRENT_GECKO_POOL_ASSOCIATION',
   original_october_discovery_proven:false,
   trade_authorized:false});
 }
 return {...base,status:pools.length
  ?'NOVEMBER_CURRENT_EXACT_MINT_POOL_ASSOCIATION_ONLY'
  :'HTTP200_NO_VERIFIED_IDENTITY_COVERAGE_UNKNOWN',
  return_pools:pools,
  reported_provider_rows:data.data.length,
  rejected_no_exact_included_mint:missingExactMint};
}
export function summarizeV24GeckoHourlySlice({plan,observations}={}){
 if(plan?.kind!=='R29_V24_EIGHT_NEUTRAL_MINT_GECKO_HOURLY_RESEARCH'
  ||!Array.isArray(observations)||observations.length!==8
  ||observations.some((x,i)=>x?.mint!==plan.requests[i].mint
   ||x?.historical_hour_index!==plan.historical_hour_index
   ||x.historical_provider_delivery_proven!==false
   ||x.trade_authorized!==false))
  throw Error('INVALID_V24_EIGHT_NEUTRAL_PROVIDER_RESULTS');
 const covered=observations.filter(x=>x.return_pools.length>0),pools=covered.flatMap(x=>x.return_pools);
 return {schema:1,kind:'R29_V24_NEUTRAL_HOURLY_MINT_TO_POOL_COVERAGE_REPORT',
  historical_hour_index:plan.historical_hour_index,
  neutral_sampled_mints:8,public_provider_requests:8,
  http200:observations.filter(x=>x.http_status===200).length,
  provider_error_or_rate_limit_count:observations.filter(x=>x.http_status!==200).length,
  currently_identifiable_mints:covered.length,
  currently_identifiable_pool_links:pools.length,
  unknown_current_identity_mints:8-covered.length,
  per_mint:observations,
  identities_from_neutral_archive_not_oracle:true,
  actual_october_provider_delivery_verified:false,
  historical_50_usdc_buy_sell_quote_count:0,
  historical_sellability_verified_count:0,
  discovered_65_winners_validated_count:0,
  original_october_market_population_complete:false,
  original_gpt_dot_executions:0,
  actual_paper_orders:0};
}
