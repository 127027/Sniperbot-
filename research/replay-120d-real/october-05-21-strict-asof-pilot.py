#!/usr/bin/env python3
"""R29 OCT 05-21 2026 strict as-of neutral historical *SOURCE* blind audit.

Works ONLY on existing pinned, hash-checked true recorded source frames.
No user conversation, 40 winner names, future outcomes, profit columns,
external paid APIs, wallet, GPT impersonation or synthetic fills.
This is a reproducible source/candidate/dispatch readiness test, not proof
of 17 days of actual historic GPT model calls.
"""
import argparse
import csv
import hashlib
import json
import math
import statistics
from datetime import date,datetime,timedelta,timezone
from pathlib import Path

SOURCE_REV="9b9a04e7e3e85775d614d16105daad2e69ce8544"
ORIGINAL_RUN=44048309420
ORIGINAL_ARTIFACT=14312891173
PREP=[date(2026,10,5)+timedelta(days=i) for i in range(7)]
TRADE=[date(2026,10,12)+timedelta(days=i) for i in range(10)]
ALL=PREP+TRADE
BTC=datetime(2026,10,5,tzinfo=timezone.utc)
SAFE_MODEL_FEATURES=frozenset(("mint","t","age_s","quote_asset",
 "quote_is_sol","mayhem","f_n_buys","f_dev_share","f_insider_share",
 "f_bundle_wallets","f_rs","flag_creator_sold","flag_bundle_dumped",
 "flag_pool_drained"))
NEVER_MODEL=frozenset(("rugged","graduated","peak_rs","terminal_rs",
 "migrate_dt_s","rug_dt_s","outcome_status","p_rug_within_300s",
 "p_true_graduation","rug_within_300s_after_row","rugged_before_row"))
ALLOWED_SCHEMA="r29_real_43day_fresh_5minute_asof_frames_v2"
BASE58=frozenset("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")
MAX_AGE_S=300

def iso(dt):
 return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")
def sec(value):
 if not isinstance(value,str) or not value.endswith("Z"):
  raise ValueError("R29_HISTORIC_UTC_REQUIRED")
 d=datetime.fromisoformat(value.replace("Z","+00:00"))
 if d.tzinfo is None:raise ValueError("R29_HISTORIC_UNTRUSTED_NAIVE_TIME")
 return d.timestamp()
def valid_mint(s):
 return isinstance(s,str) and 32<=len(s)<=44 and all(c in BASE58 for c in s)
def source_matrix(path):
 with open(path,newline="",encoding="utf-8") as f:
  rows=list(csv.DictReader(f))
 result={}
 for r in rows:
  day=r.get("day_utc")
  if day in {d.isoformat() for d in ALL}:
   if day in result:raise ValueError("R29_HISTORIC_DUPLICATE_MATRIX_DAY")
   result[day]=r
 if len(result)!=17:raise ValueError("R29_HISTORIC_MISSING_SOURCE_MATRIX_DAYS")
 return result

