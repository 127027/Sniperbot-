// GitHub is an eventually-consistent, PUBLIC coordination transport.
// This publisher only runs in the visible MASTER process after the owner
// explicitly unlocks an encrypted presence key and supplies a GitHub PAT.
// Publishes NO wallet secrets, balances, payee identities or trade instructions.
import {createSignedMasterPresence} from './device-topology.mjs';
export const GITHUB_MASTER_FILE_URL=
 'https://api.github.com/repos/127027/Sniperbot-/contents/coordination/master-presence.v1.json';
export const GITHUB_COORDINATION_BRANCH='coordination/master-live';
const MAX_BODY=8192;
function protectedHeaders(token){
 if(typeof token!=='string'||!/^[-A-Za-z0-9_]{20,300}$/.test(token))
  throw Error('GITHUB_COORDINATION_TOKEN_MISSING');
 return {accept:'application/vnd.github+json',
  authorization:'Bearer '+token,
  'content-type':'application/json',
  'user-agent':'Sniperbot-Visible-Master-Presence-v1'};
}
export async function publishMasterPresence({
 masterDeviceId,privateKey,githubToken,fetcher=fetch,now=Date.now(),
 branch=GITHUB_COORDINATION_BRANCH
}={}){
 if(branch!==GITHUB_COORDINATION_BRANCH)throw Error('INVALID_GITHUB_COORDINATION_BRANCH');
 const headers=protectedHeaders(githubToken);
 const envelope=createSignedMasterPresence({
  masterDeviceId,sequence:Math.floor(now/1000),privateKey,now,lifetimeMs:110000});
 const url=new URL(GITHUB_MASTER_FILE_URL);
 url.searchParams.set('ref',branch);
 const get=await fetcher(url.toString(),{
  method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(10000)
 });
 let sha;
 if(get.status===200){
  const raw=await get.text();
  if(Buffer.byteLength(raw,'utf8')>MAX_BODY)throw Error('GITHUB_COORDINATION_FILE_TOO_LARGE');
  const parsed=JSON.parse(raw);
  if(parsed.type!=='file'||parsed.path!=='coordination/master-presence.v1.json'||
   typeof parsed.sha!=='string'||!/^[a-f0-9]{40}$/.test(parsed.sha))
   throw Error('GITHUB_COORDINATION_FILE_INVALID');
  sha=parsed.sha;
 }else if(get.status===404){
  // Branch must already exist. GitHub REST PUT returns 404 if branch is absent.
  sha=undefined;
 }else{
  throw Error('GITHUB_COORDINATION_GET_UNAVAILABLE_'+get.status);
 }
 const content=Buffer.from(JSON.stringify(envelope)+'\n').toString('base64');
 const request={message:'coordination: signed master presence (no wallet data)',
  content,branch};
 if(sha)request.sha=sha;
 const put=await fetcher(GITHUB_MASTER_FILE_URL,{
  method:'PUT',headers,redirect:'error',
  body:JSON.stringify(request),signal:AbortSignal.timeout(10000)
 });
 if(put.status!==200&&put.status!==201)
  throw Error('GITHUB_COORDINATION_PUBLISH_FAILED_'+put.status);
 return {published:true,transport:'GITHUB_CONTENTS_API',
  channel:branch,master_device_id:masterDeviceId,
  expires_at_utc:envelope.expires_at_utc,
  wallet_private_keys_sent:false,trade_instruction_sent:false,
  notice:'GitHub presence is not an instant disconnection signal; trading remains disabled.'};
}
