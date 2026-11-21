// Deterministic discovery funnel: no winners list or future returns as input.
// All candidates survive, including rejected, undated and missing-contract pools.
import {canonicalChain,poolValid,tokenValid,exactPoolUrl} from './market-evidence.mjs';
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const timestamp=x=>typeof x==='string'&&ISO.test(x)&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const nonnegative=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;
const canonicalPool=(chain,pool)=>chain==='solana'?pool:pool?.toLowerCase();
export function prioritizeDiscoveredPools(candidates,{asOfUtc,detailedLimit=24}={}){
 if(!Array.isArray(candidates))throw Error('INVALID_CANDIDATE_SET');
 const now=timestamp(asOfUtc);
 if(now===null)throw Error('INVALID_RESEARCH_TIMESTAMP');
 if(!Number.isInteger(detailedLimit)||detailedLimit<0)throw Error('INVALID_DETAIL_LIMIT');
 const rows=candidates.map((x,i)=>{
  const chain=canonicalChain(x?.chain),pool=x?.pool,contract=x?.contract||null;
  const errors=[],seen=timestamp(x?.observed_at_utc);
  if(!chain)errors.push('UNKNOWN_CHAIN');
  if(!poolValid(chain,pool,x?.pool_kind))errors.push('POOL_UNVERIFIED');
  if(!tokenValid(chain,contract))errors.push('CONTRACT_UNVERIFIED');
  if(!exactPoolUrl(x?.source_url,chain,pool))errors.push('DETAIL_URL_UNVERIFIED');
  if(seen===null||seen>now)errors.push('INVALID_OR_FUTURE_OBSERVATION');
  const ageMinutes=seen===null||seen>now?null:(now-seen)/60000;
  if(ageMinutes!==null&&ageMinutes>60)errors.push('STALE_DISCOVERY');
  const liq=nonnegative(x?.liquidity_usd),volume=nonnegative(x?.volume_24h_usd);
  if(liq===null)errors.push('LIQUIDITY_UNKNOWN');
  if(volume===null)errors.push('VOLUME_UNKNOWN');
  // Scores reflect only data visible at the selected time, not winner identity.
  const freshness=ageMinutes===null?0:ageMinutes<=10?20:ageMinutes<=60?10:0;
  const category=String(x?.category||'').toUpperCase();
  const priority= (category.includes('REACTIVATED')?30:category.includes('NEW')?25:category.includes('TREND')?15:5)
    +freshness+(liq===null?0:Math.min(15,Math.log10(Math.max(1,liq))*3))
    +(volume===null?0:Math.min(10,Math.log10(Math.max(1,volume))*2))
    +(errors.includes('CONTRACT_UNVERIFIED')?-8:8);
  const key=chain&&poolValid(chain,pool,x?.pool_kind)?chain+':'+canonicalPool(chain,pool):'unresolved:'+i;
  return {input_index:i,key,chain:chain||null,pool:pool||null,contract,
   symbol:x?.symbol||null,category:x?.category||null,observed_at_utc:x?.observed_at_utc||null,
   liquidity_usd:liq,volume_24h_usd:volume,priority:Math.round(priority*100)/100,
   errors,status:errors.length?'WATCH_OR_VERIFY':'READY_FOR_RISK_REVIEW',source_url:x?.source_url||null};
 });
 const dedup=new Map(),duplicates=[];
 for(const row of rows){
  if(!dedup.has(row.key)){dedup.set(row.key,row);continue;}
  const previous=dedup.get(row.key);
  duplicates.push({key:row.key,merged_input_index:row.input_index});
  // No evidence lost: identify all source rows in duplicates.
  if(row.errors.length<previous.errors.length || (row.errors.length===previous.errors.length&&row.priority>previous.priority))
    dedup.set(row.key,row);
 }
 const ranked=[...dedup.values()].sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key));
 return {schema:1,input_count:rows.length,unique_count:ranked.length,
   reviewed_in_depth:ranked.slice(0,detailedLimit),pending_queue:ranked.slice(detailedLimit),
   all_candidates:ranked,duplicates,coverage_status:rows.length?'SAMPLE_ONLY_NOT_MARKET_COMPLETE':'NO_SOURCES',
   blocked_contracts:ranked.filter(x=>x.errors.includes('CONTRACT_UNVERIFIED')).length,
   caution:'No buy authorization: all candidates preserved; scores exclude historical winner lists and future prices.'};
}
