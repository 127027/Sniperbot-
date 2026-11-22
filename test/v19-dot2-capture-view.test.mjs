import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDot2CaptureView} from '../src/v19-dot2-capture-view.mjs';
const asOfUtc='2026-11-22T22:00:00.000Z';
const gp={schema:1,dot:'dot-2',status:'CAPTURE_PENDING_DATA_GAP',
 updated_at_utc:'2026-11-22T21:11:32.176Z',
 captured_at_utc:'2026-11-22T20:24:40.627Z',
 evidence_path:'research/feeds/2026-11-22/45066246697/evidence.json',
 journal_path:'research/journal/dot-2/2026-11-22/pending.json',
 capture_request_path:'research/requests/2026-11-22/dot2-test-request.json'};
const feed={schema:1,kind:'LATEST_DOT2_PUBLIC_CAPTURE_POINTER',
 mode:'PAPER_RESEARCH_ONLY',captured_at_utc:'2026-11-22T21:11:22.118Z',
 request_path:gp.capture_request_path,
 evidence_path:'research/feeds/2026-11-22/45070668194/evidence.json'};
test('the newer API capture becomes visible but does not rewrite past GPT pending review',()=>{
 const before=JSON.stringify([gp,feed]);
 const result=resolveDot2CaptureView({gptPointer:gp,feedPointer:feed,asOfUtc});
 assert.equal(result.status,'NEWER_CAPTURE_SEPARATE_FROM_LAST_GPT_REVIEW');
 assert.equal(result.latest_feed_run_id,'45070668194');
 assert.equal(result.feed_matches_last_gpt_request,true);
 assert.equal(result.new_capture_requires_separate_gpt_review,true);
 assert.equal(result.effective_research_evidence_path,feed.evidence_path);
 assert.equal(result.last_gpt_review_source_at_utc,gp.captured_at_utc);
 assert.equal(result.last_gpt_review_status,'CAPTURE_PENDING_DATA_GAP');
 assert.equal(result.latest_gpt_review_authenticated_independently,false);
 assert.equal(result.current_research_raw_sha_verified_independently,false);
 assert.equal(result.orders_created,0);
 assert.equal(JSON.stringify([gp,feed]),before);
});
test('future feed, wrong branch artifact and unrelated pointer are not promoted',()=>{
 for(const mutated of [
 {...feed,captured_at_utc:'2026-11-23T00:00:00.000Z'},
 {...feed,evidence_path:'signals/orders/fake.json'},
 {...feed,mode:'LIVE_TRADING'},
 {...feed,request_path:'research/evaluation/future-labels.json'}
 ]){
  const out=resolveDot2CaptureView({gptPointer:gp,
   feedPointer:mutated,asOfUtc});
  assert.equal(out.status,'LATEST_FEED_NOT_VERIFIABLE_FROM_POINTER');
  assert.equal(out.new_capture_requires_separate_gpt_review,false);
 }
});
test('valid but older feed cannot roll source pointer back',()=>{
 const older={...feed,captured_at_utc:'2026-11-22T19:00:00.000Z',
  evidence_path:'research/feeds/2026-11-22/45060000000/evidence.json'};
 const out=resolveDot2CaptureView({gptPointer:gp,feedPointer:older,asOfUtc});
 assert.equal(out.status,'NO_NEWER_FEED_THAN_LAST_GPT_REVIEW');
 assert.equal(out.effective_research_evidence_path,gp.evidence_path);
 assert.equal(out.latest_gpt_review_authenticated_independently,false);
});
test('missing GPT pointer cannot be treated as a completed autonomous GPT job',()=>{
 const out=resolveDot2CaptureView({gptPointer:null,feedPointer:feed,asOfUtc});
 assert.equal(out.status,'LATEST_FEED_NOT_VERIFIABLE_FROM_POINTER');
 assert.equal(out.last_gpt_review_pointer_at_utc,null);
 assert.equal(out.latest_gpt_review_authenticated_independently,false);
});
