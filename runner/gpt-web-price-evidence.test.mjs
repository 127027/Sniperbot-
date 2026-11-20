import test from 'node:test';
import assert from 'node:assert/strict';
import {GPT_WEB_PRICE_SCHEMA,validateGptWebPriceEvidence} from './gpt-web-price-evidence.mjs';
const now=Date.parse('2026-11-20T22:35:00.000Z');
const at=new Date(now-30000).toISOString();
const token='619pqYDbUcNpCuobgg2Ed8sxeocfmGzwfHWsTCe2pump';
const pool='GEcf96TkXvnYJqzr1Tr6GQQBwixt6hpPTGxLuGGoiNwk';
const base=()=>({
 schema:GPT_WEB_PRICE_SCHEMA,mode:'PAPER_ONLY',
 chain:'solana',token_address:token,pool_address:pool,
 observed_at_utc:at,price_usd:0.000012,liquidity_usd:25000,
 quote_quality:'INDICATIVE_WEB_ONLY',
 sellability_verified:false,executable_quote_verified:false,
 sources:[
  {url:'https://dexscreener.com/solana/'+pool,
   observed_at_utc:at,price_usd:0.0000121,liquidity_usd:24800},
  {url:'https://www.geckoterminal.com/solana/pools/'+pool,
   observed_at_utc:at,price_usd:0.0000119,liquidity_usd:24600}
 ]
});
const parse=(e)=>validateGptWebPriceEvidence(e,{chain:'solana',token,pool,now});
test('Two separate public web pages can describe an explicitly UNEXECUTABLE Solana PAPER observation',()=>{
 const q=parse(base());
 assert.equal(q.source,'GPT_WEB_PRICE_INDICATIVE');
 assert.equal(q.chain,'solana');
 assert.equal(q.token_address,token);
 assert.equal(q.pool_address,pool);
 assert.equal(q.sourceCount,2);
 assert.equal(q.sellability_verified,false);
 assert.equal(q.executable_quote_verified,false);
 assert.equal(q.priceUsd,0.000012);
});
test('Expired or future source claims fail closed',()=>{
 assert.throws(()=>parse({...base(),observed_at_utc:new Date(now-3*60000).toISOString()}),/STALE_OR_FUTURE/);
 assert.throws(()=>parse({...base(),sources:base().sources.map(x=>({...x,observed_at_utc:new Date(now+6000).toISOString()}))}),/STALE_OR_FUTURE/);
});
test('No provider API, fake host or tokenless URL is acceptable evidence',()=>{
 const one=base();
 one.sources[1].url='https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=1';
 assert.throws(()=>parse(one),/NOT_ALLOWED/);
 const two=base();two.sources[1].url='https://dexscreener.com.evil.example/solana/'+pool;
 assert.throws(()=>parse(two),/NOT_ALLOWED/);
 const three=base();three.sources[0].url='https://dexscreener.com/solana/unknown';
 assert.throws(()=>parse(three),/LACKS_EXACT_TOKEN_OR_POOL/);
});
test('Fake two sources on the same host and contradictory prices cannot pass',()=>{
 const one=base();one.sources[1].url='https://www.dexscreener.com/solana/'+pool;
 assert.throws(()=>parse(one),/NOT_INDEPENDENT_HOSTS/);
 const two=base();two.sources[1].price_usd=0.0003;
 assert.throws(()=>parse(two),/CONTRADICT_QUOTE/);
});
test('Paper evidence cannot claim buy/sell execution, or verified sellability',()=>{
 assert.throws(()=>parse({...base(),sellability_verified:true}),/SCHEMA_OR_IDENTITY_INVALID/);
 assert.throws(()=>parse({...base(),executable_quote_verified:true}),/SCHEMA_OR_IDENTITY_INVALID/);
 assert.throws(()=>parse({...base(),mode:'LIVE'}),/SCHEMA_OR_IDENTITY_INVALID/);
 assert.throws(()=>parse({...base(),token_address:'BAD'}),/SCHEMA_OR_IDENTITY_INVALID/);
});
