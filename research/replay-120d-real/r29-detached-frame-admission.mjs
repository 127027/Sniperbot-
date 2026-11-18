// R29 BACKTEST-ONLY: fail-closed boundary for detached historical GPT inputs.
// This is a structural admission check, NOT independent proof of a provider capture
// or model invocation. No wallet, network, order or strategy operations.
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
const ok=(v,msg)=>{if(!v)throw Error(msg)};
const utc=s=>{ok(typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s)),'BAD_UTC');return Date.parse(s)};
export function admitDetachedFrame({gateResult,sourceAttestations,ledgerAttestation,previousReviewAtUtc=null}){
 ok(gateResult?.asof_visibility_guards_passed===true,'GATE_NOT_PASSED');
 ok(gateResult.clean_model_session_required===true,'CLEAN_SESSION_NOT_REQUIRED');
 ok(gateResult.independent_model_context_purity_proven===true,'MODEL_ISOLATION_UNPROVEN');
 const frame=gateResult.payload;
 const asof=utc(frame?.virtual_asof_utc);
 ok(gateResult.payload_sha256===hash(JSON.stringify(frame)),'GATE_PAYLOAD_HASH_MISMATCH');
 ok(Array.isArray(sourceAttestations),'SOURCE_ATTESTATIONS_REQUIRED');
 const sources=[...frame.market_events,...frame.media_items,...frame.prior_lessons];
 const verified=new Set();
 for(const a of sourceAttestations){
  ok(a?.historicalAvailabilityIndependentlyProven===true,'HISTORICAL_CAPTURE_UNPROVEN');
  ok(a?.sourceSha256&&/^[a-f0-9]{64}$/i.test(a.sourceSha256),'INVALID_SOURCE_HASH');
  ok(utc(a.capturedAtUtc)<=asof,'FUTURE_SOURCE_CAPTURE');
  verified.add(a.sourceSha256.toLowerCase());
 }
 for(const s of sources)ok(verified.has(s.source_sha256?.toLowerCase()),'UNATTESTED_SOURCE');
 ok(ledgerAttestation?.independentlyVerified===true,'FILL_LEDGER_UNPROVEN');
 ok(ledgerAttestation.virtualAsofUtc===frame.virtual_asof_utc,'LEDGER_TIME_MISMATCH');
 ok(ledgerAttestation.openPositionsSha256===hash(JSON.stringify(frame.open_positions)),'LEDGER_POSITION_MISMATCH');
 if(previousReviewAtUtc!==null)ok(asof-utc(previousReviewAtUtc)>=3600000,'SCAN_INTERVAL_UNDER_ONE_HOUR');
 return {admitted:true,virtual_asof_utc:frame.virtual_asof_utc,payload_sha256:gateResult.payload_sha256,
  note:'Structural admission only; separate authenticated model-origin evidence still required'};
}
// Synthetic negative tests. This deliberately cannot create a passing fixture:
// current gate results correctly say independent_model_context_purity_proven:false.
if(process.argv[1]?.endsWith('r29-detached-frame-admission.mjs')){
 const f={virtual_asof_utc:'2026-09-18T01:20:00Z',market_events:[],media_items:[],prior_lessons:[],open_positions:[]};
 const g={asof_visibility_guards_passed:true,clean_model_session_required:true,independent_model_context_purity_proven:false,payload:f,payload_sha256:hash(JSON.stringify(f))};
 let error='';try{admitDetachedFrame({gateResult:g,sourceAttestations:[],ledgerAttestation:{}})}catch(e){error=e.message}
 ok(error==='MODEL_ISOLATION_UNPROVEN','FAIL_CLOSED_REGRESSION');
 console.log('PASS: unproven isolation rejected; no historical model call or fill claimed');
}
