// Read-only actual current GitHub source->risk->recheck handoff audit.
// All paths are checked against the current checked-out Git commit; no network,
// API, GPT, wallet or paper order side effects. Does not create report files.
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {inspectV21FiveDotHandoff} from '../src/v21-five-dot-handoff-audit.mjs';
if(process.argv.length!==2)throw Error('NO_ARGS_ALLOWED_READONLY_ONLY');
const get=(path)=>readFile(path,'utf8');
const pointer=JSON.parse(await get('research/feeds/latest.json'));
const names=[
  ['evidence',pointer.evidence_path],
  ['handoff',pointer.handoff_path],
  ['riskPreview',pointer.dot3_status_preview_path],
  ['recheckPlan',pointer.dot3_recheck_plan_path]
];
// Pin tracked bytes, never accept path traversal or a symlink to elsewhere.
const source={};
for(const [name,path] of names){
 if(typeof path!=='string'||!/^research\/feeds\/\d{4}-\d{2}-\d{2}\/\d{8,20}\/[A-Za-z0-9-]+\.json$/.test(path))
  throw Error('UNTRUSTED_SOURCE_ARTIFACT_PATH');
 const tracked=execFileSync('git',['ls-files','--error-unmatch','--',path],
  {encoding:'utf8'}).trim();
 if(tracked!==path)throw Error('UNTRACKED_SOURCE_ARTIFACT');
 const actual=execFileSync('git',['hash-object','--',path],{encoding:'utf8'}).trim();
 const committed=execFileSync('git',['rev-parse','HEAD:'+path],{encoding:'utf8'}).trim();
 if(actual!==committed)throw Error('SOURCE_BYTES_DIFFER_FROM_GIT_HEAD');
 source[name]=JSON.parse(await get(path));
}
const result=inspectV21FiveDotHandoff({
 feedPointer:pointer,...source,asOfUtc:new Date().toISOString()
});
console.log('R29_V21_FIVE_DOT_HANDOFF',JSON.stringify(result));
if(!result.handoff_reconciled_as_archived
  &&result.nonblocking_reconciliation_warnings.some(s=>s!=='SOURCE_OLDER_THAN_TEN_MINUTES_NOT_TRADING_QUOTE'))
 process.exitCode=3;
// Do not convert a stale source into a trading price; not itself a CI failure.
