import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessDot3RiskStatus,summarizeDot3RiskStatuses}
 from '../src/v19-dot3-risk-status.mjs';
const at='2026-11-22T08:20:50.724Z',pool='0x'+'b'.repeat(40),
 contract='0x'+'a'.repeat(40),sha='a'.repeat(40);
const candidate={chain:'base',pool,contract,pool_kind:null,
 captured_at_utc:'2026-11-22T08:20:40.000Z',
 independent_price_liquidity_ready:true,
 primary_quote_usd:0.01,second_source_price_usd:0.0101,
 primary_liquidity_usd:20000,second_source_liquidity_usd:21000,
 price_disagreement_pct:0.995};
const quote=(url,blob)=>({...candidate,source_url:url,
 price_usdc:.01,liquidity_usdc:20000,
 captured_at_utc:'2026-11-22T08:20:40.000Z',
 provider_quote_asof_utc:'2026-11-22T08:20:35.000Z',
 snapshot_blob_sha:blob});
const attestation=()=>({schema:1,kind:'DOT3_PAPER_RISK_ATTESTATION',
 mode:'PAPER',status:'ELIGIBLE',issued_by:'dot-3-risk',
 coin:{chain:'base',pool,contract,pool_kind:null},
 issued_at_utc:'2026-11-22T08:20:30.000Z',
 expires_at_utc:'2026-11-22T08:22:30.000Z',
 quotes:[
 quote('https://www.geckoterminal.com/base/pools/'+pool,'1'.repeat(40)),
 quote('https://dexscreener.com/base/'+pool,'2'.repeat(40))],
 sellability:{verified:true,method:'synthetic-route-check',
 checked_at_utc:'2026-11-22T08:20:20.000Z',
 evidence_blob_sha:'3'.repeat(40)},
 security:{verified:true,evidence_blob_sha:'4'.repeat(40)}
});
const calc=(opts={})=>assessDot3RiskStatus({
 candidate,asOfUtc:at,attestation:attestation(),expectedBlobSha:sha,...opts});
test('positive FULL synthetic Dot3 packet reaches modeled PAPER_ELIGIBLE but no order',()=>{
 const x=calc({mode:'SYNTHETIC_REGRESSION_ONLY'});
 assert.equal(x.status,'PAPER_ELIGIBLE');
 assert.equal(x.simulated_paper_eligibility,true);
 assert.equal(x.structural_preflight,'STRUCTURAL_PASS_EXTERNAL_VERIFICATION_REQUIRED');
 assert.equal(x.trade_authorized,false);
 assert.equal(x.eligible_for_real_paper_order,false);
 assert.equal(x.issuer_authentication_verified,false);
});
test('exact same packet in LIVE and HISTORICAL modes waits for actual independent proof',()=>{
 for(const mode of ['LIVE_PAPER','HISTORICAL_ASOF']){
  const x=calc({mode});
  assert.equal(x.status,'DATA_GAP');
  assert.equal(x.reason,'EXTERNAL_ORIGIN_AND_ISSUER_VERIFICATION_MISSING');
  assert.equal(x.trade_authorized,false);
 }
});
test('missing provider quote date and impossible liquidity prevent positive state',()=>{
 const wrong=attestation();
 wrong.quotes[1].provider_quote_asof_utc=null;
 assert.equal(calc({mode:'SYNTHETIC_REGRESSION_ONLY',attestation:wrong}).status,'DATA_GAP');
 const bad=attestation();
 bad.quotes[0].liquidity_usdc=20;
 assert.equal(calc({mode:'SYNTHETIC_REGRESSION_ONLY',attestation:bad}).status,'DATA_GAP');
});
test('suspicious liquidity or price disagreement remain WATCH, not arbitrary permanent REJECTED',()=>{
 const c={...candidate,price_disagreement_pct:110,
  second_source_liquidity_usd:0.02,independent_price_liquidity_ready:false};
 const x=assessDot3RiskStatus({candidate:c,asOfUtc:at});
 assert.equal(x.status,'WATCH');
 assert.equal(x.reason,'INDICATIVE_PRICE_DISAGREEMENT');
 assert.equal(x.candidate_preserved_for_recheck,true);
 assert.equal(x.trade_authorized,false);
});
test('missing identity and future snapshots never enter a positive state',()=>{
 assert.equal(assessDot3RiskStatus({candidate:{...candidate,pool:'bad'},
   asOfUtc:at}).status,'DISCOVERED');
 assert.equal(assessDot3RiskStatus({candidate:{...candidate,contract:null},
   asOfUtc:at}).status,'DATA_GAP');
 assert.equal(assessDot3RiskStatus({candidate:{...candidate,
  captured_at_utc:'2026-11-22T09:00:00.000Z'},asOfUtc:at}).status,'DATA_GAP');
 assert.equal(assessDot3RiskStatus({candidate:{...candidate,reported_gain_pct:999999},
  asOfUtc:at}).reason,'POST_EVENT_INPUT_QUARANTINED');
});
test('explicit hard block is only modelled REJECTED in isolated synthetic regression',()=>{
 const hard={code:'HONEYPOT_PROOF',synthetic_fixture:true};
 const sim=assessDot3RiskStatus({candidate,asOfUtc:at,
   mode:'SYNTHETIC_REGRESSION_ONLY',hardBlock:hard});
 const live=assessDot3RiskStatus({candidate,asOfUtc:at,hardBlock:hard});
 assert.equal(sim.status,'REJECTED');
 assert.equal(sim.negative_regression_only,true);
 assert.notEqual(live.status,'REJECTED');
 assert.equal(live.trade_authorized,false);
});
test('real 22 November Dot2 handoff yields two WATCH, zero REAL positive approvals',async()=>{
 const handoff=JSON.parse(await readFile(
 'research/feeds/2026-11-22/45002280249/dot2-to-dot3-handoff.json','utf8'));
 const x=summarizeDot3RiskStatuses({handoff,asOfUtc:'2026-11-22T08:20:50.724Z'});
 assert.equal(x.counts.WATCH,2);
 assert.equal(x.counts.REJECTED,0);
 assert.equal(x.counts.PAPER_ELIGIBLE,0);
 assert.equal(x.order_authorized_count,0);
 assert.equal(x.candidates.every(y=>y.candidate_preserved_for_recheck),true);
});
