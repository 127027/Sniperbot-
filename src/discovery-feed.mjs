// Pure utilities for durable cloud research evidence; never signs orders.
import {createHash} from 'node:crypto';
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
import {decodeGeckoNewPools,crossCheckDexPair} from './live-pool-discovery.mjs';
const chains=['solana','base','ethereum','bsc','robinhood','cronos'];
const apiNetwork=c=>c==='ethereum'?'eth':c==='cronos'?'cro':c;
const dexNetwork=c=>c==='ethereum'?'ethereum':c==='cronos'?'cronos':c;
export const sha256=s=>createHash('sha256').update(s).digest('hex');
export function validateCaptureRequest(value){
 if(value?.schema!==1||value.kind!=='DOT2_DISCOVERY_CAPTURE_REQUEST'||value.mode!=='PAPER_RESEARCH_ONLY'||value.requested_by!=='dot-2-discovery')throw Error('INVALID_CAPTURE_REQUEST');
 if(value.do_not_publish_orders!==true)throw Error('REAL_ORDER_DISABLED');
 if(!Array.isArray(value.networks)||!value.networks.length||value.networks.some(c=>!chains.includes(c)))throw Error('INVALID_NETWORKS');
 if(!Number.isInteger(value.max_gecko_requests)||value.max_gecko_requests<1||value.max_gecko_requests>12)throw Error('GECKO_BUDGET_EXCEEDED');
 if(!Number.isInteger(value.max_dex_pairs)||value.max_dex_pairs<0||value.max_dex_pairs>10)throw Error('DEX_BUDGET_EXCEEDED');
 const ohlcv=value.max_ohlcv_requests??0,older=value.max_older_pool_requests??0;
 if(!Number.isInteger(older)||older<0||older>2)
  throw Error('OLDER_POOL_RESERVATION_INVALID');
 if(!Number.isInteger(ohlcv)||ohlcv<0||ohlcv>2||
    value.max_gecko_requests-ohlcv-older<1)
  throw Error('OHLCV_OR_OLDER_POOL_RESERVATION_INVALID');
 const t=Date.parse(value.created_at_utc);
 if(!Number.isFinite(t))throw Error('INVALID_REQUEST_TIME');
 return value;
}
export function chooseNetwork(request,runNumber){
 const list=[...new Set(request.networks)];
 if(!list.length)throw Error('NO_CHAINS');
 const hour=new Date(request.created_at_utc).getUTCHours();
 const index=Number.isInteger(runNumber)&&runNumber>=0?runNumber%list.length:hour%list.length;
 return {chain:list[index],rotation:index,network:apiNetwork(list[index])};
}
const canonicalAddress=(chain,x)=>chain==='solana'?x:String(x).toLowerCase();
export function fromDexPairOnly({chain,pool,pool_kind=null,response,capturedAtUtc}={}){
 const c=canonicalChain(chain),t=Date.parse(capturedAtUtc);
 if(!c||!poolValid(c,pool,pool_kind)||!Number.isFinite(t))throw Error('INVALID_DEX_FALLBACK');
 const pairs=Array.isArray(response?.pairs)?response.pairs:Array.isArray(response)?response:[];
 const p=pairs.find(x=>canonicalChain(x?.chainId)===c
  &&poolValid(c,x?.pairAddress,pool_kind)&&canonicalAddress(c,x.pairAddress)===canonicalAddress(c,pool)
  &&tokenValid(c,x?.baseToken?.address));
 if(!p)return {status:'NO_VERIFIED_EXACT_PAIR_AND_BASE',candidate:null};
 const price=Number(p.priceUsd),liq=Number(p.liquidity?.usd);
 const contract=p.baseToken.address;
 return {status:'SINGLE_PROVIDER_IDENTITY_NEEDS_SECOND_CONFIRMATION',
  candidate:{chain:c,pool,pool_kind,contract,symbol:p.baseToken?.symbol||null,
    source_api:'DEXSCREENER_PAIR_JSON',source_url:'https://dexscreener.com/'+dexNetwork(c)+'/'+pool,
    observed_at_utc:new Date(t).toISOString(),
    price_usd:Number.isFinite(price)&&price>0?price:null,
    liquidity_usd:Number.isFinite(liq)&&liq>=0?liq:null,
    proof_level:'SINGLE_DEX_PROVIDER_NOT_BUY_ELIGIBLE',trade_authorized:false}};
}
export function collectSampleMetrics({geckoDecoded,dexChecks=[],fallbackCandidates=[],requests=[]}={}){
 const candidates=geckoDecoded?.candidates??[];
 return {schema:1,mode:'PAPER_RESEARCH_ONLY',source_network:geckoDecoded?.network??null,
  gecko_fetched:candidates.length,gecko_complete_contracts:candidates.filter(x=>x.contract).length,
  dex_checks:dexChecks.length,dex_exact_matched:dexChecks.filter(x=>x.matched).length,
  // Keep overall exact-pair matches distinct from independently cross-confirmed quotes.
  dex_two_domain_identity_matches:dexChecks.filter(x=>x.matched&&x.status!=='SINGLE_PROVIDER_IDENTITY_NEEDS_SECOND_CONFIRMATION').length,
  dex_single_provider_identity_only:dexChecks.filter(x=>x.status==='SINGLE_PROVIDER_IDENTITY_NEEDS_SECOND_CONFIRMATION').length,
  dex_indicative_complete:dexChecks.filter(x=>x.status==='TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY').length,
  dex_fallback_full_contracts:fallbackCandidates.filter(x=>x?.contract).length,
  total_observations:candidates.length+fallbackCandidates.length,
  fetch_errors:requests.filter(x=>x?.error).map(x=>({provider:x.provider,error:x.error})),
  actionable_orders:0,client_fills:0};
}
export {decodeGeckoNewPools,crossCheckDexPair};
