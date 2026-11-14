// V0.9 autonomous READ-ONLY cross-provider research step.
// Exactly three candidates per bounded 5-minute batch; no paper actions.
import {readbackExactPool} from './live-pool-readback.mjs';
import {checkReadOnlyOnchainExistence} from './onchain-existence-readback.mjs';
export const READBACK_INTERVAL_MS=5*60_000;
export const READBACK_BATCH_LIMIT=3;

export async function runPoolReadbackBatch({network,fetcher=fetch,now=new Date().toISOString()}={}){
 if(!Number.isFinite(Date.parse(now)))throw Error('INVALID_READBACK_BATCH_TIME');
 const at=new Date(now).toISOString();
 const candidates=network?.advisories?.candidates;
 if(network?.paper_only!==true||network?.actionable!==false||
   network?.watchlist?.stale!==false||!Array.isArray(candidates))
  return {schema:'pool_readback_batch.v1',paper_only:true,actionable:false,
   checked_at_utc:at,status:'SKIPPED_NO_FRESH_RESEARCH',results:[],attempted:0,
   warning:'Kein frischer öffentlicher Forschungsinput. Keine Paper-Orders.'};
 const selected=[];const seen=new Set();
 for(const c of candidates){
  if(selected.length>=READBACK_BATCH_LIMIT)break;
  if(['REJECTED','ARCHIVED'].includes(c?.watchlist_state)||
    typeof c?.candidate_id!=='string'||seen.has(c.candidate_id))continue;
  selected.push(c);seen.add(c.candidate_id);
 }
 const results=[];
 for(const c of selected){
  try{
   const pool=await readbackExactPool(c,{fetcher,now:at});
   const onchain=await checkReadOnlyOnchainExistence(c,{fetcher,now:at});
   results.push({...pool,onchain_existence:onchain});
  }
  catch(e){results.push({schema:'exact_pool_readback.v1',paper_only:true,actionable:false,
    candidate_id:c.candidate_id||null,checked_at_utc:at,
    status:'UNVERIFIED',reason:'READBACK_EXCEPTION',market_identity_verified:false,
    contract_status:'UNKNOWN',sellability_status:'UNKNOWN',
    executable_buy_quote:false,executable_sell_quote:false,
    paper_entry_authorized:false})}
 }
 return {schema:'pool_readback_batch.v1',paper_only:true,actionable:false,
  checked_at_utc:at,status:'COMPLETED_READ_ONLY',attempted:results.length,results,
  warning:'Poolidentität von zwei Kursaggregatoren ist KEINE Betrugs-/Handelbarkeit-/Sellability-Prüfung und erlaubt keinen Paper-Kauf.'};
}
