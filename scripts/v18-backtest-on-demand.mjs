// Usage (from the cleanroom branch only):
//   node scripts/v18-backtest-on-demand.mjs --date 2026-10-12
//   node scripts/v18-backtest-on-demand.mjs --date 2026-10-12 --input research/.../asof-input.json
// No historical winner list is ever a scan seed; model only, no GitHub order.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,sep,join} from 'node:path';
import {homedir} from 'node:os';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged,makeResearchOnlyReplayReceipt} from '../src/v19-replay-isolation.mjs';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {auditFrozenOctoberTraining} from '../src/v18-frozen-reference.mjs';
const argv=process.argv.slice(2);
const args={};
for(let i=0;i<argv.length;i++){
 const key=argv[i];
 if(!['--date','--input','--output','--diagnostic-24','--training-reference'].includes(key)||args[key]!==undefined)
   throw Error('INVALID_ON_DEMAND_ARGUMENT: '+key);
 if(key==='--diagnostic-24'||key==='--training-reference'){args[key]=true;continue;}
 if(i===argv.length-1||argv[i+1].startsWith('--'))throw Error('MISSING_ARG_VALUE: '+key);
 args[key]=argv[++i];
}
if(!args['--date'])throw Error('DATE_REQUIRED_USE_--date_YYYY-MM-DD');
if(!/^\d{4}-\d{2}-\d{2}$/.test(args['--date']))throw Error('INVALID_DATE_FORMAT');
const inputPath=args['--input']||null;
const manifest=inputPath?JSON.parse(await readFile(resolve(inputPath),'utf8')):null;
// Snapshot BOTH local existing Paper state (if accessible) and the GitHub
// order inbox tracked in the checked out repo; never open either for writing.
const protectedFiles=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const paperBefore=await fingerprintProtectedFiles(protectedFiles);
const report=backtestOnRequest({date:args['--date'],manifest,
 forceHourlyDiagnostic:args['--diagnostic-24']===true});
const training=args['--training-reference']?await auditFrozenOctoberTraining({date:args['--date']}):null;
const base=resolve('probe-artifacts');
const runTimestamp=new Date().toISOString().replace(/[-:.]/g,'');
const target=resolve(args['--output']||'probe-artifacts/v18-backtest-'+args['--date']+'-'+runTimestamp+'.json');
if(!target.startsWith(base+sep)||!target.endsWith('.json'))throw Error('OUTSIDE_PROBE_ARTIFACTS_DIRECTORY');
const researchReceipt=makeResearchOnlyReplayReceipt({report,
 runId:runTimestamp+'-'+args['--date'].replace(/-/g,'')});
await mkdir(dirname(target),{recursive:true});
const paperAfter=await fingerprintProtectedFiles(protectedFiles);
const protectedFilesProof=assertProtectedFilesUnchanged(paperBefore,paperAfter);
await writeFile(target,JSON.stringify({requested_backtest:report,
 research_only_receipt:researchReceipt,protected_files_unchanged:protectedFilesProof,
 retrospective_training_reference:training},null,2)+'\n',{encoding:'utf8',flag:'wx'});
// Verify one more time after writing the ONLY allowed output artifact.
assertProtectedFilesUnchanged(paperBefore,await fingerprintProtectedFiles(protectedFiles));
console.log('R29_V18_BACKTEST_ON_DEMAND',JSON.stringify({
 date:report.date,status:report.status,mode:report.mode,
 snapshots:report.accepted_input_count,model_buys:report.model_replay_summary.buys,
 model_sells:report.model_replay_summary.sells,full_reviews:report.model_replay_summary.fullReviews,
 actual_paper_orders:report.confirmed_paper_orders,actual_paper_fills:report.confirmed_paper_fills,
 retrospective_training_attached:training!==null,report_path:target}));
