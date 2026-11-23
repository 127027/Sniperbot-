import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {V23_GECKO_FALLBACK_REQUESTS,auditV23GeckoFallback}
 from '../src/v23-gecko-neutral-fallback.mjs';
const record=(q,obj)=>({method:'GET',url:q.url,
 http_status:200,captured_at_utc:'2026-11-23T20:45:00.000Z',
 raw_text:JSON.stringify(obj),
 raw_sha256:createHash('sha256').update(JSON.stringify(obj)).digest('hex')});
test('four read-only Gecko fallback sources use only two neutral Solana pools',()=>{
 assert.equal(V23_GECKO_FALLBACK_REQUESTS.length,4);
 assert.ok(V23_GECKO_FALLBACK_REQUESTS.every(x=>x.url.startsWith(
   'https://api.geckoterminal.com/api/v2/networks/solana/')));
});
test('only exact included token identity + pool address is enough for postevent research match',()=>{
 const q=V23_GECKO_FALLBACK_REQUESTS[0];
 const response={data:[{attributes:{address:q.pool},relationships:{
   base_token:{data:{id:'solana_'+q.mint}}
 }}],included:[{id:'solana_'+q.mint,attributes:{address:q.mint}}]};
 const r=auditV23GeckoFallback({request:q,receipt:record(q,response)});
 assert.equal(r.exact_pool_and_mint_currently_confirmed,true);
 assert.equal(r.contemporaneous_october_information_proven,false);
 assert.equal(r.paper_orders_authorized,0);
});
test('pool address without included exact token is NOT falsely reported as mint match',()=>{
 const q=V23_GECKO_FALLBACK_REQUESTS[1];
 const response={data:{attributes:{address:q.pool},relationships:{
   base_token:{data:{id:'unavailable'}},
   quote_token:{data:{id:'unknown'}}
 }}};
 const r=auditV23GeckoFallback({request:q,receipt:record(q,response)});
 assert.equal(r.exact_pool_and_mint_currently_confirmed,false);
 assert.equal(r.exact_pool_only_without_mint_proof,true);
});
test('refuse mismatched raw sha and fabricated old provider capture',()=>{
 const q=V23_GECKO_FALLBACK_REQUESTS[2],x=record(q,{data:[]});
 assert.throws(()=>auditV23GeckoFallback({request:q,
  receipt:{...x,raw_sha256:'0'.repeat(64)}}),/INVALID_V23_GECKO_FALLBACK_EVIDENCE/);
 assert.throws(()=>auditV23GeckoFallback({request:q,
  receipt:{...x,captured_at_utc:'2026-10-12T12:00:00.000Z'}}),
  /INVALID_V23_GECKO_FALLBACK_EVIDENCE/);
});
