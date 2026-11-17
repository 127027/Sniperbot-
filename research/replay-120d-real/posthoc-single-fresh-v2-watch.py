#!/usr/bin/env python3
"""Posthoc verification of V2 sole minute-fresh WATCH, after GPT decision freeze.
Never interpret a later provider label as a fill, profit, or input to that decision.
"""
import csv, hashlib, importlib.util, json,sys,tempfile
from pathlib import Path
from urllib.request import urlopen,Request
import pyarrow.parquet as pq
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("reviewed_nine",HERE/"posthoc-nine-watch-label-audit.py")
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
review_path=HERE/"reviews"/"2026-11-17-v2-single-fresh-gpt-review-before-outcomes.json"
out_path=HERE/"generated"/"r29-v2-fresh5-single-watch-posthoc-outcome.json"
launch_matrix=HERE/"results"/"neutral-solana-launch-120-day-coverage.csv"

def run():
 r=json.loads(review_path.read_text())
 if r.get("schema")!="r29_gpt_current_single_retro_v2_fresh5_decision.v1" or r.get("model_decision")!="WATCH" or r.get("posthoc_outcome_labels_used_in_this_decision") is not False:
  raise ValueError("NOT_FROZEN_PRE_OUTCOME_GPT_REVIEW")
 mint=r["coin"]["mint"];day=r["source_day_utc"]
 assert day=="2026-10-03"
 with launch_matrix.open(newline="") as f:
  rows={x["date"]:x for x in csv.DictReader(f)}
 expected=rows[day]["raw_parquet_sha256"]
 url=f"https://huggingface.co/datasets/{audit.DATASET}/resolve/{audit.SOURCE_REV}/data/launches/{day}.parquet?download=true"
 sha=hashlib.sha256()
 with tempfile.TemporaryDirectory(prefix="r29-v2-single-review-") as d:
  target=Path(d)/"launches.parquet"
  with urlopen(Request(url,headers={"User-Agent":"R29-FROZEN-V2-GPT-POSTHOC/1"}),timeout=120) as response,target.open("wb") as out:
   while True:
    b=response.read(131072)
    if not b:break
    if out.tell()+len(b)>audit.MAX_DAILY_BYTES:raise ValueError("SOURCE_TOO_LARGE")
    out.write(b);sha.update(b)
  # Different source classes: the frozen GPT review pins the minute-FEATURE parquet,
  # whereas this posthoc audit independently pins the LAUNCH parquet of that day.
  # Their hashes must NEVER be equated or treated as interchangeable files.
  if sha.hexdigest().lower()!=expected.lower():
   raise ValueError("PINNED_LAUNCH_PARQUET_SHA_MISMATCH")
  tab=pq.read_table(target,columns=list(audit.COLUMNS))
  matches=[x for x in tab.to_pylist() if x["mint"]==mint]
  if len(matches)>1:raise ValueError("DUPLICATE_MINT_SOURCE_ROW")
  if not matches:
   verdict={"match_status":"V2_MINT_NOT_IN_PINNED_PROVIDER_SOURCE",
    "mint":mint,"later_provider_graduated_label":None,"later_provider_rugged_rule_label":None,
    "rug_rule_event_after_virtual_scan":None,"realized_pnl_test_usdc":None}
  else:
   frozen={"mint":mint,"source_day_utc":day,"virtual_asof_utc":r["virtual_decision_at_utc"],
    "model_authored_research_recommendation":r["model_decision"]}
   verdict={"match_status":"MINT_MATCHES_PINNED_PROVIDER_SOURCE",**audit.assess_outcome(frozen,matches[0])}
 report={"schema":"r29_frozen_v2_fresh5_single_watch_later_labels.v1",
  "frozen_review_ref":str(review_path.relative_to(HERE)),
  "pinned_raw_launch_source_sha256":sha.hexdigest(),
  "independently_pinned_original_minute_feature_source_sha256":r["source_file_sha256"],
  "provider_response_postdates_virtual_scan":True,
  "posthoc_outcome_not_original_gpt_input":True,
  "result":verdict,
  "trade_profit_test_usdc":None,"actual_buy_orders":0,"actual_sell_orders":0,
  "warning":"No retrospectively labelled rug or graduation proves a tradeable entry/exit or missed profit."}
 out_path.parent.mkdir(parents=True,exist_ok=True)
 out_path.write_text(json.dumps(report,indent=2)+"\n")
 print("R29_FROZEN_V2_SINGLE_POSTHOC",json.dumps({k:verdict.get(k) for k in [
  "mint","match_status","later_provider_graduated_label",
  "later_provider_rugged_rule_label","rug_rule_event_after_virtual_scan",
  "provider_rug_rule_time_relative_to_scan_seconds"]}))
if __name__=="__main__":
 try:run()
 except Exception as e:
  print("R29_SINGLE_V2_AUDIT_ERROR",type(e).__name__,str(e),file=sys.stderr);sys.exit(1)
