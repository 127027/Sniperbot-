import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compareTrain} from '../src/compare-train.mjs';
const load=async p=>{try{return JSON.parse(await readFile(p,'utf8'));}catch{return null;}};
const [oldReplay,newReplay,dot2,dot3,dot4,dot5,feed,index]=await Promise.all([
'research/backtests/2026-10-12/iterations/05-training-24hour-results.json',
'probe-artifacts/oct12-training-summary.json','research/latest/dot-2.json','research/latest/dot-3.json',
'research/latest/dot-4.json','research/latest/dot-5.json','research/feeds/latest.json','signals/index.json'].map(load));
if(!oldReplay||!newReplay||!dot2||!feed)throw Error('COMPARISON_INPUT_MISSING');
const report=compareTrain({oldReplay,newReplay,dot2,dot3,dot4,dot5,feed,index});
report.github_actions_run=process.env.GITHUB_RUN_ID||null;
report.generated_at_utc=new Date().toISOString();
await mkdir('probe-artifacts',{recursive:true});
await writeFile('probe-artifacts/oct12-v09-repeat-comparison.json',JSON.stringify(report,null,2)+'\n');
const fields=['Scan','Uhrzeit MESZ','Reconstructed Models','Dot2 historische Erkennung','Dot3 historische Kaufbarkeit',
 'Dot4 echte historische Order','Dot5 echte Ausführung'];
const rows=[fields.join(',')];const date=Date.parse('2026-10-12T00:35:00Z');
for(let i=0;i<24;i++){
 const at=new Date(date+i*3600000);
 rows.push([i+1,new Date(at.getTime()+7200000).toISOString().substring(11,16),
  'REPLAY_MODEL','NO_ORIGINAL_DOT2_DATA','NO_ORIGINAL_RISK_RECORD','0','0'].map(x=>JSON.stringify(x)).join(','));
}
await writeFile('probe-artifacts/oct12-v09-24-hourly-comparison.csv',rows.join('\n')+'\n');
console.log('V09_COMPARISON',JSON.stringify(report));
