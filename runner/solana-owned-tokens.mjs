// Read-only finalized SPL Token / Token-2022 balances owned by this address.
// Never signs, changes portfolio, assumes token is safe or identifies a payment.
import {decodeBase58} from './local-solana-vault.mjs';
import {LEGACY_TOKEN_PROGRAM,TOKEN_2022_PROGRAM} from './solana-mint-risk.mjs';
import {SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';
const PROGRAMS=[LEGACY_TOKEN_PROGRAM,TOKEN_2022_PROGRAM];
const UINT=/^(0|[1-9][0-9]{0,39})$/;
const DISPLAY=/^(0|[1-9][0-9]{0,39})(\\.[0-9]{1,18})?$/;
const MAX_BYTES=262144;
async function rpcOwner(owner,programId,fetcher){
 const reply=await fetcher(SOLANA_MAINNET_RPC,{
  method:'POST',redirect:'error',headers:{accept:'application/json',
   'content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTokenAccountsByOwner',
   params:[owner,{programId},{encoding:'jsonParsed',commitment:'finalized'}]}),
  signal:AbortSignal.timeout(12000)});
 if(!reply?.ok||Number(reply.headers?.get?.('content-length')||0)>MAX_BYTES)
  throw Error('SOLANA_TOKEN_RPC_UNAVAILABLE');
 const raw=await reply.text();
 if(Buffer.byteLength(raw,'utf8')>MAX_BYTES)throw Error('SOLANA_TOKEN_RPC_TOO_LARGE');
 const data=JSON.parse(raw);
 if(data?.jsonrpc!=='2.0'||data.id!==1||data.error||
   !Number.isSafeInteger(data.result?.context?.slot)||
   !Array.isArray(data.result?.value)||data.result.value.length>120)
  throw Error('INVALID_SOLANA_TOKEN_RESPONSE');
 const balances=[];
 for(const entry of data.result.value){
  const a=entry?.account;
  if(a?.owner!==programId)throw Error('INVALID_SOLANA_TOKEN_PROGRAM_OWNER');
  const parsed=a?.data?.parsed;
  const expectedProgram=programId===TOKEN_2022_PROGRAM?'spl-token-2022':'spl-token';
  if(parsed?.type!=='account'||a?.data?.program!==expectedProgram)
   throw Error('INVALID_SOLANA_TOKEN_ACCOUNT');
  const info=parsed?.info;
  if(info?.owner!==owner)throw Error('TOKEN_ACCOUNT_DIFFERENT_OWNER');
  decodeBase58(info?.mint);
  const amount=info?.tokenAmount?.amount;
  const decimals=info?.tokenAmount?.decimals;
  if(typeof amount!=='string'||!UINT.test(amount)||
   !Number.isInteger(decimals)||decimals<0||decimals>18)
   throw Error('INVALID_SOLANA_TOKEN_AMOUNT');
  const state=info?.state;
  if(!['initialized','frozen'].includes(state))
   throw Error('INVALID_SOLANA_TOKEN_STATE');
  const rpcUi=info?.tokenAmount?.uiAmountString;
  balances.push({mint:info.mint,program_id:programId,
   amount_raw:amount,decimals,account_state:state,
   rpc_ui_amount:typeof rpcUi==='string'&&DISPLAY.test(rpcUi)?rpcUi:null});
 }
 return {slot:data.result.context.slot,balances};
}
function pretty(raw,decimals){
 const n=BigInt(raw);
 if(decimals===0)return n.toString();
 const factor=10n**BigInt(decimals);
 const whole=n/factor;
 const fraction=(n%factor).toString().padStart(decimals,'0').replace(/0+$/,'');
 return fraction?whole+'.'+fraction:whole.toString();
}
const SCALE=10n**18n;
function toScale18(value){
 const [whole,fraction='']=value.split('.');
 return BigInt(whole)*SCALE+BigInt(fraction.padEnd(18,'0'));
}
function fromScale18(value){
 const whole=value/SCALE;
 const fraction=(value%SCALE).toString().padStart(18,'0').replace(/0+$/,'');
 return fraction?whole+'.'+fraction:whole.toString();
}
export async function readSolanaOwnedTokens(owner,{fetcher=fetch,now=new Date().toISOString()}={}){
 decodeBase58(owner);
 if(!Number.isFinite(Date.parse(now)))throw Error('INVALID_BALANCE_CLOCK');
 const results=[];
 for(const program of PROGRAMS){
  results.push(await rpcOwner(owner,program,fetcher));
 }
 const grouped=new Map();
 for(const x of results.flatMap(x=>x.balances)){
  const key=x.mint+':'+x.program_id;
  const old=grouped.get(key);
  if(old&&old.decimals!==x.decimals)throw Error('INCONSISTENT_TOKEN_DECIMALS');
  const combinedUi=x.rpc_ui_amount!==null&&(!old||old.rpc_ui_amount!==null)?
   fromScale18(toScale18(x.rpc_ui_amount)+toScale18(old?.rpc_ui_amount||'0')):null;
  grouped.set(key,{...x,amount_raw:String(BigInt(x.amount_raw)+BigInt(old?.amount_raw||'0')),
   rpc_ui_amount:combinedUi,
   account_state:old?.account_state==='frozen'||x.account_state==='frozen'?'frozen':'initialized'});
 }
 const balances=[...grouped.values()].filter(x=>BigInt(x.amount_raw)>0n).slice(0,100).map(x=>({
  ...x,
  ui_amount:x.program_id===TOKEN_2022_PROGRAM?x.rpc_ui_amount:pretty(x.amount_raw,x.decimals),
  ui_amount_source:x.program_id===TOKEN_2022_PROGRAM?
    (x.rpc_ui_amount===null?'UNKNOWN_TOKEN_2022_SCALED_DISPLAY':'RPC_REPORTED_UI_AMOUNT'):
    'RAW_BASE_DECIMALS',
  executable_sell_quote:false,token_safety_verified:false}));
 return {schema:'solana_public_owned_spl_balances.v1',network:'solana-mainnet',
  owner_address:owner,finalized_slot:Math.min(...results.map(x=>x.slot)),
  observed_at_utc:new Date(now).toISOString(),tokens:balances,
  count:balances.length,paper_ledger_unchanged:true,
  external_payment_confirmed:false,transactions_signed:false};
}
