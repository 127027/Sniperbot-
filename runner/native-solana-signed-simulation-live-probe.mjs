// Observational LIVE Solana RPC signed simulation with an ephemeral unfunded
// key. NEVER calls sendTransaction, never uses the user's local vault,
// never transfers cryptocurrency, and never alters real wallet balances.
// A simulation "insufficient funds" is expected for this throwaway wallet.
import {generateKeyPairSync,sign} from 'node:crypto';
import {createUnsignedSolanaTransferMessage,encodeBase58} from './local-solana-vault.mjs';
import {SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';
const req=async(method,params)=>{
 const resp=await fetch(SOLANA_MAINNET_RPC,{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
  signal:AbortSignal.timeout(8000)});
 if(!resp.ok)throw Error('RPC_HTTP_'+resp.status);
 const text=await resp.text();
 if(text.length>32768)throw Error('RPC_RESULT_TOO_LARGE');
 const body=JSON.parse(text);
 if(body.error)throw Error('RPC_'+String(body.error.message||'ERROR').slice(0,80));
 return body.result;
};
try{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const pk=publicKey.export({format:'der',type:'spki'});
 const source=encodeBase58(pk.subarray(pk.length-32));
 const {publicKey:dest}=generateKeyPairSync('ed25519');
 const dp=dest.export({format:'der',type:'spki'});
 const destination=encodeBase58(dp.subarray(dp.length-32));
 const block=await req('getLatestBlockhash',[{commitment:'confirmed'}]);
 const message=createUnsignedSolanaTransferMessage({
  source,destination,amountLamports:'10000000',blockhash:block.value.blockhash
 });
 const signature=sign(null,message,privateKey);
 const wire=Buffer.concat([Buffer.from([1]),signature,message]).toString('base64');
 const result=await req('simulateTransaction',[wire,{
  encoding:'base64',commitment:'confirmed',
  sigVerify:true,replaceRecentBlockhash:false
 }]);
 console.log('EPHEMERAL_SIGNED_SOLANA_MAINNET_SIMULATION',JSON.stringify({
  wallet_is_ephemeral:true,actual_sol_balance:0,
  tx_submitted:false,transfer_executed:false,
  simulated_rpc_slot:result?.context?.slot??null,
  instruction_error:result?.value?.err??null,
  signature_verification_requested:true,
  raw_private_key_exposed:false
 }));
}catch(e){
 console.log('EPHEMERAL_SIGNED_SOLANA_SIMULATION_INCONCLUSIVE',
  String(e?.message||'UNAVAILABLE').slice(0,120));
}
