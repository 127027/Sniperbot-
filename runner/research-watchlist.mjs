// Research-only watchlist: identity, deduplication, deterministic due-order and safety.
// Not an agent, market collector, recommendation or trading interface.
import {validTokenAddress} from './market.mjs';

const STATES=new Set(['NEW','WATCH','DEEP_REVIEW','REJECTED','DORMANT','ARCHIVED']);
const PRIORITIES=new Set(['HIGH','NORMAL','LOW']);
const CHAINS=new Set(['solana','base','bsc','eth']);
const REQUIRED=['chain','token_address','pool_address','candidate_id','first_seen_at_utc','last_checked_at_utc',
  'next_check_not_before_utc','state','priority','source_urls','reason','unresolved_checks'];

function fail(message){throw Error('Research-Watchlist: '+message)}
function exact(obj,keys){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).length!==keys.length||
    keys.some(key=>!Object.hasOwn(obj,key)))fail('Ungültige Felder');
}
function utc(value){
  if(typeof value!=='string'||!value.endsWith('Z')||!Number.isFinite(Date.parse(value)))fail('Ungültiger UTC-Zeitstempel');
  return Date.parse(value);
}
export function candidateId(chain,token,pool){
  if(!CHAINS.has(chain)||!validTokenAddress(chain,token)||!validTokenAddress(chain,pool))fail('Ungültige Chain/Contract/Pool-Adresse');
  const t=chain==='solana'?token:token.toLowerCase(),p=chain==='solana'?pool:pool.toLowerCase();
  return chain+':'+t+':'+p;
}
export function validateCandidate(c){
  exact(c,REQUIRED);
  if(c.candidate_id!==candidateId(c.chain,c.token_address,c.pool_address))fail('Identität stimmt nicht');
  if(!STATES.has(c.state)||!PRIORITIES.has(c.priority))fail('Ungültiger Kandidatenstatus');
  const first=utc(c.first_seen_at_utc),last=utc(c.last_checked_at_utc),next=utc(c.next_check_not_before_utc);
  if(last<first||next<first)fail('Zeitliche Reihenfolge ungültig');
  if(typeof c.reason!=='string'||c.reason.length<3||c.reason.length>900)fail('Begründung fehlt');
  if(!Array.isArray(c.source_urls)||c.source_urls.length<1||c.source_urls.length>12||
    c.source_urls.some(x=>typeof x!=='string'||x.length>900||!/^https:\/\/[^@\s/]+\/?/i.test(x)))fail('Verifizierbare HTTPS-Quellen erforderlich');
  if(new Set(c.source_urls).size!==c.source_urls.length)fail('Doppelte Quellen-URL');
  if(!Array.isArray(c.unresolved_checks)||c.unresolved_checks.length>30||
    c.unresolved_checks.some(x=>typeof x!=='string'||!x||x.length>180))fail('Ungültige offene Prüfungen');
  return c;
}
export function validateWatchlist(w){
  exact(w,['schema','producer','published_at_utc','paper_only','actionable','candidates']);
  if(w.schema!=='research_watchlist.v1'||w.producer!=='Meme Scout – Forschungsradar'||
     w.paper_only!==true||w.actionable!==false)fail('Forschungs-Pflichtstatus fehlt');
  if(w.published_at_utc!==null)utc(w.published_at_utc);
  if(!Array.isArray(w.candidates)||w.candidates.length>1000)fail('Kandidatenmenge ungültig');
  const ids=new Set();
  for(const c of w.candidates){
    validateCandidate(c);
    if(ids.has(c.candidate_id))fail('Duplizierter Kandidat');ids.add(c.candidate_id);
  }
  return w;
}
export const emptyWatchlist=()=>({
  schema:'research_watchlist.v1',producer:'Meme Scout – Forschungsradar',
  published_at_utc:null,paper_only:true,actionable:false,candidates:[]
});

// Takes complete, independently sourced research entries; preserves the earliest first-seen
// timestamp and prevents accidental reopening of previously REJECTED/ARCHIVED entries.
export function mergeWatchlist(current,updates,{publishedAt}={}){
  validateWatchlist(current);
  if(!Array.isArray(updates))fail('Updates müssen ein Array sein');
  const ids=new Set(),data=new Map(current.candidates.map(x=>[x.candidate_id,x]));
  for(const input of updates){
    validateCandidate(input);
    if(ids.has(input.candidate_id))fail('Doppelte Update-ID');ids.add(input.candidate_id);
    const old=data.get(input.candidate_id);
    if(old){
      if(utc(input.last_checked_at_utc)<utc(old.last_checked_at_utc))continue;
      if(['REJECTED','ARCHIVED'].includes(old.state)&&old.state!==input.state)
        fail('Abgelehnte oder archivierte Kandidaten dürfen nicht automatisch reaktiviert werden');
      const first=utc(old.first_seen_at_utc)<utc(input.first_seen_at_utc)?old.first_seen_at_utc:input.first_seen_at_utc;
      const sources=[...new Set([...old.source_urls,...input.source_urls])];
      data.set(input.candidate_id,{...input,first_seen_at_utc:first,source_urls:sources.slice(0,12)});
    }else data.set(input.candidate_id,input);
  }
  const result={...current,published_at_utc:publishedAt??current.published_at_utc,candidates:[...data.values()]
    .sort((a,b)=>a.candidate_id.localeCompare(b.candidate_id,'en'))};
  validateWatchlist(result);
  return result;
}
export function dueCandidates(current,{now,limit=5}={}){
  validateWatchlist(current);
  const timestamp=typeof now==='string'?utc(now):Date.now();
  if(!Number.isInteger(limit)||limit<1||limit>100)fail('Ungültiges Arbeitslimit');
  const ranks={HIGH:0,NORMAL:1,LOW:2};
  return current.candidates.filter(c=>!['REJECTED','ARCHIVED'].includes(c.state)&&
    utc(c.next_check_not_before_utc)<=timestamp)
    .sort((a,b)=>ranks[a.priority]-ranks[b.priority]||
      utc(a.next_check_not_before_utc)-utc(b.next_check_not_before_utc)||
      a.candidate_id.localeCompare(b.candidate_id,'en'))
    .slice(0,limit);
}
