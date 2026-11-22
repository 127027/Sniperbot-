// R29 V1.9: point-in-time provenance for the ONE live-paper/replay data contract.
// A provider timestamp or SHA string is never independent proof of historical availability.
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
export const asOfMillis=x=>typeof x==='string'&&ISO.test(x)&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export const EVIDENCE_CLASSES=Object.freeze([
 'ORIGINAL_CAPTURE','RETRO_ASOF_RECONSTRUCTION','POST_EVENT_ORACLE','SYNTHETIC_TEST'
]);
const result=(status,reason,sourceClass,extra={})=>({
 schema:1,kind:'R29_V19_ASOF_EVIDENCE_VERDICT',
 status,reason,source_class:sourceClass,
 usable_for_historical_trade:false,original_source_authenticity_proven:false,
 ...extra
});
export function classifyAsOfEvidence(row,{asOfUtc}={}){
 const now=asOfMillis(asOfUtc);
 if(now===null)throw Error('INVALID_ASOF_UTC');
 const sourceClass=row?.source_class||
   (row?.provenance==='CONTEMPORANEOUS_RECORD'?'ORIGINAL_CAPTURE':
    row?.provenance==='SYNTHETIC_TEST'?'SYNTHETIC_TEST':null);
 if(!EVIDENCE_CLASSES.includes(sourceClass))
   return result('BLOCKED','UNKNOWN_OR_MISSING_EVIDENCE_CLASS',sourceClass);
 const eventAt=asOfMillis(row?.event_at_utc??row?.observed_at_utc);
 const captured=asOfMillis(row?.http_captured_at_utc??row?.archived_at_utc);
 const available=asOfMillis(row?.available_at_utc??
   row?.http_captured_at_utc??row?.archived_at_utc);
 const quoteAt=row?.provider_quote_asof_utc==null?null:asOfMillis(row.provider_quote_asof_utc);
 if(eventAt===null||captured===null||available===null||captured<eventAt||
   available<eventAt||available<captured)
   return result('BLOCKED','INVALID_EVENT_CAPTURE_AVAILABILITY_ORDER',sourceClass);
 if(row?.provider_quote_asof_utc!=null&&(quoteAt===null||quoteAt>captured))
   return result('BLOCKED','INVALID_PROVIDER_QUOTE_TIMESTAMP',sourceClass);
 if(eventAt>now)return result('BLOCKED','EVENT_IN_FUTURE',sourceClass);
 if(sourceClass==='POST_EVENT_ORACLE')
   return result('POST_EVENT_ONLY','ORACLE_NOT_FOR_DECISIONS',sourceClass,
     {event_at_utc:new Date(eventAt).toISOString()});
 if(sourceClass==='RETRO_ASOF_RECONSTRUCTION'){
   // Historical candle is useful for forensic feature research, but a 2026-11 download
   // cannot establish that Dot2/3 saw the quote during 2026-10.
   return result('RETROSPECTIVE_RESEARCH_ONLY','RETRO_CANNOT_PROVE_ORIGINAL_DISCOVERY',sourceClass,
     {event_at_utc:new Date(eventAt).toISOString(),
      captured_after_virtual_time:captured>now,
      reconstructed_after_event:true});
 }
 if(available>now||captured>now)
   return result('BLOCKED','NOT_YET_AVAILABLE_AT_VIRTUAL_TIME',sourceClass);
 return result(sourceClass==='SYNTHETIC_TEST'?'SYNTHETIC_REGRESSION_ONLY':'PROVISIONAL_ASOF',
   sourceClass==='SYNTHETIC_TEST'?'NOT_REAL_MARKET_DATA':'ORIGINAL_CAPTURE_UNVERIFIED',
   sourceClass,{event_at_utc:new Date(eventAt).toISOString(),
   available_at_utc:new Date(available).toISOString(),
   asof_usable:true,
   requires_independent_original_proof:sourceClass==='ORIGINAL_CAPTURE'});
}
