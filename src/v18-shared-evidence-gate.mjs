// SAME point-in-time evidence gate in Dot4 live PAPER review and historical replay.
// This module does not verify external truth from a self-declared SHA string.
// Discovery/WATCH may continue with missing evidence; BUY requires valid gates.
import {inspectOrder,newState,Reject,DEFAULT_POLICY} from './core.mjs';
const ms=value=>typeof value==='string'
  &&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)
  &&Number.isFinite(Date.parse(value))?Date.parse(value):null;
const iso=ms=>new Date(ms).toISOString();
export function makeReplayCheckOrder(snapshot,now,action='BUY',sequence=0){
 return {id:'shadow-'+action.toLowerCase()+'-'+now.toString(36)+'-'+String(sequence).padStart(2,'0'),
  mode:'PAPER',authority:'dot-4-strategy',action,
  dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
  reason:'Shared V1.8 time-gated shadow evaluation from recorded market evidence',
  quote_quality:'INDICATIVE_WEB_ONLY',
  created_at:iso(now),expires_at:iso(now+120000),coin:snapshot.coin,
  ...(action==='BUY'?{amount_test_usdc:DEFAULT_POLICY.entryAmount}:{}),
  quotes:snapshot.quotes.map(({source_published_at_utc,...quote})=>quote)};
}
export function checkUnifiedEvidence(snapshot,now){
 if(!snapshot||!['SYNTHETIC_TEST','CONTEMPORANEOUS_RECORD'].includes(snapshot.provenance))
   return 'UNKNOWN_PROVENANCE';
 const observed=ms(snapshot.observed_at_utc),captured=ms(snapshot.archived_at_utc);
 if(observed===null||captured===null||observed>now||captured>now)
   return 'FUTURE_OR_UNVERIFIED_ARCHIVE';
 if(now-observed>600000)return 'SNAPSHOT_TOO_OLD';
 if(snapshot.provenance==='CONTEMPORANEOUS_RECORD'
   &&(!snapshot.source_archive_sha||!/^[0-9a-f]{40}$/.test(snapshot.source_archive_sha)))
   return 'ARCHIVE_SHA_MISSING';
 if(!snapshot.discovery||!snapshot.risk)return 'DOT_CHAIN_MISSING';
 if(snapshot.risk.status!=='ELIGIBLE')return 'RISK_NOT_ELIGIBLE';
 for(const stamp of [snapshot.discovery.observed_at_utc,snapshot.risk.observed_at_utc]){
   const t=ms(stamp);if(t===null||t>now||t>observed)return 'DOT_CHAIN_FUTURE';
 }
 if(!Array.isArray(snapshot.quotes)||snapshot.quotes.length<2)return 'MISSING_QUOTES';
 for(const q of snapshot.quotes){
   const t=ms(q.observed_at),published=ms(q.source_published_at_utc);
   if(t===null||published===null||t>observed||published>observed
     ||t>now||published>now)return 'QUOTE_FUTURE_OR_UNDATED';
 }
 try{
   inspectOrder(makeReplayCheckOrder(snapshot,now),newState(),now,DEFAULT_POLICY);
 }catch(error){
   return error instanceof Reject?'QUOTE_GATE_'+error.code:'QUOTE_GATE_UNEXPECTED_ERROR';
 }
 return null;
}
