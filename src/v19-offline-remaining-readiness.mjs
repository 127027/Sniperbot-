// R29 SYS-10 SYS-14 D2-03 D3-07 D4-08 D5-01: six independent
// OFFLINE research/assurance layers. Never touch live API, client or signals.
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {verifyArchivedHttpBytes} from './v19-source-integrity.mjs';
import {canonicalChain,tokenValid,poolValid} from './market-evidence.mjs';
import {planConvergentExitIntents,auditSingleExitReceipt} from './v19-paper-exit-convergence.mjs';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const sha=x=>createHash('sha256').update(x).digest('hex');
const normalized=(chain,s)=>chain==='solana'?String(s):String(s).toLowerCase();
const vpath=s=>typeof s==='string'&&/^research\/feeds\/\d{4}-\d{2}-\d{2}\/\d+\/[a-z0-9._-]+$/.test(s);
const network=c=>({BNB:'bsc',BSC:'bsc',Ethereum:'ethereum',Solana:'solana',
 Cronos:'cronos',Robinhood:'robinhood',Base:'base'})[c]||canonicalChain(c);
const oracle=x=>x&&typeof x==='object'&&('reported_gain_pct' in x||'future_winner_label' in x
 ||x.source_class==='POST_EVENT_ORACLE'||'post_event_rank' in x);

// SYS-10: compress copies and verify byte-identical decompression. Immutable
// originals are NEVER removed or overwritten, and no repository git history is
// rewritten. Return only content-addressed metadata, never winner content.
export function auditOfflineRawArchive({apiEvidence=[],rawFiles={},asOfUtc}={}){
 const at=ms(asOfUtc);if(at===null||!Array.isArray(apiEvidence)||!rawFiles
  ||typeof rawFiles!=='object'||apiEvidence.length>10000)
  throw Error('INVALID_OFFLINE_RAW_ARCHIVE');
 const index=new Map(),failures=[],byDay={};let originals=0,gzipBytes=0,rawBytes=0;
 for(const [i,r] of apiEvidence.entries()){
  const source=r?.body_path,raw=rawFiles[source];
  if(!vpath(source)||typeof raw!=='string'||index.has(source)){
   failures.push({index:i,path:source||null,reason:'MISSING_DUPLICATED_OR_UNSAFE_RAW'});
   continue;
  }
  const proof=verifyArchivedHttpBytes({rawText:raw,evidence:r,sourcePath:source,asOfUtc});
  if(!['SOURCE_BYTES_VERIFIED','HTTP_ERROR_ARCHIVED'].includes(proof.status)){
   failures.push({index:i,path:source,reason:proof.reason||proof.status});continue;
  }
  if(ms(r.received_at_utc)>at||r.http_status===undefined){
   failures.push({index:i,path:source,reason:'POST_ASOF_OR_MISSING_HTTP_STATUS'});continue;
  }
  const input=Buffer.from(raw,'utf8');
  const zipped=gzipSync(input,{mtime:0});
  if(!gunzipSync(zipped).equals(input))throw Error('GZIP_RESTORE_FAILED');
  const day=r.received_at_utc.slice(0,10),digest=sha(input),gzsha=sha(zipped);
  const object={source_path:source,original_sha256:digest,
   git_blob_sha1:proof.calculated_git_blob_sha1,compressed_sha256:gzsha,
   compression:'gzip',original_bytes:input.length,compressed_bytes:zipped.length,
   captured_utc:r.received_at_utc,http_status:r.http_status,day_partition:day,
   compressed_copy_tested:true,source_capture_independently_attested:false};
  index.set(source,object);(byDay[day]??=[]).push(source);
  originals++;rawBytes+=input.length;gzipBytes+=zipped.length;
 }
 const entries=[...index.values()].sort((a,b)=>a.source_path.localeCompare(b.source_path));
 return {schema:1,kind:'R29_V19_SYS10_OFFLINE_CONTENT_ADDRESS_AUDIT',
  as_of_utc:asOfUtc,archive_file_count:entries.length,
  source_response_count:apiEvidence.length,raw_total_bytes:rawBytes,
  compressed_total_bytes:gzipBytes,
  sha256_manifest:sha(JSON.stringify(entries)),
  day_partition_paths:Object.fromEntries(Object.entries(byDay)
   .sort(([a],[b])=>a.localeCompare(b)).map(([day,paths])=>[day,paths.sort()])),
  entries,failures,
  valid_originals_not_modified:true,compression_roundtrip_verified:failures.length===0,
  actual_github_archived_compressed_copies:false,
  github_repo_growth_reduction_proven:false,
  never_delete_original_raw:true,orders_created:0};
}

