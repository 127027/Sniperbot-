import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newState,settlePaper,rejectPaper,marketKey,DEFAULT_POLICY} from '../src/core.mjs';
import {inspectReadOnlyLocalPaperSnapshot}
 from '../src/v19-local-client-readonly-proof.mjs';
const t=Date.parse('2026-11-22T20:20:00.000Z');
const at=n=>new Date(t+n*1000).toISOString();
const coin={chain:'base',pool:'0x'+'b'.repeat(40),
 contract:'0x'+'a'.repeat(40),symbol:'TEST'};
function order(id,action,sec,amount=50){
 return {id,mode:'PAPER',action,authority:'dot-4-strategy',
  dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
  reason:'Only synthetic in-process regression proving ledger integrity',
  coin,created_at:at(sec),expires_at:at(sec+120),
  ...(action==='BUY'?{amount_test_usdc:amount}:
   {exit_position_source_order_id:'proof-buy-lot01'}),
  quotes:['gecko','dex'].map((provider_id,i)=>({...coin,provider_id,
   observed_at:at(sec),price_usdc:1+.001*i,liquidity_usdc:20000}))};
}
function check(s,sec=180){
 return inspectReadOnlyLocalPaperSnapshot({
  rawStateJson:JSON.stringify(s),asOfUtc:at(sec),
  originalStartingTestUsdc:5000,defaultStakeTestUsdc:50
 });
}
test('SYS-09: untouched new 5000 TEST-USDC client file is valid without fake fills',()=>{
 const state=newState();
 const raw=JSON.stringify(state);
 const a=inspectReadOnlyLocalPaperSnapshot({
  rawStateJson:raw,asOfUtc:at(60)});
 assert.equal(a.status,'LOCAL_PAPER_STATE_ACCOUNTING_CONSISTENT');
 assert.equal(a.observed_cash_test_usdc,5000);
 assert.equal(a.modeled_filled_receipts,0);
 assert.equal(a.open_positions_count,0);
 assert.equal(a.actual_client_file_was_read_by_this_function,false);
 assert.equal(a.independent_windows_origin_attested,false);
 assert.equal(a.orders_written,0);
 assert.equal(a.snapshot_sha256.length,64);
 assert.equal(JSON.stringify(state),raw);
});
test('D5-02: actual in-process model BUY and SELL reconcile cash, lots and receipt sequence',()=>{
 const before=newState();
 const one=settlePaper(order('proof-buy-lot01','BUY',0),before,t+1000);
 assert.equal(check(one.state).status,'LOCAL_PAPER_STATE_ACCOUNTING_CONSISTENT');
 assert.equal(check(one.state).observed_cash_test_usdc,4950);
 assert.equal(check(one.state).open_positions_count,1);
 const two=settlePaper(order('proof-sell-lot02','SELL',120),one.state,t+121000);
 const result=check(two.state);
 assert.equal(result.status,'LOCAL_PAPER_STATE_ACCOUNTING_CONSISTENT',JSON.stringify(result.blockers));
 assert.equal(result.modeled_filled_receipts,2);
 assert.equal(result.trade_history_events,2);
 assert.equal(result.open_positions_count,0);
 assert.equal(result.expected_cash_test_usdc,result.observed_cash_test_usdc);
 assert.equal(result.blockers.length,0);
});
test('D4-09: a rejected order has no fill, cannot inflate profit or change cash',()=>{
 const before=newState();
 const {state}=rejectPaper({id:'proof-rejected01'},before,
  'DOT3_AUTH_NOT_VERIFIED','Independent chain source absent',t+1000);
 const result=check(state);
 assert.equal(result.status,'LOCAL_PAPER_STATE_ACCOUNTING_CONSISTENT');
 assert.equal(result.rejected_receipts,1);
 assert.equal(result.modelled_fills,undefined);
 assert.equal(result.modeled_filled_receipts,0);
 assert.equal(result.observed_cash_test_usdc,5000);
 assert.equal(result.actual_external_market_performance_verified,false);
});
test('D5-06: tampered cash, filled receipt, lot, duplicate history all fail closed',()=>{
 const a=settlePaper(order('proof-buy-lot01','BUY',0),newState(),t+1000).state;
 const modified=structuredClone(a);modified.cash=5000;
 assert.ok(check(modified).blockers.includes('STATE_CASH_BALANCE_NOT_RECONCILED'));
 const modified2=structuredClone(a);modified2.receipts['proof-buy-lot01'].data.cash_after_test_usdc=5000;
 assert.ok(check(modified2).blockers.includes('RECEIPT_CASH_BALANCE_NOT_RECONCILED'));
 const modified3=structuredClone(a);modified3.positions[marketKey(coin)].quantity=99999;
 assert.ok(check(modified3).blockers.includes('OPEN_POSITION_LOT_DOES_NOT_MATCH_FILLED_BUY'));
 const modified4=structuredClone(a);modified4.trade_history.push(modified4.trade_history[0]);
 assert.ok(check(modified4).blockers.includes('INVALID_OR_DUPLICATED_TRADE_EVENT'));
 const modified5=structuredClone(a);modified5.processed['fake-unknown-id']={status:'PAPER_FILLED'};
 assert.ok(check(modified5).blockers.includes('PROCESSED_AND_RECEIPT_COUNT_MISMATCH'));
});
test('no fabricated production trust: user-supplied file proof is not independent Windows or blockchain attestation',()=>{
 const a=check(newState());
 assert.equal(a.independent_windows_origin_attested,false);
 assert.equal(a.blockchain_settlements_or_transfers_verified,false);
 assert.equal(a.readiness_for_real_live_trading,false);
 assert.equal(a.account_mutated,false);
});
test('CLI source is strictly readFile-only, does not initialize or mutate the paper account',async()=>{
 const code=await readFile('scripts/v19-readonly-windows-paper-proof.mjs','utf8');
 assert.match(code,/readFile\(path,'utf8'\)/);
 assert.doesNotMatch(code,/\bwriteFile\s*\(|\brename\s*\(|\bmkdir\s*\(/);
 assert.doesNotMatch(code,/\bsettlePaper\s*\(|\bpollOnce\s*\(|\bload\s*\(/);
 assert.doesNotMatch(code,/\bfetch\s*\(|\bpublishPaperOrder\s*\(/);
 assert.doesNotMatch(code,/process\.env\.GITHUB_TOKEN/);
});

test('read-only verifier detects altered processed time and trade event market identity',()=>{
 const s=settlePaper(order('proof-buy-lot01','BUY',0),newState(),t+1000).state;
 const a=structuredClone(s);
 a.processed['proof-buy-lot01'].time=at(2);
 assert.ok(check(a).blockers.includes('INCONSISTENT_PROCESSED_RECEIPT'));
 const b=structuredClone(s);
 b.trade_history[0].market_key='base:other-contract:other-pool';
 assert.ok(check(b).blockers.includes('TRADE_EVENT_MARKET_KEY_MISMATCH'));
 const c=structuredClone(s);
 c.positions[marketKey(coin)].entryPrice=99999;
 assert.ok(check(c).blockers.includes('OPEN_POSITION_LOT_DOES_NOT_MATCH_FILLED_BUY'));
});
test('BUY receipts must reconcile fee, quantity and execution price',()=>{
 const s=settlePaper(order('proof-buy-lot01','BUY',0),newState(),t+1000).state;
 const a=structuredClone(s);
 a.receipts['proof-buy-lot01'].data.fee_test_usdc=-0.01;
 assert.ok(check(a).blockers.includes('INVALID_BUY_FINANCIALS'));
 const b=structuredClone(s);
 b.receipts['proof-buy-lot01'].data.fee_test_usdc=5;
 assert.ok(check(b).blockers.includes('INVALID_BUY_FINANCIALS'));
});
test('SELL receipt, trade history PnL and chronological sequence must agree',()=>{
 const bought=settlePaper(order('proof-buy-lot01','BUY',0),newState(),t+1000).state;
 const s=settlePaper(order('proof-sell-lot02','SELL',120),bought,t+121000).state;
 assert.equal(check(s).status,'LOCAL_PAPER_STATE_ACCOUNTING_CONSISTENT');
 const a=structuredClone(s);
 a.trade_history[1].realized_pnl_test_usdc=999;
 assert.ok(check(a).blockers.includes('TRADE_EVENT_PNL_MISMATCH'));
 const b=structuredClone(s);
 b.receipts['proof-sell-lot02'].data.fee_test_usdc=-0.01;
 assert.ok(check(b).blockers.includes('INVALID_SELL_FINANCIALS'));
 const c=structuredClone(s);
 c.receipts['proof-sell-lot02'].data.timestamp=at(0);
 c.trade_history[1].filled_at_utc=at(0);
 c.processed['proof-sell-lot02'].time=at(0);
 assert.ok(check(c).blockers.includes('FILL_SEQUENCE_TIMESTAMP_REVERSED'));
});
