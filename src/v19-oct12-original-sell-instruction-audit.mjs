// R29 OCT12: original onchain SELL-INSTRUCTION research of exact four
// SHA-pinned Solana v1 transaction bytes. A verified third-party pool sale
// does NOT authenticate original GPT-at-tick availability, user 50-USDC
// bidirectional route, honeypot protection or future trade eligibility.
import {createHash} from 'node:crypto';
import {R29_PINNED_FOUR_OCT12_TRANSACTION_SOURCE_DIGESTS as pins,
 analyzePinnedOriginalPoolOwnerBalanceDeltas}
 from './v19-oct12-verified-pool-token-account-deltas.mjs';

const SPL_TOKEN_2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const POOL_SELL_PROGRAM='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const sha=raw=>createHash('sha256').update(raw,'utf8').digest('hex');
const at=keys=>keys.map(x=>typeof x==='string'?x:x?.pubkey);
const isInt=x=>typeof x==='string'&&/^(0|[1-9]\d*)$/.test(x);

export function auditPinnedOriginalThirdPartySellInstruction({sourceRaw,index}={}){
 const pin=pins[index];
 if(!pin||typeof sourceRaw!=='string'||sha(sourceRaw)!==pin.sha256)
  throw Error('ORIGINAL_THIRD_PARTY_SELL_SOURCE_SHA_MISMATCH');
 const balances=analyzePinnedOriginalPoolOwnerBalanceDeltas({
  sourceRaw,index,sourceRunId:'45135625789'});
 const transaction=JSON.parse(sourceRaw)?.result;
 const meta=transaction?.meta;
 const keys=at(transaction.transaction.message.accountKeys);
 const movements=balances.pool_owned_token_delta_rows;
 if(transaction.version!==1||meta.err!==null||movements.length!==1
  ||movements[0].token_account_movement_direction!=='INCOMING_MINT_TOKENS'
  ||balances.observed_token_in_and_native_sol_out_pattern!==true
  ||!Array.isArray(meta.innerInstructions)
  ||!Array.isArray(meta.logMessages))
  throw Error('PINNED_TRANSACTION_NO_MATCHING_MINT_IN_NATIVE_SOL_OUT');
 // A sell label in logs alone is not an onchain SELL. Corroborate
 // protocol program executed, token-2022 checked transfer into the
 // exact pool-owned token account and matching original account delta.
 const labels=meta.logMessages.filter(x=>
  /^Program log: Instruction: SellV[23]$/.test(x));
 const programSuccess=meta.logMessages.some(x=>
  x==='Program '+POOL_SELL_PROGRAM+' success');
 const hasProgram=meta.innerInstructions.some(item=>
  Array.isArray(item.instructions)&&item.instructions.some(i=>
   i.programId===POOL_SELL_PROGRAM));
 const transfers=meta.innerInstructions.flatMap(item=>
  Array.isArray(item.instructions)?item.instructions:[]).filter(i=>
  i?.program==='spl-token'
   &&i?.programId===SPL_TOKEN_2022
   &&i?.parsed?.type==='transferChecked'
   &&i.parsed.info?.mint===balances.mint
   &&i.parsed.info?.destination===keys[movements[0].account_index]
   &&i.parsed.info?.source!==i.parsed.info?.destination
   &&i.parsed.info?.source!==balances.pool
   &&isInt(i.parsed.info?.tokenAmount?.amount)
   &&i.parsed.info.tokenAmount.amount
     ===movements[0].absolute_delta_raw_mint_tokens
   &&i.parsed.info.tokenAmount.decimals===movements[0].decimals);
 if(labels.length<1||!programSuccess||!hasProgram||transfers.length!==1)
  throw Error('MISSING_OR_UNCORRELATED_ORIGINAL_SELLV2_V3_TOKEN_2022_TRANSFER');
 const t=transfers[0].parsed.info;
 return {schema:1,kind:'R29_V19_PINNED_ORIGINAL_OCT12_THIRD_PARTY_SELL_INSTRUCTION',
  source_run_id:'45135625789',source_raw_file:pin.file,
  source_sha256:pin.sha256,original_signature:balances.original_transaction_signature,
  slot:balances.slot,block_time_utc:balances.rpc_reported_block_time_utc,
  coin:balances.coin_label,pool:balances.pool,mint:balances.mint,
  original_token_program:'SPL_TOKEN_2022',token_program_address:SPL_TOKEN_2022,
  sell_program_address:POOL_SELL_PROGRAM,
  observed_sell_instruction_types:[...new Set(labels.map(x=>x.split('Sell')[1]))]
   .map(x=>'Sell'+x),
  sell_program_executed_successfully_in_transaction:true,
  signer_independent_from_pool:t.authority!==balances.pool,
  third_party_transfer_source:t.source,
  third_party_transfer_destination_pool_token_account:t.destination,
  transfer_checked_exact_mint_and_pool_delta_matched:true,
  raw_mint_token_units_in:t.tokenAmount.amount,
  token_decimals:t.tokenAmount.decimals,
  pool_native_sol_decreased_lamports:
    (-BigInt(balances.observed_pool_native_sol_signed_delta_lamports)).toString(),
  observed_original_sell_pattern:true,
  actual_original_third_party_sell_transaction_correlated:true,
  source_queried_after_historical_event:true,
  original_gpt_at_scan_received_this_transaction_verified:false,
  valid_50_usdc_buy_at_scanner_timestamp_verified:false,
  independent_bidirectional_50usdc_sell_route_verified:false,
  original_mint_authorities_transfer_hook_and_fees_verified:false,
  independent_quote_and_provider_issuer_authenticated:false,
  historical_gpt_order_or_windows_fill_verified:false,
  original_D3_05_issuer_and_sellability_acceptance_pass:false,
  original_QA04_release_authorized:false,orders_published:0,
  note:'Original successful onchain third-party SellV2/V3 instructions and Token-2022 transferChecked. This is market activity proof, NOT an authenticated historical 50-USDC buyer or current bot exit certification.'};
}
