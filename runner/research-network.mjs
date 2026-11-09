// Five independent Cloud research snapshots -> local READ-ONLY status mirror.
// NOT a command channel. Never imports buy, evaluate, trade or wallet modules.
export const RESEARCH_ROLES=Object.freeze([
 'news_discovery','social_acceleration','onchain_liquidity','contract_security','opportunity_qa'
]);
const BASE='https://raw.githubusercontent.com/127027/Sniperbot-/codex/research-gateway-v04/research/';
const MAX_BODY=128*1024;
const MAX_AGE_MS=90*60_000;
function timestamp(value){return Date.parse(value)}
async function readJson(url,fetcher){
 const response=await fetcher(url,{redirect:'error',headers:{accept:'application/json','cache-control':'no-cache'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('RESEARCH_HTTP_'+response.status);
 const declared=Number(response.headers?.get?.('content-length'));
 if(Number.isFinite(declared)&&declared>MAX_BODY)throw Error('RESEARCH_TOO_LARGE');
 let raw='',size=0;
 if(response.body){
  const dec=new TextDecoder();
  for await(const chunk of response.body){
   size+=chunk.length;if(size>MAX_BODY)throw Error('RESEARCH_TOO_LARGE');
   raw+=dec.decode(chunk,{stream:true});
  }
  raw+=dec.decode();
 }else{
  raw=await response.text();
  if(Buffer.byteLength(raw)>MAX_BODY)throw Error('RESEARCH_TOO_LARGE');
 }
 return JSON.parse(raw);
}
function validateRole(value,role,now){
 if(!value||value.schema!=='research_role_snapshot.v1'||value.role!==role||
    value.paper_only!==true||value.actionable!==false||
    !Array.isArray(value.candidates)||value.candidates.length>500||
    typeof value.status!=='string'||value.status.length>100)throw Error('UNTRUSTED_ROLE_SCHEMA');
 const at=timestamp(value.published_at_utc);
 if(!Number.isFinite(at)||at>now+30000)throw Error('INVALID_ROLE_TIME');
 return {role,status:value.status,candidate_count:value.candidates.length,
  published_at_utc:value.published_at_utc,stale:now-at>MAX_AGE_MS,
  paper_only:true,actionable:false};
}
function validateWatchlist(value,now){
 if(!value||value.schema!=='research_watchlist.v1'||value.paper_only!==true||
   value.actionable!==false||!Array.isArray(value.candidates)||value.candidates.length>1000)throw Error('UNTRUSTED_WATCHLIST_SCHEMA');
 const at=timestamp(value.published_at_utc);
 if(!Number.isFinite(at)||at>now+30000)throw Error('INVALID_WATCHLIST_TIME');
 return {candidate_count:value.candidates.length,published_at_utc:value.published_at_utc,
   stale:now-at>MAX_AGE_MS,review_count:value.candidates.filter(c=>c?.state==='DEEP_REVIEW').length};
}
export async function fetchResearchNetwork({fetcher=fetch,now=Date.now()}={}){
 const items=await Promise.all(RESEARCH_ROLES.map(async role=>{
  try{return validateRole(await readJson(BASE+'roles/'+role+'/latest.json',fetcher),role,now)}
  catch(e){return {role,status:'UNAVAILABLE',candidate_count:0,stale:true,error:String(e?.message||'READ_FAILED').slice(0,100)}}
 }));
 let watchlist;
 try{watchlist=validateWatchlist(await readJson(BASE+'watchlist/current.json',fetcher),now)}
 catch(e){watchlist={candidate_count:null,stale:true,error:String(e?.message||'READ_FAILED').slice(0,100)}}
 const current=items.filter(r=>!r.stale).length;
 // There is currently no authenticated risk/quote/sell validator for the Dots.
 return {schema:'research_network_status.v1',checked_at_utc:new Date(now).toISOString(),
  transport:'PUBLIC_GITHUB_PULL_ONLY',paper_only:true,actionable:false,
  current_roles:current,total_roles:RESEARCH_ROLES.length,roles:items,watchlist,
  local_execution:'BLOCKED_REAL_VALIDATOR_UNAVAILABLE',
  message:'Research visibility only: five current files do not authorize paper trades.'};
}
