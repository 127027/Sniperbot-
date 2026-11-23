// R29 V2.3 - research-only current pool association for a historically
// neutral 192-mint post-event Solana sample. NEVER trade, backdate provider
// delivery, leak winners into Dot2, or claim all market pools were covered.
import {createHash} from 'node:crypto';
import {poolValid,tokenValid} from './market-evidence.mjs';
import {asOfMillis} from './v19-asof-evidence.mjs';

export const R29_V23_BATCH_SIZE=30;
export const R29_V23_MAX_HTTP_REQUESTS=7;
export const R29_V23_OCTOBER_END='2026-10-13T00:00:00.000Z';
const END=asOfMillis(R29_V23_OCTOBER_END);
const sha=raw=>createHash('sha256').update(raw,'utf8').digest('hex');
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const fail=code=>{throw Error('R29_V23_'+code);};
const validMint=m=>tokenValid('solana',m);
const validPool=p=>poolValid('solana',p);
const URL='https://api.dexscreener.com/tokens/v1/solana/';

export function makeV23NeutralBatches({retrospective,limit=30}={}){
 if(!retrospective||retrospective.kind!=='R29_V19_POSTRUN_RETROSPECTIVE_NEUTRAL_24_HOURS'
  ||retrospective.archive_released_after_historical_test!==true
  ||retrospective.never_eligible_to_seed_historical_discovery!==true
  ||retrospective.never_eligible_for_entry_or_exit_quotes!==true
  ||retrospective.original_provider_delivered_during_october_independently_verified!==false
  ||!Array.isArray(retrospective.per_hour)||retrospective.per_hour.length!==24
  ||retrospective.distinct_sample_mints!==192||retrospective.sampled_mint_occurrences!==192
  ||limit!==R29_V23_BATCH_SIZE)fail('NEUTRAL_INPUT_NOT_PINNED_192');
 const seen=new Set(),mints=[],rows=[];
 for(let h=0;h<24;h++){
  const hour=retrospective.per_hour[h],scan='2026-10-12T'+String(h).padStart(2,'0')+':00:00.000Z';
  if(hour?.scan!==h+1||hour?.at_utc!==scan
    ||hour.quote_and_sellability_status!=='NOT_VERIFIED_NOT_A_TRADE_DECISION'
    ||!Array.isArray(hour.postrun_neutral_mint_sample)
    ||hour.postrun_neutral_mint_sample.length!==8)
   fail('HOUR_OR_SAMPLE_UNTRUSTED_'+h);
  for(const item of hour.postrun_neutral_mint_sample){
   if(item?.chain!=='solana'||!validMint(item.mint)
    ||item.provenance!=='POST_EVENT_NEUTRAL_ARCHIVE_RESEARCH_ONLY'
    ||item.exact_pool!==null
    ||item.tradable_usdc_quote_verified!==false
    ||item.sellability_original_verified!==false
    ||item.source_provider_delivered_asof_verified!==false
    ||asOfMillis(item.source_observed_at_utc)===null
    ||asOfMillis(item.source_observed_at_utc)>asOfMillis(scan)
    ||seen.has(item.mint))fail('SAMPLE_IDENTITY_OR_DEDUP_'+h);
   seen.add(item.mint);mints.push(item.mint);
   rows.push({mint:item.mint,retrospective_scan_at_utc:scan,
    retrospective_observed_at_utc:item.source_observed_at_utc});
  }
 }
 if(mints.length!==192)fail('NEUTRAL_SAMPLE_NOT_192_DISTINCT_MINTS');
 const batches=[];
 for(let i=0;i<mints.length;i+=limit){
  const part=mints.slice(i,i+limit);
  batches.push({index:batches.length,mints:part,url:URL+part.join(','),
   expected_http_method:'GET',requested_chain:'solana',read_only:true,
   provider_capture_occurs_after_october:true,
   original_october_discovery_or_quotes_proven:false,
   oracle_winner_selection_used:false});
 }
 if(batches.length!==7||batches.some(b=>b.mints.length>30))fail('MAX_BATCH_REQUESTS');
 return {schema:1,kind:'R29_V23_NEUTRAL_POSTRUN_MINT_BATCH_PLAN',
  historical_date:'2026-10-12',source_scans:24,
  unique_mints:mints.length,request_count:batches.length,
  provider:'DEXSCREENER_PUBLIC_TOKEN_BATCH_LOOKUP',
  requests:batches,neutral_rows:rows,
  no_winner_oracle_input:true,all_provider_captures_post_event:true,
  no_trading_or_asof_promotion:true};
}

