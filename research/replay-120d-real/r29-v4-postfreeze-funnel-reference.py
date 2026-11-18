#!/usr/bin/env python3
"""R29 V4.2 POSTFREEZE reference explanation. Never imported by neutral collector.

Only after a SHA-verified, outcome-free all-token replay has been sealed:
read the full pages and neutral per-feature reasons, THEN check known references.
This is regression diagnostics only, NOT a new independent GPT blindtest.
"""
import argparse, gzip,hashlib,importlib.util,json
from collections import Counter
from datetime import datetime,timezone
from pathlib import Path

HERE=Path(__file__).parent
spec=importlib.util.spec_from_file_location("posthoc",HERE/"r29-v4-oct-posthoc-regression.py")
posthoc=importlib.util.module_from_spec(spec);spec.loader.exec_module(posthoc)
def iso(t):
 return datetime.fromtimestamp(t,timezone.utc).isoformat().replace("+00:00","Z") if isinstance(t,(float,int)) else None
def sha256(path):
 h=hashlib.sha256()
 with path.open("rb") as fp:
  for data in iter(lambda:fp.read(1024*1024),b""):h.update(data)
 return h.hexdigest()
def lines_gz(path):
 with gzip.open(path,"rt",encoding="utf8") as fp:
  for line in fp:yield json.loads(line)
