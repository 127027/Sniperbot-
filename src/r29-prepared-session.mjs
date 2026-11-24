// R29 predecision preparation barrier. No network, no elapsed-time minimum,
// no oracle, no real order side effects. A prepared session is distinct from diagnostics.
import {createHash} from 'node:crypto';
import {emptyRetrospectiveLedger,applyRetrospectiveEntry,applyRetrospectiveExit,settleRetrospectivePending} from './r29-retrospective-execution.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):NaN;
const sha=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const roles=['TEMPO','DISCOVERY','RISK','STRATEGY','QA'];
const modes=['SINGLE_GPT','FIVE_DOTS'];
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const dependencies={TEMPO:[],DISCOVERY:[],RISK:['DISCOVERY'],STRATEGY:['TEMPO','DISCOVERY','RISK'],QA:['TEMPO','DISCOVERY','RISK','STRATEGY']};
// A review artifact binds the decision payload and the arm-specific frozen input.
// This is structural evidence only, never independent attestation of model identity.
function validateComparisonReviews({session,input,roleReviews,singleReview,decisions}){
 const mode=session.review_mode;
 const bound=r=>r&&r.arm===mode&&r.session_id===session.session_id&&r.input_sha256===input.input_sha256&&r.tick_utc===input.tick_utc&&nonempty(r.review_id)&&sha(r.journal_sha256)&&nonempty(r.analysis);
 const decisionDigest=hash(decisions);
 if(mode==='SINGLE_GPT'){
  if(roleReviews!==undefined||!bound(singleReview)||!Array.isArray(singleReview.scope)||!exact(singleReview.scope,roles)||singleReview.decisions_sha256!==decisionDigest)throw Error('SINGLE_GPT_REVIEW_REQUIRED');
  return [singleReview.review_id];
 }
 if(mode!=='FIVE_DOTS'||singleReview!==undefined||!Array.isArray(roleReviews)||!exact(roleReviews.map(r=>r.role),roles)||!roleReviews.every(bound)||new Set(roleReviews.map(r=>r.review_id)).size!==roles.length||new Set(roleReviews.map(r=>r.journal_sha256)).size!==roles.length)throw Error('FIVE_ROLE_HANDOFF_REQUIRED');
 for(const r of roleReviews){
  const expected=dependencies[r.role].map(role=>roleReviews.find(x=>x.role===role).journal_sha256);
  if(!Array.isArray(r.dependency_sha256s)||!exact(r.dependency_sha256s,expected))throw Error('ROLE_DEPENDENCY_MISMATCH');
  if(['STRATEGY','QA'].includes(r.role)&&r.decisions_sha256!==decisionDigest)throw Error('ROLE_DECISION_DIGEST_MISMATCH');
 }
 return roleReviews.map(r=>r.review_id);
}
const forbidden=new Set(['winner_rank','reported_gain_pct','oracle_label','future_price_usd','later_outcome','future_winner_list','winner_names']);
function noOracle(x){if(x&&typeof x==='object'){for(const [k,v] of Object.entries(x)){if(forbidden.has(k))throw Error('ORACLE_INPUT_FORBIDDEN');noOracle(v);}}}
function prior(at,tick){return Number.isFinite(ms(at))&&ms(at)<ms(tick);}
function exact(a,b){return a.length===new Set(a).size&&b.length===new Set(b).size&&a.length===b.length&&a.every(x=>b.includes(x));}
export function inspectPreparedMarket({tickUtc,requiredSources,coverage,candidates,screenedCount,unexportedCount=0,preparedBeforeDecision,sourceScope}={}){
 noOracle({requiredSources,coverage,candidates,sourceScope});
 if(!Number.isFinite(ms(tickUtc))||!Array.isArray(requiredSources)||!requiredSources.length||new Set(requiredSources).size!==requiredSources.length||!Array.isArray(coverage)||!Array.isArray(candidates)||!Number.isInteger(screenedCount)||screenedCount<0||!Number.isInteger(unexportedCount)||unexportedCount<0||typeof sourceScope!=='string'||!sourceScope.trim())throw Error('INVALID_PREPARATION_INPUT');
 const jobs=[];
 if(preparedBeforeDecision!==true)jobs.push({kind:'PREPARE_BEFORE_FIRST_DECISION',reason:'DATA_COLLECTION_NOT_FINISHED'});
 for(const source of requiredSources){const c=coverage.filter(x=>x.source===source);
  if(c.length!==1||c[0].status!=='VERIFIED_DECLARED_SCOPE_COMPLETE'||!sha(c[0].evidence_sha256)||!prior(c[0].knowledge_at_utc,tickUtc))jobs.push({kind:'SOURCE_COVERAGE',source,reason:'MISSING_OR_INCOMPLETE_ASOF_SOURCE'});
 }
 if(candidates.length!==screenedCount||unexportedCount!==0||new Set(candidates.map(c=>c.mint)).size!==candidates.length)jobs.push({kind:'CANDIDATE_EXPORT',reason:'SCREENED_CANDIDATE_SET_INCOMPLETE'});
 for(const c of candidates){
  if(!c.mint||!prior(c.knowledge_at_utc,tickUtc)||!sha(c.evidence_sha256))jobs.push({kind:'CANDIDATE_EVIDENCE',mint:c.mint,reason:'MISSING_OR_FUTURE_EVIDENCE'});
  if(!['MODEL_INPUT_VERIFIED','REJECTED_WITH_EVIDENCE'].includes(c.status))jobs.push({kind:'CANDIDATE_RISK_AND_QUOTE',mint:c.mint,reason:c.reason||'UNRESOLVED'});
  if(c.status==='REJECTED_WITH_EVIDENCE'&&(typeof c.reason!=='string'||!c.reason.trim()))jobs.push({kind:'CANDIDATE_RISK_AND_QUOTE',mint:c.mint,reason:'REJECTION_REASON_MISSING'});
 }
 const data={tickUtc,requiredSources,coverage,candidates,screenedCount,unexportedCount,preparedBeforeDecision,sourceScope};
 return {kind:'R29_PREDECISION_PREPARATION',status:jobs.length?'PREPARATION_INCOMPLETE':'READY_FOR_DECLARED_SCOPE',tick_utc:tickUtc,source_scope:sourceScope,preparation_sha256:hash(data),pending_jobs:jobs,elapsed_time_requirement:null,global_market_completeness_proven:false,source_authentication_requires_upstream_verifier:true,valid_first_scan_completed:false,orders:0};
}
export function beginPreparedSession({preparation,sessionId,reviewMode}={}){
 if(reviewMode!==undefined&&!modes.includes(reviewMode))throw Error('INVALID_REVIEW_MODE');
 const p=inspectPreparedMarket(preparation);
 if(p.status!=='READY_FOR_DECLARED_SCOPE')return {preflight:p,session:null};
 if(typeof sessionId!=='string'||!sessionId||!preparation.tickUtc.endsWith('T00:00:00.000Z'))throw Error('FIRST_SCAN_MUST_BE_MIDNIGHT');
 return {preflight:p,session:{kind:'R29_PREPARED_RESEARCH_SESSION',session_id:sessionId,...(reviewMode===undefined?{}:{review_mode:reviewMode}),start_utc:preparation.tickUtc,next_tick_utc:preparation.tickUtc,preparation_sha256:p.preparation_sha256,source_scope:preparation.sourceScope,ledger:emptyRetrospectiveLedger(),scan_history:[],orders:0}};
}
export function prepareScanInput(session,preparation){
 const p=inspectPreparedMarket(preparation);
 if(session?.kind!=='R29_PREPARED_RESEARCH_SESSION'||preparation.tickUtc!==session.next_tick_utc||p.status!=='READY_FOR_DECLARED_SCOPE'||p.source_scope!==session.source_scope||(!session.scan_history.length&&p.preparation_sha256!==session.preparation_sha256))throw Error('SCAN_NOT_PREPARED_OR_OUT_OF_ORDER');
 const universe=[...new Set([...preparation.candidates.map(c=>c.mint),...Object.keys(session.ledger.positions),...Object.keys(session.ledger.pending)])].sort();
 const payload={...(session.review_mode?{arm:session.review_mode,session_id:session.session_id}:{}),tick_utc:p.tick_utc,preparation_sha256:p.preparation_sha256,candidates:preparation.candidates,portfolio:session.ledger,required_decision_mints:universe};
 return {...payload,input_sha256:hash(payload)};
}
// The five role handoffs must refer to the same frozen input. The caller supplies
// actual current reviews; this checks binding/completeness, not external GPT identity.
export function commitPreparedScan({session,preparation,roleReviews,singleReview,decisions}={}){
 const input=prepareScanInput(session,preparation);
 noOracle({roleReviews,singleReview,decisions});
 if(!Array.isArray(decisions)||!exact(decisions.map(d=>d.mint),input.required_decision_mints))throw Error('DECISION_COVERAGE_INCOMPLETE');
 let reviewIds;
 if(session.review_mode!==undefined)reviewIds=validateComparisonReviews({session,input,roleReviews,singleReview,decisions});
 else{
  if(singleReview!==undefined||!Array.isArray(roleReviews)||!exact(roleReviews.map(r=>r.role),roles)||roleReviews.some(r=>r.input_sha256!==input.input_sha256||r.tick_utc!==input.tick_utc||typeof r.review_id!=='string'||!r.review_id))throw Error('FIVE_ROLE_HANDOFF_REQUIRED');
  reviewIds=roleReviews.map(r=>r.review_id);
 }
 const next=structuredClone(session);
 for(const d of decisions){
  if(!['BUY','HOLD','SELL','WATCH','NO_TRADE','DATA_GAP'].includes(d.action)||typeof d.reason!=='string'||!d.reason.trim())throw Error('INVALID_DECISION');
  const pos=next.ledger.positions[d.mint],pending=next.ledger.pending[d.mint];
  if(pos&&!['HOLD','SELL','DATA_GAP'].includes(d.action))throw Error('OPEN_POSITION_NOT_REVIEWED');
  if(!pos&&['SELL','HOLD'].includes(d.action))throw Error('NO_POSITION_FOR_HOLD_OR_SELL');
  if(d.action==='BUY'){
   if(pos||pending||!preparation.candidates.some(c=>c.mint===d.mint&&c.status==='MODEL_INPUT_VERIFIED')||d.entryInput?.tickUtc!==input.tick_utc||d.entryInput?.pair?.mint!==d.mint)throw Error('BUY_INPUT_NOT_PREPARED');
   const a=applyRetrospectiveEntry(next.ledger,d.entryInput);if(!a.evaluation.model_signal_eligible)throw Error('BUY_SIGNAL_NOT_ELIGIBLE');next.ledger=a.ledger;
  }else if(d.action==='SELL'){
   if(pending||d.exitInput?.mint!==d.mint||d.exitInput?.tickUtc!==input.tick_utc)throw Error('EXIT_INPUT_NOT_PREPARED');
   const a=applyRetrospectiveExit(next.ledger,d.exitInput);if(a.evaluation.signal.action!=='SELL')throw Error('SELL_SIGNAL_NOT_ELIGIBLE');next.ledger=a.ledger;
  }
 }
 next.scan_history.push({tick_utc:input.tick_utc,input_sha256:input.input_sha256,role_review_ids:reviewIds,...(session.review_mode?{arm:session.review_mode,prior_portfolio_sha256:hash(session.ledger),decision_sha256:hash(decisions),journal_sha256s:singleReview?[singleReview.journal_sha256]:roleReviews.map(r=>r.journal_sha256)}:{}),decisions:decisions.map(({mint,action,reason})=>({mint,action,reason})),portfolio_sha256:hash(next.ledger),actual_gpt_identity_independently_verified:false});
 next.next_tick_utc=new Date(ms(input.tick_utc)+3600000).toISOString();
 return next;
}
export function settleBetweenPreparedScans(session,input){
 if(!session.scan_history.length||ms(input.tickUtc)<=ms(session.scan_history.at(-1).tick_utc)||ms(input.tickUtc)>=ms(session.next_tick_utc))throw Error('SETTLEMENT_OUTSIDE_CURRENT_INTERVAL');
 const next=structuredClone(session),result=settleRetrospectivePending(next.ledger,input);next.ledger=result.ledger;return {session:next,event:result.event};
}
