// Pull-only transport from a fixed GitHub repo branch to laptop.
// The PUBLIC GitHub file is just a courier. It is NOT trusted: each contained
// signal must be independently Ed25519-verified against a LOCAL publisher key.
// No private keys are fetched, no wallet touches, no implicit authorizations.
export const ORDER_FEED_URL=
 'https://raw.githubusercontent.com/127027/Sniperbot-/coordination/agent-paper-orders/latest.json';
const MAX_BYTES=65536;
export async function fetchSignedPaperOrderFeed({fetcher=fetch,now=Date.now()}={}){
 const response=await fetcher(ORDER_FEED_URL,{
  method:'GET',redirect:'error',
  headers:{accept:'application/json','cache-control':'no-cache'},
  signal:AbortSignal.timeout(9500)});
 if(!response?.ok||Number(response.headers?.get?.('content-length')||0)>MAX_BYTES)
  throw Error('GITHUB_AGENT_FEED_NOT_AVAILABLE');
 const raw=await response.text();
 if(Buffer.byteLength(raw,'utf8')>MAX_BYTES)throw Error('GITHUB_AGENT_FEED_TOO_LARGE');
 const feed=JSON.parse(raw);
 if(!feed||typeof feed!=='object'||Array.isArray(feed)||
  Object.keys(feed).sort().join(',')!=='published_at_utc,schema,signals'||
  feed.schema!=='sniper_signed_paper_signal_feed.v1'||
  !Array.isArray(feed.signals)||feed.signals.length>8)
  throw Error('GITHUB_AGENT_FEED_INVALID_SCHEMA');
 const t=Date.parse(feed.published_at_utc);
 // An unchanged EMPTY courier is healthy; only actual trade commands need
 // a fresh feed timestamp. Each signed signal is separately TTL checked.
 if(!Number.isFinite(t)||t>now+30000||
  (feed.signals.length>0&&now-t>180000))
  throw Error('GITHUB_AGENT_FEED_STALE');
 const ids=new Set();
 for(const command of feed.signals){
  if(!command||typeof command.signal_id!=='string'||ids.has(command.signal_id))
   throw Error('GITHUB_AGENT_FEED_DUPLICATE_SIGNAL');
  ids.add(command.signal_id);
 }
 return {source:'PUBLIC_GITHUB_SIGNED_COURIER_ONLY',published_at_utc:feed.published_at_utc,
  signals:feed.signals,signal_count:feed.signals.length,
  remote_dots_signature_verified:false,live_trading_enabled:false};
}
export async function pollSignedPaperOrderFeed({fetcher=fetch,consume,now=Date.now()}={}){
 if(typeof consume!=='function')throw Error('SIGNED_FEED_CONSUMER_REQUIRED');
 const feed=await fetchSignedPaperOrderFeed({fetcher,now});
 const receipts=[];
 // Final sender checks, onchain-free paper money changes, replay and market
 // validation happen *solely* inside the server consumer, not GitHub.
 for(const command of feed.signals){
  try{receipts.push(await consume(command))}
  catch(e){receipts.push({signal_id:command.signal_id,status:'REJECTED',
   reason:String(e?.message||'UNTRUSTED_ORDER').slice(0,120)})}
 }
 return {received:feed.signal_count,receipts,
  transport:feed.source,authenticated_by_transport:false};
}
