import test from 'node:test';
import assert from 'node:assert/strict';
import {readbackExactPool} from './live-pool-readback.mjs';

const chain='base',token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40);
const candidate={chain,token_address:token,pool_address:pool,candidate_id:chain+':'+token+':'+pool};
const now='2026-11-10T13:00:00Z';
const gecko=(t=token,p=pool,price='0.0002',liq=20000)=>({
 data:{attributes:{address:p,base_token_price_usd:price,reserve_in_usd:liq},
 relationships:{base_token:{data:{id:'base_'+t}}}}});
const dex=(t=token,p=pool,price='0.00021',liq=21000)=>({
 pairs:[{chainId:'base',pairAddress:p,baseToken:{address:t},priceUsd:price,
 liquidity:{usd:liq}}]});
function source(a=gecko(),b=dex(),fault=null){
 const urls=[];
 const fetcher=async url=>{
  urls.push(url);
  if(fault&&url.includes(fault))throw Error('NETWORK_CLOSED');
  return new Response(JSON.stringify(url.includes('geckoterminal')?a:b),{status:200,
   headers:{'content-type':'application/json'}});
 };
 return {fetcher,urls};
}
test('two matching live-pool readbacks prove identity only, never approve a trade',async()=>{
 const v=source(),result=await readbackExactPool(candidate,{fetcher:v.fetcher,now});
 assert.equal(result.status,'IDENTITY_MATCHED');
 assert.equal(result.market_identity_verified,true);
 assert.equal(result.contract_status,'UNKNOWN');
 assert.equal(result.sellability_status,'UNKNOWN');
 assert.equal(result.independent_risk_status,'UNKNOWN');
 assert.equal(result.paper_entry_authorized,false);
 assert.equal(result.executable_sell_quote,false);
 assert.equal(result.executable_buy_quote,false);
 assert.equal(result.calibrated_breakout_probability,null);
 assert.equal(v.urls.length,2);
 assert(v.urls.every(u=>u.startsWith('https://api.')));
});
test('one provider mismatch or unavailable returns UNVERIFIED',async()=>{
 const a=await readbackExactPool(candidate,{fetcher:source(gecko(token,'0x'+'c'.repeat(40))).fetcher,now});
 assert.equal(a.status,'UNVERIFIED');
 assert.equal(a.reason,'TWO_EXACT_PROVIDER_IDENTITIES_REQUIRED');
 const b=await readbackExactPool(candidate,{fetcher:source(gecko(),dex(),'/latest/dex/pairs/').fetcher,now});
 assert.equal(b.sources[1].error,'PROVIDER_UNAVAILABLE');
 assert.equal(b.market_identity_verified,false);
});
test('same identity but different prices or liquidity blocks; no price estimates fabricated',async()=>{
 const divergence=await readbackExactPool(candidate,{fetcher:source(gecko(),dex(token,pool,'0.01',20000)).fetcher,now});
 assert.equal(divergence.reason,'CROSS_PROVIDER_MARKET_METRICS_CONFLICT');
 const empty=await readbackExactPool(candidate,{fetcher:source(gecko(token,pool,'0',20000),dex()).fetcher,now});
 assert.equal(empty.reason,'PRICE_OR_LIQUIDITY_UNKNOWN');
});
test('untrusted chain/address and tampered candidate_id never trigger requests',async()=>{
 let count=0;
 const fetcher=async()=>{count++;throw Error('SHOULD_NOT_RUN')};
 const cases=[{...candidate,chain:'evil'}, {...candidate,pool_address:'../../foo'},
  {...candidate,candidate_id:'base:wrong:pair'}, {...candidate,token_address:'https://evil.example'}];
 for(const bad of cases){
  const result=await readbackExactPool(bad,{fetcher,now});
  assert.equal(result.status,'UNVERIFIED');
  assert.equal(result.reason,'INVALID_CANDIDATE_IDENTITY');
 }
 assert.equal(count,0);
});
test('oversized provider response cannot be treated as evidence',async()=>{
 const fetcher=async()=>new Response('x'.repeat(262146),{status:200});
 const r=await readbackExactPool(candidate,{fetcher,now});
 assert.equal(r.status,'UNVERIFIED');
 assert(r.sources.every(x=>x.error==='RESPONSE_TOO_LARGE'));
});
test('chain mismatch and fake baseToken mapping cannot pass',async()=>{
 const r=await readbackExactPool(candidate,{fetcher:source(gecko(),{
  pairs:[{chainId:'ethereum',pairAddress:pool,baseToken:{address:token},
   priceUsd:'0.0002',liquidity:{usd:20000}}]}).fetcher,now});
 assert.equal(r.market_identity_verified,false);
 assert.equal(r.sources[1].error,'POOL_IDENTITY_MISMATCH');
});
