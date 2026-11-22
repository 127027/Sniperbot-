import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCaptureObservationBatch,scoreAsOf} from '../src/forward-learning.mjs';
const pool='0x'+'a'.repeat(40),contract='0x'+'b'.repeat(40);
const ts=m=>new Date(Date.parse('2026-11-22T00:00:00.000Z')+m*60000).toISOString();
const candidate=(m,price,volume,liquidity=16000)=>({
 chain:'base',pool,contract,symbol:'MEME',observed_at_utc:ts(m),
 observed_price_usd:price,volume_24h_usd:volume,liquidity_usd:liquidity
});
const batch=(m,items,source)=>makeCaptureObservationBatch({capturedAtUtc:ts(m),
 sourcePath:'research/feeds/2026-11-22/'+m+'/'+source+'.raw.json',
 ...(source==='gecko'?{geckoCandidates:items}:{dexFallbackCandidates:items})});
test('realistic Gecko volume first + later DEX price-only recheck becomes rankable',()=>{
 const first=batch(0,[candidate(0,.001,12000)],'gecko');
 const later=batch(30,[candidate(30,.0012,null)],'dex');
 const r=scoreAsOf({batches:[first,later],asOfUtc:ts(30)});
 assert.equal(r.counts.research_rankable,1);
 const x=r.candidates[0];
 assert.ok(Math.abs(x.observed_price_change_pct-20)<1e-8);
 assert.equal(x.research_effective_volume_24h_usd,12000);
 assert.equal(x.research_volume_source_at_utc,ts(0));
 assert.equal(x.carried_forward_volume_for_research,true);
 assert.equal(x.observed_volume_24h_change_pct,null);
 assert.equal(x.risk_eligible,false);
 assert.equal(x.trade_authorized,false);
});
test('a single capture, or a second capture before five minutes, stays WATCH',()=>{
 const one=batch(0,[candidate(0,.001,12000)],'gecko');
 const fast=batch(3,[candidate(3,.0012,null)],'dex');
 const r=scoreAsOf({batches:[one,fast],asOfUtc:ts(3)});
 assert.equal(r.counts.research_rankable,0);
 assert.equal(r.candidates[0].status,'WATCH_INSUFFICIENT_REPEATED_EVIDENCE');
});
test('four-hour carry-forward limit: stale volume cannot substitute for current evidence',()=>{
 const first=batch(0,[candidate(0,.001,12000)],'gecko');
 const later=batch(301,[candidate(301,.0012,null)],'dex');
 const r=scoreAsOf({batches:[first,later],asOfUtc:ts(301)});
 assert.equal(r.counts.research_rankable,0);
 assert.equal(r.candidates[0].research_effective_volume_24h_usd,null);
});
test('future DEX observations are invisible to an earlier as-of decision',()=>{
 const first=batch(0,[candidate(0,.001,12000)],'gecko');
 const later=batch(30,[candidate(30,.002,null)],'dex');
 const r=scoreAsOf({batches:[first,later],asOfUtc:ts(0)});
 assert.equal(r.counts.research_rankable,0);
 assert.equal(r.candidates[0].evidence_batches,1);
});
test('fresh but insufficient liquidity is still WATCH regardless of past volume',()=>{
 const first=batch(0,[candidate(0,.001,12000)],'gecko');
 const later=batch(30,[candidate(30,.0012,null,300)],'dex');
 const r=scoreAsOf({batches:[first,later],asOfUtc:ts(30)});
 assert.equal(r.counts.research_rankable,0);
 assert.equal(r.candidates[0].status,'WATCH_INSUFFICIENT_REPEATED_EVIDENCE');
});
