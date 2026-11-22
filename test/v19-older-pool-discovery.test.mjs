import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyOlderPoolState,planOlderPoolCaptures,recordOlderPoolCapture,
 decodeOlderPoolPage} from '../src/v19-older-pool-discovery.mjs';
import {validateCaptureRequest} from '../src/discovery-feed.mjs';
import {planHotFairRechecks} from '../src/v19-hot-fair-recheck.mjs';
import {makeResearchHandoff} from '../src/feed-handoff.mjs';

const at='2026-10-12T09:35:00.000Z',pool='0x'+'a'.repeat(40),token='0x'+'b'.repeat(40);
const fixture=(created='2026-10-09T09:00:00.000Z')=>({
 data:[{id:'base_'+pool,type:'pool',attributes:{
   address:pool,pool_created_at:created,reserve_in_usd:'15000',
   base_token_price_usd:'0.00012',volume_usd:{h1:'2000',h24:'9000'},
   price_change_percentage:{h1:'12.5'}},
   relationships:{base_token:{data:{id:'base_'+token}}}}],
 included:[{id:'base_'+token,type:'token',
   attributes:{address:token,symbol:'OLDMEME'}}]
});
test('older pool from trending endpoint is a WATCH candidate, not retrospectively a winner',()=>{
 const r=decodeOlderPoolPage({network:'base',response:fixture(),capturedAtUtc:at});
 assert.equal(r.older_or_equal_24h_count,1);
 assert.equal(r.candidates[0].category,'OLDER_POOL_WATCH');
 assert.equal(r.candidates[0].contract,token);
 assert.equal(r.candidates[0].source_api,'GECKOTERMINAL_TRENDING_POOLS_JSON');
 assert.equal(r.candidates[0].provider_reported_1h_price_change_pct,12.5);
 assert.equal(r.candidates[0].revival_confirmed,false);
 assert.equal(r.candidates[0].trade_authorized,false);
});
test('trending source refuses pools created only AFTER the captured as-of timestamp',()=>{
 const r=decodeOlderPoolPage({network:'base',
  response:fixture('2026-10-12T11:00:00.000Z'),capturedAtUtc:at});
 assert.equal(r.candidates.length,0);
 assert.equal(r.rejected_future_pool_creation.length,1);
});
test('fair rotation services other chains before repeatedly scanning base',()=>{
 const networks=['base','solana','ethereum'],t=emptyOlderPoolState();
 const first=planOlderPoolCaptures({state:t,networks,asOfUtc:at,maxRequests:1});
 assert.equal(first.tasks[0].chain,'base');
 assert.match(first.tasks[0].url,/trending_pools/);
 const next=recordOlderPoolCapture({state:t,task:first.tasks[0],capturedAtUtc:at,
  sourceRawPath:'research/feeds/2026-10-12/1/older-base.raw.json',
  sourceSha256:'a'.repeat(64)});
 const p=planOlderPoolCaptures({state:next,networks,
  asOfUtc:'2026-10-12T10:35:00.000Z',maxRequests:1});
 assert.equal(p.tasks[0].chain,'solana');
});
test('429 cooldown is respected, no fake successful pool discovery',()=>{
 const task=planOlderPoolCaptures({networks:['base'],asOfUtc:at,maxRequests:1}).tasks[0];
 const state=recordOlderPoolCapture({state:emptyOlderPoolState(),task,
  capturedAtUtc:at,status:'HTTP_429',
  retryAfterUtc:'2026-10-12T11:35:00.000Z'});
 const q=planOlderPoolCaptures({state,networks:['base'],asOfUtc:'2026-10-12T10:00:00.000Z',maxRequests:1});
 assert.equal(q.tasks.length,0);
 assert.equal(q.excluded_cooldowns.length,1);
 assert.equal(state.checkpoints.base.last_success_at_utc,null);
});
test('discovery, risk handoff and budget share ONE existing system, no order',()=>{
 const observed=decodeOlderPoolPage({network:'base',
  response:fixture(),capturedAtUtc:at}).candidates;
 const plan=planHotFairRechecks({freshCandidates:observed,
  fairCandidates:[],asOfUtc:at,maxChecks:1});
 assert.equal(plan.selected.length,1);
 const handoff=makeResearchHandoff({atUtc:at,evidence:{
  kind:'DOT2_PUBLIC_CAPTURE_EVIDENCE',mode:'PAPER_RESEARCH_ONLY',
  captured_completed_at_utc:at,request_path:'research/requests/2026-10-12/x.json',
  older_pool_candidates:observed,dex_checks:[],dex_fallback_candidates:[]}});
 assert.equal(handoff.candidates.length,1);
 assert.equal(handoff.candidates[0].source_class,'GECKOTERMINAL_TRENDING_RESEARCH_ONLY');
 assert.equal(handoff.candidates[0].qualified_for_risk_review,true);
 assert.equal(handoff.candidates[0].BUY_AUTHORIZED,false);
 const request={schema:1,kind:'DOT2_DISCOVERY_CAPTURE_REQUEST',mode:'PAPER_RESEARCH_ONLY',
  requested_by:'dot-2-discovery',do_not_publish_orders:true,
  networks:['base'],created_at_utc:at,max_gecko_requests:3,max_older_pool_requests:1,
  max_ohlcv_requests:1,max_dex_pairs:1};
 assert.equal(validateCaptureRequest(request).max_gecko_requests,3);
 assert.throws(()=>validateCaptureRequest({...request,max_gecko_requests:2}),
  /OLDER_POOL_RESERVATION_INVALID/);
});
