import {createHash} from 'node:crypto';
export const PROBE_COMMIT='3eb166e936ebbb5c9078894ffd256fc0af79478e';
export const PROBE_PATH='research/connectivity/meme-scout-scheduled-probe-20261107.json';
const base='https://raw.githubusercontent.com/127027/Sniperbot-/';
export const PROBE_URL=base+PROBE_COMMIT+'/'+PROBE_PATH;
export const FEED_URL=base+'codex/research-gateway-v04/research/feed/meme-scout-latest.json';
const fields=['schema','event_id','producer','published_at_utc','expires_at_utc','paper_only','actionable','kind','summary'];
function exact(value,keys){if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw Error('Ungültige Nachrichtenfelder');}
export function validateMessage(value,now=Date.now(),probe=false){
 if(probe){
  exact(value,['schema','probe_id','producer','execution_context','emitted_at_utc','paper_only','actionable','message']);
  if(value.schema!=='research_transport_probe.v1'||value.probe_id!=='meme-scout-scheduled-probe-20261107'||value.execution_context!=='scheduled_automation'||value.message!=='Transporttest ohne Coin-Kandidat und ohne Handelsaktion'||value.emitted_at_utc!=='2026-11-07T17:28:43Z')throw Error('Unbekannte historische Probe');
 }else{
  exact(value,fields);
  if(value.schema!=='research_notice.v1'||!/^[-a-zA-Z0-9]{8,100}$/.test(value.event_id)||!['STATUS','CANDIDATE_NOTE','EXIT_NOTE'].includes(value.kind)||typeof value.summary!=='string'||!value.summary.trim()||value.summary.length>2000)throw Error('Ungültiger Forschungshinweis');
  const start=Date.parse(value.published_at_utc),end=Date.parse(value.expires_at_utc);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>now+30000||end<=now||end<=start||end-start>7200000)throw Error('Abgelaufener oder ungültiger Hinweis');
 }
 if(value.producer!=='Meme Scout – Forschungsradar'||value.paper_only!==true||value.actionable!==false)throw Error('Nur nicht handelbare Scout-Hinweise erlaubt');
 return value;
}
export async function readRemote(url,fetcher=fetch){
 const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{accept:'application/json','cache-control':'no-cache'}});
 if(!response.ok)throw Error('Forschungsquelle HTTP '+response.status);
 let raw='',size=0;const decoder=new TextDecoder();
 for await(const chunk of response.body){size+=chunk.length;if(size>16384)throw Error('Forschungsnachricht zu groß');raw+=decoder.decode(chunk,{stream:true});}
 raw+=decoder.decode();return JSON.parse(raw);
}
export function receiveNotice(state,value,{now=Date.now(),probe=false}={}){
 validateMessage(value,now,probe);
 const inbox=state.researchInbox||{receipts:[]};
 const eventId=probe?value.probe_id:value.event_id;
 const digest=createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const old=inbox.receipts.find(r=>r.event_id===eventId);
 if(old){if(old.sha256!==digest)throw Error('Event-ID mit anderem Inhalt wiederverwendet');return state;}
 if(!probe&&inbox.latestPublishedAt&&Date.parse(value.published_at_utc)<=Date.parse(inbox.latestPublishedAt))throw Error('Veraltete Reihenfolge');
 const receipt={event_id:eventId,received_at_utc:new Date(now).toISOString(),sha256:digest,source_url:probe?PROBE_URL:FEED_URL,source_commit:probe?PROBE_COMMIT:null,historical_probe:probe,delivery:'GITHUB_PULL',trust:probe?'PINNED_HISTORICAL_PROBE':'REPOSITORY_CONTENT_NOT_AGENT_SIGNATURE',actionable:false,message:value};
 return {...state,researchInbox:{...inbox,...(!probe?{latestPublishedAt:value.published_at_utc}:{}),receipts:[...inbox.receipts,receipt].slice(-200)}};
}
export function createReceiver({getState,commit,fetcher=fetch,now=Date.now}){
 let busy=false;
 return async function poll(){
  if(busy)return;busy=true;
  try{
   const sources=[{url:PROBE_URL,probe:true},{url:FEED_URL,probe:false}];
   for(const source of sources){
    if(source.probe&&getState().researchInbox?.receipts?.some(r=>r.event_id==='meme-scout-scheduled-probe-20261107'))continue;
    try{
     const value=await readRemote(source.url,fetcher);
     const next=receiveNotice(getState(),value,{now:now(),probe:source.probe});
     commit(next);
     const state=getState();commit({...state,researchInbox:{...state.researchInbox,lastCheckAt:new Date(now()).toISOString(),lastError:null}});
    }catch(error){const state=getState();commit({...state,researchInbox:{receipts:[],...state.researchInbox,lastCheckAt:new Date(now()).toISOString(),lastError:String(error.message).slice(0,200)}});}
   }
  }finally{busy=false;}
 };
}
