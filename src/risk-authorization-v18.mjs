// V1.8 non-authorizing SHADOW preflight. Blob SHA strings are NOT verified origins.
// External GitHub blob fetch, signature/actor policy, and security proof verification
// remain mandatory before any active PAPER authorization.
import {canonicalChain,tokenValid,poolValid,parsePoolUrl,exactPoolUrl} from './market-evidence.mjs';
import {classifyDot3QuoteTime} from './v19-dot3-quote-time.mjs';
const tm=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const sha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const canon=(c,x)=>c==='solana'?x:String(x).toLowerCase();
const deny=(code)=>({schema:1,kind:'V18_DOT3_SHADOW_CHECK',status:'BLOCKED',code,trade_authorized:false});
export function inspectDot3Attestation({attestation,order,nowUtc,expectedBlobSha}={}){
 const at=tm(nowUtc),a=attestation,c=order?.coin,ch=canonicalChain(c?.chain);
 if(at===null||!sha(expectedBlobSha))return deny('INVALID_CLOCK_OR_SHA');
 if(a?.schema!==1||a?.kind!=='DOT3_PAPER_RISK_ATTESTATION'||a?.mode!=='PAPER'
    ||a?.issued_by!=='dot-3-risk'||a?.status!=='ELIGIBLE')return deny('NO_DOT3_APPROVAL');
 if(!ch||!tokenValid(ch,c?.contract)||!poolValid(ch,c?.pool,c?.pool_kind)
    ||canonicalChain(a.coin?.chain)!==ch
    ||canon(ch,c.contract)!==canon(ch,a.coin?.contract)
    ||canon(ch,c.pool)!==canon(ch,a.coin?.pool)
    ||(c.pool_kind||null)!==(a.coin?.pool_kind||null))return deny('COIN_IDENTITY_MISMATCH');
 const issue=tm(a.issued_at_utc),expiry=tm(a.expires_at_utc);
 if(issue===null||expiry===null||issue>at||expiry<at||expiry<=issue
    ||at-issue>300000||expiry-issue>300000)return deny('APPROVAL_STALE');
 if(!Array.isArray(a.quotes)||a.quotes.length!==2)return deny('MISSING_QUOTES');
 const origins=new Set(),evidence=new Set(),prices=[],liquidity=[];
 for(const q of a.quotes){
   const p=parsePoolUrl(q?.source_url);
   if(!p||!exactPoolUrl(q.source_url,ch,c.pool)||origins.has(p.host)
      ||q.chain!==ch||canon(ch,q.contract)!==canon(ch,c.contract)
      ||canon(ch,q.pool)!==canon(ch,c.pool))return deny('QUOTE_IDENTITY_OR_ORIGIN_MISMATCH');
   let timeEvidence;
   try{
     timeEvidence=classifyDot3QuoteTime({
       asOfUtc:nowUtc,capturedAtUtc:q.captured_at_utc,
       providerQuoteAsOfUtc:q.provider_quote_asof_utc,
       availableAtUtc:q.available_at_utc??q.captured_at_utc});
   }catch{return deny('QUOTE_TIME_UNKNOWN_OR_STALE');}
   if(timeEvidence.status!=='PROVIDER_TIMESTAMP_CLAIMED_FRESH')
     return deny('QUOTE_TIME_UNKNOWN_OR_STALE');
   // Structural pass NEVER upgrades a claimed timestamp into independent
   // provider-time authentication or an executable paper order.
   if(!num(q.price_usdc)||!num(q.liquidity_usdc)||!sha(q.snapshot_blob_sha))return deny('INCOMPLETE_QUOTE_EVIDENCE');
   origins.add(p.host);evidence.add(q.snapshot_blob_sha);prices.push(q.price_usdc);liquidity.push(q.liquidity_usdc);
 }
 if(evidence.size!==2)return deny('DUPLICATE_EVIDENCE');
 const divergence=100*Math.abs(prices[0]-prices[1])/((prices[0]+prices[1])/2);
 if(divergence>3)return deny('PRICE_CONFLICT');
 if(liquidity.some(x=>x<5000))return deny('LOW_LIQUIDITY');
 if(a.sellability?.verified!==true||!sha(a.sellability.evidence_blob_sha)
    ||!a.sellability.method||tm(a.sellability.checked_at_utc)===null
    ||tm(a.sellability.checked_at_utc)>at
    ||at-tm(a.sellability.checked_at_utc)>300000)return deny('SELLABILITY_NOT_PROVEN');
 if(a.security?.verified!==true||!sha(a.security.evidence_blob_sha))
   return deny('SECURITY_NOT_PROVEN');
 return {schema:1,kind:'V18_DOT3_SHADOW_CHECK',
    status:'STRUCTURAL_PASS_EXTERNAL_VERIFICATION_REQUIRED',
    quote_price_disagreement_pct:divergence,minimum_liquidity_usd:Math.min(...liquidity),
    expected_blob_sha:expectedBlobSha,
    source_blobs_actually_verified:false,issuer_actually_verified:false,
    provider_quote_times_independently_verified:false,
    trade_authorized:false};
}
