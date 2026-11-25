import {fallbackPlan} from './hourly-fallback.mjs';
import {buildHour,exactIdentity} from './r46-strategy.mjs';
import {preparePublication} from './publisher.mjs';
// Fallback is NOT an AI adjudicator; no new executable orders.
export function r46FallbackPlan(input){
 const baseline=fallbackPlan(input),groups=new Map(),t=Date.parse(input.published);
 for(const report of input.reports)for(const d of [...(report.data.research_decisions??report.data.decisions??[]),...(report.data.strategy_assessments??[]),...(report.data.discovery_leads??[])]){
  let k;try{k=exactIdentity(d)}catch{continue}
  const source=d.source_url??d.pool_url,when=d.source_observed_at_utc??d.source_quote_time??d.observed_at_utc;
  const s=d.strategy??d.action;
  const evidence=typeof source==='string'&&typeof when==='string'&&Date.parse(when)<=t?[{source_url:source,observed_at_utc:when}]:[];
  const previous=groups.get(k);if(previous?.evidence.length&&!evidence.length)continue;
  groups.set(k,{coin:d.coin??d.contract,chain:d.chain,contract:d.contract,strategy:'NO_ACTION',assessment_status:evidence.length?'PROVISIONAL':'NOT_ASSESSED',thesis:['BUY','SELL'].includes(s)?s:null,evidence,reason:'Primary close unavailable; role indications only, no independently adjudicated strategy or execution quote.'});
 }
 const sidecar=buildHour({registry:input.registry,index:input.index,positions:input.priorFinal.paper_ledger.positions,priorUniverse:input.universe.coins,assessments:[...groups.values()],target_utc:input.target,decision_at_utc:input.published});
 if(!sidecar.v1_projection)throw Error('R46_V1_CAPACITY_INCIDENT');
 const plan=preparePublication({previous:input.previous,universe:input.universe,decisions:sidecar.v1_projection,target_utc:input.target,published_at_utc:input.published,expires_at_utc:new Date(Date.parse(input.target)+900000).toISOString()});
 const final={...baseline.final,research_decisions:plan.signal.decisions,strategy_summary:sidecar.summary,learning_note:'Fallback: primary analyst did not publish; investigate source coverage and missing roles. No conclusions about profitability or new trades.',peer_assessment:'R46 deterministic nonexecuting fallback; coverage is not completed research.',notes:'R46 fallback; no new orders.'};
 return {...baseline,plan,final,sidecar};
}
