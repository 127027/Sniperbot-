import test from 'node:test';
import assert from 'node:assert/strict';
import {
 R29_SCHEMA,R29_TEST_ASSET,initialR29Ledger,projectR29SandboxState,
 applyR29SandboxIntent,validateR29Intent
} from './r29-paper-protocol.mjs';
// The core paper ledger checks the actual system clock, not a mocked future clock.
const at=Date.now()-1000;
const iso=t=>new Date(t).toISOString();
const make=(action='BUY',id='1',extra={})=>({
 schema:R29_SCHEMA,intent_id:'r29_'+id.repeat(32),
 target:'CI_SANDBOX',mode:'ISOLATED_PAPER_TEST',
 asset:R29_TEST_ASSET,action,
 amount_test_usdc:action==='BUY'?'50.00':null,
 created_at_utc:iso(at-2000),expires_at_utc:iso(at+100000),
 reason:'Approved transport-only synthetic test order',...extra
});
test('full ChatGPT GitHub BUY -> signed in-memory paper -> SELL, never touches user account',()=>{
 const initial=initialR29Ledger(),original=JSON.stringify(initial);
 const buy=applyR29SandboxIntent(initial,make(),{now:at});
 assert.equal(buy.receipt.status,'PAPER_FILLED');
 assert.equal(buy.receipt.paper_receipt.wallet_debited,false);
 assert.equal(buy.receipt.actual_windows_bot_connected,false);
 assert.equal(buy.ledger.state.positions.length,1);
 assert.equal(initial.state.positions.length,0);
 assert.equal(JSON.stringify(initial),original);
 const sell=applyR29SandboxIntent(buy.ledger,make('SELL','2'),{now:at+1000});
 assert.equal(sell.receipt.status,'PAPER_FILLED');
 assert.equal(sell.ledger.state.positions.length,0);
 assert.equal(sell.ledger.state.agentOrderReceipts.length,2);
 const s=projectR29SandboxState(sell.ledger);
 assert(s.closed_pnl_test_usdc>0);
 assert(s.cash_balance_test_usdc>5000);
 assert.equal(s.real_wallet_touched,false);
 assert.equal(s.user_paper_modified,false);
 assert.equal(s.completed_intent_count,2);
});
test('replayed command is not repeated or double-charged',()=>{
 const buy=applyR29SandboxIntent(initialR29Ledger(),make(),{now:at});
 const again=applyR29SandboxIntent(buy.ledger,make(),{now:at});
 assert.equal(again.receipt.status,'DUPLICATE_ALREADY_APPLIED');
 assert.equal(again.ledger,buy.ledger);
 assert.equal(again.ledger.state.positions.length,1);
});
test('new command ID with same asset but repeat BUY cannot double-enter',()=>{
 const buy=applyR29SandboxIntent(initialR29Ledger(),make(),{now:at});
 const again=applyR29SandboxIntent(buy.ledger,make('BUY','2'),{now:at});
 assert.equal(again.receipt.status,'BLOCKED');
 assert.equal(again.ledger.state.positions.length,1);
});
test('invalid, expired, wrong-branch target, wrong amount or non-test asset fail closed',()=>{
 for(const corrupt of [
  make('BUY','2',{target:'WINDOWS_SANDBOX'}),
  make('BUY','2',{asset:'DOGE'}),
  make('BUY','2',{amount_test_usdc:'5000.00'}),
  make('BUY','2',{expires_at_utc:iso(at-1000)}),
  make('BUY','2',{created_at_utc:iso(at+120000)}),
  make('BUY','2',{mode:'LIVE'}),
  {...make('BUY','2'),wallet_seed:'DO_NOT_ACCEPT'}
 ]){
  assert.throws(()=>validateR29Intent(corrupt,{now:at,target:'CI_SANDBOX'}));
 }
});
test('two different payloads using same command ID are a conflict',()=>{
 const buy=applyR29SandboxIntent(initialR29Ledger(),make(),{now:at});
 assert.throws(()=>applyR29SandboxIntent(buy.ledger,
  make('BUY','1',{reason:'Modified but same id - must reject!'}),{now:at}),
  /R29_INTENT_REPLAY_CONFLICT/);
});
test('selling before purchase is NOOP not fabricated profit',()=>{
 const result=applyR29SandboxIntent(initialR29Ledger(),make('SELL','b'),{now:at});
 assert.equal(result.receipt.status,'NOOP');
 assert.equal(result.ledger.state.positions.length,0);
 assert.equal(result.ledger.state.closedPnl,0);
});
