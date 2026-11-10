// Wallet-facing FINALIZED Solana activity readback.
// A positive native SOL balance change is NOT a verified PayPal/MoonPay order.
// No transactions signed, submitted, retried or booked into paper ledger.
import {decodeBase58} from './local-solana-vault.mjs';
import {SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';
const MAX_BYTES=65536;
async function call(method,params,fetcher){
 const res=await fetcher(SOLANA_MAINNET_RPC,{method:'POST',redirect:'error',
  headers:{accept:'application/json','content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
  signal:AbortSignal.timeout(10000)});
 if(!res?.ok||Number(res.headers?.get?.('content-length')||0)>MAX_BYTES)
  throw Error('SOLANA_HISTORY_RPC_UNAVAILABLE');
 const raw=await res.text();
 if(Buffer.byteLength(raw,'utf8')>MAX_BYTES)throw Error('SOLANA_HISTORY_TOO_LARGE');
 const data=JSON.parse(raw);
 if(data?.jsonrpc!=='2.0'||data.id!==1||data.error||!Object.hasOwn(data,'result'))
  throw Error('INVALID_SOLANA_HISTORY_RESPONSE');
 return data.result;
}
function readDelta(wallet,tx){
 const accounts=tx?.transaction?.message?.accountKeys;
 const meta=tx?.meta;
 if(!Array.isArray(accounts)||!Array.isArray(meta?.preBalances)||
  !Array.isArray(meta?.postBalances)||
  accounts.length!==meta.preBalances.length||
  accounts.length!==meta.postBalances.length)throw Error('INVALID_TRANSACTION_BALANCES');
 const pos=accounts.findIndex(a=>(typeof a==='string'?a:a?.pubkey)===wallet);
 if(pos<0)throw Error('WALLET_NOT_IN_TRANSACTION');
 const pre=meta.preBalances[pos],post=meta.postBalances[pos];
 if(!Number.isSafeInteger(pre)||pre<0||!Number.isSafeInteger(post)||post<0)
  throw Error('INVALID_TRANSACTION_BALANCES');
 const lamports=BigInt(post)-BigInt(pre);
 return {direction:lamports>0n?'SOL_BALANCE_INCREASE':
  lamports<0n?'SOL_BALANCE_DECREASE':'SOL_BALANCE_UNCHANGED',
  lamports_delta:lamports.toString()};
}
export async function recentSolanaWalletActivity(owner,{
 fetcher=fetch,now=new Date().toISOString(),wait=async()=>{}
}={}){
 decodeBase58(owner);
 if(!Number.isFinite(Date.parse(now)))throw Error('INVALID_HISTORY_CLOCK');
 const sigs=await call('getSignaturesForAddress',
  [owner,{limit:3,commitment:'finalized'}],fetcher);
 if(!Array.isArray(sigs)||sigs.length>3)throw Error('INVALID_SOLANA_SIGNATURE_LIST');
 const events=[];
 for(const s of sigs){
  if(typeof s?.signature!=='string'||s.signature.length<80||
     s.signature.length>90||!/^[1-9A-HJ-NP-Za-km-z]+$/.test(s.signature)||
     !Number.isSafeInteger(s.slot))throw Error('INVALID_SIGNATURE_EVENT');
  if(s.confirmationStatus!=='finalized')continue;
  if(events.length)await wait();
  let direction='UNVERIFIED',delta=null;
  if(s.err!==null&&s.err!==undefined){
   direction='FAILED_TRANSACTION';
  }else{
   try{
    const tx=await call('getTransaction',[s.signature,{
     encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:0
    }],fetcher);
    if(tx?.slot!==s.slot||tx?.meta?.err!==null)
     throw Error('TRANSACTION_NOT_CONFIRMED');
    const d=readDelta(owner,tx);
    direction=d.direction;delta=d.lamports_delta;
   }catch{
    direction='UNVERIFIED';
   }
  }
  events.push({signature:s.signature,slot:s.slot,
   block_time_utc:Number.isSafeInteger(s.blockTime)?
    new Date(s.blockTime*1000).toISOString():null,
   direction,sol_lamports_delta:delta,
   is_moonpay_payment_confirmed:false,
   tokens_traded_verified:false,
   paper_balance_changed:false});
 }
 return {schema:'solana_wallet_finalized_activity.v1',
  address:owner,observed_at_utc:new Date(now).toISOString(),
  events,external_provider_payment_proven:false,
  any_order_executed_by_bot:false,paper_ledger_unchanged:true,
  warning:'Nur öffentliche SOL-Kontoveränderungen. Keine verifizierten PayPal-/MoonPay-Zahlungen oder echten Bot-Trades.'};
}
