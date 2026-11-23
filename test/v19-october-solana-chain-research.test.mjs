import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
 R29_OCT12_CHAIN_RESEARCH_TARGETS as targets,
 validateOct12ChainResearchTargets,makeSolanaChainHistoryRpc,
 makeSolanaChainTransactionRpc,auditSolanaRpcEnvelope,
 auditSolanaPoolSignatureHistory,auditSolanaChainTransactionDetail
} from '../src/v19-october-solana-chain-research.mjs';

const target=targets[0];
const sig=a=>'3'.repeat(80)+String(a).repeat(8);
const raw=(r,v)=>JSON.stringify({jsonrpc:'2.0',id:r.id,result:v});
const receipt=(request,value,status=200)=>{const raw_text=raw(request,value);
 return {endpoint:'https://api.mainnet.solana.com',http_method:'POST',
  json_rpc_request:request,http_status:status,
  captured_at_utc:'2026-11-23T08:52:00.000Z',
  raw_text,raw_sha256:createHash('sha256').update(raw_text).digest('hex')};};
const hist=(entries,idx=0,before=null)=>{
 const request=makeSolanaChainHistoryRpc({target,index:idx,before});
 return receipt(request,entries);
};
const entry=(a,blockTime,slot)=>({
 signature:sig(a),slot,blockTime,err:null,confirmationStatus:'finalized'
});
test('only original exact two public pool/mint/scan targets are allowed',()=>{
 assert.equal(validateOct12ChainResearchTargets(targets).length,2);
 assert.throws(()=>validateOct12ChainResearchTargets([
  {...target,pool:'4'.repeat(42)},targets[1]]),/TARGET_MISMATCH/);
 assert.throws(()=>makeSolanaChainHistoryRpc({
  target:{...target,pool:'4'.repeat(42)},index:0}),/UNAUTHORIZED/);
 assert.throws(()=>makeSolanaChainHistoryRpc({target,index:0,before:sig('8')}),
  /UNAUTHORIZED/);
});
test('public RPC receipt is original byte-hashed and request-bound',()=>{
 const request=makeSolanaChainHistoryRpc({target});
 const a=receipt(request,[]);
 assert.equal(auditSolanaRpcEnvelope({request,receipt:a}).kind,'RPC_OK');
 assert.throws(()=>auditSolanaRpcEnvelope({request,receipt:{
  ...a,raw_text:'{}'}}),/INVALID_SOLANA_ORIGINAL_RPC_RECEIPT/);
 assert.throws(()=>auditSolanaRpcEnvelope({request,receipt:{
  ...a,captured_at_utc:'2026-10-12T02:00:00.000Z'}}),/INVALID_SOLANA_ORIGINAL_RPC_RECEIPT/);
 assert.throws(()=>auditSolanaRpcEnvelope({request,receipt:{
  ...a,endpoint:'https://evil.example.com'}}),/INVALID_SOLANA_ORIGINAL_RPC_RECEIPT/);
});
test('onchain signature with blockTime before scan is a candidate but not a BUY/sellability proof',()=>{
 const at=Date.parse('2026-10-12T01:59:10.000Z')/1000;
 const rp=hist([entry('5',at,300_000),entry('6',at-15,299_999)]);
 const x=auditSolanaPoolSignatureHistory({target,pages:[rp]});
 assert.equal(x.candidate_successful_chain_signatures_until_scan.length,2);
 assert.equal(x.suggested_detail_signatures.length,2);
 assert.equal(x.history_complete_for_whole_window,false);
 assert.equal(x.signature_history_boundary_status,'NO_COMPLETE_HISTORY_PROOF');
 assert.equal(x.independent_historical_50_usdc_slippage_quote_verified,false);
 assert.equal(x.chain_sellability_proven,false);
 assert.equal(x.orders_authorized,0);
});
test('past chain blockTime does not admit transactions after the virtual scan',()=>{
 const at=Date.parse('2026-10-12T02:59:10.000Z')/1000;
 const old=Date.parse('2026-10-12T01:59:10.000Z')/1000;
 const x=auditSolanaPoolSignatureHistory({
  target,pages:[hist([entry('5',at,300002),entry('6',old,300001)])]});
 assert.equal(x.all_target_window_reported_signatures.length,2);
 assert.equal(x.suggested_detail_signatures.length,1);
 assert.equal(x.suggested_detail_signatures[0],sig('6'));
});
test('HTTP 429 and RPC method errors preserve source gap not zero real historic activity',()=>{
 const request=makeSolanaChainHistoryRpc({target});
 const a=receipt(request,[],429);
 const x=auditSolanaPoolSignatureHistory({target,pages:[a]});
 assert.equal(x.signature_history_boundary_status,'RPC_RESPONSE_GAP_OR_INVALID');
 assert.equal(x.history_complete_for_whole_window,false);
 assert.equal(x.no_signatures_means_no_swaps,false);
 const err={jsonrpc:'2.0',id:1,error:{code:-32005,message:'Rate limited'}};
 const raw_text=JSON.stringify(err),sha=createHash('sha256').update(raw_text).digest('hex');
 const e=auditSolanaRpcEnvelope({request,receipt:{...a,http_status:200,
  raw_text,raw_sha256:sha}});
 assert.equal(e.kind,'RPC_METHOD_ERROR_DATA_GAP');
});
test('a successful onchain tx can show historical token-account balance delta but never 50USDC market execution',()=>{
 const transactionRequest=makeSolanaChainTransactionRpc({target,signature:sig('7')});
 const result={slot:300000,
  blockTime:Date.parse('2026-10-12T01:59:10.000Z')/1000,
  transaction:{signatures:[sig('7')],message:{
   accountKeys:[{pubkey:'5'.repeat(42)},{pubkey:target.pool}]}},
  meta:{err:null,preTokenBalances:[{accountIndex:0,mint:target.mint,
    uiTokenAmount:{amount:'10000',decimals:6}}],
   postTokenBalances:[{accountIndex:0,mint:target.mint,
    uiTokenAmount:{amount:'8000',decimals:6}}]}};
 const x=auditSolanaChainTransactionDetail({
  target,signature:sig('7'),receipt:receipt(transactionRequest,result)});
 assert.equal(x.status,'FINALIZED_ONCHAIN_POOL_REFERENCED_TRANSACTION_METADATA');
 assert.equal(x.historical_onchain_tx_at_or_before_scan_verified,true);
 assert.equal(x.mint_balance_changes_observed,1);
 assert.equal(x.token_balance_change_rows[0].token_amount_direction,'DECREASE');
 assert.equal(x.original_historical_pool_reserves_verified,false);
 assert.equal(x.independent_historical_buy_sell_quote_verified,false);
 assert.equal(x.sell_route_sellability_proven,false);
 assert.equal(x.trade_authorized,false);
});
test('future tx, missing pool account or null response cannot create false positive',()=>{
 const request=makeSolanaChainTransactionRpc({target,signature:sig('7')});
 const future={slot:300000,blockTime:Date.parse('2026-10-12T02:01:00.000Z')/1000,
  transaction:{signatures:[sig('7')],message:{accountKeys:[{pubkey:target.pool}]}},
  meta:{err:null,preTokenBalances:[],postTokenBalances:[]}};
 const a=auditSolanaChainTransactionDetail({target,signature:sig('7'),
  receipt:receipt(request,future)});
 assert.equal(a.historical_onchain_tx_at_or_before_scan_verified,false);
 const b=auditSolanaChainTransactionDetail({target,signature:sig('7'),
  receipt:receipt(request,{...future,blockTime:future.blockTime-120,
   transaction:{signatures:[sig('7')],message:{accountKeys:[{pubkey:'5'.repeat(42)}]}}})});
 assert.equal(b.historical_onchain_tx_at_or_before_scan_verified,false);
 const c=auditSolanaChainTransactionDetail({target,signature:sig('7'),
  receipt:receipt(request,null)});
 assert.equal(c.status,'RPC_RETURNED_NULL_TRANSACTION_DATA_GAP');
});

