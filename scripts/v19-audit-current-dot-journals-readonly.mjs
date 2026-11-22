// Offline diagnostic only. Runs against a local checkout of the cleanroom
// branch, never requests market data, executes a replay or writes an order.
import {readFile} from 'node:fs/promises';
import {auditLiveFiveDotJournalInventory,LIVE_DOT_IDS,validRoleJournalPath}
 from '../src/v19-dot-journal-inventory.mjs';

if(process.argv.length!==2)throw Error('NO_ARGS_ALLOWED_READONLY_ONLY');
const latestByRole={},rawJournalsByPath={};
for(const id of LIVE_DOT_IDS){
 try{
  const pointer=JSON.parse(await readFile('research/latest/'+id+'.json','utf8'));
  latestByRole[id]=pointer;
  const path=pointer.journal_path;
  if(validRoleJournalPath(id,path))
   rawJournalsByPath[path]=await readFile(path,'utf8');
 }catch(error){
  // Missing bytes are themselves a reportable gap, not an all-green default.
  if(error.code!=='ENOENT')throw error;
 }
}
let feedPointer=null;
try{feedPointer=JSON.parse(await readFile('research/feeds/latest.json','utf8'))}
catch(error){if(error.code!=='ENOENT')throw error}
const report=auditLiveFiveDotJournalInventory({
 latestByRole,rawJournalsByPath,feedPointer,
 asOfUtc:new Date().toISOString()
});
console.log('R29_LIVE_FIVE_DOT_JOURNAL_AUDIT',JSON.stringify(report,null,2));
console.log('R29_LIVE_FIVE_DOT_SUMMARY',JSON.stringify({
 status:report.status,roles:report.role_count,issues:report.issue_count,
 by_role:Object.fromEntries(report.roles.map(x=>[x.role,
  x.problems.map(y=>y.code)])),
 real_gpt_invocations_authenticated:0,real_client_fills_verified:0,
 backtest_executed:false,orders_written:0
}));
// This audit returns 0 in data-gap mode: it is not a release gate.
// Never report the success of this diagnostic as five actual Dots verified.
