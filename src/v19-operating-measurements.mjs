// R29 V1.9 SYS-14 / D1-06 / D5-07: source-derived operating telemetry.
// HTTP checks and suggested GPT cadence must NEVER be counted as GPT work.
// Only a bounded, archived research capture is measured; unseen costs = null.
const t=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const pct=(n,d)=>d?Math.round(n/d*10000)/100:null;
const q=(xs,f)=>xs.length?Math.round([...xs].sort((a,b)=>a-b)
 [Math.max(0,Math.ceil(xs.length*f)-1)]*100)/100:null;
const chains=['solana','base','ethereum','bsc','robinhood','cronos'];
function chainFor(url){
 if(typeof url!=='string')return null;
 const m=url.match(/\/networks\/(solana|base|eth|bsc|robinhood|cro)\//)
   ||url.match(/\/dex\/pairs\/(solana|base|ethereum|bsc|robinhood|cronos)\//);
 if(!m)return null;
 return m[1]==='eth'?'ethereum':m[1]==='cro'?'cronos':m[1];
}
export function summarizeR29OperatingMeasurements({capture,asOfUtc,
 cadenceAdvice=null,riskPreview=null,dot5Ledger=null,ranking=null}={}){
 const end=t(asOfUtc),at=t(capture?.captured_completed_at_utc);
 if(!end||!at||at>end||capture?.kind!=='DOT2_PUBLIC_CAPTURE_EVIDENCE'
    ||capture?.mode!=='PAPER_RESEARCH_ONLY'
    ||!Array.isArray(capture.api_evidence)
    ||(cadenceAdvice!==null&&cadenceAdvice.kind!=='R29_V19_DOT1_CADENCE_RECOMMENDATION')
    ||(riskPreview!==null&&riskPreview.kind!=='R29_V19_DOT3_RISK_STATUS_PREVIEW')
    ||(dot5Ledger!==null&&dot5Ledger.kind!=='R29_V19_DOT5_DISCOVERY_EVENT_LEDGER')
    ||(ranking!==null&&ranking.kind!=='R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING'))
  throw Error('INVALID_R29_OPERATING_MEASUREMENTS');
 const records=[],invalid=[];
 for(const [i,r] of capture.api_evidence.entries()){
  const begin=t(r?.started_at_utc),finish=t(r?.received_at_utc);
  if(begin===null||finish===null||begin>finish||finish>at){
   invalid.push({index:i,reason:'MISSING_OR_FUTURE_PROVIDER_TIME'});continue;
  }
  const http=Number.isInteger(r.http_status)?r.http_status:null;
  records.push({provider:r.provider||'UNKNOWN',chain:chainFor(r.url),
   minute:new Date(begin).toISOString().slice(0,16)+'Z',
   started_ms:begin,latency_ms:finish-begin,
   status:http,success:http!==null&&http>=200&&http<300,
   is_429:http===429});
 }
 const byProvider={},byChain={},byMinute={},byChainHour={};
 const push=(group,key,r)=>{const s=group[key]??={attempts:0,http_200:0,http_429:0,
   other_http_errors:0,not_confirmed_http:0,latencies_ms:[]};
  s.attempts++;if(r.status===200)s.http_200++;
  else if(r.status===429)s.http_429++;
  else if(r.status!==null&&r.status>=400)s.other_http_errors++;
  else if(r.status===null)s.not_confirmed_http++;
  s.latencies_ms.push(r.latency_ms);
 };
 for(const r of records){
  push(byProvider,r.provider,r);
  push(byChain,r.chain||'UNKNOWN',r);
  push(byMinute,r.provider+'|'+r.minute,r);
  push(byChainHour,(r.chain||'UNKNOWN')+'|'+r.minute.slice(0,13)+':00Z',r);
 }
 const finish=group=>Object.fromEntries(Object.entries(group).map(([key,x])=>
  [key,{attempts:x.attempts,http_200:x.http_200,http_429:x.http_429,
   other_http_errors:x.other_http_errors,not_confirmed_http:x.not_confirmed_http,
   http_200_pct:pct(x.http_200,x.attempts),
   latency_p50_ms:q(x.latencies_ms,.5),latency_p95_ms:q(x.latencies_ms,.95)}]));
 const risk=riskPreview?.counts??null;
 const httpByProvider=finish(byProvider),httpByChain=finish(byChain);
 const measuredActivity=capture.metrics?.v19_dot1_measured_activity??null;
 const svc=capture.metrics?.v19_hot_fair_service??null;
 const rq=capture.metrics?.v19_evidence_repair_rechecks??null;
 const plan=capture.metrics?.v19_hot_fair_recheck_plan??null;
 const integrity=capture.source_integrity??null;
 const perDot=[
  {role:'dot-1-tempo',input_pool_activity_count:measuredActivity?.observed_newly_created_pools??null,
   recommended_full_reviews_per_day:cadenceAdvice?.target??null,
   verified_gpt_reviews_this_capture:0,scheduler_executed_full_reviews:null,
   skipped_gpt_reviews:null,capture_runner_http_requests_for_this_stage:0,
   queue_count:null,p50_wait_minutes:null,p95_wait_minutes:null},
  {role:'dot-2-discovery',input_pool_activity_count:capture.gecko?.found_count??null,
   recommended_full_reviews_per_day:null,verified_gpt_reviews_this_capture:0,
   scheduler_executed_full_reviews:null,skipped_gpt_reviews:null,
   capture_runner_http_requests_for_this_stage:records.length,
   queue_count:plan?.deferred_new_pool_count??null,
   pending_repair_queue_count:rq?.eligible_repair_pool_count??null,
   p50_wait_minutes:svc?.hot_p50_wait_minutes??null,
   p95_wait_minutes:svc?.hot_p95_wait_minutes??null},
  {role:'dot-3-risk',input_pool_activity_count:risk?Object.values(risk)
    .filter(Number.isInteger).reduce((a,b)=>a+b,0):null,
   recommended_full_reviews_per_day:null,verified_gpt_reviews_this_capture:0,
   scheduler_executed_full_reviews:null,skipped_gpt_reviews:null,
   capture_runner_http_requests_for_this_stage:0,queue_count:null,
   p50_wait_minutes:null,p95_wait_minutes:null,preview_only:true},
  {role:'dot-4-strategy',input_pool_activity_count:ranking?.counts?.research_rankable??null,
   recommended_full_reviews_per_day:null,verified_gpt_reviews_this_capture:0,
   scheduler_executed_full_reviews:null,skipped_gpt_reviews:null,
   capture_runner_http_requests_for_this_stage:0,queue_count:null,
   p50_wait_minutes:null,p95_wait_minutes:null,
   actual_client_paper_orders:0,actual_client_paper_fills:0},
  {role:'dot-5-control',input_pool_activity_count:dot5Ledger?.events?.length??null,
   recommended_full_reviews_per_day:null,verified_gpt_reviews_this_capture:0,
   scheduler_executed_full_reviews:null,skipped_gpt_reviews:null,
   capture_runner_http_requests_for_this_stage:0,queue_count:null,
   p50_wait_minutes:null,p95_wait_minutes:null,
   provider_source_integrity_records:integrity?.checked??null}
 ].map(x=>({...x,gpt_input_tokens:null,gpt_output_tokens:null,
   gpt_cost_usd:null,role_wall_clock_runtime_ms:null,
   task_failure_count:x.role==='dot-2-discovery'
      ?records.filter(r=>r.status!==null&&r.status>=400).length:null,
    actual_dot_automation_invoked:false}));
 return {schema:1,kind:'R29_V19_SOURCE_MEASURED_OPERATING_REPORT',
  as_of_utc:asOfUtc,source_capture_utc:capture.captured_completed_at_utc,
  capture_request_path:capture.request_path,
  source_scope:'THIS_SINGLE_RESEARCH_CAPTURE_NOT_GLOBAL_MARKET',
  provider_attempts_measured:records.length,
  provider_http_200:records.filter(x=>x.status===200).length,
  provider_http_429:records.filter(x=>x.is_429).length,
  provider_receipts_invalid:invalid,
  measured_source_requests_per_provider: httpByProvider,
  measured_source_requests_per_chain: httpByChain,
  provider_start_minute_histogram:finish(byMinute),
  chain_utc_hour_histogram:finish(byChainHour),
  measured_provider_latency_p50_ms:q(records.map(x=>x.latency_ms),.5),
  measured_provider_latency_p95_ms:q(records.map(x=>x.latency_ms),.95),
  per_dot:perDot,
  actual_gpt_reviews_verified_from_capture:0,
  actual_gpt_tokens_used:null,actual_gpt_provider_cost_usd:null,
  github_actions_cost_usd:null,provider_cost_usd:null,
  actual_client_confirmed_paper_fills:0,
  intended_full_review_rates:[4,8,12,24],
  actual_dot_automations_activated_in_this_capture:0,
  no_gpt_run_inferred_from_http_capture:true,
  no_unmeasured_cost_or_latency_imputed:true,
  no_market_coverage_claim:true,trade_authorized:false};
}
