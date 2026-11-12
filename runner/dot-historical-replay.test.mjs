import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runBlindTimeline,scoreAfterReplay} from './dot-historical-replay.mjs';
const source=JSON.parse(readFileSync(new URL('./fixtures/timecapsule_R06_evidence.json',import.meta.url),'utf8'));
const run=()=>runBlindTimeline(source);
const token='A'.repeat(44),pool='B'.repeat(44);
function item(kind,host,iso='2024-10-13T10:00:00Z'){
 const url='https://'+host+'.example.org/post';
 const stamp=iso.replace(/[-:TZ]/g,'').slice(0,14);
 return {kind,source_url:url,published_at_utc:'2024-10-10T09:00:00Z',
  capture_at_utc:iso,archive_url:'https://web.archive.org/web/'+stamp+'/'+url,
  source_content_sha256:'c'.repeat(64),historical_capture_verified:true,
  independent_archive_review:true,chain:'solana',token_address:token,pool_address:pool,
  price_usd:0.01,liquidity_usd:100000,veto:false,route_verified:true};
}
const all=[item('ORIGINAL_SOCIAL','social'),item('TOKEN_POOL','chain'),
 item('POOL_MARKET','market'),item('SECURITY_REVIEW','security'),item('SELL_ROUTE','router')];
const trial=evidence=>runBlindTimeline({scenario_id:'R99',start_utc:'2024-10-10T00:00:00Z',
 end_utc:'2024-10-15T23:59:59Z',evidence});
test('R06 historical evidence: 61 days, no verified old source bytes and no fictitious buy',()=>{
 const x=run();
 assert.equal(x.days,61);assert.equal(x.admitted_asof_metadata,0);
 assert.equal(x.submitted_sources,5);assert.equal(x.confirmed_real_paper_fills,0);
 assert.equal(x.conclusion,'UNTESTABLE_NO_VERIFIED_ASOF_SOURCES');
 assert(x.timeline.every(d=>d.bot_review_candidates===0));
});
test('synthetic independent role evidence only appears on/after its archived timestamp',()=>{
 const x=trial(all);assert.equal(x.admitted_asof_metadata,5);
 assert.equal(x.timeline[0].bot_review_candidates,0);
 assert.equal(x.timeline[2].bot_review_candidates,0);
 assert.equal(x.timeline[3].bot_review_candidates,1);
 assert.equal(x.first_bot_review_date_utc,'2024-10-13');
 assert.equal(x.confirmed_real_paper_fills,0);
});
test('no candidate review if independent sell route, security review or social source is absent',()=>{
 for(const kind of ['SELL_ROUTE','SECURITY_REVIEW','ORIGINAL_SOCIAL']){
  const x=trial(all.filter(e=>e.kind!==kind));
  assert(x.timeline.every(d=>d.bot_review_candidates===0),kind);
 }
});
test('invalid archive date and future publication are rejected, not backdated',()=>{
 const xs=structuredClone(all);
 xs[0].archive_url='https://web.archive.org/web/20241011000000/https://social.example.org/post';
 xs[1].published_at_utc='2024-10-15T23:00:00Z';
 const r=trial(xs);assert.equal(r.admitted_asof_metadata,3);
 assert(r.timeline.every(d=>d.bot_review_candidates===0));
});
test('role indicators are explicitly NOT historical LLM dot execution',()=>{
 const x=trial(all);assert.equal(x.real_cloud_dots_executed,false);
 assert.equal(x.labels_visible_to_research,false);
});
test('held-out target can only be scored after replay and different scenario is rejected',()=>{
 const x=trial(all);
 const result=scoreAfterReplay(x,{scenario_id:'R99',target_name:'Synthetic',candidate_id:'solana:'+token+':'+pool});
 assert.equal(result.target_seen,true);assert.equal(result.prediction_proven,false);
 assert.throws(()=>scoreAfterReplay(x,{scenario_id:'R98'}),/TRUTH_MISMATCH/);
});
