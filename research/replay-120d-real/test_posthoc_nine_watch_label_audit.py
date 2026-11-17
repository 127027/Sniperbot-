import importlib.util
import unittest
from pathlib import Path

P=Path(__file__).with_name("posthoc-nine-watch-label-audit.py")
spec=importlib.util.spec_from_file_location("posthoc_watch_audit",P)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

BASE_REVIEW={"mint":"7xWcYfVmBwXx1vHZgN5MrdYNX3gzJ35frhqRJoGbdqyo",
 "source_day_utc":"2026-10-15","virtual_asof_utc":"2026-10-15T12:00:00Z",
 "model_authored_research_recommendation":"WATCH"}
BASE_ROW={"mint":BASE_REVIEW["mint"],"launched_at":"2026-10-15T11:00:00Z",
 "quote_asset":"sol","decoder_complete":1,"mayhem":0,
 "graduated":1,"migrate_dt_s":7200,"rugged":0,"rug_dt_s":None,
 "peak_rs":82.0,"terminal_rs":83.0,"dev_first_sell_dt_s":None,
 "rug_branch_inferred":None}

class PosthocTest(unittest.TestCase):
 def test_later_graduation_is_not_proven_profit(self):
  r=m.assess_outcome(BASE_REVIEW,BASE_ROW)
  self.assertTrue(r["graduation_or_pool_sighting_after_virtual_scan"])
  self.assertFalse(r["roi_proven"])
  self.assertIsNone(r["realized_pnl_test_usdc"])
  self.assertFalse(r["historical_input_from_these_outcomes_used_at_decision"])
 def test_rug_before_scan_is_not_a_new_later_loss(self):
  r=m.assess_outcome(BASE_REVIEW,{**BASE_ROW,"rugged":1,"rug_dt_s":900})
  self.assertFalse(r["rug_rule_event_after_virtual_scan"])
  self.assertTrue(r["posthoc_rug_is_provider_observation_not_proven_fraud"])
 def test_later_rug_is_independent_of_graduation(self):
  r=m.assess_outcome(BASE_REVIEW,{**BASE_ROW,"rugged":1,"rug_dt_s":10800,"graduated":1})
  self.assertTrue(r["rug_rule_event_after_virtual_scan"])
  self.assertEqual(r["later_provider_graduated_label"],1)
 def test_null_labels_remain_unknown(self):
  r=m.assess_outcome(BASE_REVIEW,{**BASE_ROW,"rugged":None,"rug_dt_s":None,"graduated":None})
  self.assertIsNone(r["rug_rule_event_after_virtual_scan"])
  self.assertIsNone(r["later_provider_rugged_rule_label"])
 def test_inconsistent_early_mint_is_rejected(self):
  with self.assertRaisesRegex(ValueError,"FUTURE_MINT_AT_ASOF"):
   m.assess_outcome(BASE_REVIEW,{**BASE_ROW,"launched_at":"2026-10-15T12:01:00Z"})
  with self.assertRaisesRegex(ValueError,"OUTCOME_MINT_MISMATCH"):
   m.assess_outcome(BASE_REVIEW,{**BASE_ROW,"mint":"another"})
 def test_curve_reserve_not_roi_and_extreme_reserve_flag(self):
  r=m.assess_outcome(BASE_REVIEW,{**BASE_ROW,"peak_rs":2187.0})
  self.assertTrue(r["peak_reserve_measurement_unreliable"])
  self.assertFalse(r["roi_proven"])

if __name__=="__main__":
 unittest.main()
