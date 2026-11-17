// R29 archived neutral Solana event adapter, read-only.
// Normalizes ALL eligible observed events; never token-name or later-winner filter.
// Price is expressed IN THE EVENT'S QUOTE ASSET, NOT implicitly in USD.
// Archived stream may contain unfinalized forks; confirmation separate.
import {createHash} from 'node:crypto';
const sha=/^[a-f0-9]{64}$/i;
const ACTIONS=new Map([
 ['create','TOKEN_CREATE'],['buy','DEX_BUY'],['sell','DEX_SELL'],
 ['createPool','POOL_CREATE'],['add','POOL_LIQUIDITY'],['remove','POOL_LIQUIDITY'],
 ['migrate','MIGRATION'],['curveComplete','MIGRATION']
]);
const ms=x=>typeof x==='number'&&Number.isFinite(x)?x:NaN;
const good=x=>typeof x==='string'&&x.length>=32&&x.length<=44;
const goodSignature=x=>typeof x==='string'&&x.length>=64&&x.length<=100;
const eventTime=x=>new Date(x).toISOString();
export function normalizeNeutralShrineEvent(raw,{archive_hour_utc,archive_sha256}={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 if(!sha.test(archive_sha256||''))throw Error('RAW_HOUR_SHA256_NOT_VERIFIED');
 if(typeof archive_hour_utc!=='string'||!/^20\d\d-\d\d-\d\dT\d\d:00:00Z$/.test(archive_hour_utc))
  throw Error('PINNED_ARCHIVE_HOUR_REQUIRED');
 const start=Date.parse(archive_hour_utc),end=start+3600000;
 if(!Number.isFinite(start))throw Error('PINNED_ARCHIVE_HOUR_INVALID');
 const action=ACTIONS.get(raw.action);
 if(!action||!good(raw.mint))return null;
 const eventMs=ms(raw.timestamp)*1000;
 const captureMs=ms(raw.localTimestamp);
 if(!Number.isFinite(eventMs)||!Number.isFinite(captureMs)||eventMs<start-60000||
   eventMs>end+60000||captureMs<start-60000||
   captureMs>end+60000||captureMs<eventMs-60000)
  throw Error('ORIGINAL_STREAM_TIMESTAMP_INVALID');
 if(!goodSignature(raw.signature)||!Number.isSafeInteger(raw.block)||raw.block<=0)
  throw Error('ORIGINAL_CHAIN_SIGNATURE_AND_SLOT_REQUIRED');
 if(!['buy','sell'].includes(raw.action)&&raw.price!==undefined)
  throw Error('NONTRADE_PRICE_FIELD_UNTRUSTED');
 const sourceID=[archive_hour_utc,raw.block,raw.signature,raw.action,
   typeof raw.pool==='string'?raw.pool:'?',raw.txIndex??0].join(':');
 const id=createHash('sha256').update(sourceID).digest('hex');
 const result={
  event_id:'solana:'+id,
  event_type:action,
  event_at_utc:eventTime(eventMs),
  provider_captured_at_utc:eventTime(captureMs),
  chain:'solana',
  token_address:raw.mint,
  pool_address:good(raw.pool)?raw.pool:null,
  venue:raw.protocol||'UNKNOWN',
  source_sha256:archive_sha256,
  source_id:'shrine:hour:'+archive_hour_utc,
  quote_asset:good(raw.quoteMint)?raw.quoteMint:null,
  transaction_signature:raw.signature,
  transaction_finality:'unverified',
  data_quality:'ARCHIVED_PROVIDER_EVENT_NOT_CONFIRMED_EXECUTABLE_FILL',
  source_recorded_trade_price_quote:null,
  source_recorded_token_amount:null,
  source_recorded_quote_amount:null,
  source_recorded_token_reserve:null,
  source_recorded_quote_reserve:null
 };
 if(action==='DEX_BUY'||action==='DEX_SELL'){
  const numericFields=[['price','source_recorded_trade_price_quote'],
   ['tokenAmount','source_recorded_token_amount'],
   ['quoteAmount','source_recorded_quote_amount'],
   ['tokensInPool','source_recorded_token_reserve'],
   ['quoteInPool','source_recorded_quote_reserve']];
  for(const [from,to] of numericFields){
   const n=raw[from];
   if(typeof n==='number'&&Number.isFinite(n)&&n>=0)result[to]=n;
  }
 }
 return result;
}
export function normalizeNeutralShrineHour(rawEvents,metadata){
 if(!Array.isArray(rawEvents)||rawEvents.length>200000)throw Error('UNBOUNDED_ARCHIVE_BUFFER');
 const normalized=rawEvents.map(x=>normalizeNeutralShrineEvent(x,metadata)).filter(Boolean);
 return normalized.sort((a,b)=>a.provider_captured_at_utc.localeCompare(b.provider_captured_at_utc)||
  a.event_id.localeCompare(b.event_id));
}
