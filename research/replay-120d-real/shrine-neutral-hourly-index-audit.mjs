// R29 neutral market-history availability audit. NO winner lists, trading, downloads of
// transaction bodies, order publishing or account access. Index only, read-only.
// This source may have missing protocols, reorgs and independent quote gaps.
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

export const SOURCE_INDEX='https://replay.shrine.trade/pump/index.json';
export const TEST_START='2026-09-18';
export const TEST_END_EXCLUSIVE='2026-11-17';
export const TRAIN_START='2026-07-20';
const DAY=86400000;
const HOUR=3600000;
const hourToTime=x=>{
 if(typeof x!=='string'||!/^20\d\d\/(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/(?:[01]\d|2[0-3])$/.test(x))return NaN;
 const t=Date.parse(x.slice(0,4)+'-'+x.slice(5,7)+'-'+x.slice(8,10)+'T'+x.slice(11,13)+':00:00Z');
 return Number.isFinite(t)?t:NaN;
};
const dateUTC=t=>new Date(t).toISOString().slice(0,10);
const sha=x=>createHash('sha256').update(x).digest('hex');

export function inspectArchiveIndex(parsed,{raw_sha256='0'.repeat(64)}={}){
 if(!parsed||parsed.base!=='https://replay.shrine.trade/pump'||
    !Array.isArray(parsed.hours)||parsed.hours.length>200000||
    !/^[a-f0-9]{64}$/.test(raw_sha256))
  throw Error('SHRINE_ARCHIVE_INDEX_SCHEMA_INVALID');
 const times=new Set();
 for(const h of parsed.hours){
  const t=hourToTime(h);
  if(!Number.isFinite(t)||times.has(t))throw Error('SHRINE_INDEX_DUPLICATE_OR_INVALID_HOUR');
  times.add(t);
 }
 const sorted=[...times].sort((a,b)=>a-b);
 const start=Date.parse(TRAIN_START+'T00:00:00Z');
 const end=Date.parse(TEST_END_EXCLUSIVE+'T00:00:00Z');
 const days=[];
 for(let t=start;t<end;t+=DAY){
  const actual=Array.from({length:24},(_,i)=>i).filter(i=>times.has(t+i*HOUR));
  days.push({day_utc:dateUTC(t),
   phase:t<Date.parse(TEST_START+'T00:00:00Z')?'TRAIN':'TEST',
   available_archived_hours:actual.length,
   missing_hours:24-actual.length,
   hours_utc:actual,
   provenance:'ARCHIVE_INDEX_ONLY_NOT_EXECUTION_OR_ASOF_SOCIAL_PROOF'});
 }
 return {
  schema:'r29_neutral_120d_hourly_archive_index_availability.v1',
  source_url:SOURCE_INDEX,raw_index_sha256:raw_sha256,
  report_class:'HISTORICAL_PUBLIC_ARCHIVE_INDEX_ONLY',
  no_user_known_winner_list_used:true,
  total_index_hours:sorted.length,
  earliest_index_hour_utc:sorted.length?new Date(sorted[0]).toISOString():null,
  latest_index_hour_utc:sorted.length?new Date(sorted.at(-1)).toISOString():null,
  train_days_with_any_archived_hour:days.filter(d=>d.phase==='TRAIN'&&d.available_archived_hours>0).length,
  train_days_with_all_24_archived_hours:days.filter(d=>d.phase==='TRAIN'&&d.available_archived_hours===24).length,
  test_days_with_any_archived_hour:days.filter(d=>d.phase==='TEST'&&d.available_archived_hours>0).length,
  test_days_with_all_24_archived_hours:days.filter(d=>d.phase==='TEST'&&d.available_archived_hours===24).length,
  train_hour_total:days.filter(d=>d.phase==='TRAIN').reduce((a,d)=>a+d.available_archived_hours,0),
  test_hour_total:days.filter(d=>d.phase==='TEST').reduce((a,d)=>a+d.available_archived_hours,0),
  source_capture_asof_transaction_attestation:false,
  executable_historical_bidirectional_quotes_attested:false,
  individual_GPT_model_scans_conducted:0,portfolio_pnl_test_usdc:null,
  days};
}
export async function probeArchiveIndex({fetcher=fetch,timeoutMs=20000}={}){
 const response=await fetcher(SOURCE_INDEX,{headers:{accept:'application/json'},
  signal:AbortSignal.timeout(timeoutMs),redirect:'error'});
 if(!response.ok)throw Error('SHRINE_ARCHIVE_HTTP_'+response.status);
 const length=Number(response.headers?.get?.('content-length')||0);
 if(length>3_000_000)throw Error('SHRINE_INDEX_OVERSIZE');
 const raw=await response.text();
 if(raw.length>3_000_000)throw Error('SHRINE_INDEX_OVERSIZE');
 let data;
 try{data=JSON.parse(raw)}catch{throw Error('SHRINE_INDEX_INVALID_JSON')}
 const audit=inspectArchiveIndex(data,{raw_sha256:sha(raw)});
 return {...audit,inspected_at_utc:new Date().toISOString(),
  warning:'Hourly archive coverage, not proof of exact swap quotes or independent unbiased social data. No index hour selected using winner names.'};
}
if(process.argv[1]?.endsWith('shrine-neutral-hourly-index-audit.mjs')){
 try{
  const result=await probeArchiveIndex();
  const target=resolve(process.argv[2]||'research/replay-120d-real/generated/shrine-hourly-archive-120d.json');
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,JSON.stringify(result,null,2)+'\n','utf8');
  console.log('R29_NEUTRAL_ARCHIVE_120D',JSON.stringify({
   index_hours:result.total_index_hours,
   train_hours:result.train_hour_total,train_full_days:result.train_days_with_all_24_archived_hours,
   test_hours:result.test_hour_total,test_full_days:result.test_days_with_all_24_archived_hours,
   first:result.earliest_index_hour_utc,last:result.latest_index_hour_utc,
   no_actual_gpt_trades:true}));
 }catch(e){console.error('R29_NEUTRAL_ARCHIVE_ERROR',String(e.message||e));process.exitCode=1;}
}
