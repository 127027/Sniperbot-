// Research-only original Solana chain-history audit for exactly two neutral
// OCT12 mints independently located in Nov23 post-run provider observations.
// This module never produces entry/exit quotes or trading authorization.
// Solana public RPC is a single best-effort source; a blockTime or balances
// from it do not prove a 50-USDC swap route, safe sellability, or original
// October provider-delivery-to-GPT. Never import into Dot2/3/4 signal code.
import {createHash} from 'node:crypto';
import {asOfMillis} from './v19-asof-evidence.mjs';
import {tokenValid,poolValid} from './market-evidence.mjs';

const validSig=s=>typeof s==='string'&&/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(s);
const hex64=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const sha=t=>createHash('sha256').update(t,'utf8').digest('hex');
const iso=t=>new Date(t).toISOString();
const START=asOfMillis('2026-10-11T19:00:00.000Z');
const END=asOfMillis('2026-10-13T00:00:00.000Z');
const RPC='https://api.mainnet.solana.com';
const PAGE_LIMIT=1000;
export const MAX_CHAIN_HISTORY_PAGES_PER_POOL=10;
export const MAX_CHAIN_TRANSACTION_DETAILS_PER_POOL=2;

export const R29_OCT12_CHAIN_RESEARCH_TARGETS=Object.freeze([
 Object.freeze({scan:3,coin_label:'TANK',
  scan_at_utc:'2026-10-12T02:00:00.000Z',
  mint:'3nXL1jYC4rTL9hWnEYz1w4WkbbKceFmb5jxX7RL5pump',
  pool:'CTemNiKyDcmqrYMB2EF6fp4LcRprYm7LeCBoM14228sT'}),
 Object.freeze({scan:19,coin_label:'ARIANA',
  scan_at_utc:'2026-10-12T18:00:00.000Z',
  mint:'28FFbG2j5d5XGvyuLSdDixAgQnmN4YDZqmSVbbzJpump',
  pool:'8TgpUYKfnG2UM43rFQMV9v3XRiciAqqDSp8BgXSBcq7P'})
]);

