// R29 V6.12: audit the actual GPT model review-index BEFORE it reaches Windows.
// Deterministic status/journal consistency only. This DOES NOT attest that
// GPT was invoked or that public HTML prices were authentic.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateGptForwardStatus} from './gpt-forward-review-status.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const canonicalIndexPath=path.join(root,'research/r29/channel/gpt-forward-review-status.json');

export function auditR29ReviewIndex(value,{now=Date.now(),readJournal=null}={}){
 const report={schema:'sniper_r29_v612_review_index_integrity.v1',
  passed:false,review_count:null,web_only_count:null,
  journal_count_checked:null,actual_model_invocation_independently_verified:false,
  real_trading_enabled:false,price_sources_independently_verified:false};
 const x=validateGptForwardStatus(value,{now});
 const read=readJournal||((name)=>readFileSync(path.join(root,name),'utf8'));
 const counted=new Set();
 let web=0;
 for(const r of x.reviews){
  if(counted.has(r.artifact_path))
   throw Error('GPT_REVIEW_DUPLICATE_JOURNAL_PATH');
  counted.add(r.artifact_path);
  const journal=read(r.artifact_path);
  if(typeof journal!=='string'||journal.length<100||journal.length>50000)
   throw Error('GPT_REVIEW_JOURNAL_MISSING_OR_INVALID');
  if(r.source_mode==='GPT_INDEPENDENT_WEB_ONLY'){
   web++;
   // Prevent 33-char and 31-char IDs that previously invalidated the
   // ENTIRE Windows-received index and hid genuine reviews in the UI.
   // This convention uses exactly the first 32 hex chars of the
   // evidence-manifest SHA-256, as employed by existing GPT journals.
   const expected='gptreview_'+r.web_source_evidence_sha256.slice(0,32);
   if(r.review_id!==expected)
    throw Error('GPT_REVIEW_ID_MUST_MATCH_SOURCE_SHA256_32HEX');
   if(!journal.includes(r.web_source_evidence_sha256))
    throw Error('GPT_REVIEW_JOURNAL_SOURCE_SHA_MISSING');
  }
 }
 return {...report,passed:true,review_count:x.reviews.length,
  web_only_count:web,journal_count_checked:counted.size,
  utc_day:x.utc_day,model_chosen_target_per_day:x.target_per_day,
  no_trade_authority:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const raw=readFileSync(canonicalIndexPath,'utf8');
 const r=auditR29ReviewIndex(JSON.parse(raw));
 console.log('R29_GPT_REVIEW_INDEX_INTEGRITY='+JSON.stringify(r));
}
