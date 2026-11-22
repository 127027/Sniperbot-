import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,settlePaper,Reject} from '../src/core.mjs';
import {planConvergentExitIntents,auditSingleExitReceipt} from '../src/v19-paper-exit-convergence.mjs';

const t=Date.parse('2026-11-22T11:00:00Z');
const now='2026-11-22T11:01:00.000Z',pool='0x'+'b'.repeat(40),
 coin={chain:'base',pool,contract:'0x'+'a'.repeat(40),symbol:'TEST'};
const order=(id,action,at=t,extra={})=>({
 id,mode:'PAPER',action,authority:'dot-4-strategy',
 dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
 reason:'Isolated synthetic simulation only, no genuine client trade',
 created_at:new Date(at).toISOString(),expires_at:new Date(at+120000).toISOString(),
 coin,...(action==='BUY'?{amount_test_usdc:50}:{}),
 quotes:['gecko','dexscreener'].map(provider_id=>({...coin,provider_id,
  price_usdc:action==='BUY'?1:.85,liquidity_usdc:20000,
  observed_at:new Date(at).toISOString()})),...extra});
const bought=()=>settlePaper(order('buy-lot-0001','BUY'),newState(),t+1000);
const quotes=(price)=>['gecko','dex'].map((provider_id,i)=>({
 ...coin,provider_id,source_url:i===0?
  'https://www.geckoterminal.com/base/pools/'+pool:
  'https://dexscreener.com/base/'+pool,
 captured_at_utc:'2026-11-22T11:00:45.000Z',
 provider_quote_asof_utc:'2026-11-22T11:00:40.000Z',
 price_usdc:price*(i===0?1:1.01),liquidity_usdc:20000,
 source_archive_blob_sha:(i===0?'a':'b').repeat(40)}));
const proposal=(origin,price=.85,openingBuyOrderId='buy-lot-0001')=>({
 origin,coin,opening_buy_order_id:openingBuyOrderId,
 observed_at_utc:'2026-11-22T11:00:45.000Z',observations:quotes(price)});

test('STOP and Dot4 concurrently produce ONE stable research intent for the same BUY lot',()=>{
 const state=bought().state;
 const a=planConvergentExitIntents({paperState:state,asOfUtc:now,
  proposals:[proposal('PROTECTIVE_STOP',.85),proposal('DOT4_SELL',.84)]});
 const b=planConvergentExitIntents({paperState:state,asOfUtc:now,
  proposals:[proposal('DOT4_SELL',.84),proposal('PROTECTIVE_STOP',.85)]});
 assert.equal(a.intents.length,1);
 assert.equal(a.duplicate_proposals_collapsed,1);
 assert.equal(a.intents[0].status,'SHADOW_EXIT_CANDIDATE');
 assert.equal(a.intents[0].trigger_reason,'STOP_LOSS');
 assert.equal(a.intents[0].id,b.intents[0].id);
 assert.equal(a.intents[0].worst_case_research_proceeds_test_usdc,
  b.intents[0].worst_case_research_proceeds_test_usdc);
 assert.equal(a.intents[0].trade_authorized,false);
 assert.equal(a.real_paper_fills,0);
});
test('reopened BUY lot cannot be closed by an old STOP proposal',()=>{
 const a=bought();
 const sold=settlePaper(order('sell-lot-0001','SELL',t+2000,
  {exit_position_source_order_id:'buy-lot-0001'}),a.state,t+3000);
 const reopened=settlePaper(order('buy-lot-0002','BUY',t+4000),
  sold.state,t+5000);
 const out=planConvergentExitIntents({paperState:reopened.state,asOfUtc:now,
  proposals:[proposal('PROTECTIVE_STOP',.85,'buy-lot-0001')]});
 assert.equal(out.rejected.length,1);
 assert.equal(out.rejected[0].reason,'STALE_OR_MISMATCHED_BUY_LOT');
 assert.equal(out.real_paper_fills,0);
});
test('no quote, stale quote, or normal HOLD never manufactures a sell',()=>{
 const state=bought().state;
 const hold=planConvergentExitIntents({paperState:state,asOfUtc:now,
  proposals:[proposal('DOT4_SELL',1.01)]});
 assert.equal(hold.intents[0].status,'SHADOW_HOLD');
 const p=proposal('PROTECTIVE_STOP',.85);
 p.observations[0].captured_at_utc='2026-11-22T10:55:00.000Z';
 const stale=planConvergentExitIntents({paperState:state,asOfUtc:now,
  proposals:[p]});
 assert.equal(stale.intents[0].status,'EXIT_RECHECK_REQUIRED');
 assert.equal(stale.real_orders_published,0);
});
test('actual model receipt appears once only after settlePaper and correct generation',()=>{
 const a=bought(),proposal1=planConvergentExitIntents({
  paperState:a.state,asOfUtc:now,proposals:[proposal('DOT4_SELL',.85)]});
 assert.equal(proposal1.intents[0].client_receipt_verified,false);
 const sell=order('sell-lot-0002','SELL',t+2000,
   {exit_position_source_order_id:'buy-lot-0001'});
 const b=settlePaper(sell,a.state,t+3000);
 const checked=auditSingleExitReceipt({stateBefore:a.state,stateAfter:b.state,
   openingBuyOrderId:'buy-lot-0001',sellOrderId:'sell-lot-0002',coin});
 assert.equal(checked.status,'MODEL_EXIT_RECEIPT_CONSISTENT');
 assert.equal(checked.independently_authenticated_client_receipt,false);
 assert.throws(()=>settlePaper(order('sell-lot-0003','SELL',t+2000,
  {exit_position_source_order_id:'buy-lot-0001'}),b.state,t+3000),Reject);
 assert.equal(b.state.trade_history.filter(x=>x.action==='SELL').length,1);
 const fake=auditSingleExitReceipt({stateBefore:a.state,stateAfter:a.state,
   openingBuyOrderId:'buy-lot-0001',sellOrderId:'sell-lot-0002',coin});
 assert.equal(fake.model_receipt_consistent,false);
});
test('invalid source, future proposal, no open position are never eligible',()=>{
 const a=bought();
 const p=proposal('DOT4_SELL',.85);p.observed_at_utc='2026-11-22T12:00:00.000Z';
 const no=planConvergentExitIntents({paperState:a.state,asOfUtc:now,
  proposals:[p,{...proposal('UNTRUSTED',.85)}]});
 assert.equal(no.intents.length,0);
 assert.equal(no.rejected.length,2);
 assert.equal(no.exit_candidates,0);
});
