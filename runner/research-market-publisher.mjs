import {validateFreeStreamLead} from './solana-live-events.mjs';
import {candidateId} from './research-watchlist.mjs';
// Optional GitHub research snapshot bridge. DISABLED unless manually enabled on Windows.
// Only writes the fixed non-actionable public research/market/latest.json on the work branch.
// Never reads bot portfolio, trading state, wallets, orders or publisher signing keys.
const REPO='127027/Sniperbot-';
const BRANCH='codex/research-gateway-v04';
const FILE='research/market/latest.json';
const GITHUB_FILE_URL='https://api.github.com/repos/'+REPO+'/contents/'+FILE;

export function assertResearch(s){
  if(!s||s.schema!=='research_market_snapshot.v1'||s.paper_only!==true||
     s.actionable!==false||!Array.isArray(s.candidates)||s.candidates.length>96)throw Error('Unsafe market research snapshot');
  if(s.watch_candidates!==undefined){
    const allowed=['candidate_id','chain','token_address','pool_address',
      'first_seen_at_utc','last_seen_at_utc','observation_count','verification',
      'last_indicative_price_usd','last_indicative_liquidity_usd',
      'last_indicative_volume_m5_usd','source','research_status','paper_only',
      'actionable','paper_entry_authorized'];
    const ids=new Set();
    const validWatch=x=>{
      if(!x||typeof x!=='object'||Array.isArray(x)||
        Object.keys(x).sort().join('|')!==[...allowed].sort().join('|')||
        x.paper_only!==true||x.actionable!==false||
        x.paper_entry_authorized!==false||
        x.source!=='LOCAL_SCOUT_OBSERVATIONS'||
        x.research_status!=='SCOUT_WATCH_NOT_GPT_DECISION'||
        !['PROVIDER_ONLY','CROSS_PROVIDER_IDENTITY'].includes(x.verification)||
        !Number.isInteger(x.observation_count)||x.observation_count<1||
        x.observation_count>1000000)return false;
      let id;try{id=candidateId(x.chain,x.token_address,x.pool_address)}
      catch{return false}
      if(id!==x.candidate_id||ids.has(id))return false;
      ids.add(id);
      const first=Date.parse(x.first_seen_at_utc),last=Date.parse(x.last_seen_at_utc),
       at=Date.parse(s.published_at_utc);
      if(!Number.isFinite(first)||!Number.isFinite(last)||!Number.isFinite(at)||
        first>last||last>at||at-last>24*3600_000)return false;
      return [x.last_indicative_price_usd,x.last_indicative_liquidity_usd,
        x.last_indicative_volume_m5_usd].every(n=>n===null||
         (typeof n==='number'&&Number.isFinite(n)&&n>=0));
    };
    if(!Array.isArray(s.watch_candidates)||s.watch_candidates.length>24||
       s.watch_candidates.some(x=>!validWatch(x)))
      throw Error('Unsafe read-only scout watch continuity');
  }
  if(s.research_alerts!==undefined){
    const allowed=new Set(['event_id','event_type','candidate_id','chain',
      'token_address','pool_address','observed_at_utc','previous_observed_at_utc',
      'previous_volume_m5_usd','current_volume_m5_usd','m5_volume_ratio',
      'current_liquidity_usd','buy_transactions_m5','sell_transactions_m5',
      'indicative_price_ratio','source_urls','paper_only','actionable',
      'probability_pct','recommended_action','unknown_checks','warning',
      'pool_created_at_utc','provider_creation_age_at_observation_ms',
      'source_event_at_utc','source_timestamp_quality',
      'transaction_signature','provider','chain_finality']);
    const known=new Set(['MARKET_ACCELERATION','NEW_POOL_FIRST_OBSERVED',
      'SOLANA_STREAM_NEW_TOKEN','SOLANA_STREAM_MIGRATION']);
    const sTime=Date.parse(s.published_at_utc);
    const goodResearchEvent=e=>{
      if(!e||e.paper_only!==true||e.actionable!==false||
        e.probability_pct!==null||
        e.recommended_action!=='INDEPENDENT_FIVE_ROLE_REVIEW'||
        !known.has(e.event_type)||!/^research-alert-[a-f0-9]{32}$/.test(e.event_id||'')||
        Object.keys(e).some(k=>!allowed.has(k)))return false;
      if(e.event_type.startsWith('SOLANA_STREAM_')){
        return Number.isFinite(sTime)&&
          validateFreeStreamLead(e,{now:sTime,maxAgeMs:60*60_000});
      }
      if(e.event_type==='NEW_POOL_FIRST_OBSERVED'){
        const ts=Date.parse(e.observed_at_utc),created=Date.parse(e.pool_created_at_utc);
        const age=e.provider_creation_age_at_observation_ms;
        const urls=e.source_urls;
        const validSources=Array.isArray(urls)&&urls.length>=1&&urls.length<=5&&
          urls.every(u=>{
            if(typeof u!=='string'||u.length>900)return false;
            try{const v=new URL(u);return v.protocol==='https:'&&
              !!v.hostname&&!v.username&&!v.password}
            catch{return false}
          });
        return Number.isFinite(sTime)&&Number.isFinite(ts)&&ts<=sTime&&
          Number.isFinite(created)&&created<=ts&&
          Number.isFinite(age)&&age===ts-created&&age>=0&&age<=60*60_000&&
          typeof e.candidate_id==='string'&&
          ['solana','base','eth','bsc'].includes(e.chain)&&
          validSources;
      }
      return e.event_type==='MARKET_ACCELERATION';
    };
    if(!Array.isArray(s.research_alerts)||s.research_alerts.length>24||
       s.research_alerts.some(e=>!goodResearchEvent(e)))
      throw Error('Unsafe public research alert payload');
  }

  if(s.narrative_leads!==undefined){
    const allowed=new Set(['chain','token_address','observed_at_utc','origin',
      'source_urls','signal_categories','paid_promotion_seen',
      'organic_social_verified','candidate_id','pool_address','paper_only',
      'actionable','probability_pct','claim_status']);
    if(!Array.isArray(s.narrative_leads)||s.narrative_leads.length>24||
       s.narrative_leads.some(e=>!e||e.paper_only!==true||e.actionable!==false||
         e.organic_social_verified!==false||e.probability_pct!==null||
         e.origin!=='DEXSCREENER_METADATA_ONLY'||!Array.isArray(e.signal_categories)||
         !Array.isArray(e.source_urls)||e.source_urls.length>3||
         Object.keys(e).some(k=>!allowed.has(k))))
      throw Error('Unsafe public narrative lead payload');
  }
  if(s.news_leads!==undefined){
    const allowed=new Set(['event_id','source_name','source_url','title',
      'original_published_at_utc','first_observed_at_utc',
      'source_timestamp_quality','signal_categories',
      'chain','token_address','pool_address','candidate_id',
      'original_post_content_independently_verified','paper_only','actionable']);
    if(!Array.isArray(s.news_leads)||s.news_leads.length>16||
       s.news_leads.some(e=>!e||e.paper_only!==true||e.actionable!==false||
         e.candidate_id!==null||e.chain!==null||e.pool_address!==null||
         e.token_address!==null||e.original_post_content_independently_verified!==false||
         typeof e.title!=='string'||e.title.length>700||
         typeof e.source_url!=='string'||!e.source_url.startsWith('https://')||
         !Array.isArray(e.signal_categories)||e.signal_categories.length>4||
         Object.keys(e).some(k=>!allowed.has(k))))
      throw Error('Unsafe public news research payload');
  }
  // V6.4: prospective public token links are research-only. They are
  // deliberately NOT pool identities, valid quotes or BUY candidates.
  if(s.ranking_leads!==undefined){
    const allowed=['chain','token_address','observed_at_utc','source','source_key',
      'source_url','token_url','pool_address','candidate_id',
      'contract_identity_independently_verified','pool_identity_verified',
      'trade_safety_verified','paper_entry_authorized','paper_only',
      'actionable','claim_status'];
    const chains=new Set(['solana','base','bsc','eth','robinhood','arc']);
    const keys=new Set(['SOLANA_NEW','SOLANA_GAINERS','BSC_NEW','BSC_GAINERS',
     'BASE_NEW','ETH_GAINERS','ROBINHOOD_NEW','ARC_NEW']);
    if(!Array.isArray(s.ranking_leads)||s.ranking_leads.length>48||
      s.ranking_leads.some(e=>!e||Object.keys(e).sort().join('|')!==allowed.sort().join('|')||
       !chains.has(e.chain)||!keys.has(e.source_key)||
       e.paper_only!==true||e.actionable!==false||
       e.paper_entry_authorized!==false||e.pool_address!==null||
       e.candidate_id!==null||e.contract_identity_independently_verified!==false||
       e.pool_identity_verified!==false||e.trade_safety_verified!==false||
       e.source!=='SASA_PUBLIC_RANKING_RESEARCH'||
       e.claim_status!=='RANKING_TOKEN_LEAD_NOT_POOL_OR_EARLY_SIGNAL'||
       typeof e.token_url!=='string'||!e.token_url.startsWith('https://sasapad.fun/x/')||
       typeof e.source_url!=='string'||!e.source_url.startsWith('https://sasapad.fun/top/')||
       !Number.isFinite(Date.parse(e.observed_at_utc))))
      throw Error('Unsafe independent ranking research payload');
  }
  if(s.ranking_coverage!==undefined&&
    (!Array.isArray(s.ranking_coverage)||s.ranking_coverage.length>8))
    throw Error('Unsafe independent ranking provider coverage');
  // V6.7: only bounded rank-to-pool attempt counts and known outcome codes.
  // Never copy private account information or a BUY authorization.
  if(s.ranking_pool_resolution!==undefined){
    const x=s.ranking_pool_resolution;
    const allowed=['schema','paper_only','actionable','attempted',
      'cross_provider_matched','admitted','capacity_skipped','checks','status'];
    const states=new Set(['POOL_RESEARCH_ERROR','NO_ELIGIBLE_TOKEN_LEADS',
      'NO_CROSS_PROVIDER_POOL_MATCH','MATCHED_POOL_RESEARCH_ONLY']);
    const outcomes=new Set(['POOL_IDENTITY_NOT_CROSS_PROVIDER_CONFIRMED',
      'POOL_ADDRESS_INVALID','POOL_PRICE_OR_LIQUIDITY_UNAVAILABLE',
      'CROSS_PROVIDER_PRICE_MISMATCH','POOL_CANONICAL_ID_MISMATCH',
      'RESEARCH_POOL_MATCHED_NOT_TRADE_APPROVED','RATE_LIMITED',
      'PROVIDER_UNAVAILABLE_OR_INVALID']);
    const count=n=>Number.isInteger(n)&&n>=0&&n<=4;
    if(!x||typeof x!=='object'||Array.isArray(x)||
      Object.keys(x).sort().join('|')!==[...allowed].sort().join('|')||
      x.schema!=='r29_ranking_pool_resolution.v1'||x.paper_only!==true||
      x.actionable!==false||!states.has(x.status)||
      ![x.attempted,x.cross_provider_matched,x.admitted,x.capacity_skipped].every(count)||
      x.cross_provider_matched>x.attempted||x.admitted>x.cross_provider_matched||
      x.admitted+x.capacity_skipped>x.cross_provider_matched||
      !Array.isArray(x.checks)||x.checks.length>x.attempted||
      x.checks.some(v=>!v||Object.keys(v).sort().join('|')!=='chain|status'||
        !['solana','base','bsc','eth'].includes(v.chain)||!outcomes.has(v.status)))
      throw Error('Unsafe ranking-pool diagnostics');
  }
  // Only sanitized local readback provenance may be sent to the public Dot feed.
  // No keys, balances, wallet material, orders, risk PASS or executable quotes.
  if(s.pool_readbacks!==undefined){
    const allowed=new Set(['candidate_id','checked_at_utc','status',
      'market_identity_verified','reason','source_names','contract_status',
      'sellability_status','executable_sell_quote','paper_entry_authorized',
      'onchain_existence_status','solana_mint_program','solana_mint_authority',
      'solana_freeze_authority','solana_mint_header_risk',
      'paper_only','actionable']);
    if(!Array.isArray(s.pool_readbacks)||s.pool_readbacks.length>3||
      s.pool_readbacks.some(e=>!e||Object.keys(e).length!==allowed.size||
        Object.keys(e).some(k=>!allowed.has(k))||
        e.paper_only!==true||e.actionable!==false||
        e.contract_status!=='UNKNOWN'||e.sellability_status!=='UNKNOWN'||
        e.executable_sell_quote!==false||e.paper_entry_authorized!==false||
        !['UNKNOWN','CODE_PRESENT','ACCOUNTS_REPORTED'].includes(e.onchain_existence_status)||
        !['UNKNOWN','SPL_TOKEN_LEGACY','TOKEN_2022'].includes(e.solana_mint_program)||
        !['UNKNOWN','RETAINED','REVOKED'].includes(e.solana_mint_authority)||
        !['UNKNOWN','RETAINED','REVOKED'].includes(e.solana_freeze_authority)||
        !['UNKNOWN','CAUTION','HEADER_ONLY_NO_KNOWN_AUTHORITY'].includes(e.solana_mint_header_risk)||
        (e.solana_mint_program==='UNKNOWN'&&
         (e.solana_mint_authority!=='UNKNOWN'||e.solana_freeze_authority!=='UNKNOWN'||
          e.solana_mint_header_risk!=='UNKNOWN'))||
        (e.solana_mint_program==='TOKEN_2022'&&
         e.solana_mint_header_risk!=='CAUTION')||
        (e.solana_mint_header_risk==='HEADER_ONLY_NO_KNOWN_AUTHORITY'&&
         (e.solana_mint_program!=='SPL_TOKEN_LEGACY'||
          e.solana_mint_authority!=='REVOKED'||e.solana_freeze_authority!=='REVOKED'))||
        !Array.isArray(e.source_names)||e.source_names.join(',')!=='GECKOTERMINAL,DEXSCREENER'||
        !['IDENTITY_MATCHED','UNVERIFIED'].includes(e.status)||
        (e.status==='IDENTITY_MATCHED')!==(e.market_identity_verified===true)||
        typeof e.candidate_id!=='string'||!Number.isFinite(Date.parse(e.checked_at_utc))))
      throw Error('Unsafe public pool readback payload');
  }
  if(s.news_coverage!==undefined&&
     (!Array.isArray(s.news_coverage)||s.news_coverage.length>8))
    throw Error('Unsafe public news provider status');
  if(s.narrative_coverage!==undefined&&
     (!Array.isArray(s.narrative_coverage)||s.narrative_coverage.length>3))
    throw Error('Unsafe narrative provider status');

}
async function readJson(resp){
  const raw=await resp.json().catch(()=>null);
  return raw&&typeof raw==='object'?raw:null;
}
export async function publishResearchSnapshot(snapshot,{token,fetcher=fetch}={}){
  assertResearch(snapshot);
  if(typeof token!=='string'||token.length<15)throw Error('RESEARCH_PUBLISH_TOKEN_NOT_CONFIGURED');
  const payload=Buffer.from(JSON.stringify(snapshot,null,2)+'\n','utf8');
  if(payload.length>200_000)throw Error('Snapshot exceeds fixed publication limit');
  const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',
    'User-Agent':'MemeSniper-Research-Market-Publisher/1.0'};
  let sha=null;
  const get=await fetcher(GITHUB_FILE_URL+'?ref='+encodeURIComponent(BRANCH),{method:'GET',headers,signal:AbortSignal.timeout(10000)});
  if(get.status===200){
    const j=await readJson(get);
    if(!j||typeof j.sha!=='string'||j.type!=='file')throw Error('Invalid GitHub research file response');
    sha=j.sha;
  }else if(get.status!==404)throw Error('GITHUB_RESEARCH_READ_HTTP_'+get.status);
  const body={message:'research(market): update read-only pool discovery snapshot',
    branch:BRANCH,content:payload.toString('base64')};
  if(sha)body.sha=sha;
  const response=await fetcher(GITHUB_FILE_URL,{method:'PUT',headers,
    body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  if(response.status===409||response.status===422)throw Error('GITHUB_RESEARCH_SHA_CONFLICT');
  if(!response.ok)throw Error('GITHUB_RESEARCH_WRITE_HTTP_'+response.status);
  const done=await readJson(response);
  if(!done||typeof done.commit?.sha!=='string')throw Error('GitHub research commit missing');
  return {commit_sha:done.commit.sha,path:FILE,branch:BRANCH};
}
export function publishingEnabled(env=process.env){
  return env.SNIPER_MARKET_PUBLISH==='1'&&typeof env.SNIPER_MARKET_GITHUB_TOKEN==='string'&&
    env.SNIPER_MARKET_GITHUB_TOKEN.length>=15;
}
