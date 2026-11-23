// R29: exact 4 original 12-Oct Solana transaction V1 RPC response bytes.
// Research-only: confirmed on-chain token-account movement at pool OWNER.
// This is NOT a verified bid/ask route, token sellability, pool liquidity,
// economic profit, a bot BUY/SELL, nor proof of available finality at scan.
import {createHash} from 'node:crypto';
import {R29_OCT12_CHAIN_RESEARCH_TARGETS as targets}
 from './v19-october-solana-chain-research.mjs';
import {asOfMillis} from './v19-asof-evidence.mjs';
import {tokenValid} from './market-evidence.mjs';

const DIGESTS=Object.freeze([
 Object.freeze({scan:3,file:'original-tx-response-1-1.txt',
  sha256:'cf42e5ce3d6b1f3e1eee2886f49f3be6f5a3ad53174849d84a51d29e5a1e7225'}),
 Object.freeze({scan:3,file:'original-tx-response-1-2.txt',
  sha256:'9bd4ba5522972624185f17e6d2a2f7ec37b555b1783cb1bc6416be22802165fd'}),
 Object.freeze({scan:19,file:'original-tx-response-2-1.txt',
  sha256:'7c834fb581d9613186427d102635b3ff06e235f78194af8c2342a65ba3ab0229'}),
 Object.freeze({scan:19,file:'original-tx-response-2-2.txt',
  sha256:'15145afc7e5f9c3c959d9450deb643c281151ec951bb0125bac64aff8f29e903'})
]);
export const R29_PINNED_FOUR_OCT12_TRANSACTION_SOURCE_DIGESTS=DIGESTS;
const sha=raw=>createHash('sha256').update(raw,'utf8').digest('hex');
const amount=entry=>{
 const v=entry?.uiTokenAmount;
 return (v&&typeof v.amount==='string'&&/^(0|[1-9]\d*)$/.test(v.amount)
  &&Number.isInteger(v.decimals)&&v.decimals>=0&&v.decimals<=18)
  ?{raw:BigInt(v.amount),decimals:v.decimals}:null;
};
export function analyzePinnedOriginalPoolOwnerBalanceDeltas({
 sourceRaw,index,sourceRunId='45135625789'
}={}){
 const pin=DIGESTS[index];
 if(!pin||sourceRunId!=='45135625789'
   ||typeof sourceRaw!=='string'||sha(sourceRaw)!==pin.sha256)
  throw Error('NOT_PINNED_ORIGINAL_SOLANA_TX_RAW_RESPONSE');
 const target=targets[pin.scan===3?0:1];
 let envelope;
 try{envelope=JSON.parse(sourceRaw)}
 catch{throw Error('MALFORMED_PINNED_SOLANA_TX_SOURCE_JSON')}
 const tx=envelope?.result;
 if(envelope?.jsonrpc!=='2.0'||envelope?.error!==undefined||!tx
  ||tx.version!==1||tx.meta?.err!==null
  ||!Number.isSafeInteger(tx.slot)||tx.slot<1
  ||!Number.isSafeInteger(tx.blockTime)
  ||tx.blockTime*1000>asOfMillis(target.scan_at_utc)
  ||tx.blockTime*1000<asOfMillis('2026-10-11T19:00:00.000Z')
  ||!Array.isArray(tx.transaction?.signatures)||tx.transaction.signatures.length===0
  ||!Array.isArray(tx.transaction?.message?.accountKeys)
  ||!tx.transaction.message.accountKeys.some(x=>(typeof x==='string'?x:x?.pubkey)===target.pool)
  ||!tokenValid('solana',target.mint)
  ||!Array.isArray(tx.meta?.preTokenBalances)
  ||!Array.isArray(tx.meta?.postTokenBalances))
  throw Error('UNVERIFIED_TRANSACTION_VERSION_TIME_POOL_OR_META');
 const accountMap=new Map();
 for(const side of ['pre','post']){
  for(const e of tx.meta[side+'TokenBalances']){
   if(e?.mint!==target.mint||e?.owner!==target.pool
    ||!Number.isSafeInteger(e.accountIndex)||e.accountIndex<0)continue;
   const v=amount(e);
   if(v===null)throw Error('INVALID_POOL_OWNED_SPL_TOKEN_BALANCE');
   const slot=accountMap.get(e.accountIndex)||{};
   if(slot[side]!==undefined)throw Error('DUPLICATE_POOL_OWNED_SPL_TOKEN_BALANCE');
   slot[side]=v;accountMap.set(e.accountIndex,slot);
  }
 }
 const valid=[];
 for(const [accountIndex,e] of accountMap.entries()){
  if(!e.pre||!e.post||e.pre.decimals!==e.post.decimals)
   continue;
  const delta=e.post.raw-e.pre.raw;
  if(delta===0n)continue;
  valid.push({
   account_index:accountIndex,
   pool_account_owner_address:target.pool,
   token_mint:target.mint,decimals:e.pre.decimals,
   pre_raw_mint_token_balance:e.pre.raw.toString(),
   post_raw_mint_token_balance:e.post.raw.toString(),
   absolute_delta_raw_mint_tokens:(delta<0n?-delta:delta).toString(),
   token_account_movement_direction:delta>0n?'INCOMING_MINT_TOKENS':'OUTGOING_MINT_TOKENS',
   pool_owner_address_on_balance_entry_verified:true,
   executable_buy_sell_quote_verified:false,
   swap_versus_transfer_classification_verified:false
  });
 }
 const scan=asOfMillis(target.scan_at_utc);
 return {schema:1,kind:'R29_V19_ORIGINAL_OCT12_POOL_OWNER_TOKEN_ACCOUNT_DELTA',
  original_rpc_source_run_id:sourceRunId,source_sha256:pin.sha256,
  source_exact_file:pin.file,pool:target.pool,mint:target.mint,
  coin_label:target.coin_label,target_scan:target.scan,
  target_scan_at_utc:target.scan_at_utc,
  original_transaction_signature:tx.transaction.signatures[0],
  slot:tx.slot,
  rpc_reported_block_time_utc:new Date(tx.blockTime*1000).toISOString(),
  seconds_from_reported_block_time_to_scan:(scan-tx.blockTime*1000)/1000,
  proven_pool_owner_mint_token_balance_change_accounts:valid.length,
  pool_owned_token_delta_rows:valid,
  historic_solana_tx_metadata_fetched_today_not_at_october_scan:true,
  availability_to_original_2026_10_12_dot_at_scan_verified:false,
  original_pool_pair_reserves_in_both_assets_verified:false,
  original_token_mint_and_freeze_authorities_verified:false,
  true_50_usdc_bidirectional_quote_and_fee_verified:false,
  actual_buy_sell_route_simulation_success_verified:false,
  original_independent_source_upstream_trust_verified:false,
  dot3_issuer_or_sellability_authorization:false,
  historical_five_dot_gpt_review_receipt_verified:false,
  historical_paper_fill_receipt_verified:false,trade_authorized:false};
}
