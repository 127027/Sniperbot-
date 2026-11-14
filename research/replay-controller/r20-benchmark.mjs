// R20 measurable TECHNICAL benchmark, not a discovery/trading validation.
// Runs 62 synthetic historical day ticks with 5 fixture responses each.
// Emits a JSON artifact with machine-checkable caveats.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {ROLES} from './engine.mjs';
import {runPath} from './controller.mjs';
import {runContinuousReplay,syntheticFixtureRoleProvider} from './continuous-runner.mjs';

const days=62;
const ticks=Array.from({length:days},(_,i)=>
 new Date(Date.UTC(2023,2,14+i,23,59,59)).toISOString().replace('.000Z','Z'));
const dataset={
 schema:'isolated_replay.v1',
 data_class:'SYNTHETIC',
 window:{start:'2023-03-14T00:00:00Z',end:'2023-05-14T23:59:59Z'},
 ticks,events:[],
 universe:{selection:'ASOF_COHORT',complete:false,provenance:'SYNTHETIC PERFORMANCE BASELINE, ZERO HISTORICAL RESEARCH'},
 contexts:Object.fromEntries(ROLES.map(role=>[role,{fresh:false,target_exposed:false,attestation:null}]))
};
export async function benchmark(output){
 const name='r20-benchmark-'+process.pid+'-'+Date.now();
 const publicRoot=fs.mkdtempSync(path.join(os.tmpdir(),'sniper-r20-bench-'));
 try{
  const result=await runContinuousReplay({
   sessionName:name,dataset,publicRoot,
   invokeRole:syntheticFixtureRoleProvider,
   providerLabel:'SYNTHETIC_FIXTURE',
   maxFrames:62,mode:'DIAGNOSTIC'
  });
  const summary={
   schema:'r20_synthetic_benchmark.v1',
   benchmark:'62-day pure technical historical-controller throughput',
   status:result.status,
   completed_frames:result.completed_frames,
   total_frames:result.total_frames,
   confirmed_fixture_role_responses:result.role_calls,
   duration_ms:result.duration_ms,
   five_role_barrier_per_frame:result.frames.every(x=>x.completed&&Object.keys(x.roles).length===5),
   distinct_historical_discovery:false,
   historic_price_execution_verified:false,
   live_or_paper_trades:0,
   simulated_trades:result.simulated_trades,
   external_llm_calls:0,
   no_realtime_hourly_wait:true,
   limitations:[
    'SYNTHETIC fixture only; no agent inference, social discovery, or real PEPE blindtest.',
    'Historical cohort completeness and actual pre-breakout evidence not proven.',
    'No live agent adapter or paper-account connection is present.'
   ]
  };
  if(result.status!=='COMPLETE'||summary.completed_frames!==62||
     summary.confirmed_fixture_role_responses!==310||
     !summary.five_role_barrier_per_frame)throw Error('R20_SYNTHETIC_BENCHMARK_FAILED');
  if(output){
   fs.mkdirSync(path.dirname(output),{recursive:true});
   fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n');
  }
  return summary;
 }finally{
  fs.rmSync(publicRoot,{recursive:true,force:true});
  fs.rmSync(runPath(name),{recursive:true,force:true});
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 benchmark(process.argv[2]).then(r=>console.log(JSON.stringify(r,null,2)))
  .catch(e=>{console.error(e.message);process.exitCode=1;});
}
