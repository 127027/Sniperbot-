// Real-provider acceptance run; always a fresh isolated replay, never the old
// hourly-Dot session. Raw frames/votes remain ignored local research artifacts.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {runContinuousReplay} from './continuous-runner.mjs';
import {createModelAdapter,configFromEnv} from './model-adapter.mjs';
import {auditDataset} from './r22-intake.mjs';
import {forkSealedPrefix} from './r22-checkpoint.mjs';
const base=path.dirname(fileURLToPath(import.meta.url));
export async function main(args=process.argv.slice(2)){
 const [source=path.join(base,'reports/diagnostic-dataset.json'),output='r22-result.json',limit='62']=args;
 const report={schema:'r22_acceptance.v1',status:'BLOCKED',real_model_full_test_passed:false,
  real_model_continuation_passed:false,
  blind_success:false,paper_account_touched:false,generated_at:new Date().toISOString()};
 let adapter;
 try {
  const dataset=JSON.parse(fs.readFileSync(source,'utf8'));
  report.audit=auditDataset(dataset);
  const sessionName='r22-'+randomUUID();
  const root=path.join(base,'r22-private',sessionName);
  adapter=createModelAdapter(configFromEnv(),{onReservation:r=>{
   fs.mkdirSync(root,{recursive:true});
   fs.appendFileSync(path.join(root,'cost-reservations.jsonl'),JSON.stringify(r)+'\n');
  }});
  const maxFrames=Number(limit);
  const startFrame=Number(process.env.R22_START_FRAME||0);
  if(!Number.isInteger(startFrame)||startFrame<0||startFrame>=dataset.ticks.length)throw Error('INVALID_START_FRAME');
  if(startFrame>0)report.checkpoint=forkSealedPrefix('watch-20261114-diagnostic',sessionName,dataset,startFrame);
  report.new_model_frames_required=dataset.ticks.length-startFrame;
  report.session=sessionName;
  report.replay=await runContinuousReplay({sessionName,dataset,publicRoot:path.join(root,'public'),
   invokeRole:adapter.invokeRole,providerLabel:'OPENAI_RESPONSES_R22',mode:'DIAGNOSTIC',allowKnownWinnerDiagnostic:true,
   maxFrames,roleTimeoutMs:Math.min(600000,(Number(process.env.R22_TIMEOUT_MS||45000)+3000)*3),
   onFrame:record=>{
    fs.mkdirSync(root,{recursive:true});
    fs.writeFileSync(path.join(root,'progress.json'),JSON.stringify({checkpoint:report.checkpoint||null,last_completed:record,provider:adapter.report()},null,2)+'\n');
    console.log(JSON.stringify({completed_day:record.frame+1,total_days:dataset.ticks.length,new_model_responses:adapter.report().receipts.length}));
   }});
  report.provider=adapter.report();
  report.status=report.replay.status;
  report.real_model_continuation_passed=report.status==='COMPLETE'&&
   report.provider.receipts.length===(dataset.ticks.length-startFrame)*5&&
   new Set(report.provider.receipts.map(r=>r.response_id)).size===(dataset.ticks.length-startFrame)*5;
  report.real_model_full_test_passed=startFrame===0&&report.real_model_continuation_passed;
 } catch(e){report.blocker=/^[A-Z0-9_]+$/.test(e.message)?e.message:'RUN_INPUT_OR_CONFIGURATION_ERROR';}
 if(adapter)report.provider=adapter.report();
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,real_model_full_test_passed:report.real_model_full_test_passed,blocker:report.blocker||report.replay?.blocker,report:output}));
 return report.real_model_continuation_passed?0:2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await main();
