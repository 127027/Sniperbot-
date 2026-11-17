// R29 historical TRAINING source schema pilot - 2026-07-20, earliest training day.
// Reads only first 256 neutral events from SECOND archive; no coin/price identity
// or later winner facts leave this pilot. This does not prove training coverage.
import {Readable} from 'node:stream';
import {createZstdDecompress} from 'node:zlib';
import {createInterface} from 'node:readline';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const URL='https://replay.pumpapi.io/2026/07/20/00.jsonl.zst';
const TYPES=['timestamp','localTimestamp','blockTime','slot','signature','mint',
 'pool','quoteMint','action','protocol','price','quoteAmount','tokensInPool',
 'quoteInPool','type','eventType','receivedAt','createdAt','transaction'];
const safeNum=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const type=x=>x===null?'null':Array.isArray(x)?'array':typeof x;
export async function probeFirstTrainingEvents({fetcher=fetch,limit=256}={}){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),120000);
 let reader,decoder,stream;
 try{
  const r=await fetcher(URL,{signal:abort.signal,redirect:'error'});
  if(!r.ok||!r.body)throw Error('TRAINING_ORIGINAL_ARCHIVE_NOT_FETCHABLE_'+r.status);
  stream=Readable.fromWeb(r.body);decoder=createZstdDecompress();
  stream.pipe(decoder);reader=createInterface({input:decoder,crlfDelay:Infinity});
  const fields=new Map(),actions=new Map(),protocols=new Map(),timestamps={};
  let read=0,bad=0,first=null,last=null;
  for await(const line of reader){
   if(read>=limit)break;
   let d;try{d=JSON.parse(line)}catch{bad++;continue;}
   if(!d||typeof d!=='object'||Array.isArray(d))continue;
   read++;
   if(!first)first=d;last=d;
   for(const k of Object.keys(d))fields.set(k,(fields.get(k)||0)+1);
   if(typeof d.action==='string')actions.set(d.action,(actions.get(d.action)||0)+1);
   if(typeof d.protocol==='string')protocols.set(d.protocol,(protocols.get(d.protocol)||0)+1);
  }
  for(const k of TYPES){
   if(fields.has(k)){
    timestamps[k]={
     field_seen_in_sample:fields.get(k),
     first_event_field_type:type(first[k]),last_event_field_type:type(last[k]),
     first_event_value_if_numeric:safeNum(first[k]),
     last_event_value_if_numeric:safeNum(last[k])};
    if(/price|amount|mint|quote|pool|transaction|signature/i.test(k)){
     timestamps[k].first_event_value_if_numeric=null;
     timestamps[k].last_event_value_if_numeric=null;
    }
   }
  }
  return {schema:'r29_training_oldest_date_neutral_archive_schema_pilot.v1',
   source:URL,day_utc:'2026-07-20',
   neutral_no_winner_selection:true,coin_addresses_excluded:true,portfolio_buys:0,
   events_sampled:read,malformed_json:bad,
   present_original_record_keys:[...fields.keys()].sort(),
   field_sample_count:Object.fromEntries(fields),
   original_time_field_observations:timestamps,
   action_types:Object.fromEntries(actions),protocols:Object.fromEntries(protocols),
   full_training_hour_downloaded:false,
   historic_gpt_model_scans_done:0,realizable_pnl:null,
   warning:'Original timestamp fields must be validated; a later archive upload does not prove contemporaneous accessibility.'};
 }finally{clearTimeout(timer);
  try{reader?.close()}catch{}
  try{stream?.destroy()}catch{}
  try{decoder?.destroy()}catch{}
  try{abort.abort()}catch{}
 }
}
if(process.argv[1]?.endsWith('second-training-source-schema-pilot.mjs')){
 try{
  const r=await probeFirstTrainingEvents();
  const p=resolve(process.argv[2]||'research/replay-120d-real/generated/2026-07-20-training-schema.json');
  mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(r,null,2)+'\n');
  console.log('R29_TRAIN_OLDEST_SCHEMA',JSON.stringify({
   count:r.events_sampled,keys:r.present_original_record_keys,
   times:r.original_time_field_observations,actions:r.action_types,
   protocols:r.protocols,not_a_trade:true}));
 }catch(e){console.error('R29_TRAIN_SOURCE_SCHEMA_FAILED',String(e.message||e));process.exitCode=1;}
}
