// R29 V2.3: read-only PUBLIC token-pool endpoint diagnostic for exactly two
// post-event neutrally sampled Solana mints (not the 65 winners).
// A 2026-11 query NEVER authenticates 2026-10 provider availability.
import {createHash} from 'node:crypto';
import {R29_OCT12_CHAIN_RESEARCH_TARGETS}
 from './v19-october-solana-chain-research.mjs';
import {asOfMillis} from './v19-asof-evidence.mjs';
const END=asOfMillis('2026-10-13T00:00:00.000Z');
const hash=x=>createHash('sha256').update(x,'utf8').digest('hex');
const tests=[
 ...R29_OCT12_CHAIN_RESEARCH_TARGETS.flatMap((t,i)=>[
 {id:i*3,source:'TOKENS_V1_ONE',mint:t.mint,pool:t.pool,scan:t.scan,
  url:'https://api.dexscreener.com/tokens/v1/solana/'+t.mint},
 {id:i*3+1,source:'TOKEN_PAIRS_V1_ONE',mint:t.mint,pool:t.pool,scan:t.scan,
  url:'https://api.dexscreener.com/token-pairs/v1/solana/'+t.mint},
 {id:i*3+2,source:'POOL_BY_ADDRESS',mint:t.mint,pool:t.pool,scan:t.scan,
  url:'https://api.dexscreener.com/latest/dex/pairs/solana/'+t.pool}
 ])];
export const V23_CONTROL_REQUESTS=Object.freeze(tests.map(x=>Object.freeze(x)));
export function auditV23EndpointControl({query,receipt}={}){
 if(!V23_CONTROL_REQUESTS.some(x=>JSON.stringify(x)===JSON.stringify(query))
  ||receipt?.method!=='GET'||receipt?.endpoint!==query.url
  ||!Number.isInteger(receipt.status)||receipt.status<0||receipt.status>599
  ||asOfMillis(receipt.captured_at_utc)===null
  ||asOfMillis(receipt.captured_at_utc)<=END
  ||typeof receipt.raw_text!=='string'||hash(receipt.raw_text)!==receipt.sha256)
  throw Error('INVALID_V23_NEUTRAL_ENDPOINT_PROBE');
 let decoded=null;
 if(receipt.status===200){
  try{decoded=JSON.parse(receipt.raw_text)}catch{}
 }
 const rows=Array.isArray(decoded)?decoded:
  Array.isArray(decoded?.pairs)?decoded.pairs:[];
 let exactPool=0,exactMint=0,anyPool=0;
 for(const x of rows){
  if(x?.chainId!=='solana'||typeof x.pairAddress!=='string')continue;
  anyPool++;
  if(x.pairAddress===query.pool)exactPool++;
  if(x.baseToken?.address===query.mint||x.quoteToken?.address===query.mint)
   exactMint++;
 }
 return {kind:'R29_V23_PUBLIC_ENDPOINT_CONTROL_RECEIPT',
  source:query.source,target_scan:query.scan,
  response_status:receipt.status,raw_sha256:receipt.sha256,
  original_pool_expected:query.pool,original_mint_expected:query.mint,
  returned_pairs:rows.length,solana_pairs:anyPool,
  exact_original_pool_id_matches:exactPool,
  exact_mint_matches:exactMint,
  matched_expected_token_and_pool:rows.some(x=>
   x?.chainId==='solana'&&x.pairAddress===query.pool
   &&(x.baseToken?.address===query.mint||x.quoteToken?.address===query.mint)),
  response_capture_at_utc:receipt.captured_at_utc,
  original_october_provider_availability_proven:false,
  historical_swap_or_sellability_proven:false,
  source_result_only_post_event:true,
  paper_trade_authorized:false};
}
