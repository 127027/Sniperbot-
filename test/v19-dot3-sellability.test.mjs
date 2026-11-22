import test from 'node:test';
import assert from 'node:assert/strict';
import {assessChainSellability} from '../src/v19-dot3-sellability.mjs';
import {assessDot3RiskStatus} from '../src/v19-dot3-risk-status.mjs';
const at='2026-11-22T10:00:00.000Z';
const base={chain:'base',pool:'0x'+'b'.repeat(40),
 contract:'0x'+'a'.repeat(40)};
const sol={chain:'solana',
 pool:'11111111111111111111111111111111',
 contract:'So11111111111111111111111111111111111111112'};
const proof=(coin,fields)=>({chain:coin.chain,pool:coin.pool,contract:coin.contract,
 captured_at_utc:'2026-11-22T09:59:45.000Z',
 available_at_utc:'2026-11-22T09:59:50.000Z',...fields});
const evm=proof(base,{transfer_simulation_success:true,buy_route_simulation_success:true,
 sell_route_simulation_success:true,owner_privileges_checked:true,
 blacklist_checked:true,sell_tax_bps:100});
const spl=proof(sol,{mint_authority_inspected:true,freeze_authority_inspected:true,
 token_program_inspected:true,sell_route_simulation_success:true,
 transaction_dry_run_success:true});
test('5 EVM networks share the same exact-pool sellability research requirements',()=>{
 for(const chain of ['ethereum','base','bsc','cronos','robinhood']){
  const coin={...base,chain};
  const out=assessChainSellability({coin,evidence:proof(coin,evm),
   asOfUtc:at,mode:'LIVE_PAPER'});
  assert.equal(out.chain_family,'EVM');
  assert.equal(out.proof_of_live_sellability,false);
  assert.equal(out.live_paper_buy_authorized,false);
  assert.equal(out.status,'DATA_GAP');
 }
});
test('complete synthetic EVM proof can pass MODEL only, never genuine PAPER',()=>{
 const a=assessChainSellability({coin:base,evidence:evm,
  asOfUtc:at,mode:'SYNTHETIC_REGRESSION_ONLY'});
 assert.equal(a.status,'SYNTHETIC_POSSIBLE_SELLABILITY');
 assert.equal(a.complete_regression_fixture,true);
 assert.equal(a.real_onchain_transaction_executed,false);
});
test('honeypot sell failure, blacklist and mutable tax remain visible WATCH signals',()=>{
 const a=assessChainSellability({coin:base,asOfUtc:at,
  evidence:{...evm,sell_route_simulation_success:false,blacklist_detected:true,
   owner_can_change_tax:true,sell_tax_bps:4000}});
 assert.equal(a.status,'WATCH');
 assert.ok(a.warnings.includes('REPORTED_SELL_ROUTE_FAILURE'));
 assert.ok(a.warnings.includes('REPORTED_BLACKLIST_RISK'));
 assert.ok(a.warnings.includes('REPORTED_MUTABLE_TAX_RISK'));
 assert.equal(a.live_paper_buy_authorized,false);
});
test('Solana token authorities and Token-2022 transfer-hook risks are checked separately',()=>{
 const a=assessChainSellability({coin:sol,asOfUtc:at,
  evidence:spl,mode:'SYNTHETIC_REGRESSION_ONLY'});
 assert.equal(a.status,'SYNTHETIC_POSSIBLE_SELLABILITY');
 const risky=assessChainSellability({coin:sol,asOfUtc:at,
  evidence:{...spl,freeze_authority_present:true,
   transfer_hook_present:true,sell_route_simulation_success:false}});
 assert.equal(risky.status,'WATCH');
 assert.ok(risky.warnings.includes('REPORTED_ACTIVE_FREEZE_AUTHORITY'));
 assert.ok(risky.warnings.includes('REPORTED_TRANSFER_HOOK_RISK'));
});
test('missing, stale, and post-event sellability observations never become trade evidence',()=>{
 for(const evidence of [null,{...evm,
  captured_at_utc:'2026-11-22T09:40:00.000Z'},
  {...evm,available_at_utc:'2026-11-22T10:20:00.000Z'},
  {...evm,source_class:'POST_EVENT_ORACLE'}]){
  const a=assessChainSellability({coin:base,evidence,asOfUtc:at});
  assert.equal(a.proof_of_live_sellability,false);
  assert.equal(a.live_paper_buy_authorized,false);
  assert.ok(a.missing_fields.length>0);
 }
});
test('Dot3 common LIVE and HISTORICAL status sees same sellability warning',()=>{
 const candidate={...base,captured_at_utc:'2026-11-22T09:59:45.000Z',
  independent_price_liquidity_ready:true,
  primary_quote_usd:1,second_source_price_usd:1.01,
  primary_liquidity_usd:20000,second_source_liquidity_usd:22000,
  price_disagreement_pct:.99,
  sellability_research_evidence:{...evm,blacklist_detected:true}};
 for(const mode of ['LIVE_PAPER','HISTORICAL_ASOF']){
  const a=assessDot3RiskStatus({candidate,mode,asOfUtc:at});
  assert.equal(a.status,'WATCH');
  assert.equal(a.reason,'INDICATIVE_CHAIN_SELLABILITY_WARNING');
  assert.equal(a.trade_authorized,false);
 }
});

test('Dot3 sellability as-of proof refuses locale-dependent timestamps',()=>{
 for(const value of ['2026-11-22T10:00:00','2026-11-22T10:00:00+00:00']){
  assert.throws(()=>assessChainSellability({coin:base,evidence:evm,asOfUtc:value}),
   /INVALID_DOT3_SELLABILITY_INPUT/);
 }
 const x=assessChainSellability({coin:base,asOfUtc:at,
  evidence:{...evm,captured_at_utc:'2026-11-22T09:59:45'}});
 assert.ok(x.missing_fields.includes('CONTEMPORANEOUS_SOURCE_TIME'));
 assert.equal(x.live_paper_buy_authorized,false);
});
