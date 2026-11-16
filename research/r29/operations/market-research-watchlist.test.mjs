import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {normalizeResearchSnapshot,compareResearchSnapshots,
 stableResearchSnapshotName,snapshotPayloadDigest} from "./market-research-watchlist.mjs";

const A="2026-11-16T16:56:47.536Z",B="2026-11-17T17:56:47.536Z";
const sha=n=>String(n).repeat(64);
const mk=(price=1,selection="MARKET_ACTIVITY_SAMPLE",id="bsc:0x"+
 "a".repeat(40)+":0x"+"b".repeat(40))=>({
 candidate_id:id,chain:id.split(":")[0],selection,
 indicative_price_usd:price,observed_liquidity_usd:16000,
 volume_m5_usd:1500,buys_m5:31,sells_m5:10,
 contract_security:"UNKNOWN",sellability:"UNKNOWN",
 paid_promotion_bias:false});
const review=(at=A,hash=sha("a"),candidates=[mk()])=>({
 schema:"sniper_r29_public_dynamic_review.v1",paper_only:true,
 actionable:false,real_trading_enabled:false,
 observed_at_utc:at,review_sha256:hash,candidates});
const archive=(v,at=v.observed_at_utc)=>normalizeResearchSnapshot(v,{
 at_utc:at,source_github_blob_sha:"f".repeat(40)});

test("append all legitimate real observations without treating them as GPT decisions or fills",()=>{
 const coin=mk(0.00005);
 const sol=mk(.000003,"MARKET_ACTIVITY_SAMPLE",
  "solana:5JB57BRzLGkowV6YCRwK1y9fdhSongcRKVPLxN5kpump:CDjP1iwexRRbszs91n4WLV8Mz3EynmWE37NCrtqdhfmz");
 const control=mk(0.00001,"DETERMINISTIC_CONTROL","bsc:0x"+
   "c".repeat(40)+":0x"+"d".repeat(40));
 const a=archive(review(A,sha("a"),[coin,sol,control]));
 assert.equal(a.all_observed_candidates_count,3);
 assert.equal(a.market_sample_count,2);
 assert.equal(a.deterministic_controls_count,1);
 assert.equal(a.gpt_model_decisions_generated_by_this_module,0);
 assert.equal(a.paper_fills_created,0);
 assert(a.observations.every(x=>x.paper_buy_allowed===false));
 assert(a.observations.every(x=>x.actual_gpt_decision_here===null));
 assert.equal(a.observations[1].token_address,sol.candidate_id.split(":")[1]);
 assert(stableResearchSnapshotName(a).includes(sha("a").slice(0,16)));
 assert.equal(snapshotPayloadDigest(a).length,64);
});
test("source future timestamps and suspicious duplicate IDs fail closed",()=>{
 assert.throws(()=>archive(review(B),A),/STALE/);
 assert.throws(()=>archive(review(A,sha("a"),[mk(),mk()])),/DUPLICATE/);
 assert.throws(()=>archive(review(A,sha("a"),[mk(-1)])),/INVALID/);
 assert.throws(()=>archive({...review(A),actionable:true}),/INVALID/);
});
test("same address, pool and chain later provider price increase yields observation only",()=>{
 const old=archive(review());
 const newObs=archive(review(B,sha("b"),[mk(2)]));
 const result=compareResearchSnapshots(old,newObs,{evaluation_at_utc:B});
 assert.equal(result.observed_rough_rallies,1);
 assert.equal(result.unknown_outcomes,0);
 assert.equal(result.cases[0].observed_indicative_price_multiple,2);
 assert.equal(result.cases[0].outcome_class,
  "INDICATIVE_SAME_POOL_LATER_PRICE_RALLY_NOT_EXECUTABLE");
 assert.equal(result.proven_tradeable_usdc_pnl,null);
 assert.equal(result.actual_paper_fills_proven,0);
 assert.equal(result.original_decisions_rewritten,false);
});
test("missing later candidate is UNKNOWN, never counted as correctly rejected",()=>{
 const old=archive(review());
 const newObs=archive(review(B,sha("b"),[]));
 const result=compareResearchSnapshots(old,newObs,{evaluation_at_utc:B});
 assert.equal(result.observed_rough_rallies,0);
 assert.equal(result.unknown_outcomes,1);
 assert.equal(result.cases[0].outcome_class,"UNKNOWN_NOT_IN_LATER_SAMPLE");
});
test("different pool or token cannot be compared or counted as a price rally",()=>{
 const old=archive(review());
 const differentId=mk(25,"MARKET_ACTIVITY_SAMPLE",
  "bsc:0x"+"a".repeat(40)+":0x"+"c".repeat(40));
 const next=archive(review(B,sha("b"),[differentId]));
 const result=compareResearchSnapshots(old,next,{evaluation_at_utc:B});
 assert.equal(result.unknown_outcomes,1);
 assert.equal(result.observed_rough_rallies,0);
});
test("deterministic controls cannot appear in missed-winner metrics",()=>{
 const control=mk(1,"DETERMINISTIC_CONTROL");
 const a=archive(review(A,sha("a"),[control]));
 const b=archive(review(B,sha("b"),[mk(100,"DETERMINISTIC_CONTROL")]));
 const result=compareResearchSnapshots(a,b,{evaluation_at_utc:B});
 assert.equal(result.observed_count,0);
 assert.equal(result.observed_rough_rallies,0);
 assert.equal(result.unknown_outcomes,0);
 assert.equal(result.cases[0].outcome_class,"CONTROL_ONLY_NOT_STRATEGY_EVIDENCE");
 assert.equal(result.cases[0].observed_rally_at_least_threshold,null);
});
test("disallow later quote before enough time, or evaluating future after cutoff",()=>{
 const a=archive(review());
 const b=archive(review(B,sha("b"),[mk(5)]));
 assert.throws(()=>compareResearchSnapshots(a,b,
  {evaluation_at_utc:A}),/FUTURE/);
 assert.throws(()=>compareResearchSnapshots(a,b,
  {evaluation_at_utc:B,minimum_elapsed_hours:48}),/FUTURE/);
});

