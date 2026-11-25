// Incremental compact index: archival research only, not an executable quote.
import {identity} from './catalog.mjs';
const clone=x=>JSON.parse(JSON.stringify(x)), validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x)),validSHA=x=>/^[a-f0-9]{40}$/.test(x??'');
const https=x=>typeof x==='string'&&/^https:\/\/[^\s]+$/.test(x);
export function mergeIndex(index,report){
 if(index.schema!=='r34.index.v1'||!Array.isArray(index.coins)||!Array.isArray(index.updated_from_reports))throw Error('INVALID_INDEX');
 if(!/^reports\/\d{4}-\d{2}-\d{2}\/\d{2}\/[^/]+\.json$/.test(report.path)||!validSHA(report.sha)||!validTime(report.data?.completed_at_utc))throw Error('INVALID_REPORT');
 const old=index.updated_from_reports.find(x=>x.path===report.path);if(old){if(old.sha!==report.sha)throw Error('REPORT_HASH_CONFLICT');return index}
 const result=clone(index), map=new Map(result.coins.map(x=>[x.key,x]));if(map.size!==result.coins.length)throw Error('DUPLICATE_INDEX_IDENTITY');
 const when=new Date(report.data.completed_at_utc).toISOString(),rows=[...(report.data.research_decisions??report.data.decisions??[]),...(report.data.quote_tracking??[])];
 for(const row of rows){const id=identity(row.chain,row.contract),name=typeof row.coin==='string'?row.coin.trim():'';if(!id||!name)continue;
  const x=map.get(id.key)??{...id,aliases:[],first_seen:when,first_report:report.path,last_seen:when,last_report:report.path,reported_launch_at:null,pool_urls:[],last_action:null,identity_status:'REPORTED_FULL_CONTRACT_NOT_ONCHAIN_VERIFIED'};
  x.aliases=[...new Set([...x.aliases,name])].sort();
  if(when<x.first_seen){x.first_seen=when;x.first_report=report.path}
  const newer=when>=x.last_seen;
  if(newer){x.last_seen=when;x.last_report=report.path;x.last_action=row.disposition??row.r32??row.action??x.last_action}
  if(https(row.pool_url))x.pool_urls=[...new Set([row.pool_url,...x.pool_urls])].slice(0,3);
  const pool=identity(row.chain,row.pool_address);if(newer&&pool&&https(row.pool_url)){x.reported_pool={address:pool.contract,url:row.pool_url,quote_token:row.quote_token??null,dex:row.dex??null,report:report.path,sha:report.sha};}
  map.set(id.key,x);
 }
 result.coins=[...map.values()].sort((a,b)=>a.key.localeCompare(b.key));result.updated_from_reports=[...result.updated_from_reports,{path:report.path,sha:report.sha}].slice(-24);result.revision++;
 if(result.coins.length>1000||Buffer.byteLength(JSON.stringify(result),'utf8')>200*1024)throw Error('INDEX_SHARDING_REQUIRED');
 return result;
}
