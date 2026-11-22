// R29 D2-04/D3-03: same DEX pair sampled twice DOES NOT prove a new
// price quote. Distinguish original HTTP response capture time from upstream
// pair valuation time; reject byte-identical repeats as corroborating momentum.
// SHA verifies stored bytes only; no URL/claim can independently certify quote
// time or safe onchain execution. No provider requests or trading.
import {verifyArchivedHttpBytes} from './v19-source-integrity.mjs';
import {canonicalChain} from './market-evidence.mjs';
import {canonicalMarketIdentity} from './v19-canonical-market-identity.mjs';
const rx=/^research\/feeds\/\d{4}-\d{2}-\d{2}\/\d+\/dex-(solana|base|ethereum|bsc|robinhood|cronos)-([A-Za-z0-9]+)\.raw\.json$/;
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const price=x=>{
 const n=Number(x);
 return x!=null&&x!==''&&Number.isFinite(n)&&n>0?n:null;
};
const norm=(c,x)=>c==='solana'?String(x):String(x).toLowerCase();
export function auditArchivedDexRecheckFreshness({apiEvidence=[],rawFiles={},asOfUtc}={}){
 const now=ms(asOfUtc);
 if(now===null||!Array.isArray(apiEvidence)||!rawFiles||typeof rawFiles!=='object')
  throw Error('INVALID_ARCHIVED_DEX_FRESHNESS_INPUT');
 const seen=new Map(),failures=[],values=[];
 let http200=0,errors=0;
 for(const [index,e] of apiEvidence.entries()){
  const m=e?.body_path?.match(rx);
  if(!m)continue;
  const [,chain,requestedPool]=m;
  const proof=verifyArchivedHttpBytes({rawText:rawFiles[e.body_path],evidence:e,
   sourcePath:e.body_path,asOfUtc});
  if(proof.status==='HTTP_ERROR_ARCHIVED'){errors++;continue;}
  if(proof.status!=='SOURCE_BYTES_VERIFIED'||e.http_status!==200){
   failures.push({index,source:e.body_path,reason:proof.reason??proof.status});continue;
  }
  http200++;
  let p;
  try{
   const raw=JSON.parse(rawFiles[e.body_path]);
   const arr=Array.isArray(raw.pairs)?raw.pairs:raw.pair?[raw.pair]:[];
   p=arr.find(q=>canonicalChain(q?.chainId)===chain
    &&norm(chain,q?.pairAddress)===norm(chain,requestedPool));
  }catch{}
  if(!p){failures.push({index,source:e.body_path,reason:'EXACT_CHAIN_AND_POOL_NOT_IN_PROVIDER_BODY'});continue;}
  const poolKind=Array.isArray(p.labels)
    &&p.labels.some(l=>String(l).toLowerCase()==='v4')
    &&/^0x[a-fA-F0-9]{64}$/.test(p.pairAddress)
    ?'UNISWAP_V4_POOL_ID':null;
  const identity=canonicalMarketIdentity({chain,pool:p.pairAddress,pool_kind:poolKind,
   contract:p.baseToken?.address});
  if(!identity){failures.push({index,source:e.body_path,reason:'NO_TYPED_CHAIN_POOL_AND_CONTRACT'});continue;}
  const key=identity.pool_key+'|'+identity.token_key;
  const sample={key,chain,pool:p.pairAddress,contract:p.baseToken.address,
   captured_at_utc:e.received_at_utc,source_path:e.body_path,
   raw_sha256:e.response_sha256,observed_price_usd:price(p.priceUsd),
   observed_liquidity_usd:price(p.liquidity?.usd),
   provider_quote_asof_utc:null,provider_quote_time_independently_verified:false};
  (seen.get(key)??seen.set(key,[]).get(key)).push(sample);
  values.push(sample);
 }
 const paired=[];
 for(const [key,arr] of seen.entries()){
  arr.sort((a,b)=>a.captured_at_utc.localeCompare(b.captured_at_utc)
   ||a.source_path.localeCompare(b.source_path));
  for(let i=1;i<arr.length;i++){
   const before=arr[i-1],after=arr[i];
   const gap=(ms(after.captured_at_utc)-ms(before.captured_at_utc))/60000;
   if(gap<5||gap>240)continue;
   const identicalBody=before.raw_sha256===after.raw_sha256;
   const sameValidPrice=before.observed_price_usd!==null
    &&after.observed_price_usd!==null;
   const difference=sameValidPrice?
    (after.observed_price_usd/before.observed_price_usd-1)*100:null;
   paired.push({pool_key:key,chain:after.chain,
    first_capture_at_utc:before.captured_at_utc,
    next_capture_at_utc:after.captured_at_utc,
    gap_minutes:Math.round(gap*100)/100,
    sources:[before.source_path,after.source_path],
    source_sha256s:[before.raw_sha256,after.raw_sha256],
    identical_source_response_body:identicalBody,
    first_liquidity_usd:before.observed_liquidity_usd,
    latest_liquidity_usd:after.observed_liquidity_usd,
    difference_in_captured_price_pct:difference,
    status:identicalBody?
     'SAME_ARCHIVED_PROVIDER_BYTES_NOT_FRESH_PRICE_EVIDENCE':
     'DIFFERENT_PROVIDER_BYTES_BUT_QUOTE_ORIGIN_TIME_UNVERIFIED',
    independent_quote_time_verified:false,
    independently_proven_new_price_sample:false,
    can_be_used_to_authorize_a_PAPER_BUY:false});
  }
 }
 return {schema:1,kind:'R29_V19_ORIGINAL_DEX_CAPTURE_RECHECK_FRESHNESS',
  as_of_utc:asOfUtc,
  original_dex_http200_count:http200,
  original_dex_error_count:errors,
  unique_verified_typed_pair_keys:seen.size,
  repeated_http_capture_pairs_5_to_240min_count:paired.length,
  identical_original_response_repeats:paired.filter(x=>x.identical_source_response_body).length,
  different_response_bytes_but_unverified_quote_time:paired.filter(x=>!x.identical_source_response_body).length,
  provider_quote_timestamp_independently_verified_count:0,
  source_integrity_failures:failures,repeated_samples:paired,
  original_captures_are_not_original_october_asof_data:true,
  genuine_new_independent_live_quote_approved_count:0,
  total_orders_authorized:0,actual_network_calls:0};
}
