// Audit role completion, not a claim of earlier historical GPT execution.
export function auditCurrentDotRoles({dot1,dot2,dot3,dot4,dot5,signalIndex}={}){
 const count=dot2?.candidate_count??dot2?.candidates?.length??0;
 const contracts=(dot2?.candidates??[]).filter(x=>typeof x?.contract==='string'&&x.contract.length>=32).length;
 const eligible=dot3?.counts?.ELIGIBLE??0;
 const buy=dot4?.counts?.buy??0,sell=dot4?.counts?.sell??0;
 const orders=Array.isArray(signalIndex?.orders)?signalIndex.orders.length:0;
 const qa=dot5?.counts||{};
 const roles=[
  {dot:'DOT1',role:'Adaptive cadence',status:dot1?.data_available===true?'EVIDENCE_PRESENT':'DATA_GAP',
   verified:dot1?.data_available===true,evidence:'target='+String(dot1?.target_per_24h??'?')+', data='+String(dot1?.data_available===true)},
  {dot:'DOT2',role:'Discover pools and full contracts',status:count>0&&contracts>0?'PARTIAL':'DATA_GAP',
   verified:count>0&&contracts>0,evidence:'candidates='+count+', full_contracts='+contracts},
  {dot:'DOT3',role:'Independent risk assessment',status:eligible>0?'PARTIAL':'DATA_GAP',
   verified:eligible>0,evidence:'risk_eligible='+eligible},
  {dot:'DOT4',role:'Decide and publish BUY/SELL',status:buy+sell>0&&orders>0?'PARTIAL':'DATA_GAP',
   verified:buy+sell>0&&orders>0,evidence:'buy='+buy+', sell='+sell+', orders='+orders},
  {dot:'DOT5',role:'Quality assurance and receipts',status:dot5?.updated_at_utc?'DIAGNOSTIC_ACTIVE':'DATA_GAP',
   verified:!!dot5?.updated_at_utc,evidence:'sha_verified='+String(qa.dot2_snapshots_verified_sha??'?')+', receipts='+String(qa.receipt_files??'?')}
 ];
 return {schema:1,kind:'LIVE_DOT_ROLE_AUDIT',source:'LATEST_ACTUAL_GITHUB_DOT_REPORTS',
  all_roles_complete:roles.every(r=>r.verified)&&orders>0&&Number(qa.confirmed_paper_filled)>0,
  published_orders:orders,confirmed_client_fills:qa.confirmed_paper_filled??0,roles,
  caution:'Current Dot statuses do not prove Dot activities in historical Oct 12'};
}
export function build24TrainingTimeline({day,sourceCandidates=[],researchScans=[],roleAudit=null}={}){
 const start=Date.parse(day+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day||'')||!Number.isFinite(start))throw Error('INVALID_DAY');
 const iso=x=>new Date(x).toISOString(),scans=[];
 for(let i=0;i<24;i++){
  const tick=start+i*3600000+35*60000,s=researchScans[i];
  const decisions=Array.isArray(s?.decisions)?s.decisions:[];
  const countAction=action=>decisions.filter(x=>x.action===action).length;
  scans.push({scan:i+1,utc_at:iso(tick),germany_mesz_at:iso(tick+2*3600000).slice(11,16),
   dot1:'24_FORCED_DIAGNOSTIC_NOT_ACTUAL_GPT_COUNT',
   dot2:'RETROSPECTIVE_REFERENCE_NOT_ORIGINAL_DISCOVERY',
   dot3:'NO_CONTEMPORANEOUS_TWO_SOURCE_RISK_PASS',
   dot4:decisions.length?'RESEARCH_MODEL_ONLY_NOT_ACTUAL_DOT4':'DATA_GAP',
   dot5:'NO_REAL_HISTORICAL_RECEIPTS',
   research_coins_analyzed:decisions.length,research_buy:countAction('BUY_EXPERIMENT'),
   research_sell:countAction('SELL_EXPERIMENT'),research_watch:countAction('WATCH_EXPERIMENT'),
   research_hold:countAction('HOLD_EXPERIMENT'),actual_paper_buys:0,actual_paper_sells:0,verified_fills:0,
   decisions:decisions.map(x=>({symbol:x.symbol,action:x.action,reason:x.reason}))});
 }
 return {schema:1,kind:'24_HOUR_TRAINING_WITH_DOT_ROLE_AUDIT',day,
  scans,retrospective_pool_references:sourceCandidates.length,verified_original_dot2_discoveries:0,
  verified_actual_orders:0,verified_client_fills:0,current_role_audit:roleAudit,
  caution:'Hourly research model is not historical GPT Dot execution or confirmed paper trade'};
}
