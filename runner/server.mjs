import {receiveDecision} from './central-decisions.mjs';
import {buildV09Status,previewFundingV09} from './v09-integration.mjs';
import {runPoolReadbackBatch,READBACK_INTERVAL_MS} from './readback-batch.mjs';
import {buildDecisionDossiers} from './candidate-dossiers.mjs';
import {saveReadbackBatch} from './readback-history.mjs';
import {createReceiver} from './research-inbox.mjs';
import {buildDotStatus} from './dot-status.mjs';
import {fetchResearchNetwork} from './research-network.mjs';
import {storage} from './storage.mjs';
import {loadOrCreateDeviceIdentity} from './device-identity.mjs';
import {createExecutionInbox} from './device-execution-inbox.mjs';
import {loadLocalDeviceTopology,installLocalDeviceTopology,
 followerStatus,operationAllowedWhenMasterOffline} from './device-topology.mjs';
import {fetchMasterPresence} from './github-master-presence.mjs';
import {createMasterCoordinationKey,unlockMasterCoordinationKey,
 getMasterCoordinationPublicKey} from './master-coordination-key.mjs';
import {publishMasterPresence} from './github-master-publisher.mjs';
import {createAgentScratchpad} from './agent-scratchpad.mjs';
import {createLocalSolanaVault,readLocalSolanaVault,
 encryptedSolanaBackup,verifyEncryptedSolanaBackup,
 restoreEncryptedSolanaBackup,checkSolanaVaultPassword} from './local-solana-vault.mjs';
import {readSolanaBalance} from './local-solana-balance.mjs';
import {fetchIndicativeSolanaQuote} from './solana-swap-quote.mjs';
import {previewSolanaSwapRoundtrip} from './solana-swap-roundtrip.mjs';
import {readSolanaOwnedTokens} from './solana-owned-tokens.mjs';
import {recentSolanaWalletActivity} from './solana-wallet-activity.mjs';
import {previewJupiterUnsignedOrder} from './solana-unsigned-order.mjs';
import {assessWalletSolSpend} from './solana-wallet-spend-preflight.mjs';
import {verifyFinalizedSolanaReceipt} from './solana-finalized-receipt.mjs';
import {observeExternalSolanaWallet} from './external-wallet-observer.mjs';
import {ingest,evaluate,simulate,assess} from './research.mjs';
import {authenticate,limiter,body} from './gateway.mjs';
import {createServer} from 'node:http';
import {attachSupervisedStop} from './supervised-stop.mjs';
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {action,applyExits,autoBuyCandidate,freshState,log,paperSignal,updateCandidates,updateQuotes} from './core.mjs';
import {CHAINS,lookupToken,scanNewPools,tokenQuote,validTokenAddress} from './market.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const store=storage(root);
const localDevice=loadOrCreateDeviceIdentity(store.dir);
let deviceTopology=loadLocalDeviceTopology(store.dir,localDevice.device_id);
let masterConnection=followerStatus({topology:deviceTopology});
const masterCoordinationDir=path.join(store.dir,'coordination');
let masterPublisher=null;

async function refreshMasterConnection(){
 if(deviceTopology.mode!=='FOLLOWER')return;
 masterConnection=await fetchMasterPresence(deviceTopology);
}
function masterStatus(){
 const now=Date.now();
 if(deviceTopology.mode!=='FOLLOWER'){
  const active=masterPublisher!==null&&
   now-masterPublisher.lastSuccessfulPublishAt<90000;
  return followerStatus({topology:deviceTopology,now,masterPublishingActive:active});
 }
 // Even a previously successful HTTP poll stops being valid after TTL expires.
 const expired=masterConnection?.expires_at_utc?
  Date.parse(masterConnection.expires_at_utc)<=now:true;
 return expired?
  followerStatus({topology:deviceTopology,lastFetchError:'MASTER_TIMEOUT',now}):
  masterConnection;
}

const agentExecutionInbox=await createExecutionInbox({
 filename:path.join(store.dir,'execution','instructions.v1.json'),
 trustFile:path.join(store.dir,'trusted-execution-publishers.json'),
 deviceId:localDevice.device_id
});
const scratchpad=await createAgentScratchpad(path.join(store.dir,'research-scratchpad','notes.json'));
const walletFile=path.join(store.dir,'wallet','solana-mainnet.v1.json');
let walletCreationBusy=false,lastWalletBalanceAt=0,walletBalanceCache=null;
let state=store.state,scanning=false,pricing=false;
const allowRequest=limiter();
let researchNetwork={schema:'research_network_status.v1',transport:'PUBLIC_GITHUB_PULL_ONLY',
 paper_only:true,actionable:false,current_roles:0,total_roles:5,
 roles:[],watchlist:{candidate_count:null,stale:true},local_execution:'BLOCKED_REAL_VALIDATOR_UNAVAILABLE',
 checked_at_utc:null,message:'Awaiting first public GitHub research readback'};
let networkBusy=false,poolReadbackBusy=false,lastPoolReadbackAt=0;
let poolReadbacks={schema:'pool_readback_batch.v1',paper_only:true,actionable:false,
 status:'NOT_CHECKED',checked_at_utc:null,attempted:0,results:[]};
