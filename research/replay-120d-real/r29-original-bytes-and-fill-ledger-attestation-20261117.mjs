// R29 research-only evidence verifier. Fail closed; no model invocation, trades or network.
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const hash=x=>createHash('sha256').update(x).digest('hex');
const utc=x=>typeof x==='string'&&/^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d(?:\\.\\d+)?Z$/.test(x)&&Number.isFinite(Date.parse(x));
const assert=(ok,reason)=>{if(!ok)throw Error(reason)};
export function attestOriginalBytes({rawBytes,expectedSha256,sourceCapturedAtUtc,virtualAsofUtc,independentCaptureEvidence}){
 assert(Buffer.isBuffer(rawBytes)||rawBytes instanceof Uint8Array,'ORIGINAL_BYTES_REQUIRED');
 assert(/^[a-f0-9]{64}$/.test(expectedSha256||''),'SOURCE_SHA_INVALID');
 assert(hash(rawBytes)===expectedSha256,'SOURCE_BYTES_HASH_MISMATCH');
 assert(utc(sourceCapturedAtUtc)&&utc(virtualAsofUtc),'INVALID_CAPTURE_TIME');
 assert(Date.parse(sourceCapturedAtUtc)<=Date.parse(virtualAsofUtc),'FUTURE_SOURCE_CAPTURE');
 // Hash and a claimed capture timestamp alone cannot prove historical availability.
 assert(independentCaptureEvidence?.verified===true&&independentCaptureEvidence?.sourceSha256===expectedSha256&&
  independentCaptureEvidence?.capturedAtUtc===sourceCapturedAtUtc&&
  independentCaptureEvidence?.evidenceType==='ORIGINAL_PROVIDER_CAPTURE_ATTESTATION',
  'INDEPENDENT_CAPTURE_PROOF_MISSING');
 return {status:'SOURCE_BYTES_AND_CAPTURE_EVIDENCE_ATTESTED',source_sha256:expectedSha256,
  source_captured_at_utc:sourceCapturedAtUtc,virtual_asof_utc:virtualAsofUtc};
}
export function attestOpenPositions({positions,ledgerFills,virtualAsofUtc}){
 assert(Array.isArray(positions)&&Array.isArray(ledgerFills)&&utc(virtualAsofUtc),'BAD_LEDGER_INPUT');
 const seen=new Set();
 return positions.map(p=>{
  assert(!seen.has(p.position_id),'DUPLICATE_POSITION');seen.add(p.position_id);
  const matches=ledgerFills.filter(f=>f.fill_id===p.opened_fill_id);
  assert(matches.length===1,'MISSING_OR_DUPLICATE_OPEN_FILL');
  const f=matches[0];
  assert(f.status==='PAPER_FILLED'&&f.side==='BUY'&&f.position_id===p.position_id&&
   f.chain===p.chain&&f.token_address===p.token_address&&f.pool_address===p.pool_address,
   'FILL_POSITION_IDENTITY_MISMATCH');
  assert(utc(f.filled_at_utc)&&Date.parse(f.filled_at_utc)<=Date.parse(virtualAsofUtc),'FUTURE_OR_INVALID_FILL');
  assert(Number.isFinite(f.tokens_filled)&&f.tokens_filled>0&&
   Number.isFinite(f.total_cost_test_usdc)&&f.total_cost_test_usdc>0,'INVALID_FILL_QUANTITY');
  // Opening fill does not establish remaining balance; require independent reconciled ledger.
  assert(p.ledger_reconciled===true&&p.ledger_reconciled_asof_utc===virtualAsofUtc&&
   Number.isFinite(p.tokens_owned)&&p.tokens_owned>0,'UNRECONCILED_POSITION');
  return {position_id:p.position_id,opened_fill_id:f.fill_id,verified:true};
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const raw=Buffer.from('synthetic');const sha=hash(raw),at='2026-09-18T01:20:00Z';
 const base={rawBytes:raw,expectedSha256:sha,sourceCapturedAtUtc:at,virtualAsofUtc:at,
 independentCaptureEvidence:{verified:true,sourceSha256:sha,capturedAtUtc:at,evidenceType:'ORIGINAL_PROVIDER_CAPTURE_ATTESTATION'}};
 const fail=(fn,reason)=>{let ok=false;try{fn()}catch(e){ok=e.message===reason}assert(ok,'EXPECTED_REJECTION_'+reason)};
 attestOriginalBytes(base);
 fail(()=>attestOriginalBytes({...base,rawBytes:Buffer.from('changed')}),'SOURCE_BYTES_HASH_MISMATCH');
 fail(()=>attestOriginalBytes({...base,independentCaptureEvidence:null}),'INDEPENDENT_CAPTURE_PROOF_MISSING');
 fail(()=>attestOriginalBytes({...base,sourceCapturedAtUtc:'2026-09-18T02:20:00Z'}),'FUTURE_SOURCE_CAPTURE');
 const fill={fill_id:'f1',status:'PAPER_FILLED',side:'BUY',position_id:'p1',chain:'solana',token_address:'t',pool_address:'pool',filled_at_utc:at,tokens_filled:10,total_cost_test_usdc:50};
 const p={position_id:'p1',opened_fill_id:'f1',chain:'solana',token_address:'t',pool_address:'pool',ledger_reconciled:true,ledger_reconciled_asof_utc:at,tokens_owned:10};
 attestOpenPositions({positions:[p],ledgerFills:[fill],virtualAsofUtc:at});
 fail(()=>attestOpenPositions({positions:[p],ledgerFills:[],virtualAsofUtc:at}),'MISSING_OR_DUPLICATE_OPEN_FILL');
 fail(()=>attestOpenPositions({positions:[{...p,ledger_reconciled:false}],ledgerFills:[fill],virtualAsofUtc:at}),'UNRECONCILED_POSITION');
 console.log('R29_SYNTHETIC_ATTESTATION_TESTS_PASS; NO_REAL_SOURCE_OR_FILL_ATTESTED');
}
