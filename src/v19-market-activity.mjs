// R29 V1.9 Dot1: comparable as-of pool activity across chains/pages.
// A single page is a sampled window, NOT a full-market daily count.
// Public capture and forward-only synthetic research only. No orders / no GPT API.
import {canonicalChain,poolValid} from './market-evidence.mjs';
import {asOfMillis,classifyAsOfEvidence} from './v19-asof-evidence.mjs';

const DEFAULT_CHAINS=Object.freeze(['solana','base','ethereum','bsc','robinhood','cronos']);
const key=(chain,pool)=>chain+':'+(chain==='solana'?pool:String(pool).toLowerCase());
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const freshTime=x=>asOfMillis(x);

export function measureDot1Activity({
 pageCaptures=[],asOfUtc,networks=DEFAULT_CHAINS,
 windowMinutes=60,maxFreshAgeMinutes=90,minComparisonMinutes=15,
 maxComparisonMinutes=240,eligible=0,openPositions=0
}={}){
 const now=asOfMillis(asOfUtc);
 if(now===null||!Array.isArray(pageCaptures)||!Array.isArray(networks)
   ||!networks.length||new Set(networks).size!==networks.length
   ||networks.some(c=>!DEFAULT_CHAINS.includes(c))
   ||![windowMinutes,maxFreshAgeMinutes,minComparisonMinutes,maxComparisonMinutes].every(
       n=>Number.isInteger(n)&&n>0)
   ||minComparisonMinutes>maxComparisonMinutes
   ||![eligible,openPositions].every(n=>Number.isInteger(n)&&n>=0))
   throw Error('INVALID_DOT1_MARKET_ACTIVITY_INPUT');
 const grouped=new Map(),excluded=[];
 for(const [index,capture] of pageCaptures.entries()){
   if(capture?.kind!=='R29_V19_GECKO_PAGE_ACTIVITY_CAPTURE'
     ||!networks.includes(capture.chain)
     ||!Number.isInteger(capture.page)||capture.page<1
     ||!Array.isArray(capture.candidates)){
     excluded.push({index,reason:'INVALID_CAPTURE_SCHEMA'});continue;
   }
   const verdict=classifyAsOfEvidence({
     source_class:capture.source_class,
     event_at_utc:capture.captured_at_utc,
     observed_at_utc:capture.captured_at_utc,
     archived_at_utc:capture.captured_at_utc,
     available_at_utc:capture.available_at_utc??capture.captured_at_utc
   },{asOfUtc});
   if(!['PROVISIONAL_ASOF','SYNTHETIC_REGRESSION_ONLY'].includes(verdict.status)){
     excluded.push({index,reason:verdict.reason});continue;
   }
   const group=capture.chain+':'+capture.page;
   if(!grouped.has(group))grouped.set(group,[]);
   grouped.get(group).push(capture);
 }
 // A stable page pair needs separate real capture times. Compare exact
 // token/pool IDs, never sorted row numbers or future winners.
 const currentPages=[],comparisons=[],chainStatus=[];
 const uniqueNew=new Set(),observedNow=new Set(),countedVolume=new Set();
 let rejectedWinnerFields=0;
 let prevVolume=0,newVolume=0,volumePairs=0;
 for(const chain of networks){
   const available=[...grouped.entries()].filter(([k])=>k.startsWith(chain+':'))
     .map(([_,rows])=>rows).flat();
   const pages=new Map();
   for(const row of available){
     if(!pages.has(row.page))pages.set(row.page,[]);
     pages.get(row.page).push(row);
   }
   let comparable=0,recent=0,selected=0;
   for(const [page,history] of pages){
     history.sort((a,b)=>freshTime(a.captured_at_utc)-freshTime(b.captured_at_utc));
     const current=[...history].reverse().find(x=>now-freshTime(x.captured_at_utc)
       <=maxFreshAgeMinutes*60000);
     if(!current)continue;
     selected++;recent++;
     const at=freshTime(current.captured_at_utc);
     const earlier=[...history].reverse().find(x=>{
       const delta=at-freshTime(x.captured_at_utc);
       return delta>=minComparisonMinutes*60000
         &&delta<=maxComparisonMinutes*60000;
     });
     const normalise=x=>{
       const m=new Map();
       for(const candidate of x.candidates){
         if(candidate&&typeof candidate==='object'&&(
           'reported_gain_pct' in candidate||'future_winner_label' in candidate
           ||'post_event_rank' in candidate||candidate.source_class==='POST_EVENT_ORACLE')){
           rejectedWinnerFields++;continue;
         }
         const c=canonicalChain(candidate?.chain??chain);
         if(c!==chain||!poolValid(chain,candidate?.pool,candidate?.pool_kind))continue;
         const id=key(chain,candidate.pool);
         const vol=positive(candidate.volume_24h_usd)?candidate.volume_24h_usd:null;
         const created=freshTime(candidate.pool_created_at_utc);
         m.set(id,{volume:vol,created:created!==null&&created<=at?created:null});
       }
       return m;
     };
     const curr=normalise(current);
     currentPages.push({chain,page,captured_at_utc:current.captured_at_utc,
       known_pools:curr.size,previous_comparable_capture_at_utc:earlier?.captured_at_utc??null});
     for(const [id,row] of curr){
       observedNow.add(id);
       if(row.created!==null&&row.created>now-windowMinutes*60000)
         uniqueNew.add(id);
     }
     if(earlier){
       comparable++;
       const prior=normalise(earlier);
       for(const [id,row] of curr){
         const old=prior.get(id);
         if(!countedVolume.has(id)&&old?.volume!==null&&old?.volume!==undefined
           &&old.volume>0&&row.volume!==null){
           prevVolume+=old.volume;newVolume+=row.volume;volumePairs++;countedVolume.add(id);
         }
       }
       comparisons.push({chain,page,current_at_utc:current.captured_at_utc,
         previous_at_utc:earlier.captured_at_utc,shared_pools:[...curr.keys()]
           .filter(id=>prior.has(id)).length});
     }
   }
   chainStatus.push({chain,recent_pages:recent,comparable_pages:comparable,
     covered_for_comparable_panel:recent>0&&comparable===recent});
 }
 const activeChains=chainStatus.filter(x=>x.recent_pages>0).length;
 const comparablePanel=activeChains===networks.length
   &&chainStatus.every(x=>x.covered_for_comparable_panel);
 const volumeChangePct=volumePairs>0&&prevVolume>0
   ?100*(newVolume/prevVolume-1):0;
 // Missing panels permit risk-aware UPshifts on positive observed evidence,
 // but may NOT be interpreted as a market calm enough to downshift.
 const metrics={dataAvailable:currentPages.length>0,newPools:uniqueNew.size,
   eligible,volumeChangePct,openPositions,
   comparableWindowComplete:comparablePanel,allowDownshift:comparablePanel,
   observed_volume_pairs:volumePairs,
   metric_scope:'DETECTED_RECENT_CREATIONS_AND_MATCHED_PAGE_VOLUME_ONLY'};
 return {schema:1,kind:'R29_V19_DOT1_MARKET_ACTIVITY',
   as_of_utc:asOfUtc,window_minutes:windowMinutes,metrics,
   current_page_captures:currentPages.length,observed_unique_pools:observedNow.size,
   observed_newly_created_pools:uniqueNew.size,
   comparable_page_pairs:comparisons.length,active_chains:activeChains,
   chains_requested:networks.length,chain_coverage:chainStatus,
   comparable_panel_complete:comparablePanel,
   pages:currentPages,comparisons,excluded,rejected_post_event_candidate_rows:rejectedWinnerFields,
   market_universe_complete:false,
   market_quiet_confirmed:false,
   no_future_winner_labels_used:true,
   trading_authorized:false,actual_gpt_reviews:0};
}