def accept_archived_day(day,archive,matrix):
 """Return strictly sealed 24 hourly frames, never outcome labels."""
 s=day.isoformat()
 if archive.get("schema")!=ALLOWED_SCHEMA or archive.get("day")!=s or \
  archive.get("no_future_labels") is not True or \
  archive.get("source_capture_released_after_historical_events") is not True or \
  archive.get("model_calls")!=0 or archive.get("paper_fills")!=0:
  raise ValueError("R29_HISTORIC_INVALID_SOURCE_PROVENANCE")
 if archive.get("source_raw_parquet_sha256")!=matrix["minute_feature_sha256"]:
  raise ValueError("R29_HISTORIC_SOURCE_PIN_MISMATCH")
 if not str(archive.get("source_url","")).endswith(
    "/"+SOURCE_REV+"/data/features/"+s+".parquet"):
  raise ValueError("R29_HISTORIC_SOURCE_REVISION_MISMATCH")
 forbidden=set(archive.get("source_forbidden_outcome_columns_excluded",[]))
 if not NEVER_MODEL.issubset(forbidden):
  raise ValueError("R29_HISTORIC_LABEL_BLACKLIST_NOT_PROVEN")
 if archive.get("real_feature_rows")!=int(matrix["minute_asof_feature_rows_verified"]):
  raise ValueError("R29_HISTORIC_MINUTE_ROW_COUNT_MISMATCH")
 frames=archive.get("frames")
 if not isinstance(frames,list) or len(frames)!=24:
  raise ValueError("R29_HISTORIC_MISSING_HOURLY_WINDOWS")
 day_start=datetime(day.year,day.month,day.day,tzinfo=timezone.utc)
 clean=[]
 for i,f in enumerate(frames):
  at=day_start+timedelta(hours=i+1)
  cutoff=at.timestamp()
  if abs(sec(f.get("at_utc"))-cutoff)>0.0001 or \
   f.get("no_future_outcomes") is not True or f.get("gpt_model_calls")!=0 or \
   f.get("independent_sellable_buy_sell_quotes") is not False or \
   f.get("paper_trades") is not None:
   raise ValueError("R29_HISTORIC_FUTURE_OR_FALSE_FILL_IN_FRAME")
  inp=f.get("last_eight_fresh_neutral_mints")
  if not isinstance(inp,list) or len(inp)>8:
   raise ValueError("R29_HISTORIC_TOO_MANY_CANDIDATES")
  out=[];seen=set()
  for c in inp:
   r=c.get("asof_features")
   if not isinstance(r,dict) or set(r)&NEVER_MODEL:
    raise ValueError("R29_HISTORIC_FUTURE_COLUMN_IN_RECORD")
   if not isinstance(r.get("t"),(int,float)) or not math.isfinite(r["t"]) or \
     r["t"]>cutoff or r["t"]<day_start.timestamp() or \
     abs(sec(c.get("observed_at_utc"))-r["t"])>0.003:
    raise ValueError("R29_HISTORIC_PRELAUNCH_FUTURE_OR_WRONG_TIMESTAMP")
   mint=r.get("mint")
   age=c.get("age_at_scan_s")
   if not valid_mint(mint) or mint in seen or \
    not isinstance(age,(int,float)) or not math.isfinite(age) or \
    age<0 or age>MAX_AGE_S+0.0001 or not math.isfinite(float(r.get("age_s",float('nan')))) or \
    r["age_s"]<0 or abs(age-(r["age_s"]+cutoff-r["t"]))>0.15:
    raise ValueError("R29_HISTORIC_INVALID_OR_STALE_MINT")
   seen.add(mint)
   # Only original as-of metadata; no outcome, no symbol, no later success.
   features={k:r[k] for k in SAFE_MODEL_FEATURES if k in r}
   if any(isinstance(v,float) and not math.isfinite(v) for v in features.values()):
    raise ValueError("R29_HISTORIC_NONFINITE_FEATURE")
   out.append({"mint":mint,"first_observed_at_utc":c["observed_at_utc"],
     "age_at_scan_s":age,"technical_asof_features":features,
     "trading_authorized":False,
     "contract_safety_independently_verified":False,
     "historical_usdc_bidirectional_execution_quote_proven":False})
  clean.append({"at_utc":iso(at),"candidate_count":len(out),
    "observed_neutral_mints":out,
    "full_historic_market_universe_claimed":False,
    "source_complete_for_provider_only":True,
    "future_outcomes_visible":False})
 return clean

def daily_review_count(prev_metric,training_metrics):
 """A predeclared availability-only research cadence, not GPT model scans.

 All choices are made from earlier calendar days and seven prep days.
 No future price, rug, graduation, known winners, or later success.
 """
 baseline=statistics.median(training_metrics)
 if baseline<=0:return 1
 ratio=prev_metric/baseline
 return 24 if ratio>=1.75 else 12 if ratio>=1.20 else 4 if ratio>=0.55 else 1

