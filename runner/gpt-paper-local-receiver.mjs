// Receives owner-attributed GPT instructions only through an authenticated
// loopback courier, locally signs any SAFE paper BUY/SELL and rechecks facts.
// This process NEVER chooses a coin or creates a trade from local momentum.
import {generateKeyPairSync,sign} from 'node:crypto';
import {assessGptPaperExit,gptPolicyExitIntentId,validateGptExitBinding} from './gpt-position-exit.mjs';
import {appendFileSync,mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {AGENT_SIGNAL_SCHEMA,unsignedAgentSignal} from './paper-agent-pipeline.mjs';
import {validateGptPaperDecision,contentSha256} from './gpt-paper-protocol.mjs';
import {readLocalPaperMarketSnapshot} from './live-paper-autopilot.mjs';
import {r29LivePaperEntryGate} from './live-paper-risk.mjs';
import {lookupToken} from './market.mjs';
import {collectEvmSecurity} from './live-paper-security.mjs';
import {validateGptWebPriceEvidence} from './gpt-web-price-evidence.mjs';
import {computePrivateGptCapacity,validatePrivateGptCapacity} from './gpt-paper-capacity-report.mjs';
import {userCoinStake} from './portfolio-budget.mjs';

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
export function signGptPaperSignal(decision,{deviceId,keyPair,now=Date.now(),
 ownerFixedBuyStake=null}={}){
 if(!/^device_[0-9a-f]{32}$/.test(deviceId||'')||
  !['BUY','SELL'].includes(decision?.action)||
  !Number.isFinite(now))throw Error('GPT_SIGNING_INVALID_PARAMETERS');
 const stake=decision.action==='BUY'?
  ownerFixedBuyStake??decision.amount_test_usdc:null;
 if(decision.action==='BUY'&&(!finite(stake)||stake<5||stake>5000||
    Math.abs(stake*100-Math.round(stake*100))>1e-5))
  throw Error('GPT_USER_COIN_STAKE_INVALID');
 const msg={schema:AGENT_SIGNAL_SCHEMA,target_device_id:deviceId,
  signal_id:'sig_'+decision.decision_id.slice(4),
  issuer:'sniper-gpt-paper-bridge',key_id:'ephemeral-session',
  chain:decision.chain,action:decision.action,
  token_address:decision.token_address,pool_address:decision.pool_address,
  size_test_usdc:decision.action==='BUY'?stake.toFixed(2):null,
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
  // Only v3 delegates sizing to the locally configured owner amount. Older
  // signed v2 orders remain executable with their explicitly archived value.
  const fixedStake=parsed.owner_fixed_coin_stake===true;
  const requestedStake=d.action==='BUY'?
   fixedStake?userCoinStake(getState()):d.amount_test_usdc:null;
  let receipt;
  if(!parsed.trade)receipt=safeResult(d,d.action,'GPT_RESEARCH_NO_ORDER');
  else if(Date.parse(d.expires_at_utc)<=instant)
   receipt=safeResult(d,'REJECTED','GPT_DECISION_EXPIRED_NO_PAPER_TRADE');
  else if(d.action==='BUY'&&(!finite(requestedStake)||requestedStake<50&&fixedStake))
   receipt=safeResult(d,'BLOCKED','USER_CONFIGURED_COIN_STAKE_INVALID');
  else if(d.action==='BUY'&&!parsed.signed_exit_policy)
   receipt=safeResult(d,'BLOCKED','GPT_BUY_REQUIRES_SIGNED_POSITION_EXIT_POLICY');
  else if(getState()?.gptPaperFollow!==true||
   (d.action==='BUY'&&getState()?.entriesEnabled!==true))
   receipt=safeResult(d,'BLOCKED','GPT_FOLLOW_OR_PAPER_BOT_DISABLED');
  else if(d.action==='BUY'&&!validatePrivateGptCapacity(
   computePrivateGptCapacity(getState(),{
    observed_at_utc:new Date(instant).toISOString()
   }),{
    asof_utc:new Date(instant).toISOString(),
    requested_test_usdc:requestedStake
   }).approved)
   receipt=safeResult(d,'BLOCKED','GPT_FRESH_PRIVATE_PAPER_CAPACITY_REJECTED');
  else if(!parsed.indicative_web_paper_only&&!['base','bsc','eth'].includes(d.chain))
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
    // V4 GitHub-only public-WEB research PAPER experiment. An accepted
    // virtual fill is NEVER an executable quote or a sellability guarantee.
    // Strict proof schema is already authenticated with decision archive SHA.
    if(parsed.indicative_web_paper_only){
     const w=validateGptWebPriceEvidence(parsed.web_market_evidence,{
      chain:d.chain,token:d.token_address,pool:d.pool_address,now:instant});
     q={...w,tokenAddress:d.token_address,poolAddress:d.pool_address,
      chain:d.chain};
     if(d.action==='BUY')candidate={
      chain:d.chain,token_address:d.token_address,pool_address:d.pool_address,
      candidate_id:d.chain+':'+d.token_address+':'+d.pool_address,
      price_usd:w.priceUsd,liquidity_usd:w.liquidityUsd,
      first_local_observed_at_utc:w.asOf,
      observed_at_utc:w.asOf,source:'GPT_WEB_PRICE_INDICATIVE',
      verification:'TWO_INDEPENDENT_PUBLIC_WEB_PRICE_PAGES',
      promotion_biased:false,paper_only:true,web_paper_experiment:true};
    }
    if(d.action==='BUY'&&!parsed.indicative_web_paper_only){
     const local=loadMarket(marketFile,{now:instant});
     if(!local?.ok)receipt=safeResult(d,'BLOCKED','LOCAL_SOURCE_NOT_FRESH');
     else{
      const found=local.snapshot.candidates?.find(c=>matchedIdentity(c,d));
      if(!found)receipt=safeResult(d,'BLOCKED','GPT_CANDIDATE_NOT_IN_LOCAL_UNIVERSE');
      else candidate={...found,
       first_local_observed_at_utc:found.observed_at_utc};
     }
    }
    if(!receipt&&!parsed.indicative_web_paper_only){
     try{
      const rawQuote=await lookup(d.chain,d.token_address,fetch,d.pool_address);
      if(rawQuote)q={...rawQuote,chain:d.chain,tokenAddress:d.token_address,
       poolAddress:d.pool_address};
      if(d.action==='BUY')security=await securityCheck({
       chain:d.chain,token:d.token_address,pool:d.pool_address,now:now()});
     }catch{receipt=safeResult(d,'BLOCKED','INDEPENDENT_MARKET_OR_SECURITY_UNAVAILABLE')}
    }
    if(!receipt&&d.action==='BUY'&&
      security?.paper_unknown_goplus_risk_eligible===true&&
      d.security_assessment!=='UNKNOWN')
      receipt=safeResult(d,'BLOCKED','GPT_UNKNOWN_CONTRACT_RISK_NOT_ACKNOWLEDGED');
    if(!receipt&&d.action==='BUY'){
     const approval=r29LivePaperEntryGate({
      state:{...getState(),automaticPaperBuys:true},candidate,
      quote:q,security,now:now(),gptSignedPaper:true,
      gptWebEvidence:parsed.web_market_evidence});
     if(!approval.allowed)receipt=safeResult(d,'BLOCKED',approval.reason);
     else if(requestedStake>approval.amount_test_usdc)
      receipt=safeResult(d,'BLOCKED','GPT_SIZE_EXCEEDS_INDEPENDENT_RISK_CAP');
    }
    // External quote/security checks are asynchronous. An otherwise valid
    // GPT instruction can expire, or the owner can pause follow/entries,
    // while those checks run. Never sign a refreshed local 90s order from
    // an expired/withdrawn GPT instruction.
    if(!receipt&&fixedStake&&userCoinStake(getState())!==requestedStake)
     receipt=safeResult(d,'BLOCKED','USER_COIN_STAKE_CHANGED_DURING_SECURITY_CHECK');
    if(!receipt&&Date.parse(d.expires_at_utc)<=now())
     receipt=safeResult(d,'REJECTED','GPT_DECISION_EXPIRED_BEFORE_PAPER_SUBMISSION');
    if(!receipt&&(getState()?.gptPaperFollow!==true||
      (d.action==='BUY'&&getState()?.entriesEnabled!==true)))
     receipt=safeResult(d,'BLOCKED','GPT_FOLLOW_OR_PAPER_BOT_DISABLED');
    if(!receipt){
     const order=signGptPaperSignal(d,{deviceId,keyPair:kp,now:now(),
      ownerFixedBuyStake:fixedStake?requestedStake:null});
     const executed=await submit(order,{
      qaQuote:q,source:'GPT_GITHUB_LOCAL',
      localTrust:[trusted],securityEvidence:security,
      gptWebEvidence:parsed.web_market_evidence,
      paperAutopilotCandidate:candidate,
      gptDecisionId:d.decision_id,
      gptExitAuth:d.action==='BUY'&&parsed.signed_exit_policy?
       {decision_id:d.decision_id,policy:parsed.signed_exit_policy}:null
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
   reason:receipt.reason,at_utc:new Date(now()).toISOString(),
   // Local replay metadata for an honest UI, not a separate order or new
   // authority. Older entries without these fields remain readable.
   action:d.action,chain:d.chain,token_address:d.token_address,
   pool_address:d.pool_address}}});
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
 // Runs on the EXISTING local Paper server – no new bot or model process.
 // Exit triggers are authored inside the immutable GPT BUY decision and
 // persisted in the same local ledger, not derived from global stop settings.
 const runMonitor=async()=>{
  const instant=now();
  const positions=(getState()?.positions||[]).filter(p=>p.gptPaperDecision===true);
  const summary={checked_at_utc:new Date(instant).toISOString(),
   checked:0,due:0,filled:0,blocked:0,
   paper_only:true,real_trading_enabled:false};
  for(const prior of positions){
   const live=getState()?.positions?.find(x=>x.id===prior.id);
   if(!live)continue;
   summary.checked++;
   let q=null;
   if(validateGptExitBinding(live)&&
      live.safety!=='INDICATIVE_WEB_PRICE_SELLABILITY_UNKNOWN'){
    try{
     const found=await lookup(live.chain,live.tokenAddress,fetch,live.poolAddress);
     if(found)q={...found,chain:live.chain,
      tokenAddress:live.tokenAddress,poolAddress:live.poolAddress};
    }catch{}
   }
   const decision=assessGptPaperExit(live,q,{now:now()});
   // Keep high-water and quote errors across restarts, including Bot AUS.
   const before=getState(),current=before.positions.find(x=>x.id===live.id);
   if(!current)continue;
   const amended={...current,
    highWaterPrice:decision.highWaterPrice?
     Math.max(current.highWaterPrice||0,decision.highWaterPrice):
     current.highWaterPrice,
    gptExitReviewStatus:decision.reason,
    gptExitLastReviewAt:new Date(now()).toISOString()};
   commit({...before,positions:before.positions.map(x=>x.id===live.id?amended:x)});
   if(!decision.due)continue;
   summary.due++;
   const minute=Math.floor(now()/60000);
   const latest=getState().positions.find(x=>x.id===live.id);
   if(!latest||latest.gptExitLastAttemptMinute===minute)continue;
   // Persist the minute tombstone BEFORE submitting: no same-minute
   // duplicate during restart/crash or concurrent 30s price updates.
   const st=getState();
   commit({...st,positions:st.positions.map(x=>x.id===live.id?
    {...x,gptExitLastAttemptMinute:minute}:x)});
   const d={action:'SELL',chain:live.chain,
    token_address:live.tokenAddress,pool_address:live.poolAddress,
    decision_id:gptPolicyExitIntentId(live,decision.reason,now())};
   const signed=signGptPaperSignal(d,{deviceId,keyPair:kp,now:now()});
   let receipt=null;
   try{
    const result=await submit(signed,{
     qaQuote:q,source:'GPT_GITHUB_POLICY_EXIT',
     localTrust:[trusted],gptPolicyExit:{
      position_id:live.id,
      authorizing_decision_id:live.gptExitAuthorizedDecisionId,
      policy_digest:live.gptExitPolicyDigest,trigger:decision.reason
     }});
    receipt=result?.receipt||null;
   }catch{}
   if(receipt?.status==='PAPER_FILLED')summary.filled++;
   else summary.blocked++;
   // V6.7: durable LOCAL audit of the automatically triggered exit. A policy
   // SELL must not disappear from the trace just because it did not arrive
   // through the explicit GPT GitHub decision pointer. No account balances,
   // private keys or real-wallet data are written. Ledger receipt stays truth.
   let exitAuditWritten=false;
   try{
     mkdirSync(auditFolder,{recursive:true});
     const record={
       schema:'sniper_r29_gpt_policy_exit_audit.v1',
       at_utc:new Date(now()).toISOString(),
       event:'GPT_POLICY_EXIT_ATTEMPT',
       decision_id:d.decision_id,
       parent_gpt_buy_decision_id:live.gptExitAuthorizedDecisionId,
       position_id:live.id,
       chain:live.chain,token_address:live.tokenAddress,
       pool_address:live.poolAddress,
       trigger:decision.reason,
       receipt_status:receipt?.status||'BLOCKED',
       receipt_reason:receipt?.reason||'GPT_EXIT_SUBMISSION_UNAVAILABLE',
       quote_source:q?.source==='DEX Screener'?'DEX Screener':null,
       quote_price_usd:finite(q?.priceUsd)?q.priceUsd:null,
       quote_observed_at_utc:typeof q?.asOf==='string'&&
         Number.isFinite(Date.parse(q.asOf))?q.asOf:null,
       modeled_pnl_pct:finite(decision.pnl_pct_modelled)?decision.pnl_pct_modelled:null,
       price_evidence_class:'PUBLIC_INDICATIVE_QUOTE_PAPER_ONLY',
       executable_buy_sell_quote_verified:false,
       paper_only:true,real_trading_enabled:false,
       account_balance_or_wallet_logged:false
     };
     appendFileSync(path.join(auditFolder,new Date(instant).toISOString().slice(0,10)+'.jsonl'),
       JSON.stringify(record)+'\n',{mode:0o600});
     exitAuditWritten=true;
   }catch{summary.audit_write_errors=(summary.audit_write_errors||0)+1;}
   const after=getState();
   commit({...after,gptExitMonitorLast:{
    checked_at_utc:new Date(now()).toISOString(),position_id:live.id,
    trigger:decision.reason,status:receipt?.status||'BLOCKED',
    reason:receipt?.reason||'GPT_EXIT_SUBMISSION_UNAVAILABLE',
    audit_status:exitAuditWritten?'LOCAL_JOURNAL_WRITTEN':'LOCAL_JOURNAL_FAILED',
    paper_only:true,real_trading_enabled:false}});
  }
  return summary;
 };
 return {receive:payload=>{
   const job=serial.then(()=>one(payload));
   serial=job.catch(()=>{});
   return job;
 },monitor:()=>{
   const job=serial.then(()=>runMonitor());
   serial=job.catch(()=>{});
   return job;
 },localTrust:[trusted]};
}
