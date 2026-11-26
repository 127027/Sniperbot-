// One command for a bounded measured GitHub run or a dedicated laptop checkout.
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const dir='research/cleanroom/', interval=300000, continuous=process.argv.includes('--continuous'), once=process.argv.includes('--once'), publish=process.argv.includes('--publish');
const started=Date.now(), limit=once?1:continuous?Infinity:13;
const sleep=ms=>new Promise(r=>setTimeout(r,ms)), now=()=>new Date().toISOString();
const run=(command,args,timeout=180000)=>{const r=spawnSync(command,args,{stdio:'inherit',timeout});return {exit_code:r.status,error:r.error?.message??null}};
if(publish){const g=spawnSync('git',['status','--porcelain'],{encoding:'utf8'});if(g.status!==0||g.stdout.trim())throw Error('Use a clean dedicated repository checkout for the watchdog');}
for(let i=0;i<limit;i++){
 const cycle_start=now(), steps=[];
 const step=(file)=>{const r=run(process.execPath,[dir+file],180000);steps.push({file,...r,finished_at:now()});return r.exit_code===0};
 const good=step('market-probe.mjs')&&step('evidence.mjs')&&step('targeted.mjs')&&step('token-registry.mjs');
 let summary=null,source_logs=[];if(good){const x=JSON.parse(await fs.readFile(dir+'targeted-latest.json','utf8'));summary=x.summary;source_logs=x.source_logs;const registry=JSON.parse(await fs.readFile(dir+'token-registry/index.json','utf8'));summary.registry_total=registry.total_contracts;summary.registry_added=registry.history.at(-1)?.added??0;}
 const p=dir+'watchdog-checkpoints.json';let h={schema:'cleanroom.watchdog.v1',samples:[]};try{h=JSON.parse(await fs.readFile(p,'utf8'))}catch{}
 h.samples.push({run_id:process.env.GITHUB_RUN_ID??'local-'+started,sample:i,planned_at:new Date(started+i*interval).toISOString(),started_at:cycle_start,finished_at:now(),status:good?'OK':'FAILED',steps,summary,source_logs});h.samples=h.samples.slice(-144);
 await fs.writeFile(p+'.tmp',JSON.stringify(h,null,2)+'\n');await fs.rename(p+'.tmp',p);
 if(publish){
  const files=[p];if(good)files.push(dir+'market-latest.json',dir+'evidence-latest.json',dir+'targeted-latest.json',dir+'token-registry/',dir+'candidate-pages/');
  for(const args of [['add','--',...files],['commit','-m','Cleanroom watchdog checkpoint '+cycle_start],['pull','--rebase','origin','main'],['push','origin','HEAD:main']]){const r=run('git',args,60000);if(r.exit_code!==0)throw Error('GIT_STEP_FAILED '+args[0]);}
 }
 console.log(JSON.stringify({sample:i,good,summary}));
 if(i+1<limit)await sleep(Math.max(0,started+(i+1)*interval-Date.now()));
}
