// Evidence-driven risk worklist for the existing Dot3. NOT a trading signal.
// A current capture alone cannot establish a token is safe to sell.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const ts=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const n=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const one=(obj)=>obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:{};
const canonical=(c,x)=>c==='solana'?x:String(x).toLowerCase();
const STAGES=[
 'IDENTITY_UNVERIFIED','MISSING_INDEPENDENT_QUOTE','PROVIDER_PRICE_CONFLICT',
 'LOW_OR_UNKNOWN_LIQUIDITY','PRICE_PROVIDER_TIME_UNKNOWN','STALE_CAPTURE','SELLABILITY_UNVERIFIED',
 'READY_FOR_DOT3_SECURITY_REVIEW'
];
export function buildRiskRecheckQueue({report,asOfUtc,limit=50,maxCaptureAgeMinutes=10}={}){
 const at=ts(asOfUtc);
 if(at===null||!Number.isInteger(limit)||limit<0||limit>500||!Number.isFinite(maxCaptureAgeMinutes)||maxCaptureAgeMinutes<=0)throw Error('INVALID_RISK_WORKLIST_PARAMS');
 if(!Array.isArray(report?.candidates))throw Error('MISSING_DOT3_CANDIDATES');
 const all=report.candidates.map((raw,i)=>{
  const c=one(raw),chain=canonicalChain(c.chain);
  const issues=[];
  if(!chain||!poolValid(chain,c.pool)||!tokenValid(chain,c.contract))issues.push('IDENTITY_UNVERIFIED');
  const a=one(c.gecko),b=one(c.dex);
  const quoteTimes=[ts(a.captured_at_utc),ts(b.captured_at_utc)];
  const fresh=quoteTimes.every(v=>v!==null&&v<=at&&(at-v)<=maxCaptureAgeMinutes*60000);
  const quoted=(n(a.price_usd)??0)>0&&(n(b.price_usd)??0)>0
   &&a.url&&b.url&&a.url!==b.url&&b.identity_verified===true;
  if(!quoted)issues.push('MISSING_INDEPENDENT_QUOTE');
  const prices=quoted?[a.price_usd,b.price_usd]:[];
  const drift=prices.length===2?Math.abs(prices[0]-prices[1])/((prices[0]+prices[1])/2)*100:null;
  if(drift!==null&&drift>3)issues.push('PROVIDER_PRICE_CONFLICT');
  const liq=[n(a.liquidity_usd),n(b.liquidity_usd)];
  if(liq.some(v=>v===null||v<5000))issues.push('LOW_OR_UNKNOWN_LIQUIDITY');
  const providerUpdated=[ts(a.provider_quote_asof_utc),ts(b.provider_quote_asof_utc)];
  if(providerUpdated.some(v=>v===null||v>at))issues.push('PRICE_PROVIDER_TIME_UNKNOWN');
  if(!fresh)issues.push('STALE_CAPTURE');
  if(!c.security_verified||!c.sellability_verified)issues.push('SELLABILITY_UNVERIFIED');
  if(issues.length===0)issues.push('READY_FOR_DOT3_SECURITY_REVIEW');
  const riskCodes=Array.isArray(c.risk_codes)?c.risk_codes.filter(s=>typeof s==='string'):[];
  // Stable grouping: high information value (two matched sources) before missing data.
  const score= (chain&&poolValid(chain,c.pool)&&tokenValid(chain,c.contract)?10:0)
   +(quoted?15:0)+(drift!==null&&drift<=3?15:0)
   +(liq.every(v=>v!==null&&v>=5000)?10:0)
   +(fresh?5:0)-(drift!==null&&drift>3?10:0);
  return {index:i,symbol:c.symbol||null,chain:chain||null,pool:c.pool||null,
   contract:c.contract||null,score,previous_status:c.status||'UNKNOWN',
   source_dot3_updated_utc:report.updated_at_utc||null,
   verified_pair_identity:b.identity_verified===true,
   independent_quote_captured:fresh&&quoted,
   price_disagreement_pct:drift,
   risk_blockers:issues,original_risk_codes:riskCodes,
   next_action:!fresh?'REFRESH_TWO_EXACT_POOL_SOURCES':
    issues.includes('IDENTITY_UNVERIFIED')?'VERIFY_TOKEN_IDENTITY':
    issues.includes('PROVIDER_PRICE_CONFLICT')?'RECHECK_PRICE_DISAGREEMENT':
    issues.includes('MISSING_INDEPENDENT_QUOTE')?'FIND_MATCHING_SECOND_QUOTE':
    issues.includes('LOW_OR_UNKNOWN_LIQUIDITY')?'RECHECK_BOTH_LIQUIDITY_SOURCES':
    issues.includes('PRICE_PROVIDER_TIME_UNKNOWN')?'VERIFY_PROVIDER_QUOTE_TIME':
    'GET_INDEPENDENT_SELLABILITY_HONEYPOT_TAX_PROOF',
   eligible_for_buy:false,authorization:'NEVER_PUBLISH_ORDER_FROM_THIS_WORKLIST'};
 });
 all.sort((a,b)=>b.score-a.score||a.index-b.index);
 const counts=Object.fromEntries(STAGES.map(x=>[x,all.filter(v=>v.risk_blockers.includes(x)).length]));
 return {schema:1,kind:'DOT3_EVIDENCE_RECHECK_QUEUE',as_of_utc:asOfUtc,
  source_dot3_updated_utc:report.updated_at_utc||null,
  scanned_candidate_count:all.length,prior_status_counts:report.counts||null,
  counts,worklist:all.slice(0,limit),backlog_count:Math.max(0,all.length-limit),
  actual_eligible_from_worklist:0,actual_orders:0,
  boundary:'This is evidence triage, NOT a risk certification. No wallet, order, false quote, or sellability inference.'};
}