// SYS-14: source-measured operating summary from captured HTTP receipts.
// Provider results != GPT executions. Unmeasured cost and missed 24h coverage
// must remain null; even synthetic source records cannot claim GPT costs.
export function summarizeOfflineOperationalReceipts({apiEvidence=[],asOfUtc}={}){
 const at=ms(asOfUtc);if(at===null||!Array.isArray(apiEvidence))throw Error('INVALID_OFFLINE_OPERATIONS');
 const buckets=new Map(),invalid=[];let total=0,ok=0,limited=0;
 for(const [i,r] of apiEvidence.entries()){
  const start=ms(r?.started_at_utc),end=ms(r?.received_at_utc);
  if(start===null||end===null||end<start||end>at
   ||!Number.isInteger(r.http_status)||r.http_status<100||r.http_status>599
   ||!vpath(r.body_path)){
   invalid.push(i);continue;
  }
  total++;if(r.http_status===200)ok++;if(r.http_status===429)limited++;
  const key=r.started_at_utc.slice(0,16)+'Z';
  const c=buckets.get(key)||{minute_utc:key,http_attempts:0,http200:0,http429:0};
  c.http_attempts++;if(r.http_status===200)c.http200++;if(r.http_status===429)c.http429++;
  buckets.set(key,c);
 }
 return {schema:1,kind:'R29_V19_SYS14_OFFLINE_SOURCE_ONLY_OPERATIONS',
  as_of_utc:asOfUtc,measured_http_attempts:total,http200:ok,http429:limited,
  utc_minute_buckets:[...buckets.values()].sort((a,b)=>a.minute_utc.localeCompare(b.minute_utc)),
  invalid_receipt_indices:invalid,actual_gpt_reviews_verified_from_http:0,
  network_capture_continuous_24h_proven:false,
  provider_quota_remaining:null,gpt_token_cost_usd:null,
  github_actions_minutes_cost_usd:null,
  queue_sla_p95_minutes:null,
  measured_provider_http_not_trading_signals:true,orders_created:0};
}

