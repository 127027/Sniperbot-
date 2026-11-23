// Research-only GeckoTerminal fallback after DexScreener empty indexes.
// Exactly two historically neutral Solana mints. No dates may be backdated.
import {createHash} from 'node:crypto';
import {asOfMillis} from './v19-asof-evidence.mjs';
import {poolValid,tokenValid} from './market-evidence.mjs';
import {R29_OCT12_CHAIN_RESEARCH_TARGETS}
 from './v19-october-solana-chain-research.mjs';
const start=asOfMillis('2026-10-13T00:00:00.000Z');
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
export const V23_GECKO_FALLBACK_REQUESTS=Object.freeze(
 R29_OCT12_CHAIN_RESEARCH_TARGETS.flatMap((t,i)=>[
  {index:i*2,scan:t.scan,mint:t.mint,pool:t.pool,
   kind:'POOLS_FOR_TOKEN',
   url:'https://api.geckoterminal.com/api/v2/networks/solana/tokens/'+t.mint+
     '/pools?include=base_token,quote_token'},
  {index:i*2+1,scan:t.scan,mint:t.mint,pool:t.pool,
   kind:'EXACT_POOL',
   url:'https://api.geckoterminal.com/api/v2/networks/solana/pools/'+t.pool+
     '?include=base_token,quote_token'}
 ].map(x=>Object.freeze(x))));
export function auditV23GeckoFallback({request,receipt}={}){
 if(!V23_GECKO_FALLBACK_REQUESTS.some(r=>JSON.stringify(r)===JSON.stringify(request))
  ||receipt?.method!=='GET'||receipt.url!==request.url
  ||asOfMillis(receipt.captured_at_utc)===null
  ||asOfMillis(receipt.captured_at_utc)<=start
  ||!Number.isInteger(receipt.http_status)||receipt.http_status<0||receipt.http_status>599
  ||typeof receipt.raw_text!=='string'||sha(receipt.raw_text)!==receipt.raw_sha256)
  throw Error('INVALID_V23_GECKO_FALLBACK_EVIDENCE');
 let payload;
 try{payload=JSON.parse(receipt.raw_text)}catch{}
 const pools=Array.isArray(payload?.data)?payload.data:
  payload?.data&&typeof payload.data==='object'?[payload.data]:[];
 const included=new Map((Array.isArray(payload?.included)?payload.included:[])
  .filter(x=>typeof x?.id==='string').map(x=>[x.id,x]));
 const rows=[];
 for(const pool of pools){
  const addr=pool?.attributes?.address;
  if(!poolValid('solana',addr))continue;
  const refs=[pool?.relationships?.base_token?.data?.id,
   pool?.relationships?.quote_token?.data?.id];
  const tokenIds=refs.map(ref=>included.get(ref)?.attributes?.address)
   .filter(x=>tokenValid('solana',x));
  // Strictly require an exact mint association, rather than trusting token
  // or pool name/symbol. If "included" is absent: UNKNOWN, never BUY.
  rows.push({pool:addr,mint_in_included_token_details:tokenIds.includes(request.mint),
   requested_pool_matches:addr===request.pool});
 }
 const matched=rows.some(x=>x.requested_pool_matches&&x.mint_in_included_token_details);
 return {kind:'R29_V23_GECKO_POST_EVENT_NEUTRAL_IDENTITY_CONTROL',
  query_kind:request.kind,target_scan:request.scan,
  http_status:receipt.http_status,captured_at_utc:receipt.captured_at_utc,
  source_sha256:receipt.raw_sha256,
  returned_pool_records:pools.length,valid_pool_ids:rows.length,
  exact_pool_and_mint_currently_confirmed:matched,
  exact_pool_only_without_mint_proof:!matched&&rows.some(x=>x.requested_pool_matches),
  source_result:'NOVEMBER_POST_EVENT_ONLY',
  contemporaneous_october_information_proven:false,
  original_october_50_usdc_sellability_proven:false,
  independent_upstream_quote_proven:false,
  oracle_winners_used:false,paper_orders_authorized:0};
}
