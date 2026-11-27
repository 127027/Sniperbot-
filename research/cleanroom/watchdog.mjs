// One command for a bounded measured GitHub run or a dedicated laptop checkout.
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {append,coverage,emptyLedger} from './collector-cadence.mjs';
const dir='research/cleanroom/', interval=300000, continuous=process.argv.includes('--continuous'), once=process.argv.includes('--once'), publish=process.argv.includes('--publish');
const cyclesArg=process.argv.find(x=>x.startsWith('--cycles='));
const cycles=cyclesArg?Number(cyclesArg.slice(9)):13;
if(!Number.isInteger(cycles)||cycles<1||cycles>13)throw Error('INVALID_CYCLE_COUNT');
const started=Date.now(), limit=once?1:continuous?Infinity:cycles;
let failedCycles=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms)), now=()=>new Date().toISOString();
const run=(command,args,timeout=180000)=>{const r=spawnSync(command,args,{stdio:'inherit',timeout});return {exit_code:r.status,error:r.error?.message??null}};
if(publish){const g=spawnSync('git',['status','--porcelain'],{encoding:'utf8'});if(g.status!==0||g.stdout.trim())throw Error('Use a clean dedicated repository checkout for the watchdog');}
for(let i=0;i<limit;i++){
 const cycle_start=now(), steps=[];
 const step=(file)=>{const r=run(process.execPath,[dir+file],180000);steps.push({file,...r,finished_at:now()});return r.exit_code===0};
 const good=step('market-probe.mjs')&&step('evidence.mjs')&&step('targeted.mjs')&&step('token-registry.mjs');
 let summary=null,source_logs=[],snapshot=null,freshQuotes=0;
 if(good){
  const x=JSON.parse(await fs.readFile(dir+'targeted-latest.json','utf8'));
  summary=x.summary;source_logs=x.source_logs??[];snapshot=x.finished_at;
  const at=Date.now();
  freshQuotes=(x.rows??[]).filter(r=>r.research_ready&&Number.isFinite(Date.parse(r.observed_at_utc))&&at-Date.parse(r.observed_at_utc)>=0&&at-Date.parse(r.observed_at_utc)<=900000&&Number.isFinite(r.price_eur)&&r.price_eur>0).length;
  const registry=JSON.parse(await fs.readFile(dir+'token-registry/index.json','utf8'));summary.registry_total=registry.total_contracts;summary.registry_added=registry.history.at(-1)?.added??0;
 }
 const cycleStatus=!good?'FAILED':freshQuotes>0?'OK':'NO_FRESH_QUOTES';
 if(cycleStatus!=='OK')failedCycles++;
 const provider_statuses={};
 for(const l of source_logs){
  let host='unknown';try{host=new URL(l.url).hostname}catch{}
  const status=l.status??'UNKNOWN';provider_statuses[host]??={};provider_statuses[host][status]=(provider_statuses[host][status]??0)+1;
 }
 const healthPath=dir+'collector-health.json';
 const health={schema:'cleanroom.collector-health.v1',mode:'RESEARCH_ONLY',run_id:process.env.GITHUB_RUN_ID??'local-'+started,event:process.env.GITHUB_EVENT_NAME??'local',sample:i,started_at:cycle_start,finished_at:now(),status:cycleStatus,failed_cycles_in_run:failedCycles,snapshot,fresh_research_quotes:freshQuotes,steps,summary,provider_statuses,limitations:'Health is per completed cycle, not proof of continuous execution. Compare snapshot and provider timestamps with current UTC. No trade decisions.'};
 const cadencePath=dir+'collector-cadence.json';let ledger=emptyLedger();
 try{ledger=JSON.parse(await fs.readFile(cadencePath,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 ledger=append(ledger,health);
 health.cadence_24h=coverage(ledger,health.finished_at);
 await fs.writeFile(cadencePath+'.tmp',JSON.stringify(ledger)+'\n');await fs.rename(cadencePath+'.tmp',cadencePath);
 await fs.writeFile(healthPath+'.tmp',JSON.stringify(health,null,2)+'\n');await fs.rename(healthPath+'.tmp',healthPath);
 const p=dir+'watchdog-checkpoints.json';let h={schema:'cleanroom.watchdog.v1',samples:[]};try{h=JSON.parse(await fs.readFile(p,'utf8'))}catch{}
 h.samples.push({run_id:process.env.GITHUB_RUN_ID??'local-'+started,sample:i,planned_at:new Date(started+i*interval).toISOString(),started_at:cycle_start,finished_at:now(),status:cycleStatus,steps,summary,source_logs});h.samples=h.samples.slice(-144);
 await fs.writeFile(p+'.tmp',JSON.stringify(h,null,2)+'\n');await fs.rename(p+'.tmp',p);
 if(publish){
  const files=[p,healthPath,cadencePath];if(good)files.push(dir+'market-latest.json',dir+'evidence-latest.json',dir+'targeted-latest.json',dir+'token-registry/',dir+'candidate-pages/');
  for(const args of [['add','--',...files],['commit','-m','Cleanroom watchdog checkpoint '+cycle_start],['pull','--rebase','origin','main'],['push','origin','HEAD:main']]){const r=run('git',args,60000);if(r.exit_code!==0)throw Error('GIT_STEP_FAILED '+args[0]);}
 }
 console.log(JSON.stringify({sample:i,good,summary,health:health.status,fresh_research_quotes:freshQuotes}));
 if(!continuous&&failedCycles>0)process.exitCode=1;
 if(i+1<limit)await sleep(Math.max(0,started+(i+1)*interval-Date.now()));
}
