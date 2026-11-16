import test from 'node:test';
import assert from 'node:assert/strict';
import {audit60DayEvidence,historicalHypeReferenceIsSafe} from './strict-60day-backtest-gate.mjs';

const HEAD=['day_utc','historic_launch_record_count','historic_launch_source_sha256',
'minute_asof_feature_rows_verified','minute_feature_sha256',
'minute_asof_candidate_occurrences','recorded_full_day_swaps_for_neutral_group',
'independent_contract_and_sellability_proved','historical_GPT_model_trades_proven',
'historical_GPT_paper_PNL_test_USDC','coverage_class'];
const date=i=>new Date(Date.UTC(2026,8,18+i)).toISOString().slice(0,10);
const csv=({launch=49,minute=43,swaps=1}={})=>
 HEAD.join(',')+'\n'+Array.from({length:60},(_,i)=>[
 date(i),i<launch?'100':'',i<launch?'a'.repeat(64):'',
 i>=6&&i<6+minute?'200':'',i>=6&&i<6+minute?'b'.repeat(64):'',
 '',i===27&&swaps?'48_mints_28112_events':'',
 'false','0','','HISTORICAL_SOURCE_GAP'
].join(',')).join('\n');

test('reports 49 launch, 43 minute and 1 DEX-swap day without creating GPT PnL',()=>{
 const x=audit60DayEvidence(csv());
 assert.deepEqual([x.covered_days.launch,x.covered_days.minute,x.covered_days.full_dex_swaps],[49,43,1]);
 assert.equal(x.genuine_gpt_memecoin_dex_backtest_complete,false);
 assert.equal(x.inferred_gpt_dex_pnl_test_usdc,null);
 assert.equal(x.covered_days.archived_gpt_decisions,0);
 assert.equal(x.blockers.find(x=>x.type==='minute').count,17);
});
test('does not reinterpret historical data gaps as deliberate GPT no-trade',()=>{
 const x=audit60DayEvidence(csv({launch:0,minute:0,swaps:0}));
 assert.equal(x.covered_days.minute,0);
 assert.equal(x.covered_days.full_dex_swaps,0);
 assert.equal(x.covered_days.costed_gpt_paper_fills,0);
});
test('even a full price-input matrix is not a GPT DEX-execution backtest',()=>{
 const x=audit60DayEvidence(csv({launch:60,minute:54}));
 assert.equal(x.genuine_gpt_memecoin_dex_backtest_complete,false);
});
test('detects missing, duplicate or malformed day rows',()=>{
 const s=csv();
 assert.throws(()=>audit60DayEvidence(s.replace(date(1),date(0))),/DUPLICATE_OR_EXTRA_DATE/);
 assert.throws(()=>audit60DayEvidence(s.replace('day_utc','day')), /MISSING_MATRIX_COLUMN/);
 assert.throws(()=>audit60DayEvidence(s.split('\n').slice(0,-1).join('\n')),/MISSING_DAY_ROW/);
});
test('quarantines historical hype winners from GPT as-of decision features',()=>{
 const safe={reference_only:true,may_be_used_as_asof_buy_signal:false,
   source_sha256:'a'.repeat(64),historical_cases:[]};
 assert.equal(historicalHypeReferenceIsSafe(safe),true);
 assert.throws(()=>historicalHypeReferenceIsSafe({...safe,may_be_used_as_asof_buy_signal:true}),/POSTHOC_HYPE_DATA/);
});
