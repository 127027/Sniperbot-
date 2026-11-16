import test from "node:test";
import assert from "node:assert/strict";
import {memeDiscoveryCandidate,MEME_SNIPER_EXCLUDED_SYMBOLS}
 from "./memecoin-only-candidate-gate.mjs";

const t="2026-11-16T18:00:00Z";
const token="5JB57BRzLGkowV6YCRwK1y9fdhSongcRKVPLxN5kpump";
const pool="CDjP1iwexRRbszs91n4WLV8Mz3EynmWE37NCrtqdhfmz";
const news={symbol:"NEWVIRAL",chain:"solana",token_address:token,
 pool_address:pool,theme:"CULTURAL_SOCIAL_MEME",
 claimed_fdv_usd:1500000,
 fdv_observed_at_utc:"2026-11-16T17:30:00Z",
 launched_at_utc:"2026-11-15T10:00:00Z"};
test("very early legitimate meme is research-only and never BUY authority",()=>{
 const c=memeDiscoveryCandidate(news,{asof_utc:t});
 assert.equal(c.eligible_for_meme_research,true);
 assert.equal(c.status,"NEW_SMALL_MEME_CANDIDATE");
 assert.equal(c.model_gpt_buy_authorized,false);
 assert.equal(c.admission_does_not_prove_10x_profit,true);
});
test("BTC ETH SOL and major legacy memes stay out of buy research universe",()=>{
 for(const name of ["BTC","ETH","SOL","BNB","PEPE","DOGE","SHIB","BONK"]){
  assert(MEME_SNIPER_EXCLUDED_SYMBOLS.includes(name));
  assert.equal(memeDiscoveryCandidate({...news,symbol:name},{
   asof_utc:t}).eligible_for_meme_research,false);
 }
});
test("an older token needs independently confirmed recent media hype",()=>{
 const old={...news,launched_at_utc:"2025-06-01T00:00:00Z",
  media_event_at_utc:"2026-11-16T15:00:00Z"};
 assert.equal(memeDiscoveryCandidate(old,{asof_utc:t}).status,
  "NOT_NEW_AND_NO_VERIFIED_FRESH_MEME_EVENT");
 assert.equal(memeDiscoveryCandidate({...old,independently_verified_media_sources:2},
  {asof_utc:t}).status,"VERIFIED_VIRAL_SMALL_MEME_CANDIDATE");
 assert.equal(memeDiscoveryCandidate({...old,independently_verified_media_sources:2,
  media_event_at_utc:"2026-11-17T01:00:00Z"},{asof_utc:t}).eligible_for_meme_research,false);
});
test("size, age, chain, missing contract/pool and stale FDV fail closed",()=>{
 assert.equal(memeDiscoveryCandidate({...news,claimed_fdv_usd:100_000_000},
  {asof_utc:t}).eligible_for_meme_research,false);
 assert.equal(memeDiscoveryCandidate({...news,claimed_fdv_usd:null},
  {asof_utc:t}).eligible_for_meme_research,false);
 assert.equal(memeDiscoveryCandidate({...news,chain:"btc"},
  {asof_utc:t}).eligible_for_meme_research,false);
 assert.equal(memeDiscoveryCandidate({...news,pool_address:"not a real pool"},
  {asof_utc:t}).eligible_for_meme_research,false);
 assert.equal(memeDiscoveryCandidate({...news,fdv_observed_at_utc:"2026-11-12T00:00:00Z"},
  {asof_utc:t}).eligible_for_meme_research,false);
});
