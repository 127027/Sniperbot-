import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateId} from './research-watchlist.mjs';
import {detectFirstSeenRecentPoolLeads} from './research-hype-triggers.mjs';

const at='2026-11-17T12:00:00Z';
const token='9'.repeat(44),pool='8'.repeat(44);
const candidate={
 chain:'solana',token_address:token,pool_address:pool,
 candidate_id:candidateId('solana',token,pool),
 source:'GECKOTERMINAL_NEW_POOLS',promotion_biased:false,
 pool_created_at_utc:'2026-11-17T11:58:30Z',
 liquidity_usd:2000,source_urls:['https://api.geckoterminal.com/example']
};
const snapshot=(candidates=[],timestamp=at)=>({
 schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
 published_at_utc:timestamp,candidates
});
test('first seen recent pool yields research request even without previous scan',()=>{
 const r=detectFirstSeenRecentPoolLeads(null,snapshot([candidate]));
 assert.equal(r.events.length,1);
 assert.equal(r.events[0].event_type,'NEW_POOL_FIRST_OBSERVED');
 assert.equal(r.events[0].provider_creation_age_at_observation_ms,90000);
 assert.equal(r.events[0].recommended_action,'INDEPENDENT_FIVE_ROLE_REVIEW');
 assert.equal(r.events[0].actionable,false);
 assert.equal(r.events[0].probability_pct,null);
 assert.ok(r.events[0].unknown_checks.includes('SELLABILITY'));
});
test('previously observed and promoted pools are not renamed as new',()=>{
 assert.equal(detectFirstSeenRecentPoolLeads(snapshot([candidate]),snapshot([candidate])).events.length,0);
 assert.equal(detectFirstSeenRecentPoolLeads(null,snapshot([{...candidate,promotion_biased:true}])).events.length,0);
});
test('old and future provider creation timestamps are rejected; invalid predecessor fails closed',()=>{
 const old={...candidate,pool_created_at_utc:'2026-11-17T11:20:00Z'};
 const future={...candidate,pool_created_at_utc:'2026-11-17T12:01:00Z'};
 assert.equal(detectFirstSeenRecentPoolLeads(null,snapshot([old,future])).events.length,0);
 assert.equal(detectFirstSeenRecentPoolLeads({schema:'bad'},snapshot([candidate])).events.length,0);
});
test('same pool consistently hashes to one deduplicable alert ID',()=>{
 const a=detectFirstSeenRecentPoolLeads(null,snapshot([candidate])).events[0];
 const b=detectFirstSeenRecentPoolLeads(null,snapshot([candidate],'2026-11-17T12:01:00Z')).events[0];
 assert.equal(a.event_id,b.event_id);
 assert.match(a.event_id,/^research-alert-[a-f0-9]{32}$/);
});
