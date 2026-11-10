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
