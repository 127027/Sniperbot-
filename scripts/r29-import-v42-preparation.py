#!/usr/bin/env python3
"""Import existing neutral GitHub artifact; no new market requests, no trading."""
import datetime as dt,gzip,hashlib,json,shutil,sys
from pathlib import Path
from collections import Counter
UTC=dt.timezone.utc
TICK=dt.datetime(2026,10,12,tzinfo=UTC).timestamp()
DAYS=[f"2026-10-{d:02}" for d in range(5,12)]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def epoch(s):return dt.datetime.fromisoformat(s.replace("Z","+00:00")).timestamp()
def rows(p):
 with gzip.open(p,"rt",encoding="utf8") as f:
  for line in f:yield json.loads(line)
def write(p,obj):p.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
def main(src,out):
 if out.exists():raise ValueError("IMPORT_ALREADY_EXISTS")
 sm=json.loads((src/"SUMMARY.json").read_text())
 q=json.loads((src/"ASOF_HOURLY_RESEARCH_QUEUE.json").read_text())
 expected=(src/"ORIGINAL_SOURCE_SUMMARY.sha256").read_text().split()[0]
 if sha(src/"SUMMARY.json")!=expected or sm["total_original_records"]!=821849 or q["total_feature_events_audited"]!=2296466 or q["total_exported_candidate_checkpoint_pairs"]!=310540:raise ValueError("SOURCE_MANIFEST_CHANGED")
 sd={r["date_utc"]:r for r in sm["daily_audit"]}
 qd={r["day"]:r for r in q["days"]}
 out.mkdir(parents=True)
 files=[];mints=set();raw_total=0;eligible_launches=0;feature_total=0;page_pairs=0;day_index=[]
 midnight_pages=[]
 for d in DAYS:
  day_counts={}
  for folder,field in [("all-launches",None),("feature-decisions","all_feature_decisions_archive"),("hourly-pages","complete_hourly_page_archive"),("model-shortlists","neutral_model_research_shortlists_archive")]:
   rel=Path(folder)/(d+".jsonl.gz")
   p=src/rel
   digest=sha(p)
   if field and (qd[d][field]["path"]!=str(rel) or qd[d][field]["sha256"]!=digest):raise ValueError("ARCHIVE_FILE_SHA_MISMATCH_"+str(rel))
   n=0;count=0
   for r in rows(p):
    n+=1
    if folder=="all-launches":
     if r["chain"]!="solana" or r["mint"] in mints or epoch(r["source_event_at_utc"])>=TICK or r["strategy_decision"] is not None:raise ValueError("INVALID_LAUNCH")
     mints.add(r["mint"]);eligible_launches+=epoch(r["eligible_simulated_asof_at_utc"])+60<TICK
    elif folder=="feature-decisions":
     if r["GPT_decision"] is not None or r["provider_call_made"] is not False:raise ValueError("NOT_NEUTRAL_AUDIT")
    elif folder=="hourly-pages":
     t=epoch(r["asof_utc"])
     if t>TICK:raise ValueError("FUTURE_FRAME")
     cs=r["selected_for_possible_GPT_review"];count+=len(cs)
     if any(epoch(c["last_feature_observed_at_utc"])>t or epoch(c["launch_at_utc"])>t or c["GPT_decision"] is not None for c in cs):raise ValueError("FUTURE_OR_STRATEGIC_PAGE")
     if t==TICK:midnight_pages.append(r)
    elif epoch(r["asof_utc"])>TICK:raise ValueError("FUTURE_SHORTLIST")
   if folder=="all-launches":
    if n!=sd[d]["new_contract_identities"]:raise ValueError("LAUNCH_COUNT_MISMATCH")
    raw_total+=n
   elif folder=="feature-decisions":
    if n!=qd[d][field]["rows"]:raise ValueError("FEATURE_AUDIT_COUNT_MISMATCH")
    feature_total+=n
   elif folder=="hourly-pages":
    if count!=qd[d][field]["candidate_rows"]:raise ValueError("PAGE_COUNT_MISMATCH")
    page_pairs+=count
   elif n!=24:raise ValueError("SHORTLIST_COUNT_MISMATCH")
   dest=out/"source-audit"/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
   if dest.stat().st_size>90_000_000:raise ValueError("GIT_FILE_LIMIT")
   files.append({"path":str(dest.relative_to(out)),"sha256":digest,"bytes":dest.stat().st_size,"rows":n,"source_manifest_sha_verified":field is not None})
   day_counts[folder]=n
  day_index.append({"date":d,"counts":day_counts})
 if raw_total!=351726 or feature_total!=939433:raise ValueError("SEVEN_DAY_RECONCILIATION")
 pages=sorted(midnight_pages,key=lambda p:p["page"])
 if not pages or [p["page"] for p in pages]!=list(range(pages[0]["total_pages"])):raise ValueError("MIDNIGHT_PAGE_GAP")
 cs=[c for p in pages for c in p["selected_for_possible_GPT_review"]]
 if len(cs)!=pages[0]["eligible_count_not_truncated"] or len({c["mint"] for c in cs})!=len(cs):raise ValueError("MIDNIGHT_TRUNCATION")
 # Old V4.2 pages had no explicit finality buffer. Strictly re-filter at the new boundary.
 safe=[];late=[];stale=0
 for c in cs:
  t=epoch(c["last_feature_observed_at_utc"])
  if t+60>=TICK or epoch(c["launch_at_utc"])+60>=TICK:
   late.append(c["mint"]);continue
  age=TICK-t;stale+=age>600
  safe.append({"chain":"solana","mint":c["mint"],"launch_at_utc":c["launch_at_utc"],"feature_at_utc":c["last_feature_observed_at_utc"],"knowledge_at_utc":dt.datetime.fromtimestamp(t+60,UTC).isoformat(),"observed_buy_count":c["observed_buy_count"],"observed_sol_curve_reserve":c["observed_SOL_curve_reserve_NOT_USDC_liquidity"],"technical_priority":c["technical_priority_score_not_breakout_probability"],"age_seconds":age,"quote_status":"UNKNOWN","risk_status":"UNKNOWN","needs_current_asof_refresh":age>600})
 packet={"kind":"R29_PREMIDNIGHT_RESEARCH_CANDIDATE_INDEX","tick_utc":"2026-10-12T00:00:00.000Z","source_run":44265274289,"source_class":"RETROSPECTIVE_RESEARCH_ONLY","no_oracle":True,"candidates":safe,"finality_deferred_mints":late,"prepared_trade_inputs":0}
 write(out/"midnight-candidates.json",packet)
 files.append({"path":"midnight-candidates.json","sha256":sha(out/"midnight-candidates.json"),"bytes":(out/"midnight-candidates.json").stat().st_size,"rows":len(safe)})
 report={"kind":"R29_V42_ARCHIVE_REUSE","source_run":44265274289,"source_artifact_id":14410027275,"source_summary_sha256":expected,"source_revision":sm["source_revision"],"window_start":"2026-10-05","window_end_exclusive":"2026-10-12","source_scope":"Solana Pump.fun historical launch identity and technical feature audit; not complete raw features or prices","launch_identities":raw_total,"launches_strict_finality":eligible_launches,"feature_audit_rows":feature_total,"hourly_frames":168,"candidate_checkpoint_pairs":page_pairs,"midnight_original_candidates":len(cs),"midnight_pages":len(pages),"midnight_after_finality":len(safe),"midnight_deferred_finality":len(late),"midnight_stale_gt_10m":stale,"days":day_index,"files":files,"external_market_calls":0,"prepared_trade_inputs":0,"valid_first_scan_started":False,"orders":0}
 write(out/"manifest.json",report)
 print("R29_V42_IMPORT_RESULT "+json.dumps({k:v for k,v in report.items() if k not in ["files","days"]}),flush=True)
if __name__=="__main__":main(Path(sys.argv[1]),Path(sys.argv[2]))
