// Public five-role research → LOCAL, READ-ONLY work queue and indicative paper
// budget envelope. This module NEVER generates commands, signed decisions,
// probabilities, portfolio mutations, fills or wallet actions.
import {candidateId} from './research-watchlist.mjs';

export const RESEARCH_ROLE_IDS=Object.freeze([
 'news_discovery','social_acceleration','onchain_liquidity','contract_security','opportunity_qa'
]);
const PRIORITY={HIGH:0,NORMAL:1,LOW:2};
const REVIEW_LIMIT=18;
const CHECKS=Object.freeze(['INDEPENDENT_CONTRACT_AUDIT','LP_CONTROL_VERIFICATION',
 'HOLDER_CLUSTER_VERIFICATION','ORGANIC_HYPE_EVIDENCE',
 'NON_EXECUTING_SIZE_SPECIFIC_SELL_QUOTE','FIVE_INDEPENDENT_SIGNED_YES']);
const safeString=(value,max=500)=>typeof value==='string'?value.slice(0,max):'';
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
function keyOf(c){
 if(!c||typeof c!=='object')return null;
 try{
  const id=candidateId(c.chain,c.token_address,c.pool_address);
  return c.candidate_id===id?id:null;
 }catch{return null}
}
function cleanUrls(value){
 if(!Array.isArray(value))return [];
 return [...new Set(value.filter(u=>typeof u==='string'&&u.length<=900&&
  /^https:\/\/[^\s@/]+(?:\/|$)/i.test(u)))].slice(0,12);
}
function safeFlags(value){
 if(!Array.isArray(value))return [];
 return [...new Set(value.filter(x=>typeof x==='string'&&x.length<=120))].slice(0,30);
}
function sourceHosts(urls){
 const hosts=[];
 for(const u of urls){try{const host=new URL(u).hostname.toLowerCase();
  if(!hosts.includes(host))hosts.push(host)}catch{}}
 return hosts;
}
function candidateEntry(c){
 const id=keyOf(c);if(!id)return null;
 return {candidate_id:id,chain:c.chain,token_address:c.token_address,
  pool_address:c.pool_address};
}
function envelope(settings){
 const min=settings?.minTrade,max=settings?.maxTrade;
 const free=(settings?.cashUsdc??0)+(settings?.cashEur??0);
 if(!Number.isFinite(min)||!Number.isFinite(max)||!Number.isFinite(free)||
  min<=0||max<min||free<0)return {minimum_test_usdc:null,maximum_test_usdc:null,available:false};
 const lower=free>=min?min:null;
 const upper=free>=min?Math.floor(Math.min(free,max)*100)/100:null;
 return {minimum_test_usdc:lower,maximum_test_usdc:upper,available:lower!==null};
}
export function buildResearchAdvisories({roles=[],watchlist=null,settings=null,
 now=Date.now(),limit=REVIEW_LIMIT}={}){
 if(!Array.isArray(roles)||!Number.isFinite(now)||!Number.isInteger(limit)||limit<1||limit>50)
  throw Error('INVALID_RESEARCH_ADVISORY_INPUT');
 const notes=new Map();
 function ensure(c){
  const val=candidateEntry(c);
  if(!val)return null;
  if(!notes.has(val.candidate_id)){
   notes.set(val.candidate_id,{...val,source_urls:[],risk_flags:[],unresolved_checks:[],
    watchlist_state:'NOT_LISTED',priority:'NORMAL',first_seen_at_utc:null,
    research_reason:'',roles_reporting:[],role_sources:{},last_observed_at_utc:null});
  }
  return notes.get(val.candidate_id);
 }
 for(const c of watchlist?.candidates||[]){
  const n=ensure(c);if(!n)continue;
  n.watchlist_state=['NEW','WATCH','DEEP_REVIEW','DORMANT','REJECTED','ARCHIVED'].includes(c.state)?c.state:'UNKNOWN';
  n.priority=Object.hasOwn(PRIORITY,c.priority)?c.priority:'NORMAL';
  n.first_seen_at_utc=validDate(c.first_seen_at_utc)?c.first_seen_at_utc:null;
  n.research_reason=safeString(c.reason,400);
  n.source_urls=cleanUrls(c.source_urls);
  n.unresolved_checks=safeFlags(c.unresolved_checks);
 }
 for(const role of roles){
  if(!RESEARCH_ROLE_IDS.includes(role?.role)||role?.stale===true||
   !Array.isArray(role.candidates))continue;
  for(const c of role.candidates.slice(0,500)){
   const n=ensure(c);if(!n||n.roles_reporting.includes(role.role))continue;
   n.roles_reporting.push(role.role);
   const urls=cleanUrls(c.source_urls);
   n.role_sources[role.role]=sourceHosts(urls);
   n.source_urls=cleanUrls([...n.source_urls,...urls]);
   n.risk_flags=[...new Set([...n.risk_flags,...safeFlags(c.risk_flags)])].slice(0,60);
   if(validDate(c.observed_at_utc)&&(!n.last_observed_at_utc||
     Date.parse(c.observed_at_utc)>Date.parse(n.last_observed_at_utc)))
    n.last_observed_at_utc=c.observed_at_utc;
  }
 }
 const amounts=envelope(settings);
 const out=[...notes.values()].map(n=>{
  const providers=sourceHosts(n.source_urls);
  const correlated=n.roles_reporting.length>1&&providers.length<2;
  const hardRiskFlags=n.risk_flags.filter(f=>/RUG|HONEYPOT|SELLABILITY|LP_|MINT|FREEZE|UNKNOWN|STALE|WASH|BLACKLIST|VETO|CONFLICT/i.test(f));
  const checks=[...new Set([...CHECKS,...n.unresolved_checks,...hardRiskFlags])].slice(0,30);
  const skipped=['REJECTED','ARCHIVED'].includes(n.watchlist_state);
  return {...n,roles_reporting:n.roles_reporting.sort((a,b)=>
    RESEARCH_ROLE_IDS.indexOf(a)-RESEARCH_ROLE_IDS.indexOf(b)),
    role_count:n.roles_reporting.length,independent_source_hosts:providers.length,
    correlated_evidence_warning:correlated,required_checks:checks,
    research_status:skipped?'ARCHIVED_OR_REJECTED':n.roles_reporting.length>=3?'PRIORITIZED_REVIEW':'WATCH',
    breakout_probability_pct:null,calibration_status:'NOT_CALIBRATED',
    paper_entry_authorized:false,actionable:false,paper_only:true,
    // Illustrative local user envelope only; not a recommendation or instruction.
    hypothetical_paper_range:amounts,
    execution_block:'REAL_CONTRACT_SELLABILITY_QUOTE_AND_SIGNED_QUORUM_NOT_VERIFIED'};
 }).sort((a,b)=>(a.research_status==='ARCHIVED_OR_REJECTED')-
                 (b.research_status==='ARCHIVED_OR_REJECTED')||
                  PRIORITY[a.priority]-PRIORITY[b.priority]||
                  b.role_count-a.role_count||
                  Date.parse(b.last_observed_at_utc||b.first_seen_at_utc||0)-
                  Date.parse(a.last_observed_at_utc||a.first_seen_at_utc||0)||
                  a.candidate_id.localeCompare(b.candidate_id));
 return {schema:'research_advisories.v1',paper_only:true,actionable:false,
  generated_at_utc:new Date(now).toISOString(),total_unique_candidates:notes.size,
  candidate_limit:limit,
  candidates:out.slice(0,limit),roles_expected:RESEARCH_ROLE_IDS.length,
  verdict:'RESEARCH_ONLY_REAL_VALIDATOR_UNAVAILABLE',
  meaning:'Research mentions are not five independent approvals. Hypothetical amounts are local UI examples, NOT buy recommendations, not orders, and not calibration.',
  next_gate:'Independent contract/LP/holder/sellability audits, five signed YES and fresh size-specific executable paper route are still required.'};
}
