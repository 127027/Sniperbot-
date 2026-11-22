// Durable, append-only evidence references and pool identity; no trading authority.
// All history remains in immutable research/feeds/... and Git commit history.
// This compact index preserves every distinct pool without imposing an age cutoff.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const iso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?new Date(s).toISOString():null;
const ident=(chain,pool)=>chain+':'+(chain==='solana'?pool:String(pool).toLowerCase());
export function emptyMarketMemory(){
 return {schema:1,kind:'R29_PERSISTENT_MARKET_MEMORY',mode:'PAPER_RESEARCH_ONLY',
  generated_at_utc:null,last_ingested_source_path:null,pools:{},checkpoints:{},ingested_sources:[],
  stats:{total_discovered:0,total_observation_batches:0}};
}
export function mergeMemory(existing,{candidates=[],sourcePath,sourceCapturedAtUtc,sourceSha256=null,
 chain=null,page=1,provider='GECKOTERMINAL',fetchStatus='OK',retryAfterUtc=null}={}){
 const t=iso(sourceCapturedAtUtc);
 if(!t||!sourcePath?.startsWith('research/')||!Array.isArray(candidates))throw Error('INVALID_MEMORY_EVIDENCE');
 if(existing&&existing.kind!=='R29_PERSISTENT_MARKET_MEMORY')throw Error('MEMORY_SCHEMA_MISMATCH');
 const memory=structuredClone(existing||emptyMarketMemory());
 if(!Array.isArray(memory.ingested_sources))throw Error('INVALID_MEMORY_INDEX');
 if(memory.ingested_sources.includes(sourcePath))return {memory,added:0,updated:0,duplicates:0,already_ingested:true};
 let added=0,updated=0,duplicates=0,invalid=0,contractConflicts=0;
 for(const c of candidates){
  const canonical=canonicalChain(c.chain),pool=c.pool,seen=iso(c.observed_at_utc||sourceCapturedAtUtc);
  if(!canonical||!poolValid(canonical,pool,c.pool_kind)||!seen||Date.parse(seen)>Date.parse(t)){invalid++;continue;}
  const k=ident(canonical,pool),validContract=tokenValid(canonical,c.contract)?c.contract:null;
  const old=memory.pools[k],ref={source_path:sourcePath,observed_at_utc:seen,
    source_sha256:sourceSha256||null,provider};
  if(!old){
   memory.pools[k]={chain:canonical,pool,pool_kind:c.pool_kind==='UNISWAP_V4_POOL_ID'?'UNISWAP_V4_POOL_ID':null,contract:validContract,symbol:c.symbol||null,
    first_seen_at_utc:seen,last_seen_at_utc:seen,first_source_path:sourcePath,
    last_source_path:sourcePath,observation_count:1,source_refs:[ref],
    last_snapshot:{
      observed_at_utc:seen,source_path:sourcePath,provider,
      price_usd:Number.isFinite(c.observed_price_usd)&&c.observed_price_usd>0?c.observed_price_usd:
        Number.isFinite(c.price_usd)&&c.price_usd>0?c.price_usd:null,
      liquidity_usd:Number.isFinite(c.liquidity_usd)&&c.liquidity_usd>=0?c.liquidity_usd:null
    },
    contract_conflicts:[],source_categories:[c.category||'UNCATEGORIZED'],
    status:'PENDING_RESEARCH_NOT_BUY_ELIGIBLE'};
   added++;continue;
  }
  if(c.pool_kind==='UNISWAP_V4_POOL_ID'&&poolValid(canonical,pool,c.pool_kind))old.pool_kind=c.pool_kind;
   const prior=old.source_refs||[];
  if(prior.some(x=>x.source_path===sourcePath)){duplicates++;continue;}
  old.source_refs=[...prior,ref];
  old.observation_count++;
  if(Date.parse(seen)>Date.parse(old.last_seen_at_utc)){
   old.last_seen_at_utc=seen;old.last_source_path=sourcePath;
   if(c.symbol)old.symbol=c.symbol;
   const price=Number.isFinite(c.observed_price_usd)&&c.observed_price_usd>0?c.observed_price_usd:
     Number.isFinite(c.price_usd)&&c.price_usd>0?c.price_usd:null;
   const liq=Number.isFinite(c.liquidity_usd)&&c.liquidity_usd>=0?c.liquidity_usd:null;
   if(price!==null||liq!==null){
     old.last_snapshot={observed_at_utc:seen,source_path:sourcePath,provider,
       price_usd:price,liquidity_usd:liq,
       previous_price_usd:old.last_snapshot?.price_usd??null,
       previous_liquidity_usd:old.last_snapshot?.liquidity_usd??null};
   }
  }
  if(Date.parse(seen)<Date.parse(old.first_seen_at_utc)){
   old.first_seen_at_utc=seen;old.first_source_path=sourcePath;
  }
  if(validContract&&old.contract&&
   (canonical==='solana'?validContract!==old.contract:validContract.toLowerCase()!==old.contract.toLowerCase())){
   old.contract_conflicts=[...new Set([...(old.contract_conflicts||[]),validContract])];contractConflicts++;
  }else if(validContract&&!old.contract)old.contract=validContract;
  if(c.category)old.source_categories=[...new Set([...(old.source_categories||[]),c.category])];
  updated++;
 }
 memory.ingested_sources.push(sourcePath);
 const checkpointKey=(chain||'unknown')+':'+provider;
 const prev=memory.checkpoints[checkpointKey]||{};
 const failed=fetchStatus!=='OK',retry=retryAfterUtc===null?null:iso(retryAfterUtc);
 if(retryAfterUtc!==null&&!retry)throw Error('INVALID_RETRY_AFTER_UTC');
 memory.checkpoints[checkpointKey]={chain:chain||null,provider,page,
  last_attempt_at_utc:t,last_success_at_utc:fetchStatus==='OK'?t:(prev.last_success_at_utc||null),
  last_source_path:sourcePath,last_status:fetchStatus,
  next_page_to_consider:fetchStatus==='OK'?Math.max(page+1,prev.next_page_to_consider||1):Math.max(page,prev.next_page_to_consider||1),
  failed_page_to_retry:failed?page:null,
  consecutive_failures:failed?(prev.consecutive_failures||0)+1:0,
  retry_after_utc:failed?retry:null,
  // Cursor means last observed paging position, not proof that later pages were captured.
  backlog_open:true};
 memory.generated_at_utc=t;memory.last_ingested_source_path=sourcePath;
 memory.stats={total_discovered:Object.keys(memory.pools).length,
  total_observation_batches:memory.ingested_sources.length,
  contracts_complete:Object.values(memory.pools).filter(x=>tokenValid(x.chain,x.contract)).length,
  unresolved_identity_conflicts:Object.values(memory.pools).filter(x=>x.contract_conflicts.length>0).length};
 return {memory,added,updated,duplicates,invalid,contractConflicts,already_ingested:false};
}
export function planIncrementalScan(memory,{asOfUtc,chains=['solana','base','ethereum','bsc','robinhood','cronos'],maxRechecks=6}={}){
 const now=iso(asOfUtc);
 if(!now||!Number.isInteger(maxRechecks)||maxRechecks<0)throw Error('INVALID_SCAN_PLAN');
 const m=memory||emptyMarketMemory();
 const all=Object.values(m.pools||{}).filter(x=>iso(x.last_seen_at_utc)&&Date.parse(x.last_seen_at_utc)<=Date.parse(now));
 // Every past pool remains available. This is only a bounded REQUEST budget.
 all.sort((a,b)=>Date.parse(a.last_seen_at_utc)-Date.parse(b.last_seen_at_utc)
  ||ident(a.chain,a.pool).localeCompare(ident(b.chain,b.pool)));
 const selected=all.slice(0,maxRechecks);
 return {schema:1,as_of_utc:now,history_access_policy:'ALL_PERSISTED_OBSERVATIONS_NO_AGE_CUTOFF',
  market_coverage_status:'INCOMPLETE_PUBLIC_SAMPLES',
  historical_pool_count:all.length,previously_discovered_count:all.length,
  recheck_pool_keys:selected.map(x=>ident(x.chain,x.pool)),
  rechecks:selected.map(x=>({chain:x.chain,pool:x.pool,pool_kind:x.pool_kind||null,contract:x.contract,first_seen_at_utc:x.first_seen_at_utc,
   last_seen_at_utc:x.last_seen_at_utc,status:x.status})),
  chains_requested:chains,chains_without_successful_capture:chains.filter(c=>!m.checkpoints[c+':GECKOTERMINAL']?.last_success_at_utc),
  not_all_pools_rechecked:selected.length<all.length,
  warnings:['A full memory is not a full market.','Live quotes must be re-fetched before any PAPER order.']};
}
export function compactMemoryWithoutEvidenceLoss(memory){
 // Explicit no-op: there is no user-authorized pruning of immutable evidence,
 // trade receipts, snapshots or historical research references.
 if(memory?.kind!=='R29_PERSISTENT_MARKET_MEMORY')throw Error('MEMORY_SCHEMA_MISMATCH');
 return {memory:structuredClone(memory),deleted_files:[],archived_files:[],reason:'NO_SAFE_DELETE_WITHOUT_ARCHIVAL_PROOF'};
}
