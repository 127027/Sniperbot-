import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compareOct12SourceGapBaselineAfterRun}
 from '../src/v19-oct12-oracle-postrun-baseline-comparison.mjs';

const read=async p=>readFile(p,'utf8');
const blob=s=>{
 const b=Buffer.from(s,'utf8');
 return createHash('sha1').update('blob '+b.length+'\\0').update(b).digest('hex');
};
async function build(){
 const [reportText,refText]=await Promise.all([
  read('research/backtests/2026-10-12/report.json'),
  read('research/evaluation/2026-10-12/v19-winner-reference-identity-status.json')]);
 const blindBaseline=JSON.parse(reportText),winnerRegister=JSON.parse(refText);
 return {blindBaseline,winnerRegister,
  blindBaselineBlobSha:blob(reportText),registerBlobSha:blob(refText)};
}
test('65 real reference entries compare strictly AFTER a prior archived source-gap baseline',async()=>{
 const inputs=await build(),before=JSON.stringify(inputs);
 const x=compareOct12SourceGapBaselineAfterRun(inputs);
 assert.equal(x.kind,'R29_V19_OCT12_POSTRUN_ORACLE_VS_ARCHIVED_SOURCE_GAP_BASELINE');
 assert.equal(x.total_reference_rows,65);
 assert.equal(x.reference_pool_links,8);
 assert.equal(x.reference_name_only,57);
 assert.equal(x.baseline_model_fills,0);
 assert.equal(x.baseline_verified_windows_client_receipts,0);
 assert.equal(x.original_historical_gpt_runs_proven,0);
 assert.equal(x.independently_established_winner_recall,null);
 assert.equal(x.independently_established_missed_opportunity_count,null);
 assert.equal(x.realized_pnl_from_historical_trade,null);
 assert.equal(x.nominal_paper_cash_after_no_orders_test_usdc,5000);
 assert.ok(x.results.every(z=>z.comparison_outcome==='UNKNOWN_NOT_A_VERIFIED_FALSE_NEGATIVE'));
 assert.ok(x.results.every(z=>z.proved_executable_opportunity===false));
 assert.equal(JSON.stringify(inputs),before);
});
test('source-reported 50 TEST-USDC perfect movement remains clearly hypothetical',async()=>{
 const x=compareOct12SourceGapBaselineAfterRun(await build());
 const bnbcat=x.results[0];
 assert.equal(bnbcat.name,'BNBCAT');
 assert.equal(bnbcat.reported_gain_pct,50327);
 assert.equal(bnbcat.indicative_perfect_full_reported_movement_from_50_test_usdc,25213.5);
 assert.equal(bnbcat.verified_bot_buy,false);
 assert.equal(bnbcat.verified_bot_sell,false);
 assert.equal(bnbcat.indicative_value_is_not_tradable_pnl,true);
});
test('altered winner order, false implied entry timestamp and fake source credit cannot pass',async()=>{
 const args=await build();
 args.winnerRegister.entries[0].rank=99;
 assert.throws(()=>compareOct12SourceGapBaselineAfterRun(args),
  /POSTRUN_BASELINE_OR_REFERENCE_INVALID_OR_LEAK_RISK/);
 args.winnerRegister.entries[0].rank=1;
 args.winnerRegister.entries[0].contract='0x'+'a'.repeat(40);
 assert.throws(()=>compareOct12SourceGapBaselineAfterRun(args),
  /POSTRUN_BASELINE_OR_REFERENCE_INVALID_OR_LEAK_RISK/);
});
test('cannot compare a synthetic profitable fixture or a fabricated winner-eligible replay as a real bot outcome',async()=>{
 const args=await build();
 args.blindBaseline.simulation.simulated_fills=1;
 assert.throws(()=>compareOct12SourceGapBaselineAfterRun(args),
  /POSTRUN_BASELINE_OR_REFERENCE_INVALID_OR_LEAK_RISK/);
 args.blindBaseline.simulation.simulated_fills=0;
 args.blindBaseline.evidence.intraday_snapshots_eligible=1;
 assert.throws(()=>compareOct12SourceGapBaselineAfterRun(args),
  /POSTRUN_BASELINE_OR_REFERENCE_INVALID_OR_LEAK_RISK/);
});
