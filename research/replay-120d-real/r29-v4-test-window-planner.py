#!/usr/bin/env python3
"""R29 V4 10-trial source readiness planner, NOT fake backtests.

Never consult any winner label, price outcome or user benchmark list.
Deliberately reserves 10 nonoverlapping trade periods (10d each) with
7d preparation. Reports unproven data days and GPT/fill gaps explicitly.
"""
import argparse,csv,json
from datetime import date,timedelta
from pathlib import Path

ROOT=Path(__file__).parent
MATRIX=ROOT/"results"/"neutral-solana-launch-120-day-coverage.csv"
MINUTE=ROOT/"results"/"REAL_60_DAY_EVIDENCE_MATRIX_43D_2026-11-16.csv"
def matrix(path):
 with open(path,encoding="utf8",newline="") as f:
  return {r.get("date") or r.get("day_utc"):r for r in csv.DictReader(f)}
def plan_ten_launch_windows(launches,minute,first=date(2026,8,31)):
 rows=[]
 for n in range(10):
  # Seven preparation days and ten nonoverlapping trade days.
  prep=first+timedelta(days=n*10)
  first_trade=prep+timedelta(days=7)
  end=first_trade+timedelta(days=9)
  prep_dates=[prep+timedelta(days=k) for k in range(7)]
  trade_dates=[first_trade+timedelta(days=k) for k in range(10)]
  all_dates=prep_dates+trade_dates
  raw_ok=[d for d in all_dates if
   launches.get(str(d),{}).get("dataset_coverage")=="THIRD_PARTY_RETROSPECTIVE_CAPTURE"]
  minute_ok=[d for d in all_dates if
   minute.get(str(d),{}).get("minute_asof_feature_rows_verified","") not in ("",None)]
  # A single day of swap logs for a small mint subset is not all-coin
  # historical size-adjusted executable bidirectional quote coverage.
  rows.append({
   "test_id":n+1,
   "preparation_start_utc":str(prep),
   "preparation_end_utc":str(prep+timedelta(days=6)),
   "trade_start_utc":str(first_trade),
   "trade_end_utc":str(end),
   "start_capital_reference_test_usdc":5000,
   "required_source_days":17,
   "sha_pinned_launch_source_days":len(raw_ok),
   "missing_launch_days":[str(d) for d in all_dates if d not in raw_ok],
   "minute_asof_feature_days":len(minute_ok),
   "full_neutral_source_days_attested":len(raw_ok)==17,
   "all_17_minute_signal_days_attested":len(minute_ok)==17,
   "historically_independent_unseen_window":False,
   "contemporaneous_live_october_delivery_proven":False,
   "gpt_model_strategy_invocations_proven":0,
   "historical_contract_executable_quotes_covered":False,
   "historical_order_fills":0,
   "historical_pnl_test_usdc":None,
   "status":"SOURCE_COVERED_NOT_AN_INDEPENDENT_TRADE_BACKTEST" if len(raw_ok)==17
    else "SOURCE_DAYS_MISSING_NOT_A_BACKTEST"
  })
 return {
  "schema":"sniper_r29_v4_ten_independent_trials_source_readiness.v1",
  "choice":"EARLIEST_CONTIGUOUS_RECORDING_7D_PREP_10D_NONOVERLAPPING_TRADING",
  "ten_trials_requested":10,
  "separate_seven_day_preparation_windows":True,
  "ten_day_trading_intervals_do_not_overlap":True,
  "historical_archive_is_retrospectively_published":True,
  "previously_exposed_historical_days_are_not_clean_holdouts":True,
  "available_consecutive_launch_source_days_only":sum(1 for x in rows if x["full_neutral_source_days_attested"]),
  "available_full_seventeen_day_minute_features_only":sum(1 for x in rows if x["all_17_minute_signal_days_attested"]),
  "actual_historical_GPT_driven_buy_sell_trading_tests_completed":0,
  "realized_historical_pnl_test_usdc":None,
  "next_step":"FIND_FOUR_MORE_17_DAY_SOURCE_WINDOWS_AND_INDEPENDENT_EXECUTION_QUOTES_OR_USE_PRE_REGISTERED_LIVE_FORWARD_TEST",
  "tests":rows
 }
def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--output",required=True,type=Path)
 a=parser.parse_args()
 result=plan_ten_launch_windows(matrix(MATRIX),matrix(MINUTE))
 a.output.parent.mkdir(parents=True,exist_ok=True)
 a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
 print("R29_V4_10_TRIAL_READINESS",json.dumps({
  k:result[k] for k in ("ten_trials_requested","available_consecutive_launch_source_days_only",
   "available_full_seventeen_day_minute_features_only",
   "actual_historical_GPT_driven_buy_sell_trading_tests_completed",
   "realized_historical_pnl_test_usdc")}))
if __name__=="__main__":main()
