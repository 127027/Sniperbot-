// R29 SYS-11 / QA-03: read-only, point-in-time preflight for staged capture.
// No HTTP request, no git commit, no signal, no GPT or wallet operation.
// "READY" means it is legal to TRY a rate-limited request, NOT HTTP200.
import {activeGeckoProviderCooldown} from './v19-gecko-provider-cooldown.mjs';
import {inspectProviderBudget} from './v19-provider-budget.mjs';
import {planMultiChainCapture} from './v19-discovery-budget-plan.mjs';
import {summarizeCumulativeScanProgress} from './v19-cumulative-scan-progress.mjs';
const CHAINS=new Set(['solana','base','ethereum','bsc','robinhood','cronos']);
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const unique=x=>new Set(x).size===x.length;
const iso=t=>new Date(t).toISOString();

export function planResearchRestart({
 memory,pageCoverage,providerBudget,olderState=null,ohlcvState=null,
 chainService=null,
 networks=['solana','base','ethereum','bsc','robinhood','cronos'],
 asOfUtc,maxNewPoolPages=1,targetPagesPerChain=10
}={}){
 const at=ms(asOfUtc);
 if(at===null||memory?.kind!=='R29_PERSISTENT_MARKET_MEMORY'
  ||!memory.checkpoints||typeof memory.checkpoints!=='object'
  ||pageCoverage?.kind!=='R29_V19_OFFSET_PAGE_COVERAGE'
  ||providerBudget?.kind!=='R29_V19_PERSISTENT_PROVIDER_BUDGET'
  ||!Array.isArray(networks)||networks.length===0
  ||networks.length>6||!unique(networks)||networks.some(c=>!CHAINS.has(c))
  ||!Number.isInteger(maxNewPoolPages)||maxNewPoolPages<1||maxNewPoolPages>12
  ||!Number.isInteger(targetPagesPerChain)||targetPagesPerChain<1
  ||targetPagesPerChain>1000)
   throw Error('INVALID_RESEARCH_RESTART_PREFLIGHT');

 // The shared 429 gate applies across new-pool, trending and OHLCV endpoints.
 const inherited=activeGeckoProviderCooldown({
  checkpoints:memory.checkpoints,
  olderCheckpoints:olderState?.checkpoints||{},
  ohlcvMarkets:ohlcvState?.markets||{},
  atUtc:asOfUtc
 });
 // The persistent provider limiter also tracks rolling-window starts and
 // conservative bucket reservations. Checking does NOT reserve or consume one.
 const request=inspectProviderBudget({
  state:providerBudget,provider:'GECKOTERMINAL',lane:'NEW_POOLS',
  asOfUtc,requestId:'offline-preflight-only-no-request'
 });
 const blockers=[];
 if(inherited.active)blockers.push({
  reason:'HISTORICAL_PROVIDER_429_COOLDOWN',
  retry_not_before_utc:inherited.retry_not_before_utc
 });
 if(!request.allowed)blockers.push({
  reason:request.reason,retry_not_before_utc:request.retry_not_before_utc
 });
 const retryMs=blockers.map(x=>ms(x.retry_not_before_utc)).filter(x=>x!==null&&x>at);
 const retry=retryMs.length?iso(Math.max(...retryMs)):null;
 // Planning is allowed while blocked; execution is not.
 const plan=planMultiChainCapture({
  networks,checkpoints:memory.checkpoints,pageCoverage,
  budget:maxNewPoolPages,asOfUtc,chainService
 });
 const progress=summarizeCumulativeScanProgress({
  coverage:pageCoverage,networks,targetPagesPerChain,asOfUtc
 });
 const eligible=blockers.length===0&&plan.tasks.length>0;
 const status=eligible?'READY_TO_ATTEMPT_BOUNDED_RESEARCH':
  blockers.some(x=>x.reason==='HISTORICAL_PROVIDER_429_COOLDOWN'
   ||x.reason==='PROVIDER_COOLDOWN')?'WAIT_PERSISTED_PROVIDER_COOLDOWN':
  blockers.some(x=>x.reason==='ROLLING_WINDOW_BUDGET')?'WAIT_ROLLING_WINDOW':
  'NO_CURRENTLY_ELIGIBLE_PAGE';
 return {
  schema:1,kind:'R29_V19_OFFLINE_RESEARCH_RESTART_PREFLIGHT',
  as_of_utc:iso(at),status,can_issue_provider_http_now:eligible,
  not_before_utc:retry,provider_reasons:blockers,
  // Plan does not prove a page was actually fetched.
  proposed_bounded_sample:plan.tasks,
  first_attempt_if_authorized:eligible?plan.tasks[0]:null,
  requested_chains:networks,proposed_page_budget:maxNewPoolPages,
  unscheduled_chains:[...plan.unscheduled_chains_due_to_budget,
   ...plan.unscheduled_chains_due_to_cooldown],
  waiting_chain_pages:networks.flatMap(chain=>
   (pageCoverage.chains?.[chain]?.pending_pages||[]).map(page=>({chain,page}))),
  cumulative_fixed_sample:progress,
  previously_discovered_pool_count:Object.keys(memory.pools||{}).length,
  actual_http_starts:0,actual_http_200:0,actual_gpt_reviews:0,
  paper_orders_created:0,real_orders_created:0,
  global_memecoin_market_coverage_pct:null,
  provider_200_or_429_not_guaranteed:true,
  no_network_no_persistent_write:true
 };
}
