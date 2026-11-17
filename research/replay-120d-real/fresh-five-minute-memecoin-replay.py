#!/usr/bin/env python3
"""R29 fresh 5-minute historical candidate frames from pinned REAL Parquet.
No hindsight labels, no model calls, no price/position/fill creation.
This v2 experiment is INSAMPLE, informed by the earlier v1 audit; not an OOS test.
"""
import hashlib
import importlib.util
import json
import math
import tempfile
from datetime import datetime,timezone
from pathlib import Path
import pyarrow.parquet as pq

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("pinned_minute",HERE/"real-minute-feature-replay.py")
source=importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)
DAY_SECONDS=86400
FRESH_WINDOW_S=300
OUT=HERE/"generated"/"r29-fresh-5m-43d"

def fresh_day_frames(day,table,raw_columns):
 if set(source.SAFE)-set(table.schema.names):
  raise ValueError("FRESH_SAFE_COLUMNS_MISSING")
 if not set(raw_columns).intersection(source.BLOCKED):
  raise ValueError("NO_FUTURE_LABEL_BOUNDARY_PROVEN")
 t0=datetime.fromisoformat(day).replace(tzinfo=timezone.utc).timestamp()
 hours=[{} for _ in range(24)]
 sampled_hour=[0]*24
 examined_last5=[0]*24
 bad_rows=0
 for batch in table.to_batches(max_chunksize=16384):
  for f in batch.to_pylist():
   t=f.get("t")
   age=f.get("age_s")
   mint=f.get("mint")
   if not isinstance(t,(int,float)) or not math.isfinite(t) or not t0<=t<t0+DAY_SECONDS or not isinstance(mint,str) or not 32<=len(mint)<=44 or not isinstance(age,(int,float)) or not math.isfinite(age) or age<0:
    bad_rows+=1
    continue
   h=int((t-t0)//3600)
   at=t0+(h+1)*3600
   sampled_hour[h]+=1
   if t<at-FRESH_WINDOW_S:continue
   examined_last5[h]+=1
   # At decision time, token must STILL be <=5 min old, not just
   # have been <=5 min at the minute logger's earlier snapshot.
   if age+(at-t)>FRESH_WINDOW_S:continue
   prev=hours[h].get(mint)
   if prev is None or f["t"]>prev["t"]:
    hours[h][mint]=f
 frames=[]
 for h in range(24):
  at=t0+(h+1)*3600
  # Neutral newest observations from the prior 5m; never use profit
  # outcomes, later rugs, future graduation, any later pool returns.
  ordered=sorted(hours[h].values(),key=lambda r:(-r["t"],r["mint"]))[:8]
  candidates=[]
  for r in ordered:
   source.safe_asof(r,at)
   candidates.append({
    "observed_at_utc":source.iso(r["t"]),
    "age_at_scan_s":round(r["age_s"]+(at-r["t"]),4),
    "asof_features":r
   })
  frames.append({
   "at_utc":source.iso(at),
   "previous_hour_utc":h,
   "sampled_feature_rows_prior_hour":sampled_hour[h],
   "feature_rows_last_5min":examined_last5[h],
   "neutral_fresh_mints_within_5min":len(hours[h]),
   "last_eight_fresh_neutral_mints":candidates,
   "selection_rule":"LAST_5_MIN_RAW_OBSERVATIONS_COIN_AGE_AT_SCAN_MAX_300S_LATEST_MINT_SAMPLE",
   "no_future_outcomes":True,"gpt_model_calls":0,
   "independent_sellable_buy_sell_quotes":False,
   "paper_trades":None
  })
 return {
  "day":day,"schema":"r29_real_43day_fresh_5minute_asof_frames_v2",
  "model_asof_columns":list(source.SAFE),
  "source_forbidden_outcome_columns_excluded":sorted(set(raw_columns)&source.BLOCKED),
  "real_feature_rows":table.num_rows,"invalid_rows":bad_rows,
  "frames":frames,
  "fresh_candidate_occurrences":sum(len(f["last_eight_fresh_neutral_mints"]) for f in frames),
  "raw_feature_rows_last5":sum(examined_last5),
  "no_future_labels":True,"source_capture_released_after_historical_events":True,
  "model_calls":0,"paper_fills":0
 }

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 readme=source.fetch("README.md")
 expected=source.manifest(readme.decode())
 result={"schema":"r29_real_43day_fresh5m_asof_replay_v2",
  "source_readme_sha256":source.digest(readme),"source_revision":source.REV,
  "strategy_audit_created_after_v1_outcomes":True,
  "out_of_sample_validation":False,"actual_gpt_model_calls":0,
  "historical_paper_trades":0,"realized_pnl_test_usdc":None,
  "days_with_source":0,"source_rows":0,"fresh_candidate_occurrences":0,
  "raw_last5_rows":0,"hourly_frames":0,"days":[]}
 with tempfile.TemporaryDirectory(prefix="r29-fresh5-") as td:
  dest=Path(td)/"source.parquet"
  for day in source.DAYS:
   key=f"data/features/{day}.parquet"
   rows,bytes_,sha=expected[key]
   raw=source.fetch(key)
   if len(raw)!=bytes_ or source.digest(raw)!=sha:
    raise ValueError("RAW_PARQUET_PIN_MISMATCH_"+day)
   dest.write_bytes(raw)
   parquet=pq.ParquetFile(dest)
   if parquet.metadata.num_rows!=rows:
    raise ValueError("RAW_PARQUET_ROW_COUNT_CHANGED_"+day)
   table=parquet.read(columns=list(source.SAFE))
   x=fresh_day_frames(day,table,parquet.schema_arrow.names)
   x.update({"source_raw_parquet_sha256":sha,
    "source_url":source.URL+key})
   (OUT/(day+".json")).write_text(json.dumps(x,ensure_ascii=False,separators=(",",":"),allow_nan=False)+"\n")
   result["days_with_source"]+=1
   result["source_rows"]+=rows
   result["fresh_candidate_occurrences"]+=x["fresh_candidate_occurrences"]
   result["raw_last5_rows"]+=x["raw_feature_rows_last5"]
   result["hourly_frames"]+=24
   result["days"].append({"day_utc":day,"raw_source_sha256":sha,
    "fresh_candidate_occurrences":x["fresh_candidate_occurrences"],
    "raw_last5_rows":x["raw_feature_rows_last5"]})
   dest.unlink(missing_ok=True)
   print("R29_FRESH_5M_DAY",day,rows,x["fresh_candidate_occurrences"],flush=True)
 if result["days_with_source"]!=43 or result["source_rows"]!=5645886 or result["hourly_frames"]!=1032:
  raise ValueError("FRESH_REPLAY_INCOMPLETE_SOURCE")
 (OUT/"SUMMARY.json").write_text(json.dumps(result,indent=2)+"\n")
 print("R29_FRESH_5M_43D",json.dumps({k:result[k] for k in (
 "days_with_source","source_rows","hourly_frames","raw_last5_rows","fresh_candidate_occurrences",
 "out_of_sample_validation","actual_gpt_model_calls")}),flush=True)

if __name__=="__main__":main()
