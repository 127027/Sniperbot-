#!/usr/bin/env python3
"""R29 after-the-fact labels for nine FROZEN model-authored research decisions.

We intentionally read outcome columns ONLY after decisions were committed.
This is not a historical GPT execution or a trade/ROI calculation.
"""
import csv
import hashlib
import json
import math
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen
import pyarrow.parquet as pq

HERE=Path(__file__).resolve().parent
SOURCE_REV="9b9a04e7e3e85775d614d16105daad2e69ce8544"
DATASET="loopholetape/pumpfun-launches"
REVIEW=HERE/"reviews"/"2026-11-17-nine-watch-current-gpt-retrospective-review.json"
MATRIX=HERE/"results"/"neutral-solana-launch-120-day-coverage.csv"
OUTPUT=HERE/"generated"/"r29-nine-watch-posthoc-outcomes-20261117.json"
COLUMNS=("mint","launched_at","quote_asset","decoder_complete","mayhem",
 "graduated","migrate_dt_s","rugged","rug_dt_s","peak_rs","terminal_rs",
 "dev_first_sell_dt_s","rug_branch_inferred")
MAX_DAILY_BYTES=22_000_000

def utc(s):
 if not isinstance(s,str) or not s.endswith("Z"):
  raise ValueError("UTC_REQUIRED")
 return datetime.fromisoformat(s.replace("Z","+00:00"))

def safe_float(x):
 if isinstance(x,(int,float)) and math.isfinite(x):
  return float(x)
 return None

def after(scan_at,launched_at,dt_s):
 value=safe_float(dt_s)
 if value is None or value<0:
  return None
 return launched_at+timedelta(seconds=value)>scan_at

def assess_outcome(review,row):
 """Return posthoc separate outcome; never assign PnL or claim tradability."""
 if row.get("mint")!=review["mint"]:
  raise ValueError("OUTCOME_MINT_MISMATCH")
 asof=utc(review["virtual_asof_utc"])
 launched=utc(row["launched_at"])
 if launched>asof:
  raise ValueError("FUTURE_MINT_AT_ASOF_TIME")
 migrated=after(asof,launched,row.get("migrate_dt_s"))
 rugged_later=after(asof,launched,row.get("rug_dt_s"))
 grad=row.get("graduated")
 rug=row.get("rugged")
 if grad not in (None,0,1,False,True) or rug not in (None,0,1,False,True):
  raise ValueError("UNSUPPORTED_OUTCOME_LABEL")
 # Only a later market event; cannot represent a profitable trade.
 return {
  "source_day_utc":review["source_day_utc"],
  "virtual_asof_utc":review["virtual_asof_utc"],
  "mint":review["mint"],
  "frozen_gpt_research_recommendation":review["model_authored_research_recommendation"],
  "source_row_launched_at_utc":row["launched_at"],
  "provider_quote_asset_read_in_posthoc_audit":row.get("quote_asset"),
  "provider_decoder_complete":row.get("decoder_complete"),
  "provider_mayhem_mode":row.get("mayhem"),
  "later_provider_graduated_label":grad,
  "later_provider_rugged_rule_label":rug,
  "graduation_or_pool_sighting_after_virtual_scan":migrated,
  "rug_rule_event_after_virtual_scan":rugged_later,
  "rug_branch_posthoc":row.get("rug_branch_inferred"),
  "peak_curve_real_sol_reserve_not_price":safe_float(row.get("peak_rs")),
  "peak_reserve_measurement_unreliable":bool(
    safe_float(row.get("peak_rs")) is not None and
    (safe_float(row.get("peak_rs"))>85.1 or safe_float(row.get("peak_rs"))<0)),
  "historical_input_from_these_outcomes_used_at_decision":False,
  "roi_proven":False,"own_buy_fill_proven":False,"own_sell_fill_proven":False,
  "realized_pnl_test_usdc":None,
  "posthoc_rug_is_provider_observation_not_proven_fraud":True,
  "unverified_7day_spot_price_or_realizable_usdc_exit":True,
  "decision_may_be_retroactively_edited":False
 }

def load_matrix():
 with MATRIX.open(newline="",encoding="utf8") as f:
  rows={r["date"]:r for r in csv.DictReader(f)}
 if len(rows)!=120:raise ValueError("EXPECTED_120D_LAUNCH_MATRIX")
 return rows

