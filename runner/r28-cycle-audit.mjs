// R28: immutable, local-only summary of real central-AI research cycles.
// A research receipt is not an executed onchain trade, and is never published
// to GitHub or sent to this chat. Designed for forward-only frequency studies.
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const sha=s=>createHash('sha256').update(s).digest('hex');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const truncate=(s,max)=>typeof s==='string'?s.slice(0,max):null;
const qty=n=>finite(n)?n:null;
export function r28CycleRecord({runId,startedAt,status,modelResponseId=null,
 model=null,input=null,recommendations=[],receipts=[],summary=null,error=null,
 walletReported=false,finishedAt=new Date().toISOString()}={}){
 if(typeof runId!=='string'||!/^[a-f0-9]{16,32}$/.test(runId)||
  !Number.isFinite(Date.parse(startedAt))||!Number.isFinite(Date.parse(finishedAt))||
  Date.parse(finishedAt)<Date.parse(startedAt)||typeof status!=='string')
  throw Error('R28_INVALID_CYCLE');
 // Explicitly whitelist public/scalar fields. No wallet address, token,
 // headers, private key, raw model text or full portfolio is included.
 const market=input?.market_regime||{};
 const publicCandidates=(input?.candidates||[]).slice(0,25).map(c=>({
  candidate_id:truncate(c.candidate_id,135),
  observed_at_utc:truncate(c.observed_at_utc,40),
  source_score:qty(c.heuristic_market_score),
  liquidity_usd:qty(c.observed_liquidity_usd),
  volume_5m_usd:qty(c.observed_volume_5m_usd)}));
 const allowedActions=new Set(['BUY','SELL','HOLD','WATCH']);
 const reviews=(recommendations||[]).slice(0,12).map(r=>({
  candidate_id:truncate(r.candidate_id,135),
  action:allowedActions.has(r.action)?r.action:'INVALID',
  score_0_100:qty(r.score_0_100),
  portfolio_pct:qty(r.portfolio_pct),
  reason:truncate(r.reason,300),
  source_urls:(r.sources||[]).filter(x=>typeof x==='string'&&
   x.startsWith('https://')).slice(0,4).map(x=>x.slice(0,350))}));
 const orderReceipts=(receipts||[]).slice(0,12).map(o=>({
  status:truncate(o.status,45),reason:truncate(o.reason,120),
  action:truncate(o.action,8),
  execution_evidence:truncate(o.execution_evidence,70),
  real_trade_executed:o.real_trade_executed===true,
  indicative_only:o.indicative_only===true,
  sellability_verified:o.sellability_verified===true}));
 const body={schema:'sniper_r28_local_central_ai_cycle.v1',
  run_id:runId,started_at_utc:startedAt,finished_at_utc:finishedAt,
  mode:'PAPER_ONLY',live_trading_enabled:false,
  this_chat_connected:false,
  research_status:truncate(status,50),
  model:truncate(model,70),model_response_id:truncate(modelResponseId,100),
  analysis_summary:truncate(summary,1000),error:truncate(error,160),
  market_regime:{status:truncate(market.status,45),
   buys_allowed:market.buys_allowed===true,reason:truncate(market.reason,90)},
  publicly_observed_candidate_count:input?.candidates?.length||0,
  news_lead_count:input?.news?.leads?.length||0,
  early_alerts_count:input?.early_discovery?.alerts?.length||0,
  model_input_sha256:input?sha(JSON.stringify(input)):null,
  candidates:publicCandidates,
  recommendations:reviews,
  paper_receipts:orderReceipts,
  paper_receipt_count:orderReceipts.length,
  real_wallet_balances_excluded:true,
  wallet_data_sent_to_chat:false,
  paper_account_details_excluded:true,
  audit_method:'LOCAL_WRITE_ONCE_SHA256_NOT_EXTERNALLY_TIMESTAMP_ATTESTED',
  warning:'Indicative paper execution is not an independently verified tradable DEX fill.'};
 return {...body,record_sha256:sha(JSON.stringify(body))};
}
export function appendR28CycleAudit({dataDir,record}={}){
 if(typeof dataDir!=='string'||!path.isAbsolute(dataDir)||
  record?.schema!=='sniper_r28_local_central_ai_cycle.v1'||
  typeof record?.record_sha256!=='string')throw Error('R28_BAD_AUDIT_INPUT');
 const {record_sha256,...body}=record;
 if(sha(JSON.stringify(body))!==record_sha256)throw Error('R28_AUDIT_TAMPERED');
 const stamp=new Date(record.started_at_utc);
 const directory=path.join(dataDir,'central-ai','cycle-audit',stamp.toISOString().slice(0,10));
 const filename=path.join(directory,stamp.toISOString().replace(/[-:.]/g,'')+
  '-'+record.run_id+'.json');
 mkdirSync(directory,{recursive:true});
 const raw=JSON.stringify(record,null,2)+'\n';
 if(Buffer.byteLength(raw)>85000)throw Error('R28_AUDIT_TOO_LARGE');
 try{writeFileSync(filename,raw,{flag:'wx',mode:0o600})}
 catch(e){
  if(e?.code!=='EEXIST')throw e;
  if(readFileSync(filename,'utf8')!==raw)throw Error('R28_AUDIT_CONFLICT');
  return {written:false,filename,record_sha256};
 }
 return {written:true,filename,record_sha256};
}
