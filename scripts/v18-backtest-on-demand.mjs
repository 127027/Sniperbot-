// Usage (from the cleanroom branch only):
//   node scripts/v18-backtest-on-demand.mjs --date 2026-10-12
//   node scripts/v18-backtest-on-demand.mjs --date 2026-10-12 --input research/.../asof-input.json
// No historical winner list is ever a scan seed; model only, no GitHub order.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
const argv=process.argv.slice(2);
const args={};
for(let i=0;i<argv.length;i++){
 const key=argv[i];
 if(!['--date','--input','--output','--diagnostic-24'].includes(key)||args[key]!==undefined)
   throw Error('INVALID_ON_DEMAND_ARGUMENT: '+key);
 if(key==='--diagnostic-24'){args[key]=true;continue;}
 if(i===argv.length-1||argv[i+1].startsWith('--'))throw Error('MISSING_ARG_VALUE: '+key);
 args[key]=argv[++i];
}
if(!args['--date'])throw Error('DATE_REQUIRED_USE_--date_YYYY-MM-DD');
if(!/^\d{4}-\d{2}-\d{2}$/.test(args['--date']))throw Error('INVALID_DATE_FORMAT');
const inputPath=args['--input']||null;
const manifest=inputPath?JSON.parse(await readFile(resolve(inputPath),'utf8')):null;
const report=backtestOnRequest({date:args['--date'],manifest,
 forceHourlyDiagnostic:args['--diagnostic-24']===true});
const target=resolve(args['--output']||'probe-artifacts/v18-backtest-'+args['--date']+'.json');
if(target.includes('/signals/')||target.includes('\\signals\\')
  ||target.includes('/research/state/')||target.includes('\\research\\state\\')
  ||target.includes('/receipts/')||target.includes('\\receipts\\'))
 throw Error('PROTECTED_OUTPUT_PATH');
await mkdir(dirname(target),{recursive:true});
await writeFile(target,JSON.stringify(report,null,2)+'\n','utf8');
console.log('R29_V18_BACKTEST_ON_DEMAND',JSON.stringify({
 date:report.date,status:report.status,mode:report.mode,
 snapshots:report.accepted_input_count,model_buys:report.model_replay_summary.buys,
 model_sells:report.model_replay_summary.sells,full_reviews:report.model_replay_summary.fullReviews,
 actual_paper_orders:report.confirmed_paper_orders,actual_paper_fills:report.confirmed_paper_fills,
 report_path:target}));
