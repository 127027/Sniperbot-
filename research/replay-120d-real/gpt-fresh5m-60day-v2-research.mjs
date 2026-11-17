// R29 V2 retrospective INSAMPLE research experiment after v1 posthoc findings.
// Re-scores minute-fresh neutral tokens, never fabricates BUY/HOLD/SELL or profit.
// This version was authored after the 60 days; not a valid untouched holdout.
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {evaluateAsOfCandidate,cadence,stressNotional} from './gpt-authored-60d-policy-proxy.mjs';
const DAY=86400000,START=Date.UTC(2026,8,18),HOUR=3600000;
const ok=(v,msg)=>{if(!v)throw Error(msg)};
const dayUTC=n=>new Date(n).toISOString().slice(0,10);
const hash=s=>createHash('sha256').update(s).digest('hex');
export const POLICY='GPT_AUTHORED_FRESH5M_NONMAYHEM_RESEARCH_PROXY_INSAMPLE_20261117_V2';
export function evaluateFreshCandidate(c){
 ok(c&&typeof c==='object'&&c.asof_features&&Number.isFinite(c.age_at_scan_s),'INVALID_FRESH_CANDIDATE');
 const f=c.asof_features;
 if(c.age_at_scan_s>300||c.age_at_scan_s<0)
  return {status:'RISK_REJECT',reason:'MINT_NOT_FRESH_AT_SCAN',score:null};
 if(f.mayhem!==false)
  return {status:'RISK_REJECT',reason:'MAYHEM_OR_UNKNOWN_AGENT_TRADING_MODE',score:null};
 if(f.quote_asset!=='sol'||f.quote_is_sol!==true)
  return {status:'DATA_GAP',reason:'UNVERIFIED_OR_NON_SOL_QUOTED_LAUNCH',score:null};
 // A modelled SOL bonding curve is still not an independent swap quote.
 const v=evaluateAsOfCandidate(f);
 if(v.verdict!=='WATCH_FOR_INDEPENDENT_PROOFS')
  return {status:v.verdict,reason:v.reasons.join('|'),score:v.score};
 if(v.score<80)return {status:'NO_TRADE',reason:'SCORE_BELOW_80_RESEARCH_ONLY',score:v.score};
 return {status:'WATCH_NEEDS_INDEPENDENT_POOL_PROOF',reason:'INTRAHOUR_FRESH5_NONMAYHEM_RESEARCH_ONLY',
  score:v.score,virtual_stress_usdc_not_order:stressNotional(f.f_n_buys,v.score)};
}
function matrix(input){
 const [header,...lines]=input.trim().split(/\r?\n/),keys=header.split(',');
 const rows=new Map();
 for(const line of lines){
  const fields=line.split(',');
  ok(fields.length===keys.length,'BAD_PINNED_MATRIX_ROW');
  const x=Object.fromEntries(keys.map((k,i)=>[k,fields[i]]));
  ok(!rows.has(x.day_utc),'DUPLICATE_MATRIX_DAY');
  rows.set(x.day_utc,x);
 }
 ok(rows.size===60,'EXPECTED_60_DAYS');
 return rows;
}
export function replayFreshV2(dir,matrixCsv){
 const pinned=matrix(matrixCsv);
 const manifest=JSON.parse(readFileSync(join(dir,'SUMMARY.json'),'utf8'));
 ok(manifest.schema==='r29_real_43day_fresh5m_asof_replay_v2'&&
  manifest.days_with_source===43&&manifest.source_rows===5645886&&
  manifest.hourly_frames===1032&&manifest.out_of_sample_validation===false,
  'PINNED_FRESH5_REPLAY_NOT_VERIFIED');
 const daily=[],reviews=[];const counts={};
 const cum=(x)=>{counts[x]=(counts[x]||0)+1};
 for(let i=0;i<60;i++){
  const day=dayUTC(START+i*DAY);
  const p=join(dir,day+'.json'),pinnedDay=pinned.get(day);
  ok(pinnedDay,'PINNED_DAY_MISSING');
  if(!existsSync(p)){
   ok(!pinnedDay.minute_feature_sha256,'SOURCE_EXISTS_BUT_MISSING_FRESH_FRAME');
   daily.push({day_utc:day,countdown:60-i,status:'SOURCE_GAP_NOT_A_NO_TRADE',
    completed_proxy_scans:0,planned_morning_checks_not_executed:1,watch_scans:null,
    rejected_count:null,research_only_count:null,verified_buy:0,verified_hold:0,
    verified_sell:0,realizable_pnl_test_usdc:null});
   continue;
  }
  const data=JSON.parse(readFileSync(p,'utf8'));
  ok(data.schema==='r29_real_43day_fresh_5minute_asof_frames_v2'&&
   data.day===day&&data.frames.length===24&&
   data.source_raw_parquet_sha256===pinnedDay.minute_feature_sha256&&
   data.no_future_labels===true&&data.model_calls===0&&data.paper_fills===0,
   'FRESH5_SOURCE_MISMATCH');
  let last=null,n=0,watch=0,rejected=0,unclear=0,notrade=0;
  const mints=new Set();
  for(let h=0;h<24;h++){
   const fr=data.frames[h],at=Date.parse(fr.at_utc);
   ok(at===Date.parse(day+'T00:00:00Z')+(h+1)*HOUR,'FUTURE_FRAME_OR_WRONG_TIME');
   const level=cadence(fr.sampled_feature_rows_prior_hour);
   if(last!==null && h-last< {1:24,4:6,12:2,24:1}[level])continue;
   last=h;n++;
   const candidates=[];
   for(const c of fr.last_eight_fresh_neutral_mints){
    const f=c.asof_features;
    ok(typeof f.mint==='string'&&Date.parse(c.observed_at_utc)<=at&&
     !('rugged' in f)&&!('peak_rs' in f)&&!('rug_dt_s' in f)&&
     c.age_at_scan_s<=300,'STALE_OR_HINDSIGHT_CANDIDATE');
    const grade=evaluateFreshCandidate(c);
    if(grade.status==='RISK_REJECT')rejected++;
    if(grade.status==='RESEARCH_ONLY'||grade.status==='DATA_GAP')unclear++;
    if(grade.status==='NO_TRADE')notrade++;
    if(grade.status==='WATCH_NEEDS_INDEPENDENT_POOL_PROOF')
     candidates.push({mint:f.mint,score_not_probability:grade.score,
      observed_at_utc:c.observed_at_utc,age_at_scan_s:c.age_at_scan_s,
      stress_size_not_order:grade.virtual_stress_usdc_not_order});
   }
   candidates.sort((a,b)=>b.score_not_probability-a.score_not_probability||
    a.mint.localeCompare(b.mint));
   if(candidates.length){watch++;mints.add(candidates[0].mint)}
   const action=candidates.length?'WATCH_NO_EXECUTABLE_SWAP_QUOTE':'NO_TRADE_OR_DATA_GAP_RESEARCH_ONLY';
   cum(action);
   reviews.push({day_utc:day,asof_utc:fr.at_utc,
    snapshot_hash_sha256:hash(JSON.stringify(fr)),
    policy_id:POLICY,planned_frequency_at_hour:level,
    source_features_in_hour:fr.sampled_feature_rows_prior_hour,
    truly_fresh_last5m_candidates_seen:fr.last_eight_fresh_neutral_mints.length,
    action,top_research_candidate:candidates[0]??null,
    all_model_authored_per_scan_calls:0,verified_buy_hold_sell_fills:0,
    actual_pnl_test_usdc:null,
    evidence_gaps:['historical_mint_authority','independent_pool_depth',
    'executability_both_directions','verified_conversion_and_slippage']});
  }
  daily.push({day_utc:day,countdown:60-i,status:'PINNED_RETROSPECTIVE_FRESH5_SOURCE',
   completed_proxy_scans:n,planned_morning_checks_not_executed:0,
   watch_scans:watch,unique_top_watches:mints.size,
   rejected_count:rejected,research_only_count:unclear,insufficient_score_count:notrade,
   verified_buy:0,verified_hold:0,verified_sell:0,realizable_pnl_test_usdc:null});
 }
 const total=daily.filter(x=>x.status==='PINNED_RETROSPECTIVE_FRESH5_SOURCE');
 ok(total.length===43&&daily.length===60,'EXPECTED_43_OF_60_SOURCE');
 return {summary:{schema:'r29_fresh5_60day_gpt_authored_research_proxy_insample_v2',
   model_policy_id:POLICY,days:60,source_days:43,source_gaps:17,
   full_hourly_frames:1032,proxy_scans:reviews.length,
   review_episodes_with_watch:total.reduce((n,x)=>n+x.watch_scans,0),
   candidate_risk_rejections:total.reduce((n,x)=>n+x.rejected_count,0),
   data_gap_or_unknown_candidates:total.reduce((n,x)=>n+x.research_only_count,0),
   actual_historical_gpt_model_calls:0,
   historical_executed_buy:0,historical_executed_hold:0,historical_executed_sell:0,
   confirmed_60day_pnl_test_usdc:null,real_trading_enabled:false,
   out_of_sample_result:false,
   warning:'V2 generated after 60-day hindsight labels, so same-period comparison is IN-SAMPLE research, not a valid proof of improved returns.'},
   daily,reviews};
}
export function saveReport(r,where){
 mkdirSync(where,{recursive:true});
 writeFileSync(join(where,'R29_FRESH5_V2_SUMMARY.json'),JSON.stringify(r.summary,null,2)+'\n');
 const fields=['day_utc','countdown','status','completed_proxy_scans','watch_scans',
 'unique_top_watches','rejected_count','research_only_count','insufficient_score_count',
 'verified_buy','verified_hold','verified_sell','realizable_pnl_test_usdc'];
 writeFileSync(join(where,'R29_FRESH5_V2_60DAY_DAILY.csv'),
  fields.join(',')+'\n'+r.daily.map(x=>fields.map(k=>x[k]??'UNKNOWN').join(',')).join('\n')+'\n');
 writeFileSync(join(where,'R29_FRESH5_V2_SCAN_ACTIONS.jsonl'),
  r.reviews.map(x=>JSON.stringify(x)).join('\n')+'\n');
}
if(process.argv[1]?.endsWith('gpt-fresh5m-60day-v2-research.mjs')){
 try{
  const args=process.argv.slice(2),i=args.indexOf('--frames'),j=args.indexOf('--matrix'),k=args.indexOf('--out');
  ok(i>=0&&j>=0&&k>=0,'REQUIRED_ARGS');
  const r=replayFreshV2(args[i+1],readFileSync(args[j+1],'utf8'));
  saveReport(r,args[k+1]);console.log('R29_FRESH5_V2_RESEARCH',JSON.stringify(r.summary));
 }catch(e){console.error('R29_FRESH5_V2_ERROR',e.message);process.exitCode=1;}
}
