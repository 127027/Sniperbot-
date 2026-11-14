// Starts the REAL Windows-compatible HTTP server with a temporary isolated
// paper account, with ALL outbound research / market polling disabled.
// Verifies V0.9 endpoints and ensures a funding preview changes no balances.
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tmp=await mkdtemp(path.join(os.tmpdir(),'sniper-v09-smoke-'));
async function freePort(){
 const server=net.createServer();
 await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return port;
}
let child;
try{
 const port=await freePort();
 child=spawn(process.execPath,[path.join(root,'runner','server.mjs')],{
  cwd:root,env:{...process.env,SNIPER_PORT:String(port),SNIPER_DATA_DIR:tmp,
   SNIPER_OFFLINE:'1',SNIPER_LOCAL_DISCOVERY:'0',SNIPER_RESEARCH_FEED:'0'},
  stdio:['ignore','pipe','pipe'],windowsHide:true
 });
 let output='';
 child.stdout.on('data',x=>{output+=x.toString().slice(0,2000)});
 child.stderr.on('data',x=>{output+=x.toString().slice(0,2000)});
 const base='http://127.0.0.1:'+port;
 let up=false;
 for(let i=0;i<70;i++){
  if(child.exitCode!==null)throw Error('V09_SERVER_EARLY_EXIT '+output.slice(-500));
  try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(300)});
   if(r.ok){up=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert(up,'real local server did not start '+output.slice(-500));
 const read=async p=>{
  const r=await fetch(base+p,{headers:{host:'127.0.0.1:'+port}});
  assert.equal(r.status,200,p);return r.json();
 };

 // The REAL local executor serves private research notes only with a scoped agent token.
 const registry=JSON.parse(await readFile(path.join(tmp,'gateway-credentials.json'),'utf8'));
 const r1=registry.find(x=>x.role==='news_discovery'),r2=registry.find(x=>x.role==='opportunity_qa');
 assert(r1&&r2);
 const unauth=await fetch(base+'/api/agent/scratchpad');
 assert.equal(unauth.status,401);
 const put=await fetch(base+'/api/agent/scratchpad',{method:'POST',
  headers:{authorization:'Bearer '+r1.token,'content-type':'application/json'},
  body:JSON.stringify({key:'test-research',visibility:'shared',
    ttl_minutes:10,value:{candidate_id:'base:fake_test',observation:'not an order'}})});
 assert.equal(put.status,200);
 const putResult=await put.json();
 assert.equal(putResult.receipt.actionable,false);
 const notesResponse=await fetch(base+'/api/agent/scratchpad',
  {headers:{authorization:'Bearer '+r2.token}});
 assert.equal(notesResponse.status,200);
 const notes=await notesResponse.json();
 assert.equal(notes.scratchpad.records.length,1);
 assert.equal(notes.scratchpad.records[0].key,'test-research');
 const reject=await fetch(base+'/api/agent/scratchpad',{method:'POST',
  headers:{authorization:'Bearer '+r1.token,'content-type':'application/json'},
  body:JSON.stringify({key:'bad',visibility:'shared',ttl_minutes:10,
   value:{private_key:'MUST_NOT_STORE'}})});
 assert.equal(reject.status,422);



 // Real local master-laptop onboarding in an entirely isolated test directory.
 const identity=(await read('/api/device/identity')).device;
 assert.match(identity.device_id,/^device_[a-f0-9]{32}$/);
 const gate=(await read('/api/trading/live-mode')).gate;
 assert.equal(gate.mode,'LOCKED');
 assert.equal(gate.enabled,false);
 assert.equal(gate.can_enable,false);
 assert.equal(gate.paypal_checkout_enabled,false);
 const enableLive=await fetch(base+'/api/trading/live-mode',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({enabled:true})});
 assert.equal(enableLive.status,423,'browser may NEVER enable live cryptocurrency trading');
 const unsupportedLive=await fetch(base+'/api/trading/live-mode',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({enabled:'true'})});
 assert.equal(unsupportedLive.status,422);
 const crossOriginLive=await fetch(base+'/api/trading/live-mode',{method:'POST',
  headers:{origin:'https://hostile.invalid','content-type':'application/json'},
  body:JSON.stringify({enabled:false})});
 assert.equal(crossOriginLive.status,403,'cross-origin live mode requests denied');
 const disableLive=await fetch(base+'/api/trading/live-mode',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({enabled:false})});
 assert.equal(disableLive.status,200);
 assert.equal((await disableLive.json()).gate.enabled,false);
 const realOverviewOffline=await fetch(base+'/api/wallet/overview');
 assert.equal(realOverviewOffline.status,503,'cannot claim real balance offline');
 const unpaired=(await read('/api/coordination/status'));
 assert.equal(unpaired.topology_role,'UNPAIRED');
 assert.equal(unpaired.live_trading_enabled,false);
 const roleToken=registry.find(x=>x.role==='risk_controller').token;
 const unpairedCmd=await fetch(base+'/api/execution/instructions',{method:'POST',
  headers:{authorization:'Bearer '+roleToken,'content-type':'application/json'},
  body:'{}'});
 assert.equal(unpairedCmd.status,409);
 const assignMaster=await fetch(base+'/api/device/topology',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({mode:'MASTER'})});
 assert.equal(assignMaster.status,201);
 const alreadyAssigned=await fetch(base+'/api/device/topology',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({mode:'MASTER'})});
 assert.equal(alreadyAssigned.status,409);
 const masterPassword='CI_ONLY_DO_NOT_USE_MASTER_SIGNING_2026!';
 const signingKey=await fetch(base+'/api/master/signing-key/create',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({passphrase:masterPassword})});
 assert.equal(signingKey.status,201);
 const masterPublic=await read('/api/master/signing-public-key');
 assert.match(masterPublic.public_key_pem,/BEGIN PUBLIC KEY/);
 assert(!JSON.stringify(masterPublic).includes(masterPassword));
 const cannotPublishOffline=await fetch(base+'/api/master/presence/start',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({passphrase:masterPassword,github_token:'github_fake_ci_1234567890'})});
 assert.equal(cannotPublishOffline.status,503);
 const topo=(await read('/api/coordination/status'));
 assert.equal(topo.topology_role,'MASTER');
 assert.equal(topo.master.coordination_online,false);
 assert.equal(topo.master.trade_authorized,false);

 // Actual on-device wallet creation with ephemeral, isolated CI keys ONLY.
 const walletInitial=await read('/api/wallet/status');
 assert.equal(walletInitial.wallet.exists,false);
 const walletPassword='CI_TEST_WALLET_ONLY_DO_NOT_USE_OR_FUND_789123';
 const create=await fetch(base+'/api/wallet/create',{method:'POST',headers:{
  origin:base,'content-type':'application/json'},body:JSON.stringify({password:walletPassword})});
 assert.equal(create.status,201);
 const newWallet=await create.json();
 assert.equal(newWallet.wallet.encrypted,true);
 assert.equal(newWallet.wallet.signing_enabled,false);
 const walletStatus=await read('/api/wallet/status');
 assert.equal(walletStatus.wallet.exists,true);
 assert.equal(walletStatus.wallet.address,newWallet.wallet.address);
 const anonymousBackup=await fetch(base+'/api/wallet/encrypted-backup');
 assert.equal(anonymousBackup.status,404,'encrypted backup must never be exported via GET');
 const wrongBackup=await fetch(base+'/api/wallet/encrypted-backup',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({password:walletPassword+'WRONG'})});
 assert.equal(wrongBackup.status,422);
 const authorizedBackup=await fetch(base+'/api/wallet/encrypted-backup',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({password:walletPassword})});
 assert.equal(authorizedBackup.status,200);
 const encryptedBackup=await authorizedBackup.json();
 assert.equal(encryptedBackup.ok,true);
 assert(!JSON.stringify(encryptedBackup).includes(walletPassword));
 const verifyBackup=await fetch(base+'/api/wallet/verify-backup',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({password:walletPassword,record:encryptedBackup.encrypted_backup})});
 assert.equal(verifyBackup.status,200);
 assert.equal((await verifyBackup.json()).backup.valid,true);
 const duplicateWallet=await fetch(base+'/api/wallet/create',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({password:walletPassword})});
 assert.equal(duplicateWallet.status,422);
 const offlineTokens=await fetch(base+'/api/wallet/tokens');
 assert.equal(offlineTokens.status,503);
 const offlineRoundtrip=await fetch(base+'/api/wallet/swap-roundtrip?outputMint=So11111111111111111111111111111111111111112&amountLamports=100000000');
 assert.equal(offlineRoundtrip.status,503);
 const offlineReceipt=await fetch(base+'/api/wallet/receipt?signature=INVALID');
 assert.equal(offlineReceipt.status,503);
 const offlineActivity=await fetch(base+'/api/wallet/activity');
 assert.equal(offlineActivity.status,503);
 const offlineUnsigned=await fetch(base+'/api/wallet/unsigned-order?outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amountLamports=10000000');
 assert.equal(offlineUnsigned.status,503);
 const outside=await fetch(base+'/api/wallet/external-observe?address=So11111111111111111111111111111111111111112');
 assert.equal(outside.status,503,'no external wallet readback in offline CI');
 const solPreviewOffline=await fetch(base+'/api/wallet/sol-transfer/prepare',{
  method:'POST',headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({destination:'So11111111111111111111111111111111111111112',
   lamports:'10000000'})});
 assert.equal(solPreviewOffline.status,503);
 const solSendOffline=await fetch(base+'/api/wallet/sol-transfer/send',{
  method:'POST',headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({confirmation_id:'no',confirmation_phrase:'ICH SENDE SOL',
   password:'TEST_ONLY_LONG_PASSWORD_123'})});
 assert.equal(solSendOffline.status,503);
 const solJournal=await read('/api/wallet/sol-transfer/history');
 assert.deepEqual(solJournal.transfers,[]);
 const dynamicQuoteOffline=await fetch(base+'/api/wallet/dynamic-route?chain=solana&inputAsset=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputAsset=So11111111111111111111111111111111111111112&amountAtoms=50000000');
 assert.equal(dynamicQuoteOffline.status,503,'no live dynamic quote offline');
 const dynamicInbox=await read('/api/execution/route-v2');
 assert.equal(dynamicInbox.inbox.stored,0);
 const dynamicAgentOffline=await fetch(base+'/api/execution/route-v2',{
  method:'POST',headers:{authorization:'Bearer '+roleToken,
   'content-type':'application/json'},body:'{}'});
 assert.equal(dynamicAgentOffline.status,503,'signed agent v2 cannot quote offline');
 const offlineWalletBalance=await fetch(base+'/api/wallet/balance');
 assert.equal(offlineWalletBalance.status,503);

 const before=await read('/api/state');
 const status=await read('/api/v09/status');
 const dossiers=await read('/api/v09/dossiers');
 assert.equal(dossiers.ok,true);
 assert.equal(dossiers.dossiers.schema,'candidate_decision_dossiers.v1');
 assert.equal(dossiers.dossiers.automated_external_paper_entry_authorized,false);
 assert.equal(dossiers.dossiers.paper_only,true);
 const readbacks=await read('/api/v09/pool-readbacks');
 assert.equal(readbacks.readbacks.paper_only,true);
 assert.equal(readbacks.readbacks.actionable,false);
 assert.equal(readbacks.readbacks.status,'NOT_CHECKED');
 assert.equal(status.ok,true);
 assert.equal(status.v09.mode,'PAPER_ONLY');
 assert.equal(status.v09.live_enabled,false);
 assert.equal(status.v09.wallet_created,false);
 assert.equal(status.v09.automated_external_paper_trading_enabled,false);
 const preview=await fetch(base+'/api/command',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({type:'PREVIEW_PAPER_FUNDING',amountEur:50,
   eurPerUsdc:0.92,providerFeeEur:1,spreadPct:1,networkFeeUsdc:0.2})
 });
 assert.equal(preview.status,200);
 const p=await preview.json();
 assert.equal(p.preview.status,'PAPER_QUOTED');
 assert.equal(p.preview.payment_performed,false);
 assert.equal(p.ledger_unchanged,true);
 const after=await read('/api/state');
 assert.equal(after.state.cashUsdc,before.state.cashUsdc);
 assert.equal(after.state.cashEur,before.state.cashEur);
 assert.deepEqual(after.state.positions,before.state.positions);
 const command=async payload=>{
  const resp=await fetch(base+'/api/command',{method:'POST',
   headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  assert.equal(resp.status,200,JSON.stringify(payload));return resp.json();
 };
 // Real local server exercises clickable PAPER Euro controls end to end.
 await command({type:'DEPOSIT',eur:50});
 let acct=(await read('/api/state')).state;
 assert.equal(acct.cashEur,50);
 await command({type:'EXCHANGE',eur:40});
 acct=(await read('/api/state')).state;
 assert.equal(acct.cashEur,10);
 assert.equal(acct.cashUsdc,40);
 await command({type:'EXCHANGE_BACK',usdc:10});
 acct=(await read('/api/state')).state;
 assert.equal(acct.cashEur,20);
 assert.equal(acct.cashUsdc,30);
 await command({type:'WITHDRAW',eur:15});
 acct=(await read('/api/state')).state;
 assert.equal(acct.cashEur,5);
 assert.equal(acct.cashUsdc,30);
 assert.equal(acct.positions.length,0);
 const noFunds=await fetch(base+'/api/command',{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify({type:'WITHDRAW',eur:500})});
 assert.equal(noFunds.status,422);
 assert.equal((await read('/api/state')).state.cashEur,5);
 console.log('BOT_VISIBLE_PAPER_EUR_50_DEPOSIT_EXCHANGE_WITHDRAW_OK: no actual payment or trade');
 console.log('V09_WINDOWS_COMPATIBLE_START_SMOKE_OK: status, funding preview, paper ledger unchanged');
}finally{
 if(child){
  child.kill();
  await Promise.race([new Promise(resolve=>child.once('exit',resolve)),
   new Promise(resolve=>setTimeout(resolve,2000))]);
 }
 await rm(tmp,{recursive:true,force:true});
}