test("first actual archived 12-pool research review preserves provenance and every rejected or control identity",()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
 const rel="research/r29/operations/candidate-watch/snapshots/2026-11-16/20261116T165647536Z-69938eedf12bd93b.json";
 const stored=JSON.parse(readFileSync(path.join(root,rel),"utf8"));
 assert.equal(stored.schema,"sniper_r29_candidate_watch_snapshot.v1");
 assert.equal(stored.research_review_sha256,"69938eedf12bd93b540f1d42439decd61842731a5ce3775625366f10c2318099");
 assert.equal(stored.source_github_blob_sha.length,40);
 assert.equal(stored.market_sample_count,10);
 assert.equal(stored.deterministic_controls_count,2);
 assert.equal(stored.all_observed_candidates_count,12);
 assert.equal(stored.observations.length,12);
 assert.equal(new Set(stored.observations.map(x=>x.candidate_id)).size,12);
 assert(stored.observations.every(x=>x.actual_gpt_decision_here===null&&
  x.paper_buy_allowed===false&&x.real_trade_fill_proven===false));
 assert(stored.observations.every(x=>x.contract_security_source_status==="UNKNOWN"&&
  x.sellability_source_status==="UNKNOWN"));
 assert.equal(stableResearchSnapshotName(stored),
  "2026-11-16/20261116T165647536Z-69938eedf12bd93b.json");
 // Only compare to the live channel when its review SHA is still IDENTICAL;
 // later channel revisions must not mutate this original past snapshot.
 const live=JSON.parse(readFileSync(path.join(root,"research/r29/channel/dynamic-research-review.json"),"utf8"));
 if(live.review_sha256===stored.research_review_sha256){
  const current=normalizeResearchSnapshot(live,{
   at_utc:stored.archive_compiled_at_utc,
   source_github_blob_sha:stored.source_github_blob_sha});
  assert.deepEqual(current.observations,stored.observations);
 }
});
