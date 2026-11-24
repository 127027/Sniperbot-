import importlib.util, pathlib, unittest
root=pathlib.Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('v29',root/'src/v29-retro-candidate-funnel.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
M='A'*32;N='B'*32
def sample(mint,t,**changes):
 r=dict(mint=mint,t=t,age_s=150,window='older',
  quote_asset='sol',quote_modelled=True,mayhem=False,
  repaired=False,f_rs=12.,f_n_buys=15.,f_dev_share=.10,
  f_insider_share=.20,f_bundle_wallets=1,
  p_rug_within_300s=None,p_true_graduation=.10)
 r.update(changes);return r
class TestV29CleanResearch(unittest.TestCase):
 def test_historical_rows_unavailable_on_scan_and_lag(self):
  tick=m.BASE
  rows=[sample(M,tick-300),sample(N,tick-30)]
  scans=m.build_24_scan_research(rows)
  self.assertEqual(scans[0]['cumulative_distinct_mints_retro'],2)
  self.assertEqual(scans[0]['screen_pass_with_unknown_executable_quotes'],1)
  self.assertEqual(scans[0]['rejected_research_by_reason']['NOT_FINALIZED_BEFORE_SCAN'],1)
  self.assertEqual(scans[0]['top_research_candidates_not_orders'][0]['mint'],M)
  self.assertFalse(scans[0]['top_research_candidates_not_orders'][0]['allowed_live_or_backtest_order'])
 def test_missing_issuer_pool_quote_prevents_any_real_buy(self):
  r=m.candidate(sample(M,m.BASE-300),m.BASE)
  self.assertEqual(r['screen_status'],'SCREEN_PASS_REQUIRES_POOL_RISK_AND_TWO_WAY_QUOTES')
  self.assertIsNone(r['pool'])
  self.assertFalse(r['real_quote_buy_50usdc_authenticated'])
  self.assertFalse(r['real_quote_sell_50usdc_authenticated'])
  self.assertFalse(r['allowed_live_or_backtest_order'])
 def test_future_outcomes_cannot_be_loaded_even_if_value_benign(self):
  for field in m.FUTURE_OR_OUTCOME_COLUMNS:
   with self.assertRaisesRegex(ValueError,'FUTURE_OR_OUTCOME_COLUMN'):
    m.clean_row(sample(M,m.BASE-300,**{field:None}))
 def test_quote_and_observed_flags_rejected(self):
  cases=[dict(quote_asset='usdc'),dict(quote_modelled=False),
    dict(mayhem=True),dict(flag_creator_sold=True),
    dict(flag_bundle_dumped=True),dict(flag_serial_rugger_creator=True),
    dict(f_insider_share=.99),dict(f_rs=.2),dict(p_rug_within_300s=.85)]
  for case in cases:
   with self.subTest(case=case):
    x=m.candidate(sample(M,m.BASE-300,**case),m.BASE)
    self.assertEqual(x['screen_status'],'NO_BUY_REVIEW')
    self.assertFalse(x['allowed_live_or_backtest_order'])
 def test_score_does_not_depend_on_future_outcome(self):
  a=m.candidate(sample(M,m.BASE-300,f_n_buys=25,f_rs=18),m.BASE)
  b=m.candidate(sample(M,m.BASE-300,f_n_buys=25,f_rs=18,p_true_graduation=.9),m.BASE)
  self.assertEqual(a['research_score'],b['research_score'])
 def test_24_scans_with_repeated_mints_not_double_counted(self):
  rows=[sample(M,m.BASE-300),sample(M,m.BASE+30),
   sample(N,m.BASE+3600+30)]
  frames=m.build_24_scan_research(rows)
  self.assertEqual(len(frames),24)
  self.assertEqual(frames[0]['cumulative_distinct_mints_retro'],1)
  self.assertEqual(frames[1]['cumulative_distinct_mints_retro'],1)
  self.assertEqual(frames[2]['cumulative_distinct_mints_retro'],2)
  self.assertEqual(frames[-1]['BUY'],[])
  self.assertEqual(frames[-1]['HOLD'],[])
  self.assertEqual(frames[-1]['SELL'],[])
 def test_old_source_knowledge_is_legal_research_but_stale_to_trade(self):
  rows=[sample(M,m.BASE-7200)]
  f=m.build_24_scan_research(rows)[0]
  self.assertEqual(f['cumulative_distinct_mints_retro'],1)
  self.assertEqual(f['fresh_distinct_mints_in_last_10m_retro'],0)
  self.assertEqual(f['screen_pass_with_unknown_executable_quotes'],0)
 def test_original_frozen_orders_unchanged(self):
  scans=m.build_24_scan_research([sample(M,m.BASE-300)])
  prior={'kind':'R29_V28_VERIFIED_24_HOURLY_TRADE_ACTION_AND_NEUTRAL_RESEARCH_SUMMARY',
   'scans':[{'at_utc':x['at_utc'],'model_buy':[],'model_hold':[],
    'model_sell':[],'actual_historical_gpt_reviews':0,'actual_paper_fills':0}
    for x in scans]}
  self.assertTrue(m.validate_frozen_model(prior,scans))
  prior['scans'][3]['model_buy']=[{'mint':M}]
  with self.assertRaisesRegex(ValueError,'FROZEN_ACTUAL_MODEL_ORDER_MISMATCH'):
   m.validate_frozen_model(prior,scans)
 def test_one_label_for_each_screened_mint_and_deterministic_ranking(self):
  a=sample(M,m.BASE-300,f_n_buys=8)
  b=sample(N,m.BASE-290,f_n_buys=40)
  f=m.build_24_scan_research([a,b],topn=2)[0]
  self.assertEqual(f['screen_pass_with_unknown_executable_quotes'],2)
  self.assertEqual(f['top_research_candidates_not_orders'][0]['mint'],N)
 def test_pending_row_cannot_shadow_fresh_finalized_row(self):
  tick=m.BASE
  rows=[sample(M,tick-300),sample(M,tick-30,flag_creator_sold=True)]
  f=m.build_24_scan_research(rows)[0]
  self.assertEqual(f['screen_pass_with_unknown_executable_quotes'],1)
  self.assertEqual(f['finalized_fallback_mints'],1)
  self.assertEqual(f['top_research_candidates_not_orders'][0]['feature_at_utc'],m.ts(tick-300))
  self.assertFalse(f['top_research_candidates_not_orders'][0]['allowed_live_or_backtest_order'])
 def test_pending_row_cannot_hide_finalized_danger_or_resurrect_stale_row(self):
  tick=m.BASE
  f=m.build_24_scan_research([sample(M,tick-120,flag_creator_sold=True),
   sample(M,tick-20),sample(N,tick-601),sample(N,tick-15)])[0]
  self.assertEqual(f['screen_pass_with_unknown_executable_quotes'],0)
  self.assertEqual(f['finalized_fallback_mints'],1)
  self.assertEqual(f['rejected_research_by_reason']['ASOF_FLAG_CREATOR_SOLD'],1)
  self.assertEqual(f['rejected_research_by_reason']['NOT_FINALIZED_BEFORE_SCAN'],1)
 def test_exact_finality_boundary_remains_excluded(self):
  tick=m.BASE
  f=m.build_24_scan_research([sample(M,tick-60),sample(N,tick-61)])[0]
  self.assertEqual(f['screen_pass_with_unknown_executable_quotes'],1)
  self.assertEqual(f['top_research_candidates_not_orders'][0]['mint'],N)
if __name__=='__main__':unittest.main()