async function refreshPoolReadbacks(){
 const now=Date.now();
 if(poolReadbackBusy||now-lastPoolReadbackAt<READBACK_INTERVAL_MS)return;
 poolReadbackBusy=true;lastPoolReadbackAt=now;
 try{
  const result=await runPoolReadbackBatch({network:researchNetwork});
  await saveReadbackBatch({folder:path.join(root,'.local','research-learning','pool-readbacks'),batch:result});
  poolReadbacks=result;
 }catch(e){
  // No research fault may alter virtual balances, positions or order policy.
  console.error('Public exact-pool readback:',String(e?.message||'UNAVAILABLE').slice(0,150));
 }finally{poolReadbackBusy=false}
}
async function refreshResearchNetwork(){
 if(networkBusy)return;networkBusy=true;
 try{
  const next=await fetchResearchNetwork({settings:{minTrade:state.minTrade,maxTrade:state.maxTrade,portfolioBudgetUsdc:state.portfolioBudgetUsdc,cashUsdc:state.cashUsdc,cashEur:state.cashEur,positions:state.positions.map(p=>({amountUsdc:p.amountUsdc}))}});
  researchNetwork=next;
  if(process.env.SNIPER_OFFLINE!=='1')void refreshPoolReadbacks();
  // Public summaries only; never put portfolio, tokens or signing keys in the cache.
  const target=path.join(root,'.local','research-network','status.json');
  mkdirSync(path.dirname(target),{recursive:true});
  const temp=target+'.tmp-'+process.pid;
  writeFileSync(temp,JSON.stringify(next,null,2)+'\n','utf8');
  renameSync(temp,target);
 }catch(e){console.error('GitHub research mirror:',e?.message||'UNAVAILABLE')}
 finally{networkBusy=false}
}
function localResearchLearning(){
 const filename=path.join(root,'.local','research-market','status.json');
 try{
  const m=JSON.parse(readFileSync(filename,'utf8'));
  const f=m?.followups;
  if(m?.schema!=='research_market_collector_status.v1'||f?.schema!=='memecoin_followups_status.v1')
    return {available:false,paper_only:true,actionable:false,error:m?.followup_error||'NO_LOCAL_FOLLOWUP_DATA'};
  return {available:true,paper_only:true,actionable:false,
    checked_at_utc:m.last_check_at_utc,stale:Date.now()-Date.parse(m.last_check_at_utc)>600000,
    monitored_active:f.monitored_active,completed:f.completed,admitted_last_cycle:f.admitted,
    omitted_capacity_last_cycle:f.omitted_capacity,followup_ok_last_cycle:f.followup_ok,
    followup_failed_last_cycle:f.followup_failed,
    recent_public_news_leads:m.news_radar?.public_news_leads??0,
    locally_archived_news_events:m.news_radar?.local_archive_count??0,
    news_source_failures:Array.isArray(m.news_radar?.coverage)?m.news_radar.coverage.filter(x=>x.status==='SOURCE_UNAVAILABLE').length:3,
    latest_market_alerts:m.market_alerts?.events_found??0,
    evaluated_market_pairs:m.market_alerts?.compared_pairs??0,
    local_alert_archive_error:m.market_alerts?.local_alert_error??null,
    disclaimer:f.disclaimer,
    warning:m.followup_error||null};
 }catch{return {available:false,paper_only:true,actionable:false,error:'LOCAL_FOLLOWUP_DATA_UNAVAILABLE'}}
}
function decisionKeys(){
 const file=path.join(store.dir,'trusted-publishers.json');
 if(!existsSync(file))return [];
 const keys=JSON.parse(readFileSync(file,'utf8'));
 if(!Array.isArray(keys)||keys.length>20)throw Error('Ungültige Publisher-Registry');
 return keys;
}
function centralStatus(){
 try{return {mode:'PAPER_ONLY',follow:!!state.centralPaperFollow,publisherConfigured:decisionKeys().some(k=>k.scope==='external'&&!k.revoked),execution:'BLOCKED_REAL_VALIDATOR_UNAVAILABLE',receipts:state.paperDecisions?.receipts||[]};}
 catch{return {mode:'PAPER_ONLY',follow:!!state.centralPaperFollow,publisherConfigured:false,execution:'BLOCKED_INVALID_PUBLISHER_REGISTRY',receipts:state.paperDecisions?.receipts||[]};}
}