export function assessV23DexBatch({batch,receipt}={}){
 if(!batch||!Array.isArray(batch.mints)||batch.mints.length<1
  ||batch.mints.length>30||!batch.mints.every(validMint)
  ||new Set(batch.mints).size!==batch.mints.length
  ||batch.url!==URL+batch.mints.join(',')
  ||!Number.isInteger(batch.index)||batch.index<0||batch.index>=7
  ||!receipt||receipt.http_method!=='GET'||receipt.endpoint!==batch.url
  ||asOfMillis(receipt.captured_at_utc)===null
  ||asOfMillis(receipt.captured_at_utc)<=END
  ||!Number.isInteger(receipt.http_status)
  ||receipt.http_status<0||receipt.http_status>599
  ||typeof receipt.raw_text!=='string'
  ||!hex(receipt.raw_sha256)||sha(receipt.raw_text)!==receipt.raw_sha256)
  fail('INVALID_PROVIDER_OR_RAW_RECEIPT');
 const base={batch_index:batch.index,expected_mints:batch.mints.length,
  captured_at_utc:receipt.captured_at_utc,http_status:receipt.http_status,
  response_sha256:receipt.raw_sha256,
  original_october_provider_delivery_proven:false,
  historical_trade_eligibility_proven:false,
  current_identity_only:true,model_orders_authorized:0};
 if(receipt.http_status!==200)return {...base,status:'PUBLIC_HTTP_DATA_GAP',
  matched_mints:[],pools:[],matched_count:0,rejected_rows:0};
 let data;
 try{data=JSON.parse(receipt.raw_text)}
 catch{return {...base,status:'PROVIDER_INVALID_JSON_DATA_GAP',
  matched_mints:[],pools:[],matched_count:0,rejected_rows:0};}
 if(!Array.isArray(data)||data.length>3000)fail('UNEXPECTED_PAIR_BATCH_SCHEMA_OR_SIZE');
 const targets=new Set(batch.mints),found=new Set(),pairs=new Map();
 let invalid=0;
 for(const row of data){
  const mintBase=row?.baseToken?.address,mintQuote=row?.quoteToken?.address;
  const foundMint=targets.has(mintBase)?mintBase:targets.has(mintQuote)?mintQuote:null;
  const pool=row?.pairAddress;
  if(row?.chainId!=='solana'||!foundMint||!validPool(pool)){
   invalid++;continue;
  }
  // A token may have many pools. Every exact-match pool is retained; no
  // "highest gainer" or winning-pair preselection, and no current price.
  const t=Number(row.pairCreatedAt);
  const at=Number.isFinite(t)&&t>0&&t<=asOfMillis(receipt.captured_at_utc)
   ?new Date(t).toISOString():null;
  const key=foundMint+':'+pool;
  found.add(foundMint);
  if(!pairs.has(key))pairs.set(key,{
   chain:'solana',mint:foundMint,pool,
   observed_provider_capture_at_utc:receipt.captured_at_utc,
   retrospective_provider_reported_pool_created_at_utc:at,
   pool_created_at_is_not_independently_verified:true,
   provenance:'NOVEMBER_POST_EVENT_CURRENT_POOL_ASSOCIATION_ONLY',
   original_october_discoverability_verified:false,
   independent_historical_buy_quote_verified:false,
   independent_historical_sell_quote_verified:false,
   original_sellability_verified:false,paper_trade_authorized:false
  });
 }
 const ordered=[...pairs.values()].sort((a,b)=>a.mint.localeCompare(b.mint)
  ||a.pool.localeCompare(b.pool));
 return {...base,status:'POST_EVENT_POOL_IDENTITY_RESEARCH_ONLY',
  matched_mints:[...found].sort(),matched_count:found.size,
  pools:ordered,rejected_rows:invalid,returned_provider_rows:data.length};
}

