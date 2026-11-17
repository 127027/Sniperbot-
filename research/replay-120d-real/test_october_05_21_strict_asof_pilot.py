import copy
import csv
import importlib.util
import json
import tempfile
import unittest
from datetime import date,datetime,timedelta,timezone
from pathlib import Path

SPEC=importlib.util.spec_from_file_location(
 "oct_audit",Path(__file__).with_name("october-05-21-strict-asof-pilot.py"))
mod=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)

def fixture_day(day):
 start=datetime(day.year,day.month,day.day,tzinfo=timezone.utc)
 frames=[]
 for hour in range(24):
  at=start+timedelta(hours=hour+1)
  captured=at-timedelta(seconds=60)
  timestamp=captured.timestamp()
  frames.append({
   "at_utc":mod.iso(at),"no_future_outcomes":True,"gpt_model_calls":0,
   "independent_sellable_buy_sell_quotes":False,"paper_trades":None,
   "neutral_fresh_mints_within_5min":2,
   "last_eight_fresh_neutral_mints":[{
    "observed_at_utc":mod.iso(captured),
    "age_at_scan_s":100,
    "asof_features":{"mint":"A"*44,"t":timestamp,"age_s":40,
     "quote_asset":"sol","quote_is_sol":True,"f_n_buys":3,
     "f_rs":1.15}
   }]
  })
 return {"schema":mod.ALLOWED_SCHEMA,"day":day.isoformat(),
  "no_future_labels":True,"source_capture_released_after_historical_events":True,
  "model_calls":0,"paper_fills":0,"real_feature_rows":24,
  "source_forbidden_outcome_columns_excluded":sorted(mod.NEVER_MODEL),
  "source_raw_parquet_sha256":"a"*64,
  "source_url":"https://huggingface.co/datasets/loopholetape/pumpfun-launches/resolve/"+
   mod.SOURCE_REV+"/data/features/"+day.isoformat()+".parquet",
  "frames":frames}

class IsolatedOctoberAudit(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix="oct_asof_mock_")
  self.folder=Path(self.tmp.name)
  self.source=self.folder/"source";self.source.mkdir()
  self.matrix=self.folder/"matrix.csv"
  rows=[]
  for day in mod.ALL:
   (self.source/(day.isoformat()+".json")).write_text(
    json.dumps(fixture_day(day)))
   rows.append({"day_utc":day.isoformat(),"minute_feature_sha256":"a"*64,
    "minute_asof_feature_rows_verified":"24",
    "historic_launch_record_count":"24"})
  with self.matrix.open("w",newline="") as f:
   writer=csv.DictWriter(f,fieldnames=list(rows[0]))
   writer.writeheader();writer.writerows(rows)
 def tearDown(self):self.tmp.cleanup()
 def load(self,day):
  p=self.source/(day+".json")
  return json.loads(p.read_text())
 def save(self,day,value):
  (self.source/(day+".json")).write_text(json.dumps(value))

 def test_17_day_true_source_dry_run_without_fabricated_GPT_or_trades(self):
  report=mod.replay(self.source,self.matrix)
  self.assertEqual(len(report["day_by_day"]),10)
  self.assertEqual(report["full_17_calendar_days_source_audited"],17)
  self.assertEqual(report["ten_trade_days_technical_hourly_source_frames"],240)
  self.assertEqual(report["seven_preparation_days_raw_launches_observed"],168)
  self.assertEqual(report["ten_trade_days_raw_launches_observed"],240)
  self.assertEqual(report["start_capital_test_usdc"],5000)
  self.assertEqual(report["cash_if_no_trades_executed_test_usdc"],5000)
  self.assertIsNone(report["realized_pnl_test_usdc"])
  self.assertTrue(report["historical_PnL_unverifiable_not_zero"])
  self.assertEqual(report["actual_historical_GPT_model_strategy_calls"],0)
  self.assertEqual(report["actual_historical_buy_fills"],0)
  self.assertEqual(report["actual_historical_sell_fills"],0)
  for day in report["day_by_day"]:
   self.assertIn(day["initial_daily_frequency_policy_from_prior_asof_only"],[1,4,12,24])
   self.assertEqual(day["candidate_evidence_checkpoint_frames"][0]["observed_neutral_mints"][0]["mint"],"A"*44)
   self.assertTrue(all("peak_rs" not in str(x) for x in day["candidate_evidence_checkpoint_frames"]))
   self.assertEqual(day["technical_trade_permission"],"BLOCKED_DATA_GAP")

 def test_time_boundaries_cannot_include_future_or_outside_current_day(self):
  for mutation in (
   lambda x:x["frames"][0]["last_eight_fresh_neutral_mints"][0]["asof_features"].update(
    {"t":datetime(2026,10,12,1,1,tzinfo=timezone.utc).timestamp()}),
   lambda x:x["frames"][0]["last_eight_fresh_neutral_mints"][0].update(
    {"age_at_scan_s":301}),
   lambda x:x["frames"][0].update({"at_utc":"2026-10-13T01:00:00Z"}),
   lambda x:x["frames"][0]["last_eight_fresh_neutral_mints"][0]["asof_features"].update(
    {"peak_rs":10000}),
   lambda x:x.update({"model_calls":3}),
   lambda x:x.update({"paper_fills":1}),
   lambda x:x.update({"source_raw_parquet_sha256":"b"*64}),
   lambda x:x.update({"source_forbidden_outcome_columns_excluded":["rugged"]})
  ):
   a=self.load("2026-10-12")
   mutation(a);self.save("2026-10-12",a)
   with self.assertRaises(ValueError):mod.replay(self.source,self.matrix)
   self.save("2026-10-12",fixture_day(date(2026,10,12)))

 def test_missing_day_and_gpt_fake_source_cannot_be_reported_as_complete(self):
  (self.source/"2026-10-16.json").unlink()
  with self.assertRaisesRegex(ValueError,"MISSING_OR_INVALID_DAY"):
   mod.replay(self.source,self.matrix)

 def test_schedule_uses_only_prior_day_metric_and_preparation_baseline(self):
  training=[10,20,30,40,50,60,70]
  self.assertEqual(mod.daily_review_count(20,training),1)
  self.assertEqual(mod.daily_review_count(30,training),4)
  self.assertEqual(mod.daily_review_count(50,training),12)
  self.assertEqual(mod.daily_review_count(80,training),24)
  self.assertEqual([mod.evenly_spaced_hours(n) for n in [1,4,12,24]][0],[24])
  self.assertEqual(mod.evenly_spaced_hours(4),[6,12,18,24])
  self.assertEqual(len(mod.evenly_spaced_hours(24)),24)

if __name__=="__main__":unittest.main()
