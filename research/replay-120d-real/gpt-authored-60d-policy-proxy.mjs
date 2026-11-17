// R29: frozen GPT-authored RESEARCH POLICY proxy over authentic sealed as-of frames.
// This is not a historical GPT model call, a trading decision, a paper fill or PnL.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

export const POLICY_ID='R29-GPT-AUTHORED-ASOF-RESEARCH-PROXY-20261117-V1';
const DAYS=60,START=Date.UTC(2026,8,18);
const DANGER=['flag_creator_sold','flag_bundle_dumped','flag_serial_rugger_creator',
 'flag_pool_drained','flag_curve_closed_low','flag_migrate_below_grad'];
const MISSING=['independent_historical_contract_sellability','costed_historical_bidirectional_buy_sell_quote',
 'historical_usdc_liquidity_at_size','independent_historical_social_and_wallet_confirmations'];
const ok=(v,msg)=>{if(!v)throw Error(msg)};
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const isoDay=ms=>new Date(ms).toISOString().slice(0,10);
const sha=x=>createHash('sha256').update(x).digest('hex');

export function evaluateAsOfCandidate(f){
 ok(f&&typeof f.mint==='string'&&f.mint.length>=32,'TOKEN_MINT_REQUIRED');
 ok(['f_n_buys','f_rep_rug','f_rep_n','f_dev_share','f_insider_share'].every(k=>k in f),'ASOF_FIELDS_REQUIRED');
 const bad=DANGER.filter(k=>f[k]===true);
 if(bad.length)return {verdict:'RISK_REJECT',score:null,reasons:bad};
 if(![f.f_n_buys,f.f_dev_share,f.f_insider_share].every(finite))
  return {verdict:'UNKNOWN',score:null,reasons:['MISSING_OR_NONFINITE_ASOF_METRICS']};
 if(f.f_dev_share>.15||f.f_insider_share>.20)
  return {verdict:'RISK_REJECT',score:null,reasons:['EXTREME_CREATOR_OR_INSIDER_CONCENTRATION']};
 const reputation=finite(f.f_rep_n)&&f.f_rep_n>=5&&finite(f.f_rep_rug)&&f.f_rep_rug<=1;
 if(reputation&&f.f_rep_rug>=.70)
  return {verdict:'RISK_REJECT',score:null,reasons:['HIGH_PRIOR_CREATOR_RUG_RATE']};
 if(!reputation)
  return {verdict:'RESEARCH_ONLY',score:null,reasons:['INSUFFICIENT_CREATOR_REPUTATION_SAMPLE']};
 if(f.f_n_buys<20||f.f_dev_share>=.05||f.f_insider_share>=.05||f.f_rep_rug>.30)
  return {verdict:'RESEARCH_ONLY',score:null,reasons:['INSUFFICIENT_ADOPTION_OR_CONCENTRATION_OR_PRIOR_REPUTATION']};
 const score=Math.round(100*(Math.min(45,7*Math.log2(1+f.f_n_buys))+
  25*(1-f.f_rep_rug)+15*(1-Math.min(1,f.f_dev_share/.05))+
  15*(1-Math.min(1,f.f_insider_share/.05))))/100;
 return {verdict:'WATCH_FOR_INDEPENDENT_PROOFS',score,
  reasons:['ASOF_ACTIVITY_AND_NONCRITICAL_CREATOR_STRUCTURE','EXECUTION_PROOFS_REQUIRED']};
}
export function stressNotional(n,score){
 if(score===null||score<70)return null;
 if(n>=200&&score>=90)return 1000;
 if(n>=100&&score>=85)return 500;
 if(n>=50&&score>=80)return 250;
 return 50;
}
export function cadence(n){
 ok(Number.isInteger(n)&&n>=0,'INVALID_HOURLY_SOURCE_COUNT');
 return n>=6500?24:n>=4800?12:n>=2500?4:1;
}
function matrixMap(csv){
 const [h,...lines]=csv.trim().split(/\r?\n/),keys=h.split(',');
 ok(['day_utc','minute_feature_sha256','minute_asof_feature_rows_verified'].every(k=>keys.includes(k)),'MATRIX_MISSING_REQUIRED_FIELDS');
 const m=new Map();
 for(const line of lines){const cells=line.split(',');
  ok(cells.length===keys.length,'BAD_MATRIX_ROW');
  const row=Object.fromEntries(keys.map((k,i)=>[k,cells[i]]));
  ok(!m.has(row.day_utc),'DUPLICATE_MATRIX_DAY');m.set(row.day_utc,row);
 }
 ok(m.size===60,'EXPECTED_60_DAY_MATRIX');
 return m;
}
export function replay(framesDir,matrixText){
 const matrix=matrixMap(matrixText);
 const summary=JSON.parse(readFileSync(join(framesDir,'SUMMARY.json'),'utf8'));
 ok(summary.schema==='r29_real_43day_asof_feature_audit_v1'&&summary.verified_days===43
   &&summary.actual_gpt_trades===0,'UNEXPECTED_PINNED_43DAY_ARCHIVE');
 const daily=[],checks=[];
 for(let idx=0;idx<DAYS;idx++){
  const day=isoDay(START+idx*86400000);
  ok(matrix.has(day),'ARCHIVE_MATRIX_MISSING_DAY');
  const fp=join(framesDir,day+'.json');
  if(!existsSync(fp)){
   ok(!matrix.get(day).minute_feature_sha256,'MISSING_JSON_WHILE_MATRIX_CLAIMS_VERIFIED');
   daily.push({day_utc:day,status:'SOURCE_DATA_GAP_NOT_STRATEGIC_NO_TRADE',scans:0,
     watch_scans:null,risk_rejects:null,research_only:null,verified_buy:0,verified_hold:0,
     verified_sell:0,pnl_test_usdc:null});
   continue;
  }
  const src=JSON.parse(readFileSync(fp,'utf8')),expected=matrix.get(day);
  ok(src.day===day&&src.frames?.length===24&&src.source_sha256===expected.minute_feature_sha256&&
    src.real_feature_rows===Number(expected.minute_asof_feature_rows_verified),'PINNED_SOURCE_MISMATCH');
  ok(src.future_outcome_known_to_replay===false&&src.gpt_model_calls===0&&src.actual_paper_trades===0,'FUTURE_OR_GPT_CLAIM_LEAK');
  let last=null;let num=0,watch=0,risk=0,research=0;const mints=new Set();
  for(let h=0;h<24;h++){
   const fr=src.frames[h],at=Date.parse(fr.at_utc),level=cadence(fr.sampled_feature_rows);
   ok(at===Date.UTC(Number(day.slice(0,4)),Number(day.slice(5,7))-1,Number(day.slice(8,10)),h+1),'ASOF_FRAME_TIME_INVALID');
   if(last!==null&&h-last < {1:24,4:6,12:2,24:1}[level])continue;
   last=h;num++;ok(num<=24,'SCAN_LIMIT_EXCEEDED');
   const pool=[];
   for(const c of fr.first_eight_neutral_distinct_mints){
    ok(Date.parse(c.observed_at_utc)<=at,'FUTURE_EARLY_TOKEN');
    const f=c.asof_features;
    for(const banned of ['rugged','peak_rs','outcome_status','flag_curve_drained'])
      ok(!(banned in f),'FUTURE_OUTCOME_FIELD_IN_INPUT');
    const decision=evaluateAsOfCandidate(f);
    if(decision.verdict==='RISK_REJECT')risk++;
    if(decision.verdict==='RESEARCH_ONLY')research++;
    if(decision.verdict==='WATCH_FOR_INDEPENDENT_PROOFS')pool.push({
      mint:f.mint,score_not_a_probability:decision.score,asof_buys:f.f_n_buys,
      virtual_stress_usdc_not_order:stressNotional(f.f_n_buys,decision.score)});
   }
   pool.sort((a,b)=>b.score_not_a_probability-a.score_not_a_probability||a.mint.localeCompare(b.mint));
   if(pool.length){watch++;mints.add(pool[0].mint)}
   checks.push({day_utc:day,virtual_asof_utc:fr.at_utc,
     frame_sha256:sha(JSON.stringify(fr)),chosen_frequency:level,
     sampled_early_activity_rows:fr.sampled_feature_rows,
     action:pool.length?'WATCH_NO_ORDER_EXECUTION_UNPROVEN':'NO_TRADE_RESEARCH_ONLY',
     top_watch_candidates:pool.slice(0,3),actual_gpt_calls_at_historical_time:0,
     actual_paper_buy_hold_sell_fills:0,
     missing_required_execution_proofs:MISSING});
  }
  daily.push({day_utc:day,status:'HISTORIC_ASOF_EARLY_FEATURES_AVAILABLE',scans:num,
    watch_scans:watch,risk_rejects:risk,research_only:research,
    unique_watch_mints_selected:mints.size,verified_buy:0,verified_hold:0,verified_sell:0,
    pnl_test_usdc:null});
 }
 const available=daily.filter(x=>x.status==='HISTORIC_ASOF_EARLY_FEATURES_AVAILABLE');
 ok(available.length===43,'EXPECTED_43_AVAILABLE_DAYS');
 return {summary:{schema:'r29_gpt_authored_asof_research_proxy_v1',policy_id:POLICY_ID,
  period_start_utc:isoDay(START),period_end_utc:isoDay(START+59*86400000),
  days:60,days_with_historical_features:available.length,days_without_features:17,
  source_hourly_frames:available.length*24,policy_proxy_scans:checks.length,
  watch_scan_signals:available.reduce((n,x)=>n+x.watch_scans,0),
  rejected_due_to_risk_in_scanned_sample:available.reduce((n,x)=>n+x.risk_rejects,0),
  actual_gpt_model_calls_at_original_historical_times:0,
  proven_gpt_buy_fills:0,proven_gpt_hold_actions:0,proven_gpt_sell_fills:0,
  valid_60_day_buy_hold_sell_pnl_test_usdc:null,source_data_gaps_are_unknown_not_no_trade:true,
  result_is_model_policy_proxy_not_full_gpt_backtest:true,
  current_paper_ledger_modified:false,real_trading_enabled:false,
  missing_proofs:MISSING,base_artifact_run_id:43944372099},daily,checks};
}
function write(report,outdir){
 mkdirSync(outdir,{recursive:true});
 writeFileSync(join(outdir,'R29_60D_POLICY_PROXY_SUMMARY.json'),JSON.stringify(report.summary,null,2)+'\n');
 const hd=['day_utc','source_status','policy_proxy_scans','watch_scans','risk_rejected','research_only',
 'verified_buy','verified_hold','verified_sell','verified_pnl_test_usdc'];
 const lines=[hd.join(',')];
 for(const x of report.daily)lines.push([
 x.day_utc,x.status,x.scans,x.watch_scans??'',x.risk_rejects??'',x.research_only??'',
 x.verified_buy,x.verified_hold,x.verified_sell,'UNKNOWN'].join(','));
 writeFileSync(join(outdir,'R29_60D_POLICY_PROXY_DAILY.csv'),lines.join('\n')+'\n');
 writeFileSync(join(outdir,'R29_60D_POLICY_PROXY_CHECKS.jsonl'),
  report.checks.map(x=>JSON.stringify(x)).join('\n')+'\n');
}
if(process.argv[1]?.endsWith('gpt-authored-60d-policy-proxy.mjs')){
 try{
  const args=process.argv.slice(2),i=args.indexOf('--frames'),j=args.indexOf('--matrix'),k=args.indexOf('--out');
  ok(i>=0&&j>=0&&k>=0&&args[i+1]&&args[j+1]&&args[k+1],'USAGE: --frames DIR --matrix CSV --out DIR');
  const r=replay(args[i+1],readFileSync(args[j+1],'utf8'));write(r,args[k+1]);
  console.log('R29_GPT_AUTHORED_POLICY_PROXY',JSON.stringify(r.summary));
 }catch(e){console.error('R29_POLICY_PROXY_ERROR',e.message);process.exitCode=1;}
}
