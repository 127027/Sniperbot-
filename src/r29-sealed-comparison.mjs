// Sealed paired historical research. Integrity checks are not upstream source
// authentication or proof of actual model identity. No live permissions.
import {createHash} from 'node:crypto';
import {openComparison,comparisonInputs,commitComparisonHour,settleComparisonObservation,closeComparisonHour,comparisonSummary} from './r29-ab-comparison.mjs';
import {inspectPreparedMarket} from './r29-prepared-session.mjs';
export const comparisonDigest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const H=3600000,arms=['SINGLE_GPT','FIVE_DOTS'],t=x=>Date.parse(x),hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const iso=x=>new Date(x).toISOString();
function validateManifest(m){
 if(m?.kind!=='R29_SEALED_COMPARISON_MARKET_V1'||!['SYNTHETIC_FIXTURE','HISTORICAL_RESEARCH'].includes(m.scope)||!Number.isFinite(t(m.start_utc))||t(m.start_utc)%86400000||!hex(m.policy_sha256)||!Array.isArray(m.frames)||m.frames.length!==24)throw Error('INVALID_SEALED_MANIFEST');
 for(const [i,f] of m.frames.entries()){
  const at=t(m.start_utc)+i*H;
  if(f.index!==i+1||f.tick_utc!==iso(at)||!hex(f.preparation_sha256)||!hex(f.coverage_sha256)||!Array.isArray(f.observations)||!['DECLARED_SCOPE_VERIFIED','DATA_GAP'].includes(f.coverage_status))throw Error('INVALID_SEALED_FRAME');
  let prev=at;const ids=new Set();
  for(const x of f.observations){const when=t(x.tick_utc);if(!Number.isFinite(when)||when<prev||when>=at+H||typeof x.mint!=='string'||!x.mint||!hex(x.input_sha256)||ids.has(x.tick_utc+'|'+x.mint))throw Error('INVALID_SEALED_OBSERVATION');prev=when;ids.add(x.tick_utc+'|'+x.mint);}
 }
}
function guard(s){
 if(s?.kind!=='R29_SEALED_PAIRED_COMPARISON'||!s.comparison||!Array.isArray(s.dispatch_log)||!Number.isInteger(s.observation_index)||s.observation_index<0)throw Error('INVALID_SEALED_STATE');
 validateManifest(s.manifest);
 if(comparisonDigest(s.manifest)!==s.comparison.market_manifest_sha256||s.manifest.policy_sha256!==s.comparison.policy_sha256)throw Error('SEALED_MANIFEST_CHANGED');
 const f=s.manifest.frames[s.comparison.hours.length];
 if(f&&s.observation_index>f.observations.length)throw Error('INVALID_OBSERVATION_CURSOR');
 return f;
}
function checkPreparation(f,p){
 if(!f||p.tickUtc!==f.tick_utc||comparisonDigest(p)!==f.preparation_sha256)throw Error('SEALED_PREPARATION_MISMATCH');
}
export function openSealedComparison({comparisonId,manifest,expectedManifestSha256,preparation}={}){
 validateManifest(manifest);
 if(comparisonDigest(manifest)!==expectedManifestSha256)throw Error('SEALED_MANIFEST_DIGEST_MISMATCH');
 checkPreparation(manifest.frames[0],preparation);
 const r=openComparison({comparisonId,preparation,marketManifestSha256:expectedManifestSha256,policySha256:manifest.policy_sha256});
 return {preflight:r.preflight,state:r.comparison?{kind:'R29_SEALED_PAIRED_COMPARISON',manifest:structuredClone(manifest),comparison:r.comparison,observation_index:0,dispatch_log:[]}:null};
}
// Return only current per-arm input, not the manifest of later market frames.
export function sealedInputs(s,preparation){const f=guard(s);checkPreparation(f,preparation);return comparisonInputs(s.comparison,preparation);}
export function commitSealedHour(s,{preparation,reviews,artifacts}={}){
 const f=guard(s);checkPreparation(f,preparation);
 if(f.coverage_status!=='DECLARED_SCOPE_VERIFIED')throw Error('SEALED_FRAME_DATA_GAP');
 if(inspectPreparedMarket(preparation).status!=='READY_FOR_DECLARED_SCOPE')throw Error('SEALED_PREPARATION_INCOMPLETE');
 if(s.manifest.scope==='HISTORICAL_RESEARCH')verifyReviewArtifacts(reviews,artifacts);
 return {...s,comparison:commitComparisonHour({comparison:s.comparison,preparation,reviews})};
}
export function dispatchSealedObservation(s,input){
 const f=guard(s),expected=f?.observations[s.observation_index];
 if(!s.comparison.pending_hour||!expected||expected.tick_utc!==input.tickUtc||expected.mint!==input.mint||expected.input_sha256!==comparisonDigest(input))throw Error('SEALED_OBSERVATION_MISMATCH');
 const next=structuredClone(s),events={};
 // Same observation offered to both arms; no chosen price per arm.
 for(const arm of arms){
  const pending=next.comparison.arms[arm].ledger.pending[input.mint];
  if(!pending){events[arm]={execution:'NO_PENDING_SIGNAL'};continue;}
  const r=settleComparisonObservation(next.comparison,{arm,input});next.comparison=r.comparison;events[arm]=r.event;
 }
 next.observation_index++;
 next.dispatch_log.push({hour:f.index,observation_index:next.observation_index,tick_utc:input.tickUtc,mint:input.mint,input_sha256:expected.input_sha256,events});
 return {state:next,events};
}
export function closeSealedHour(s,{reason}={}){
 const f=guard(s);if(!f)throw Error('SEALED_RUN_FINISHED');
 const complete=s.observation_index===f.observations.length;
 if(!complete&&f.coverage_status==='DECLARED_SCOPE_VERIFIED')throw Error('SEALED_OBSERVATIONS_NOT_DISPATCHED');
 const next=structuredClone(s);
 next.comparison=closeComparisonHour(next.comparison,{atUtc:iso(t(f.tick_utc)+H),coverageStatus:f.coverage_status,coverageSha256:f.coverage_sha256,reason});
 next.observation_index=0;return next;
}
export function sealCheckpoint(s){guard(s);return {state:structuredClone(s),sha256:comparisonDigest(s)};}
export function resumeSealedComparison(checkpoint,expectedSha256){
 if(!hex(expectedSha256)||checkpoint?.sha256!==expectedSha256||comparisonDigest(checkpoint.state)!==expectedSha256)throw Error('CHECKPOINT_DIGEST_MISMATCH');
 guard(checkpoint.state);return structuredClone(checkpoint.state);
}
export function sealedSummary(s){guard(s);return {...comparisonSummary(s.comparison),scope:s.manifest.scope,market_manifest_sha256:s.comparison.market_manifest_sha256,dispatched_observations:s.dispatch_log.length,upstream_source_authentication_verified:false,actual_gpt_identity_verified:false,real_backtest_verified:false};}

// Exact UTF-8 artifact verification, not authentication of the model or provider.
function verifyReviewArtifacts(reviews,artifacts){
 const refs=[reviews?.SINGLE_GPT?.singleReview,...(reviews?.FIVE_DOTS?.roleReviews??[])];
 if(refs.length!==6||refs.some(r=>!r)||!Array.isArray(artifacts)||artifacts.length!==6)throw Error('SIX_REVIEW_ARTIFACTS_REQUIRED');
 const seen=new Set();
 for(const r of refs){
  const a=artifacts.find(x=>x?.sha256===r.journal_sha256);
  if(!a||typeof a.utf8!=='string'||createHash('sha256').update(a.utf8,'utf8').digest('hex')!==r.journal_sha256||seen.has(a.sha256))throw Error('REVIEW_ARTIFACT_BYTES_MISMATCH');
  seen.add(a.sha256);
  let body;try{body=JSON.parse(a.utf8);}catch{throw Error('INVALID_REVIEW_ARTIFACT_JSON');}
  const {journal_sha256,...expected}=r;
  if(comparisonDigest(body)!==comparisonDigest(expected))throw Error('REVIEW_ARTIFACT_CONTENT_MISMATCH');
 }
}
export {verifyReviewArtifacts};
