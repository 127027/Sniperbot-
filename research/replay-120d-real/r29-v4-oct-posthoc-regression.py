#!/usr/bin/env python3
"""Post-freeze known contract regression; NEVER imported by blind source collector."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

# This list is POSTHOC ground truth, not a technical discovery/priority criterion.
REFERENCE_GROUPS={
 "PIERRE":["D3S6J9s1byrNBt3ZKwEDiPsNRqHtoEP8zQKdhyBdpump",
  "8GroyR3X7C2qTWX33EY6T2tLYkvXFTuvoTExUVTApump"],
 "FTR":["DFMt2FyLpB6ekPNAzVErLXgpSnJ9CRf1VnxBAkTLpump"],
 "DACITY":["nxPqZ4F7ux8Vph5NFu25rEP6Kx9Gr1U6Fmj36Rjpump",
  "DKYcjobF7HPtL9RyQBRdeRQ2iWvizpfbgWwPWNXdpump"],
 "TRUMP_1":["2bCCHQadi4QeHWPKG3w13siCyWWQPgkFtniouTqVpump"]
}
def posthoc_regression(summary, launch_dir):
 if summary.get("schema")!="sniper_r29_v4_neutral_all_valid_launches_48h_retention.v1" or \
  summary.get("period_start")!="2026-10-05" or \
  summary.get("period_end")!="2026-10-21" or \
  summary.get("source_evidence_only_no_GPT_model_calls") is not True or \
  summary.get("actual_gpt_model_calls")!=0 or \
  summary.get("paper_buy_fills")!=0:
  raise ValueError("POSTHOC_REGRESSION_REQUIRES_SEALED_NEUTRAL_17D_SOURCE")
 sought={x for cases in REFERENCE_GROUPS.values() for x in cases}
 found={};all_count=0
 files=sorted(launch_dir.glob("*.jsonl.gz"))
 if len(files)!=17:raise ValueError("POSTHOC_NEUTRAL_FULL_SOURCE_DAYS_MISSING")
 for file in files:
  with gzip.open(file,"rt",encoding="utf8") as fp:
   for line in fp:
    x=json.loads(line)
    all_count+=1
    if x["mint"] in sought:
     if x["mint"] in found:raise ValueError("POSTHOC_DUPLICATE_CONTRACT")
     found[x["mint"]]=x
 if all_count!=summary["total_distinct_new_contracts"]:
  raise ValueError("POSTHOC_SEALED_FULL_CONTRACT_STREAM_COUNT_MISMATCH")
 out={}
 for case,mints in REFERENCE_GROUPS.items():
  seen=[{
   "mint":m,
   "source_launch_at_utc":found[m]["source_event_at_utc"],
   "first_technically_eligible_asof_utc":found[m]["eligible_simulated_asof_at_utc"],
   "retained_until_utc":found[m]["retain_until_utc"],
   "historical_live_source_delivery_verified":False,
   "GPT_research_decision_for_mint_verified":False,
   "executed_paper_buy_or_sell":False,
   "realized_pnl_test_usdc":None
  } for m in mints if m in found]
  out[case]={
   "expected_contracts":len(mints),"retained_in_neutral_all_market_stream":len(seen),
   "first_launch_observations":seen,
   "missing_contracts":[m for m in mints if m not in found],
   "technical_raw_capture_recall":len(seen)/len(mints),
   "not_a_GPT_early_detection_success_claim":True
  }
 return {
  "schema":"sniper_r29_v4_oct2026_posthoc_identity_recall.v1",
  "method":"COMPARE_KNOWN_CONTRACTS_AFTER_GENERAL_NEUTRAL_CAPTURE_IS_FROZEN",
  "source_summary_sha256":hashlib.sha256(
   json.dumps(summary,sort_keys=True,separators=(",",":")).encode()).hexdigest(),
  "separate_prior_320_mint_sticky_scan_hit_count":0,
  "new_capture_of_full_source_contracts_not_GPT_selection":True,
  "all_distinct_neutral_stream_mints":all_count,
  "cases":out,
  "all_groups_with_a_recorded_contract":
   sum(bool(x["retained_in_neutral_all_market_stream"]) for x in out.values()),
  "historical_pnl_test_usdc":None,
  "actual_historical_GPT_model_calls":0,
  "paper_order_fills":0,
  "benchmark_names_were_not_available_to_source_capture":True
 }
def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--source-dir",required=True,type=Path)
 parser.add_argument("--output",required=True,type=Path)
 a=parser.parse_args()
 summary=json.loads((a.source_dir/"SUMMARY.json").read_text())
 report=posthoc_regression(summary,a.source_dir/"all-launches")
 a.output.parent.mkdir(parents=True,exist_ok=True)
 a.output.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n")
 print("R29_V4_OCT_POSTHOC_GROUPS",
   report["all_groups_with_a_recorded_contract"],"/",len(REFERENCE_GROUPS))
 for k,v in report["cases"].items():
  print("POSTHOC_SOURCE_CAPTURE",k,
   v["retained_in_neutral_all_market_stream"],"/",v["expected_contracts"])
if __name__=="__main__":main()
