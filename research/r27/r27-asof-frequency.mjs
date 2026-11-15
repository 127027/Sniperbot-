// R27: strict evidence-only central AI replay. No access to user wallets,
// paper ledger, current internet, GitHub orders or future outcome labels.
// Historical source coverage is a prerequisite, not a value guessed from
// publication metadata. Intent != executable trade != realized P&L.
import {createHash} from 'node:crypto';

export const R27_WINDOW=Object.freeze({
 start:'2026-10-30T00:00:00Z',end_exclusive:'2026-11-14T00:00:00Z'
});
export const R27_FREQUENCIES=Object.freeze([1,4,12,24]);
export const R27_COVERAGE=Object.freeze([
 'POOL_UNIVERSE','NEWS_SOCIAL','ONCHAIN_MARKET','SECURITY','NEXT_TICK_EXECUTION'
]);
const DAY=86400000,HOUR=3600000;
const TYPES=new Set(['POOL','NEWS','SOCIAL','MARKET','SECURITY','EXECUTION']);
const ACTIONS=new Set(['BUY','SELL','HOLD','WATCH','NO_TRADE']);
const HEX=/^[a-f0-9]{64}$/;
const utc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&
 Number.isFinite(Date.parse(s))?Date.parse(s):NaN;
const hash=s=>createHash('sha256').update(s).digest('hex');
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
function safeUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.toString().length<=1300}
 catch{return false}
}
const copy=x=>structuredClone(x);
export function r27Schedule(frequency,window=R27_WINDOW){
 check(R27_FREQUENCIES.includes(frequency),'R27_UNKNOWN_FREQUENCY');
 const start=utc(window.start),end=utc(window.end_exclusive);
 check(Number.isFinite(start)&&Number.isFinite(end)&&end>start&&
  start%HOUR===0&&end%HOUR===0&&(end-start)%DAY===0,'R27_WINDOW_NOT_FULL_UTC_DAYS');
 const step=DAY/frequency,epochs=[];
 for(let at=start;at<end;at+=step)epochs.push(new Date(at).toISOString());
 return epochs;
}
export function emptyR27Bundle(){
 return {schema:'r27_asof_bundle.v1',window:R27_WINDOW,
  provenance:'NO_CONTEMPORANEOUS_ARCHIVE_PROVIDED',candidate_selection_policy:'ALL_NEW_POOLS_PER_CHAIN_WITH_PROVEN_COVERAGE',
  records:[],coverage:[],external_audit_ref:null,
  prohibited_inputs:['KNOWN_WINNER_LIST','CURRENT_POOL_SCAN','POST_DATE_NEWS','FUTURE_ATH']};
}
function validArchive(proof,record){
 // Hash alone is NOT third-party timestamp proof. Require explicit archived
 // capture date, which must be independently checked before admission.
 if(proof?.method!=='CONTEMPORANEOUS_ARCHIVE'||proof.verified!==true||
    typeof proof.original!=='string'||!proof.original||
    proof.sha256!==hash(proof.original)||!safeUrl(proof.archive_url))return false;
 const match=/^https:\/\/web\.archive\.org\/web\/(\d{14})\/(https?:\/\/[^\s]+)$/.exec(proof.archive_url);
 if(!match)return false;
 const s=match[1],captured=Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8),+s.slice(8,10),+s.slice(10,12),+s.slice(12,14));
 return Number.isFinite(captured)&&captured===utc(proof.captured_at_utc)&&
  captured===utc(record.available_at_utc)&&
  utc(record.event_at_utc)<=captured;
}
function validChainProof(proof,record){
 // This only checks internal consistency of an independent verification
 // claim. An external chain verification/attestation is still required.
 return proof?.method==='ONCHAIN_LEDGER'&&proof.verified===true&&
  /^0x[a-fA-F0-9]{64}$/.test(proof.block_hash||'')&&
  Number.isSafeInteger(proof.block_number)&&proof.block_number>=0&&
  safeUrl(proof.source_url)&&
  proof.block_time_utc===record.event_at_utc&&
  utc(record.event_at_utc)===utc(record.available_at_utc);
}
export function validateR27Bundle(bundle){
 check(bundle?.schema==='r27_asof_bundle.v1','R27_BAD_BUNDLE');
 check(bundle.window?.start===R27_WINDOW.start&&bundle.window?.end_exclusive===R27_WINDOW.end_exclusive,
  'R27_WINDOW_DRIFT');
 check(Array.isArray(bundle.records)&&bundle.records.length<=100000&&
  Array.isArray(bundle.coverage)&&bundle.coverage.length<=5000,'R27_DATASET_TOO_LARGE');
 const seen=new Set(),accepted=[],rejected=[];
 for(const rec of bundle.records){
  check(typeof rec?.id==='string'&&/^[a-zA-Z0-9:_.-]{1,120}$/.test(rec.id)&&!seen.has(rec.id),
   'R27_DUPLICATE_OR_INVALID_ID');
  seen.add(rec.id);
  check(TYPES.has(rec.kind),'R27_UNKNOWN_EVENT_KIND');
  check(Number.isFinite(utc(rec.event_at_utc))&&Number.isFinite(utc(rec.available_at_utc)),
   'R27_INVALID_EVENT_CLOCK');
  check(utc(rec.event_at_utc)<=utc(rec.available_at_utc),'R27_EVENT_AVAILABLE_BEFORE_OCCURRED');
  check(rec.candidate_id===null||typeof rec.candidate_id==='string'&&
   /^(solana|eth|base|bsc):[^:\s]{4,130}$/.test(rec.candidate_id),'R27_BAD_CANDIDATE');
  check(rec.data&&typeof rec.data==='object'&&!Array.isArray(rec.data)&&
   Buffer.byteLength(JSON.stringify(rec.data))<=6000,'R27_INVALID_SOURCE_DATA');
  const sourceOk=validArchive(rec.proof,rec)||validChainProof(rec.proof,rec);
  if(!sourceOk){rejected.push({id:rec.id,reason:'NO_INDEPENDENT_HISTORICAL_AVAILABILITY_PROOF'});continue}
  if(rec.kind==='POOL'&&!rec.candidate_id){
   rejected.push({id:rec.id,reason:'POOL_WITHOUT_CHAIN_TOKEN_POOL'});continue
  }
  if(utc(rec.available_at_utc)>=utc(R27_WINDOW.end_exclusive)){
   rejected.push({id:rec.id,reason:'AFTER_REPLAY_WINDOW'});continue
  }
  accepted.push(copy(rec));
 }
 const verifiedCoverage=[],invalidCoverage=[];
 for(const c of bundle.coverage){
  check(R27_COVERAGE.includes(c?.category)&&Number.isFinite(utc(c.start_utc))&&
   Number.isFinite(utc(c.end_exclusive_utc))&&
   utc(c.start_utc)<utc(c.end_exclusive_utc),'R27_INVALID_COVERAGE');
  // An article timestamp cannot prove whole-source coverage. Coverages
  // need separately externally attested missingness and timestamp of capture.
  const ok=c.independently_audited===true&&c.complete===true&&
   c.source_count>0&&Number.isSafeInteger(c.source_count)&&
   typeof c.attestation_ref==='string'&&safeUrl(c.attestation_ref)&&
   Number.isFinite(utc(c.attested_at_utc))&&
   utc(c.attested_at_utc)<=utc(c.start_utc);
  if(ok)verifiedCoverage.push(copy(c));
  else invalidCoverage.push({category:c.category,start:c.start_utc,reason:'COVERAGE_NOT_INDEPENDENTLY_ATTESTED_ASOF'});
 }
 accepted.sort((a,b)=>utc(a.available_at_utc)-utc(b.available_at_utc)||a.id.localeCompare(b.id));
 return {records:accepted,rejected,coverage:verifiedCoverage,invalidCoverage,
  source_count:bundle.records.length,externally_audited:
    typeof bundle.external_audit_ref==='string'&&safeUrl(bundle.external_audit_ref)};
}
function covered(coverage,category,at){
 const t=utc(at);
 return coverage.some(c=>c.category===category&&utc(c.start_utc)<=t&&t<utc(c.end_exclusive_utc));
}
export function r27Frame(inspection,at){
 const time=utc(at);check(Number.isFinite(time)&&time>=utc(R27_WINDOW.start)&&
  time<utc(R27_WINDOW.end_exclusive),'R27_OUT_OF_WINDOW');
 const eligible=inspection.records.filter(e=>utc(e.available_at_utc)<=time);
 const coveredCategories=R27_COVERAGE.filter(cat=>covered(inspection.coverage,cat,at));
 const missing=R27_COVERAGE.filter(cat=>!coveredCategories.includes(cat));
 const researchReady=missing.filter(x=>['POOL_UNIVERSE','NEWS_SOCIAL','ONCHAIN_MARKET'].includes(x)).length===0;
 const executionReady=researchReady&&missing.length===0;
 const candidates=[...new Set(eligible.filter(x=>x.kind==='POOL').map(x=>x.candidate_id))];
 // Model receives no future records and no status from the original R26 label
 // database. Actual source text is untrusted and may itself reveal a famous name.
 const visible=eligible.filter(e=>e.kind==='NEWS'||e.kind==='SOCIAL'||
  (e.candidate_id!==null&&candidates.includes(e.candidate_id)));
 const frame={schema:'r27_ai_frame.v1',at_utc:at,candidate_ids:candidates,
  coverage_categories:coveredCategories,available_source_ids:visible.map(e=>e.id),
  evidence:visible.map(e=>({id:e.id,kind:e.kind,candidate_id:e.candidate_id,
   event_at_utc:e.event_at_utc,available_at_utc:e.available_at_utc,
   data:copy(e.data)})),mode:'RESEARCH_ONLY_NO_ORDERS'};
 const frameHash=hash(JSON.stringify(frame));
 return {frame,frame_hash:frameHash,missing,researchReady,executionReady};
}
export function validateR27Decision(view,decision){
 check(decision&&typeof decision==='object'&&Array.isArray(decision.decisions)&&
  decision.decisions.length<=30&&typeof decision.summary==='string'&&
  decision.summary.length<=1200,'R27_BAD_MODEL_DECISION');
 const known=new Set(view.frame.candidate_ids),evidence=new Set(view.frame.available_source_ids);
 const used=new Set(),accepted=[];
 for(const d of decision.decisions){
  check(d&&ACTIONS.has(d.action)&&
   typeof d.candidate_id==='string'&&known.has(d.candidate_id)&&
   !used.has(d.candidate_id)&&Number.isFinite(d.score)&&d.score>=0&&d.score<=100&&
   Array.isArray(d.evidence_ids)&&d.evidence_ids.length<=30&&
   d.evidence_ids.every(x=>typeof x==='string'&&evidence.has(x))&&
   typeof d.reason==='string'&&d.reason.length<=500,'R27_INVALID_DECISION_EVIDENCE');
  used.add(d.candidate_id);
  accepted.push({action:d.action,candidate_id:d.candidate_id,score:d.score,
   evidence_ids:[...d.evidence_ids],reason:d.reason});
 }
 return {schema:'r27_sealed_research_decision.v1',at_utc:view.frame.at_utc,
  input_hash:view.frame_hash,summary:decision.summary,decisions:accepted,
  historical_fill_verified:false,paper_trade_executed:false};
}
export async function r27Compare(bundle,{model=null}={}){
 const inspection=validateR27Bundle(bundle);
 const runs=[];
 for(const frequency of R27_FREQUENCIES){
  const ticks=r27Schedule(frequency);
  let researchTicks=0,blockedTicks=0,modelCalls=0,intents=0;
  const journal=[];
  for(const at of ticks){
   const view=r27Frame(inspection,at);
   if(!view.researchReady){
    blockedTicks++;journal.push({at,status:'DATA_GAP_NOT_NO_TRADE',
     missing:view.missing,available_source_count:view.frame.evidence.length});
    continue;
   }
   researchTicks++;
   if(!model){
    journal.push({at,status:'RESEARCH_READY_MODEL_NOT_INVOKED',missing:view.missing,
     available_source_count:view.frame.evidence.length,frame_hash:view.frame_hash});
    continue;
   }
   let outcome;
   try{
    const proposal=await model(copy(view.frame));
    modelCalls++;outcome=validateR27Decision(view,proposal);
   }catch(e){
    journal.push({at,status:'MODEL_REJECTED_OR_UNAVAILABLE',reason:String(e.message).slice(0,100)});
    continue;
   }
   intents+=outcome.decisions.filter(d=>d.action==='BUY').length;
   journal.push({at,status:view.executionReady?'MODEL_RESEARCH_ONLY_EXECUTION_NOT_CONNECTED':'EXECUTION_EVIDENCE_MISSING',
    missing:view.missing,frame_hash:view.frame_hash,decision:outcome});
  }
  runs.push({frequency_per_day:frequency,scheduled_analyses:ticks.length,
   research_eligible_analyses:researchTicks,data_gap_analyses:blockedTicks,
   model_calls:modelCalls,hypothetical_buy_intents:intents,
   actual_paper_fills:0,realized_pnl_test_usdc:null,
   unrealized_pnl_test_usdc:null,net_pnl_test_usdc:null,
   ending_test_usdc:null,
   status:blockedTicks?'INCOMPLETE_ASOF_DATA':
     !model?'NO_MODEL_EXECUTED':'RESEARCH_ONLY_EXECUTION_NOT_VALIDATED',
   journal});
 }
 return {schema:'r27_frequency_evidence_audit.v1',window:copy(R27_WINDOW),
  mode:'STRICT_ASOF_NO_FABRICATED_TRADES',starting_test_usdc:5000,
  baseline_reference:'R26_PRICE_ONLY_NOT_DIRECTLY_COMPARABLE',
  input:{total_records:inspection.source_count,accepted_records:inspection.records.length,
   rejected_records:inspection.rejected,coverage_categories:inspection.coverage.map(x=>x.category),
   invalid_coverage:inspection.invalidCoverage,externally_audited:inspection.externally_audited},
  runs,summary:{total_scheduled_analyses:runs.reduce((n,r)=>n+r.scheduled_analyses,0),
   total_historical_model_calls:runs.reduce((n,r)=>n+r.model_calls,0),
   total_historical_fills:0,frequency_winner:null,
   headline:'NO_VERIFIED_AI_PNL_WITHOUT_ASOF_AND_EXECUTION_EVIDENCE'},
  limitations:['No external archive verification occurs inside this offline evaluator.',
   'The model may know future outcomes from its pretrained weights.',
   'Historical as-of completeness is not established by a published-at timestamp.',
   'Research intents never mutate a portfolio, even in the verified-coverage test fixture.']};
}
