// Receives owner-attributed GPT instructions only through an authenticated
// loopback courier, locally signs any SAFE paper BUY/SELL and rechecks facts.
// This process NEVER chooses a coin or creates a trade from local momentum.
import {generateKeyPairSync,sign} from 'node:crypto';
import {appendFileSync,mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {AGENT_SIGNAL_SCHEMA,unsignedAgentSignal} from './paper-agent-pipeline.mjs';
import {validateGptPaperDecision,contentSha256} from './gpt-paper-protocol.mjs';
import {readLocalPaperMarketSnapshot} from './live-paper-autopilot.mjs';
import {r29LivePaperEntryGate} from './live-paper-risk.mjs';
import {lookupToken} from './market.mjs';
import {collectEvmSecurity} from './live-paper-security.mjs';

const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const BRIDGE_SCHEMA='sniper_r29_local_gpt_relay.v1';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const err=e=>typeof e==='string'&&/^[A-Z0-9_]{1,100}$/.test(e)?e:'GPT_LOCAL_VALIDATION_BLOCKED';
const safeResult=(d,status,reason)=>({schema:'sniper_r29_local_gpt_receipt.v1',
 mode:'PAPER_ONLY',real_trading_enabled:false,wallet_touched:false,
 decision_id:d.decision_id,action:d.action,status,reason:err(reason)});

export function validateGptRelayEnvelope(payload,{now=Date.now()}={}){
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||
  Object.keys(payload).sort().join('|')!==[
   'schema','decision','archive_sha256','pointer_commit_sha',
   'archive_commit_sha','github_owner_verified','real_trading_enabled'
  ].sort().join('|')||
  payload.schema!==BRIDGE_SCHEMA||payload.github_owner_verified!==true||
  payload.real_trading_enabled!==false||
  !SHA.test(payload.pointer_commit_sha||'')||
  !SHA.test(payload.archive_commit_sha||'')||
  !DIGEST.test(payload.archive_sha256||''))
  throw Error('GPT_RELAY_ENVELOPE_INVALID');
 const validated=validateGptPaperDecision(payload.decision,{now,forExecution:false});
 if(contentSha256(JSON.stringify(payload.decision,null,2)+'\n')!==
  payload.archive_sha256)
  throw Error('GPT_LOCAL_ARCHIVE_HASH_MISMATCH');
 return validated;
}
function fromState(state,decision,sha){
 const found=state?.gptDecisionReplay?.[decision.decision_id];
 if(!found)return null;
 if(found.archive_sha256!==sha)throw Error('GPT_DECISION_REPLAY_CONFLICT');
 return safeResult(decision,found.status,found.reason);
}
function matchedIdentity(c,d){
 return c?.chain===d.chain&&
  c.token_address?.toLowerCase()===d.token_address.toLowerCase()&&
  c.pool_address?.toLowerCase()===d.pool_address.toLowerCase()&&
  c.candidate_id?.toLowerCase()===
   (d.chain+':'+d.token_address+':'+d.pool_address).toLowerCase();
}
export function signGptPaperSignal(decision,{deviceId,keyPair,now=Date.now()}={}){
 if(!/^device_[0-9a-f]{32}$/.test(deviceId||'')||
  !['BUY','SELL'].includes(decision?.action)||
  !Number.isFinite(now))throw Error('GPT_SIGNING_INVALID_PARAMETERS');
 const msg={schema:AGENT_SIGNAL_SCHEMA,target_device_id:deviceId,
  signal_id:'sig_'+decision.decision_id.slice(4),
  issuer:'sniper-gpt-paper-bridge',key_id:'ephemeral-session',
  chain:decision.chain,action:decision.action,
  token_address:decision.token_address,pool_address:decision.pool_address,
  size_test_usdc:decision.action==='BUY'?decision.amount_test_usdc.toFixed(2):null,
  created_at_utc:new Date(now).toISOString(),
  expires_at_utc:new Date(now+90000).toISOString()};
 return {...msg,signature:sign(null,Buffer.from(unsignedAgentSignal(msg),'utf8'),
  keyPair.privateKey).toString('base64')};
}
export function createGptPaperLocalReceiver({deviceId,dataDir,marketFile,
 getState,commit,submit,now=()=>Date.now(),
 loadMarket=readLocalPaperMarketSnapshot,
 lookup=lookupToken,securityCheck=collectEvmSecurity}={}){
 if(!/^device_[0-9a-f]{32}$/.test(deviceId||'')||
  !path.isAbsolute(dataDir||'')||!path.isAbsolute(marketFile||'')||
  ![getState,commit,submit,loadMarket,lookup,securityCheck,now].every(
   f=>typeof f==='function'))throw Error('GPT_LOCAL_RECEIVER_BAD_CONFIG');
 const kp=generateKeyPairSync('ed25519');
 const trusted={issuer:'sniper-gpt-paper-bridge',key_id:'ephemeral-session',
  scope:'agent_execution',revoked:false,
  public_key_pem:kp.publicKey.export({format:'pem',type:'spki'})};
 const auditFolder=path.join(dataDir,'gpt-paper','decision-journal');
 let serial=Promise.resolve();
 const one=async payload=>{
  const instant=now(),d=payload?.decision;
  const parsed=validateGptRelayEnvelope(payload,{now:instant});
  const existing=fromState(getState(),d,payload.archive_sha256);
  if(existing)return {...existing,duplicate:true};
  let receipt;
  if(!parsed.trade)receipt=safeResult(d,d.action,'GPT_RESEARCH_NO_ORDER');
  else if(Date.parse(d.expires_at_utc)<=instant)
   receipt=safeResult(d,'REJECTED','GPT_DECISION_EXPIRED_NO_PAPER_TRADE');
  else if(getState()?.gptPaperFollow!==true||getState()?.entriesEnabled!==true)
   receipt=safeResult(d,'BLOCKED','GPT_FOLLOW_OR_PAPER_BOT_DISABLED');
  else if(!['base','bsc','eth'].includes(d.chain))
   receipt=safeResult(d,'BLOCKED','SOLANA_SECURITY_GATE_NOT_YET_SUPPORTED');
  else{
   const before=getState();
   if(d.action==='SELL'&&!before.positions.some(p=>
    p.gptPaperDecision===true&&matchedIdentity({
      chain:p.chain,token_address:p.tokenAddress,pool_address:p.poolAddress,
      candidate_id:p.chain+':'+p.tokenAddress+':'+p.poolAddress},d)))
    receipt=safeResult(d,'BLOCKED','NO_MATCHING_GPT_OWNED_PAPER_POSITION');
   else{
    let candidate=null,q=null,security=null;
    if(d.action==='BUY'){
     const local=loadMarket(marketFile,{now:instant});
     if(!local?.ok)receipt=safeResult(d,'BLOCKED','LOCAL_SOURCE_NOT_FRESH');
     else{
      const found=local.snapshot.candidates?.find(c=>matchedIdentity(c,d));
      if(!found)receipt=safeResult(d,'BLOCKED','GPT_CANDIDATE_NOT_IN_LOCAL_UNIVERSE');
      else candidate={...found,
       first_local_observed_at_utc:found.observed_at_utc};
     }
    }
    if(!receipt){
     try{
      const rawQuote=await lookup(d.chain,d.token_address,fetch,d.pool_address);
      if(rawQuote)q={...rawQuote,chain:d.chain,tokenAddress:d.token_address,
       poolAddress:d.pool_address};
      if(d.action==='BUY')security=await securityCheck({
       chain:d.chain,token:d.token_address,pool:d.pool_address,now:now()});
     }catch{receipt=safeResult(d,'BLOCKED','INDEPENDENT_MARKET_OR_SECURITY_UNAVAILABLE')}
    }
    if(!receipt&&d.action==='BUY'){
     const approval=r29LivePaperEntryGate({
      state:{...getState(),automaticPaperBuys:true},candidate,
      quote:q,security,now:now()});
     if(!approval.allowed)receipt=safeResult(d,'BLOCKED',approval.reason);
     else if(d.amount_test_usdc>approval.amount_test_usdc)
      receipt=safeResult(d,'BLOCKED','GPT_SIZE_EXCEEDS_INDEPENDENT_RISK_CAP');
    }
    if(!receipt){
     const order=signGptPaperSignal(d,{deviceId,keyPair:kp,now:now()});
     const executed=await submit(order,{
      qaQuote:q,source:'GPT_GITHUB_LOCAL',
      localTrust:[trusted],securityEvidence:security,
      paperAutopilotCandidate:candidate,
      gptDecisionId:d.decision_id
     });
     if(executed?.receipt)receipt=safeResult(d,executed.receipt.status,
      executed.receipt.reason);
     else receipt=safeResult(d,'REJECTED','GPT_SIGNED_PAPER_SUBMISSION_FAILED');
    }
   }
  }
  // Durable replay for ALL decisions, including rejected and NO_TRADE.
  // The actual BUY/SELL ledger is committed by submit first, then this
  // metadata is committed to the SAME existing Paper account.
  const current=getState();
  const replay=current.gptDecisionReplay||{};
  if(Object.keys(replay).length>=100000)
   throw Error('GPT_REPLAY_CAPACITY_EXCEEDED_FAIL_CLOSED');
  commit({...current,gptDecisionReplay:{...replay,[d.decision_id]:{
   archive_sha256:payload.archive_sha256,status:receipt.status,
   reason:receipt.reason,at_utc:new Date(now()).toISOString()}}});
  try{
   mkdirSync(auditFolder,{recursive:true});
   appendFileSync(path.join(auditFolder,new Date(instant).toISOString().slice(0,10)+'.jsonl'),
    JSON.stringify({schema:'sniper_r29_gpt_local_audit.v1',
     at_utc:new Date(instant).toISOString(),decision:d,receipt,
     pointer_commit_sha:payload.pointer_commit_sha,
     archive_commit_sha:payload.archive_commit_sha,
     account_balance_or_wallet_logged:false})+'\n',
    {mode:0o600});
  }catch{
   // Replay persists even if a secondary local journal is unavailable.
   receipt={...receipt,audit_warning:'LOCAL_JOURNAL_FAILED'};
  }
  return receipt;
 };
 return {receive:payload=>{
   const job=serial.then(()=>one(payload));
   serial=job.catch(()=>{});
   return job;
 },localTrust:[trusted]};
}