// D2-03: retrospective resolution STRICTLY by chain+exact pool identity.
// Labels, names and winner ranks may NEVER seed discovery or buy decisions.
export function resolveHistoricalWinnerIdentity({winnerRegister,memory,asOfUtc,
 decisionWindowEndUtc='2026-10-13T00:00:00.000Z'}={}){
 const now=ms(asOfUtc),windowEnd=ms(decisionWindowEndUtc);
 if(now===null||windowEnd===null||now<=windowEnd
  ||winnerRegister?.kind!=='R29_V19_POST_EVENT_WINNER_REFERENCE_REGISTER'
  ||winnerRegister.purpose!=='EVALUATION_ONLY_AFTER_DECISIONS'
  ||winnerRegister.source_class!=='POST_EVENT_ORACLE'
  ||!Array.isArray(winnerRegister.entries)
  ||memory?.kind!=='R29_PERSISTENT_MARKET_MEMORY')
  throw Error('INVALID_POSTEVENT_IDENTITY_AUDIT');
 const rows=[];let nameOnly=0,linkedCount=0,matched=0,typedValid=0;
 for(const e of winnerRegister.entries){
  const chain=network(e.reported_chain),pool=e.pool;
  if(!chain||!Number.isInteger(e.rank)||e.rank<1)throw Error('INVALID_WINNER_ID');
  const linked=typeof pool==='string'&&pool.length>0;
  const exact=linked&&poolValid(chain,pool),key=exact?chain+':'+normalized(chain,pool):null;
  const archived=key?memory.pools?.[key]:null;
  const contract=archived?.contract;
  const conflicts=archived?.contract_conflicts?.length>0;
  const matching=!!archived&&tokenValid(chain,contract)&&!conflicts;
  if(linked)linkedCount++;else nameOnly++;
  if(exact)typedValid++;
  if(matching)matched++;
  rows.push({reference_rank:e.rank,reported_chain:e.reported_chain,
   reference_pool:linked?pool:null,pool_id_validated_for_chain:exact,
   matched_memory_pool_key:archived?key:null,
   match_status:!linked?'NAME_ONLY_NO_SAFE_CONTRACT_LOOKUP':
    !exact?'LINK_PRESENT_POOL_TYPE_NOT_VERIFIED':
    !archived?'LINKED_POOL_NOT_IN_ARCHIVED_MEMORY':
    conflicts?'ARCHIVED_CONTRACT_CONFLICT':
    !tokenValid(chain,contract)?'ARCHIVED_CONTRACT_MISSING':
    'RETROSPECTIVE_POOL_IDENTITY_ONLY',
   retrospective_contract:matching?contract:null,
   source_first_archived_at_utc:archived?.first_seen_at_utc??null,
   source_first_genuine_dot2_capture_at_utc:archived?.first_dot2_detected_at_utc??null,
   historical_original_october_discovery_verified:false,
   safe_to_replay_as_historical_early_discovery:false,
   eligible_as_automatic_buy_candidate:false});
 }
 return {schema:1,kind:'R29_V19_D203_POSTEVENT_IDENTITY_RESEARCH',
  as_of_utc:asOfUtc,reference_count:rows.length,
  name_only_unresolved:nameOnly,source_pool_link_count:linkedCount,
  exact_pool_link_count:typedValid,
  retrospective_archived_contract_matches:matched,
  exact_historical_october_detection_verified:0,rows,
  oracle_label_access_only_after_decision_window:true,
  writer_can_publish_discovery_signals:false,orders_created:0};
}

// D3-07: precise missing-field follow-ups with per-field deadline.
// Does not issue extra API requests or turn self-asserted status into approval.
export function auditDot3EvidenceDeadlines({recheckPlan,asOfUtc}={}){
 const now=ms(asOfUtc);
 if(now===null||recheckPlan?.kind!=='R29_V19_DOT3_EVIDENCE_RECHECK_PLAN'
  ||!Array.isArray(recheckPlan.watchlist))
  throw Error('INVALID_D307_OFFLINE_DEADLINES');
 const tasks=[],rejected=[];
 for(const [index,c] of recheckPlan.watchlist.entries()){
  const due=ms(c.next_recheck_at_utc),expires=ms(c.evidence_deadline_at_utc);
  if(!c.key||!Array.isArray(c.missing_fields)||due===null||expires===null){
   rejected.push(index);continue;
  }
  const codes=[...new Set(c.missing_fields)].sort();
  for(const field of codes)tasks.push({pool_key:c.key,missing_field:field,
   next_recheck_at_utc:c.next_recheck_at_utc,
   stale_capture_after_utc:c.evidence_deadline_at_utc,
   blocked_by_provider_cooldown:due>now,
   current_capture_expired:expires<now,
   next_action:c.next_action,
   authenticated_new_risk_evidence:false,fetch_performed:false,
   buy_authorized:false});
 }
 return {schema:1,kind:'R29_V19_D307_FIELD_DEADLINE_WORKLIST',
  at_utc:asOfUtc,candidate_count:recheckPlan.watchlist.length,
  field_task_count:tasks.length,
  expired_task_count:tasks.filter(x=>x.current_capture_expired).length,
  provider_wait_task_count:tasks.filter(x=>x.blocked_by_provider_cooldown).length,
  tasks,rejected,
  no_provider_requests_made:true,no_actual_dot3_approval:true,orders_created:0};
}

