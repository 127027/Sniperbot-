// R29 OCT12: current-period public-pool lookup on 192 post-event neutral
// Solana mints. STRICTLY AFTER the simulated historical decisions.
// Source: DexScreener token-to-pool association, queried in NOVEMBER 2026.
// Neither today's pair list nor its reported pairCreatedAt proves that the
// pool or USD price was detectable/executable at the OCT12 replay timestamp.
// DO NOT import this module into Dot2/3/4 trading or a historical BUY gate.
import {createHash} from 'node:crypto';
import {asOfMillis} from './v19-asof-evidence.mjs';
import {tokenValid,poolValid} from './market-evidence.mjs';

export const MAX_DEX_MINTS_PER_BATCH=30;
const TEST_START=asOfMillis('2026-10-12T00:00:00.000Z');
const TEST_END=asOfMillis('2026-10-13T00:00:00.000Z');
const sha256=x=>createHash('sha256').update(x).digest('hex');
const hour=(h)=>'2026-10-12T'+String(h).padStart(2,'0')+':00:00.000Z';
const iso=t=>new Date(t).toISOString();

export function flattenNeutralMintSample(overlay){
 if(overlay?.kind!=='R29_V19_POSTRUN_RETROSPECTIVE_NEUTRAL_24_HOURS'
   ||overlay.date!=='2026-10-12'
   ||overlay.archive_released_after_historical_test!==true
   ||overlay.never_eligible_to_seed_historical_discovery!==true
   ||overlay.never_eligible_for_entry_or_exit_quotes!==true
   ||!Array.isArray(overlay.per_hour)||overlay.per_hour.length!==24)
  throw Error('INVALID_OR_PROMOTED_RETRO_MINT_SAMPLE');
 const rows=[],seen=new Set();
 for(let h=0;h<24;h++){
  const frame=overlay.per_hour[h];
  if(frame?.scan!==h+1||asOfMillis(frame?.at_utc)!==asOfMillis(hour(h))
    ||!Array.isArray(frame.postrun_neutral_mint_sample)
    ||frame.postrun_neutral_mint_sample.length!==8)
   throw Error('RETRO_MINT_SAMPLE_SCAN_WINDOW_MISMATCH');
  for(const m of frame.postrun_neutral_mint_sample){
   const observed=asOfMillis(m?.source_observed_at_utc);
   if(m?.chain!=='solana'||!tokenValid('solana',m?.mint)
     ||seen.has(m.mint)||observed===null
     ||observed>asOfMillis(frame.at_utc)
     ||asOfMillis(frame.at_utc)-observed>300000
     ||m.provenance!=='POST_EVENT_NEUTRAL_ARCHIVE_RESEARCH_ONLY'
     ||m.tradable_usdc_quote_verified!==false
     ||m.sellability_original_verified!==false||m.exact_pool!==null)
    throw Error('UNSAFE_OR_DUPLICATED_RETRO_MINT');
   seen.add(m.mint);
   rows.push({scan:h+1,scan_at_utc:hour(h),mint:m.mint,
    observed_at_utc:m.source_observed_at_utc});
  }
 }
 if(rows.length!==192||seen.size!==192)throw Error('EXPECTED_192_NEUTRAL_UNIQUE_MINTS');
 return rows;
}
export function makeCurrentDexTokenBatches(rows){
 if(!Array.isArray(rows)||rows.length!==192)throw Error('EXPECTED_192_NEUTRAL_MINTS');
 const mints=rows.map(x=>x.mint);
 if(new Set(mints).size!==192||mints.some(x=>!tokenValid('solana',x)))
  throw Error('INVALID_DEX_TOKEN_BATCH_INPUT');
 const result=[];
 for(let i=0;i<mints.length;i+=MAX_DEX_MINTS_PER_BATCH){
  const tokens=mints.slice(i,i+MAX_DEX_MINTS_PER_BATCH);
  result.push({index:result.length+1,mints:tokens,
   url:'https://api.dexscreener.com/tokens/v1/solana/'+tokens.join(',')});
 }
 if(result.length!==7)throw Error('EXPECTED_EXACTLY_SEVEN_BOUNDED_DEX_BATCHES');
 return result;
}
export function evaluatePostrunDexMintPools({neutralMintRows,providerPages}={}){
 if(!Array.isArray(neutralMintRows)||neutralMintRows.length!==192
   ||new Set(neutralMintRows.map(x=>x.mint)).size!==192
   ||!Array.isArray(providerPages)||providerPages.length!==7)
  throw Error('INVALID_POSTRUN_PAIR_JOIN_INPUT');
 const expected=makeCurrentDexTokenBatches(neutralMintRows);
 const all=new Map();
 let success=0,failed=0,rejected=0,totalMatches=0;
 const failedMintLookups=new Set();
 const proof=[];
 for(let i=0;i<7;i++){
  const p=providerPages[i],batch=expected[i];
  const at=asOfMillis(p?.captured_at_utc);
  if(p?.index!==batch.index||p?.url!==batch.url
    ||JSON.stringify(p?.mints)!==JSON.stringify(batch.mints)
    ||at===null||at<=TEST_END||typeof p.http_status!=='number'
    ||!Number.isInteger(p.http_status)
    ||!['application/json','application/json; charset=utf-8']
       .some(x=>String(p.content_type||'').toLowerCase().startsWith(x))
       &&p.http_status===200
    ||typeof p.raw_text!=='string'
    ||typeof p.sha256!=='string'||!/^([a-f0-9]{64})$/.test(p.sha256)
    ||p.sha256!==sha256(Buffer.from(p.raw_text,'utf8')))
   throw Error('UNPINNED_OR_FUTURE_PROVIDER_BATCH_'+(i+1));
  const receipt={batch:i+1,requested_mints:batch.mints.length,
   provider:'DEXSCREENER',http_status:p.http_status,
   captured_at_utc:p.captured_at_utc,source_url:batch.url,
   response_raw_sha256:p.sha256,raw_bytes:Buffer.byteLength(p.raw_text,'utf8'),
   historical_original_provider_capture:false};
  proof.push(receipt);
  if(p.http_status!==200){failed++;for(const m of batch.mints)failedMintLookups.add(m);continue;}
  let response;
  try{response=JSON.parse(p.raw_text)}catch{failed++;receipt.parse_error=true;
   for(const m of batch.mints)failedMintLookups.add(m);continue;}
  if(!Array.isArray(response)){failed++;receipt.schema_error=true;
   for(const m of batch.mints)failedMintLookups.add(m);continue;}
  success++;
  const batchSet=new Set(batch.mints);
  for(const pair of response){
   if(pair?.chainId!=='solana'
     ||!poolValid('solana',pair?.pairAddress)
     ||!tokenValid('solana',pair?.baseToken?.address)
     ||!tokenValid('solana',pair?.quoteToken?.address)){
    rejected++;continue;
   }
   const matched=[pair.baseToken.address,pair.quoteToken.address]
      .filter(m=>batchSet.has(m));
   if(!matched.length){rejected++;continue;}
   const reportedCreation=Number.isSafeInteger(pair.pairCreatedAt)
     &&pair.pairCreatedAt>0&&pair.pairCreatedAt<=at
     ?pair.pairCreatedAt:null;
   for(const m of matched){
    const current=all.get(m)||new Map();
    const prior=current.get(pair.pairAddress);
    if(prior&&prior.response_raw_sha256!==p.sha256)continue;
    current.set(pair.pairAddress,{
     pool_address:pair.pairAddress,reported_pool_created_at_utc:
       reportedCreation!==null?iso(reportedCreation):null,
     reported_creation_time_is_not_historical_delivery_proof:true,
     current_lookup_at_utc:p.captured_at_utc,
     dex_source:typeof pair.dexId==='string'?pair.dexId:null,
     quote_asset_address:m===pair.baseToken.address
       ?pair.quoteToken.address:pair.baseToken.address,
     response_raw_sha256:p.sha256,original_october_quote_verified:false,
     original_october_pool_existence_independently_verified:false,
     original_october_sellability_verified:false,
     price_usd_asof_october:null
    });
    all.set(m,current);totalMatches++;
   }
  }
 }
 const rows=neutralMintRows.map(sample=>{
  const matches=[...(all.get(sample.mint)?.values()||[])];
  const scanAt=asOfMillis(sample.scan_at_utc);
  const sorted=matches.sort((a,b)=>
    (a.reported_pool_created_at_utc===null?Infinity:asOfMillis(a.reported_pool_created_at_utc))
    -(b.reported_pool_created_at_utc===null?Infinity:asOfMillis(b.reported_pool_created_at_utc)));
  const classifications=sorted.map(x=>({...x,
    relation_to_historical_scan:x.reported_pool_created_at_utc===null
      ?'POOL_CREATION_NOT_RELIABLY_REPORTED'
      :asOfMillis(x.reported_pool_created_at_utc)<=scanAt
        ?'CURRENT_PROVIDER_REPORTS_CREATED_NO_LATER_THAN_SCAN_UNVERIFIED'
        :'CURRENT_PROVIDER_REPORTS_CREATED_AFTER_SCAN',
    permitted_as_2026_10_12_live_quote:false}));
  return {scan:sample.scan,mint:sample.mint,scan_at_utc:sample.scan_at_utc,
   source_observed_at_utc:sample.observed_at_utc,
   current_provider_token_pairs:classifications,
   current_provider_pool_pair_count:classifications.length,
   historical_pool_identity_status:failedMintLookups.has(sample.mint)
     ?'PARTIAL_SOURCE_CAPTURE_CANNOT_DECLARE_ABSENT'
     :classifications.length===0
       ?'NO_POOL_REPORTED_IN_CURRENT_PROVIDER_RESPONSE_NOT_HISTORIC_ABSENCE'
       :'POST_EVENT_CURRENT_PROVIDER_POOL_HINT_ONLY',
   independence_proven:false,simulatable_historical_buy_sell:false,
   historical_usdc_quote_proven:false};
 });
 const matched=rows.filter(x=>x.current_provider_pool_pair_count>0);
 return {schema:1,kind:'R29_V19_POSTRUN_DEX_MINT_POOL_IDENTITY_RESEARCH_ONLY',
  historical_test_start_utc:iso(TEST_START),historical_test_end_exclusive_utc:iso(TEST_END),
  chain:'solana',source_provider:'DEXSCREENER',
  current_provider_request_count:providerPages.length,
  current_provider_http200_batches:success,
  failed_or_invalid_source_batches:failed,
  invalid_or_mismatched_provider_pairs_rejected:rejected,
  provider_matching_mint_pool_rows:totalMatches,
  original_neutral_sample_count:rows.length,
  current_provider_mints_with_any_pool:matched.length,
  current_provider_mints_with_no_pool_observed:rows.length-matched.length,
  currently_reported_pool_hints:rows.reduce((n,x)=>n+x.current_provider_pool_pair_count,0),
  sample_mints_with_provider_reported_pool_before_their_scan:matched.filter(x=>
    x.current_provider_token_pairs.some(p=>p.relation_to_historical_scan
      ==='CURRENT_PROVIDER_REPORTS_CREATED_NO_LATER_THAN_SCAN_UNVERIFIED')).length,
  archived_original_provider_quotes_at_scan:0,
  independent_historical_solana_pool_verified:0,
  independent_historical_solana_sellability_verified:0,
  historically_executable_buy_sell_price_quotes_proven:0,
  original_october_gpt_decisions_proven:0,
  original_october_windows_paper_trades_proven:0,
  all_100pct_winners_in_market:'UNKNOWN_NOT_COMPLETE_UNIVERSE',
  source_raw_http_receipts:proof,
  candidate_rows:rows,
  post_event_current_provider_not_asof_tradability:true,
  never_eligible_to_seed_historical_discovery:true,
  never_eligible_for_entry_or_exit_quotes:true,
  not_an_order_or_trade_authorization:true};
}
