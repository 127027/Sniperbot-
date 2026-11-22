// Offline renderer for previously supplied five-Dot research traces.
// Does NOT call any API, invoke GPT, execute a backtest, or write orders.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {buildFiveDotForensicReport} from '../src/v19-five-dot-forensic-trace.mjs';
import {renderR29FiveDotForensicMarkdown} from '../src/v19-five-dot-forensic-markdown.mjs';

const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--input'
 ||!/^research\/audits\/dot-traces\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]{8,120}\/input\.json$/.test(args[1]))
 throw Error('ONLY_EXPLICIT_TRACE_INPUT_UNDER_RESEARCH_AUDITS_ALLOWED');
const request=JSON.parse(await readFile(args[1],'utf8'));
if(request?.kind!=='R29_V19_FIVE_DOT_TRACE_INPUT'||request.schema!==1)
 throw Error('INVALID_R29_TRACE_INPUT_MANIFEST');
const report=buildFiveDotForensicReport({
 entries:request.entries,startUtc:request.start_utc,endUtc:request.end_utc,
 warmupHours:request.warmup_hours,runId:request.run_id
});
const markdown=renderR29FiveDotForensicMarkdown(report);
const outputDir='probe-artifacts';
const prefix=outputDir+'/v19-five-dot-forensic-'+request.run_id;
await mkdir(outputDir,{recursive:true});
await writeFile(prefix+'.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
await writeFile(prefix+'.md',markdown,{flag:'wx'});
console.log('R29_FIVE_DOT_FORENSIC_REPORT_CREATED',JSON.stringify({
 json_path:prefix+'.json',markdown_path:prefix+'.md',
 claimed_gpt_reviews:report.claimed_gpt_reviews,
 verified_gpt_reviews:report.genuine_gpt_reviews_independently_verified,
 verified_client_fills:report.client_fills_independently_verified,
 recorded_events:report.recorded_event_count,
 tracked_exact_pools:report.tracked_exact_pools,
 backtest_executed:false,oracle_revealed:false,orders_written:0
}));
