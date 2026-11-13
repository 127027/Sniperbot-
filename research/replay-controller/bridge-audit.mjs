// R15: read-only audit of the persisted five-Dot bridge. No orders, network or files written.
// It is intentionally NOT an agent, not a strategy, and not a blind-test success certificate.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROLES,digest,validateDecisions} from './engine.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(HERE,'../..');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const validUtc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s));

export function assessBridge({frame,votes={},roleStates={},corpusAudit={},mode='DIAGNOSTIC'}){
 if(!['DIAGNOSTIC','BLIND'].includes(mode))throw Error('INVALID_BRIDGE_MODE');
 if(!frame||frame.schema!=='dot_replay_frame.v1'||!Number.isSafeInteger(frame.index)||frame.index<0||
  !validUtc(frame.at)||!Array.isArray(frame.events)||!frame.portfolio||typeof frame.portfolio!=='object')
  throw Error('INVALID_BRIDGE_FRAME');
 const {input_hash,...plain}=frame;
 if(typeof input_hash!=='string'||input_hash!==digest(plain))throw Error('FRAME_HASH_MISMATCH');
 const visibleIds=new Map();
 for(const e of frame.events){
  if(!e||typeof e.id!=='string'||visibleIds.has(e.id)||typeof e.candidate_id!=='string'||
    !validUtc(e.event_at)||!validUtc(e.available_at)||
    Date.parse(e.event_at)>Date.parse(e.available_at)||
    Date.parse(e.available_at)>Date.parse(frame.at))
   throw Error('FUTURE_OR_INVALID_VISIBLE_EVENT');
  visibleIds.set(e.id,e.candidate_id);
 }
 const roles={},missing=[],invalid=[],missingPersistence=[],exposed=[];
 for(const role of ROLES){
  const d=votes[role];
  const state=roleStates[role];
  const currentSelection=state?.candidate?.selection;
  if(currentSelection==='KNOWN_WINNER_DIAGNOSTIC_NOT_DISCOVERY'||state?.candidate?.symbol==='PEPE'||
    state?.candidate?.selection==='KNOWN_WINNER')exposed.push(role);
  if(!state?.run_id||state.role!==role)missingPersistence.push(role);
  if(d===undefined||d===null){
   missing.push(role);
   roles[role]={vote:'MISSING',current_status:state?.status||'UNKNOWN'};
   continue;
  }
  let reason=null;
  if(d.role!==role)reason='WRONG_ROLE';
  else if(d.index!==frame.index||d.at!==frame.at||d.input_hash!==frame.input_hash)reason='STALE_OR_WRONG_FRAME';
  else if(typeof d.run_id!=='string'||!d.run_id.length||!Array.isArray(d.reviews)||!Array.isArray(d.orders))reason='INVALID_VOTE_SCHEMA';
  else if(d.orders.length>0&&role!=='qa')reason='ONLY_QA_MAY_ORDER';
  else for(const review of d.reviews){
   if(!review||typeof review.candidate_id!=='string'||!['YES','NO','UNKNOWN'].includes(review.verdict)||
     !Array.isArray(review.evidence_ids)||review.evidence_ids.length===0||
     review.evidence_ids.some(id=>visibleIds.get(id)!==review.candidate_id)){
    reason='INVALID_OR_FUTURE_REVIEW_EVIDENCE';break;
   }
  }
  if(reason)invalid.push({role,reason});
  roles[role]={vote:reason?'INVALID':'PRESENT',reason,
   current_status:state?.status||'UNKNOWN',run_id:d.run_id||null};
 }
 let combinedValidation=null;
 if(missing.length===0&&invalid.length===0){
  try{validateDecisions(frame,ROLES.map(r=>votes[r]));combinedValidation='PASS_SYNTAX_ONLY';}
  catch(e){combinedValidation='FAIL:'+e.message;invalid.push({role:'cross_role',reason:String(e.message)});}
 }
 const readinessReasons=corpusAudit?.readiness?.reasons||[];
 const blockers=[
  ...readinessReasons.map(x=>'DATASET:'+x),
  ...exposed.map(x=>'KNOWN_TARGET_IN_CONTEXT:'+x),
  ...missingPersistence.map(x=>'CURRENT_RUN_STATE_MISSING:'+x),
  ...missing.map(x=>'MISSING_ROLE_VOTE:'+x),
  ...invalid.map(x=>'INVALID_ROLE_VOTE:'+x.role+':'+x.reason)
 ];
 const validFiveVotes=missing.length===0&&invalid.length===0&&combinedValidation==='PASS_SYNTAX_ONLY';
 // Even five valid JSON files are not independent authenticated GPT decisions.
 // This scanner cannot certify untainted contexts, source validity or trade execution.
 return {
  schema:'sniper_replay_bridge_audit.v1',
  mode,at:frame.at,index:frame.index,input_hash:frame.input_hash,
  vote_count:ROLES.length-missing.length,
  missing_roles:missing,invalid_votes:invalid,roles,
  known_target_exposed_roles:exposed,
  missing_persisted_role_states:missingPersistence,
  corpus_reasons:readinessReasons,
  cross_role_validation:combinedValidation,
  ready_for_controller_advance:validFiveVotes,
  ready_for_blind_evaluation:false,
  status:mode==='BLIND'&&blockers.length?'BLIND_BLOCKED':
    !validFiveVotes?'WAITING_FOR_FIVE_VALID_ROLE_VOTES':'STRUCTURALLY_READY_DIAGNOSTIC_ONLY',
  blockers,
  independent_role_authorship_verified:false,
  historic_discovery_verified:false,
  hypothetical_trades_verified:false,
  next_action:!validFiveVotes?'Obtain five independently authored matching frame votes; do not fabricate missing ones':
    'Advance isolated diagnostic controller only; audit sources and fresh blind contexts separately'
 };
}

export function inspectBridge({frameDirectory,root=REPO_ROOT,mode='DIAGNOSTIC'}){
 const frame=read(path.join(frameDirectory,'input.json'));
 const votes={},states={};
 for(const role of ROLES){
  const voteFile=path.join(frameDirectory,'decisions',role+'.json');
  if(fs.existsSync(voteFile))votes[role]=read(voteFile);
  const stateFile=path.join(root,'research','dot-workflow','roles',role,'current.json');
  if(fs.existsSync(stateFile))states[role]=read(stateFile);
 }
 const auditFile=path.join(root,'research','replay-controller','reports','existing-corpus-audit.json');
 const corpusAudit=fs.existsSync(auditFile)?read(auditFile):{};
 return assessBridge({frame,votes,roleStates:states,corpusAudit,mode});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const mode=process.argv[2]||'DIAGNOSTIC';
  const directory=path.resolve(process.argv[3]||path.join(HERE,'bridge','diagnostic-first-frame'));
  const result=inspectBridge({frameDirectory:directory,mode});
  console.log(JSON.stringify(result,null,2));
  if(!result.ready_for_controller_advance)process.exitCode=2;
 }catch(e){console.error(e.message);process.exitCode=1;}
}
