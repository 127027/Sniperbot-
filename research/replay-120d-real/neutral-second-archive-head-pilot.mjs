// R29 read-only second independent archive availability probe.
// NO archive .zst body downloads; HEAD only. This provider advertises
// archives from 2026-04-18, but docs do not establish every file exists.
export const BASE='https://replay.pumpapi.io/';
export const ANCHORS=[
 '2026-07-20','2026-08-15','2026-09-14','2026-09-17',
 '2026-09-18','2026-10-15','2026-11-05','2026-11-16'
];
const sha=async s=>{
 const crypto=await import('node:crypto');
 return crypto.createHash('sha256').update(s).digest('hex');
};
const goodDay=d=>typeof d==='string'&&/^2026-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/.test(d)&&
 !Number.isNaN(Date.parse(d+'T00:00:00Z'));
export function anchorURL(day,hour=0){
 if(!goodDay(day)||!Number.isInteger(hour)||hour<0||hour>23)throw Error('UNTRUSTED_ARCHIVE_DATE_OR_HOUR');
 return BASE+day.replaceAll('-','/')+'/'+String(hour).padStart(2,'0')+'.jsonl.zst';
}
export async function probeArchiveAnchors({fetcher=fetch,days=ANCHORS}={}){
 if(!Array.isArray(days)||days.length>120||days.some(d=>!goodDay(d)))
  throw Error('INVALID_ARCHIVE_DAYS');
 const result=[];
 for(const day of days){
  const url=anchorURL(day);
  try{
   const r=await fetcher(url,{method:'HEAD',redirect:'follow',
    signal:AbortSignal.timeout(9000),headers:{'accept':'application/octet-stream'}});
   result.push({day_utc:day,url,
    status:r.status,
    head_status:r.ok?'HEAD_OK':r.status===404?'MISSING':'UNKNOWN',
    header_content_type:r.headers?.get?.('content-type')||null,
    content_length_bytes:Number(r.headers?.get?.('content-length'))||null,
    original_event_availability_proven:false,
    complete_24h_day_proven:false});
  }catch(e){
   result.push({day_utc:day,url,status:null,head_status:'HEAD_UNAVAILABLE',
    cause:String(e.message||e).slice(0,80),original_event_availability_proven:false,
    complete_24h_day_proven:false});
  }
 }
 return {schema:'r29_second_historical_onchain_archive_head_pilot.v1',
  source_provider:'PUMPAPI_ZEROSLIP_PUBLIC_HOURLY',
  source_docs:'https://docs.zeroslip.ai/historical-replay',
  last_date_exclusive:'2026-11-17',
  archive_head_only_no_transactions_read:true,
  no_winner_mints_or_symbols_selected:true,
  inspected_at_utc:new Date().toISOString(),
  anchors:result,head_ok_count:result.filter(x=>x.head_status==='HEAD_OK').length,
  future_label_use:false,virtual_trades_confirmed:0,portfolio_pnl_test_usdc:null,
  caution:'HEAD proves object transport status, not full historic event availability, exact market coverage or execution prices.'};
}
if(process.argv[1]?.endsWith('neutral-second-archive-head-pilot.mjs')){
 try{
  const fs=await import('node:fs'),path=await import('node:path');
  const result=await probeArchiveAnchors();
  const file=path.resolve(process.argv[2]||'research/replay-120d-real/generated/second-archive-anchors.json');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
  console.log('R29_SECOND_ARCHIVE_ANCHORS',JSON.stringify(result.anchors.map(x=>({
   date:x.day_utc,status:x.head_status,code:x.status,
   size_bytes:x.content_length_bytes}))));
 }catch(e){console.error('R29_SECOND_ARCHIVE_ERROR',String(e.message||e));process.exitCode=1}
}