def evenly_spaced_hours(n):
 if n not in (1,4,12,24):raise ValueError("R29_INVALID_DAILY_CADENCE")
 return [24*i//n for i in range(1,n+1)]

def replay(root,matrix_path):
 matrix=source_matrix(matrix_path)
 prepared={}
 for day in ALL:
  try:
   raw=json.loads((root/(day.isoformat()+".json")).read_text(encoding="utf-8"))
  except (OSError,json.JSONDecodeError) as e:
   raise ValueError("R29_HISTORIC_MISSING_OR_INVALID_DAY_"+day.isoformat()) from e
  frames=accept_archived_day(day,raw,matrix[day.isoformat()])
  prepared[day.isoformat()]={
   "frames":frames,"fresh_market_activity_previous_available_daily":
    sum(f.get("neutral_fresh_mints_within_5min",0) for f in raw["frames"]),
   "source_sha256":raw["source_raw_parquet_sha256"],
   "launches_recorded_source_matrix":
    int(matrix[day.isoformat()]["historic_launch_record_count"]),
   "minute_rows":int(matrix[day.isoformat()]["minute_asof_feature_rows_verified"])
  }
 training=[prepared[day.isoformat()]["fresh_market_activity_previous_available_daily"]
    for day in PREP]
 reports=[];raw_calendar_hourly=0
 for day in TRADE:
  k=day.isoformat()
  prev=(day-timedelta(days=1)).isoformat()
  n=daily_review_count(
   prepared[prev]["fresh_market_activity_previous_available_daily"],training)
  frames=prepared[k]["frames"]
  checkpoints=[frames[h-1] for h in evenly_spaced_hours(n)]
  addresses=sorted({item["mint"] for f in checkpoints for item in f["observed_neutral_mints"]})
  reports.append({
   "day_utc":k,"phase":"TRADE_TEST",
   "train_only_window":"2026-10-05_to_2026-10-11",
   "initial_daily_frequency_policy_from_prior_asof_only":n,
   "planned_research_checkpoints_utc":[f["at_utc"] for f in checkpoints],
   "technical_asof_source_frames_read":24,
   "selected_asof_source_frames_for_possible_GPT_review":len(checkpoints),
   "candidate_occurrences_at_selected_checkpoints":sum(f["candidate_count"] for f in checkpoints),
   "distinct_neutral_candidate_mints_at_selected_checkpoints":len(addresses),
   "candidate_mints_at_selected_checkpoints":addresses,
   "candidate_evidence_checkpoint_frames":checkpoints,
   "security_sold_quote_status":"UNAVAILABLE_AT_HISTORICAL_ASOF",
   "GPT_model_invocations_really_performed_for_this_virtual_day":0,
   "historical_GPT_BUY_decisions_verified":0,
   "historical_GPT_HOLD_decisions_verified":0,
   "historical_GPT_SELL_decisions_verified":0,
   "historical_GPT_NO_TRADE_decisions_verified":0,
   "mechanical_executor_reason":"MISSING_SIZE_SPECIFIC_CONTRACT_LP_SELLABILITY_AND_TWO_WAY_QUOTES",
   "technical_trade_permission":"BLOCKED_DATA_GAP",
   "paper_BUY_fills":0,"paper_SELL_fills":0,
   "realizable_pnl_test_usdc":None,
   "source_provenance_sha256":prepared[k]["source_sha256"],
   "historic_launch_capture_count":prepared[k]["launches_recorded_source_matrix"],
   "historic_minute_feature_rows":prepared[k]["minute_rows"],
   "not_a_profit_backtest":True
  })
  raw_calendar_hourly+=24
 total_train=sum(prepared[d.isoformat()]["launches_recorded_source_matrix"] for d in PREP)
 total_test=sum(prepared[d.isoformat()]["launches_recorded_source_matrix"] for d in TRADE)
 return {
  "schema":"r29_oct05_21_strict_asof_source_only_replay.v1",
  "mode":"HISTORICAL_RESEARCH_ONLY",
  "recorded_original_artifact_run":ORIGINAL_RUN,
  "recorded_original_artifact_id":ORIGINAL_ARTIFACT,
  "source_revision":SOURCE_REV,
  "retrospective_source_release_after_simulated_period":True,
  "contemporaneous_data_delivery_for_2026_october_independently_proven":False,
  "winner_names_or_retrospective_pnl_as_model_input":False,
  "preparation_utc":"2026-10-05_to_2026-10-11",
  "paper_trade_period_utc":"2026-10-12_to_2026-10-21",
  "start_capital_test_usdc":5000,
  "cash_if_no_trades_executed_test_usdc":5000,
  "realized_strategy_return_verified":False,
  "realized_pnl_test_usdc":None,
  "full_17_calendar_days_source_audited":17,
  "seven_preparation_days_raw_launches_observed":total_train,
  "ten_trade_days_raw_launches_observed":total_test,
  "ten_trade_days_technical_hourly_source_frames":raw_calendar_hourly,
  "ten_trade_days_research_checkpoints_planned":sum(x["initial_daily_frequency_policy_from_prior_asof_only"] for x in reports),
  "ten_trade_days_unique_neutral_sample_candidates":len(set(
   mint for x in reports for mint in x["candidate_mints_at_selected_checkpoints"])),
  "actual_historical_GPT_model_strategy_calls":0,
  "actual_historical_gpt_authored_signed_orders":0,
  "actual_historical_buy_fills":0,
  "actual_historical_sell_fills":0,
  "historical_independent_sellability_verified":False,
  "historical_costed_both_way_swap_quotes_verified":False,
  "historical_local_paper_account_executed":False,
  "historical_PnL_unverifiable_not_zero":True,
  "status":"ASOF_SOURCE_REPLAY_COMPLETED_GPT_AND_EXECUTION_UNPROVEN",
  "reasons":["Only 43-day retrospective fresh source samples, not full chain universe",
   "All market features stripped to as-of shortlist; no known winner names or future success labels",
   "Daily schedule derives exclusively from 05-11 prep baseline and preceding day market activity; this is a technical proposal, not actual GPT calls",
   "Historical mint/holder/LP security and size-specific bidirectional fill data absent",
   "No real GPT model was called at each simulated October scan timestamp",
   "No authenticated local Paper fills or realized sale receipts in isolated historic account"],
  "day_by_day":reports
 }

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--input-dir",required=True,type=Path)
 p.add_argument("--matrix",default=str(Path(__file__).parent/"results"/"REAL_60_DAY_EVIDENCE_MATRIX_43D_2026-11-16.csv"))
 p.add_argument("--output",required=True,type=Path)
 args=p.parse_args()
 x=replay(args.input_dir,Path(args.matrix))
 args.output.parent.mkdir(parents=True,exist_ok=True)
 args.output.write_text(json.dumps(x,indent=2,ensure_ascii=False,allow_nan=False)+"\n",encoding="utf-8")
 print("R29_OCT05_21_STRICT_ASOF_REPLAY",json.dumps({
  k:x[k] for k in ("full_17_calendar_days_source_audited",
    "seven_preparation_days_raw_launches_observed",
    "ten_trade_days_raw_launches_observed",
    "ten_trade_days_technical_hourly_source_frames",
    "ten_trade_days_research_checkpoints_planned",
    "ten_trade_days_unique_neutral_sample_candidates",
    "actual_historical_GPT_model_strategy_calls",
    "actual_historical_buy_fills","actual_historical_sell_fills",
    "realized_pnl_test_usdc","status")},sort_keys=True),flush=True)
 for d in x["day_by_day"]:
  print("R29_OCT_ASOF_DAY",d["day_utc"],d["initial_daily_frequency_policy_from_prior_asof_only"],
   d["distinct_neutral_candidate_mints_at_selected_checkpoints"],
   d["technical_trade_permission"],flush=True)

if __name__=="__main__":main()
