// Local exact-pool research -> GitHub-safe subset for five autonomous Dots.
// Public facts only. This cannot contain orders, balances, keys or LIVE approval.
import {readFile} from 'node:fs/promises';
import {candidateId} from './research-watchlist.mjs';

const MAX_AGE=15*60000;
const allowedReasons=new Set(['IDENTITY_ONLY_RISK_AND_SELL_QUOTE_STILL_UNKNOWN',
 'TWO_EXACT_PROVIDER_IDENTITIES_REQUIRED','PRICE_OR_LIQUIDITY_UNKNOWN',
 'CROSS_PROVIDER_MARKET_METRICS_CONFLICT','INVALID_CANDIDATE_IDENTITY','READBACK_EXCEPTION']);
const verifyId=v=>{
 const p=typeof v==='string'?v.split(':'):[];
 if(p.length!==3)return false;
 try{return candidateId(p[0],p[1],p[2])===v}catch{return false}
};
export function sanitizePoolReadbacks(value,{now=Date.now()}={}){
 if(value?.schema!=='pool_readback_batch.v1'||value.paper_only!==true||
    value.actionable!==false||!Array.isArray(value.results)||value.results.length>3||
    typeof value.checked_at_utc!=='string')throw Error('INVALID_POOL_READBACK_BRIDGE');
 const at=Date.parse(value.checked_at_utc);
 if(!Number.isFinite(at)||at>now||now-at>MAX_AGE)return [];
 return value.results.flatMap(x=>{
  if(!x||!verifyId(x.candidate_id)||x.paper_only!==true||
    x.actionable!==false||x.paper_entry_authorized!==false||
    x.executable_buy_quote!==false||x.executable_sell_quote!==false||
    x.contract_status!=='UNKNOWN'||x.sellability_status!=='UNKNOWN'||
    !allowedReasons.has(x.reason)||!['UNVERIFIED','IDENTITY_MATCHED'].includes(x.status)||
    typeof x.market_identity_verified!=='boolean')return [];
  // Defensive output whitelist: no input extras, no prices, no identifiers beyond pool ID.
  return [{
   candidate_id:x.candidate_id,
   checked_at_utc:value.checked_at_utc,
   status:x.status,market_identity_verified:x.market_identity_verified,
   reason:x.reason,source_names:['GECKOTERMINAL','DEXSCREENER'],
   contract_status:'UNKNOWN',sellability_status:'UNKNOWN',
   executable_sell_quote:false,paper_entry_authorized:false,
   paper_only:true,actionable:false
  }];
 });
}
export async function readPublicPoolReadbacks({filename,now=Date.now()}={}){
 if(typeof filename!=='string')throw Error('INVALID_READBACK_FILE');
 let raw;
 try{raw=await readFile(filename)}catch(e){if(e?.code==='ENOENT')return [];throw e}
 if(raw.length>128*1024)throw Error('POOL_READBACK_BRIDGE_TOO_LARGE');
 return sanitizePoolReadbacks(JSON.parse(raw.toString('utf8')),{now});
}
