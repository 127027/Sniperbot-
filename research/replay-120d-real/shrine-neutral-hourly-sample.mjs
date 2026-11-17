// R29 neutral first-observed archive sample. Research-only, no coin names/identities
// exported and NO later outcome labels/selection. Deterministic first in-range hour.
import {Readable} from 'node:stream';
import {createZstdDecompress} from 'node:zlib';
import {createInterface} from 'node:readline';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const INDEX='https://replay.shrine.trade/pump/index.json';
const ROOT='https://replay.shrine.trade/pump/';
const MAX_EVENTS=256;
const BEGIN='2026/09/18/00',END='2026/11/17/00';
const validHour=h=>typeof h==='string'&&/^20\d\d\/(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/(?:[01]\d|2[0-3])$/.test(h);
export async function sampleHistoricalStream({fetcher=fetch,maxEvents=MAX_EVENTS,timeoutMs=90000}={}){
 const abort=new AbortController();
 const timeout=setTimeout(()=>abort.abort(),timeoutMs);
 let source,decoder,input,lines;
 try{
  const indexR=await fetcher(INDEX,{signal:abort.signal,redirect:'error'});
  if(!indexR.ok)throw Error('NEUTRAL_INDEX_HTTP_'+indexR.status);
  const raw=await indexR.text();
  if(raw.length>3_000_000)throw Error('INDEX_TOO_BIG');
  const index=JSON.parse(raw);
  if(!Array.isArray(index.hours)||index.hours.length>200000||
    index.hours.some(x=>!validHour(x)))throw Error('UNTRUSTED_ARCHIVE_HOURS');
  const eligible=index.hours.filter(x=>x>=BEGIN&&x<END).sort();
  if(!eligible.length)throw Error('NO_NEUTRAL_HISTORIC_HOUR_AVAILABLE');
  const first=eligible[0];
  const url=ROOT+first+'.jsonl.zst';
  source=await fetcher(url,{signal:abort.signal,redirect:'error'});
  if(!source.ok||!source.body)throw Error('NO_ARCHIVE_HOUR_STREAM_'+source.status);
  const length=Number(source.headers?.get?.('content-length')||0);
  if(!Number.isFinite(length)||length<0)throw Error('INVALID_ARCHIVE_LENGTH');
  input=Readable.fromWeb(source.body);
  decoder=createZstdDecompress();
  input.pipe(decoder);
  lines=createInterface({input:decoder,crlfDelay:Infinity});
  let seen=0,withCaptureTime=0,actionPresent=0,mintPresent=0,signaturePresent=0,
   seenBeforeHourEnd=0,malformed=0,seenAfterHourEnd=0;
  const actionTypes=new Map(),protocols=new Map(),observedCaptureTimes=[];
  const hourStart=Date.parse(first.slice(0,4)+'-'+first.slice(5,7)+'-'+first.slice(8,10)+'T'+first.slice(11,13)+':00:00Z');
  const hourEnd=hourStart+3600000;
  for await(const line of lines){
   if(!line.trim())continue;
   let event;
   try{event=JSON.parse(line)}catch{malformed++;continue;}
   seen++;
   if(typeof event.action==='string'){
    actionPresent++;actionTypes.set(event.action,(actionTypes.get(event.action)||0)+1);
   }
   if(typeof event.protocol==='string')
    protocols.set(event.protocol,(protocols.get(event.protocol)||0)+1);
   if(typeof event.mint==='string'&&event.mint.length>16)mintPresent++;
   if(typeof event.signature==='string')signaturePresent++;
   const seenAt=Number(event.localTimestamp);
   if(Number.isFinite(seenAt)&&seenAt>0){
    withCaptureTime++;
    if(seenAt<hourEnd)seenBeforeHourEnd++;
    else seenAfterHourEnd++;
    observedCaptureTimes.push(seenAt);
   }
   if(seen>=maxEvents)break;
  }
  // This intentionally reads only the beginning of the stream; do not call it
  // a complete hour or a fair representation of all coins in that hour.
  return {schema:'r29_neutral_historic_stream_capture_pilot.v1',
   archive_url:url,hour_utc:first.replaceAll('/','-'),
   raw_index_sha256:createHash('sha256').update(raw).digest('hex'),
   sampled_events:seen,sample_is_complete_hour:false,
   malformed_json_lines:malformed,events_with_original_capture_timestamp:withCaptureTime,
   events_captured_before_end_of_hour:seenBeforeHourEnd,
   events_captured_after_end_of_hour:seenAfterHourEnd,
   events_with_action:actionPresent,events_with_mint:mintPresent,
   events_with_transaction_signature:signaturePresent,
   observed_provider_capture_min_utc:observedCaptureTimes.length?new Date(Math.min(...observedCaptureTimes)).toISOString():null,
   observed_provider_capture_max_utc:observedCaptureTimes.length?new Date(Math.max(...observedCaptureTimes)).toISOString():null,
   action_types_in_neutral_sample:Object.fromEntries(actionTypes),
   protocols_in_neutral_sample:Object.fromEntries(protocols),
   token_identifiers_exported:false,known_future_winners_used:false,
   proof_of_buy_sell_for_specific_user_position:false,
   true_hour_completeness_or_bidirectional_execution_proved:false,
   model_decisions_run:0,actual_user_trades:0,pnl_test_usdc:null};
 }finally{
  clearTimeout(timeout);
  try{lines?.close()}catch{}
  try{input?.destroy()}catch{}
  try{decoder?.destroy()}catch{}
  try{abort.abort()}catch{}
 }
}
if(process.argv[1]?.endsWith('shrine-neutral-hourly-sample.mjs')){
 try{
  const result=await sampleHistoricalStream();
  const file=resolve(process.argv[2]||'research/replay-120d-real/generated/shrine-neutral-archive-capture-sample.json');
  mkdirSync(dirname(file),{recursive:true});
  writeFileSync(file,JSON.stringify(result,null,2)+'\n');
  console.log('R29_SHRINE_NEUTRAL_PILOT',JSON.stringify(result));
 }catch(e){console.error('R29_SHRINE_PILOT_ERROR',String(e.message||e));process.exitCode=1;}
}
