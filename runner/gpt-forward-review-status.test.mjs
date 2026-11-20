import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGptForwardStatus,publicGptForwardStatus,localGptForwardView,GPT_FORWARD_STATUS_SCHEMA} from './gpt-forward-review-status.mjs';
const day='2026-11-20';
const iso=h=>new Date(Date.parse(day+'T00:00:00Z')+h*3600000).toISOString();
const review=(h,i)=>({
 review_id:'gptreview_'+i.toString(16).padStart(32,'0'),
 completed_at_utc:iso(h),market_observed_at_utc:iso(h-.05),
 market_source_blob_sha:'a'.repeat(40),
 artifact_path:'research/r29/gpt-strategy/experiences/'+day+'/review-'+i+'.md',
 candidates_seen:60,candidates_reviewed:8,action:'WATCH',model_review_completed:true
});
const status=(reviews=[review(1,1),review(7,2)])=>({
 schema:GPT_FORWARD_STATUS_SCHEMA,paper_only:true,actionable:false,
 real_trading_enabled:false,source:'GPT_MODEL_AUTHORED_REVIEW_INDEX',
 utc_day:day,target_per_day:12,model_chosen_activity_level:'MEDIUM',
 model_cadence_reason:'Several newly observed independent EVM leads require more frequent reviews.',
 reviews,updated_at_utc:iso(8),next_due_at_utc:iso(9)
});
const now=Date.parse(iso(8.5));
test('only GPT-authored complete hourly-spaced model reviews contribute to daily count',()=>{
 const original=status();assert.equal(validateGptForwardStatus(original,{now}),original);
 const x=publicGptForwardStatus(original,{now});
 assert.equal(x.available,true);assert.equal(x.completed_reviews_today,2);
 assert.equal(x.target_per_day,12);assert.equal(x.model_identity_attested,false);
 assert.equal(x.trade_authorized,false);assert.equal(x.recent[0].action,'WATCH');
});
test('reject duplicate, premature, invalid, collector or overclaiming GPT reviews',()=>{
 const s=status();
 for(const bad of [
  {...s,reviews:[review(1,1),review(1.5,2)]},
  {...s,reviews:[review(1,1),review(7,1)]},
  {...s,reviews:[{...review(1,1),model_review_completed:false}]},
  {...s,reviews:[{...review(1,1),candidates_reviewed:0}]},
  {...s,reviews:[{...review(1,1),artifact_path:'research/market/latest.json'}]},
  {...s,reviews:[{...review(1,1),market_observed_at_utc:iso(-2)}]},
  {...s,source:'LOCAL_SCOUT_AUTOPILOT'},
  {...s,target_per_day:1},
  {...s,real_trading_enabled:true},
  {...s,utc_day:'2026-11-19'}
 ])assert.throws(()=>validateGptForwardStatus(bad,{now}),/INVALID/);
});
test('stale previous-day reports do not imply daily reviews',()=>{
 const v=status();
 const next=publicGptForwardStatus(v,{now:Date.parse('2026-11-21T01:00:00Z')});
 assert.equal(next.available,false);assert.equal(next.completed_reviews_today,0);
 assert.equal(next.reason,'GPT_REVIEW_INDEX_PREVIOUS_UTC_DAY');
 assert.equal(publicGptForwardStatus(null,{now}).target_per_day,null);
});

test('Windows-courier cached report never converts collector data into GPT model scans',()=>{
 const today=publicGptForwardStatus(status(),{now});
 const safe=localGptForwardView(today,{now});
 assert.equal(safe.available,true);
 assert.equal(safe.completed_reviews_today,2);
 assert.equal(safe.recent[0].candidates_reviewed,8);
 const forged={...today,trade_authorized:true};
 assert.equal(localGptForwardView(forged,{now}).available,false);
 const unknown={...today,model_identity_attested:true};
 assert.equal(localGptForwardView(unknown,{now}).completed_reviews_today,0);
 const next=localGptForwardView(today,{now:Date.parse('2026-11-21T01:00:00Z')});
 assert.equal(next.completed_reviews_today,0);
});
