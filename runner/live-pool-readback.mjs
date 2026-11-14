// V0.9 prospective cross-provider EXACT pool identity readback.
// READ-ONLY public APIs; indicative price/LP are NOT executable swap quotes.
// Never imports actions, signatures, wallet credentials or paper ledger.
import {candidateId} from './research-watchlist.mjs';

const MARKETS=Object.freeze({
 solana:{gt:'solana',ds:'solana'},
 base:{gt:'base',ds:'base'},
 bsc:{gt:'bsc',ds:'bsc'},
 eth:{gt:'eth',ds:'ethereum'}
});
const LIMIT=256*1024;
function positive(v){return typeof v==='number'&&Number.isFinite(v)&&v>0}
function samplePrice(v){const n=Number(v);return v!==null&&v!==undefined&&v!==''&&positive(n)?n:null}
function fail(reason,at,id,details=[]){return {schema:'exact_pool_readback.v1',paper_only:true,actionable:false,
 candidate_id:id||null,checked_at_utc:at,status:'UNVERIFIED',reason,
 sources:details,market_identity_verified:false,contract_status:'UNKNOWN',
 sellability_status:'UNKNOWN',independent_risk_status:'UNKNOWN',executable_buy_quote:false,
 executable_sell_quote:false,paper_entry_authorized:false,calibrated_breakout_probability:null};}
async function limitedJson(url,fetcher){
 const u=new URL(url);
 if(u.protocol!=='https:'||!['api.geckoterminal.com','api.dexscreener.com'].includes(u.hostname))
  throw Error('UNTRUSTED_SOURCE');
 const r=await fetcher(url,{redirect:'error',headers:{accept:'application/json'},
  signal:AbortSignal.timeout(9000)});
 if(!r?.ok)throw Error('HTTP_'+(r?.status||'UNKNOWN'));
 const declared=Number(r.headers?.get?.('content-length')||0);
 if(declared>LIMIT)throw Error('RESPONSE_TOO_LARGE');
 let raw='',length=0;
 if(r.body&&typeof r.body[Symbol.asyncIterator]==='function'){
  const dec=new TextDecoder();
  for await(const chunk of r.body){length+=chunk.length;
   if(length>LIMIT)throw Error('RESPONSE_TOO_LARGE');
   raw+=dec.decode(chunk,{stream:true});
  }
  raw+=dec.decode();
 }else{
  raw=await r.text();
  if(Buffer.byteLength(raw,'utf8')>LIMIT)throw Error('RESPONSE_TOO_LARGE');
 }
 return JSON.parse(raw);
}
function networkIdentity(c){
 try{
  const id=candidateId(c.chain,c.token_address,c.pool_address);
  return id===c.candidate_id?id:null;
 }catch{return null}
}
function gtData(json,c){
 const data=json?.data;
 const att=data?.attributes,base=data?.relationships?.base_token?.data?.id;
 const chain=MARKETS[c.chain].gt;
 if(!att||typeof base!=='string'||!base.startsWith(chain+'_'))return null;
 if(networkIdentity({chain:c.chain,token_address:base.slice(chain.length+1),
  pool_address:att.address,candidate_id:c.candidate_id})!==c.candidate_id)return null;
 return {price_usd:samplePrice(att.base_token_price_usd),
  liquidity_usd:samplePrice(att.reserve_in_usd)};
}
function dsData(json,c){
 const market=MARKETS[c.chain].ds;
 const pairs=Array.isArray(json?.pairs)?json.pairs:[];
 const p=pairs.find(pair=>pair?.chainId===market&&
   networkIdentity({chain:c.chain,token_address:pair?.baseToken?.address,
    pool_address:pair?.pairAddress,candidate_id:c.candidate_id})===c.candidate_id);
 if(!p)return null;
 return {price_usd:samplePrice(p.priceUsd),liquidity_usd:samplePrice(p.liquidity?.usd)};
}
function providerResult(name,p,reason=null){
 return {provider:name,identity_match:!!p,price_usd:p?.price_usd??null,
  liquidity_usd:p?.liquidity_usd??null,error:reason};
}
function errorCode(e){
 const m=String(e?.message||'PROVIDER_UNAVAILABLE');
 return /^(HTTP_\d+|HTTP_UNKNOWN|RESPONSE_TOO_LARGE|UNTRUSTED_SOURCE)$/.test(m)?m:
  e?.name==='TimeoutError'?'TIMEOUT':'PROVIDER_UNAVAILABLE';
}
export async function readbackExactPool(candidate,{fetcher=fetch,now=new Date().toISOString()}={}){
 const at=Date.parse(now);
 if(!Number.isFinite(at))throw Error('INVALID_READBACK_CLOCK');
 const id=networkIdentity(candidate||{});
 if(!id)return fail('INVALID_CANDIDATE_IDENTITY',new Date(at).toISOString(),null);
 const chain=MARKETS[candidate.chain];
 const gtUrl='https://api.geckoterminal.com/api/v2/networks/'+chain.gt+'/pools/'+encodeURIComponent(candidate.pool_address);
 const dsUrl='https://api.dexscreener.com/latest/dex/pairs/'+chain.ds+'/'+encodeURIComponent(candidate.pool_address);
 const settled=await Promise.allSettled([limitedJson(gtUrl,fetcher),limitedJson(dsUrl,fetcher)]);
 const a=settled[0].status==='fulfilled'?gtData(settled[0].value,candidate):null;
 const b=settled[1].status==='fulfilled'?dsData(settled[1].value,candidate):null;
 const sourceResults=[
  providerResult('GECKOTERMINAL',a,settled[0].status==='rejected'?errorCode(settled[0].reason):a?null:'POOL_IDENTITY_MISMATCH'),
  providerResult('DEXSCREENER',b,settled[1].status==='rejected'?errorCode(settled[1].reason):b?null:'POOL_IDENTITY_MISMATCH')
 ];
 if(!a||!b)return fail('TWO_EXACT_PROVIDER_IDENTITIES_REQUIRED',new Date(at).toISOString(),id,sourceResults);
 if(!positive(a.price_usd)||!positive(b.price_usd)||!positive(a.liquidity_usd)||!positive(b.liquidity_usd))
  return fail('PRICE_OR_LIQUIDITY_UNKNOWN',new Date(at).toISOString(),id,sourceResults);
 const priceRatio=Math.max(a.price_usd,b.price_usd)/Math.min(a.price_usd,b.price_usd);
 const liquidityRatio=Math.max(a.liquidity_usd,b.liquidity_usd)/Math.min(a.liquidity_usd,b.liquidity_usd);
 if(priceRatio>1.25||liquidityRatio>2)
  return fail('CROSS_PROVIDER_MARKET_METRICS_CONFLICT',new Date(at).toISOString(),id,sourceResults);
 return {...fail('IDENTITY_ONLY_RISK_AND_SELL_QUOTE_STILL_UNKNOWN',new Date(at).toISOString(),id,sourceResults),
  status:'IDENTITY_MATCHED',market_identity_verified:true};
}