// D4-08: reconcile competing STOP and Dot4 SELL into one immutable intent,
// then verify a completely separate in-memory MODEL client receipt or its absence.
export function auditOfflineExitLifecycle({paperStateBefore,proposals=[],asOfUtc,
 paperStateAfter=null,confirmedModelSellOrderId=null}={}){
 const plan=planConvergentExitIntents({paperState:paperStateBefore,proposals,asOfUtc});
 const traces=plan.intents.map(intent=>{
  const lot=paperStateBefore.positions[intent.market_key];
  const receipt=paperStateAfter&&confirmedModelSellOrderId?
   auditSingleExitReceipt({stateBefore:paperStateBefore,stateAfter:paperStateAfter,
    openingBuyOrderId:intent.opening_buy_order_id,
    sellOrderId:confirmedModelSellOrderId,coin:lot.coin}):null;
  return {intent_id:intent.id,opening_lot_id:intent.opening_buy_order_id,
   state:intent.status,proposal_count:intent.proposals_seen,
   repeated_proposals_collapsed:Math.max(0,intent.proposals_seen-1),
   modeled_separate_exit_receipt_consistent:receipt?.model_receipt_consistent??null,
   executable_paper_client_receipt_verified:false,
   synthetic_model_receipt_not_authorized_live:true,
   new_order_published:false};
 });
 return {schema:1,kind:'R29_V19_D408_OFFLINE_EXIT_CONVERGENCE_AUDIT',
  as_of_utc:asOfUtc,convergent_intent_count:traces.length,
  candidate_count:plan.exit_candidates,proposals_rejected:plan.rejected,
  trace:traces,
  model_research_state_read_only:true,
  genuine_signed_git_order_count:0,genuine_client_fills:0,
  cross_process_order_race_resolved_live:false,orders_published:0};
}

// D5-01: ONLY after trading decisions have already ended; join winners
// by exact chain+pool to a neutral archived universe. Never use the 65
// winner labels to form the denominator or to retroactively invent recall.
export function auditPostEventWinnerCoverage({winnerRegister,population,asOfUtc,
 decisionWindowEndUtc}={}){
 const now=ms(asOfUtc),end=ms(decisionWindowEndUtc);
 if(now===null||end===null||now<=end
  ||population?.kind!=='R29_V19_NEUTRAL_ALL_OBSERVED_POOL_DENOMINATOR'
  ||winnerRegister?.kind!=='R29_V19_POST_EVENT_WINNER_REFERENCE_REGISTER'
  ||winnerRegister.purpose!=='EVALUATION_ONLY_AFTER_DECISIONS')
  throw Error('INVALID_POSTEVENT_WINNER_EVALUATION');
 const observed=new Set(population.entries.map(e=>e.legacy_pool_key));
 const rows=winnerRegister.entries.map(w=>{
  const chain=network(w.reported_chain);
  const linked=typeof w.pool==='string'&&w.pool.length>0;
  const exact=linked&&!!chain&&poolValid(chain,w.pool);
  const k=exact?chain+':'+normalized(chain,w.pool):null;
  const matched=!!k&&observed.has(k);
  return {reference_rank:w.rank,
   reference_pool_key:k,matched_archived_observed_pool:matched,
   original_pool_link_present:linked,pool_identity_type_valid:exact,
   had_exact_pool_link:exact,reference_identity_missing:!linked,
   original_october_early_discovery_verified:false,
   historical_tradeable_entry_proven:false,
   winner_gain_not_used_as_buy_or_training_signal:true};
 });
 const matched=rows.filter(r=>r.matched_archived_observed_pool).length;
 return {schema:1,kind:'R29_V19_D501_POST_DECISION_WINNER_COVERAGE_AUDIT',
  as_of_utc:asOfUtc,decision_window_end_utc:decisionWindowEndUtc,
  neutral_observed_pool_count:population.entries.length,
  postevent_winner_reference_count:rows.length,
  source_pool_link_count:rows.filter(x=>x.original_pool_link_present).length,
  exact_pool_reference_count:rows.filter(x=>x.had_exact_pool_link).length,
  matched_pool_references_in_later_archive:matched,
  unmatched_or_name_only_reference_count:rows.length-matched,
  actual_original_october_early_detection_confirmed:0,
  sample_is_not_whole_market:true,neutral_observed_pools_not_all_negative:true,
  precision:null,recall:null,false_positive_rate:null,
  original_65_oracle_used_for_discovery:false,rows,orders_created:0};
}