def trace_postfreeze(directory):
 summary=json.loads((directory/"SUMMARY.json").read_text())
 neutral=posthoc.posthoc_regression(summary,directory/"all-launches")
 q=json.loads((directory/"ASOF_HOURLY_RESEARCH_QUEUE.json").read_text())
 if not q.get("all_eligible_candidates_persisted_not_just_page_zero") or \
  q.get("total_technical_hourly_frames")!=408 or q.get("gpt_model_calls")!=0 or \
  q.get("total_exported_candidate_checkpoint_pairs")!=q.get("total_eligible_candidate_checkpoint_pairs"):
  raise ValueError("POSTFREEZE_REQUIRES_COMPLETE_SEALED_NEUTRAL_QUEUE")
 targets={mint:name for name,mints in posthoc.REFERENCE_GROUPS.items() for mint in mints}
 states={mint:{"group":name,"mint":mint,
  "first_feature_observed_at_utc":None,
  "first_technically_eligible_feature_at_utc":None,
  "first_priority_score_not_probability":None,
  "first_exported_full_page_at_utc":None,
  "first_exported_page":None,"first_exported_rank":None,
  "first_possible_GPT_shortlist_at_utc":None,"first_shortlist_reason":None,
  "technical_exclusion_event_reasons":Counter(),
  "observed_asof_feature_event_count":0,
  "actual_historical_GPT_model_invocations_for_this_mint":0,
  "actual_historical_GPT_WATCH_BUY_SELL":None,
  "independently_executable_historical_quotes_verified":False,
  "realized_historical_PnL_TEST_USDC":None} for mint,name in targets.items()}
 total_pages=0;total_page_rows=0;full_frames=0;total_audit_rows=0
 for day in q["days"]:
  index={f["asof_utc"]:f for f in day["hourly_asof_full_export_index"]}
  if len(index)!=24:raise ValueError("POSTFREEZE_MISSING_24_HOURLY_FRAMES")
  archive_paths=[(key,directory/day[key]["path"]) for key in (
   "complete_hourly_page_archive","all_feature_decisions_archive",
   "neutral_model_research_shortlists_archive")]
  for key,path in archive_paths:
   if not path.is_file() or sha256(path)!=day[key]["sha256"]:
    raise ValueError("POSTFREEZE_ARCHIVE_HASH_MISMATCH_"+key)
  frames_seen={t:{"pages":set(),"rows":0,"mints":set()} for t in index}
  for p in lines_gz(archive_paths[0][1]):
   t=p["asof_utc"]
   if t not in index:raise ValueError("PAGE_FOR_UNEXPECTED_ASOF")
   state=frames_seen[t]
   if p["page"] in state["pages"]:raise ValueError("DUPLICATE_ASOF_PAGE")
   state["pages"].add(p["page"])
   if p["total_pages"]!=index[t]["full_pages_written"] or \
    p["eligible_count_not_truncated"]!=index[t]["eligible_candidate_count"]:
    raise ValueError("PAGE_COUNT_CHANGED_SINCE_FROZEN_REPLAY")
   items=p["selected_for_possible_GPT_review"]
   state["rows"]+=len(items);total_page_rows+=len(items);total_pages+=1
   for slot,row in enumerate(items):
    mint=row["mint"]
    if mint in state["mints"]:raise ValueError("DUPLICATE_CANDIDATE_ACROSS_PAGES")
    state["mints"].add(mint)
    if mint in states and states[mint]["first_exported_full_page_at_utc"] is None:
     dest=states[mint];dest["first_exported_full_page_at_utc"]=t
     dest["first_exported_page"]=p["page"]
     dest["first_exported_rank"]=p["page"]*64+slot+1
  for t,f in index.items():
   seen=frames_seen[t]
   if seen["pages"]!=set(range(f["full_pages_written"])) or \
     seen["rows"]!=f["eligible_candidate_count"] or \
     seen["rows"]!=f["candidate_rows_written"]:
    raise ValueError("POSTFREEZE_FULL_PAGE_RECONCILIATION_FAILED_"+t)
  full_frames+=len(index)
  daily_events=0
  for row in lines_gz(archive_paths[1][1]):
   daily_events+=1
   mint=row.get("mint")
   if mint not in states:continue
   state=states[mint]
   state["observed_asof_feature_event_count"]+=1
   at=iso(row.get("observed_t_unix"))
   if at and state["first_feature_observed_at_utc"] is None:
    state["first_feature_observed_at_utc"]=at
   if row["eligible_asof_feature"]:
    if state["first_technically_eligible_feature_at_utc"] is None:
     state["first_technically_eligible_feature_at_utc"]=at
     state["first_priority_score_not_probability"]=row["technical_score"]
   else:
    state["technical_exclusion_event_reasons"][row["reason"]]+=1
  if daily_events!=day["original_rows"]:
   raise ValueError("POSTFREEZE_MISSING_PER_FEATURE_REASON")
  total_audit_rows+=daily_events
  for frame in lines_gz(archive_paths[2][1]):
   if frame["asof_utc"] not in index:raise ValueError("SHORTLIST_WRONG_CLOCK")
   if frame["selected_count"]!=len(frame["model_input_suggestions"]):
    raise ValueError("SHORTLIST_COUNT_MISMATCH")
   for row in frame["model_input_suggestions"]:
    mint=row["mint"]
    if mint in states and states[mint]["first_possible_GPT_shortlist_at_utc"] is None:
     dest=states[mint]
     dest["first_possible_GPT_shortlist_at_utc"]=frame["asof_utc"]
     dest["first_shortlist_reason"]=row["queue_reason"]
 if full_frames!=408 or total_page_rows!=q["total_eligible_candidate_checkpoint_pairs"] or \
  total_audit_rows!=q["total_minute_feature_rows"]:
  raise ValueError("POSTFREEZE_ARCHIVE_GLOBAL_RECONCILIATION_FAILED")
 for mint,state in states.items():
  state["technical_exclusion_event_reasons"]=dict(state["technical_exclusion_event_reasons"])
  launch=next((x for x in neutral["cases"][state["group"]]["first_launch_observations"]
   if x["mint"]==mint),None)
  state["original_token_launch_at_utc"]=launch["source_launch_at_utc"] if launch else None
  state["captured_in_original_source"]=launch is not None
  if state["first_possible_GPT_shortlist_at_utc"] and state["first_exported_full_page_at_utc"] is None:
   raise ValueError("MODEL_SHORTLIST_CANDIDATE_WITHOUT_FULL_SOURCE_PAGE")
  state["model_input_reached_in_actual_historical_replay"]=False
  if not state["first_technically_eligible_feature_at_utc"]:
   state["why_no_GPT_shortlist"]="NO_ASOF_FEATURE_EVER_TECHNICALLY_ELIGIBLE"
  elif not state["first_exported_full_page_at_utc"]:
   state["why_no_GPT_shortlist"]="ELIGIBLE_FEATURE_BUT_NOT_ACTIVE_ON_ANY_HOURLY_RESEARCH_FRAME"
  elif not state["first_possible_GPT_shortlist_at_utc"]:
   state["why_no_GPT_shortlist"]="PRESENT_IN_COMPLETE_PAGES_BUT_DEFERRED_BY_CADENCE_OR_FRESHNESS"
  else:
   state["why_no_GPT_shortlist"]=None
 def gap(a,b):
  if not a or not b:return None
  return round((datetime.fromisoformat(b.replace("Z","+00:00"))-
    datetime.fromisoformat(a.replace("Z","+00:00"))).total_seconds()/60,3)
 for state in states.values():
  launch=state["original_token_launch_at_utc"]
  state["launch_to_first_eligible_feature_min"]=gap(launch,state["first_technically_eligible_feature_at_utc"])
  state["launch_to_first_full_page_min"]=gap(launch,state["first_exported_full_page_at_utc"])
  state["launch_to_first_possible_model_shortlist_min"]=gap(launch,state["first_possible_GPT_shortlist_at_utc"])
 return {"schema":"r29_v4_2_postfreeze_reference_full_funnel_trace.v1",
  "source_only_no_winner_name_was_available_to_prioritizer":True,
  "this_is_POSTFREEZE_regression_NOT_independent_blindtest":True,
  "source_original_delivery_in_2026_unverified":True,
  "source_17days":17,"asof_hourly_frames_verified":full_frames,
  "complete_pages_verified":total_pages,"all_candidate_pairs_verified":total_page_rows,
  "all_feature_events_audited":total_audit_rows,
  "actual_historical_GPT_model_calls":0,"historical_verified_paper_BUY_or_SELL_fills":0,
  "historical_PnL_TEST_USDC":None,
  "references":states}
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument("--source-dir",type=Path,required=True)
 ap.add_argument("--output",type=Path,required=True)
 args=ap.parse_args()
 report=trace_postfreeze(args.source_dir)
 args.output.parent.mkdir(parents=True,exist_ok=True)
 args.output.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n")
 print("R29_V4_2_POSTFREEZE_ALL_PAGES",report["all_candidate_pairs_verified"])
 for key,row in report["references"].items():
  print("R29_V4_2_POSTFREEZE_REFERENCE",row["group"],key,
   "launch",row["original_token_launch_at_utc"],
   "first_technical",row["first_technically_eligible_feature_at_utc"],
   "first_page",row["first_exported_full_page_at_utc"],"rank",row["first_exported_rank"],
   "first_possible_GPT_queue",row["first_possible_GPT_shortlist_at_utc"],
   "real_historical_model_decision",row["actual_historical_GPT_WATCH_BUY_SELL"])
if __name__=="__main__":main()