export function summarizeV23NeutralBatchFindings({plan,assessments=[]}={}){
 if(plan?.kind!=='R29_V23_NEUTRAL_POSTRUN_MINT_BATCH_PLAN'
  ||plan.unique_mints!==192||plan.request_count!==7
  ||!Array.isArray(assessments)||assessments.length!==7)
  fail('NOT_COMPLETE_SEVEN_BATCH_RESEARCH');
 const all=new Set(plan.neutral_rows.map(x=>x.mint));
 const found=new Set(),poolIds=new Set(),pools=[],details=[];
 let http200=0,gaps=0,rejected=0;
 for(let i=0;i<7;i++){
  const a=assessments[i],req=plan.requests[i];
  if(a?.batch_index!==i||a.expected_mints!==req.mints.length
    ||a.model_orders_authorized!==0
    ||a.original_october_provider_delivery_proven!==false
    ||!Array.isArray(a.matched_mints)||!Array.isArray(a.pools)
    ||a.matched_mints.some(x=>!req.mints.includes(x))
    ||a.pools.some(x=>!req.mints.includes(x.mint)
      ||!validPool(x.pool)||x.paper_trade_authorized!==false))
   fail('UNTRUSTED_BATCH_ASSESSMENT_'+i);
  if(a.status==='POST_EVENT_POOL_IDENTITY_RESEARCH_ONLY')http200++;
  else if(a.status==='PUBLIC_HTTP_DATA_GAP'||a.status==='PROVIDER_INVALID_JSON_DATA_GAP')gaps++;
  else fail('UNRECOGNIZED_SOURCE_STATUS_'+i);
  for(const mint of a.matched_mints)found.add(mint);
  for(const p of a.pools){
   const k=p.mint+':'+p.pool;
   if(!poolIds.has(k)){poolIds.add(k);pools.push(p);}
  }
  rejected+=a.rejected_rows;
  details.push({batch_index:i,http_status:a.http_status,
   status:a.status,matched_mints:a.matched_count,pools:a.pools.length,
   raw_sha256:a.response_sha256,captured_at_utc:a.captured_at_utc});
 }
 if([...found].some(m=>!all.has(m)))fail('UNKNOWN_COIN_ENTERED_FROM_PROVIDER');
 return {schema:1,kind:'R29_V23_OCT12_NEUTRAL_MINT_CURRENT_IDENTITY_AUDIT',
  historical_date:'2026-10-12',source_population:'192_RETROSPECTIVE_NEUTRAL_SOLANA_MINTS',
  exact_sample_mints:all.size,provider_http_requests:7,provider_http200:http200,
  provider_http_data_gap:gaps,matched_neutral_mints:found.size,
  unmatched_neutral_mints:192-found.size,matched_exact_mint_pool_pairs:pools.length,
  invalid_or_unrelated_provider_rows:rejected,matched_pools:pools,
  per_batch:details,
  original_october_provider_delivery_proven:false,
  historical_original_discovery_evidence_added:0,
  contemporaneous_october_tradeable_buy_sell_quote_pairs:0,
  original_verified_d3_sellability_pools:0,
  historical_replay_or_live_trade_authorized:false,
  winner_reference_oracle_accessed:false,
  population_represents_all_chains_or_all_october_pools:false,
  finding:'POST_EVENT_NEUTRAL_IDENTITY_ONLY_NEVER_FEED_OCT12_GPT_OR_TRADING',
  real_model_orders:0,client_fills:0,actual_gpt_reviews:0};
}
