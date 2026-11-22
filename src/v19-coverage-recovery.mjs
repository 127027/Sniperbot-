// R29 V1.9: a DATA_GAP is a request for coverage, NOT evidence of a quiet market.
// This module is shared by Dot1 current-mode and historical point-in-time replay.
const chains=Object.freeze(['solana','base','ethereum','bsc','robinhood','cronos']);
const clock=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function planDataGapRecovery({asOfUtc,activityObservations=[],
 networks=chains,maxRequests=6,staleAfterMinutes=60}={}){
 const now=clock(asOfUtc);
 if(now===null||!Array.isArray(activityObservations)||!Array.isArray(networks)
   ||!networks.length||networks.some(x=>!chains.includes(x))
   ||new Set(networks).size!==networks.length
   ||!Number.isInteger(maxRequests)||maxRequests<0||maxRequests>12
   ||!Number.isFinite(staleAfterMinutes)||staleAfterMinutes<=0)
   throw Error('INVALID_DOT1_COVERAGE_RECOVERY');
 const valid=activityObservations.filter(o=>{
   const observed=clock(o?.observed_at_utc),archived=clock(o?.archived_at_utc);
   return observed!==null&&archived!==null
     &&archived>=observed&&observed<=now&&archived<=now
     &&['CONTEMPORANEOUS_RECORD','SYNTHETIC_TEST'].includes(o.provenance)
     &&o.metrics?.dataAvailable===true;
 });
 const findings=networks.map(chain=>{
   const source=valid.filter(x=>x.chain===chain||x.network===chain)
     .sort((a,b)=>Date.parse(b.observed_at_utc)-Date.parse(a.observed_at_utc))[0];
   const latest=source?.observed_at_utc??null;
   const age=latest===null?null:Math.max(0,now-Date.parse(latest))/60000;
   return {chain,coverage_status:age===null?'NO_VERIFIABLE_ACTIVITY_SAMPLE':
     age>staleAfterMinutes?'STALE_ACTIVITY_SAMPLE':'RECENT_ACTIVITY_SAMPLE',
     last_observed_at_utc:latest,last_observation_age_minutes:age,
     market_calm_proven:false};
 });
 const gaps=findings.filter(x=>x.coverage_status!=='RECENT_ACTIVITY_SAMPLE')
   .sort((a,b)=>(b.last_observation_age_minutes??Infinity)
     -(a.last_observation_age_minutes??Infinity)
     ||networks.indexOf(a.chain)-networks.indexOf(b.chain));
 const recommendations=gaps.slice(0,maxRequests).map(x=>({
   chain:x.chain,action:'CAPTURE_NEW_POOLS_AND_RESUME_PAGE_CURSOR',
   reason:x.coverage_status,requires_new_provider_request:true,
   status:'RECOMMENDED_NOT_YET_EXECUTED',orders_authorized:0}));
 return {schema:1,kind:'R29_V19_DOT1_DATA_GAP_RECOVERY',
  as_of_utc:asOfUtc,network_count:networks.length,
  recently_observed_chains:findings.length-gaps.length,
  missing_or_stale_chains:gaps.length,findings,
  recommended_capture_requests:recommendations,
  deferred_recovery_requests:Math.max(0,gaps.length-recommendations.length),
  provider_api_requests_performed:0,actual_gpt_reviews_performed:0,
  trading_enabled:false,
  meaning:'DATA_GAP means missing observations, not low volatility or low demand.'};
}
