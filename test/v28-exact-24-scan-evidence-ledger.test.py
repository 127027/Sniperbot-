import importlib.util
import json
import pathlib
import unittest
from copy import deepcopy

root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('r29_v28',
 root/'scripts/v28-exact-24-scan-evidence-ledger.py')
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def fake():
 scans=[]
 frames=[]
 counts=[]
 for i in range(24):
  at=m.moment(i)
  scans.append({'scan':i+1,'scan_at_utc':at,'buy':[],'sell':[],
   'hold':[],'watch':[],'verified_real_gpt_reviews_this_scan':0,
   'verified_windows_paper_fills_this_scan':0,'valid_model_input_pools':0,
   'scan_result':'DATA_GAP_NO_FRESH_QUOTES'})
  n=30181+int((63890-30181)*i/23)
  f={'scan_at_utc':at,'neutral_distinct_mints_in_two_day_history':n,
   'raw_feature_rows_before_scan':121882+i*5000}
  frames.append(f)
  counts.append({'scan_at_utc':at,'mint_count':n,'row_count':f['raw_feature_rows_before_scan']})
 comparison={'kind':'R29_V19_EXPLICIT_24_HOURLY_POST_DECISION_DIAGNOSTIC',
  'scan_count':24,'model_buys':0,'model_sells':0,'actual_windows_paper_fills':0,
  'scans':scans}
 decisions={'kind':'R29_V18_ON_DEMAND_FIVE_ROLE_SHADOW_BACKTEST',
  'mode':'EXPLICIT_FIXED_24_HOURLY_DIAGNOSTIC','confirmed_paper_orders':0,
  'confirmed_paper_fills':0,'historical_gpt_dot_runs':0,
  'model_replay_summary':{'dataGap':24}}
 receipt={'github_run_id':'45257966772'}
 manifest={'total_source_feature_rows_oct11_and_oct12':259851,
  'original_provider_delivery_in_october_proven':False,
  'per_scan_counts':counts}
 tape={'original_october_delivery_authenticated':False,
  'winner_oracle_accessed':False,'frames':frames}
 results=[]
 for i,name in [(2,'TANK'),(18,'ARIANA')]:
  results.append({'virtual_scan_at_utc':m.moment(i),
   'historical_sale_count':2,
   'paper_buy_and_sell_authorized':False,
   'provider_originally_delivered_feature_to_dot_at_scan':False,
   'coin_label_for_research_only':name,'mint':'A'*32,'pool':'B'*32})
 chain={'individual_original_solana_chain_sells_reverified':4,
  'historical_bidirectional_executable_50_usdc_quote_pairs_verified':0,
  'original_qa04_trading_backtest_accepted':False,'results':results}
 return comparison,decisions,receipt,manifest,tape,chain

class Real24ScanReport(unittest.TestCase):
 def test_exact_24_hours_and_no_fabricated_model_fills(self):
  xs=fake();rows=m.join_24(*xs)
  self.assertEqual(len(rows),24)
  self.assertEqual(rows[0]['scan_number'],1)
  self.assertEqual(rows[-1]['scan_number'],24)
  self.assertEqual(rows[0]['postevent_solana_cumulative_mints'],30181)
  self.assertEqual(rows[-1]['postevent_solana_cumulative_mints'],63890)
  self.assertTrue(all(not r['model_BUY'] and not r['model_HOLD'] and
    not r['model_SELL'] for r in rows))
  self.assertEqual(rows[2]['postevent_original_chain_other_wallet_sells'][0]['symbol'],'TANK')
  self.assertEqual(rows[18]['postevent_original_chain_other_wallet_sells'][0]['symbol'],'ARIANA')
  self.assertEqual(rows[2]['actual_client_SELL'],[])
  self.assertEqual(rows[18]['actual_client_SELL'],[])
 def test_no_future_scan_leak(self):
  xs=list(fake())
  xs[4]['frames'][7]['scan_at_utc']=m.moment(8)
  with self.assertRaisesRegex(ValueError,'SCAN_TIMES_WRONG'):
   m.join_24(*xs)
 def test_forged_live_paper_fill_is_rejected(self):
  xs=list(fake());xs[0]['scans'][9]['verified_windows_paper_fills_this_scan']=1
  with self.assertRaisesRegex(ValueError,'ORIGINAL_DATA_GAP_CHANGED'):
   m.join_24(*xs)
 def test_watching_coin_is_not_a_hold(self):
  xs=list(fake())
  coin={'chain':'solana','pool':'B'*32,'contract':'A'*32}
  xs[0]['scans'][6]['watch']=[{'action':'WATCH','symbol':'COIN','coin':coin}]
  rows=m.join_24(*xs)
  self.assertEqual(len(rows[6]['model_WATCH']),1)
  self.assertEqual(rows[6]['model_HOLD'],[])
 def test_forged_hold_without_buy_is_blocked(self):
  xs=list(fake())
  coin={'chain':'solana','pool':'B'*32,'contract':'A'*32}
  xs[0]['scans'][0]['hold']=[{'symbol':'COIN','coin':coin}]
  with self.assertRaisesRegex(ValueError,'HOLD_IS_NOT_AN_OPEN_POSITION'):
   m.join_24(*xs)
 def test_postevent_chain_sell_cannot_be_bot_sell(self):
  xs=list(fake())
  xs[0]['scans'][2]['sell']=[{'action':'SELL','symbol':'TANK',
   'coin':{'chain':'solana','pool':'B'*32}}]
  with self.assertRaisesRegex(ValueError,'SELL_WITH_NO_BOUGHT_POSITION'):
   m.join_24(*xs)
 def test_model_buy_not_fabricated_into_frozen_no_trade_report(self):
  xs=list(fake())
  xs[0]['scans'][0]['buy']=[{'action':'BUY','symbol':'COIN',
   'coin':{'chain':'solana','pool':'B'*32}}]
  with self.assertRaisesRegex(ValueError,'HOLD_IS_NOT_AN_OPEN_POSITION'):
   m.join_24(*xs)
 def test_fake_original_quote_is_blocked(self):
  xs=list(fake())
  xs[0]['scans'][1]['valid_model_input_pools']=1
  with self.assertRaisesRegex(ValueError,'ORIGINAL_DATA_GAP_CHANGED'):
   m.join_24(*xs)
 def test_wrong_other_trader_eligibility_is_rejected(self):
  xs=list(fake())
  xs[5]['results'][0]['paper_buy_and_sell_authorized']=True
  with self.assertRaisesRegex(ValueError,'BAD_ORIGINAL_CHAIN_WITNESS'):
   m.join_24(*xs)
 def test_source_pins_required(self):
  self.assertEqual(len(m.HASH),6)
  self.assertEqual(len(set(m.HASH.values())),6)
  self.assertTrue(all(len(v)==64 for v in m.HASH.values()))
 def test_csv_is_not_claimed_profit(self):
  rows=m.join_24(*fake())
  md=m.report_markdown(rows)
  self.assertIn('TANK',md)
  self.assertIn('ARIANA',md)
  self.assertIn('0 BUY, 0 HOLD, 0 SELL',md)
  self.assertNotIn('realisierter Gewinn',md)
if __name__=='__main__': unittest.main()
