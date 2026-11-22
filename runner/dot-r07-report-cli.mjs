// Read-only 61-day R07 research status joiner; no orders and no PnL.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {R07_ROLES,summarizeR07Reports,validR07CandidateId} from './dot-r07-report-audit.mjs';
const root=new URL('../research/historical/R07/',import.meta.url);
export function loadR07Files(read=readFileSync){
 return Object.fromEntries(R07_ROLES.map(role=>[role,JSON.parse(read(new URL(role+'.json',root),'utf8'))]));
}
export function assembleR07Timeline(byRole){
 const audit=summarizeR07Reports(byRole),days=[];
 const start=Date.parse('2024-09-10T00:00:00Z');
 for(let i=0;i<61;i++){
  const day=new Date(start+i*86400000).toISOString().slice(0,10);
  const rows=R07_ROLES.map(role=>{
   const r=byRole?.[role],found=(Array.isArray(r?.daily_findings)?r.daily_findings:[])
     .find(x=>x.virtual_day_utc===day);
   return {role,reported:!!found,claimed_candidates:Array.isArray(found?.candidates)?
     found.candidates.filter(c=>validR07CandidateId(typeof c==='string'?c:c?.candidate_id)):[],
    claims_only:true};
  });
  const first_discover_claims=R07_ROLES.flatMap(role=>((Array.isArray(byRole?.[role]?.first_discovers)?
    byRole[role].first_discovers:[]).filter(x=>x.first_valid_day_utc===day&&validR07CandidateId(x.candidate_id))
    .map(x=>({role,candidate_id:x.candidate_id,decision:x.decision||'UNSPECIFIED'}))));
  days.push({virtual_day_utc:day,role_coverage:rows,first_discover_claims,
    verified_historical_buy_executions:0,verified_historical_sell_executions:0});
 }
 return {schema:'dot_r07_merged_daily_timeline.v1',audit,daily:days,
  warning:'This merges self-reported historical research, NOT verified historical performance'};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
 console.log(JSON.stringify(assembleR07Timeline(loadR07Files()),null,2));
