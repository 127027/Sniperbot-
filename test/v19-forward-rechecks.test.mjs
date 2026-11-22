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


test('as-of research never ranks a previously rising but now 16-hour stale pool',()=>{
 const first=batch(0,[candidate(0,.001,12000)],'gecko');
 const second=batch(30,[candidate(30,.0013,null)],'dex');
 const at=ts(1000);
 const ranking=scoreAsOf({batches:[first,second],asOfUtc:at});
 assert.equal(ranking.counts.observed_unique_pools,1);
 assert.equal(ranking.counts.research_rankable,0);
 assert.equal(ranking.counts.stale_last_captures,1);
 const item=ranking.candidates[0];
 assert.equal(item.status,'WATCH_STALE_LAST_CAPTURE');
 assert.equal(item.score,null);
 assert.equal(item.latest_capture_is_recent,false);
 assert.ok(item.latest_capture_age_minutes>900);
 assert.ok(item.observed_price_change_pct>25); // historical feature retained, NOT ranked
 assert.equal(item.trade_authorized,false);
});
test('stale pool becomes research-prioritized again only after genuinely newer time-separated capture',()=>{
 const first=batch(0,[candidate(0,.001,12000)],'gecko');
 const second=batch(30,[candidate(30,.0013,null)],'dex');
 const recent=batch(970,[candidate(970,.00135,14500)],'gecko');
 const latest=batch(1000,[candidate(1000,.0014,15000)],'gecko');
 const cutoff=scoreAsOf({batches:[first,second],asOfUtc:ts(1000)});
 const recovered=scoreAsOf({batches:[first,second,recent,latest],asOfUtc:ts(1000)});
 assert.equal(cutoff.counts.research_rankable,0);
 assert.equal(recovered.counts.research_rankable,1);
 assert.equal(recovered.candidates[0].last_capture_at_utc,ts(1000));
 assert.equal(recovered.candidates[0].latest_capture_age_minutes,0);
 assert.equal(recovered.candidates[0].trade_authorized,false);
});
test('no future lookahead can refresh an old signal in earlier as-of snapshot',()=>{
 const first=batch(0,[candidate(0,.001,12000)],'gecko');
 const second=batch(30,[candidate(30,.0013,null)],'dex');
 const nextDay=batch(1000,[candidate(1000,.003,15000)],'gecko');
 const r=scoreAsOf({batches:[first,second,nextDay],asOfUtc:ts(800)});
 assert.equal(r.counts.research_rankable,0);
 assert.equal(r.candidates[0].last_capture_at_utc,ts(30));
 assert.equal(r.candidates[0].status,'WATCH_STALE_LAST_CAPTURE');
});
test('research TTL is configurable and validated, never grants buy authorization',()=>{
 const first=batch(0,[candidate(0,.001,12000)],'gecko');
 const second=batch(30,[candidate(30,.0011,null)],'dex');
 const a=scoreAsOf({batches:[first,second],asOfUtc:ts(150)});
 const b=scoreAsOf({batches:[first,second],asOfUtc:ts(151)});
 assert.equal(a.counts.research_rankable,1);
 assert.equal(b.counts.research_rankable,0);
 const long=scoreAsOf({batches:[first,second],asOfUtc:ts(151),maxLatestCaptureAgeMinutes:240});
 assert.equal(long.counts.research_rankable,1);
 assert.equal(long.candidates[0].trade_authorized,false);
 for(const value of [0,-1,1.5,1441,'120']){
  assert.throws(()=>scoreAsOf({batches:[first],asOfUtc:ts(151),maxLatestCaptureAgeMinutes:value}),/INVALID_ASOF_SCORE/);
  assert.throws(()=>scoreAsOf({batches:[first],asOfUtc:ts(151),maxPriceObservationGapMinutes:value}),/INVALID_ASOF_SCORE/);
 }
});
test('archived 22 Nov as-of ranking contains genuinely stale previously ranked reference',async()=>{
 const {readFile}=await import('node:fs/promises');
 const obj=JSON.parse(await readFile('research/observations/2026-11-22/45036887325-asof-ranking.json','utf8'));
 const fng=obj.candidates.find(x=>x.key==='bsc:0x03aa0e5114c12d3974da2ab1843cd197e24e4274');
 assert.ok(fng);
 const age=(Date.parse(obj.as_of_utc)-Date.parse(fng.last_capture_at_utc))/60000;
 assert.ok(age>16*60);
 assert.ok(fng.score!==null); // old behavior was stale ranking; regression reason
 // Do not claim this old archived file has been retroactively recomputed.
 assert.equal(obj.kind,'R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING');
});

test('eight-hour observation gap is history, not proof of current price momentum',()=>{
 const old=batch(0,[candidate(0,.001,15000)],'gecko');
 const fresh=batch(480,[candidate(480,.0016,16000)],'gecko');
 const r=scoreAsOf({batches:[old,fresh],asOfUtc:ts(480)});
 assert.equal(r.counts.research_rankable,0);
 assert.equal(r.counts.long_price_observation_gaps,1);
 assert.equal(r.candidates[0].status,'WATCH_PRICE_OBSERVATION_GAP');
 assert.equal(r.candidates[0].prior_price_observation_gap_minutes,480);
 assert.ok(r.candidates[0].observed_price_change_pct>50);
 assert.equal(r.candidates[0].trade_authorized,false);
 const historical=scoreAsOf({batches:[old,fresh],asOfUtc:ts(480),
  maxPriceObservationGapMinutes:600});
 assert.equal(historical.counts.research_rankable,1);
 assert.equal(historical.candidates[0].trade_authorized,false);
});
