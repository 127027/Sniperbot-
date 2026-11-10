// Chain-native, token-agnostic signed execution intention (V2).
// The token's symbol or popularity is NEVER an identifier: chain + contract/mint
// and an optional pool/pair address define it. No private keys enter this module.
// Validation is NOT approval to trade or a token safety certificate.
import {createPublicKey,verify} from 'node:crypto';
import {decodeBase58} from './local-solana-vault.mjs';
import {canonicalInstruction} from './device-execution-inbox.mjs';

export const TRADE_V2_SCHEMA='sniper_device_trade_intent.v2';
export const TRADE_V2_DOMAIN='MemeSniper/device_trade_intent.v2\n';
export const SUPPORTED_CHAIN_IDENTITIES=Object.freeze({
 solana:{network:'solana-mainnet',wallet:'solana-ed25519',quote:'jupiter-v2',live:false},
 eth:{network:'eip155:1',wallet:'evm-secp256k1',quote:null,live:false},
 base:{network:'eip155:8453',wallet:'evm-secp256k1',quote:null,live:false},
 bsc:{network:'eip155:56',wallet:'evm-secp256k1',quote:null,live:false}
});
const FIELDS=['schema','target_device_id','command_id','issuer','key_id',
 'chain','action','token_address','pool_address','input_asset','output_asset',
 'input_amount_atoms','min_receive_atoms','max_slippage_bps',
 'created_at_utc','expires_at_utc','signature'];
const DEVICE=/^device_[0-9a-f]{32}$/;
const COMMAND=/^cmd_[0-9a-f]{32}$/;
const IDENT=/^[a-zA-Z0-9_.-]{3,80}$/;
const U64=/^[1-9][0-9]{0,19}$/;
export function validateChainAsset(chain,address){
 if(!Object.hasOwn(SUPPORTED_CHAIN_IDENTITIES,chain))
  throw Error('UNSUPPORTED_BLOCKCHAIN');
 if(chain==='solana'){decodeBase58(address);return address}
 if(typeof address!=='string'||!/^0x[a-fA-F0-9]{40}$/.test(address))
  throw Error('INVALID_EVM_CONTRACT_ADDRESS');
 return address.toLowerCase();
}
function equalAsset(chain,a,b){
 return validateChainAsset(chain,a)===validateChainAsset(chain,b);
}
export function unsignedTradeIntent(cmd){
 if(!cmd||typeof cmd!=='object')throw Error('TRADE_INTENT_REQUIRED');
 const {signature,...rest}=cmd;
 return TRADE_V2_DOMAIN+canonicalInstruction(rest);
}
export function verifySignedTradeIntent(cmd,keys,{deviceId,now=Date.now()}={}){
 if(!DEVICE.test(deviceId||''))throw Error('INVALID_LOCAL_DEVICE_ID');
 if(!cmd||typeof cmd!=='object'||Array.isArray(cmd)||
  Object.keys(cmd).sort().join(',')!==[...FIELDS].sort().join(','))
  throw Error('INVALID_TRADE_INTENT_FIELDS');
 if(cmd.schema!==TRADE_V2_SCHEMA||cmd.target_device_id!==deviceId)
  throw Error('TRADE_INTENT_DIFFERENT_DEVICE');
 if(!COMMAND.test(cmd.command_id)||!IDENT.test(cmd.issuer)||!IDENT.test(cmd.key_id)||
  !Object.hasOwn(SUPPORTED_CHAIN_IDENTITIES,cmd.chain)||
  !['BUY','SELL'].includes(cmd.action))throw Error('INVALID_TRADE_IDENTIFIERS');
 const token=validateChainAsset(cmd.chain,cmd.token_address);
 const from=validateChainAsset(cmd.chain,cmd.input_asset);
 const to=validateChainAsset(cmd.chain,cmd.output_asset);
 if(from===to)throw Error('IDENTICAL_TRADE_ASSETS');
 if(cmd.action==='BUY'&&token!==to)throw Error('BUY_TARGET_MUST_BE_OUTPUT');
 if(cmd.action==='SELL'&&token!==from)throw Error('SELL_TARGET_MUST_BE_INPUT');
 // A DEX may select a pool dynamically; a supplied pool is a strict chain
 // address, not an untrusted URL or human-readable ticker symbol.
 if(cmd.pool_address!==null)validateChainAsset(cmd.chain,cmd.pool_address);
 if(typeof cmd.input_amount_atoms!=='string'||!U64.test(cmd.input_amount_atoms)||
  typeof cmd.min_receive_atoms!=='string'||!U64.test(cmd.min_receive_atoms)||
  BigInt(cmd.input_amount_atoms)>18446744073709551615n||
  BigInt(cmd.min_receive_atoms)>18446744073709551615n||
  !Number.isSafeInteger(cmd.max_slippage_bps)||
  cmd.max_slippage_bps<0||cmd.max_slippage_bps>1000)
  throw Error('INVALID_TRADE_ATOMS_OR_SLIPPAGE');
 const created=Date.parse(cmd.created_at_utc),expiry=Date.parse(cmd.expires_at_utc);
 if(!Number.isFinite(now)||!Number.isFinite(created)||!Number.isFinite(expiry)||
  created>now+5000||expiry<=now||expiry<=created||expiry-created>120000)
  throw Error('TRADE_INTENT_EXPIRED_OR_INVALID');
 if(!Array.isArray(keys)||keys.length>30)throw Error('INVALID_EXECUTOR_SIGNER_REGISTRY');
 const trusted=keys.find(k=>k.issuer===cmd.issuer&&k.key_id===cmd.key_id&&
  k.scope==='agent_execution'&&k.revoked!==true);
 if(!trusted||typeof trusted.public_key_pem!=='string')
  throw Error('NO_TRUSTED_TRADE_PUBLISHER');
 if(typeof cmd.signature!=='string'||!/^[-A-Za-z0-9+/=]{80,100}$/.test(cmd.signature))
  throw Error('BAD_TRADE_SIGNATURE');
 const sig=Buffer.from(cmd.signature,'base64');
 if(sig.length!==64||sig.toString('base64')!==cmd.signature)
  throw Error('BAD_TRADE_SIGNATURE');
 const pub=createPublicKey(trusted.public_key_pem);
 if(pub.asymmetricKeyType!=='ed25519'||
  !verify(null,Buffer.from(unsignedTradeIntent(cmd),'utf8'),pub,sig))
  throw Error('TRADE_SIGNATURE_NOT_VERIFIED');
 return {schema:TRADE_V2_SCHEMA,
  verified:true,device_id:deviceId,chain:cmd.chain,network:SUPPORTED_CHAIN_IDENTITIES[cmd.chain].network,
  command_id:cmd.command_id,action:cmd.action,
  token_address:token,input_asset:from,output_asset:to,
  pool_address:cmd.pool_address,amount_atoms:cmd.input_amount_atoms,
  min_receive_atoms:cmd.min_receive_atoms,
  max_slippage_bps:cmd.max_slippage_bps,
  validated_at_utc:new Date(now).toISOString(),
  signing_enabled:false,live_trading_enabled:false};
}
