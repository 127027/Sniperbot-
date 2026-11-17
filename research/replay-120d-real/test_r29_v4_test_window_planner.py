import csv
import importlib.util
import unittest
from datetime import date,timedelta
from pathlib import Path
src=Path(__file__).with_name("r29-v4-test-window-planner.py")
spec=importlib.util.spec_from_file_location("r29_v4_10trial_planner",src)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class Readiness(unittest.TestCase):
 def test_ten_windows_have_no_overlap_and_unavailable_source_never_becomes_trade_success(self):
  start=date(2026,8,31)
  launch={}
  minute={}
  for i in range(67):
   d=str(start+timedelta(days=i))
   launch[d]={"dataset_coverage":"THIRD_PARTY_RETROSPECTIVE_CAPTURE"}
  for i in range(24,67):
   d=str(start+timedelta(days=i))
   minute[d]={"minute_asof_feature_rows_verified":"200"}
  result=mod.plan_ten_launch_windows(launch,minute,start)
  windows=result["tests"]
  self.assertEqual(len(windows),10)
  self.assertEqual([x["full_neutral_source_days_attested"] for x in windows],
   [True]*6+[False]*4)
  self.assertEqual(result["available_consecutive_launch_source_days_only"],6)
  self.assertEqual(result["available_full_seventeen_day_minute_features_only"],3)
  self.assertEqual(windows[0]["trade_start_utc"],"2026-09-07")
  self.assertEqual(windows[5]["trade_end_utc"],"2026-11-05")
  self.assertEqual(windows[6]["status"],"SOURCE_DAYS_MISSING_NOT_A_BACKTEST")
  for i in range(1,10):
   self.assertGreater(windows[i]["trade_start_utc"],windows[i-1]["trade_end_utc"])
  self.assertFalse(any(x["historically_independent_unseen_window"] for x in windows))
  self.assertEqual(result["actual_historical_GPT_driven_buy_sell_trading_tests_completed"],0)
  self.assertIsNone(result["realized_historical_pnl_test_usdc"])
 def test_minute_missing_is_not_called_full_trade_backtest(self):
  result=mod.plan_ten_launch_windows({}, {},date(2026,10,1))
  self.assertEqual(result["available_consecutive_launch_source_days_only"],0)
  self.assertEqual(result["available_full_seventeen_day_minute_features_only"],0)
  self.assertTrue(all(x["historical_pnl_test_usdc"] is None for x in result["tests"]))
if __name__=="__main__":unittest.main()
