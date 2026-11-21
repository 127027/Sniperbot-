// JSON-only public market-data decoder; no network, wallets, or order actions.
import {canonicalChain,tokenValid,poolValid} from './market-evidence.mjs';
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
  if(!poolValid(chain,pool,a.pool_kind)){rejected.push({row:i,reason:'POOL_ADDRESS_MISSING_OR_INVALID'});continue;}
  const ref=record?.relationships?.base_token?.data?.id;
  const base=typeof ref==='string'?included.get(ref):null;
  const value=base?.attributes?.address??null;
  const contract=tokenValid(chain,value)?value:null;
  const created=time(a.pool_created_at);
  candidates.push({chain,pool,pool_kind:a.pool_kind??null,contract,
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
 if(!chain||!poolValid(chain,pool,candidate?.pool_kind)||!tokenValid(chain,token))
  return {status:'IDENTITY_INCOMPLETE',checked_at_utc:checked,matched:false};
 const pair=pairs.find(p=>canonicalChain(p?.chainId)===chain&&poolValid(chain,p?.pairAddress,candidate?.pool_kind)
  &&norm(chain,p.pairAddress)===norm(chain,pool)&&tokenValid(chain,p?.baseToken?.address)
  &&norm(chain,p.baseToken.address)===norm(chain,token));
 if(!pair)return {status:'NO_MATCHING_CHAIN_POOL_BASE_TOKEN',checked_at_utc:checked,matched:false,returned_pairs:pairs.length};
 const price=num(pair.priceUsd),liq=num(pair?.liquidity?.usd),reference=num(candidate?.observed_price_usd);
 const delta=price!==null&&reference!==null&&price>0&&reference>0
  ?Math.abs(price-reference)/((price+reference)/2)*100:null;
 const status=price===null||liq===null?'MISSING_PRICE_OR_LIQUIDITY':
   delta===null?'MISSING_GECKO_COMPARISON_PRICE':delta>3?'PRICE_DISAGREEMENT':
   liq<5000?'LOW_LIQUIDITY':'TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY';
 return {status,matched:true,checked_at_utc:checked,chain,pool,contract:token,
   dexscreener_price_usd:price,dexscreener_liquidity_usd:liq,
   geckoterminal_price_usd:reference,price_divergence_pct:delta,
   provider_quote_asof_verified:false,trade_authorized:false};
}
