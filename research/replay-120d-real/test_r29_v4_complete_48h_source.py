import csv
import gzip
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from datetime import date,datetime,timedelta,timezone
from pathlib import Path

FILE=Path(__file__).with_name("r29-v4-complete-48h-source.py")
spec=importlib.util.spec_from_file_location("v4_full_source",FILE)
v4=importlib.util.module_from_spec(spec)
spec.loader.exec_module(v4)

def event(when,mint="A"*40,creator="C"*40):
 ts=when.timestamp()
 return {"mint":mint,"creator":creator,"t0":ts,
  "launched_at":when.isoformat(timespec="microseconds").replace("+00:00","Z")}
def utc(d,h=0,m=0,s=0):
 return datetime(d.year,d.month,d.day,h,m,s,tzinfo=timezone.utc)

class FullCoverageAndRetention(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix="r29-v4-all-mints-")
  self.root=Path(self.temp.name)
  self.db=sqlite3.connect(self.root/"candidate.sqlite")
  v4.init_db(self.db)
 def tearDown(self):
  self.db.close()
  self.temp.cleanup()

 def test_no_first_eight_no_random_sample_400_distinct_per_day(self):
  d=date(2026,10,12)
  base=utc(d)
  # Base58 unique 32+ length addresses with no special chosen success tokens.
  abc="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  def mint(i):
   a,b=divmod(i,len(abc))
   return abc[a]+abc[b]+"A"*38
  data=[event(base+timedelta(seconds=i),mint(i)) for i in range(400)]
  out=self.root/"all.jsonl.gz"
  result=v4.ingest_day_records(self.db,str(d),data,out)
  self.assertEqual(result["raw_records"],400)
  self.assertEqual(result["new_contract_identities"],400)
  self.assertEqual(result["invalid_records_by_reason"],{})
  with gzip.open(out,"rt",encoding="utf-8") as f:loaded=[json.loads(l) for l in f]
  self.assertEqual(len(loaded),400)
  self.assertEqual(len({x["mint"] for x in loaded}),400)
  self.assertTrue(all(x["strategy_decision"] is None for x in loaded))
  self.assertTrue(all(x["GPT_model_call_id"] is None for x in loaded))
  self.assertEqual(v4.active_at(self.db,(base+timedelta(hours=47)).timestamp()),400)
  self.assertEqual(v4.active_at(self.db,(base+timedelta(days=3)).timestamp()),0)

 def test_48h_including_crossing_midnight_and_boundary_not_prematurely_lost(self):
  d=date(2026,10,11)
  t=utc(d,23,59,59)
  self.assertEqual(v4.ingest_day_records(self.db,str(d),[event(t)],
   self.root/"day1.jsonl.gz")["new_contract_identities"],1)
  self.assertEqual(v4.candidate_asof(self.db,"A"*40,t.timestamp()-0.001),
   "NOT_YET_LAUNCHED")
  self.assertEqual(v4.candidate_asof(self.db,"A"*40,
   (t+timedelta(hours=47,minutes=59,seconds=59)).timestamp()),
   "MONITORING_SOURCE_ONLY")
  self.assertEqual(v4.candidate_asof(self.db,"A"*40,
   (t+timedelta(hours=48)).timestamp()),"EXPIRED_SOURCE_ONLY")
  self.assertEqual(v4.active_at(self.db,utc(date(2026,10,12),6).timestamp()),1)
  self.assertEqual(v4.active_at(self.db,utc(date(2026,10,14),6).timestamp()),0)

 def test_outcome_fields_future_records_and_corrupt_source_must_fail(self):
  d=date(2026,10,15)
  x=event(utc(d,1))
  for f in ("rugged","peak_rs","graduated","terminal_rs"):
   with self.subTest(f=f):
    corrupted={**x,f:False}
    with self.assertRaisesRegex(ValueError,"RETROSPECTIVE_LAUNCH_FIELD_LEAK"):
     v4.ingest_day_records(self.db,str(d),[corrupted],
      self.root/("forbid-"+f+".gz"))
  y=event(utc(date(2026,10,16),0))
  self.assertEqual(v4.ingest_day_records(self.db,str(d),[y],
   self.root/"future.gz")["new_contract_identities"],0)
  self.assertEqual(v4.active_at(self.db,utc(d,23).timestamp()),0)

 def test_repeated_identical_mint_merges_but_collision_conflict_is_blocked(self):
  d=date(2026,10,15)
  first=event(utc(d,1))
  self.assertEqual(v4.ingest_day_records(self.db,str(d),[first,first],
   self.root/"repeated.gz")["same_identity_duplicates"],1)
  altered={**first,"creator":"D"*40}
  with self.assertRaisesRegex(ValueError,"DUPLICATE_MINT_WITH_CONFLICTING"):
   v4.ingest_day_records(self.db,str(d),[altered],self.root/"invalid.gz")

 def test_run_uses_exact_pinned_dates_without_seeding_winners_or_fills(self):
  start=date(2026,10,11);end=date(2026,10,13)
  matrix=self.root/"matrix.csv"
  dates=[start+timedelta(days=i) for i in range(3)]
  with matrix.open("w",newline="") as f:
   w=csv.DictWriter(f,fieldnames=[
    "date","dataset_coverage","raw_parquet_sha256","captured_launch_count"])
   w.writeheader()
   for d in dates:w.writerow({"date":str(d),
    "dataset_coverage":"THIRD_PARTY_RETROSPECTIVE_CAPTURE",
    "raw_parquet_sha256":"a"*64,"captured_launch_count":2})
  # The same contract may not launch twice; all days get two new ones.
  def stub(day,target,expected):
   dt=date.fromisoformat(day)
   i=(dt-start).days*2
   return [event(utc(dt,1),str(i+1)+"A"*39),
           event(utc(dt,23),str(i+2)+"B"*39)]
  report=v4.run(start,end,self.root/"result",matrix,stub)
  self.assertEqual(report["total_original_records"],6)
  self.assertEqual(report["total_distinct_new_contracts"],6)
  self.assertEqual(report["retention_seconds"],172800)
  self.assertEqual(report["daily_audit"][0]["candidate_state_at_next_midnight"]["MONITORING_SOURCE_ONLY"],2)
  self.assertEqual(report["daily_audit"][1]["candidate_state_at_next_midnight"]["MONITORING_SOURCE_ONLY"],4)
  self.assertEqual(report["daily_audit"][2]["candidate_state_at_next_midnight"]["MONITORING_SOURCE_ONLY"],4)
  self.assertIsNone(report["realized_pnl_test_usdc"])
  self.assertEqual(report["actual_gpt_model_calls"],0)
  self.assertEqual(report["paper_buy_fills"],0)
  self.assertFalse(report["independent_original_period_data_delivery_proven"])
  with self.assertRaisesRegex(ValueError,"REPLAY_OUTPUT_MUST_BE_FRESH"):
   v4.run(start,end,self.root/"result",matrix,stub)

 def test_missing_source_day_cannot_be_replaced_by_synthetic_launches(self):
  matrix=self.root/"absent.csv"
  with matrix.open("w",newline="") as f:
   f.write("date,dataset_coverage,raw_parquet_sha256,captured_launch_count\n")
  with self.assertRaisesRegex(ValueError,"PINNED_NEUTRAL_SOURCE_DAY_GAP"):
   v4.run(date(2026,10,12),date(2026,10,21),self.root/"no",matrix,
    lambda *args:[])
if __name__=="__main__":unittest.main()