test('bounded 1000-signature pages preserve the precise before cursor and never query orders',()=>{
 const first=makeSolanaChainHistoryRpc({target,index:0});
 assert.equal(first.method,'getSignaturesForAddress');
 assert.equal(first.params[1].limit,1000);
 assert.equal(first.params[1].commitment,'finalized');
 const second=makeSolanaChainHistoryRpc({target,index:9,before:sig('5')});
 assert.equal(second.params[1].before,sig('5'));
 assert.equal(second.params[1].limit,1000);
 assert.throws(()=>makeSolanaChainHistoryRpc({target,index:10,before:sig('5')}),
  /UNAUTHORIZED/);
 const trans=makeSolanaChainTransactionRpc({target,signature:sig('6')});
 assert.equal(trans.method,'getTransaction');
 assert.equal(trans.params[1].maxSupportedTransactionVersion,1);
 assert.equal(trans.params[1].commitment,'finalized');
});

test('real Oct23 2026 Solana public node -32015 needs transaction V1, not fabricated transaction failure',()=>{
 const trans=makeSolanaChainTransactionRpc({target,signature:sig('5')});
 assert.equal(trans.params[1].maxSupportedTransactionVersion,1);
 const response={jsonrpc:'2.0',id:1,error:{code:-32015,message:
  'Transaction version (1) is not supported by the requesting client.'}};
 const raw_text=JSON.stringify(response);
 const r=receipt(trans,null);
 const oldVersionError=auditSolanaRpcEnvelope({request:trans,receipt:{
  ...r,raw_text,raw_sha256:createHash('sha256').update(raw_text).digest('hex')}});
 assert.equal(oldVersionError.kind,'RPC_METHOD_ERROR_DATA_GAP');
 assert.equal(oldVersionError.error_code,-32015);
});
