// Independently verify a SPECIFIC Solana signature on finalized mainnet.
// This proves only a blockchain transaction and observed wallet deltas.
// It is NOT a PayPal/MoonPay confirmation and NEVER modifies paper balances.
import {decodeBase58,encodeBase58} from './local-solana-vault.mjs';
import {SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';
const U=/^(0|[1-9][0-9]{0,39})$/;
const blocked=reason=>({schema:'solana_finalized_receipt.v1',
 status:'UNVERIFIED',reason,finalized:false,
 payment_provider_verified:false,bot_trade_verified:false,paper_ledger_unchanged:true});
export async function verifyFinalizedSolanaReceipt({wallet,signature,
 fetcher=fetch,now=new Date().toISOString()}={}){
 decodeBase58(wallet);
 if(typeof signature!=='string'||signature.length<80||signature.length>90||
  !/^[1-9A-HJ-NP-Za-km-z]+$/.test(signature))
  throw Error('INVALID_TRANSACTION_SIGNATURE');
 let signBytes;
 try{signBytes=decodeSignature(signature)}catch{throw Error('INVALID_TRANSACTION_SIGNATURE')}
 if(signBytes.length!==64||!Number.isFinite(Date.parse(now)))throw Error('INVALID_RECEIPT_INPUT');
 const response=await fetcher(SOLANA_MAINNET_RPC,{
  method:'POST',redirect:'error',headers:{'content-type':'application/json','accept':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTransaction',
   params:[signature,{commitment:'finalized',maxSupportedTransactionVersion:0,encoding:'jsonParsed'}]}),
  signal:AbortSignal.timeout(10000)});
 if(!response?.ok||Number(response.headers?.get?.('content-length')||0)>262144)
  return blocked('RPC_UNAVAILABLE_OR_TOO_LARGE');
 const raw=await response.text();
 if(Buffer.byteLength(raw,'utf8')>262144)return blocked('RECEIPT_TOO_LARGE');
 let data;try{data=JSON.parse(raw)}catch{return blocked('INVALID_RPC_JSON')}
 if(data?.jsonrpc!=='2.0'||data.id!==1||data.error)return blocked('INVALID_RPC_REPLY');
 const tx=data.result;
 if(!tx)return blocked('NOT_FOUND_AT_FINALIZED_COMMITMENT');
 if(!Number.isSafeInteger(tx.slot)||tx.slot<0||tx.meta?.err!==null||
  !Array.isArray(tx.transaction?.signatures)||!tx.transaction.signatures.includes(signature))
  return blocked('NOT_A_FINALIZED_SUCCESSFUL_TRANSACTION');
 const keys=tx.transaction.message?.accountKeys;
 const pre=tx.meta.preBalances,post=tx.meta.postBalances;
 if(!Array.isArray(keys)||!Array.isArray(pre)||!Array.isArray(post)||
  pre.length!==post.length||keys.length!==post.length||post.length>256)
  return blocked('INVALID_TRANSACTION_ACCOUNT_MAPPING');
 const walletIndices=keys.flatMap((k,i)=>(typeof k==='string'?k:k?.pubkey)===wallet?[i]:[]);
 if(walletIndices.length!==1)return blocked('WALLET_NOT_UNIQUELY_IN_TRANSACTION');
 const i=walletIndices[0],a=pre[i],b=post[i];
 if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0)
  return blocked('INVALID_SOL_BALANCE_DELTA');
 const lamports=(BigInt(b)-BigInt(a)).toString();
 const before=Array.isArray(tx.meta.preTokenBalances)?tx.meta.preTokenBalances:[];
 const after=Array.isArray(tx.meta.postTokenBalances)?tx.meta.postTokenBalances:[];
 function tokens(rows){
  const out=new Map();
  if(rows.length>256)throw Error('EXCESSIVE_RECEIPT_TOKEN_BALANCES');
  for(const item of rows){
   if(item?.owner!==wallet)continue; // other user's token accounts are irrelevant
   if(!Number.isInteger(item.accountIndex)||item.accountIndex<0||item.accountIndex>=keys.length||
    typeof item.mint!=='string'||typeof item.uiTokenAmount?.amount!=='string'||
    !U.test(item.uiTokenAmount.amount))throw Error('INVALID_RECEIPT_TOKEN');
   decodeBase58(item.mint);
   const key=item.accountIndex+':'+item.mint;
   if(out.has(key))throw Error('DUPLICATE_RECEIPT_TOKEN_ENTRY');
   out.set(key,{mint:item.mint,atoms:BigInt(item.uiTokenAmount.amount)});
  }
  return out;
 }
 let beforeTokens,afterTokens;
 try{beforeTokens=tokens(before);afterTokens=tokens(after)}
 catch{return blocked('TOKEN_BALANCE_PROVENANCE_UNVERIFIED')}
 const changes=[];
 const all=new Set([...beforeTokens.keys(),...afterTokens.keys()]);
 for(const key of all){
  const old=beforeTokens.get(key),newer=afterTokens.get(key);
  const diff=(newer?.atoms||0n)-(old?.atoms||0n);
  if(diff!==0n)changes.push({mint:(old||newer).mint,token_atoms_delta:diff.toString()});
 }
 return {schema:'solana_finalized_receipt.v1',
  status:'FINALIZED_ONCHAIN_ONLY',signature,slot:tx.slot,
  network:'solana-mainnet',wallet,
  sol_lamports_delta:lamports,
  token_atoms_changes:changes.slice(0,30),
  network_fee_lamports:Number.isSafeInteger(tx.meta.fee)?String(tx.meta.fee):null,
  checked_at_utc:new Date(now).toISOString(),finalized:true,
  payment_provider_verified:false,bot_trade_verified:false,
  paper_ledger_unchanged:true,live_trade_executed_by_bot:false,
  warning:'Erfolg und Wallet-Veränderung durch Solana bestätigt – NICHT die PayPal-Zahlung, MoonPay-Bestellung oder Bot-Ausführung.'};
}
function decodeSignature(value){
 let num=0n;const abc='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
 for(const ch of value){const x=abc.indexOf(ch);if(x<0)throw Error('BAD');num=num*58n+BigInt(x)}
 let hex=num.toString(16);if(hex.length%2)hex='0'+hex;
 const zeros=value.match(/^1*/)?.[0].length||0;
 return Buffer.concat([Buffer.alloc(zeros),num===0n?Buffer.alloc(0):Buffer.from(hex,'hex')]);
}
