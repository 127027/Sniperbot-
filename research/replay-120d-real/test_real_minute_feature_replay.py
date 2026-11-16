import importlib.util
from pathlib import Path
import unittest
import pyarrow as pa

p=Path(__file__).with_name("real-minute-feature-replay.py")
spec=importlib.util.spec_from_file_location("r29_real_minute_features",p)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class MinuteFeaturesTests(unittest.TestCase):
 def row(self,t,mint):
  r=dict.fromkeys(mod.SAFE)
  r.update({"mint":mint,"t":t,"ts":mod.iso(t),"age_s":10.0,
            "f_age":10.0,"window":"young","f_n_buys":2.0,
            "flag_creator_sold":False})
  return r
 def test_manifest_only_36_expected_days(self):
  text="\n".join("features  | data/features/"+d+".parquet | 3 | 4000 | "+("a"*64) for d in mod.DAYS)
  result=mod.manifest(text)
  self.assertEqual(len(result),36)
  self.assertEqual(result["data/features/2026-10-15.parquet"],(3,4000,"a"*64))
  with self.assertRaisesRegex(ValueError,"SOURCE_MISSING_REQUIRED_36_DAYS"):
   mod.manifest(text.replace("data/features/2026-10-15.parquet","data/features/2026-11-01.parquet"))
 def test_no_future_rug_label_leaks_to_model_decision(self):
  epoch=mod.datetime(2026,10,15,tzinfo=mod.timezone.utc).timestamp()
  earlier=self.row(epoch+10,"A"*40)
  later=self.row(epoch+3605,"B"*40)
  table=pa.Table.from_pylist([earlier,later])
  report=mod.day_frames("2026-10-15",table,[*mod.SAFE,"rugged","rug_dt_s","graduated","outcome_status","labels_as_of"])
  self.assertEqual(report["future_outcome_known_to_replay"],False)
  self.assertEqual(len(report["frames"]),24)
  self.assertEqual(len(report["frames"][0]["first_eight_neutral_distinct_mints"]),1)
  self.assertEqual(len(report["frames"][1]["first_eight_neutral_distinct_mints"]),1)
  f=report["frames"][0]["first_eight_neutral_distinct_mints"][0]["asof_features"]
  self.assertNotIn("rugged",f)
  self.assertNotIn("graduated",f)
  self.assertNotIn("labels_as_of",f)
  self.assertEqual(f["mint"],"A"*40)
  self.assertEqual(report["gpt_model_calls"],0)
  self.assertEqual(report["actual_paper_trades"],0)
 def test_model_frame_rejects_any_unapproved_feature_even_if_false(self):
  record=self.row(mod.datetime(2026,10,15,tzinfo=mod.timezone.utc).timestamp(),"A"*40)
  record["rugged"]=0
  with self.assertRaisesRegex(ValueError,"RETROSPECTIVE_COLUMN_LEAK"):
   mod.safe_asof(record,record["t"])
 def test_prelaunch_and_later_future_timestamp_cannot_enter_old_checkpoint(self):
  epoch=mod.datetime(2026,10,15,tzinfo=mod.timezone.utc).timestamp()
  r=self.row(epoch+10,"A"*40)
  with self.assertRaisesRegex(ValueError,"FUTURE_ROW_LEAK"):
   mod.safe_asof(r,epoch)
  invalid=self.row(epoch+12,"C"*40);invalid["age_s"]=-4.0
  table=pa.Table.from_pylist([invalid,r])
  report=mod.day_frames("2026-10-15",table,[*mod.SAFE,"rugged"])
  self.assertEqual(report["invalid_or_prelaunch_rows"],1)
  self.assertEqual(report["frames"][0]["first_eight_neutral_distinct_mints"][0]["asof_features"]["mint"],"A"*40)
 def test_future_success_metric_never_used_as_candidate_sort(self):
  epoch=mod.datetime(2026,10,15,tzinfo=mod.timezone.utc).timestamp()
  rows=[self.row(epoch+20,"B"*40),self.row(epoch+10,"A"*40)]
  report=mod.day_frames("2026-10-15",pa.Table.from_pylist(rows),[*mod.SAFE,"rugged"])
  candidates=report["frames"][0]["first_eight_neutral_distinct_mints"]
  self.assertEqual([x["asof_features"]["mint"] for x in candidates],["A"*40,"B"*40])

if __name__=="__main__":unittest.main()
