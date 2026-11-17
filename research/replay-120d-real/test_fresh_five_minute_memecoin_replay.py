import importlib.util
import unittest
from pathlib import Path
from datetime import datetime, timezone
import pyarrow as pa

P=Path(__file__).with_name("fresh-five-minute-memecoin-replay.py")
spec=importlib.util.spec_from_file_location("fresh_5m",P)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
SAFE=m.source.SAFE
DAY="2026-10-15"
START=datetime(2026,10,15,tzinfo=timezone.utc).timestamp()

def row(mint,t,age=30):
 x=dict.fromkeys(SAFE)
 x.update({"mint":mint,"t":t,"age_s":age,"f_age":age,"f_n_buys":40.0,
  "f_rep_rug":0.1,"f_rep_n":10.0,"f_dev_share":0.01,"f_insider_share":0.02,
  "quote_asset":"sol","mayhem":False})
 return x

def run(rows):
 table=pa.Table.from_pylist(rows)
 return m.fresh_day_frames(DAY,table,[*SAFE,"rugged"])

class FreshCandidateTest(unittest.TestCase):
 def test_recent_coin_seen_in_last_five_minutes_is_candidate(self):
  # first hourly checkpoint is 01:00; 3-minute-old observed event.
  x=run([row("A"*44,START+3600-160,60)])
  first=x["frames"][0]["last_eight_fresh_neutral_mints"]
  self.assertEqual(len(first),1)
  self.assertEqual(first[0]["asof_features"]["mint"],"A"*44)
  self.assertLessEqual(first[0]["age_at_scan_s"],300)
 def test_old_age_coin_excluded_even_if_latest_observation_recent(self):
  x=run([row("B"*44,START+3600-100,250)])
  self.assertEqual(x["frames"][0]["last_eight_fresh_neutral_mints"],[])
 def test_old_at_start_of_hour_not_selected_at_end_of_hour(self):
  x=run([row("C"*44,START+100,100)])
  self.assertEqual(x["frames"][0]["last_eight_fresh_neutral_mints"],[])
 def test_selects_at_most_eight_neutral_latest_observations(self):
  rows=[row(chr(ord("A")+i)*44,START+3600-160+i,50) for i in range(12)]
  x=run(rows)
  cohort=x["frames"][0]["last_eight_fresh_neutral_mints"]
  self.assertEqual(len(cohort),8)
  self.assertEqual(cohort[0]["asof_features"]["mint"],"L"*44)
  self.assertEqual(cohort[-1]["asof_features"]["mint"],"E"*44)
  self.assertEqual(x["source_future_labels_excluded"] if "source_future_labels_excluded" in x else x["source_forbidden_outcome_columns_excluded"],["rugged"])
 def test_dedup_by_mint_latest_still_within_asof_window(self):
  x=run([row("D"*44,START+3600-200,20),
    row("D"*44,START+3600-100,60)])
  cohort=x["frames"][0]["last_eight_fresh_neutral_mints"]
  self.assertEqual(len(cohort),1)
  self.assertEqual(cohort[0]["asof_features"]["age_s"],60)
 def test_no_hypothetical_fills_or_gpt_model_call(self):
  x=run([row("E"*44,START+3600-100,20)])
  self.assertEqual(x["paper_fills"],0)
  self.assertEqual(x["model_calls"],0)
  self.assertTrue(x["no_future_labels"])

if __name__=="__main__":unittest.main()
