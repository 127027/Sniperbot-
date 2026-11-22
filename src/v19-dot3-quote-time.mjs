// R29 V1.9 D3-03 – one explicit quote-time classification for current PAPER
// research, structural Dot3 preflight and historical as-of replay.
// A fetch time is NOT a provider quote time, and a timestamp field is not
// independent proof of that timestamp. NO order authorization here.
import {asOfMillis} from './v19-asof-evidence.mjs';
const stamp=asOfMillis;
export function classifyDot3QuoteTime({
 asOfUtc,capturedAtUtc,providerQuoteAsOfUtc=null,
 availableAtUtc=capturedAtUtc,maxQuoteAgeSeconds=90,
 maxIndicativeResearchAgeSeconds=600
}={}){
 const now=stamp(asOfUtc),captured=stamp(capturedAtUtc),
   available=stamp(availableAtUtc),provider=stamp(providerQuoteAsOfUtc);
 if(now===null||captured===null||available===null
   ||!Number.isInteger(maxQuoteAgeSeconds)||maxQuoteAgeSeconds<1||maxQuoteAgeSeconds>600
   ||!Number.isInteger(maxIndicativeResearchAgeSeconds)||maxIndicativeResearchAgeSeconds<1
   ||maxIndicativeResearchAgeSeconds>3600)
   throw Error('INVALID_DOT3_QUOTE_TIME_INPUT');
 const out=(status,reason,extra={})=>({
   schema:1,kind:'R29_V19_QUOTE_TIME_CLASS',
   as_of_utc:asOfUtc,captured_at_utc:capturedAtUtc,
   available_at_utc:availableAtUtc,
   provider_quote_asof_utc:providerQuoteAsOfUtc??null,
   status,reason,
   actual_capture_time_independently_attested:false,
   provider_time_independently_proven:false,
   research_usable:false,structurally_fresh_quote:false,
   real_paper_trade_authorized:false,
   ...extra
 });
 if(captured>available)
   return out('INVALID_TIME_SEQUENCE','CAPTURE_AFTER_AVAILABILITY');
 if(captured>now||available>now)
   return out('FUTURE_NOT_AVAILABLE','HTTP_SOURCE_NOT_AVAILABLE_AT_ASOF');
 if(provider!==null&&provider>captured)
   return out('INVALID_TIME_SEQUENCE','PROVIDER_QUOTE_AFTER_HTTP_CAPTURE');
 const researchFresh=now-available<=maxIndicativeResearchAgeSeconds*1000
   &&now-captured<=maxIndicativeResearchAgeSeconds*1000;
 if(providerQuoteAsOfUtc!==null&&provider===null)
   return out('INVALID_PROVIDER_TIME','MALFORMED_PROVIDER_TIMESTAMP');
 if(provider===null)
   return out(researchFresh?'HTTP_CAPTURE_ONLY_INDICATIVE':'STALE_HTTP_CAPTURE',
     'PROVIDER_ASOF_UNKNOWN_NEVER_INFER_FROM_HTTP_CAPTURE',{
     research_usable:researchFresh,request_new_provider_capture:!researchFresh});
 const providerFresh=now-provider<=maxQuoteAgeSeconds*1000
   &&now-captured<=maxQuoteAgeSeconds*1000
   &&now-available<=maxQuoteAgeSeconds*1000;
 return out(providerFresh?'PROVIDER_TIMESTAMP_CLAIMED_FRESH':'PROVIDER_TIMESTAMP_CLAIMED_STALE',
   'PROVIDER_TIME_FIELD_EXISTS_BUT_EXTERNAL_ORIGIN_UNVERIFIED',{
   research_usable:researchFresh,
   structurally_fresh_quote:providerFresh,
   provider_time_present:true,
   request_new_provider_capture:!providerFresh});
}
