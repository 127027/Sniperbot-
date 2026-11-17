// Free upstream source coverage audit for the 60-day MEMECOIN replay.
// Discovers newly published files; NEVER treats a manifest listing as a verified
// historic trade, a contemporaneous GPT model decision, or executable DEX PnL.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

export const SOURCE_URL='https://huggingface.co/datasets/loopholetape/pumpfun-launches/resolve/main/README.md';
const SHA=/^[a-f0-9]{64}$/i;
const dateUTC=x=>new Date(x).toISOString().slice(0,10);
const sha256=x=>createHash('sha256').update(x).digest('hex');
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};

export function parsePublishedFeatureManifest(readme){
 assert(typeof readme==='string'&&readme.length,'EMPTY_SOURCE_README');
 const rx=/\|?\s*features\s*\|\s*data\/features\/(20\d\d-\d\d-\d\d)\.parquet\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([a-f0-9]{64})(?=\s*\||\s*$)/gm;
 const rows=new Map();let hit;
 while((hit=rx.exec(readme))!==null){
  const [_,day,rawRows,rawSize,hash]=hit;
  const count=Number(rawRows.replaceAll(',','')),bytes=Number(rawSize.replaceAll(',',''));
  assert(Number.isSafeInteger(count)&&count>0&&Number.isSafeInteger(bytes)&&bytes>0&&SHA.test(hash),'INVALID_MANIFEST_STAT');
  assert(!rows.has(day),'DUPLICATE_FEATURE_DAY_IN_MANIFEST');
  rows.set(day,{path:'data/features/'+day+'.parquet',rows:count,bytes,sha256:hash.toLowerCase()});
 }
 assert(rows.size>0,'NO_FEATURE_FILES_IN_SOURCE_MANIFEST');
 return rows;
}

export function compare60DayManifest(readme,matrixCsv,{start='2026-09-18',days=60}={}){
 assert(typeof matrixCsv==='string'&&matrixCsv.trim(),'MISSING_ARCHIVED_SOURCE_MATRIX');
 assert(Number.isSafeInteger(days)&&days===60,'EXPECTED_60_DAY_AUDIT');
 const published=parsePublishedFeatureManifest(readme);
 const [head,...lines]=matrixCsv.trim().split(/\r?\n/);
 const fields=head.split(',');
 const keys=['day_utc','minute_asof_feature_rows_verified','minute_feature_sha256'];
 assert(keys.every(k=>fields.includes(k)),'MISSING_HISTORIC_MATRIX_COLUMNS');
 const rows=new Map();
 for(const line of lines){
  const cells=line.split(',');
  assert(cells.length===fields.length,'MALFORMED_HISTORIC_MATRIX');
  const r=Object.fromEntries(fields.map((h,i)=>[h,cells[i]]));
  assert(!rows.has(r.day_utc),'DUPLICATE_HISTORIC_MATRIX_DAY');rows.set(r.day_utc,r);
 }
 assert(rows.size===days,'NOT_60_ARCHIVED_DAYS');
 const dates=Array.from({length:days},(_,i)=>dateUTC(new Date(start+'T00:00:00Z').getTime()+i*86400000));
 const details=[],listed_unverified=[],no_manifest=[],hash_conflicts=[],previously_verified=[];
 for(const d of dates){
  assert(rows.has(d),'MISSING_DATE_IN_ARCHIVED_MATRIX');
  const p=published.get(d),archive=rows.get(d);
  const archived=archive.minute_asof_feature_rows_verified!==''&&archive.minute_feature_sha256!=='';
  const has=p!==undefined;
  let status;
  if(archived&&has&&p.sha256===archive.minute_feature_sha256.toLowerCase()&&p.rows===Number(archive.minute_asof_feature_rows_verified)){
   status='PREVIOUSLY_VERIFIED_MATCHING_SOURCE_MANIFEST';previously_verified.push(d);
  }else if(archived){
   status='PINNED_ARCHIVE_SOURCE_DIFFERS_FROM_LATEST_OR_REMOVED';
   hash_conflicts.push(d);
  }else if(has){
   status='NEWLY_LISTED_UNVERIFIED_RAW_FILE';listed_unverified.push(d);
  }else{
   status='NO_MINUTE_SOURCE_IN_MANIFEST';no_manifest.push(d);
  }
  details.push({day_utc:d,status,
   source_path:p?.path??null,latest_manifest_sha256:p?.sha256??null,
   latest_manifest_rows:p?.rows??null,source_is_complete_historical_execution_proof:false});
 }
 return {schema:'r29_60day_latest_free_feature_manifest_audit.v1',
  source_manifest_url:SOURCE_URL,source_readme_sha256:sha256(readme),
  archived_matrix_days:days,archived_verified_matching_latest:previously_verified.length,
  newly_listed_unverified_days:listed_unverified,
  no_minute_source_manifest_days:no_manifest,
  archived_source_changed_or_removed_days:hash_conflicts,
  per_day:details,
  contemporaneous_gpt_decisions_proven:false,
  historical_bidirectional_dex_fills_proven:false,
  verified_60day_gpt_dex_pnl_test_usdc:null,
  completion_status:'UNPROVEN_DO_NOT_ENABLE_NEW_PAPER_BUY',
  note:'Main branch manifest can evolve. Download newly listed parquet and independently hash/validate before upgrading any coverage.'};
}

async function main(){
 const argv=process.argv.slice(2);
 if(argv.length!==5||argv[0]!=='--matrix'||argv[2]!=='--output'||
    !['--fetch-latest','--readme'].includes(argv[4].split('=')[0])) {
  // For --fetch-latest use a standalone flag as fifth argument.
  // For --readme=/path use the fifth argument.
  throw Error('USAGE: node source-manifest-audit.mjs --matrix file --output file --fetch-latest OR --readme=/path');
 }
 const matrix=readFileSync(argv[1],'utf8');
 let readme;
 if(argv[4]==='--fetch-latest'){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
  try{
   const resp=await fetch(SOURCE_URL,{signal:controller.signal,headers:{'User-Agent':'sniperbot-r29-historical-source-audit'}});
   if(!resp.ok)throw Error('SOURCE_HTTP_'+resp.status);
   const buf=Buffer.from(await resp.arrayBuffer());
   if(buf.length>2_000_000)throw Error('SOURCE_README_OVERSIZE');
   readme=buf.toString('utf8');
  }finally{clearTimeout(timeout)}
 }else if(argv[4].startsWith('--readme=')){readme=readFileSync(argv[4].slice(9),'utf8')}
 else throw Error('INVALID_README_ARGUMENT');
 const audit=compare60DayManifest(readme,matrix);
 writeFileSync(argv[3],JSON.stringify({...audit,verified_at_run_utc:new Date().toISOString()},null,2)+'\n');
 console.log('R29_60D_MANIFEST_AUDIT',JSON.stringify({
  prior_verified:audit.archived_verified_matching_latest,
  newly_listed:audit.newly_listed_unverified_days.length,
  missing:audit.no_minute_source_manifest_days.length,
  changed:audit.archived_source_changed_or_removed_days.length,
  completion:audit.completion_status
 }));
}
if(process.argv[1]&&import.meta.url.endsWith('/'+process.argv[1].split('/').at(-1))){
 main().catch(e=>{console.error('SOURCE_MANIFEST_AUDIT_ERROR',e.message);process.exitCode=1});
}
