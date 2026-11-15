// R29 GPT decision contract. Non-GPT research files never authorize orders.
// Authentication comes from the GitHub courier + local ephemeral capability;
// the literal origin field is NOT a cryptographic proof of model identity.
import {createHash} from 'node:crypto';
import {validTokenAddress} from './market.mjs';

export const GPT_PAPER_DECISION_PATH='research/r29/channel/gpt-paper-decision.json';
export const GPT_PAPER_RECEIPT_PATH='research/r29/channel/gpt-paper-receipt.json';
export const GPT_PAPER_CONTEXT_PATH='research/r29/channel/gpt-paper-context.json';
export const GPT_PAPER_BRANCH='codex/r29-chatgpt-github-paper-cycle-20261115';
export const GPT_PAPER_REPO='127027/Sniperbot-';
export const GPT_PAPER_DECISION_SCHEMA='sniper_r29_gpt_paper_decision.v1';
export const GPT_PAPER_POINTER_SCHEMA='sniper_r29_gpt_paper_pointer.v1';
const decisionFields=[
 'schema','mode','strategy','decision_id','action','chain','token_address',
 'pool_address','amount_test_usdc','created_at_utc','expires_at_utc',
 'source_review_sha256','source_observed_at_utc','evidence_ids',
 'security_assessment','score_0_100','reason_de','risk_level',
 'trade_type','real_trading_enabled'];
const pointerFields=['schema','mode','decision_id','archive_path',
 'archive_sha256','published_at_utc','real_trading_enabled'];
const sameKeys=(x,arr)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===[...arr].sort().join('|');
const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(Date.parse(s)).toISOString()===new Date(Date.parse(s)).toISOString();
const decId=s=>typeof s==='string'&&/^gpt_[0-9a-f]{32}$/.test(s);
const sha=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const actionable=new Set(['BUY','SELL']);
const noAction=new Set(['HOLD','WATCH','NO_TRADE']);
export const contentSha256=body=>createHash('sha256').update(body,'utf8').digest('hex');
export const archivePath=(id,when)=>'research/r29/gpt-decisions/'+when.slice(0,10)+'/'+id+'.json';

export function validateGptPaperDecision(d,{now=Date.now(),forExecution=false}={}){
 if(!sameKeys(d,decisionFields)||d.schema!==GPT_PAPER_DECISION_SCHEMA||
  d.mode!=='PAPER_ONLY'||d.strategy!=='GPT_ONLY'||!decId(d.decision_id)||
  !['BUY','SELL','HOLD','WATCH','NO_TRADE'].includes(d.action)||
  d.trade_type!=='VIRTUAL_ONLY'||d.real_trading_enabled!==false||
  !iso(d.created_at_utc)||!iso(d.expires_at_utc)||
  !iso(d.source_observed_at_utc)||!sha(d.source_review_sha256)||
  !['VERIFIED','UNKNOWN','REJECTED'].includes(d.security_assessment)||
  !['LOW','MEDIUM','HIGH','UNKNOWN'].includes(d.risk_level)||
  !(d.score_0_100===null||(Number.isInteger(d.score_0_100)&&
    d.score_0_100>=0&&d.score_0_100<=100))||
  typeof d.reason_de!=='string'||d.reason_de.trim().length<25||
  d.reason_de.length>1400||
  !Array.isArray(d.evidence_ids)||d.evidence_ids.length>12||
  d.evidence_ids.some(x=>typeof x!=='string'||x.length<5||x.length>250||
    /[\r\n<>"']/u.test(x))||
  !Number.isFinite(now))throw Error('GPT_DECISION_SCHEMA_OR_EVIDENCE_INVALID');
 const created=Date.parse(d.created_at_utc),
 expires=Date.parse(d.expires_at_utc),observed=Date.parse(d.source_observed_at_utc);
 if(created>now+30000||expires<=created||
  observed>created||created-observed>48*3600000||
  (forExecution&&expires<=now))throw Error('GPT_DECISION_TIME_OR_SOURCE_INVALID');
 const trade=actionable.has(d.action);
 if(expires-created>(trade?180000:26*3600000))
  throw Error('GPT_DECISION_TTL_TOO_LONG');
 if(trade){
  if(!['solana','base','bsc','eth'].includes(d.chain)||
   !validTokenAddress(d.chain,d.token_address)||
   !validTokenAddress(d.chain,d.pool_address)||
   d.evidence_ids.length<2||
   (d.action==='BUY'&&(!Number.isInteger(d.score_0_100)||
    d.score_0_100<80||d.security_assessment!=='VERIFIED'||
    typeof d.amount_test_usdc!=='number'||!Number.isFinite(d.amount_test_usdc)||
    d.amount_test_usdc<50||d.amount_test_usdc>5000||
    Math.abs(d.amount_test_usdc*100-Math.round(d.amount_test_usdc*100))>0.00001))||
   (d.action==='SELL'&&d.amount_test_usdc!==null))
   throw Error('GPT_DECISION_TRADE_INCOMPLETE_OR_UNSAFE');
 }else if(d.amount_test_usdc!==null||
   (d.action==='NO_TRADE'&&(d.chain!==null||d.token_address!==null||d.pool_address!==null))||
   (d.action!=='NO_TRADE'&&
    (!validTokenAddress(d.chain,d.token_address)||!validTokenAddress(d.chain,d.pool_address))))
   throw Error('GPT_RESEARCH_ACTION_NOT_EXECUTABLE');
 return {trade,action:d.action,candidate_id:trade||d.action!=='NO_TRADE'?
   d.chain+':'+d.token_address+':'+d.pool_address:null,
  decision_id:d.decision_id, expires_at_utc:d.expires_at_utc};
}

export function validateGptPaperPointer(p,{now=Date.now()}={}){
 if(!sameKeys(p,pointerFields)||p.schema!==GPT_PAPER_POINTER_SCHEMA||
  p.mode!=='PAPER_ONLY'||p.real_trading_enabled!==false||
  !decId(p.decision_id)||!iso(p.published_at_utc)||!sha(p.archive_sha256)||
  p.archive_path!==archivePath(p.decision_id,p.published_at_utc)||
  !Number.isFinite(now)||Date.parse(p.published_at_utc)>now+30000||
  now-Date.parse(p.published_at_utc)>26*3600000)
  throw Error('GPT_POINTER_SCHEMA_OR_AGE_INVALID');
 return p;
}
