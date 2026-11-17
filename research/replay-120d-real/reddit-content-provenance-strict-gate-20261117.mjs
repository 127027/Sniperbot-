// R29 append-only research gate: reject historical Reddit text unless an independent
// immutable capture of THAT TEXT at or before virtual as-of is evidenced.
// The existing hourly frames are research metadata, not proof of unedited content.
// No network, token selection, model invocation, order or account mutation.
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
const time=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x)&&Number.isFinite(Date.parse(x))?Date.parse(x):NaN;
export function auditHistoricalSocialText(post,proof,virtualAsOfUtc){
 const asof=time(virtualAsOfUtc);
 if(!Number.isFinite(asof))throw Error('INVALID_ASOF');
 const reject=reason=>({status:'DATA_GAP',reason,model_text_allowed:false});
 if(!post||typeof post!=='object')return reject('POST_MISSING');
 const published=time(post.published_at_utc),archived=time(post.archived_at_utc),observed=time(post.observed_at_utc);
 if(![published,archived,observed].every(Number.isFinite)||published>asof||archived>asof||observed>asof)
  return reject('TIMESTAMP_NOT_PROVEN_ASOF');
 if(!proof||proof.kind!=='IMMUTABLE_HISTORIC_CONTENT_CAPTURE'||proof.post_id!==post.item_id)
  return reject('NO_INDEPENDENT_IMMUTABLE_CONTENT_CAPTURE');
 const captured=time(proof.captured_at_utc);
 if(!Number.isFinite(captured)||captured>asof||captured<published)
  return reject('CAPTURE_TIME_NOT_PROVEN_ASOF');
 if(proof.content_edit_history_verified!==true||proof.capture_timestamp_independently_attested!==true)
  return reject('EDIT_HISTORY_OR_CAPTURE_ATTESTATION_MISSING');
 if(typeof proof.original_text_utf8!=='string'||!(/^[a-f0-9]{64}$/i).test(proof.original_text_sha256||'')||
    sha(proof.original_text_utf8)!==proof.original_text_sha256)
  return reject('ORIGINAL_CONTENT_HASH_MISMATCH');
 if(proof.original_text_utf8!==JSON.stringify([post.title||'',post.body_excerpt||'']))
  return reject('MODEL_TEXT_NOT_IDENTICAL_TO_ATTESTED_CAPTURE');
 return {status:'ASOF_CONTENT_PROVENANCE_GATE_PASSED',reason:'INDEPENDENT_CAPTURE_REQUIRED',model_text_allowed:true,
  original_text_sha256:proof.original_text_sha256};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const post={item_id:'abc123',published_at_utc:'2026-09-18T00:01:00Z',archived_at_utc:'2026-09-18T00:02:00Z',observed_at_utc:'2026-09-18T00:02:00Z',title:'Neutral test',body_excerpt:'Example'};
 const asof='2026-09-18T01:00:00Z';
 const text=JSON.stringify([post.title,post.body_excerpt]);
 const good={kind:'IMMUTABLE_HISTORIC_CONTENT_CAPTURE',post_id:post.item_id,captured_at_utc:'2026-09-18T00:02:00Z',content_edit_history_verified:true,capture_timestamp_independently_attested:true,original_text_utf8:text,original_text_sha256:sha(text)};
 const cases=[
  [auditHistoricalSocialText(post,null,asof).reason==='NO_INDEPENDENT_IMMUTABLE_CONTENT_CAPTURE','missing proof'],
  [auditHistoricalSocialText(post,{...good,content_edit_history_verified:false},asof).model_text_allowed===false,'unverified edits'],
  [auditHistoricalSocialText(post,{...good,captured_at_utc:'2026-11-17T00:00:00Z'},asof).model_text_allowed===false,'future capture'],
  [auditHistoricalSocialText(post,{...good,original_text_sha256:'0'.repeat(64)},asof).model_text_allowed===false,'tampered text'],
  [auditHistoricalSocialText(post,good,asof).model_text_allowed===true,'attested synthetic fixture']
 ];
 if(cases.some(([pass])=>!pass)){console.error('R29_SOCIAL_PROVENANCE_TEST_FAILED',cases);process.exitCode=1;}
 else console.log('R29_SOCIAL_PROVENANCE_TESTS_PASS',cases.length,'synthetic cases; real archive text remains DATA_GAP');
}