export function validateOct12ChainResearchTargets(targets=R29_OCT12_CHAIN_RESEARCH_TARGETS){
 if(!Array.isArray(targets)||targets.length!==2)
  throw Error('UNAUTHORIZED_TWO_POOL_CHAIN_TARGETS');
 for(let i=0;i<2;i++){
  const a=targets[i],orig=R29_OCT12_CHAIN_RESEARCH_TARGETS[i];
  if(a?.scan!==orig.scan||a?.scan_at_utc!==orig.scan_at_utc
   ||a?.mint!==orig.mint||a?.pool!==orig.pool
   ||!poolValid('solana',a.pool)||!tokenValid('solana',a.mint))
   throw Error('HISTORICAL_POOL_RESEARCH_TARGET_MISMATCH_'+i);
 }
 return targets;
}
export function makeSolanaChainHistoryRpc({target,index=0,before=null}={}){
 validateOct12ChainResearchTargets(R29_OCT12_CHAIN_RESEARCH_TARGETS);
 if(!target||!R29_OCT12_CHAIN_RESEARCH_TARGETS.some(x=>
  x.pool===target.pool&&x.mint===target.mint&&x.scan===target.scan)
  ||!Number.isInteger(index)||index<0||index>=MAX_CHAIN_HISTORY_PAGES_PER_POOL
  ||before!==null&&!validSig(before)
  ||(index===0&&before!==null)||(index>0&&before===null))
  throw Error('UNAUTHORIZED_SOLANA_HISTORY_PAGE_REQUEST');
 return {jsonrpc:'2.0',id:index+1,method:'getSignaturesForAddress',
  params:[target.pool,{limit:PAGE_LIMIT,commitment:'finalized',
   ...(before?{before}:{})}]};
}
export function makeSolanaChainTransactionRpc({target,signature,index=0}={}){
 if(!target||!R29_OCT12_CHAIN_RESEARCH_TARGETS.some(x=>
  x.mint===target.mint&&x.pool===target.pool&&x.scan===target.scan)
  ||!validSig(signature)||!Number.isInteger(index)||index<0
  ||index>=MAX_CHAIN_TRANSACTION_DETAILS_PER_POOL)
  throw Error('UNAUTHORIZED_SOLANA_CHAIN_TRANSACTION_REQUEST');
 return {jsonrpc:'2.0',id:index+1,method:'getTransaction',
  params:[signature,{encoding:'jsonParsed',
   commitment:'finalized',maxSupportedTransactionVersion:0}]};
}
export function auditSolanaRpcEnvelope({request,receipt}={}){
 const when=asOfMillis(receipt?.captured_at_utc);
 const raw=receipt?.raw_text;
 if(!request||request.jsonrpc!=='2.0'
  ||!['getSignaturesForAddress','getTransaction'].includes(request.method)
  ||!receipt||receipt.endpoint!==RPC
  ||receipt.http_method!=='POST'||when===null||when<=END
  ||!Number.isInteger(receipt.http_status)
  ||!hex64(receipt.raw_sha256)||typeof raw!=='string'
  ||sha(raw)!==receipt.raw_sha256
  ||JSON.stringify(receipt.json_rpc_request)!==JSON.stringify(request))
  throw Error('INVALID_SOLANA_ORIGINAL_RPC_RECEIPT');
 if(receipt.http_status!==200)return {
  kind:'RPC_HTTP_DATA_GAP',status:receipt.http_status,
  captured_at_utc:receipt.captured_at_utc,raw_sha256:receipt.raw_sha256,
  response:null};
 let response;
 try{response=JSON.parse(raw)}
 catch{return {kind:'RPC_INVALID_JSON_DATA_GAP',status:200,response:null,
  raw_sha256:receipt.raw_sha256,captured_at_utc:receipt.captured_at_utc};}
 if(response?.jsonrpc!=='2.0'||response.id!==request.id
  ||response.error!==undefined)
  return {kind:'RPC_METHOD_ERROR_DATA_GAP',
   error_code:Number.isInteger(response?.error?.code)?response.error.code:null,
   status:200,response:null,raw_sha256:receipt.raw_sha256,
   captured_at_utc:receipt.captured_at_utc};
 return {kind:'RPC_OK',status:200,response:response.result,
  raw_sha256:receipt.raw_sha256,captured_at_utc:receipt.captured_at_utc};
}
export function auditSolanaPoolSignatureHistory({target,pages=[]}={}){
 validateOct12ChainResearchTargets([target,
  ...R29_OCT12_CHAIN_RESEARCH_TARGETS.filter(x=>x.pool!==target.pool)].sort(
   (x,y)=>x.scan-y.scan));
 if(!Array.isArray(pages)||pages.length>MAX_CHAIN_HISTORY_PAGES_PER_POOL)
  throw Error('INVALID_CHAIN_SIGNATURE_PAGE_COUNT');
 let previousBefore=null,earliest=null,newest=null,unique=new Set();
 let oldCovered=false,sourceGap=false,hasMore=false;
 const within=[];
 const pageRecords=[];
 for(let i=0;i<pages.length;i++){
  const record=pages[i];
  const expected=makeSolanaChainHistoryRpc({
   target,index:i,before:previousBefore});
  const audit=auditSolanaRpcEnvelope({request:expected,receipt:record});
  const row={page:i+1,receipt_sha256:audit.raw_sha256,
   response_kind:audit.kind,captured_at_utc:audit.captured_at_utc};
  pageRecords.push(row);
  if(audit.kind!=='RPC_OK'||!Array.isArray(audit.response)){
   sourceGap=true;break;
  }
  const entries=audit.response;
  row.returned_signatures=entries.length;
  if(entries.length===0){oldCovered=true;hasMore=false;break;}
  let pageNewest=null,pageOldest=null,malformed=false;
  for(const x of entries){
   if(!validSig(x?.signature)
    ||!Number.isSafeInteger(x?.slot)||x.slot<1
    ||!Number.isSafeInteger(x?.blockTime)||x.blockTime<1
    ||unique.has(x.signature)){
    malformed=true;continue;
   }
   unique.add(x.signature);
   const when=x.blockTime*1000;
   if(pageNewest===null||when>pageNewest)pageNewest=when;
   if(pageOldest===null||when<pageOldest)pageOldest=when;
   if(when>=START&&when<END){
    within.push({signature:x.signature,slot:x.slot,
     block_time_utc:iso(when),rpc_reported_err:x.err??null,
     confirmation_status:x.confirmationStatus??null,
     before_or_at_target_scan:when<=asOfMillis(target.scan_at_utc),
     this_rpc_result_does_not_prove_swap_or_liquidity:true});
   }
  }
  if(malformed||pageNewest===null||pageOldest===null){
   sourceGap=true;row.invalid_signature_data=true;break;
  }
  newest=newest===null? pageNewest:Math.max(newest,pageNewest);
  earliest=earliest===null?pageOldest:Math.min(earliest,pageOldest);
  row.newest_block_time_utc=iso(pageNewest);
  row.oldest_block_time_utc=iso(pageOldest);
  // Read backward from recent signatures. Earliest needs to cross START.
  // Never call an incomplete page "no old transactions".
  if(pageOldest<=START){
   oldCovered=true;hasMore=false;break;
  }
  if(entries.length<PAGE_LIMIT){
   // A short page might be an address with genuinely short history OR
   // a non-archival/rate-limited node. Never declare 2026 completeness.
   row.short_page_with_no_independent_archive_coverage_proof=true;
   hasMore=false;break;
  }
  previousBefore=entries.at(-1).signature;
  hasMore=true;
  if(i===MAX_CHAIN_HISTORY_PAGES_PER_POOL-1)break;
 }
 const successful=within.filter(x=>x.before_or_at_target_scan
   &&x.rpc_reported_err===null
   &&(x.confirmation_status==='finalized'||x.confirmation_status===null));
 successful.sort((a,b)=>asOfMillis(a.block_time_utc)-asOfMillis(b.block_time_utc));
 const earliestStatus=sourceGap?'RPC_RESPONSE_GAP_OR_INVALID'
  :oldCovered?'RPC_ACCOUNT_SIGNATURE_HISTORY_TRAVERSED_TO_WARMUP_BOUND'
  :hasMore?'INCOMPLETE_HISTORY_OLDER_PAGES_NOT_FETCHED'
  :'NO_COMPLETE_HISTORY_PROOF';
 return {schema:1,kind:'R29_V19_TWO_POOL_ORIGINAL_CHAIN_SIGNATURE_RESEARCH',
  source_chain:'SOLANA_MAINNET',endpoint:RPC,
  target_scan:target.scan,target_scan_at_utc:target.scan_at_utc,
  exact_pool:target.pool,exact_mint:target.mint,
  signature_page_budget:MAX_CHAIN_HISTORY_PAGES_PER_POOL,
  source_page_attempts:pages.length,
  signature_history_boundary_status:earliestStatus,
  newest_seen_signature_time_utc:newest===null?null:iso(newest),
  oldest_seen_signature_time_utc:earliest===null?null:iso(earliest),
  candidate_successful_chain_signatures_until_scan:successful,
  all_target_window_reported_signatures:within,
  suggested_detail_signatures:successful.slice(-MAX_CHAIN_TRANSACTION_DETAILS_PER_POOL)
   .map(x=>x.signature),
  // A single public RPC cannot prove it has returned EVERY historical
  // transaction even if its page crosses the warmup boundary.
  history_complete_for_whole_window:false,
  observed_page_reaches_warmup_time_boundary:oldCovered&&!sourceGap,
  no_signatures_means_no_swaps:false,
  original_october_provider_price_delivery_verified:false,
  independent_historical_50_usdc_slippage_quote_verified:false,
  chain_sellability_proven:false,orders_authorized:0,
  source_page_receipts:pageRecords};
}
export function auditSolanaChainTransactionDetail({target,signature,receipt}={}){
 const request=makeSolanaChainTransactionRpc({target,signature,index:0});
 const e=auditSolanaRpcEnvelope({request,receipt});
 const failure=status=>({
  schema:1,kind:'R29_V19_SOLANA_ORIGINAL_TRANSACTION_READONLY',
  status,source_receipt_sha256:e.raw_sha256??null,
  pool:target.pool,mint:target.mint,signature,
  historical_onchain_tx_at_or_before_scan_verified:false,
  mint_balance_changes_observed:0,
  original_historical_pool_reserves_verified:false,
  independent_historical_buy_sell_quote_verified:false,
  sell_route_sellability_proven:false,trade_authorized:false});
 if(e.kind!=='RPC_OK')return failure(e.kind);
 const tx=e.response;
 if(!tx)return failure('RPC_RETURNED_NULL_TRANSACTION_DATA_GAP');
 const slot=tx.slot,blockTime=tx.blockTime;
 const acc=tx.transaction?.message?.accountKeys;
 const sign=tx.transaction?.signatures;
 if(!Number.isSafeInteger(slot)||slot<1||!Number.isSafeInteger(blockTime)
  ||!Array.isArray(acc)||!Array.isArray(sign)
  ||!sign.includes(signature)
  ||!acc.some(x=>(typeof x==='string'?x:x?.pubkey)===target.pool)
  ||tx.meta?.err!==null
  ||blockTime*1000>asOfMillis(target.scan_at_utc)
  ||blockTime*1000<START)
  return failure('NOT_VERIFIED_HISTORIC_POOL_TRANSACTION');
 const pre=tx.meta.preTokenBalances,post=tx.meta.postTokenBalances;
 if(!Array.isArray(pre)||!Array.isArray(post))
  return failure('TOKEN_BALANCE_RECORDS_MISSING');
 const values=new Map();
 for(const [tag,entries] of [['pre',pre],['post',post]]){
  for(const entry of entries){
   const balance=entry.uiTokenAmount;
   if(!Number.isInteger(entry.accountIndex)||entry.accountIndex<0
    ||entry.mint!==target.mint||!balance
    ||typeof balance.amount!=='string'||!/^(0|[1-9]\d*)$/.test(balance.amount)
    ||!Number.isInteger(balance.decimals)||balance.decimals<0
    ||balance.decimals>18)continue;
   const old=values.get(entry.accountIndex)||{};
   old[tag]=BigInt(balance.amount);
   old.decimals=balance.decimals;
   values.set(entry.accountIndex,old);
  }
 }
 const deltas=[];
 for(const [i,b] of values.entries()){
  if(b.pre===undefined||b.post===undefined)continue;
  const delta=b.post-b.pre;
  if(delta!==0n)deltas.push({account_index:i,
   absolute_raw_token_amount_change:(delta<0n?-delta:delta).toString(),
   token_amount_direction:delta>0n?'INCREASE':'DECREASE',
   decimals:b.decimals,
   // A token-account change does not authenticate a market swap or reserve.
   verified_exact_pool_vault:false});
 }
 return {schema:1,kind:'R29_V19_SOLANA_ORIGINAL_TRANSACTION_READONLY',
  status:'FINALIZED_ONCHAIN_POOL_REFERENCED_TRANSACTION_METADATA',
  source_receipt_sha256:e.raw_sha256,
  signature,slot,block_time_utc:iso(blockTime*1000),
  pool:target.pool,mint:target.mint,
  historical_onchain_tx_at_or_before_scan_verified:true,
  mint_balance_changes_observed:deltas.length,
  token_balance_change_rows:deltas,
  original_historical_pool_reserves_verified:false,
  independent_historical_buy_sell_quote_verified:false,
  sell_route_sellability_proven:false,
  trade_authorized:false};
}
