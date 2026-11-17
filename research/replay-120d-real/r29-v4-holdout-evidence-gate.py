#!/usr/bin/env python3
"""R29 V4.1 holdout acceptance gate. No model invocation, fake fills or trading.

Outputs PASS only for externally VERIFIED independent three-test evidence.
An asserted JSON boolean alone is not an external provider attestation.
Operators must verify signatures, source and price independently *before*
setting attestation flags; this local checker validates structure and metrics.
Missing external evidence = INCONCLUSIVE, never paper profit or successful GPT.
"""
import argparse,json,math
from pathlib import Path

REQUIRED_EVIDENCE=(
 "independent_holdout_never_used_to_tune",
 "strategy_frozen_and_committed_before_first_outcome",
 "provider_model_invocations_externally_attested",
 "signed_gpt_buy_sell_authorizations_externally_verified",
 "time_sealed_inputs_and_availability_externally_attested",
 "neutral_all_valid_tokens_in_denominator",
 "buy_and_sell_executable_price_quotes_verified",
 "liquidity_sellability_fees_slippage_verified",
 "orders_and_fills_reconciled_against_isolated_paper_ledger"
)

def safe_num(value):
 return isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)

def evaluate(policy,holdouts):
 """Fail closed: no unverified hypothesis becomes a calculated PnL."""
 if len(holdouts)!=3 or len({h.get("test_id") for h in holdouts})!=3:
  return {"status":"INCONCLUSIVE","reason":"THREE_DISTINCT_HOLDOUTS_NOT_PROVEN","completed":0}
 for h in holdouts:
  evidence=h.get("evidence",{})
  absent=[k for k in REQUIRED_EVIDENCE if evidence.get(k) is not True]
  if absent:
   return {"status":"INCONCLUSIVE","reason":"EXTERNAL_EVIDENCE_GAP","missing":absent,
    "test_id":h.get("test_id"),"completed":0}
  calls=h.get("verified_daily_gpt_model_call_counts")
  if not isinstance(calls,list) or len(calls)!=10 or any(
   not isinstance(c,int) or isinstance(c,bool) or not 1<=c<=24 for c in calls):
   return {"status":"INCONCLUSIVE","reason":"REAL_1_TO_24_DAILY_GPT_CALLS_NOT_PROVEN",
    "test_id":h["test_id"],"completed":0}
  if h.get("source_days_including_warmup")!=17 or h.get("trade_days")!=10 or \
   h.get("initial_test_usdc")!=5000:
   return {"status":"INCONCLUSIVE","reason":"INDEPENDENT_7PLUS10_DAY_LEDGER_NOT_PROVEN",
    "test_id":h["test_id"],"completed":0}
 fields=("valid_source_launches","captured_source_launches","objective_verified_breakouts",
  "unique_breakouts_early_detected","GPT_watch_or_buy_signals",
  "GPT_watch_or_buy_later_verified_breakouts","technical_event_to_candidate_p95_min",
  "source_to_model_p95_min","net_realized_pnl_test_usdc",
  "maximum_equity_drawdown_fraction","maximum_one_day_realized_loss_fraction")
 for h in holdouts:
  for field in fields:
   if not safe_num(h.get(field)):
    return {"status":"INCONCLUSIVE","reason":"UNVERIFIED_REQUIRED_METRIC",
     "test_id":h.get("test_id"),"field":field,"completed":0}
  if h["valid_source_launches"]<=0 or h["captured_source_launches"]>h["valid_source_launches"] or \
   h["captured_source_launches"]<0:
   return {"status":"INCONCLUSIVE","reason":"INVALID_FULL_SOURCE_DENOMINATOR","completed":0}
  if h["unique_breakouts_early_detected"]>h["objective_verified_breakouts"] or \
   h["GPT_watch_or_buy_later_verified_breakouts"]>h["GPT_watch_or_buy_signals"]:
   return {"status":"INCONCLUSIVE","reason":"UNRECONCILED_BREAKOUT_COUNTS","completed":0}
  if h["maximum_equity_drawdown_fraction"]<0 or h["maximum_one_day_realized_loss_fraction"]<0:
   return {"status":"INCONCLUSIVE","reason":"NEGATIVE_RISK_METRIC_NOT_VALID","completed":0}
 p=policy
 min_count=p["detection_quality"]["minimum_objectively_labelled_winner_count_across_three_holdouts"]
 winners=sum(h["objective_verified_breakouts"] for h in holdouts)
 if winners<min_count:
  return {"status":"INCONCLUSIVE","reason":"TOO_FEW_INDEPENDENT_VERIFIED_BREAKOUTS",
   "observed_breakouts":winners,"required":min_count,"completed":3}
 found=sum(h["unique_breakouts_early_detected"] for h in holdouts)
 signals=sum(h["GPT_watch_or_buy_signals"] for h in holdouts)
 true_signals=sum(h["GPT_watch_or_buy_later_verified_breakouts"] for h in holdouts)
 if signals<1:
  return {"status":"INCONCLUSIVE","reason":"NO_GPT_WATCH_OR_BUY_TO_MEASURE_PRECISION",
   "completed":3}
 recall=found/winners
 precision=true_signals/signals
 capture_recall=sum(h["captured_source_launches"] for h in holdouts)/sum(
  h["valid_source_launches"] for h in holdouts)
 net=sum(h["net_realized_pnl_test_usdc"] for h in holdouts)
 profitable=sum(h["net_realized_pnl_test_usdc"]>0 for h in holdouts)
 drawdown=max(h["maximum_equity_drawdown_fraction"] for h in holdouts)
 daily_loss=max(h["maximum_one_day_realized_loss_fraction"] for h in holdouts)
 conditions={
  "source_capture_at_least_99_99_percent":
   capture_recall>=p["source_metrics"]["valid_launch_identity_capture_recall_min"],
  "technical_p95_under_5_minutes":
   max(h["technical_event_to_candidate_p95_min"] for h in holdouts)<=p[
    "source_metrics"]["event_to_technical_candidate_p95_minutes_max"],
  "model_p95_under_60_minutes":
   max(h["source_to_model_p95_min"] for h in holdouts)<=p[
    "detection_quality"]["source_to_model_p95_minutes_max"],
  "recall_at_least_60_percent":recall>=p["detection_quality"]["validated_recall_min"],
  "precision_at_least_20_percent":precision>=p["detection_quality"]["validated_precision_min"],
  "three_holdouts_net_positive":net>0,
  "at_least_two_profitable_holdouts":profitable>=p["performance"]["minimum_profitable_holdout_tests"],
  "worst_drawdown_at_most_20_percent":
   drawdown<=p["performance"]["max_ending_to_peak_equity_drawdown_fraction"],
  "worst_day_loss_at_most_5_percent":
   daily_loss<=p["performance"]["max_daily_realized_loss_fraction_of_day_open_equity"]
 }
 return {"status":"PASS" if all(conditions.values()) else "FAIL",
  "completed":3,"conditions":conditions,
  "metrics":{"source_capture_recall":capture_recall,"early_breakout_recall":recall,
   "GPT_watch_or_buy_precision":precision,"verified_breakout_count":winners,
   "verified_net_realized_pnl_test_usdc":net,"profitable_holdout_tests":profitable,
   "worst_max_drawdown_fraction":drawdown,
   "worst_daily_realized_loss_fraction":daily_loss},
  "warning":"This gate validates declared metrics; independent external evidence and signatures MUST be verified separately."}
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument("--policy",required=True,type=Path)
 ap.add_argument("--holdouts",required=True,type=Path)
 ap.add_argument("--output",required=True,type=Path)
 args=ap.parse_args()
 p=json.loads(args.policy.read_text())
 h=json.loads(args.holdouts.read_text())
 r=evaluate(p,h.get("holdouts",[]))
 args.output.parent.mkdir(parents=True,exist_ok=True)
 args.output.write_text(json.dumps(r,indent=2)+"\n")
 print("R29_V4_1_HOLDOUT_GATE",r["status"],r.get("reason","ALL_CHECKS_EVALUATED"))
 if r["status"]!="PASS":raise SystemExit(1)
if __name__=="__main__":main()
