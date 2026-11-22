// Dot2 V1.9: bounded multi-chain, multi-page plan for one existing capture job.
// This is ONLY discovery scheduling: no data fetch, GPT call or trading decision.
import {chooseNextDiscoveryPage} from './discovery-page-scheduler.mjs';
const NETWORKS=new Set(['solana','base','ethereum','bsc','robinhood','cronos']);
const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function planMultiChainCapture({networks,checkpoints={},budget=1,asOfUtc}={}){
 const now=time(asOfUtc);
 if(!Array.isArray(networks)||!networks.length||networks.some(x=>!NETWORKS.has(x))
   ||new Set(networks).size!==networks.length||networks.length>6
   ||!Number.isInteger(budget)||budget<1||budget>12||now===null
   ||!checkpoints||typeof checkpoints!=='object')
   throw Error('INVALID_V19_DISCOVERY_CAPTURE_PLAN');
 const gaps=[],chains=[];
 for(const [order,chain] of networks.entries()){
   const cp=checkpoints[chain+':GECKOTERMINAL']||null;
   const retryAfter=time(cp?.retry_after_utc);
   if(retryAfter!==null&&retryAfter>now){
     gaps.push({chain,reason:'RATE_LIMIT_COOLDOWN',resume_not_before_utc:new Date(retryAfter).toISOString()});
     continue;
   }
   const last=time(cp?.last_attempt_at_utc);
   const d=chooseNextDiscoveryPage(cp);
   const primary=d.page,secondary=primary===1
     ? Math.max(2,Number.isInteger(cp?.next_page_to_consider)?cp.next_page_to_consider:2)
     : 1;
   chains.push({chain,original_order:order,last_attempt_ms:last??-Infinity,
     primary,secondary,reason:d.reason});
 }
 // A repeatedly fetched chain becomes newer in its persistent checkpoint,
 // so other chains win next time. Within this request use each once first.
 chains.sort((a,b)=>a.last_attempt_ms-b.last_attempt_ms
   ||a.original_order-b.original_order);
 const tasks=[],covered=new Set();
 for(const c of chains){
   if(tasks.length>=budget)break;
   tasks.push({chain:c.chain,page:c.primary,priority:'FAIR_CHAIN_BASELINE',reason:c.reason});
   covered.add(c.chain);
 }
 // Only spend surplus on a second page for chains already covered.
 for(const c of chains){
   if(tasks.length>=budget)break;
   if(!covered.has(c.chain)||c.secondary===c.primary)continue;
   tasks.push({chain:c.chain,page:c.secondary,priority:'BACKLOG_OR_FRESH_COMPLEMENT',
     reason:c.secondary===1?'REFRESH_NEW_POOLS':'RESUME_UNSEEN_PAGE'});
 }
 return {schema:1,kind:'R29_V19_BOUND_MULTI_CHAIN_PLAN',
   at_utc:new Date(now).toISOString(),requested_budget:budget,
   scheduled_requests:tasks.length,task_cap_per_chain:2,
   tasks,not_scheduled:[...gaps,...chains.filter(x=>!covered.has(x.chain))
     .map(x=>({chain:x.chain,reason:'WAIT_NEXT_BUDGET_WINDOW'}))],
   coverage_claim:'BUDGETED_SAMPLE_NOT_WHOLE_MARKET',
   discovery_only:true,orders_authorized:0};
}
