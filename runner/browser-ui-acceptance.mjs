// End-to-end browser acceptance of the ACTUAL local Windows Bot UI.
// Run with Playwright against Edge (Windows) or Chrome (Linux).
// All data is in a fresh disposable test directory, offline, with PAPER
// money only. Never connect a real wallet, PayPal account or remote agent.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const tmp=await mkdtemp(path.join(os.tmpdir(),'sniper-ui-browser-'));
const artifactDir=path.resolve(process.env.SNIPER_UI_ARTIFACTS||path.join(tmp,'artifacts'));
const originFor=port=>'http://127.0.0.1:'+port;
const walletPassphrase='CI_TEST_ONLY_TEMP_PASSWORD_2026_172604';
let child=null,browser=null,page=null;
const die=(message)=>{throw Error('BROWSER_UI_ACCEPTANCE_FAILED: '+message)};
async function freePort(){
 const s=net.createServer();
 await new Promise((resolve,reject)=>{
  s.once('error',reject);s.listen(0,'127.0.0.1',resolve)
 });
 const port=s.address().port;
 await new Promise(resolve=>s.close(resolve));
 return port;
}
async function httpGet(base,path){
 const r=await fetch(base+path,{signal:AbortSignal.timeout(6000)});
 if(!r.ok)die('GET '+path+' failed with '+r.status);
 return r.json();
}
async function waitForServer(base,process){
 for(let i=0;i<110;i++){
  if(process.exitCode!==null)die('local server exited prematurely: '+process.exitCode);
  try{
   const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1500)});
   if(r.ok)return;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,160));
 }
 die('local server failed to start');
}
async function hasVisible(page,selector){
 return page.locator(selector).isVisible();
}
async function expectViewportFit(page,label){
 const dimension=await page.evaluate(()=>({
  scroll:document.documentElement.scrollWidth,
  window:document.documentElement.clientWidth,
  activePane:document.querySelector('.workspace-pane:not([hidden])')?.id||null
 }));
 // A small tolerance allows antialias and scrollbar differences.
 if(dimension.scroll>dimension.window+10)
  die(label+' overflow: '+JSON.stringify(dimension));
}
async function snapshot(page,name){
 await mkdir(artifactDir,{recursive:true});
 await page.screenshot({path:path.join(artifactDir,name+'.png'),fullPage:true,
  animations:'disabled'});
}

