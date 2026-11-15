// R29 real browser smoke: screenshots and JS-rendered DOM for offline
// disposable Paper account. Run on Ubuntu CI with preinstalled Chrome.
// Never uses the user's live portfolio, GitHub PAT, wallet, or external APIs.
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {spawn,spawnSync,execFile as rawExecFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const execFile=promisify(rawExecFile);
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const origin='http://127.0.0.1:3030';
const temp=await mkdtemp(path.join(os.tmpdir(),'r29-browser-'));
const bin=['google-chrome','chromium','chromium-browser'].find(name=>
 spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!bin)throw Error('R29_HEADLESS_CHROME_NOT_FOUND_ON_UBUNTU_RUNNER');
let server=null,stderr='';
try{
 server=spawn(process.execPath,[path.join(root,'runner','server.mjs')],{
  cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],
  env:{...process.env,SNIPER_OFFLINE:'1',SNIPER_PORT:'3030',
   SNIPER_DATA_DIR:path.join(temp,'paper'),
   SNIPER_RESEARCH_READ:'0',SNIPER_RESEARCH_FEED:'0',
   SNIPER_LOCAL_DISCOVERY:'0',SNIPER_AGENT_PAPER_FEED:'0',
   SNIPER_CENTRAL_AI_ENABLED:'0',SNIPER_OPENAI_API_KEY:'',
   SNIPER_R29_MAIN_PAPER_DEMO:'0'}
 });
 server.stderr.on('data',d=>stderr=(stderr+String(d)).slice(-1600));
 let ready=false;
 for(let i=0;i<120;i++){
  if(server.exitCode!==null)throw Error('R29_BROWSER_SERVER_EXITED '+stderr);
  try{const res=await fetch(origin+'/api/health');if(res.ok){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert(ready,'R29_BROWSER_SERVER_NOT_READY '+stderr);
 const fund=await fetch(origin+'/api/command',{method:'POST',headers:{
  'origin':origin,'content-type':'application/json'},
  body:JSON.stringify({type:'SET_PAPER_BALANCE',amount:5000})});
 assert.equal(fund.status,200);
 const args=[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--no-first-run','--no-default-browser-check','--disable-background-networking',
  '--hide-scrollbars','--window-size=1440,900',
  '--user-data-dir='+path.join(temp,'chrome-profile'),
  '--virtual-time-budget=6000','--dump-dom',origin+'/'];
 const {stdout}=await execFile(bin,args,{timeout:35000,maxBuffer:2_000_000});
 assert.match(stdout,/<title>Sniperbot · Trading-Dashboard<\/title>/);
 assert.match(stdout,/id="availableValue" class="primary-value">5\.000,00 TEST-USDC</);
 assert.match(stdout,/id="openCount" class="value">0<\/div>/);
 assert.match(stdout,/id="connectionLabel">Lokaler Bot erreichbar<\/span>/);
 assert(!stdout.includes('R29-Sandbox (TEST-USDC)'));
 assert(!stdout.includes('Fünf-Agenten-Kommunikation'));
 const img=path.join(temp,'dashboard.png');
 const screenshotArgs=args.filter(a=>a!=='--dump-dom');
 screenshotArgs.splice(screenshotArgs.length-1,0,'--screenshot='+img);
 await execFile(bin,screenshotArgs,{timeout:35000,maxBuffer:400_000});
 const info=await stat(img);
 assert(info.size>6000,'R29_BROWSER_SCREENSHOT_MISSING_OR_EMPTY');
 console.log('R29_BROWSER_DESKTOP_RENDER_OK: fresh 5000 regular Paper, 0 positions, no duplicate QA balance; screenshot size',info.size);
}catch(e){
 console.error('R29_BROWSER_VISUAL_QA_FAILED',String(e.message).slice(0,800),stderr);
 process.exitCode=1;
}finally{
 if(server&&server.exitCode===null){
  server.kill();
  await new Promise(resolve=>{
   if(server.exitCode!==null)return resolve();
   server.once('exit',resolve);
   setTimeout(resolve,4000).unref?.();
  });
 }
 await rm(temp,{recursive:true,force:true});
}
