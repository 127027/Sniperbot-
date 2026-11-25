// Staged adapter: strategy without a mandatory execution quote, local verified quote injected.
// No network, no live-feed mutation, no private account transport.
import {identity,validateBroadcast} from '../../r31/broadcast.mjs';
const iso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const actions=new Set(['BUY','HOLD','SELL','WATCH','NO_TRADE','DATA_GAP']);
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
export function validateIntents(s){
 if(!exact(s,['schema','mode','sequence','target_utc','published_at_utc','expires_at_utc','previous_blob_sha','decisions'])||s.schema!=='r32.intent.v1'||s.mode!=='PAPER_ONLY'||!Number.isSafeInteger(s.sequence)||s.sequence<1||!iso(s.target_utc)||!iso(s.published_at_utc)||!iso(s.expires_at_utc)||!Array.isArray(s.decisions)||s.decisions.length>500)throw Error('INVALID_INTENT');
 const t=Date.parse(s.target_utc),p=Date.parse(s.published_at_utc),e=Date.parse(s.expires_at_utc);
 if(s.target_utc.slice(14)!=='00:00.000Z'||p<t||p>t+600000||e<=p||e>t+900000)throw Error('INVALID_INTENT_WINDOW');
 if(s.sequence===1?s.previous_blob_sha!==null:!/^[a-f0-9]{40}$/.test(s.previous_blob_sha??''))throw Error('INVALID_PREVIOUS');
 const seen=new Set();
 for(const d of s.decisions){
  if(!exact(d,['coin','chain','contract','action','reason','research_url','max_entry_price_eur'])||!actions.has(d.action)||typeof d.coin!=='string'||!d.coin.trim()||typeof d.reason!=='string'||!d.reason.trim()||!https(d.research_url))throw Error('INVALID_INTENT_DECISION');
  const k=identity(d);if(seen.has(k))throw Error('DUPLICATE_INTENT');seen.add(k);
  if(d.max_entry_price_eur!==undefined&&(d.action!=='BUY'||!Number.isFinite(d.max_entry_price_eur)||d.max_entry_price_eur<=0))throw Error('INVALID_ENTRY_CEILING');
 }
 return s;
}
// Input quotes must be supplied by a separately verified local market-data adapter.
// A quote cannot be made fresh by using fetch time or by copying a strategy timestamp.
export function resolveLocalExecution({intent,quotes,now}){
 validateIntents(intent);
 if(!iso(now)||Date.parse(now)<Date.parse(intent.published_at_utc)||Date.parse(now)>=Date.parse(intent.expires_at_utc))throw Error('INTENT_NOT_CURRENT');
 if(!Array.isArray(quotes))throw Error('INVALID_QUOTES');
 const m=new Map(),n=Date.parse(now);
 for(const q of quotes){const k=identity(q);if(m.has(k))throw Error('DUPLICATE_QUOTE');m.set(k,q)}
 const decisions=[],statuses=[];
 for(const d of intent.decisions){
  const {coin,chain,contract,action,reason}=d,k=identity(d),q=m.get(k);
  let out={coin,chain,contract,action,reason:'[INTENT '+action+'] '+reason},status='NOT_EXECUTABLE_ACTION';
  if(['BUY','HOLD','SELL'].includes(action)){
   const valid=q&&q.verified===true&&Number.isFinite(q.price_eur)&&q.price_eur>0&&iso(q.observed_at_utc)&&Date.parse(q.observed_at_utc)<=n&&n-Date.parse(q.observed_at_utc)<=900000&&https(q.source_url);
   if(!valid){out.action='DATA_GAP';out.reason+=' | execution: no verified fresh quote';status='PRICE_PENDING'}
   else if(action==='BUY'&&d.max_entry_price_eur!==undefined&&q.price_eur>d.max_entry_price_eur){out.action='WATCH';out.reason+=' | execution: above entry ceiling';status='ENTRY_CEILING_EXCEEDED'}
   else {Object.assign(out,{price_eur:q.price_eur,observed_at_utc:q.observed_at_utc,source_url:q.source_url});status='QUOTE_READY'}
  }
  decisions.push(out);statuses.push({coin,chain,contract,intent:action,status});
 }
 // Local-only projection at actual execution time. Never upload as a published broadcast.
 // Local receipt identity must be the verified original intent blob, not the projection hash.
 const execution={schema:'r31.broadcast.v1',mode:'PAPER_ONLY',sequence:intent.sequence,target_utc:intent.target_utc,published_at_utc:now,expires_at_utc:intent.expires_at_utc,previous_blob_sha:intent.previous_blob_sha,decisions};
 // V1 restricts publication to +10min. For now only allow local projection in that window;
 // the transport migration must explicitly support execution through +15min before deployment.
 validateBroadcast(execution);
 return {execution,statuses};
}
