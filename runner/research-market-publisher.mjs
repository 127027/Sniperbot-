// Optional GitHub research snapshot bridge. DISABLED unless manually enabled on Windows.
// Only writes the fixed non-actionable public research/market/latest.json on the work branch.
// Never reads bot portfolio, trading state, wallets, orders or publisher signing keys.
const REPO='127027/Sniperbot-';
const BRANCH='codex/research-gateway-v04';
const FILE='research/market/latest.json';
const URL='https://api.github.com/repos/'+REPO+'/contents/'+FILE;

function assertResearch(s){
  if(!s||s.schema!=='research_market_snapshot.v1'||s.paper_only!==true||
     s.actionable!==false||!Array.isArray(s.candidates)||s.candidates.length>96)throw Error('Unsafe market research snapshot');
  if(s.research_alerts!==undefined){
    const allowed=new Set(['event_id','event_type','candidate_id','chain',
      'token_address','pool_address','observed_at_utc','previous_observed_at_utc',
      'previous_volume_m5_usd','current_volume_m5_usd','m5_volume_ratio',
      'current_liquidity_usd','buy_transactions_m5','sell_transactions_m5',
      'indicative_price_ratio','source_urls','paper_only','actionable',
      'probability_pct','recommended_action','unknown_checks','warning']);
    if(!Array.isArray(s.research_alerts)||s.research_alerts.length>24||
       s.research_alerts.some(e=>!e||e.paper_only!==true||e.actionable!==false||
         e.probability_pct!==null||e.event_type!=='MARKET_ACCELERATION'||
         e.recommended_action!=='INDEPENDENT_FIVE_ROLE_REVIEW'||
         Object.keys(e).some(k=>!allowed.has(k))))
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
  // Only sanitized local readback provenance may be sent to the public Dot feed.
  // No keys, balances, wallet material, orders, risk PASS or executable quotes.
  if(s.pool_readbacks!==undefined){
    const allowed=new Set(['candidate_id','checked_at_utc','status',
      'market_identity_verified','reason','source_names','contract_status',
      'sellability_status','executable_sell_quote','paper_entry_authorized',
      'onchain_existence_status',
      'paper_only','actionable']);
    if(!Array.isArray(s.pool_readbacks)||s.pool_readbacks.length>3||
      s.pool_readbacks.some(e=>!e||Object.keys(e).length!==allowed.size||
        Object.keys(e).some(k=>!allowed.has(k))||
        e.paper_only!==true||e.actionable!==false||
        e.contract_status!=='UNKNOWN'||e.sellability_status!=='UNKNOWN'||
        e.executable_sell_quote!==false||e.paper_entry_authorized!==false||
        !['UNKNOWN','CODE_PRESENT','ACCOUNTS_REPORTED'].includes(e.onchain_existence_status)||
        !Array.isArray(e.source_names)||e.source_names.join(',')!=='GECKOTERMINAL,DEXSCREENER'||
        !['IDENTITY_MATCHED','UNVERIFIED'].includes(e.status)||
        (e.status==='IDENTITY_MATCHED')!==(e.market_identity_verified===true)||
        typeof e.candidate_id!=='string'||!Number.isFinite(Date.parse(e.checked_at_utc))))
      throw Error('Unsafe public pool readback payload');
  }
  if(s.news_coverage!==undefined&&
     (!Array.isArray(s.news_coverage)||s.news_coverage.length>3))
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
  const get=await fetcher(URL+'?ref='+encodeURIComponent(BRANCH),{method:'GET',headers,signal:AbortSignal.timeout(10000)});
  if(get.status===200){
    const j=await readJson(get);
    if(!j||typeof j.sha!=='string'||j.type!=='file')throw Error('Invalid GitHub research file response');
    sha=j.sha;
  }else if(get.status!==404)throw Error('GITHUB_RESEARCH_READ_HTTP_'+get.status);
  const body={message:'research(market): update read-only pool discovery snapshot',
    branch:BRANCH,content:payload.toString('base64')};
  if(sha)body.sha=sha;
  const response=await fetcher(URL,{method:'PUT',headers,
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