try{
 const port=await freePort(),base=originFor(port);
 child=spawn(process.execPath,[path.join(root,'runner','server.mjs')],{
  cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],
  env:{...process.env,
   SNIPER_DATA_DIR:tmp,SNIPER_PORT:String(port),
   SNIPER_OFFLINE:'1',SNIPER_LOCAL_DISCOVERY:'0',
   SNIPER_RESEARCH_FEED:'0',SNIPER_RESEARCH_READ:'0'}
 });
 let stderr='';
 child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-5000)});
 await waitForServer(base,child);
 const engine=process.platform==='win32'?'msedge':'chrome';
 browser=await chromium.launch({channel:engine,headless:true,
  args:['--disable-background-networking','--no-first-run']});
 const context=await browser.newContext({viewport:{width:1380,height:890},
  locale:'de-DE',colorScheme:'dark',permissions:[]});
 page=await context.newPage();
 const failures=[];
 page.on('pageerror',err=>failures.push(String(err.message||err)));
 page.on('dialog',dialog=>void dialog.accept());
 const r=await page.goto(base,{waitUntil:'domcontentloaded',timeout:25000});
 assert.equal(r.status(),200);
 await page.waitForFunction(()=>document.querySelector('#paperWorkspaceTab')?.getAttribute('aria-selected')==='true');
 await page.waitForFunction(()=>document.getElementById('online')?.textContent?.includes('Runner aktiv'),{timeout:20000});
 if(failures.length)die('JavaScript errors at load: '+failures.join(' | '));
 assert.equal(await hasVisible(page,'#paperWorkspace'),true);
 assert.equal(await hasVisible(page,'#realWorkspace'),false);
 assert.equal(await hasVisible(page,'#paperEurAmount'),true);
 assert.equal(await hasVisible(page,'#realSolTotal'),false);
 assert.equal(await page.locator('#realLiveSwitch').isDisabled(),true);
 await expectViewportFit(page,'paper desktop');
 await snapshot(page,'01-paper-desktop');

 // User-visible PAPER controls call the ACTUAL HTTP server and change
 // only virtual cash; the future real-wallet overview must never echo it.
 const before=(await httpGet(base,'/api/state')).state;
 await page.locator('#paperEurInput').fill('50');
 await page.locator('#paperEurDeposit').click();
 await page.waitForFunction(expected=>
  document.getElementById('paperEurAmount')?.textContent?.includes(expected),
  '50,00',{timeout:20000});
 const after=(await httpGet(base,'/api/state')).state;
 assert.equal(after.cashEur,Number(before.cashEur)+50,
  'paper EUR deposit must only increase virtual cash by 50');
 // Toggle the actual Paper bot and verify the UI remains functional.
 await page.locator('#toggle').click();
 await page.waitForFunction(beforeOn=>
  document.getElementById('toggle')?.textContent!==(beforeOn?'Bot ausschalten':'Bot einschalten'),
  Boolean(before.entriesEnabled),{timeout:20000});
 const toggled=(await httpGet(base,'/api/state')).state;
 assert.notEqual(Boolean(toggled.entriesEnabled),Boolean(before.entriesEnabled));
 await page.locator('#toggle').click();
 await page.waitForFunction(beforeOn=>
  document.getElementById('toggle')?.textContent===(beforeOn?'Bot ausschalten':'Bot einschalten'),
  Boolean(before.entriesEnabled),{timeout:20000});
 if(failures.length)die('JavaScript errors after PAPER controls: '+failures.join(' | '));

 // Switch to ECHTGELD: no cross-account virtual balances in the visible UI.
 await page.locator('#realWorkspaceTab').click();
 assert.equal(await hasVisible(page,'#paperWorkspace'),false);
 assert.equal(await hasVisible(page,'#realWorkspace'),true);
 assert.equal(await hasVisible(page,'#realSolTotal'),true);
 assert.equal(await hasVisible(page,'#paperEurAmount'),false);
 assert.equal(await page.locator('#realEurTotal').textContent(),'— €');
 assert.equal(await page.locator('#realUsdcTotal').textContent(),'— USDC');
 assert.equal(await page.locator('#realLiveSwitch').isDisabled(),true);
 assert.equal(await page.locator('#realLiveSwitch').isChecked(),false);
 const locked=await httpGet(base,'/api/trading/live-mode');
 assert.equal(locked.gate.enabled,false);
 assert.equal(locked.gate.can_enable,false);
 assert.equal(locked.gate.agent_auto_execution_enabled,false);
 await page.locator('#liveModeForceOff').click();
 await page.waitForFunction(()=>document.getElementById('liveModeStatus')?.textContent?.length>8);
 const attempted=await page.evaluate(async()=>{
  const r=await fetch('/api/trading/live-mode',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({enabled:true})});
  return {status:r.status,result:await r.json()};
 });
 assert.equal(attempted.status,423,
  'even manipulated browser must not activate real trading');
 assert.equal((await httpGet(base,'/api/trading/live-mode')).gate.enabled,false);
 await page.locator('#realRefreshOverview').click();
 await page.waitForFunction(()=>document.querySelector('#realBalancesInfo')?.textContent?.includes('nicht verifiziert'),{timeout:15000});
 assert.equal(await page.locator('#realSolTotal').textContent(),'— SOL');
 assert.equal(await page.locator('#realEurTotal').textContent(),'— €');
 await expectViewportFit(page,'real desktop');
 await snapshot(page,'02-echtgeld-desktop-locked');

 // The wallet-creation dialog and its local key file are tested against
 // a disposable CI vault. NEVER use any actual wallet or PayPal account.
 await page.locator('#walletPwd1').fill(walletPassphrase);
 await page.locator('#walletPwd2').fill(walletPassphrase);
 await page.locator('#walletCreate').click();
 await page.waitForFunction(()=>document.querySelector('#walletExisting')?.style.display==='block',{timeout:30000});
 const created=await httpGet(base,'/api/wallet/status');
 assert.equal(created.wallet.exists,true);
 assert.match(created.wallet.address,/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
 assert.equal((await page.locator('#walletAddress').textContent()).trim(),created.wallet.address);
 assert.equal(await page.locator('#walletPwd1').inputValue(),'');
 assert.equal(await page.locator('#walletPwd2').inputValue(),'');
 assert.equal(await page.locator('#realEurTotal').textContent(),'— €');
 assert.equal((await httpGet(base,'/api/state')).state.cashEur,Number(after.cashEur),
  'creating a crypto wallet must not alter paper cash');
 await snapshot(page,'03-echtgeld-testwallet-local');

 // Technical controls are present but collapsed until explicitly requested.
 assert.equal(await page.locator('#workspaceAdvanced').getAttribute('open'),null);
 await page.locator('#workspaceAdvanced > summary').click();
 assert.equal(await page.locator('#workspaceAdvanced').getAttribute('open'),'');
 await page.locator('#workspaceAdvanced > summary').click();
 // Narrow viewport behaves without horizontal scroll on either workspace.
 await page.setViewportSize({width:390,height:844});
 await expectViewportFit(page,'real narrow');
 await snapshot(page,'04-echtgeld-narrow');
 await page.locator('#paperWorkspaceTab').click();
 await expectViewportFit(page,'paper narrow');
 await snapshot(page,'05-paper-narrow');
 // Reopen the Echtgeld tab and verify DOM-based section placement, not just labels.
 await page.locator('#realWorkspaceTab').click();
 assert.equal(await page.locator('#realWorkspace #walletAddress').count(),1);
 assert.equal(await page.locator('#realWorkspace #paperEurAmount').count(),0);
 assert.equal(await page.locator('#paperWorkspace #paperEurAmount').count(),1);
 if(failures.length)die('Browser JS exceptions: '+failures.join(' | '));
 console.log('BROWSER_UI_ACCEPTANCE_OK',{
  browser:engine,real_wallet_is_test_only:true,
  mock_payment_sent:false,real_trade_executed:false,
  page_javascript_exceptions:0,
  paper_deposit_verified:true,
  paper_bot_toggle_verified:true,
  real_wallet_created_on_disposable_ci_only:true,
  real_trade_activation_blocked:true,
  narrow_and_desktop_viewports_checked:true,
  screenshots:5
 });
}catch(e){
 if(page){
  try{await snapshot(page,'99-failure-diagnostic')}catch{}
 }
 console.error('BROWSER_UI_ACCEPTANCE_FAILED',e?.stack||e);
 process.exitCode=1;
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(child){
  child.kill('SIGTERM');
  await new Promise(resolve=>{
   if(child.exitCode!==null)return resolve();
   child.once('exit',resolve);setTimeout(resolve,4000).unref()
  });
  if(child.exitCode===null)child.kill('SIGKILL');
 }
 await rm(tmp,{recursive:true,force:true,maxRetries:7,retryDelay:180});
}
