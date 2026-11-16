import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyRetrospectiveGptScan} from './strict-asof-gpt-scan.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const M='So11111111111111111111111111111111111111112';
const C={chain:'solana',token_address:M,pool_address:'Pool111',observed_at_utc:'2026-10-15T12:00:00Z',selection_method:'CHRONOLOGICAL_NEUTRAL'};
const make=(decisions=[{action:'NO_TRADE',reason:'Unzureichende Daten'}])=>{
 const response=JSON.stringify(decisions);
 return {asof_utc:'2026-10-15T13:00:00Z',origin:'GPT_AUTHORED_RETROSPECTIVE_REPLAY',
 source_sha256:'b'.repeat(64),source_kind:'ASOF_NEUTRAL_MINUTE',
 future_winner_reference_used:false,future_outcomes_used:false,candidates:[C],
 gpt_run_utc:'2026-11-16T21:00:00Z',gpt_response_json:response,
 gpt_response_sha256:sha(response),decisions};
};
test('retrospective GPT NO_TRADE is no historical fill or PnL',()=>{
 const r=verifyRetrospectiveGptScan(make());
 assert.equal(r.actual_buy_sell_fills,0);
 assert.equal(r.portfolio_pnl_test_usdc,null);
 assert.equal(r.historical_model_run_at_asof_proven,false);
 assert.equal(r.research_decisions[0].status,'GPT_RESEARCH_NO_ORDER');
});
test('no executable historical BUY without six required independent proofs',()=>{
 const d={action:'BUY',chain:'solana',token_address:M,pool_address:'Pool111',stake_test_usdc:500,evidence:[]};
 const r=verifyRetrospectiveGptScan(make([d]));
 assert.equal(r.research_decisions[0].status,'BLOCKED_MISSING_HISTORICAL_EXECUTION_PROOFS');
 assert.equal(r.research_decisions[0].missing_evidence.length,6);
});
test('blocks future-event, known-winner and hindsight-selected coin leaks',()=>{
 const a=make();a.future_winner_reference_used=true;
 assert.throws(()=>verifyRetrospectiveGptScan(a),/POSTHOC_WINNER/);
 const b=make();b.candidates[0]={...C,observed_at_utc:'2026-10-15T13:05:00Z'};
 assert.throws(()=>verifyRetrospectiveGptScan(b),/FUTURE_CANDIDATE/);
 const c=make();c.candidates[0]={...C,selection_method:'LOOKBACK_TOP_WINNERS'};
 assert.throws(()=>verifyRetrospectiveGptScan(c),/RETROSPECTIVE_WINNER/);
});
test('GPT strategy provenance is not substitutable with an executor',()=>{
 const a=make();a.gpt_response_sha256='f'.repeat(64);
 assert.throws(()=>verifyRetrospectiveGptScan(a),/HASH_MISMATCH/);
 const b=make();b.origin='BOT_AUTONOMOUS';
 assert.throws(()=>verifyRetrospectiveGptScan(b),/GPT_ONLY/);
});
test('stake must remain inside 50–5000 TEST-USDC, before free-capital checks',()=>{
 const d={action:'BUY',chain:'solana',token_address:M,pool_address:'Pool111',stake_test_usdc:5001,evidence:[]};
 assert.throws(()=>verifyRetrospectiveGptScan(make([d])),/STAKE_OUTSIDE/);
});
