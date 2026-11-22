// JSON-only public market-data decoder; no network, wallets, or order actions.
import {canonicalChain,tokenValid,poolValid} from './market-evidence.mjs';
import {exactPoolUrl} from './market-evidence.mjs';
import {canonicalMarketIdentity} from './v19-canonical-market-identity.mjs';
const num=x=>{const v=Number(x);return x===null||x===undefined||x===''||!Number.isFinite(v)?null:v;};
const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const norm=(chain,val)=>chain==='solana'?String(val):String(val).toLowerCase();
export function decodeGeckoNewPools({network,response,capturedAtUtc,page=1}={}){
 const chain=canonicalChain(network),captured=time(capturedAtUtc);
 if(!chain||!captured||!Number.isInteger(page)||page<1)throw Error('BAD_DISCOVERY_ARGUMENT');
 if(!Array.isArray(response?.data))throw Error('BAD_GECKO_RESPONSE');
 const included=new Map((Array.isArray(response.included)?response.included:[]).filter(x=>typeof x?.id==='string').map(x=>[x.id,x]));
 const candidates=[],rejected=[];
 for(let i=0;i<response.data.length;i++){
  const record=response.data[i],a=record?.attributes??{},pool=a.address??null;
  // A Gecko Uniswap V4 pool is a 32-byte pool ID; attributes.pool_kind may be absent.
  // Infer V4 only when the trusted response's exact DEX/network relationship agrees.
  // Gecko API network slug (eth/cro) is NOT the DEX relationship slug.
  // Original 22-Nov ETH page3 uses dex.id='uniswap-v4-ethereum', not
  // 'uniswap-v4-eth'. A mismatch previously discarded 18/20 source rows.
  const dexId=record?.relationships?.dex?.data?.id??null;
  const inferredV4=dexId==='uniswap-v4-'+chain
    &&typeof pool==='string'&&/^0x[0-9a-fA-F]{64}$/.test(pool);
  const poolKind=inferredV4||a.pool_kind==='UNISWAP_V4_POOL_ID'?'UNISWAP_V4_POOL_ID':null;
  if(!poolValid(chain,pool,poolKind)){
    rejected.push({row:i,reason:'POOL_ADDRESS_MISSING_OR_INVALID',source_pool_id:record?.id??null,dex_id:dexId});
    continue;
  }
  const ref=record?.relationships?.base_token?.data?.id;
  const base=typeof ref==='string'?included.get(ref):null;
  const value=base?.attributes?.address??null;
  const contract=tokenValid(chain,value)?value:null;
  const created=time(a.pool_created_at);
  candidates.push({chain,pool,pool_kind:poolKind,contract,
    symbol:base?.attributes?.symbol??null,observed_at_utc:captured,
    pool_created_at_utc:created,
    source_url:'https://www.geckoterminal.com/'+(chain==='ethereum'?'eth':chain==='cronos'?'cro':chain)+'/pools/'+pool,
    source_api:'GECKOTERMINAL_NEW_POOLS_JSON',source_page:page,source_row:i,
    source_pool_id:record?.id??null,source_base_token_id:ref??null,
    liquidity_usd:num(a.reserve_in_usd),volume_24h_usd:num(a.volume_usd?.h24),
    category:'NEW',observed_price_usd:num(a.base_token_price_usd),
    errors:[...(!contract?['FULL_BASE_CONTRACT_NOT_IN_INCLUDED_RESPONSE']:[]),...(!created?['CREATION_TIME_MISSING']:[])]});
 }
 return {schema:1,network:chain,page,captured_at_utc:captured,
   requested_pool_count:response.data.length,found_count:candidates.length,
   rejected_count:rejected.length,with_full_contract:candidates.filter(x=>x.contract).length,candidates,rejected,
   caveat:'CURRENT latest-pools API, not a historical replay universe or a security/sellability check'};
}
export function crossCheckDexPair({candidate,response,checkedAtUtc}={}){
 const checked=time(checkedAtUtc);
 if(!checked)throw Error('INVALID_PAIR_CHECK_TIME');
 const pairs=Array.isArray(response?.pairs)?response.pairs:Array.isArray(response)?response:[];
 const chain=canonicalChain(candidate?.chain),pool=candidate?.pool,token=candidate?.contract;
 const identity=canonicalMarketIdentity({
  chain,pool,pool_kind:candidate?.pool_kind??null,contract:token
 });
 const emptyProof={
  checked_at_utc:checked,matched:false,
  provider_quote_asof_utc:null,provider_quote_asof_verified:false,
  provider_quote_age_seconds:null,trade_authorized:false
 };
 if(!identity||!tokenValid(chain,token))
  return {...emptyProof,status:'IDENTITY_INCOMPLETE',
   reason:'MISSING_OR_MALFORMED_TYPED_CHAIN_POOL_CONTRACT'};
 if(candidate?.source_url!=null&&!exactPoolUrl(candidate.source_url,chain,pool))
  return {...emptyProof,status:'SOURCE_URL_CHAIN_OR_POOL_CONFLICT',
   reason:'SOURCE_LINK_IS_NOT_THE_CANONICAL_POOL'};
 if(time(candidate?.observed_at_utc)
   &&Date.parse(candidate.observed_at_utc)>Date.parse(checked))
  return {...emptyProof,status:'CROSSCHECK_PREDATES_SOURCE_OBSERVATION',
   reason:'DEX_CAPTURE_CANNOT_CONFIRM_A_FUTURE_SOURCE'};
 const canonicalAddress=(value)=>norm(chain,value);
 const mismatches={wrong_chain:0,wrong_pool:0,wrong_base_token:0,
   malformed_provider_pair:0};
 let pair=null;
 for(const p of pairs){
  const actualChain=canonicalChain(p?.chainId);
  if(actualChain!==chain){mismatches.wrong_chain++;continue;}
  const pairIdentity=canonicalMarketIdentity({chain:actualChain,
    pool:p?.pairAddress,pool_kind:candidate?.pool_kind??null,
    contract:p?.baseToken?.address});
  if(!pairIdentity){mismatches.malformed_provider_pair++;continue;}
  if(pairIdentity.pool_key!==identity.pool_key){
   mismatches.wrong_pool++;continue;
  }
  if(pairIdentity.token_key!==identity.token_key){
   mismatches.wrong_base_token++;continue;
  }
  pair=p;break;
 }
 if(!pair)return {...emptyProof,
   status:'NO_MATCHING_CHAIN_POOL_BASE_TOKEN',
   reason:'PROVIDER_PAIR_IDENTITY_NOT_CONFIRMED',
   chain,pool,contract:token,returned_pairs:pairs.length,
   mismatch_counts:mismatches,pool_identity_key:identity.pool_key,
   token_identity_key:identity.token_key};
 const price=num(pair.priceUsd),liq=num(pair?.liquidity?.usd),
  reference=num(candidate?.observed_price_usd);
 const delta=price!==null&&reference!==null&&price>0&&reference>0
  ?Math.abs(price-reference)/((price+reference)/2)*100:null;
 const status=price===null||liq===null?'MISSING_PRICE_OR_LIQUIDITY':
   delta===null?'MISSING_GECKO_COMPARISON_PRICE':delta>3?'PRICE_DISAGREEMENT':
   liq<5000?'LOW_LIQUIDITY':'TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY';
 return {status,matched:true,checked_at_utc:checked,chain,pool,contract:token,
   pool_identity_key:identity.pool_key,token_identity_key:identity.token_key,
   dexscreener_price_usd:price,dexscreener_liquidity_usd:liq,
   geckoterminal_price_usd:reference,price_divergence_pct:delta,
   upstream_provider_independence_proven:false,
   quote_source_capture_at_utc:time(candidate?.observed_at_utc),
   provider_quote_asof_utc:null,provider_quote_asof_verified:false,
   provider_quote_age_seconds:null,
   trade_authorized:false};
}
