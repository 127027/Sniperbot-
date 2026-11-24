import datetime as dt,gzip,hashlib,json,sys
from pathlib import Path
from collections import defaultdict
UTC=dt.timezone.utc
start=dt.datetime(2026,10,12,tzinfo=UTC)
end=start+dt.timedelta(days=1)
def stamp(s):return dt.datetime.fromisoformat(s.replace("Z","+00:00"))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rows(p):
 with gzip.open(p,"rt",encoding="utf8") as f:
  for line in f:yield json.loads(line)
def write(p,x):p.write_text(json.dumps(x,indent=2,ensure_ascii=False)+"\n")
src=Path(sys.argv[1]);out=Path(sys.argv[2])
if out.exists():raise ValueError("OUTPUT_ALREADY_EXISTS")
summary=src/"SUMMARY.json"
if sha(summary)!="1273e6fd93f4fd1008ac01b11aa09a69f2340a44b59e84c77d18b3a6ac0c2c30":raise ValueError("PINNED_SOURCE_SUMMARY_CHANGED")
q=json.loads((src/"ASOF_HOURLY_RESEARCH_QUEUE.json").read_text())
if q["total_feature_events_audited"]!=2296466 or q["total_exported_candidate_checkpoint_pairs"]!=310540:raise ValueError("SOURCE_COUNTS")
daily={x["day"]:x for x in q["days"]}
groups=defaultdict(list)
for day in ["2026-10-11","2026-10-12"]:
 rel="hourly-pages/"+day+".jsonl.gz";p=src/rel
 meta=daily[day]["complete_hourly_page_archive"]
 if meta["path"]!=rel or sha(p)!=meta["sha256"]:raise ValueError("SOURCE_PAGE_DIGEST")
 n=0
 for r in rows(p):
  n+=len(r["selected_for_possible_GPT_review"])
  t=stamp(r["asof_utc"])
  if start<=t<end:groups[t].append(r)
 if n!=meta["candidate_rows"]:raise ValueError("SOURCE_PAGE_COUNT")
out.mkdir(parents=True)
report=[]
for i in range(24):
 t=start+dt.timedelta(hours=i)
 pages=sorted(groups.get(t,[]),key=lambda r:r["page"])
 if not pages:raise ValueError("MISSING_FRAME "+str(t))
 if [r["page"] for r in pages]!=list(range(pages[0]["total_pages"])):raise ValueError("MISSING_PAGE "+str(t))
 allc=[c for r in pages for c in r["selected_for_possible_GPT_review"]]
 if len(allc)!=pages[0]["eligible_count_not_truncated"] or len({c["mint"] for c in allc})!=len(allc):raise ValueError("TRUNCATION_OR_DUPLICATE")
 good=[];deferred=[]
 for c in allc:
  f,l=stamp(c["last_feature_observed_at_utc"]),stamp(c["launch_at_utc"])
  if f>t or l>t or c["GPT_decision"] is not None or c["buy_sell_quote_verified"] is not False:raise ValueError("FUTURE_OR_NONNEUTRAL_INPUT")
  available=max(f,l)+dt.timedelta(seconds=60)
  if available>=t:deferred.append(c["mint"]);continue
  age=(t-f).total_seconds()
  good.append({"mint":c["mint"],"chain":"solana","launch_at_utc":c["launch_at_utc"],"feature_at_utc":c["last_feature_observed_at_utc"],"modeled_available_at_utc":available.isoformat(),"observed_buy_count":c["observed_buy_count"],"reported_sol_curve_reserve_not_usdc_liquidity":c["observed_SOL_curve_reserve_NOT_USDC_liquidity"],"technical_priority_not_probability":c["technical_priority_score_not_breakout_probability"],"feature_age_seconds":age,"risk_status":"UNKNOWN","quote_status":"UNKNOWN","execution_authorized":False})
 frame={"kind":"R29_SEALED_RESEARCH_FRAME_NOT_TRADE_INPUT","tick_utc":t.isoformat(),"scan":i+1,"source_run":44265274289,"source_scope":"Solana Pump.fun archived technical eligibility only; not comprehensive discovery or complete minute price history","candidates":good,"deferred_count":len(deferred),"deferred_mints":deferred,"original_provider_delivery_proven":False,"trade_inputs_ready":0,"actual_gpt_reviews":0}
 target=out/f"scan-{i+1:02}.json.gz"
 with gzip.open(target,"wt",encoding="utf8") as f:json.dump(frame,f,separators=(",",":"))
 report.append({"scan":i+1,"utc":t.isoformat(),"original_candidates":len(allc),"strict_asof_candidates":len(good),"recent_10m":sum(c["feature_age_seconds"]<=600 for c in good),"deferred_finality":len(deferred),"frame_path":str(target),"sha256":sha(target),"status":"INPUT_PARTIAL_NOT_EXECUTED","BUY":None,"HOLD":None,"SELL":None})
pre=json.loads(Path("research/preparation/decision-input/manifest.json").read_text())
if pre["prepared_trade_inputs"]!=0:raise ValueError("PREPARATION_CHANGED_REASSESS")
result={"kind":"R29_USER_REQUESTED_BACKTEST_START_PREFLIGHT","day_utc":"2026-10-12","source_run":44265274289,"frames_prepared":len(report),"scope":"24 archived Solana candidate frames; source data not a complete historical market, no executable quote or risk proof","preparation_status":"BLOCKED_BEFORE_SCAN_1","pending_midnight_evidence_jobs":pre["evidence_jobs"],"starting_budget_test_usdc":5000,"stake_test_usdc":50,"actual_gpt_reviews":0,"valid_backtest_scans":0,"confirmed_model_fills":0,"pnl":None,"ending_balance":None,"new_market_requests":0,"orders":0,"rows":report}
write(out/"manifest.json",result)
print("R29_BACKTEST_START_PREFLIGHT "+json.dumps(result,separators=(",",":")),flush=True)
