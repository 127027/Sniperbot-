// R29 autonomous LOCAL paper-only trade supervisor: no OpenAI API, GitHub
// publisher token, fiat provider, wallet or real-order execution.
import {generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {appendFileSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {AGENT_SIGNAL_SCHEMA,unsignedAgentSignal} from './paper-agent-pipeline.mjs';
import {lookupToken,validTokenAddress} from './market.mjs';
import {collectEvmSecurity} from './live-paper-security.mjs';
import {r29LivePaperEntryGate,newPaperRiskLedger} from './live-paper-risk.mjs';

const SNAPSHOT_MAX_AGE_MS=300000;
const INTERVAL_MS=120000;
const MAX_JSON_BYTES=600000;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const elapsed=(s,now)=>Number.isFinite(Date.parse(s))&&Date.parse(s)<=now?
 now-Date.parse(s):Infinity;

export function readLocalPaperMarketSnapshot(filename,{now=Date.now()}={}){
 let raw;
 try{raw=readFileSync(filename,'utf8')}
 catch(e){return {ok:false,reason:e?.code==='ENOENT'?'NO_LOCAL_COLLECTOR_SNAPSHOT':'COLLECTOR_READ_FAILED',snapshot:null}}
 if(Buffer.byteLength(raw)>MAX_JSON_BYTES)
  return {ok:false,reason:'COLLECTOR_SNAPSHOT_TOO_LARGE',snapshot:null};
 let s;
 try{s=JSON.parse(raw)}catch{return {ok:false,reason:'COLLECTOR_JSON_INVALID',snapshot:null}}
 if(s?.schema!=='research_market_snapshot.v1'||s.paper_only!==true||
  s.actionable!==false||!Array.isArray(s.candidates)||s.candidates.length>96||
  s.collection_status!=='OBSERVED_OR_PARTIAL'||
  elapsed(s.published_at_utc,now)>SNAPSHOT_MAX_AGE_MS)
  return {ok:false,reason:'COLLECTOR_STALE_OR_INCOMPLETE',snapshot:null};
 return {ok:true,reason:'FRESH_LOCAL_PUBLIC_SNAPSHOT',snapshot:s};
}
export function choosePaperOpportunities(s,{limit=2,now=Date.now()}={}){
 if(s?.schema!=='research_market_snapshot.v1'||s.paper_only!==true||
  s.actionable!==false||!Array.isArray(s.candidates)||s.candidates.length>96||
  !Number.isInteger(limit)||limit<0||limit>3||
  elapsed(s.published_at_utc,now)>SNAPSHOT_MAX_AGE_MS)
  return [];
 const arr=s.candidates.filter(c=>
   ['base','eth','bsc'].includes(c?.chain)&&
   validTokenAddress(c.chain,c.token_address)&&
   validTokenAddress(c.chain,c.pool_address)&&
   c.candidate_id===c.chain+':'+c.token_address+':'+c.pool_address&&
   c.verification==='CROSS_PROVIDER_IDENTITY'&&
   c.promotion_biased!==true&&
   elapsed(c.observed_at_utc,now)<=SNAPSHOT_MAX_AGE_MS&&
   finite(c.liquidity_usd)&&c.liquidity_usd>=50000&&
   finite(c.volume_m5_usd)&&c.volume_m5_usd>=2000&&
   finite(c.buys_m5)&&finite(c.sells_m5)&&
   c.buys_m5>=20&&c.buys_m5>c.sells_m5*1.5&&
   c.volume_m5_usd<=c.liquidity_usd*2);
 return [...new Map(arr.map(c=>[c.candidate_id,c])).values()]
   .sort((a,b)=>b.volume_m5_usd-a.volume_m5_usd||
     a.candidate_id.localeCompare(b.candidate_id))
   .slice(0,limit)
   .map(c=>({...c,first_local_observed_at_utc:c.observed_at_utc}));
}

export function signLocalPaperAutopilot({action,chain,token,pool,amount=null,
 deviceId,keyPair,now=Date.now()}={}){
 if(!['BUY','SELL'].includes(action)||!validTokenAddress(chain,token)||
   !validTokenAddress(chain,pool)||!/^device_[a-f0-9]{32}$/.test(deviceId||'')||
   !Number.isFinite(now)||(action==='BUY'&&
   (!finite(amount)||amount<50||Math.abs(amount*100-Math.round(amount*100))>1e-6)))
   throw Error('AUTOPILOT_INVALID_ORDER');
 const o={schema:AGENT_SIGNAL_SCHEMA,target_device_id:deviceId,
  signal_id:'sig_'+randomBytes(16).toString('hex'),
  issuer:'sniper-paper-autopilot',key_id:'ephemeral-session',
  chain,action,token_address:token,pool_address:pool,
  size_test_usdc:action==='BUY'?amount.toFixed(2):null,
  created_at_utc:new Date(now).toISOString(),
  expires_at_utc:new Date(now+90000).toISOString()};
 return {...o,signature:sign(null,Buffer.from(unsignedAgentSignal(o),'utf8'),
   keyPair.privateKey).toString('base64')};
}
export function shouldSellPaperAutopilot(position,quote){
 if(!position?.paperAutopilot||!quote||
  quote.source!=='DEX Screener'||quote.chain!==position.chain||
  quote.tokenAddress?.toLowerCase()!==position.tokenAddress?.toLowerCase()||
  quote.poolAddress?.toLowerCase()!==position.poolAddress?.toLowerCase()||
  !finite(quote.priceUsd)||quote.priceUsd<=0)
  return {sell:false,reason:'QUOTE_UNVERIFIED'};
 if(finite(position.entryLiquidityUsd)&&finite(quote.liquidityUsd)&&
  quote.liquidityUsd<position.entryLiquidityUsd*.5)
  return {sell:true,reason:'LIQUIDITY_DROP_50_PERCENT'};
 if(finite(quote.buys5m)&&finite(quote.sells5m)&&
  quote.sells5m>quote.buys5m*4&&quote.sells5m>30)
  return {sell:true,reason:'MARKET_FLOW_REVERSAL'};
 if(quote.priceUsd<position.entryPriceUsd*.9)
  return {sell:true,reason:'MODEL_STOP_10_PERCENT'};
 if(quote.priceUsd>position.entryPriceUsd*1.2)
  return {sell:true,reason:'MODEL_TAKE_PROFIT_20_PERCENT'};
 return {sell:false,reason:'HOLD'};
}

export function startLocalPaperAutopilot({deviceId,dataDir,getState,submit,
 now=()=>Date.now(),intervalMs=INTERVAL_MS,initialDelayMs=20000,
 marketFile=path.join(path.dirname(dataDir),'.local','research-market','latest.json'),
 readMarket=readLocalPaperMarketSnapshot,
 lookup=lookupToken,securityCheck=collectEvmSecurity}={}){
 if(!/^device_[a-f0-9]{32}$/.test(deviceId||'')||
  typeof getState!=='function'||typeof submit!=='function'||
  typeof dataDir!=='string'||!path.isAbsolute(dataDir)||
  typeof now!=='function'||intervalMs<60000||intervalMs>3600000)
  throw Error('AUTOPILOT_BAD_LOCAL_RUNTIME_CONFIG');
 const keyPair=generateKeyPairSync('ed25519');
 const trusted={issuer:'sniper-paper-autopilot',key_id:'ephemeral-session',
  scope:'agent_execution',revoked:false,
  public_key_pem:keyPair.publicKey.export({format:'pem',type:'spki'})};
 const file=path.join(dataDir,'live-paper-autopilot','latest.json');
 let busy=false,stopped=false,timer=null;
 let status={schema:'sniper_r29_local_live_paper_autopilot.v1',
  mode:'PAPER_ONLY',live_trading_enabled:false,
  local_signer_only:true,expensive_ai_api_required:false,
  actual_wallet_access:false,
  enabled:true,last_scan_at_utc:null,last_outcome:'NOT_STARTED',
  last_research_source:null,last_decision:null,entries_submitted:0,
  paper_fills_confirmed:0,sells_submitted:0,last_receipt:null,
  last_error:null};
 const persist=()=>{
  mkdirSync(path.dirname(file),{recursive:true});
  const tmp=file+'.pending-'+process.pid;
  writeFileSync(tmp,JSON.stringify(status,null,2)+'\n',{mode:0o600});
  renameSync(tmp,file);
 };
 async function runOnce(){
  if(busy||stopped)return {status:'SKIPPED_BUSY_OR_STOPPED'};
  busy=true;
  status.last_scan_at_utc=new Date(now()).toISOString();
  status.last_decision=null;status.last_error=null;
  try{
   const state=getState();
   const time=now();
   // Review exits first: losing positions must not wait for the BUY scanner.
   for(const p of state.positions.filter(x=>x.paperAutopilot).slice(0,4)){
    let q;
    try{q=await lookup(p.chain,p.tokenAddress,fetch,p.poolAddress)}
    catch{continue}
    if(!q)continue;
    const quote={...q,chain:p.chain,tokenAddress:p.tokenAddress,poolAddress:p.poolAddress};
    const verdict=shouldSellPaperAutopilot(p,quote);
    if(!verdict.sell)continue;
    const signed=signLocalPaperAutopilot({action:'SELL',chain:p.chain,
      token:p.tokenAddress,pool:p.poolAddress,deviceId,keyPair,now:now()});
    const receipt=await submit(signed,{source:'LOCAL_PAPER_AUTOPILOT',
      localTrust:[trusted],qaQuote:quote});
    status.sells_submitted++;
    status.last_receipt=receipt?.receipt||{status:'REJECTED',reason:receipt?.error||'NO_PAPER_RECEIPT'};
    if(status.last_receipt.status==='PAPER_FILLED')status.paper_fills_confirmed++;
    status.last_decision={action:'SELL',candidate_id:p.chain+':'+p.tokenAddress+':'+p.poolAddress,
      reason:verdict.reason};
    status.last_outcome=status.last_receipt.status;
    return {status:status.last_outcome,receipt:status.last_receipt};
   }
   // Exits remain operative after entries are paused.
   if(!state?.entriesEnabled||!state?.automaticPaperBuys){
    status.last_outcome='WAITING_FOR_PAPER_AUTOBUY_OPT_IN';
    return {status:status.last_outcome};
   }
   const feed=readMarket(marketFile,{now:time});
   status.last_research_source=feed.reason;
   if(!feed.ok){
    status.last_outcome='DATA_GAP_'+feed.reason;
    return {status:status.last_outcome};
   }
   const candidates=choosePaperOpportunities(feed.snapshot,{limit:2,now:time});
   if(candidates.length===0){
    status.last_outcome='NO_SUITABLE_CROSS_VERIFIED_EVM_CANDIDATES';
    return {status:status.last_outcome};
   }
   const decisions=[];
   for(const candidate of candidates){
    if(getState().positions.some(p=>p.chain===candidate.chain&&
      p.tokenAddress?.toLowerCase()===candidate.token_address.toLowerCase()))continue;
    let q=null,security=null;
    try{
      [q,security]=await Promise.all([
       lookup(candidate.chain,candidate.token_address,fetch,candidate.pool_address),
       securityCheck({chain:candidate.chain,token:candidate.token_address,
        pool:candidate.pool_address,now:now()})
      ]);
    }catch(e){decisions.push({candidate_id:candidate.candidate_id,
      reason:'MARKET_OR_SECURITY_PROVIDER_UNAVAILABLE'});continue;}
    const quote=q?{...q,chain:candidate.chain,
      tokenAddress:candidate.token_address,poolAddress:candidate.pool_address}:null;
    const gate=r29LivePaperEntryGate({state:getState(),candidate,quote,security,now:now()});
    decisions.push({candidate_id:candidate.candidate_id,reason:gate.reason,
      amount_test_usdc:gate.amount_test_usdc});
    if(!gate.allowed)continue;
    const signed=signLocalPaperAutopilot({action:'BUY',chain:candidate.chain,
     token:candidate.token_address,pool:candidate.pool_address,amount:gate.amount_test_usdc,
     deviceId,keyPair,now:now()});
    const receipt=await submit(signed,{source:'LOCAL_PAPER_AUTOPILOT',
     localTrust:[trusted],qaQuote:quote,securityEvidence:security,
     paperAutopilotCandidate:candidate});
    status.entries_submitted++;
    status.last_receipt=receipt?.receipt||{status:'REJECTED',reason:receipt?.error||'NO_PAPER_RECEIPT'};
    if(status.last_receipt.status==='PAPER_FILLED')status.paper_fills_confirmed++;
    status.last_decision={action:'BUY',candidate_id:candidate.candidate_id,
      risk_limit:gate.amount_test_usdc,
      reason:status.last_receipt.reason||status.last_receipt.status};
    status.last_outcome=status.last_receipt.status;
    return {status:status.last_outcome,receipt:status.last_receipt};
   }
   status.last_outcome='NO_VERIFIED_SAFE_ENTRY';
   status.last_decision={action:'WATCH',reasons:decisions};
   return {status:status.last_outcome,reasons:decisions};
  }catch(e){
   status.last_outcome='ERROR_FAIL_CLOSED';status.last_error=String(e?.message||e).slice(0,110);
   return {status:status.last_outcome,error:status.last_error};
  }finally{
   // Private, append-only decision journal for forward performance studies.
   // This is NOT a second ledger: no cash, positions, wallet or credentials.
   try{
    const at=status.last_scan_at_utc;
    const day=at.slice(0,10);
    const dir=path.join(dataDir,'live-paper-autopilot','decision-journal');
    mkdirSync(dir,{recursive:true});
    const receipt=['BUY','SELL'].includes(status.last_decision?.action)?status.last_receipt:null;
    const record={schema:'r29_live_paper_diagnostic_event.v1',
     at_utc:at,mode:'PAPER_ONLY',live_trading_enabled:false,
     research_source_status:status.last_research_source,
     decision:status.last_decision,outcome:status.last_outcome,
     receipt:receipt?{
       signal_id:receipt.signal_id||null,action:receipt.action||null,
       status:receipt.status||null,reason:receipt.reason||null,
       chain:receipt.chain||null,token_address:receipt.token_address||null,
       quote_price_usd:receipt.quote_price_usd??null,
       requested_test_usdc:receipt.requested_test_usdc??null,
       closed_pnl_test_usdc:receipt.closed_pnl_test_usdc??null,
       real_trade_executed:false
     }:null};
    appendFileSync(path.join(dir,day+'.jsonl'),JSON.stringify(record)+'\n',
     {encoding:'utf8',mode:0o600});
   }catch(e){status.last_error='LOCAL_DIAGNOSTIC_JOURNAL_UNAVAILABLE';
     status.last_outcome='AUDIT_LOG_FAILED_NO_FURTHER_CLAIMS';}
   busy=false;persist();
  }
 }
 const tick=async()=>{
  if(stopped)return;
  await runOnce();
  if(!stopped){timer=setTimeout(tick,intervalMs);timer.unref?.();}
 };
 persist();
 timer=setTimeout(tick,initialDelayMs);timer.unref?.();
 return {status:()=>structuredClone(status),runOnce,stop:()=>{
  stopped=true;if(timer)clearTimeout(timer);status.enabled=false;persist();}
 };
}
