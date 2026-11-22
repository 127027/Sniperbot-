// R29 V1.9 D5-02: neutral, append-only research event ledger.
// Preserves rejected API rows as FIRST-CLASS events. No winning label oracle,
// provider requests, GPT decisions, trading orders or claimed client receipts.
import {createHash} from 'node:crypto';
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';

const when=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const SHA=/^[a-f0-9]{40}$/;
const clean=(c,s)=>c==='solana'?String(s):String(s).toLowerCase();
const id=(parts)=>'evt-'+createHash('sha256').update(JSON.stringify(parts))
 .digest('hex').slice(0,24);
const event=(kind,stage,atUtc,extra)=>({kind,stage,at_utc:atUtc,...extra});
const hasWinnerInput=x=>x&&typeof x==='object'&&(
 Object.hasOwn(x,'reported_gain_pct')||
 Object.hasOwn(x,'future_winner_label')||
 x.source_class==='POST_EVENT_ORACLE');
const forbidden=x=>hasWinnerInput(x)||x?.source_class==='POSTHOC_ORACLE';

export function buildDot5DiscoveryLedger({
 capture,handoff,dot3RiskPreview=null,asOfUtc,
 sourceEvidencePath=null,sourceEvidenceBlobSha=null
}={}){
 const at=when(asOfUtc),captured=when(capture?.captured_completed_at_utc),
  handed=when(handoff?.as_of_utc);
 if(at===null||captured===null||captured>at
  ||handed===null||handed>at||handed<captured
  ||capture?.kind!=='DOT2_PUBLIC_CAPTURE_EVIDENCE'
  ||capture?.mode!=='PAPER_RESEARCH_ONLY'
  ||handoff?.kind!=='DOT2_TO_DOT3_EVIDENCE_HANDOFF'
  ||!Array.isArray(handoff.candidates)
  ||!Array.isArray(capture.gecko?.candidates)
  ||!Array.isArray(capture.gecko?.rejected)
  ||(dot3RiskPreview!==null&&(
    dot3RiskPreview.kind!=='R29_V19_DOT3_RISK_STATUS_PREVIEW'
    ||when(dot3RiskPreview.as_of_utc)>at
    ||!Array.isArray(dot3RiskPreview.candidates)))
  ||(sourceEvidenceBlobSha!==null&&!SHA.test(sourceEvidenceBlobSha)))
  throw Error('INVALID_DOT5_SOURCE_TIMELINE');
 if([...handoff.candidates,...capture.gecko.candidates,
   ...capture.gecko.rejected].some(forbidden))
  throw Error('DOT5_POST_EVENT_ORACLE_IN_RESEARCH_INPUT');
 const sourcePath=sourceEvidencePath||null;
 const chain=canonicalChain(capture.source_chain??capture.gecko.network);
 const accepted=new Map();
 for(const [i,c] of handoff.candidates.entries()){
  const ch=canonicalChain(c?.chain),pool=c?.pool;
  if(!ch||!poolValid(ch,pool,c.pool_kind)||when(c.captured_at_utc)>at)
   throw Error('DOT5_HANDOFF_IDENTITY_OR_FUTURE_SOURCE');
  const key=ch+':'+clean(ch,pool);
  if(accepted.has(key))throw Error('DOT5_DUPLICATE_HANDOFF_POOL');
  accepted.set(key,{value:c,index:i});
 }
 const previews=new Map();
 for(const r of dot3RiskPreview?.candidates??[]){
  if(r.pool_key&&previews.has(r.pool_key))
   throw Error('DOT5_DUPLICATE_RISK_PREVIEW');
  if(r.pool_key)previews.set(r.pool_key,r);
 }
 const poolRows=new Map();
 for(const r of capture.gecko.candidates){
  const ch=canonicalChain(r.chain),key=ch+':'+clean(ch,r.pool);
  if(!poolRows.has(key))poolRows.set(key,r);
 }
 const entries=[];
 for(const [key,{value:c}] of accepted){
  const origin=poolRows.get(key)||null;
  const first=when(c.captured_at_utc)!==null?c.captured_at_utc:null;
  const risk=previews.get(key)||null;
  const item={
   event_id:id(['POOL',key,c.pool_kind??null]),
   pool_key:key,source_record_kind:'HANDOFF_ACCEPTED',
   source_chain:c.chain,source_page:Number.isInteger(origin?.source_page)?
     origin.source_page:null,
   source_row:Number.isInteger(origin?.source_row)?origin.source_row:null,
   source_pool_id:origin?.source_pool_id??null,
   pool:c.pool,pool_kind:c.pool_kind??null,
   contract:tokenValid(c.chain,c.contract)?c.contract:null,
   symbol:c.symbol??null,
   first_seen_in_this_capture_at_utc:first,
   pool_created_at_reported_utc:origin?.pool_created_at_utc??null,
   source_available_at_utc:capture.captured_completed_at_utc,
   current_stage:risk?'DOT3_RISK_PREVIEW':'DOT2_DISCOVERED',
   risk_status:risk?.status??null,
   risk_reason:risk?.reason??null,
   missing_evidence_fields:risk?.missing_fields??[],
   forecast:null,order:null,client_receipt:null,outcome:null,
   lifecycle:[
    event('DOT5_RESEARCH_EVENT','DOT2_DISCOVERED',first??asOfUtc,{
      source_class:c.source_class??null,source_evidence_path:sourcePath,
      reported_gain_pct:null,actual_gpt_review:false}),
    ...(risk?[event('DOT5_RESEARCH_EVENT','DOT3_RISK_PREVIEW',
      dot3RiskPreview.as_of_utc,{
       status:risk.status,reason:risk.reason,
       actual_dot3_issuer_authenticated:false,
       trade_authorized:false})]:[])
   ],
   raw_capture_verified_independently:false,
   authenticated_issuer_or_client_receipt_count:0
  };
  entries.push(item);
 }
 for(const r of capture.gecko.rejected){
  if(!Number.isInteger(r?.row)||r.row<0
   ||typeof r.reason!=='string'||r.reason.length===0)
   throw Error('DOT5_INVALID_REJECTED_SOURCE_ROW');
  const srcId=r.source_pool_id??null;
  const sourceKey=['REJECTED',chain,capture.gecko.page,r.row,srcId];
  entries.push({
   event_id:id(sourceKey),pool_key:null,source_record_kind:'UPSTREAM_PARSER_REJECTED',
   source_chain:chain,source_page:Number.isInteger(capture.gecko.page)?capture.gecko.page:null,
   source_row:r.row,source_pool_id:srcId,
   pool:null,pool_kind:null,contract:null,symbol:null,
   first_seen_in_this_capture_at_utc:capture.gecko.captured_at_utc??null,
   pool_created_at_reported_utc:null,
   source_available_at_utc:capture.captured_completed_at_utc,
   current_stage:'DISCOVERY_REJECTED',
   risk_status:null,risk_reason:null,missing_evidence_fields:[],
   discovery_rejection_reason:r.reason,
   reported_dex_id:r.dex_id??null,
   forecast:null,order:null,client_receipt:null,outcome:null,
   lifecycle:[event('DOT5_RESEARCH_EVENT','DISCOVERY_REJECTED',
     capture.gecko.captured_at_utc??asOfUtc,{
      reason:r.reason,reported_dex_id:r.dex_id??null,
      source_evidence_path:sourcePath,actual_gpt_review:false})],
   raw_capture_verified_independently:false,
   authenticated_issuer_or_client_receipt_count:0
  });
 }
 entries.sort((a,b)=>a.event_id.localeCompare(b.event_id));
 const summary={
  handoff_accepted_pools:accepted.size,
  upstream_parser_rejections:capture.gecko.rejected.length,
  recorded_lifecycle_entities:entries.length,
  rejected_uniswap_v4_reported:entries.filter(x=>
    x.current_stage==='DISCOVERY_REJECTED'&&
    /^uniswap-v4/i.test(x.reported_dex_id??'')).length,
  dot3_watch:entries.filter(x=>x.risk_status==='WATCH').length,
  dot3_data_gap:entries.filter(x=>x.risk_status==='DATA_GAP').length,
  verified_gpt_runs:0,verified_orders:0,verified_client_receipts:0,
  marked_winners:0,known_evaluation_denominator:false
 };
 return {schema:1,kind:'R29_V19_DOT5_DISCOVERY_EVENT_LEDGER',
  as_of_utc:asOfUtc,source_capture_utc:capture.captured_completed_at_utc,
  source_evidence_path:sourcePath,source_evidence_blob_sha_hint:sourceEvidenceBlobSha,
  source_blob_verified_independently:false,
  includes_only_this_capture_not_global_universe:true,
  original_api_row_count:capture.gecko.requested_pool_count??null,
  summary,events:entries,
  no_trading_or_gpt_executed:true,
  statement:'These are as-of research events; missing forecasts, orders, outcomes and client receipts stay null, never zero or hypothetical proof.'};
}

