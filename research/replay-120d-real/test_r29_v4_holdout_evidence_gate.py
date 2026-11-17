import importlib.util,json,unittest
from pathlib import Path
P=Path(__file__).with_name("r29-v4-holdout-evidence-gate.py")
s=importlib.util.spec_from_file_location("v4_gate",P)
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
policy=json.loads((P.parent.parent/"r29"/"operations"/
 "R29_V4_1_PRE_REGISTERED_HOLDOUT_SUCCESS_POLICY.json").read_text())

def synthetic_verified_case(i):
 return {"test_id":i,
  "evidence":{k:True for k in m.REQUIRED_EVIDENCE},
  "verified_daily_gpt_model_call_counts":[3,5,1,4,2,6,1,8,3,2],
  "source_days_including_warmup":17,"trade_days":10,
  "initial_test_usdc":5000,"valid_source_launches":10000,
  "captured_source_launches":10000,
  "objective_verified_breakouts":20,
  "unique_breakouts_early_detected":13,
  "GPT_watch_or_buy_signals":20,
  "GPT_watch_or_buy_later_verified_breakouts":6,
  "technical_event_to_candidate_p95_min":3,
  "source_to_model_p95_min":35,
  "net_realized_pnl_test_usdc":100,
  "maximum_equity_drawdown_fraction":0.10,
  "maximum_one_day_realized_loss_fraction":0.02}

class HoldoutEvidenceGateTests(unittest.TestCase):
 def test_never_fake_success_with_empty_holdouts(self):
  x=m.evaluate(policy,[])
  self.assertEqual(x["status"],"INCONCLUSIVE")
  self.assertNotIn("metrics",x)
 def test_proxy_or_unverified_gpt_cannot_pass(self):
  v=[synthetic_verified_case(i) for i in range(3)]
  v[0]["evidence"]["provider_model_invocations_externally_attested"]=False
  x=m.evaluate(policy,v)
  self.assertEqual(x["status"],"INCONCLUSIVE")
  self.assertEqual(x["reason"],"EXTERNAL_EVIDENCE_GAP")
 def test_no_price_or_sellability_proof_is_inconclusive(self):
  v=[synthetic_verified_case(i) for i in range(3)]
  v[2]["evidence"]["buy_and_sell_executable_price_quotes_verified"]=False
  self.assertEqual(m.evaluate(policy,v)["status"],"INCONCLUSIVE")
 def test_non_numeric_or_fake_pnl_rejected(self):
  v=[synthetic_verified_case(i) for i in range(3)]
  v[0]["net_realized_pnl_test_usdc"]=None
  self.assertEqual(m.evaluate(policy,v)["reason"],"UNVERIFIED_REQUIRED_METRIC")
 def test_synthetic_positive_proof_fixture_passes_but_not_real_trades(self):
  v=[synthetic_verified_case(i) for i in range(3)]
  self.assertEqual(m.evaluate(policy,v)["status"],"PASS")
 def test_synthetic_negative_return_fails_even_when_recall_good(self):
  v=[synthetic_verified_case(i) for i in range(3)]
  for i in range(3):v[i]["net_realized_pnl_test_usdc"]=-100
  x=m.evaluate(policy,v)
  self.assertEqual(x["status"],"FAIL")
  self.assertFalse(x["conditions"]["three_holdouts_net_positive"])
 def test_early_recall_fail_and_false_positives_counted(self):
  v=[synthetic_verified_case(i) for i in range(3)]
  for i in range(3):
   v[i]["unique_breakouts_early_detected"]=1
   v[i]["GPT_watch_or_buy_later_verified_breakouts"]=1
  x=m.evaluate(policy,v)
  self.assertEqual(x["status"],"FAIL")
  self.assertFalse(x["conditions"]["recall_at_least_60_percent"])
  self.assertFalse(x["conditions"]["precision_at_least_20_percent"])
 def test_too_few_objectively_labeled_breakouts_inconclusive(self):
  v=[synthetic_verified_case(i) for i in range(3)]
  for x in v:x["objective_verified_breakouts"]=5
  self.assertEqual(m.evaluate(policy,v)["reason"],
   "TOO_FEW_INDEPENDENT_VERIFIED_BREAKOUTS")
if __name__=="__main__":unittest.main()
