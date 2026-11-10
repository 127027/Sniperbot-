import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {verify,createPublicKey} from 'node:crypto';
import {createLocalSolanaVault,readLocalSolanaVault,decodeBase58,encodeBase58,
 createUnsignedSolanaTransferMessage,signLocalSolanaSystemTransfer} from './local-solana-vault.mjs';
import {previewNativeSolTransfer,submitLocalNativeSolTransfer,
 recentNativeSolTransferJournal} from './solana-native-transfer.mjs';
const PASS='TEST_ONLY_WALLET_SENDER_PASS_2026_long_secret';
const TO=encodeBase58(Buffer.alloc(32,3)),BLOCK=encodeBase58(Buffer.alloc(32,5));
const system=Buffer.alloc(32);
function rpcMock({balance=180000000,failedSimulation=false,sendFailure=false,finalized=true}={}){
 const calls=[];let knownSig=null;
 const fetcher=async(_url,options)=>{
  const q=JSON.parse(options.body);calls.push(q);
  let result;
  switch(q.method){
   case 'getBalance':result={context:{slot:1000},value:balance};break;
   case 'getLatestBlockhash':result={context:{slot:1000},value:{
    blockhash:BLOCK,lastValidBlockHeight:1234567}};break;
   case 'simulateTransaction':{
    assert.equal(q.params[1].sigVerify,true);
    assert.equal(q.params[1].replaceRecentBlockhash,false);
    const wire=Buffer.from(q.params[0],'base64');
    assert(wire[0]===1&&wire.length<1232);
    const sig=wire.subarray(1,65),msg=wire.subarray(65);
    const sender=msg.subarray(4,36);
    const key=createPublicKey({
     key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),sender]),
     type:'spki',format:'der'});
    assert(verify(null,msg,key,sig),'local cryptographic signature must verify');
    assert.equal(msg[0],1);assert.equal(msg[1],0);assert.equal(msg[2],1);
    assert.equal(msg[3],3);
    assert.deepEqual(msg.subarray(36,68),decodeBase58(TO));
    assert.deepEqual(msg.subarray(68,100),system);
    assert.deepEqual(msg.subarray(100,132),decodeBase58(BLOCK));
    assert.deepEqual([...msg.subarray(132,138)],[1,2,2,0,1,12]);
    assert.equal(msg.readUInt32LE(138),2);
    assert.equal(msg.readBigUInt64LE(142),50000000n);
    knownSig=encodeBase58(sig);
    result={context:{slot:1001},value:{err:failedSimulation?
      {InstructionError:[0,'Custom']}:null,fee:5000}};
    break;
   }
   case 'sendTransaction':{
    assert(!sendFailure,'send failure will be reported as ambiguous');
    assert.equal(q.params[1].skipPreflight,false);
    assert.equal(q.params[1].maxRetries,0);
    result=knownSig;break;
   }
   case 'getSignatureStatuses':{
    result={value:[finalized?{slot:1002,confirmationStatus:'finalized',err:null}:
     {slot:1002,confirmationStatus:'confirmed',err:null}]};
    break;
   }
   default:throw Error('MOCK_UNEXPECTED_RPC_'+q.method);
  }
  return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result}),{status:200});
 };
 return {fetcher,calls};
}
test('local vault signs ONLY one system transfer with exact recipient, amount and ephemeral blockhash',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-native-transfer-sign-'));
 const filename=path.join(dir,'wallet.json');
 try{
  const wallet=await createLocalSolanaVault({filename,password:PASS});
  const sig=await signLocalSolanaSystemTransfer({filename,password:PASS,
   destination:TO,amountLamports:'50000000',blockhash:BLOCK});
  assert.equal(sig.from,wallet.address);
  assert.equal(sig.to,TO);
  assert.equal(sig.program,'SYSTEM_PROGRAM_TRANSFER_ONLY');
  assert.equal(sig.secret_exported,false);
  assert.equal(Buffer.from(sig.signed_transaction_base64,'base64').length,150);
  const plain=JSON.stringify(sig);
  assert(!plain.includes(PASS));
  await assert.rejects(signLocalSolanaSystemTransfer({filename,password:PASS+'WRONG',
   destination:TO,amountLamports:'50000000',blockhash:BLOCK}),
   /WALLET_PASSWORD_OR_TRANSFER_SIGNING_FAILED/);
  assert.throws(()=>createUnsignedSolanaTransferMessage({
   source:wallet.address,destination:wallet.address,amountLamports:'1',blockhash:BLOCK}),
   /IDENTICAL/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('successful explicit transfer simulates, journaled before send, then finalizes',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-native-transfer-confirm-'));
 const walletFile=path.join(dir,'wallet.json'),folder=path.join(dir,'journal');
 try{
  const wallet=await createLocalSolanaVault({filename:walletFile,password:PASS});
  const mock=rpcMock();
  const preview=await previewNativeSolTransfer({
   walletFile,destination:TO,lamports:'50000000',fetcher:mock.fetcher});
  assert.equal(preview.from,wallet.address);
  assert.equal(preview.transaction_sent,false);
  const result=await submitLocalNativeSolTransfer({walletFile,folder,destination:TO,
   lamports:'50000000',password:PASS,fetcher:mock.fetcher,
   id:()=> 'a'.repeat(32)});
  assert.equal(result.status,'FINALIZED');
  assert.equal(result.coin_swap_executed,false);
  assert.equal(result.payment_provider_confirmed,false);
  assert.deepEqual(mock.calls.map(x=>x.method),
   ['getBalance','getBalance','getLatestBlockhash','simulateTransaction',
    'sendTransaction','getSignatureStatuses']);
  const journal=await recentNativeSolTransferJournal(folder);
  assert.equal(journal.length,1);
  assert.equal(journal[0].finalized,true);
  assert.equal(journal[0].destination,TO);
  assert(!JSON.stringify(journal).includes(PASS));
  const raw=await readFile(path.join(folder,'a'.repeat(32)+'.json'),'utf8');
  assert(!raw.includes('signed_transaction_base64'));
  assert(!raw.includes(PASS));
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('invalid password never sends; invalid recipient never reaches RPC',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-native-transfer-blocked-'));
 const walletFile=path.join(dir,'wallet.json'),folder=path.join(dir,'journal');
 try{
  await createLocalSolanaVault({filename:walletFile,password:PASS});
  let count=0;
  const mock=rpcMock();
  await assert.rejects(submitLocalNativeSolTransfer({walletFile,folder,destination:TO,
   lamports:'50000000',password:PASS+'WRONG',fetcher:mock.fetcher}),
   /WALLET_PASSWORD_OR_TRANSFER_SIGNING_FAILED/);
  assert.equal(mock.calls.some(x=>x.method==='sendTransaction'),false);
  await assert.rejects(previewNativeSolTransfer({walletFile,destination:'http://evil.test',
   lamports:'50000000',fetcher:async()=>{count++}}),/INVALID_SOLANA_ADDRESS/);
  assert.equal(count,0);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('failed signed simulation blocks transfer before broadcasting or journal',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-native-transfer-simfail-'));
 const walletFile=path.join(dir,'wallet.json'),folder=path.join(dir,'journal');
 try{
  await createLocalSolanaVault({filename:walletFile,password:PASS});
  const mock=rpcMock({failedSimulation:true});
  await assert.rejects(submitLocalNativeSolTransfer({walletFile,folder,destination:TO,
   lamports:'50000000',password:PASS,fetcher:mock.fetcher}),
   /SIGNED_TRANSFER_SIMULATION_FAILED/);
  assert.equal(mock.calls.some(x=>x.method==='sendTransaction'),false);
  assert.deepEqual(await recentNativeSolTransferJournal(folder),[]);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('unreliable RPC after sending records an immutable ambiguous signature and never retries',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-native-transfer-unknown-'));
 const walletFile=path.join(dir,'wallet.json'),folder=path.join(dir,'journal');
 try{
  await createLocalSolanaVault({filename:walletFile,password:PASS});
  const mock=rpcMock({sendFailure:true});
  const result=await submitLocalNativeSolTransfer({walletFile,folder,destination:TO,
   lamports:'50000000',password:PASS,fetcher:mock.fetcher});
  assert.equal(result.status,'SUBMISSION_UNKNOWN_DO_NOT_AUTOMATICALLY_RETRY');
  assert.equal(mock.calls.filter(x=>x.method==='sendTransaction').length,1);
  const journal=await recentNativeSolTransferJournal(folder);
  assert.equal(journal[0].state,'SUBMISSION_UNKNOWN_DO_NOT_AUTOMATICALLY_RETRY');
  assert.equal(journal[0].signature,result.signature);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('real SOL cannot be overdrawn and beta amounts cannot exceed the cap',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-native-transfer-cap-'));
 const walletFile=path.join(dir,'wallet.json');
 try{
  await createLocalSolanaVault({filename:walletFile,password:PASS});
  for(const amount of ['2.1','-500','0','2000000001','NaN']){
   await assert.rejects(previewNativeSolTransfer({
    walletFile,destination:TO,lamports:amount,fetcher:rpcMock().fetcher}));
  }
  const mock=rpcMock({balance:54000000});
  await assert.rejects(previewNativeSolTransfer({
   walletFile,destination:TO,lamports:'50000000',fetcher:mock.fetcher}),
   /BALANCE_TOO_LOW/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