def main():
 review=json.loads(REVIEW.read_text(encoding="utf8"))
 if review.get("schema")!="r29_current_gpt_nine_neutral_watch_asof_reviews_v1" or len(review.get("decisions",[]))!=9:
  raise ValueError("FROZEN_RESEARCH_DECISION_FILE_MISSING")
 matrix=load_matrix()
 seen_mints=set()
 for r in review["decisions"]:
  if r["mint"] in seen_mints or r["execution_status"]!="NO_ORDER_HISTORICAL_LIQUIDITY_AND_SELL_QUOTE_UNPROVEN":
   raise ValueError("INVALID_FROZEN_RESEARCH_DECISIONS")
  seen_mints.add(r["mint"])
 sources={}
 daily={}
 for day in sorted({r["source_day_utc"] for r in review["decisions"]}):
  expected=matrix[day]["raw_parquet_sha256"]
  if len(expected)!=64:
   raise ValueError("PINNED_LAUNCH_SHA_MISSING_"+day)
  config="launches_legacy" if day<="2026-09-26" else "launches"
  relative=f"data/{config}/{day}.parquet"
  url=f"https://huggingface.co/datasets/{DATASET}/resolve/{SOURCE_REV}/{relative}?download=true"
  req=Request(url,headers={"User-Agent":"R29-GPT-POSTHOC-LABELS-RESEARCH-ONLY/1"})
  sha=hashlib.sha256()
  with tempfile.TemporaryDirectory(prefix="r29-nine-watch-") as td:
   path=Path(td)/"provider.parquet"
   with urlopen(req,timeout=90) as remote,path.open("wb") as target:
    while True:
     buf=remote.read(131072)
     if not buf:break
     if target.tell()+len(buf)>MAX_DAILY_BYTES:
      raise ValueError("OVER_BOUNDED_DAILY_PARQUET")
     target.write(buf);sha.update(buf)
   got=sha.hexdigest()
   if got.lower()!=expected.lower():
    raise ValueError("PINNED_LAUNCH_SHA_MISMATCH_"+day)
   table=pq.read_table(path,columns=list(COLUMNS))
   mints={r["mint"] for r in review["decisions"] if r["source_day_utc"]==day}
   matches=[r for r in table.to_pylist() if r["mint"] in mints]
   if len({r["mint"] for r in matches})!=len(matches):
    raise ValueError("DUPLICATE_MATCHED_MINT_IN_PROVIDER_"+day)
   missing=mints-{r["mint"] for r in matches}
   if missing:
    print("R29_SOURCE_IDENTITY_GAP",day,sorted(missing),flush=True)
   daily.update({r["mint"]:r for r in matches})
   sources[day]={"pinned_raw_sha256":got,"rows":table.num_rows,"url":url,
    "source_was_published_after_historical_scans":True,
    "downloaded_for_posthoc_label_audit_only":True}
   print("NINE_WATCH_POSTHOC_DAY",day,len(matches),got,flush=True)
 findings=[]
 for r in review["decisions"]:
  if r["mint"] in daily:
   findings.append({"match_status":"IDENTITY_MATCHED_PINNED_LAUNCH",
      **assess_outcome(r,daily[r["mint"]])})
  else:
   findings.append({
    "match_status":"SOURCE_IDENTITY_GAP_UNMATCHED_IN_PINNED_LAUNCH",
    "source_day_utc":r["source_day_utc"],
    "virtual_asof_utc":r["virtual_asof_utc"],"mint":r["mint"],
    "frozen_gpt_research_recommendation":r["model_authored_research_recommendation"],
    "later_provider_graduated_label":None,"later_provider_rugged_rule_label":None,
    "rug_rule_event_after_virtual_scan":None,
    "graduation_or_pool_sighting_after_virtual_scan":None,
    "historical_input_from_these_outcomes_used_at_decision":False,
    "roi_proven":False,"own_buy_fill_proven":False,
    "own_sell_fill_proven":False,"realized_pnl_test_usdc":None,
    "unknown_outcome_due_to_provenance_mismatch":True,
    "decision_may_be_retroactively_edited":False
   })
 summary={"reviewed":len(findings),
  "matched_in_neutral_launch_table":len(daily),
  "unmatched_identity_count":len(findings)-len(daily),
  "research_watch":sum(r["frozen_gpt_research_recommendation"]=="WATCH" for r in findings),
  "research_no_trade":sum(r["frozen_gpt_research_recommendation"]=="NO_TRADE" for r in findings),
  "posthoc_provider_graduated_count":sum(r["later_provider_graduated_label"]==1 for r in findings),
  "posthoc_provider_rug_rule_count":sum(r["later_provider_rugged_rule_label"]==1 for r in findings),
  "posthoc_rug_after_scan_count":sum(r["rug_rule_event_after_virtual_scan"] is True for r in findings),
  "unknown_rug_rule_labels":sum(r["later_provider_rugged_rule_label"] is None for r in findings),
  "confirmed_personal_paper_buys":0,"confirmed_personal_paper_sells":0,
  "realizable_gpt_usdc_portfolio_pnl":None}
 out={"schema":"r29_nine_frozen_watch_posthoc_labels_v1",
  "source_revision":SOURCE_REV,"review_frozen_before_outcome_read":True,
  "source_original_publication_after_virtual_dates":True,
  "evaluation_at_actual_utc":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
  "summary":summary,"sources":sources,"outcomes":findings,
  "warnings":["Source outcomes are retrospective provider rules, not proof of fraud or profitable prices.",
   "No source outcome was available as a provider-published fact at these early virtual scans.",
   "A missed graduation is NOT a provably missed 10x profit; no executable entry and exit quotes.",
   "Rug and graduation labels can both be true on one coin.",
   "Unknown or non-SOL-quoted labels must remain unknown.",
   "Source identity mismatch is a hard data-quality gap, not a successful WATCH or a confirmed loss.",
   "Never feed this posthoc outcome report into the frozen 60-day research decisions."]}
 OUTPUT.parent.mkdir(parents=True,exist_ok=True)
 OUTPUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("R29_NINE_WATCH_POSTHOC",json.dumps(summary),flush=True)

if __name__=="__main__":
 try:main()
 except Exception as e:
  print("R29_NINE_WATCH_AUDIT_FAILED",type(e).__name__,str(e),file=sys.stderr)
  sys.exit(1)
