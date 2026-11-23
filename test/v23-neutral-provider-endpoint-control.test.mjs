import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {V23_CONTROL_REQUESTS,auditV23EndpointControl}
 from '../src/v23-neutral-provider-endpoint-control.mjs';
const make=(query,payload)=>({method:'GET',endpoint:query.url,status:200,
 captured_at_utc:'2026-11-23T20:40:00.000Z',
 raw_text:JSON.stringify(payload),
 sha256:createHash('sha256').update(JSON.stringify(payload)).digest('hex')
});
test('control covers precisely 2 neutral previously recovered Oct12 identities and 3 endpoints each',()=>{
 assert.equal(V23_CONTROL_REQUESTS.length,6);
 assert.deepEqual(V23_CONTROL_REQUESTS.map(x=>x.source),[
  'TOKENS_V1_ONE','TOKEN_PAIRS_V1_ONE','POOL_BY_ADDRESS',
  'TOKENS_V1_ONE','TOKEN_PAIRS_V1_ONE','POOL_BY_ADDRESS']);
 assert.ok(V23_CONTROL_REQUESTS.every(x=>x.url.startsWith('https://api.dexscreener.com/')));
 assert.ok(V23_CONTROL_REQUESTS.every(x=>x.pool.length>=32&&x.mint.length>=32));
});
test('exact same Solana pool and mint can be confirmed without trading authorization',()=>{
 const q=V23_CONTROL_REQUESTS[0];
 const evidence=[{chainId:'solana',pairAddress:q.pool,
  baseToken:{address:q.mint},quoteToken:{address:'So11111111111111111111111111111111111111112'}}];
 const r=auditV23EndpointControl({query:q,receipt:make(q,evidence)});
 assert.equal(r.matched_expected_token_and_pool,true);
 assert.equal(r.exact_original_pool_id_matches,1);
 assert.equal(r.original_october_provider_availability_proven,false);
 assert.equal(r.paper_trade_authorized,false);
});
test('HTTP 200 empty array means NO INDEX MATCH, not proof historical pool never existed',()=>{
 const q=V23_CONTROL_REQUESTS[0];
 const r=auditV23EndpointControl({query:q,receipt:make(q,[])});
 assert.equal(r.returned_pairs,0);
 assert.equal(r.matched_expected_token_and_pool,false);
 assert.equal(r.source_result_only_post_event,true);
});
test('reject forged source SHA and October-dated postevent provider response',()=>{
 const q=V23_CONTROL_REQUESTS[0],good=make(q,[]);
 assert.throws(()=>auditV23EndpointControl({query:q,receipt:{...good,
  sha256:'0'.repeat(64)}}),/INVALID_V23_NEUTRAL_ENDPOINT_PROBE/);
 assert.throws(()=>auditV23EndpointControl({query:q,receipt:{...good,
  captured_at_utc:'2026-10-12T01:00:00.000Z'}}),/INVALID_V23_NEUTRAL_ENDPOINT_PROBE/);
 assert.throws(()=>auditV23EndpointControl({query:{...q,
  url:'https://attacker.example/path'},receipt:good}),/INVALID_V23_NEUTRAL_ENDPOINT_PROBE/);
});
