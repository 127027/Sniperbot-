// The only live-capable wallet operation in this beta is a tightly restricted
// user-confirmed NATIVE SOL SystemProgram transfer. This is not a Jupiter swap
// or a PayPal withdrawal. No arbitrary program, SPL token, or auto-execution.
// An explicit local password and a separate short-lived preview confirmation
// are required by the HTTP layer. Never retry an ambiguous transfer.
import {randomBytes,createHash} from 'node:crypto';
import {open,mkdir,rename,readFile,readdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {decodeBase58,readLocalSolanaVault,signLocalSolanaSystemTransfer} from './local-solana-vault.mjs';
import {readSolanaBalance,SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';

const UINT=/^[1-9][0-9]{0,18}$/;
const RESERVE=5_000_000n; // 0.005 SOL kept locally; not a guaranteed network fee
const MAX_TRANSFER=2_000_000_000n; // per-transaction beta safety cap
const MAX_REPLY=32768;
const JOURNAL_SCHEMA='sniper_solana_native_transfer_journal.v1';
function validateTransfer(destination,lamports){
 decodeBase58(destination);
 if(destination==='11111111111111111111111111111111')
  throw Error('SYSTEM_PROGRAM_IS_NOT_A_RECIPIENT');
 if(typeof lamports!=='string'||!UINT.test(lamports))throw Error('INVALID_TRANSFER_AMOUNT');
 const n=BigInt(lamports);
 if(n<10000n||n>MAX_TRANSFER)throw Error('TRANSFER_OUTSIDE_BETA_LIMIT');
 return n;
}
async function rpc(method,params,{fetcher=fetch}={}){
 const resp=await fetcher(SOLANA_MAINNET_RPC,{
  method:'POST',redirect:'error',
  headers:{accept:'application/json','content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
  signal:AbortSignal.timeout(10000)
 });
 if(!resp?.ok||Number(resp.headers?.get?.('content-length')||0)>MAX_REPLY)
  throw Error('SOLANA_MAINNET_RPC_UNAVAILABLE');
 const raw=await resp.text();
 if(Buffer.byteLength(raw,'utf8')>MAX_REPLY)throw Error('SOLANA_RPC_REPLY_TOO_LARGE');
 const obj=JSON.parse(raw);
 if(obj.jsonrpc!=='2.0'||obj.id!==1||obj.error||!Object.hasOwn(obj,'result'))
  throw Error('SOLANA_RPC_RESULT_INVALID');
 return obj.result;
}
export async function previewNativeSolTransfer({walletFile,destination,lamports,
 fetcher=fetch,at=Date.now()}={}){
 const n=validateTransfer(destination,lamports);
 const wallet=await readLocalSolanaVault(walletFile);
 if(!wallet.exists)throw Error('NO_LOCAL_SOLANA_WALLET');
 if(destination===wallet.address)throw Error('SELF_TRANSFER_FORBIDDEN');
 const balance=await readSolanaBalance(wallet.address,{fetcher});
 const available=BigInt(balance.sol_lamports);
 if(available<n+RESERVE)throw Error('REAL_SOL_BALANCE_TOO_LOW_AFTER_RESERVE');
 return {
  schema:'native_sol_transfer_preview.v1',
  network:'solana-mainnet',from:wallet.address,to:destination,
  lamports:String(n),sol_amount:(Number(n)/1e9).toFixed(9),
  finalized_balance_lamports:balance.sol_lamports,
  minimum_remaining_reserve_lamports:String(RESERVE),
  observed_at_utc:new Date(at).toISOString(),
  max_preview_age_seconds:75,expires_at_utc:new Date(at+75000).toISOString(),
  authorized:false,transaction_signed:false,transaction_sent:false,
  live_trading_enabled:false,payment_provider_connected:false,
  message:'Nur SOL-Überweisung. Keine automatische PayPal-Auszahlung und kein Coin-Swap.'
 };
}
async function durableWriteNew(filename,record){
 const bytes=JSON.stringify(record)+'\n';
 await mkdir(path.dirname(filename),{recursive:true});
 const handle=await open(filename,'wx',0o600);
 try{await handle.writeFile(bytes);await handle.sync()}
 finally{await handle.close()}
}
async function durableReplace(filename,record){
 const temporary=filename+'.tmp-'+randomBytes(8).toString('hex');
 try{
  await durableWriteNew(temporary,record);
  await rename(temporary,filename);
 }finally{await unlink(temporary).catch(()=>{})}
}
async function latestBlockhash(fetcher){
 const r=await rpc('getLatestBlockhash',[{commitment:'confirmed'}],{fetcher});
 if(!Number.isSafeInteger(r?.context?.slot)||
  !Number.isSafeInteger(r?.value?.lastValidBlockHeight))
  throw Error('SOLANA_BLOCKHASH_METADATA_INVALID');
 decodeBase58(r.value.blockhash);
 return r.value.blockhash;
}
async function initialSimulation(tx,{fetcher}){
 const r=await rpc('simulateTransaction',[tx,{
  encoding:'base64',sigVerify:true,replaceRecentBlockhash:false,
  commitment:'confirmed'
 }],{fetcher});
 if(!Number.isSafeInteger(r?.context?.slot)||!r.value||
  !Object.hasOwn(r.value,'err')||r.value.err!==null)
  throw Error('SIGNED_TRANSFER_SIMULATION_FAILED');
 return {slot:r.context.slot,fee_lamports:
  Number.isSafeInteger(r.value.fee)?String(r.value.fee):null};
}
async function currentSignatureStatus(signature,{fetcher}){
 const r=await rpc('getSignatureStatuses',[[signature],{searchTransactionHistory:true}],{fetcher});
 if(!Array.isArray(r?.value)||r.value.length!==1)return 'UNKNOWN';
 const st=r.value[0];
 if(!st)return 'NOT_YET_VISIBLE';
 if(st.err!==null)return 'ONCHAIN_FAILED';
 return st.confirmationStatus==='finalized'?'FINALIZED':'SUBMITTED_PENDING_FINALIZATION';
}
export async function submitLocalNativeSolTransfer({
 walletFile,folder,destination,lamports,password,fetcher=fetch,
 at=Date.now(),id=()=>randomBytes(16).toString('hex')
}={}){
 const n=validateTransfer(destination,lamports);
 if(typeof folder!=='string'||!path.isAbsolute(folder))
  throw Error('INVALID_LOCAL_JOURNAL_DIRECTORY');
 const wallet=await readLocalSolanaVault(walletFile);
 if(!wallet.exists||wallet.address===destination)throw Error('INVALID_LOCAL_WALLET_OR_RECIPIENT');
 const balance=await readSolanaBalance(wallet.address,{fetcher});
 if(BigInt(balance.sol_lamports)<n+RESERVE)
  throw Error('REAL_SOL_BALANCE_TOO_LOW_AFTER_RESERVE');
 const blockhash=await latestBlockhash(fetcher);
 const signed=await signLocalSolanaSystemTransfer({
  filename:walletFile,password,destination,amountLamports:lamports,blockhash
 });
 if(signed.from!==wallet.address||signed.to!==destination||
  signed.lamports!==lamports)throw Error('SIGNED_SOL_TRANSFER_MISMATCH');
 // Never send until a signed simulation succeeded. No remote private key data.
 const simulation=await initialSimulation(signed.signed_transaction_base64,{fetcher});
 const requestId=id();
 if(!/^[0-9a-f]{32}$/.test(requestId))throw Error('INVALID_JOURNAL_IDENTIFIER');
 const filename=path.join(folder,requestId+'.json');
 const base={
  schema:JOURNAL_SCHEMA,transfer_id:requestId,network:'solana-mainnet',
  sender:wallet.address,destination,lamports,signature:signed.signature,
  simulated_at_slot:simulation.slot,simulated_fee_lamports:simulation.fee_lamports,
  created_at_utc:new Date(at).toISOString(),
  signed_transaction_sha256:createHash('sha256')
   .update(Buffer.from(signed.signed_transaction_base64,'base64')).digest('hex'),
  transaction_submitted:false,finalized:false,
  state:'SUBMISSION_UNKNOWN_DO_NOT_AUTOMATICALLY_RETRY',
  note:'Journal safely persisted BEFORE submitting. If interrupted, check this signature; do not send a second transfer.'
 };
 // If storage can't persist the signature, do not broadcast a transaction.
 await durableWriteNew(filename,base);
 try{
  const result=await rpc('sendTransaction',[signed.signed_transaction_base64,{
   encoding:'base64',skipPreflight:false,preflightCommitment:'confirmed',
   maxRetries:0
  }],{fetcher});
  if(result!==signed.signature)throw Error('SOLANA_RETURNED_A_DIFFERENT_SIGNATURE');
  const submitted={...base,transaction_submitted:true,
   state:'SUBMITTED_PENDING_FINALIZATION'};
  await durableReplace(filename,submitted);
  let status='SUBMITTED_PENDING_FINALIZATION';
  try{status=await currentSignatureStatus(signed.signature,{fetcher})}
  catch{status='SUBMITTED_PENDING_FINALIZATION'}
  const terminal={...submitted,state:status,finalized:status==='FINALIZED'};
  await durableReplace(filename,terminal);
  return {transfer_id:requestId,signature:signed.signature,status,
   from:wallet.address,to:destination,lamports,
   payment_provider_confirmed:false,
   native_sol_transfer_only:true,coin_swap_executed:false,
   warning:'Nur wenn Status FINALIZED ist, ist diese Überweisung final bestätigt. Bei Unklarheit niemals automatisch erneut senden.'};
 }catch{
  // The request might have reached a node even if the HTTP response failed.
  // Keep durable journal and do NOT retry; user can reconcile the signature.
  return {transfer_id:requestId,signature:signed.signature,
   status:'SUBMISSION_UNKNOWN_DO_NOT_AUTOMATICALLY_RETRY',
   from:wallet.address,to:destination,lamports,
   payment_provider_confirmed:false,native_sol_transfer_only:true,
   coin_swap_executed:false,
   warning:'Übermittlung unklar. Unbedingt Signatur auf Blockchain prüfen. NICHT erneut senden.'};
 }
}
export async function recentNativeSolTransferJournal(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder))throw Error('INVALID_JOURNAL_FOLDER');
 let names;
 try{names=(await readdir(folder)).filter(x=>/^[0-9a-f]{32}[.]json$/.test(x))}
 catch(e){if(e?.code==='ENOENT')return [];throw e}
 if(names.length>1000)throw Error('JOURNAL_TOO_MANY_RECORDS');
 const entries=[];
 for(const name of names){
  const bytes=await readFile(path.join(folder,name));
  if(bytes.length>3072)throw Error('JOURNAL_RECORD_TOO_LARGE');
  const entry=JSON.parse(bytes.toString('utf8'));
  if(entry.schema!==JOURNAL_SCHEMA||entry.transfer_id+'.json'!==name||
   typeof entry.signature!=='string'||
   !['SUBMISSION_UNKNOWN_DO_NOT_AUTOMATICALLY_RETRY',
    'SUBMITTED_PENDING_FINALIZATION','NOT_YET_VISIBLE',
    'ONCHAIN_FAILED','FINALIZED','UNKNOWN'].includes(entry.state))
   throw Error('CORRUPT_SOL_TRANSFER_JOURNAL');
  entries.push(entry);
 }
 return entries.sort((a,b)=>b.created_at_utc.localeCompare(a.created_at_utc))
  .slice(0,10).map(x=>({
   transfer_id:x.transfer_id,signature:x.signature,
   state:x.state,lamports:x.lamports,
   destination:x.destination,created_at_utc:x.created_at_utc,
   finalized:x.finalized
  }));
}
