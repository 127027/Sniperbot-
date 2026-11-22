// R29 V1.9: as-of neutral market universe. NEVER import winner manifests as discovery.
import {canonicalChain,tokenValid,poolValid} from './market-evidence.mjs';
import {classifyAsOfEvidence,asOfMillis} from './v19-asof-evidence.mjs';
const norm=(c,x)=>c==='solana'?x:String(x).toLowerCase();
export function buildNeutralPoolRegistry({observations=[],asOfUtc}={}){
 if(!Array.isArray(observations)||asOfMillis(asOfUtc)===null)throw Error('INVALID_NEUTRAL_REGISTRY');
 const pools=new Map(),rejected=[];
 for(let i=0;i<observations.length;i++){
   const row=observations[i];
   if(!row||row.source_class==='POST_EVENT_ORACLE'
     ||row.kind==='R29_V19_POST_EVENT_WINNER_REFERENCE_REGISTER'
     ||'reported_gain_pct' in row||'post_event_rank' in row||'future_winner_label' in row){
     rejected.push({index:i,reason:'POST_EVENT_WINNER_INFORMATION_FORBIDDEN'});continue;
   }
   const v=classifyAsOfEvidence(row,{asOfUtc});
   if(!['PROVISIONAL_ASOF','SYNTHETIC_REGRESSION_ONLY'].includes(v.status)){
     rejected.push({index:i,reason:v.reason});continue;
   }
   const c=canonicalChain(row.chain??row.coin?.chain);
   const p=row.pool??row.coin?.pool,contract=row.contract??row.coin?.contract;
   const poolKind=row.pool_kind??row.coin?.pool_kind??null;
   if(!c||!poolValid(c,p,poolKind)){
     rejected.push({index:i,reason:'INVALID_CHAIN_OR_POOL'});continue;
   }
   const key=c+':'+norm(c,p),valid=tokenValid(c,contract);
   if(!pools.has(key))pools.set(key,{key,chain:c,pool:p,pool_kind:poolKind,
     contract:valid?contract:null,first_known_at_utc:row.observed_at_utc,
     last_known_at_utc:row.observed_at_utc,
     observations:0,source_paths:[],identity_conflicts:[],
     identity_status:valid?'CONTRACT_IDENTIFIED':'WATCH_IDENTITY_GAP',
     risk_approval:false,trade_authorized:false});
   const item=pools.get(key);
   item.observations++;
   if(asOfMillis(row.observed_at_utc)<asOfMillis(item.first_known_at_utc))
     item.first_known_at_utc=row.observed_at_utc;
   if(asOfMillis(row.observed_at_utc)>asOfMillis(item.last_known_at_utc))
     item.last_known_at_utc=row.observed_at_utc;
   if(typeof row.source_path==='string'&&row.source_path.startsWith('research/'))
     item.source_paths=[...new Set([...item.source_paths,row.source_path])];
   if(valid){
     if(item.contract&&norm(c,item.contract)!==norm(c,contract)){
       item.identity_conflicts=[...new Set([...item.identity_conflicts,item.contract,contract])];
       item.identity_status='IDENTITY_CONFLICT';
     }else if(!item.contract){item.contract=contract;item.identity_status='CONTRACT_IDENTIFIED';}
   }
 }
 const entries=[...pools.values()].sort((a,b)=>a.key.localeCompare(b.key));
 return {schema:1,kind:'R29_V19_NEUTRAL_ASOF_POOL_UNIVERSE',as_of_utc:asOfUtc,
   universe_source:'UNBIASED_RECORDED_MARKET_OBSERVATIONS_ONLY',
   winners_list_or_oracle_used:false,coverage_proven_complete:false,
   counts:{pools:entries.length,full_contracts:entries.filter(x=>x.contract).length,
     identity_gaps:entries.filter(x=>x.identity_status==='WATCH_IDENTITY_GAP').length,
     identity_conflicts:entries.filter(x=>x.identity_status==='IDENTITY_CONFLICT').length,
     rejected:rejected.length},
   entries,rejected,trade_authorized:false};
}
