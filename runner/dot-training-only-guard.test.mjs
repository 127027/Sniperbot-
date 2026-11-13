import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDotTrainingReport} from './dot-training-only-guard.mjs';
const root='../research/historical/TRAINING_ONLY_20261112/';
const roles=['news_discovery','social_acceleration','onchain_liquidity','contract_security','opportunity_qa'];
const read=(role=roles[0])=>JSON.parse(readFileSync(new URL(root+role+'.json',import.meta.url),'utf8'));
test('all five initial training-only records are valid, no bot handoff or execution',()=>{
 for(const role of roles){const d=read(role); assert.equal(validateDotTrainingReport(d),d);
 assert.equal(d.bot_handoff,'PAUSED');assert.equal(d.orders_sent,0);
 assert.equal(d.paper_only,true);assert.equal(d.actionable,false);}
});
test('cannot generate a BUY/SELL order, even inside nested hypothetical decision',()=>{
 const a=read();a.hypothetical_decisions=[{virtual_day_utc:'2024-10-10',
  decision:'PAPER_BUY_HYPOTHESIS',paper_only:true,actionable:false,
  evidence_grade:'PROVISIONAL_ONLY',quote_usdc:null}];
 assert.equal(validateDotTrainingReport(a),a);
 a.hypothetical_decisions[0].signed_order='not-an-order';
 assert.throws(()=>validateDotTrainingReport(a),/FORBIDDEN_FIELD_signed_order/);
});
test('provisional social post never yields a purported historical trading quote',()=>{
 const a=read();a.hypothetical_decisions=[{virtual_day_utc:'2024-10-10',
  decision:'PAPER_BUY_HYPOTHESIS',paper_only:true,actionable:false,
  evidence_grade:'PROVISIONAL_ONLY',quote_usdc:10}];
 assert.throws(()=>validateDotTrainingReport(a),/QUOTE_CANNOT_BE_CLAIMED/);
});
test('hindsight outside 61-day period is rejected',()=>{
 const a=read();a.hypothetical_decisions=[{virtual_day_utc:'2025-01-17',
  decision:'WATCH',paper_only:true,actionable:false}];
 assert.throws(()=>validateDotTrainingReport(a),/OUTSIDE_HISTORICAL_WINDOW/);
});
test('non-zero signals or bot output and activated execution are never allowed',()=>{
 const a=read();a.orders_sent=1;assert.throws(()=>validateDotTrainingReport(a),/TRADE_HANDOFF_NOT_PAUSED/);
 const b=read();b.bot_handoff='ACTIVE';assert.throws(()=>validateDotTrainingReport(b),/TRADE_HANDOFF_NOT_PAUSED/);
 const c=read();c.trade_execution=true;assert.throws(()=>validateDotTrainingReport(c),/TRADE_HANDOFF_NOT_PAUSED/);
 const d=read();d.signals=[];assert.throws(()=>validateDotTrainingReport(d),/FORBIDDEN_FIELD_signals/);
});
