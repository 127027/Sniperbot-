// Independently observed public-chain existence checks (not contract audits).
// Read-only RPC methods only. Existence of code/accounts does NOT prove safe
// mint rights, taxes, non-honeypot behavior, ownership, LP, or sellable swaps.
import {candidateId} from './research-watchlist.mjs';

const EVM=Object.freeze({
 eth:{url:'https://ethereum-rpc.publicnode.com',chainId:'0x1'},
 base:{url:'https://mainnet.base.org',chainId:'0x2105'},
 bsc:{url:'https://bsc-dataseed.bnbchain.org',chainId:'0x38'}
});
const SOLANA='https://api.mainnet.solana.com';
const CAP=32768;
async function rpc(url,method,params,id,fetcher){
 const allowed=[...Object.values(EVM).map(x=>x.url),SOLANA];
 if(!allowed.includes(url)||!['eth_chainId','eth_getCode','getAccountInfo'].includes(method))
  throw Error('DISALLOWED_RPC_METHOD');
 const reply=await fetcher(url,{method:'POST',redirect:'error',
  headers:{accept:'application/json','content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id,method,params}),
  signal:AbortSignal.timeout(9000)});
 if(!reply?.ok)throw Error('RPC_HTTP_'+(reply?.status||'UNKNOWN'));
 const declared=Number(reply.headers?.get?.('content-length')||0);
 if(declared>CAP)throw Error('RPC_TOO_LARGE');
 const raw=await reply.text();
 if(Buffer.byteLength(raw)>CAP)throw Error('RPC_TOO_LARGE');
 const v=JSON.parse(raw);
 if(v?.jsonrpc!=='2.0'||v.id!==id||v.error||!Object.hasOwn(v,'result'))
  throw Error('INVALID_RPC_RESPONSE');
 return v.result;
}
const unknown=(id,at,reason)=>({schema:'onchain_existence_readback.v1',
 paper_only:true,actionable:false,candidate_id:id,checked_at_utc:at,
 existence_status:'UNKNOWN',reason,token_account_or_contract_exists:null,
 pool_account_or_contract_exists:null,contract_security:'UNKNOWN',
 lp_control:'UNKNOWN',holder_concentration:'UNKNOWN',honeypot:'UNKNOWN',
 sellability:'UNKNOWN',amount_specific_sell_quote:false,paper_entry_authorized:false});
const address=(chain,token,pool,id)=>{
 try{return candidateId(chain,token,pool)===id}catch{return false}
};
export async function checkReadOnlyOnchainExistence(c,{fetcher=fetch,now=new Date().toISOString()}={}){
 const at=Date.parse(now);
 if(!Number.isFinite(at))throw Error('INVALID_ONCHAIN_TIME');
 const iso=new Date(at).toISOString(),id=c?.candidate_id||null;
 if(!c||!address(c.chain,c.token_address,c.pool_address,id))
  return unknown(id,iso,'INVALID_CHAIN_TOKEN_POOL');
 try{
  if(c.chain==='solana'){
   const params=x=>[x,{encoding:'base64',commitment:'confirmed',dataSlice:{offset:0,length:0}}];
   const [mint,pool]=await Promise.all([
    rpc(SOLANA,'getAccountInfo',params(c.token_address),1,fetcher),
    rpc(SOLANA,'getAccountInfo',params(c.pool_address),2,fetcher)
   ]);
   if(!mint||!pool||!Object.hasOwn(mint,'value')||!Object.hasOwn(pool,'value'))
    return unknown(id,iso,'SOLANA_RPC_ACCOUNT_UNKNOWN');
   const tokenPresent=!!mint.value&&typeof mint.value.owner==='string';
   const poolPresent=!!pool.value&&typeof pool.value.owner==='string';
   return {...unknown(id,iso,tokenPresent&&poolPresent?'ACCOUNT_EXISTS_ONLY_NOT_AUDITED':'SOLANA_ACCOUNT_NOT_FOUND'),
    existence_status:tokenPresent&&poolPresent?'ACCOUNTS_REPORTED':'UNKNOWN',
    token_account_or_contract_exists:tokenPresent,pool_account_or_contract_exists:poolPresent};
  }
  const network=EVM[c.chain];
  if(!network)return unknown(id,iso,'RPC_CHAIN_UNSUPPORTED');
  const chainId=await rpc(network.url,'eth_chainId',[],1,fetcher);
  if(typeof chainId!=='string'||BigInt(chainId)!==BigInt(network.chainId))
   return unknown(id,iso,'RPC_WRONG_CHAIN');
  const [tokenCode,poolCode]=await Promise.all([
   rpc(network.url,'eth_getCode',[c.token_address,'latest'],2,fetcher),
   rpc(network.url,'eth_getCode',[c.pool_address,'latest'],3,fetcher)
  ]);
  if(typeof tokenCode!=='string'||!/^0x[\da-fA-F]*$/.test(tokenCode)||
     typeof poolCode!=='string'||!/^0x[\da-fA-F]*$/.test(poolCode))
   return unknown(id,iso,'RPC_CODE_UNAVAILABLE');
  const tokenPresent=tokenCode.length>2,poolPresent=poolCode.length>2;
  return {...unknown(id,iso,tokenPresent&&poolPresent?'BYTECODE_EXISTS_ONLY_NOT_AUDITED':'CONTRACT_NOT_FOUND'),
   existence_status:tokenPresent&&poolPresent?'CODE_PRESENT':'UNKNOWN',
   token_account_or_contract_exists:tokenPresent,pool_account_or_contract_exists:poolPresent};
 }catch(e){
  return unknown(id,iso,'RPC_UNAVAILABLE_OR_MALFORMED');
 }
}
