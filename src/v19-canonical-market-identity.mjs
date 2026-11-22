// R29 SYS-13: canonical CHAIN + TYPED POOL and CHAIN + TOKEN ids.
// Keep legacy chain:pool map keys and ALL original archive references byte-for-byte.
// Identity is observational only, never an issuer/quote/risk authorization.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const EVM=/^0x[0-9a-fA-F]{40}$/;
const V4=/^0x[0-9a-fA-F]{64}$/;
const normalize=(chain,address)=>chain==='solana'?address:address.toLowerCase();
export function canonicalMarketIdentity({chain,pool,pool_kind=null,contract=null}={}){
 const c=canonicalChain(chain);
 if(!c||!poolValid(c,pool,pool_kind))return null;
 // A V4 PoolId is a 32-byte ID, not a 20-byte token or pair address.
 // A 20-byte pair with an erroneous V4 tag is ambiguous and must not be
 // silently relabeled as a V4 pool.
 if(pool_kind==='UNISWAP_V4_POOL_ID'&&!V4.test(pool))return null;
 if(V4.test(pool)&&pool_kind!=='UNISWAP_V4_POOL_ID')return null;
 if(c==='solana'&&pool_kind!==null&&pool_kind!=='SOLANA_POOL_ADDRESS')
  return null;
 if(c!=='solana'&&pool_kind!==null
   &&pool_kind!=='UNISWAP_V4_POOL_ID'
   &&pool_kind!=='EVM_POOL_ADDRESS')return null;
 const type=c==='solana'?'SOLANA_POOL_ADDRESS':
  V4.test(pool)?'UNISWAP_V4_POOL_ID':'EVM_POOL_ADDRESS';
 if(c!=='solana'&&type==='EVM_POOL_ADDRESS'&&!EVM.test(pool))return null;
 const normalizedPool=normalize(c,pool);
 const normalizedContract=tokenValid(c,contract)?normalize(c,contract):null;
 return {schema:1,chain:c,pool_kind:type,
  pool:normalizedPool,contract:normalizedContract,
  legacy_pool_key:c+':'+normalizedPool,
  pool_key:c+'|'+type+'|'+normalizedPool,
  token_key:normalizedContract===null?null:c+'|TOKEN|'+normalizedContract,
  token_identity_verified_by_independent_source:false,
  pool_identity_verified_by_independent_source:false};
}
export function enrichPersistentMarketIdentity(memory){
 if(memory?.kind!=='R29_PERSISTENT_MARKET_MEMORY'
   ||!memory.pools||typeof memory.pools!=='object'
   ||Array.isArray(memory.pools))throw Error('INVALID_MARKET_IDENTITY_MIGRATION_INPUT');
 const out=structuredClone(memory);
 const keys=new Map(),collisions=[],invalid=[],conflicts=[];
 for(const [legacyKey,p] of Object.entries(out.pools)){
  const x=canonicalMarketIdentity({
   chain:p.chain,pool:p.pool,pool_kind:p.pool_kind||null,contract:p.contract||null
  });
  if(!x){
   invalid.push(legacyKey);
   p.canonical_identity_status='INVALID_LEGACY_POOL_ID';
   p.pool_identity_key=null;p.token_identity_key=null;
   continue;
  }
  // A legacy map entry must not be silently re-keyed or merged: old
  // observation references and page cursors may still point to that key.
  p.pool_identity_key=x.pool_key;
  p.pool_identity_type=x.pool_kind;
  const originals=[p.contract,...(p.contract_conflicts||[])]
   .filter(c=>tokenValid(x.chain,c))
   .map(c=>x.chain==='solana'?c:c.toLowerCase());
  const tokenIds=[...new Set(originals.map(c=>x.chain+'|TOKEN|'+c))].sort();
  p.observed_token_identity_keys=tokenIds;
  p.token_identity_key=tokenIds.length===1?tokenIds[0]:null;
  p.canonical_identity_status=tokenIds.length>1?'CONFLICT':
   tokenIds.length===1?'RESOLVED_FROM_SINGLE_OBSERVED_CONTRACT':
   'TOKEN_CONTRACT_MISSING';
  if(tokenIds.length>1)conflicts.push(legacyKey);
  if(keys.has(x.pool_key)){
   const other=keys.get(x.pool_key);
   p.canonical_identity_status='DUPLICATE_LEGACY_POOL_ALIAS_CONFLICT';
   p.token_identity_key=null;
   out.pools[other].canonical_identity_status='DUPLICATE_LEGACY_POOL_ALIAS_CONFLICT';
   out.pools[other].token_identity_key=null;
   collisions.push([other,legacyKey]);
  }else keys.set(x.pool_key,legacyKey);
 }
 out.canonical_identity_schema=1;
 out.canonical_identity_audit={
  kind:'R29_V19_CANONICAL_POOL_TOKEN_IDENTITY',
  legacy_pool_count:Object.keys(memory.pools).length,
  preserved_pool_count:Object.keys(out.pools).length,
  typed_pool_count:keys.size,
  conflicts:conflicts.sort(),
  collisions,invalid,
  migration_persists_legacy_keys:true,
  original_raw_capture_bytes_rewritten:0,
  historical_trade_decisions_recomputed:0,
  BUY_authorized:0
 };
 return out;
}
