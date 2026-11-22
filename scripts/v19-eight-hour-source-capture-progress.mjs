// R29 read-only evidence audit for eight scheduled real public Research captures.
// Uses already committed bytes only; NO API, no GPT invocation, no replay, no
// local Windows bot, no file writes, no wallet/TEST-USDC mutations.
import {readFile,readdir} from 'node:fs/promises';
import {auditR29EightHourCaptures} from '../src/v19-eight-hour-source-capture-audit.mjs';

const load=async path=>{
 try{return await readFile(path,'utf8')}
 catch(e){if(e.code==='ENOENT')return null;throw e;}
};
const loadJson=async p=>{
 const raw=await load(p);return raw===null?null:JSON.parse(raw);
};
const list=async p=>{
 try{return await readdir(p)}
 catch(e){if(e.code==='ENOENT')return [];throw e;}
};
if(process.argv.length!==2)throw Error('READ_ONLY_EIGHT_HOUR_AUDIT_TAKES_NO_ARGUMENTS');
const requests=[],captures=[];
for(const date of ['2026-11-22','2026-11-23']){
 for(const filename of await list('research/requests/'+date)){
  if(!/^[A-Za-z0-9_-]+\.json$/.test(filename))continue;
  const path='research/requests/'+date+'/'+filename;
  const data=await loadJson(path);
  if(data)requests.push({path,data});
 }
 for(const runId of await list('research/feeds/'+date)){
  if(!/^\d{5,20}$/.test(runId))continue;
  const dir='research/feeds/'+date+'/'+runId;
  const [evidence,completion,inflight]=await Promise.all([
   loadJson(dir+'/evidence.json'),loadJson(dir+'/capture-completion-verdict.json'),
   loadJson(dir+'/inflight-capture.json')]);
  if(!evidence)continue;
  const rawBodiesByPath={};
  for(const receipt of inflight?.http_receipts??[]){
   if(receipt?.provider!=='GECKOTERMINAL'||receipt?.http_status!==200
    ||typeof receipt?.body_path!=='string'
    ||!receipt.body_path.startsWith(dir+'/'))continue;
   const raw=await load(receipt.body_path);
   if(raw!==null)rawBodiesByPath[receipt.body_path]=raw;
  }
  captures.push({evidence_path:dir+'/evidence.json',evidence,
   completion,inflight,rawBodiesByPath});
 }
}
const report=auditR29EightHourCaptures({
 asOfUtc:new Date().toISOString(),requests,captures
});
console.log('R29_EIGHT_HOUR_REAL_CAPTURE_EVIDENCE',JSON.stringify({
 as_of_utc:report.as_of_utc,planned_hours:8,
 archived_requests:report.hours.reduce((n,h)=>n+h.archived_requests,0),
 truly_verified_bounded_capture_hours:report.verified_bounded_capture_hours,
 missing_unverified_hour_slots:report.remaining_unverified_hours,
 full_eight_successes_proven:report.eight_source_captures_really_verified,
 independent_gpt_reviews_proven:0,local_windows_client_scans_proven:0,
 orders_written:0,backtest_triggered:false
}));
console.log(JSON.stringify(report,null,2));