export function annotateDot5ResearchEvent({ledger,eventId,stage,
 observedAtUtc,sourcePath=null,claim=null}={}){
 if(ledger?.kind!=='R29_V19_DOT5_DISCOVERY_EVENT_LEDGER'
  ||typeof eventId!=='string'
  ||!['DOT4_FORECAST_CLAIM','ORDER_CLAIM','RECEIPT_CLAIM','OUTCOME_CLAIM']
    .includes(stage)||when(observedAtUtc)===null
  ||when(observedAtUtc)>when(ledger.as_of_utc)
  ||typeof sourcePath!=='string'||!sourcePath.startsWith('research/'))
  throw Error('INVALID_DOT5_UNVERIFIED_EVENT_CLAIM');
 const index=ledger.events.findIndex(x=>x.event_id===eventId);
 if(index<0)throw Error('DOT5_EVENT_ID_NOT_FOUND');
 if(ledger.events[index].current_stage==='DISCOVERY_REJECTED')
  throw Error('DOT5_REJECTED_ROW_CANNOT_CLAIM_EXECUTION');
 if(hasWinnerInput(claim)||forbidden(claim))
  throw Error('DOT5_POST_EVENT_ORACLE_IN_RESEARCH_INPUT');
 const next=structuredClone(ledger);
 next.events[index].lifecycle.push(event('DOT5_UNVERIFIED_CLAIM',stage,observedAtUtc,{
  source_path:sourcePath,claim_recorded_not_authenticated:true,
  actual_gpt_review:false,actual_order_verified:false,actual_fill_verified:false}));
 return next;
}
