// Strict historical research time capsule. Not the five real Cloud Dots, not a trader.
// Target/ground truth must be supplied to scoreAfterReplay ONLY after the complete run.
const DAY=86400000;
const ts=s=>Date.parse(s);
const kinds=new Set(['ORIGINAL_SOCIAL','ORIGINAL_NEWS','TOKEN_POOL','POOL_MARKET','SECURITY_REVIEW','SELL_ROUTE']);
const roles=['news_discovery','social_acceleration','onchain_liquidity','contract_security','opportunity_qa'];
function candidate(e){
  if(!['solana','eth','base','bsc'].includes(e.chain))return null;
  const valid=e.chain==='solana'?s=>typeof s==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s):s=>typeof s==='string'&&/^0x[0-9a-f]{40}$/.test(s);
  return valid(e.token_address)&&valid(e.pool_address)?[e.chain,e.token_address,e.pool_address].join(':'):null;
}
function archival(e){
  if(!e||!kinds.has(e.kind)||e.historical_capture_verified!==true||e.independent_archive_review!==true)return null;
  const a=ts(e.published_at_utc),b=ts(e.capture_at_utc);
  if(!Number.isFinite(a)||!Number.isFinite(b)||a>b||typeof e.source_url!=='string')return null;
  if(typeof e.source_content_sha256!=='string'||! /^[0-9a-f]{64}$/.test(e.source_content_sha256))return null;
  const m=/^https:\/\/web\.archive\.org\/web\/(\d{14})\/(https:\/\/\S+)$/.exec(e.archive_url||'');
  if(!m||m[2]!==e.source_url)return null;
  const s=m[1],capture=Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8),+s.slice(8,10),+s.slice(10,12),+s.slice(12,14));
  if(capture!==b)return null;
  if(['TOKEN_POOL','POOL_MARKET','SECURITY_REVIEW','SELL_ROUTE'].includes(e.kind)&&!candidate(e))return null;
  if(e.kind==='POOL_MARKET'&&!(e.price_usd>0&&e.liquidity_usd>0))return null;
  if(e.kind==='SECURITY_REVIEW'&&e.veto!==false)return null;
  if(e.kind==='SELL_ROUTE'&&e.route_verified!==true)return null;
  return {...e,_capture:b,_candidate:candidate(e)};
}
function dailyResearch(events,until){
  const available=events.filter(e=>e._capture<=until);
  const grouped=new Map();
  for(const e of available){if(!e._candidate)continue;
    if(!grouped.has(e._candidate))grouped.set(e._candidate,[]);
    grouped.get(e._candidate).push(e);
  }
  const candidates=[];
  for(const [id,items] of grouped){
    const has=k=>items.some(x=>x.kind===k);
    const hosts=new Set(items.map(e=>new URL(e.source_url).hostname));
    const full=['TOKEN_POOL','POOL_MARKET','SECURITY_REVIEW','SELL_ROUTE'].every(has)&&
      (has('ORIGINAL_SOCIAL')||has('ORIGINAL_NEWS'))&&hosts.size>=3;
    candidates.push({candidate_id:id,status:full?'BOT_REVIEW_CANDIDATE':has('TOKEN_POOL')?'TOKEN_IDENTIFIED':'RESEARCH_ONLY',
      actionable:false});
  }
  const counts={
    news_discovery:available.filter(x=>['ORIGINAL_NEWS','TOKEN_POOL'].includes(x.kind)).length,
    social_acceleration:available.filter(x=>x.kind==='ORIGINAL_SOCIAL').length,
    onchain_liquidity:available.filter(x=>['TOKEN_POOL','POOL_MARKET'].includes(x.kind)).length,
    contract_security:available.filter(x=>['SECURITY_REVIEW','SELL_ROUTE'].includes(x.kind)).length,
    opportunity_qa:candidates.length
  };
  return {roles:Object.fromEntries(roles.map(r=>[r,{status:counts[r]?'RESEARCH_EVIDENCE_AVAILABLE':'NO_VERIFIED_EVIDENCE',count:counts[r]}])),
    candidates:candidates.sort((a,b)=>a.candidate_id.localeCompare(b.candidate_id)),
    unmatched_original_events:available.filter(x=>!x._candidate&&['ORIGINAL_NEWS','ORIGINAL_SOCIAL'].includes(x.kind)).length};
}
export function runBlindTimeline({scenario_id,start_utc,end_utc,evidence=[]}={}){
  if(typeof scenario_id!=='string'||!/^R\d{2,3}$/.test(scenario_id))throw Error('INVALID_SCENARIO_ID');
  const start=ts(start_utc),end=ts(end_utc);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||end-start>65*DAY||
    !Array.isArray(evidence)||evidence.length>10000)throw Error('BAD_INPUT');
  const allowed=[],rejected=[];
  for(const e of evidence){const ok=archival(e);
    if(ok)allowed.push(ok);else rejected.push({source_url:e?.source_url||null,reason:'NO_VERIFIED_HISTORICAL_CAPTURE'});
  }
  const timeline=[];
  for(let at=Math.floor(start/DAY)*DAY;at<=Math.floor(end/DAY)*DAY;at+=DAY){
    const today=Math.min(at+DAY-1,end),research=dailyResearch(allowed,today);
    timeline.push({date_utc:new Date(at).toISOString().slice(0,10),
      admitted_events:allowed.filter(e=>e._capture<=today).length,
      role_status:research.roles,
      discovered_ids:research.candidates.map(x=>x.candidate_id),
      bot_review_candidates:research.candidates.filter(x=>x.status==='BOT_REVIEW_CANDIDATE').length,
      paper_buy_orders:0,paper_sell_orders:0});
  }
  const first=timeline.find(d=>d.bot_review_candidates>0);
  return {schema:'dot_timecapsule_result.v1',scenario_id,mode:'HISTORICAL_ARCHIVE_METADATA_TIME_GATE',
    real_cloud_dots_executed:false,labels_visible_to_research:false,paper_only:true,actionable:false,
    days:timeline.length,submitted_sources:evidence.length,admitted_asof_metadata:allowed.length,
    rejected_evidence:rejected,first_bot_review_date_utc:first?.date_utc||null,
    confirmed_real_paper_fills:0,
    conclusion:allowed.length?'METADATA_REPLAY_ONLY_NOT_PREDICTIVE_VALIDATION':'UNTESTABLE_NO_VERIFIED_ASOF_SOURCES',timeline};
}
export function scoreAfterReplay(replay,truth){
  if(replay?.schema!=='dot_timecapsule_result.v1'||replay.scenario_id!==truth?.scenario_id)throw Error('TRUTH_MISMATCH');
  return {target:truth.target_name,first_bot_review_date_utc:replay.first_bot_review_date_utc,
    target_seen:!!truth.candidate_id&&replay.timeline.some(d=>d.discovered_ids.includes(truth.candidate_id)),
    prediction_proven:false,real_dot_run_proven:false,status:replay.conclusion};
}
