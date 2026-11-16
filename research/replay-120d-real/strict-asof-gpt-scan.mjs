// GPT-only historical scan validator. Read-only; never fabricates DEX fills or PnL.
// Retrospective model runs are explicitly NOT original historical trading events.
import {createHash} from 'node:crypto';
import {assessHistoricalPreflight} from './historical-evidence-gate.mjs';

export const SCHEMA='r29_retrospective_gpt_scan_validator.v1';
const ACTIONS=new Set(['BUY','WATCH','HOLD','SELL','NO_TRADE']);
const KINDS=new Set(['ASOF_NEUTRAL_LAUNCH','ASOF_NEUTRAL_MINUTE','ASOF_ARCHIVED_SOCIAL']);
const HASH=/^[a-f0-9]{64}$/i;
const digest=x=>createHash('sha256').update(x).digest('hex');
const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):NaN;
const requireValid=(ok,msg)=>{if(!ok)throw Error(msg)};

export function verifyRetrospectiveGptScan(scan){
 const asof=time(scan?.asof_utc);
 requireValid(Number.isFinite(asof),'INVALID_ASOF_TIMESTAMP');
 requireValid(scan?.origin==='GPT_AUTHORED_RETROSPECTIVE_REPLAY','GPT_ONLY_DECISION_AUTHORITY_REQUIRED');
 requireValid(HASH.test(scan?.source_sha256||'')&&KINDS.has(scan.source_kind),'UNVERIFIED_SOURCE_FRAME');
 requireValid(scan.future_winner_reference_used===false&&scan.future_outcomes_used===false,'POSTHOC_WINNER_OR_OUTCOME_LEAK');
 requireValid(Array.isArray(scan.candidates)&&scan.candidates.length<=100,'INVALID_ASOF_CANDIDATES');
 const identities=new Set();
 for(const candidate of scan.candidates){
  requireValid(candidate&&typeof candidate==='object','INVALID_CANDIDATE');
  requireValid(Number.isFinite(time(candidate.observed_at_utc))&&time(candidate.observed_at_utc)<=asof,'FUTURE_CANDIDATE_EVENT_LEAK');
  requireValid(typeof candidate.chain==='string'&&typeof candidate.token_address==='string'&&
   typeof candidate.pool_address==='string'&&candidate.pool_address.length>0,'CANDIDATE_POOL_IDENTITY_REQUIRED');
  requireValid(candidate.selection_method==='CHRONOLOGICAL_NEUTRAL','RETROSPECTIVE_WINNER_SELECTION');
  const key=[candidate.chain,candidate.token_address,candidate.pool_address].join(':');
  requireValid(!identities.has(key),'DUPLICATE_CANDIDATE');
  identities.add(key);
 }
 requireValid(Array.isArray(scan.decisions)&&scan.decisions.length>0&&scan.decisions.length<=100,'GPT_DECISION_LIST_REQUIRED');
 requireValid(typeof scan.gpt_response_json==='string'&&HASH.test(scan.gpt_response_sha256||'')&&
  digest(scan.gpt_response_json)===scan.gpt_response_sha256,'GPT_RESPONSE_HASH_MISMATCH');
 let embedded;
 try{embedded=JSON.parse(scan.gpt_response_json)}catch{throw Error('INVALID_GPT_RESPONSE_JSON')}
 requireValid(JSON.stringify(embedded)===JSON.stringify(scan.decisions),'GPT_DECISION_TRANSCRIPT_MISMATCH');
 requireValid(Number.isFinite(time(scan.gpt_run_utc))&&time(scan.gpt_run_utc)>=asof,'GPT_MODEL_RUN_TIME_INVALID');
 const verdicts=[];
 for(const d of scan.decisions){
  requireValid(ACTIONS.has(d?.action),'UNRECOGNIZED_GPT_DECISION');
  if(d.action==='NO_TRADE'){
   requireValid(typeof d.reason==='string'&&d.reason.length>=6,'NO_TRADE_REASON_REQUIRED');
   verdicts.push({action:d.action,status:'GPT_RESEARCH_NO_ORDER'});
   continue;
  }
  const key=[d.chain,d.token_address,d.pool_address].join(':');
  requireValid(identities.has(key),'DECISION_NOT_IN_NEUTRAL_FRAME');
  if(d.action!=='BUY'){
   verdicts.push({action:d.action,token_address:d.token_address,status:'RETROSPECTIVE_RESEARCH_ONLY_NOT_AN_EXECUTION'});
   continue;
  }
  requireValid(Number.isFinite(d.stake_test_usdc)&&d.stake_test_usdc>=50&&d.stake_test_usdc<=5000,'STAKE_OUTSIDE_50_TO_5000');
  const proof=assessHistoricalPreflight({asof_utc:scan.asof_utc,chain:d.chain,
   token_address:d.token_address,evidence:d.evidence||[]});
  verdicts.push({action:'BUY',token_address:d.token_address,stake_test_usdc:d.stake_test_usdc,
   status:proof.permission==='REVIEWABLE_BY_GPT_PAPER_ONLY'?'HISTORICALLY_REVIEWABLE_NO_FILL_PROVEN':'BLOCKED_MISSING_HISTORICAL_EXECUTION_PROOFS',
   missing_evidence:proof.missing_required_proofs});
 }
 return {schema:SCHEMA,asof_utc:scan.asof_utc,actual_gpt_model_run_utc:scan.gpt_run_utc,
  historical_model_run_at_asof_proven:false,independent_model_origin_proven:false,
  origin:'RETROSPECTIVE_GPT_MODEL_REPLAY_NOT_ORIGINAL_HISTORICAL_ORDER',
  declared_gpt_only_strategy_authority:true,candidates_inspected:scan.candidates.length,
  research_decisions:verdicts,actual_buy_sell_fills:0,portfolio_pnl_test_usdc:null,
  execution_order_generated:false,real_trading_enabled:false};
}
