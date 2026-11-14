// Public GitHub is a READ-ONLY transport for signed master presence.
// A GitHub 200 is never permission to trade; stale, tampered or unavailable
// response makes FOLLOWER show 'Keine Verbindung – ruf Andreas an'.
// Repository/branch/path are FIXED. No arbitrary URL can be injected.
import {verifyMasterPresence,followerStatus} from './device-topology.mjs';
export const GITHUB_MASTER_ENDPOINT=
 'https://api.github.com/repos/127027/Sniperbot-/contents/coordination/master-presence.v1.json';
const MAX=10240;
export async function fetchMasterPresence(topology,{
 fetcher=fetch,now=Date.now()
}={}){
 const disconnected=reason=>({
  ...followerStatus({topology,lastFetchError:reason,now}),
  source:'GITHUB_SIGNED_MASTER_PRESENCE',reason,
  last_verified_at_utc:null,sequence:null
 });
 if(topology?.mode!=='FOLLOWER')
  return disconnected('NOT_FOLLOWER');
 if(!['coordination/master-live','coordination/master-live-v1'].includes(topology.github_branch))
  return disconnected('INVALID_PINNED_GITHUB_BRANCH');
 try{
  const url=new URL(GITHUB_MASTER_ENDPOINT);
  url.searchParams.set('ref',topology.github_branch);
  const resp=await fetcher(url.toString(),{
   method:'GET',redirect:'error',cache:'no-store',
   headers:{'accept':'application/vnd.github+json',
    'user-agent':'Sniperbot-Device-Master-Presence-v1'},
   signal:AbortSignal.timeout(9000)
  });
  if(!resp?.ok)return disconnected('GITHUB_UNAVAILABLE_'+(resp?.status||'unknown'));
  if(Number(resp.headers?.get?.('content-length')||0)>MAX)
   return disconnected('GITHUB_PRESENCE_TOO_LARGE');
  const raw=await resp.text();
  if(Buffer.byteLength(raw,'utf8')>MAX)return disconnected('GITHUB_PRESENCE_TOO_LARGE');
  const data=JSON.parse(raw);
  if(data?.type!=='file'||data.path!=='coordination/master-presence.v1.json'||
   data.encoding!=='base64'||typeof data.content!=='string')
   return disconnected('INVALID_GITHUB_PRESENCE_FILE');
  const stripped=data.content.replace(/[\r\n]/g,'');
  if(stripped.length>MAX||!/^[-A-Za-z0-9+/=]+$/.test(stripped))
   return disconnected('INVALID_GITHUB_CONTENT_ENCODING');
  const bytes=Buffer.from(stripped,'base64');
  if(bytes.length>4096||bytes.toString('base64')!==stripped)
   return disconnected('INVALID_GITHUB_CONTENT_ENCODING');
  const envelope=JSON.parse(bytes.toString('utf8'));
  const verified=verifyMasterPresence(envelope,topology,{now});
  return {...followerStatus({topology,presence:verified,now}),
   source:'GITHUB_SIGNED_MASTER_PRESENCE',
   last_verified_at_utc:verified.observed_at_utc,
   expires_at_utc:verified.expires_at_utc,sequence:verified.sequence,
   reason:null};
 }catch(e){
  return disconnected(String(e?.message||'MASTER_PRESENCE_UNAVAILABLE').slice(0,80));
 }
}
