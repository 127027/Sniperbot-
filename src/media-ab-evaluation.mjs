// Prospective A/B research: identical market candidates at the same UTC,
// B adds ONLY independently time-captured explicit contract mentions.
// Named memes or a celebrity alone have zero contract-level bonus.
import {evaluateBlindRankings} from './forward-learning.mjs';
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function makePairedMediaMarketRankings({marketRanking,mediaMemory,bonusPerExactMention=2}={}){
 const at=stamp(marketRanking?.as_of_utc);
 if(marketRanking?.kind!=='R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING'||
  mediaMemory?.kind!=='R29_MEDIA_MEMORY'||at===null||
  !Number.isFinite(bonusPerExactMention)||bonusPerExactMention<0||bonusPerExactMention>10)
  throw Error('INVALID_MEDIA_AB_INPUT');
 const available=Object.values(mediaMemory.events||{}).filter(e=>{
  const pub=stamp(e.published_at_utc),seen=stamp(e.first_captured_at_utc);
  return pub!==null&&seen!==null&&pub<=at&&seen<=at;
 });
 const candidates=Array.isArray(marketRanking.candidates)?marketRanking.candidates:[];
 const combined=candidates.map(c=>{
  const contract=typeof c.contract==='string'?c.contract:null;
  const mentions=contract&&contract.length>=32?available.filter(e=>
   typeof e.headline==='string'&&e.headline.toLowerCase().includes(contract.toLowerCase())):[];
  // One article reposted by news aggregators must not earn a huge multiplier;
  // cap possible effect and keep a stable identical candidate universe.
  const bonus=Math.min(4,mentions.length*bonusPerExactMention);
  return {...c,score:c.score===null?null:c.score+bonus,
   extra_media_score:bonus,explicit_contract_mentions:mentions.length,
   media_evidence_urls:mentions.slice(0,3).map(e=>e.url),
   media_signal_quality:mentions.length?'EXPLICIT_CONTRACT_IN_CAPTURED_HEADLINE':
     'NO_EXPLICIT_CONTRACT_MATCH',
   media_is_not_risk_approval:true};
 });
 combined.sort((a,b)=>(b.score??-Infinity)-(a.score??-Infinity)||a.key.localeCompare(b.key));
 const a=structuredClone(marketRanking),b={...structuredClone(marketRanking),candidates:combined,
  media_source_capture_count:available.length,
  feature_set:'SAME_MARKET_PLUS_CONTRACT_MENTION_ONLY',
  hypothesis_only_not_a_trading_authorization:true};
 const originalKeys=new Set(a.candidates.map(c=>c.key)),combinedKeys=new Set(b.candidates.map(c=>c.key));
 if(originalKeys.size!==combinedKeys.size||[...originalKeys].some(k=>!combinedKeys.has(k)))
  throw Error('MARKET_UNIVERSE_MISMATCH');
 return {schema:1,kind:'R29_A_B_PAIRED_MARKET_MEDIA_RESEARCH',
  as_of_utc:a.as_of_utc,
  market_only:a,market_plus_media:b,
  same_candidate_count:a.candidates.length,
  matched_contract_mentions:combined.reduce((n,c)=>n+c.explicit_contract_mentions,0),
  media_first_capture_after_asof_excluded:true,
  future_labels_used:false,trading_authorized:false};
}
export function evaluatePairedAB({paired,labels,topK=10}={}){
 if(paired?.kind!=='R29_A_B_PAIRED_MARKET_MEDIA_RESEARCH')throw Error('BAD_MEDIA_AB_PAIR');
 const unknown={schema:1,kind:'R29_A_B_FORWARD_EVALUATION',
  at_utc:paired.as_of_utc,market_candidates:paired.same_candidate_count,
  status:'WAIT_FOR_MATURED_FORWARD_LABELS',improvement_proven:false,
  market_only:null,market_plus_media:null};
 if(!labels)return unknown;
 const a=evaluateBlindRankings({ranking:paired.market_only,labels,topK});
 const b=evaluateBlindRankings({ranking:paired.market_plus_media,labels,topK});
 if(a.known_outcomes===0||b.known_outcomes===0)
  return {...unknown,status:'NO_MATCHING_FOLLOWUP_QUOTES'};
 return {...unknown,status:'RESEARCH_ONLY_MATCHED_KNOWN_OUTCOMES',
  market_only:a,market_plus_media:b,
  recall_delta_at_k_known:
    b.recall_at_k_known!==null&&a.recall_at_k_known!==null?
    b.recall_at_k_known-a.recall_at_k_known:null,
  precision_delta_at_k_known:
    b.precision_at_k_known!==null&&a.precision_at_k_known!==null?
    b.precision_at_k_known-a.precision_at_k_known:null,
  improvement_proven:false,
  caveat:'One retrospective paired sample is not independent robust validation; market trading needs real risk gates and live paper receipts.'};
}