function save(){store.save(state)}
function commit(next){if(next!==state){store.save(next);state=next}}
function reply(res,code,body){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body))}
function error(res,code,msg){return reply(res,code,{ok:false,error:msg})}
function corsAllowed(req){const origin=req.headers.origin;return !origin || origin===`http://127.0.0.1:${port}`}
async function scan(){if(deviceTopology.mode==='FOLLOWER')return;if(scanning)return;scanning=true;
 try {const {results,errors,at}=await scanNewPools();
   const custom=state.candidates.filter(c=>c.source==='DEX Screener' || c.isDemo);
   const ids=new Set(results.map(x=>x.id));const others=custom.filter(x=>!ids.has(x.id));
   let n=updateCandidates(state,[...results,...others].slice(0,85),errors,at);
   n=autoBuyCandidate(n);commit(n);
 }catch(e){commit({...state,lastError:e.message})}
 finally{scanning=false}
}
async function prices(){if(deviceTopology.mode==='FOLLOWER')return;if(pricing || state.positions.length===0)return;pricing=true;
 const quotes={};
 try{for(const p of state.positions){if(p.isDemo)continue;try{const quote=await tokenQuote(p.chain,p.tokenAddress);if(quote)quotes[p.id]=quote}catch(e){console.log('Kursabfrage',p.symbol,e.message)}}
  if(Object.keys(quotes).length)commit(updateQuotes(state,quotes));
 }finally{pricing=false}
}
const port=Number(process.env.SNIPER_PORT)||3030;
const server=createServer(async(req,res)=>{
 if(req.headers.host!==`127.0.0.1:${port}`||!corsAllowed(req))return error(res,403,'Host/Origin blockiert');
 const route=new URL(req.url||'/',`http://127.0.0.1:${port}`).pathname;
 if(req.method==='GET'&&['/','/dashboard'].includes(route)){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'"});
  return res.end(readFileSync(path.join(root,'runner','dashboard.html')));
 }
 if(req.method==='GET'&&route==='/api/state')return reply(res,200,{ok:true,mode:'PAPER_ONLY',dataSource:'GeckoTerminal / DEX Screener (read only)',state,health:{online:true,scanRunning:scanning,pricing,uptimeSec:Math.round(process.uptime()),central:centralStatus(),researchNetwork,localLearning:localResearchLearning(),dotStatus:buildDotStatus(state.researchInbox,{enabled:process.env.SNIPER_RESEARCH_FEED==='1'})}});
 if(req.method==='GET'&&route==='/api/research/network')return reply(res,200,{ok:true,network:researchNetwork});
 if(req.method==='GET'&&route==='/api/research/advisories')return reply(res,200,{ok:true,advisories:researchNetwork.advisories||null});
 if(req.method==='GET'&&route==='/api/research/learning')return reply(res,200,{ok:true,learning:localResearchLearning()});
 if(req.method==='GET'&&route==='/api/research/inbox')return reply(res,200,{ok:true,mode:'PAPER_ONLY',enabled:process.env.SNIPER_RESEARCH_FEED==='1',inbox:state.researchInbox||{receipts:[]}});
 if(req.method==='GET'&&route==='/api/decisions')return reply(res,200,{ok:true,...centralStatus()});
 if(req.method==='POST'&&route==='/api/decisions/events'){
  if(deviceTopology.mode==='FOLLOWER')
   return error(res,409,'Follower nimmt keine eigenständigen Handelsentscheidungen an');
  if(req.headers.origin)return error(res,403,'Nur lokale signierte Clients');
  if(!allowRequest('central-paper-publisher'))return error(res,429,'Rate-Limit');
  try{const d=await body(req),next=receiveDecision(state,d,decisionKeys());const duplicate=next===state;commit(next);return reply(res,200,{ok:true,duplicate,receipt:state.paperDecisions.receipts.find(r=>r.signal_id===d.signal_id)});}catch(e){return error(res,422,e.message)}
 }
 if(req.method==='GET'&&route==='/api/master/signing-public-key'){
  if(deviceTopology.mode!=='MASTER')return error(res,409,'Nur auf dem Laptop-Master');
  try{return reply(res,200,{ok:true,
   public_key_pem:await getMasterCoordinationPublicKey(masterCoordinationDir),
   master_device_id:localDevice.device_id,
   github_publishing_active:masterStatus().coordination_online})}
  catch{return reply(res,200,{ok:true,initialized:false,
   master_device_id:localDevice.device_id,github_publishing_active:false})}
 }
 if(req.method==='POST'&&route==='/api/master/signing-key/create'){
  if(deviceTopology.mode!=='MASTER')return error(res,409,'Nur auf dem Laptop-Master');
  if(!req.headers.origin||!corsAllowed(req))return error(res,403,'Nur lokale Benutzeraktion');
  if(!allowRequest('master-signing-key-create'))return error(res,429,'Zu viele Schlüssel-Anfragen');
  try{
   const d=await body(req);
   if(!d||Object.keys(d).sort().join(',')!=='passphrase')return error(res,422,'Passphrase erforderlich');
   const created=await createMasterCoordinationKey({folder:masterCoordinationDir,passphrase:d.passphrase});
   return reply(res,201,{ok:true,public_key_pem:created.master_public_key_pem,
    private_key_encrypted:true});
  }catch(e){return error(res,422,e?.code==='EEXIST'?
   'Master-Schlüssel bereits vorhanden – nicht überschrieben':
   String(e?.message||'MASTER_KEY_NOT_CREATED').slice(0,110))}
 }
 if(req.method==='POST'&&route==='/api/master/presence/start'){
  if(deviceTopology.mode!=='MASTER')return error(res,409,'Nur auf dem Laptop-Master');
  if(process.env.SNIPER_OFFLINE==='1')return error(res,503,'Offline-Testmodus');
  if(!req.headers.origin||!corsAllowed(req))return error(res,403,'Nur lokale Benutzeraktion');
  if(!allowRequest('master-github-publisher-start'))return error(res,429,'Zu viele Startanfragen');
  if(masterPublisher)return error(res,409,'Laptop-Zentrale veröffentlicht bereits');
  try{
   const d=await body(req);
   if(!d||Object.keys(d).sort().join(',')!=='github_token,passphrase')
    return error(res,422,'Signaturpassphrase und GitHub-Token erforderlich');
   const key=await unlockMasterCoordinationKey({folder:masterCoordinationDir,
    passphrase:d.passphrase});
   const auth=d.github_token;
   const publish=()=>publishMasterPresence({
    masterDeviceId:localDevice.device_id,privateKey:key,githubToken:auth});
   const first=await publish();
   let busy=false;
   const writer={lastSuccessfulPublishAt:Date.now(),timer:null};
   writer.timer=setInterval(async()=>{
    if(busy)return;busy=true;
    try{
     await publish();
     writer.lastSuccessfulPublishAt=Date.now();
    }catch{
     // No secrets are logged; connection status expires without fresh GitHub publication.
    }finally{busy=false}
   },45000);
   masterPublisher=writer;
   return reply(res,200,{ok:true,published:true,
    expires_at_utc:first.expires_at_utc,
    wallet_keys_uploaded:false,trading_enabled:false,
    message:'Laptop sendet nur signierten Online-Status; Schließen des Fensters stoppt weitere Meldungen.'});
  }catch(e){return error(res,503,String(e?.message||'MASTER_GITHUB_PUBLISH_FAILED').slice(0,120))}
 }
 if(req.method==='POST'&&route==='/api/master/presence/stop'){
  if(deviceTopology.mode!=='MASTER')return error(res,409,'Nur auf dem Laptop-Master');
  if(!req.headers.origin||!corsAllowed(req))return error(res,403,'Nur lokale Benutzeraktion');
  if(masterPublisher){clearInterval(masterPublisher.timer);masterPublisher=null}
  return reply(res,200,{ok:true,publishing_active:false,
   warning:'Bereits bei GitHub gespeicherter Status läuft spätestens mit Ablauf seiner Signatur ab.'});
 }
 if(req.method==='GET'&&route==='/api/coordination/status')
  return reply(res,200,{ok:true,
   local_device_id:localDevice.device_id,
   topology_role:deviceTopology.mode,
   master_device_id:deviceTopology.master_device_id,
   github_repository:'127027/Sniperbot-',
   master:masterStatus(),
   live_trading_enabled:false,
   funding_provider_connected:false,
   message:masterStatus().message});
 if(req.method==='POST'&&route==='/api/device/topology'){
  if(!req.headers.origin||!corsAllowed(req))return error(res,403,'Nur lokale Geräte-Einrichtung');
  if(!allowRequest('local-device-pairing'))return error(res,429,'Zu viele Kopplungsversuche');
  if(deviceTopology.mode!=='UNPAIRED')return error(res,409,'Geräterolle bereits festgelegt; kein heimlicher Wechsel');
  try{
   const d=await body(req);
   if(!d||typeof d!=='object'||Array.isArray(d)||!
    ['MASTER','FOLLOWER'].includes(d.mode))return error(res,422,'MASTER oder FOLLOWER erforderlich');
   if(d.mode==='MASTER'&&Object.keys(d).sort().join(',')!=='mode')
    return error(res,422,'Keine Zusatzfelder für Master');
   if(d.mode==='FOLLOWER'&&
    Object.keys(d).sort().join(',')!=='master_device_id,master_public_key_pem,mode')
    return error(res,422,'Follower braucht Master-ID und öffentlichen Schlüssel');
   const created=installLocalDeviceTopology({
    dir:store.dir,deviceId:localDevice.device_id,mode:d.mode,
    masterDeviceId:d.mode==='MASTER'?localDevice.device_id:d.master_device_id,
    masterPublicKeyPem:d.mode==='FOLLOWER'?d.master_public_key_pem:null});
   deviceTopology=created;
   masterConnection=followerStatus({topology:created});
   return reply(res,201,{ok:true,mode:created.mode,
    master_device_id:created.master_device_id,
    message:masterStatus().message});
  }catch(e){return error(res,422,String(e?.message||'PAIRING_BLOCKED').slice(0,120))}
 }
 if(req.method==='GET'&&route==='/api/device/identity')
  return reply(res,200,{ok:true,device:localDevice,
   wallet_location:'LOCAL_INSTALLATION_ONLY',
   device_hardware_fingerprint_collected:false});
 if(req.method==='GET'&&route==='/api/execution/inbox'){
  try{return reply(res,200,{ok:true,inbox:await agentExecutionInbox.summary()})}
  catch{return error(res,503,'Befehlseingang nicht lesbar; keine Orders')}
 }
 if(req.method==='POST'&&route==='/api/execution/instructions'){
  // Two independent requirements: local role token AND trusted Ed25519 publisher.
  // Absolutely no trade action here, not even a paper execution.
  if(req.headers.origin)return error(res,403,'Nur autorisierte lokale Adapter');
  const principal=authenticate(req.headers.authorization,store.credentials);
  if(principal?.role!=='risk_controller')return error(res,401,'Lokaler Executor-Rollen-Token erforderlich');
  if(!allowRequest('execution-inbox-'+principal.id))return error(res,429,'Befehlsrate begrenzt');
  try{
   if(deviceTopology.mode==='FOLLOWER'&&!masterStatus().coordination_online)
    return error(res,409,'Keine Verbindung – ruf Andreas an');
   const command=await body(req);
   const receipt=await agentExecutionInbox.submit(command);
   return reply(res,200,{ok:true,receipt,live_execution_enabled:false});
  }catch(e){return error(res,422,String(e?.message||'EXECUTION_INSTRUCTION_REJECTED').slice(0,120))}
 }
 if(route==='/api/agent/scratchpad'){
  const principal=authenticate(req.headers.authorization,store.credentials);
  if(!principal)return error(res,401,'Agentenzugang erforderlich');
  if(!allowRequest(principal.id))return error(res,429,'Rate-Limit');
  try{
   if(req.method==='GET')return reply(res,200,{ok:true,
    scratchpad:await scratchpad.get({role:principal.role})});
   if(req.method==='POST'){
    if(!req.headers['content-type']?.startsWith('application/json'))
     return error(res,415,'JSON erforderlich');
    const entry=await body(req);
    return reply(res,200,{ok:true,receipt:await scratchpad.put({role:principal.role,entry})});
   }
   return error(res,405,'Methode nicht erlaubt');
  }catch(e){return error(res,422,String(e?.message||'INVALID_SCRATCHPAD_REQUEST').slice(0,140))}
 }
 if(req.method==='GET'&&route==='/api/wallet/external-observe'){
  // Explicitly a different user's wallet, never this bot's encrypted wallet.
  if(process.env.SNIPER_OFFLINE==='1')return error(res,503,'Offline – keine externen Guthaben');
  if(!allowRequest('external-solana-watch-only'))return error(res,429,'Zu viele externe Abfragen');
  try{
   const query=new URL(req.url,'http://127.0.0.1:'+port);
   const publicAddress=query.searchParams.get('address');
   const summary=await observeExternalSolanaWallet(publicAddress);
   return reply(res,200,{ok:true,external:summary});
  }catch{return error(res,503,'Externe Wallet-Adresse oder Blockchain-Daten nicht verifizierbar')}
 }
 if(req.method==='GET'&&route==='/api/wallet/status'){
  try{return reply(res,200,{ok:true,wallet:await readLocalSolanaVault(walletFile),
   mode:'READ_ONLY_REAL_CHAIN',payment_provider_connected:false,
   real_swap_enabled:false,private_keys_exposed:false})}
  catch{return error(res,503,'Wallet-Datei kann nicht validiert werden. Kein Reset durchführen.')}
 }
 if(req.method==='POST'&&route==='/api/wallet/create'){
  if(!req.headers.origin||!corsAllowed(req))return error(res,403,'Wallet-Einrichtung nur aus der lokalen Oberfläche');
  if(!allowRequest('local-wallet-create'))return error(res,429,'Zu viele Wallet-Anfragen');
  if(walletCreationBusy)return error(res,409,'Wallet-Erstellung bereits aktiv');
  walletCreationBusy=true;
  try{
   const input=await body(req);
   if(!input||Object.keys(input).sort().join(',')!=='password'||
      typeof input.password!=='string')return error(res,422,'Nur Wallet-Passwort erlaubt');
   const result=await createLocalSolanaVault({filename:walletFile,password:input.password});
   return reply(res,201,{ok:true,wallet:result});
  }catch(e){return error(res,422,e?.code==='EEXIST'?
   'Wallet bereits angelegt. Niemals überschreiben.':
   String(e?.message||'WALLET_CREATE_BLOCKED').slice(0,130))}
  finally{walletCreationBusy=false}
 }
 if(req.method==='GET'&&route==='/api/wallet/balance'){
  const wallet=await readLocalSolanaVault(walletFile).catch(()=>null);
  if(!wallet?.exists)return error(res,409,'Wallet nicht erstellt oder beschädigt');
  if(process.env.SNIPER_OFFLINE==='1')return error(res,503,'Offline-Modus – keine Blockchain-Abfrage');
  if(walletBalanceCache&&Date.now()-lastWalletBalanceAt<12000)
   return reply(res,200,{ok:true,balance:walletBalanceCache});
  try{
   const balance=await readSolanaBalance(wallet.address);
   walletBalanceCache=balance;lastWalletBalanceAt=Date.now();
   return reply(res,200,{ok:true,balance});
  }catch{return error(res,503,'Blockchain-Guthaben derzeit nicht verifizierbar')}
 }
 if(req.method==='POST'&&route==='/api/wallet/encrypted-backup'){
  if(!req.headers.origin||!corsAllowed(req))
   return error(res,403,'Wallet-Backup nur aus der lokalen Oberfläche');
  if(!allowRequest('wallet-export-backup'))return error(res,429,'Zu viele Export-Anfragen');
  try{
   const input=await body(req);
   if(!input||Object.keys(input).sort().join(',')!=='password'||
      typeof input.password!=='string')
    return error(res,422,'Passwort erforderlich');
   await checkSolanaVaultPassword({filename:walletFile,password:input.password});
   const sealed=await encryptedSolanaBackup(walletFile);
   return reply(res,200,{ok:true,encrypted_backup:sealed,
    warning:'Verschlüsselte Kopie nur nach Passwortprüfung. Passwort getrennt offline aufbewahren.'});
  }catch{return error(res,422,'WALLET_BACKUP_PASSWORD_OR_INTEGRITY_FAILED')}
 }
 if(req.method==='POST'&&['/api/wallet/verify-backup','/api/wallet/restore-backup'].includes(route)){
  if(!req.headers.origin||!corsAllowed(req))return error(res,403,'Nur lokale Benutzeroberfläche');
  if(!allowRequest('wallet-backup-operation'))return error(res,429,'Zu viele Backup-Anfragen');
  try{
   const entry=await body(req);
   if(!entry||Object.keys(entry).sort().join(',')!=='password,record')
    return error(res,422,'Backup-Daten erforderlich');
   let result;
   if(route==='/api/wallet/verify-backup'){
    const installed=await readLocalSolanaVault(walletFile);
    if(!installed.exists)return error(res,409,'Wallet zum Vergleichen nicht vorhanden');
    result=await verifyEncryptedSolanaBackup({filename:walletFile,
     record:entry.record,password:entry.password});
    if(result.address!==installed.address)return error(res,422,'Backup gehört zu einer anderen Wallet');
   }else{
    result=await restoreEncryptedSolanaBackup({filename:walletFile,
     record:entry.record,password:entry.password});
   }
   return reply(res,200,{ok:true,backup:result});
  }catch(e){return error(res,422,e?.code==='EEXIST'?
    'Vorhandene Wallet wird niemals überschrieben':
    String(e?.message||'BACKUP_NOT_VERIFIED').slice(0,100))}
 }
 if(req.method==='GET'&&route==='/api/wallet/receipt'){
  const wallet=await readLocalSolanaVault(walletFile).catch(()=>null);
  if(!wallet?.exists)return error(res,409,'Wallet nicht erstellt oder beschädigt');
  if(process.env.SNIPER_OFFLINE==='1')return error(res,503,'Offline – keine Bestätigung möglich');
  if(!allowRequest('wallet-transaction-receipt'))return error(res,429,'Zu viele Belegprüfungen');
  try{
   const u=new URL(req.url,'http://127.0.0.1:'+port);
   const receipt=await verifyFinalizedSolanaReceipt({
    wallet:wallet.address,signature:u.searchParams.get('signature')});
   return reply(res,200,{ok:true,receipt});
  }catch{return error(res,422,'Ungültige Signatur oder Blockchain-Antwort nicht verfügbar')}
 }
 if(req.method==='GET'&&route==='/api/wallet/activity'){
  const wallet=await readLocalSolanaVault(walletFile).catch(()=>null);
  if(!wallet?.exists)return error(res,409,'Wallet nicht erstellt oder beschädigt');
  if(process.env.SNIPER_OFFLINE==='1')return error(res,503,'Offline – keine Blockchain-Historie');
  if(!allowRequest('wallet-activity'))return error(res,429,'Zu viele Verlaufabfragen');
  try{return reply(res,200,{ok:true,activity:await recentSolanaWalletActivity(wallet.address,{
   wait:()=>new Promise(resolve=>setTimeout(resolve,1100))})})}
  catch{return error(res,503,'Blockchain-Transaktionsverlauf nicht verifizierbar')}
 }
 if(req.method==='GET'&&route==='/api/wallet/tokens'){
  const wallet=await readLocalSolanaVault(walletFile).catch(()=>null);
  if(!wallet?.exists)return error(res,409,'Wallet nicht erstellt oder beschädigt');
  if(process.env.SNIPER_OFFLINE==='1')return error(res,503,'Offline – keine Token-Guthaben');
  if(!allowRequest('wallet-owned-tokens'))return error(res,429,'Zu viele Guthabenabfragen');
  try{return reply(res,200,{ok:true,holdings:await readSolanaOwnedTokens(wallet.address)})}
  catch{return error(res,503,'Token-Guthaben nicht zuverlässig verifizierbar')}
 }
 if(req.method==='GET'&&route==='/api/wallet/unsigned-order'){
  const wallet=await readLocalSolanaVault(walletFile).catch(()=>null);
  if(!wallet?.exists)return error(res,409,'Wallet nicht erstellt oder beschädigt');
  if(process.env.SNIPER_OFFLINE==='1')return error(res,503,'Offline – keine Order-Vorbereitung');
  if(!allowRequest('wallet-unsigned-preflight'))return error(res,429,'Zu viele Order-Vorprüfungen');
  const u=new URL(req.url,'http://127.0.0.1:'+port);
  const amountLamports=u.searchParams.get('amountLamports');
  try{
   // A quote alone MUST NOT cause a Jupiter order request if the real wallet
   // lacks enough finalized SOL. Simulated TEST-USDC cannot be spent here.
   const balance=await readSolanaBalance(wallet.address);
   const funding=assessWalletSolSpend({balance,amountLamports});
   if(!funding.unsigned_order_request_allowed)
    return reply(res,200,{ok:true,preflight:{
     schema:'jupiter_unsigned_order_preflight.v1',status:'BLOCKED',
     reason:funding.reason,prepared_transaction_present:false,
     transaction_signed:false,transaction_sent:false,
     signing_permitted:false,live_trading_enabled:false},
     funding});
   const preflight=await previewJupiterUnsignedOrder({
    wallet:wallet.address,targetMint:u.searchParams.get('outputMint'),
    amountLamports,simulate:true});
   return reply(res,200,{ok:true,preflight,funding});
  }catch{return error(res,503,'Blockchain-Bestand oder Jupiter-Order derzeit nicht unabhängig prüfbar')}
 }
 if(req.method==='GET'&&route==='/api/wallet/swap-roundtrip'){
  const wallet=await readLocalSolanaVault(walletFile).catch(()=>null);
  if(!wallet?.exists)return error(res,409,'Wallet nicht erstellt oder beschädigt');
  if(process.env.SNIPER_OFFLINE==='1')return error(res,503,'Offline – keine Kurse');
  if(!allowRequest('wallet-roundtrip'))return error(res,429,'Zu viele Tauschprüfungen');
  const u=new URL(req.url,'http://127.0.0.1:'+port);
  const targetMint=u.searchParams.get('outputMint');
  const amountLamports=u.searchParams.get('amountLamports');
  const preview=await previewSolanaSwapRoundtrip({
   targetMint,amountLamports,wait:()=>new Promise(resolve=>setTimeout(resolve,2200))});
  // Only public quote metadata, never a transaction, signing key or PayPal receipt.
  return reply(res,200,{ok:true,preview});
 }
 if(req.method==='GET'&&route==='/api/wallet/swap-quote'){
  if(process.env.SNIPER_OFFLINE==='1')return error(res,503,'Offline – keine echten Swap-Quotes');
  if(!allowRequest('wallet-swap-quote'))return error(res,429,'Quote-Ratenlimit');
  const wallet=await readLocalSolanaVault(walletFile).catch(()=>null);
  if(!wallet?.exists)return error(res,409,'Wallet nicht erstellt oder beschädigt');
  try{
   const u=new URL(req.url,'http://127.0.0.1:'+port);
   const outputMint=u.searchParams.get('outputMint');
   const amountLamports=u.searchParams.get('amountLamports');
   const quote=await fetchIndicativeSolanaQuote({outputMint,amountLamports});
   return reply(res,200,{ok:true,quote});
  }catch(e){return error(res,422,String(e?.message||'NO_QUOTE_AVAILABLE').slice(0,120))}
 }
 if(req.method==='GET'&&route==='/api/v09/status')return reply(res,200,{ok:true,v09:buildV09Status({state,network:researchNetwork})});
 if(req.method==='GET'&&route==='/api/v09/pool-readbacks')return reply(res,200,{ok:true,readbacks:poolReadbacks});
 if(req.method==='GET'&&route==='/api/v09/dossiers')return reply(res,200,{ok:true,dossiers:buildDecisionDossiers({network:researchNetwork,batch:poolReadbacks})});
 if(req.method==='GET'&&route==='/api/health')return reply(res,200,{ok:true,mode:'PAPER_ONLY',uptimeSec:Math.round(process.uptime())});
 if(route==='/api/research'||route==='/api/research/events'){
  if(req.headers.origin)return error(res,403,'Gateway ist nur für lokale Clients');
  const principal=authenticate(req.headers.authorization,store.credentials);
  if(!principal)return error(res,401,'Agenten-Zugang erforderlich');
  if(!allowRequest(principal.id))return error(res,429,'Rate-Limit');
  if(req.method==='GET'&&route==='/api/research')return reply(res,200,{ok:true,research:state.research});
  if(req.method!=='POST'||route!=='/api/research/events')return error(res,405,'Methode nicht erlaubt');
  try{const e=await body(req),n=ingest(state,e,principal),duplicate=n===state;if(!duplicate)commit(evaluate(n));return reply(res,200,{ok:true,duplicate,research:state.research})}
  catch(e){return error(res,e.status||422,e.message)}
 }
 if(req.method!=='POST'||route!=='/api/command')return error(res,404,'Nicht gefunden');
 if(!corsAllowed(req))return error(res,403,'Fremder Origin blockiert');
 if(!req.headers['content-type']?.startsWith('application/json'))return error(res,415,'JSON erforderlich');
 let raw='';try{for await(const chunk of req){raw+=chunk;if(raw.length>6000)throw Error('Anfrage zu groß')}}catch{return error(res,413,'Anfrage zu groß')}
 let a;try{a=JSON.parse(raw)}catch{return error(res,400,'Ungültiges JSON')}
 const allowed=new Set(['PREVIEW_PAPER_FUNDING','SET_PAPER_BALANCE','SET_CENTRAL_FOLLOW','SIMULATE_AGENTS','TOGGLE_BOT','SET_AUTO','SET_RANGE','SET_EXITS','DEPOSIT','WITHDRAW','EXCHANGE','EXCHANGE_BACK','BUY','SELL','RESET','SCAN','DEMO_SIGNAL','LOOKUP','DEMO_MOVE']);
 if(!allowed.has(a?.type))return error(res,400,'Aktion nicht zulässig');
 if(deviceTopology.mode==='FOLLOWER'&&
  !operationAllowedWhenMasterOffline(a?.type,false))
  return error(res,409,'Keine Verbindung – ruf Andreas an; nur Ein-/Auszahlung erlaubt');

 if(a.type==='PREVIEW_PAPER_FUNDING'){
  const result=previewFundingV09({amountEur:a.amountEur,eurPerUsdc:a.eurPerUsdc,
    providerFeeEur:a.providerFeeEur,spreadPct:a.spreadPct,networkFeeUsdc:a.networkFeeUsdc,
    now:Date.now()});
  return reply(res,200,{ok:true,preview:result,ledger_unchanged:true});
 }
 if(a.type==='SIMULATE_AGENTS'){try{commit(simulate(state,a.negative===true));return reply(res,200,{ok:true,state})}catch(e){return error(res,422,e.message)}}
 if(a.type==='SCAN'){void scan();return reply(res,202,{ok:true,message:'Marktdatenabfrage gestartet'})}
 if(a.type==='LOOKUP'){
  if(!validTokenAddress(a.chain,a.address))return error(res,400,'Ungültige Contract-Adresse für Chain');
  try{const c=await lookupToken(a.chain,a.address);const rest=state.candidates.filter(x=>x.id!==c.id);
   commit({...state,candidates:[c,...rest].slice(0,85),history:log(state,'Token geprüft',`${c.symbol} – DEX Screener; Sicherheitsstatus UNGEPRÜFT`)});
   return reply(res,200,{ok:true,state})}catch(e){return error(res,422,e.message)}
 }
 if(a.type==='DEMO_SIGNAL'){
   const demo=paperSignal(),n={...state,candidates:[demo,...state.candidates.filter(x=>x.id!==demo.id)]};
   let next={...n,history:log(n,'TEST-SIGNAL','Erfundenes Demo-Signal erzeugt – keine echte KI-Entscheidung')};
   // Demo single-signal is manual only; automatic entries require the five-role pipeline.
   commit(next);
   return reply(res,200,{ok:true,state});
 }
 if(a.type==='DEMO_MOVE'){
  const p=state.positions.find(p=>p.id===a.id&&p.isDemo);if(!p)return error(res,422,'Nur für erfundene Test-Coins');
  const pct=Number(a.percent);if(!Number.isFinite(pct)||pct< -95||pct>500)return error(res,422,'Ungültiger Impuls');
  commit(applyExits({...state,positions:state.positions.map(q=>q.id===p.id?{...q,priceUsd:q.priceUsd*(1+pct/100),markAt:new Date().toISOString()}:q)}));
  return reply(res,200,{ok:true,state});
 }
 const n=action(state,a);if(n===state)return error(res,422,'Aktion blockiert (Bot AUS, Guthaben, Grenzen oder ungültige Eingabe)');
 commit(evaluate(n));return reply(res,200,{ok:true,state});
});
server.requestTimeout=10000;server.headersTimeout=10000;
server.listen(port,'127.0.0.1',()=>console.log(`MEME SNIPER V0.9 PAPER GATEWAY (kein LIVE) http://127.0.0.1:${port}`));
// Public GitHub presence is informational; a Follower NEVER trades on its own.
if(process.env.SNIPER_OFFLINE!=='1'&&deviceTopology.mode==='FOLLOWER'){
 void refreshMasterConnection();
 setInterval(()=>{void refreshMasterConnection()},60000);
}
// Safe, low-frequency public polling; independent of browser. No private keys, no live execution.
if(process.env.SNIPER_OFFLINE!=='1'&&process.env.SNIPER_LOCAL_DISCOVERY==='1')setInterval(()=>{void scan()},90000);
if(process.env.SNIPER_OFFLINE!=='1')setInterval(()=>{void prices()},30000);
if(process.env.SNIPER_OFFLINE!=='1'&&process.env.SNIPER_LOCAL_DISCOVERY==='1')setTimeout(()=>{void scan()},2500);
setInterval(()=>{if(deviceTopology.mode==='FOLLOWER')return;try{commit(evaluate(applyExits(state)))}catch(e){console.error('Research/Exit:',e.message)}},5000);
let shuttingDown=false;
function shutdownServer(){
 if(shuttingDown)return;
 if(masterPublisher){clearInterval(masterPublisher.timer);masterPublisher=null}
 shuttingDown=true;
 try{save()}catch(e){console.error('Paper-state save on shutdown:',e.message)}
 server.close(()=>process.exit(0));
 // Exit even if an HTTP connection refuses to close. State was saved first.
 setTimeout(()=>process.exit(0),3000).unref();
}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,shutdownServer);
attachSupervisedStop(shutdownServer);

// Read-only five-role GitHub research mirror, separate from portfolio and action handlers.
if(process.env.SNIPER_OFFLINE!=='1'&&process.env.SNIPER_RESEARCH_READ==='1'){
 void refreshResearchNetwork();
 setInterval(()=>{void refreshResearchNetwork()},120000);
}

// Opt-in, outbound-only, informational feed. Never calls ingest/evaluate/action.
if(process.env.SNIPER_RESEARCH_FEED==='1'){
 const pollResearch=createReceiver({getState:()=>state,commit});
 void pollResearch().catch(e=>console.error('Research inbox:',e.message));setInterval(()=>{void pollResearch().catch(e=>console.error('Research inbox:',e.message))},60000);
}
