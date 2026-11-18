#!/usr/bin/env python3
"""R29 V4: real historical minute features -> persistent as-of candidate research queue.

All original mint IDs are already in the complete 48h neutral source ledger.
No winner labels, ticker lookup, BUY/SELL strategy, model or local account access.
Only feature rows <= each simulated hourly checkpoint can influence priority.
"""
import argparse,csv,gzip,hashlib,json,math,sqlite3,tempfile
from collections import Counter
from datetime import date,datetime,timedelta,timezone
from pathlib import Path
from urllib.request import Request,urlopen

from importlib.util import spec_from_file_location,module_from_spec
BASE=Path(__file__).parent
spec=spec_from_file_location("v4capture",BASE/"r29-v4-complete-48h-source.py")
capture=module_from_spec(spec);spec.loader.exec_module(capture)

FEATURE_COLS=("mint","t","age_s","f_n_buys","f_rs","f_dev_share",
 "f_insider_share","f_bundle_wallets","flag_creator_sold",
 "flag_bundle_dumped","flag_pool_drained","quote_is_sol","mayhem")
SOURCE="https://huggingface.co/datasets/loopholetape/pumpfun-launches/resolve/"+capture.SOURCE_REV+"/"
REVIEW_BATCH_SIZE=64
def matrix(path):
 with open(path,encoding="utf8",newline="") as f:
  rows=list(csv.DictReader(f))
 return {r["day_utc"]:{"sha256":r["minute_feature_sha256"],
  "rows":int(r["minute_asof_feature_rows_verified"])}
   for r in rows if r.get("minute_feature_sha256") and r.get("minute_asof_feature_rows_verified")}
def finite(v):
 return isinstance(v,(int,float)) and math.isfinite(v)
def valid_row(x):
 if set(x)!=set(FEATURE_COLS):raise ValueError("FUTURE_FEATURE_COLUMNS_NOT_ALLOWED")
 return capture.valid_mint(x["mint"]) and finite(x["t"]) and \
  finite(x["age_s"]) and x["age_s"]>=0
def priority(x,prior=None):
 """Pure nonstrategic scan prioritization, never interpreted as GPT's trade."""
 buys=x.get("f_n_buys")
 reserve=x.get("f_rs") # reserve SOL, NOT dollar liquidity or sell quote!
 dev=x.get("f_dev_share")
 insider=x.get("f_insider_share")
 bundle=x.get("f_bundle_wallets")
 if not (finite(buys) and finite(reserve)) or buys<0 or reserve<0:
  return {"score":0,"eligible":False,"reason":"NO_OBSERVED_BUY_AND_RESERVE_SIGNAL"}
 if x.get("quote_is_sol") is not True:
  return {"score":0,"eligible":False,"reason":"NOT_SOL_RESERVE_EVIDENCE"}
 if x.get("flag_pool_drained") is True or x.get("flag_bundle_dumped") is True:
  return {"score":0,"eligible":False,"reason":"OBSERVED_POOL_OR_BUNDLE_RISK"}
 if x.get("mayhem") is True:
  return {"score":0,"eligible":False,"reason":"UNKNOWN_EXPERIMENTAL_LAUNCH_MODE"}
 if (finite(dev) and dev>0.2) or (finite(insider) and insider>0.3):
  return {"score":0,"eligible":False,"reason":"HIGH_OBSERVED_CONCENTRATION"}
 score=0
 if buys>=10:score+=2
 if buys>=30:score+=2
 if buys>=60:score+=1
 if reserve>=2:score+=2
 if reserve>=8:score+=1
 if reserve>=20:score+=1
 if x.get("flag_creator_sold") is True:score-=2
 # "velocity" only after two real sequential as-of observations; never
 # infer future price or next-hour momentum from a single feature row.
 if prior is not None and x["t"]>prior["t"] and finite(prior["buys"]):
  per_min=max(0.0,(buys-prior["buys"])*60/(x["t"]-prior["t"]))
  if per_min>=2:score+=1
 return {"score":score,"eligible":score>=4,
  "reason":"EARLY_BUY_ACTIVITY_AND_SOL_RESERVE_RESEARCH_ONLY" if score>=4
   else "INSUFFICIENT_ASOF_TECHNICAL_INTEREST"}

def init_priority(conn):
 conn.execute("CREATE TABLE IF NOT EXISTS asof_feature_state("
  "mint TEXT PRIMARY KEY, last_t REAL NOT NULL, buys REAL,"
  "sol_curve_reserve REAL, score REAL, eligible INTEGER, reason TEXT)")
 conn.execute("CREATE INDEX IF NOT EXISTS ix_features_review ON "
  "asof_feature_state(eligible,score DESC,last_t DESC)")
 conn.execute("CREATE TABLE IF NOT EXISTS research_reactivations ("
  "mint TEXT NOT NULL, observed_t REAL NOT NULL, prior_expires REAL NOT NULL,"
  "new_expires REAL NOT NULL, reason TEXT NOT NULL, "
  "PRIMARY KEY(mint,observed_t))")
 conn.execute("CREATE TABLE IF NOT EXISTS research_retention_events ("
  "mint TEXT NOT NULL, observed_t REAL NOT NULL, prior_expires REAL NOT NULL,"
  "new_expires REAL NOT NULL, reason TEXT NOT NULL, "
  "PRIMARY KEY(mint,observed_t))")
 conn.commit()

def apply_rows_until(conn,ordered,pos,cutoff,launch_times=None,feature_cache=None,eligible_cache=None,expiry_cache=None,audit_sink=None):
 processed=0;valid=0;unmatched=0;rejected=0;eligible_rows=0;reasons=Counter()
 def audit(mint,t,eligible,score,reason):
  nonlocal rejected,eligible_rows
  reasons[reason]+=1
  if eligible:eligible_rows+=1
  else:rejected+=1
  if audit_sink is not None:
   audit_sink({"mint":mint,"observed_t_unix":t,
    "eligible_asof_feature":bool(eligible),"technical_score":score,
    "reason":reason,"GPT_decision":None,"provider_call_made":False})
 while pos<len(ordered) and ordered[pos]["t"]<=cutoff:
  x=ordered[pos];pos+=1;processed+=1
  if not valid_row(x):
   audit(x.get("mint"),x.get("t"),False,0,"INVALID_ASOF_FEATURE_ROW")
   continue
  mint=x["mint"];t=x["t"]
  # launch from original complete neutral source, not a pre-selected shortlist
  if launch_times is not None:
   t0=launch_times.get(mint)
  else:
   row=conn.execute("SELECT t0 FROM launches WHERE chain='solana' AND mint=?",
    (mint,)).fetchone()
   t0=row[0] if row else None
  if t0 is None:
   unmatched+=1
   audit(mint,t,False,0,"NO_MATCHING_ORIGINAL_TOKEN_LAUNCH")
   continue
  if t+0.002<t0:
   audit(mint,t,False,0,"FEATURE_EVENT_BEFORE_ORIGINAL_LAUNCH")
   continue
  if feature_cache is not None:
   previous=feature_cache.get(mint)
  else:
   previous=conn.execute(
    "SELECT last_t,buys FROM asof_feature_state WHERE mint=?",(mint,)).fetchone()
  if previous and previous[0]>t:raise ValueError("FEATURE_STATE_NONCHRONOLOGICAL")
  prev={"t":previous[0],"buys":previous[1]} if previous else None
  info=priority(x,prev)
  audit(mint,t,info["eligible"],info["score"],info["reason"])
  # Extend only for NEW observed buy activity, not passive polling/age.
  # This is technical retention, never a BUY or GPT decision.
  if prev and finite(x["f_n_buys"]) and finite(prev["buys"]) and (
   x["f_n_buys"]-prev["buys"]>=5) and info["eligible"]:
   old_expires=expiry_cache.get(mint) if expiry_cache is not None else None
   if old_expires is None:
    row=conn.execute("SELECT expires FROM launches WHERE chain='solana' AND mint=?",(mint,)).fetchone()
    old_expires=row[0] if row else None
   if old_expires is None:raise ValueError("PREVIOUS_LAUNCH_EXPIRY_LOST")
   new_expires=max(old_expires,t+capture.OBSERVATION_SECONDS)
   if new_expires>old_expires:
    conn.execute("UPDATE launches SET expires=? WHERE chain='solana' AND mint=?",
     (new_expires,mint))
    if expiry_cache is not None:expiry_cache[mint]=new_expires
    conn.execute("INSERT OR IGNORE INTO research_retention_events VALUES(?,?,?,?,?)",
     (mint,t,old_expires,new_expires,
      "ASOF_NEW_OBSERVED_BUY_DELTA_MIN_5"))
    if t>=old_expires:
     conn.execute("INSERT OR IGNORE INTO research_reactivations VALUES(?,?,?,?,?)",
      (mint,t,old_expires,new_expires,
       "NEWLY_OBSERVED_BUY_DELTA_MIN_5_AND_CURRENT_TECHNICAL_SIGNAL"))
  # No automatic buy; a formerly rejected or expired mint can be surfaced
  # again ONLY after new point-in-time evidence and its technical risk checks.
  conn.execute("INSERT INTO asof_feature_state VALUES(?,?,?,?,?,?,?) "
   "ON CONFLICT(mint) DO UPDATE SET last_t=excluded.last_t,"
   "buys=excluded.buys,sol_curve_reserve=excluded.sol_curve_reserve,"
   "score=excluded.score,eligible=excluded.eligible,reason=excluded.reason",
   (mint,t,x["f_n_buys"] if finite(x["f_n_buys"]) else None,
    x["f_rs"] if finite(x["f_rs"]) else None,
    info["score"],int(info["eligible"]),info["reason"]))
  if feature_cache is not None:
   feature_cache[mint]=(t,x["f_n_buys"] if finite(x["f_n_buys"]) else None)
  if eligible_cache is not None:
   if info["eligible"]:
    eligible_cache[mint]=(t,x["f_n_buys"] if finite(x["f_n_buys"]) else None,
     x["f_rs"] if finite(x["f_rs"]) else None,info["score"],info["reason"])
   else:
    eligible_cache.pop(mint,None)
  valid+=1
 if processed!=eligible_rows+rejected:
  raise ValueError("PER_FEATURE_EXCLUSION_REASON_RECONCILIATION_FAILED")
 return pos,{"rows_consumed":processed,"rows_joined_to_raw_launches":valid,
  "rows_without_matching_launch":unmatched,
  "eligible_feature_events":eligible_rows,"excluded_feature_events":rejected,
  "event_reason_counts":dict(reasons)}

def review_at(conn,asof,page=0):
 """Covers ALL eligible identities via pages; page zero is not the universe."""
 if not finite(asof) or page<0 or not isinstance(page,int):
  raise ValueError("INVALID_ASOF_RESEARCH_PAGE")
 eligibility="""FROM launches l JOIN asof_feature_state f ON f.mint=l.mint
 WHERE l.t0<=? AND l.expires>? AND f.last_t<=? AND f.eligible=1"""
 args=(asof,asof,asof)
 total=conn.execute("SELECT count(*) "+eligibility,args).fetchone()[0]
 selected=conn.execute("SELECT l.mint,l.t0,f.last_t,f.buys,f.sol_curve_reserve,"
  "f.score,f.reason "+eligibility+
  " ORDER BY f.score DESC,f.last_t DESC,l.mint ASC LIMIT ? OFFSET ?",
  (*args,REVIEW_BATCH_SIZE,page*REVIEW_BATCH_SIZE)).fetchall()
 return {"asof_utc":capture.iso(asof),"eligible_count_not_truncated":total,
  "page":page,"page_size":REVIEW_BATCH_SIZE,
  "total_pages":(total+REVIEW_BATCH_SIZE-1)//REVIEW_BATCH_SIZE,
  "selected_for_possible_GPT_review":[{
   "chain":"solana","mint":x[0],"launch_at_utc":capture.iso(x[1]),
   "last_feature_observed_at_utc":capture.iso(x[2]),
   "observed_buy_count":x[3],"observed_SOL_curve_reserve_NOT_USDC_liquidity":x[4],
   "technical_priority_score_not_breakout_probability":x[5],
   "technical_reason":x[6],"GPT_decision":None,"gpt_model_call_made":False,
   "buy_sell_quote_verified":False
  } for x in selected],
  "this_is_not_an_actual_GPT_model_invocation":True,
  "paper_trade_execution_verified":False}

def ranked_eligible_at_cached(eligible_cache,launch_times,expiry_cache,asof):
 """One full-universe-free as-of sort; never hard-cap eligible identities.

 Every previously eligible-but-expired identity is accounted for separately,
 rather than silently lost. Historical rows arriving after asof are invalid.
 """
 if not finite(asof):raise ValueError("INVALID_ASOF_RESEARCH_TIME")
 rows=[]
 suppressed={"TECHNICALLY_ELIGIBLE_BUT_OBSERVATION_EXPIRED":0,
  "NOT_YET_LAUNCHED":0}
 for mint,(last_t,buys,reserve,score,reason) in eligible_cache.items():
  t0=launch_times.get(mint)
  expiry=expiry_cache.get(mint)
  if t0 is None or expiry is None:
   raise ValueError("ACTIVE_FEATURE_WITHOUT_CAPTURED_SOURCE_LAUNCH")
  if last_t>asof:raise ValueError("FUTURE_FEATURE_VISIBLE_IN_HISTORIC_REPLAY")
  if t0>asof:
   suppressed["NOT_YET_LAUNCHED"]+=1
  elif expiry<=asof:
   suppressed["TECHNICALLY_ELIGIBLE_BUT_OBSERVATION_EXPIRED"]+=1
  else:
   rows.append((mint,t0,last_t,buys,reserve,score,reason))
 rows.sort(key=lambda r:(-r[5],-r[2],r[0]))
 return rows,suppressed

def page_from_ranked(rows,asof,page=0):
 """Pure deterministic page representation, identical to legacy SQL output."""
 if not finite(asof) or not isinstance(page,int) or page<0:
  raise ValueError("INVALID_ASOF_RESEARCH_PAGE")
 n=len(rows)
 selected=rows[page*REVIEW_BATCH_SIZE:(page+1)*REVIEW_BATCH_SIZE]
 return {"asof_utc":capture.iso(asof),"eligible_count_not_truncated":n,
  "page":page,"page_size":REVIEW_BATCH_SIZE,
  "total_pages":(n+REVIEW_BATCH_SIZE-1)//REVIEW_BATCH_SIZE,
  "selected_for_possible_GPT_review":[{
   "chain":"solana","mint":x[0],"launch_at_utc":capture.iso(x[1]),
   "last_feature_observed_at_utc":capture.iso(x[2]),
   "observed_buy_count":x[3],
   "observed_SOL_curve_reserve_NOT_USDC_liquidity":x[4],
   "technical_priority_score_not_breakout_probability":x[5],
   "technical_reason":x[6],"GPT_decision":None,
   "gpt_model_call_made":False,"buy_sell_quote_verified":False}
   for x in selected],
  "this_is_not_an_actual_GPT_model_invocation":True,
  "paper_trade_execution_verified":False}

def review_at_cached(eligible_cache,launch_times,expiry_cache,asof,page=0):
 """Backwards-compatible single-page SQL-identical interface."""
 rows,_=ranked_eligible_at_cached(eligible_cache,launch_times,expiry_cache,asof)
 return page_from_ranked(rows,asof,page)

def research_shortlist_from_ranked(rows,asof,max_candidates=16):
 """Neutral 1..24 potential model frames/day, not model calls or trading.

 All candidates remain in hourly-pages. A small cross-bucket, capped set
 prevents old high cumulative-buy scores from monopolizing GPT attention.
 Source freshness and observation window are explicit. No winner IDs or
 future outcomes influence selection. Every nonchosen mint is DEFERRED,
 not removed from archival research.
 """
 if not 1<=max_candidates<=32:raise ValueError("INVALID_RESEARCH_QUEUE_BUDGET")
 eligible=[r for r in rows if 0<=asof-r[2]<=90*60]
 newly_observed=sorted((r for r in eligible if asof-r[2]<=20*60),
  key=lambda r:(-r[2],-r[5],r[0]))
 young_launch=sorted((r for r in eligible if asof-r[1]<=2*3600),
  key=lambda r:(-r[2],-r[5],r[0]))
 high=sorted((r for r in eligible if asof-r[2]<=60*60),
  key=lambda r:(-r[5],-r[2],r[0]))
 older_watch=sorted((r for r in eligible if asof-r[1]>2*3600),
  key=lambda r:(-r[2],-r[5],r[0]))
 picked={}
 for name,bucket,slots in (
  ("FRESH_EVENT_RESEARCH",newly_observed,6),
  ("YOUNG_LAUNCH_RESEARCH",young_launch,4),
  ("HIGH_ASOF_PRIORITY",high,4),
  ("OLDER_REACTIVATION_OR_CONTINUED_INTEREST",older_watch,2)):
  used=0
  for row in bucket:
   if row[0] in picked:continue
   picked[row[0]]=(name,row)
   used+=1
   if used>=slots or len(picked)>=max_candidates:break
 if len(picked)<max_candidates:
  for row in sorted(eligible,key=lambda r:(-r[2],-r[5],r[0])):
   if row[0] not in picked:picked[row[0]]=("REMAINING_FRESH_RESEARCH_CAPACITY",row)
   if len(picked)>=max_candidates:break
 out=[{"mint":r[0],"queue_reason":reason,
   "launch_at_utc":capture.iso(r[1]),
   "last_feature_observed_at_utc":capture.iso(r[2]),
   "technical_score_not_probability":r[5],
   "feature_age_seconds":round(asof-r[2],3),
   "launch_age_seconds":round(asof-r[1],3),
   "GPT_decision":None,"real_model_call_occurred":False,
   "buy_authorized":False}
  for reason,r in picked.values()]
 return {"asof_utc":capture.iso(asof),"not_a_model_call":True,
  "max_candidate_suggestions_for_one_possible_GPT_analysis":max_candidates,
  "selected_count":len(out),"model_input_suggestions":out,
  "deferred_by_capacity_not_lost":len(eligible)-len(out),
  "deferred_due_to_stale_feature_not_lost":len(rows)-len(eligible),
  "entire_eligible_set_in_full_paginated_archive":True}

def review_all_pages_at_cached(eligible_cache,launch_times,expiry_cache,asof):
 """Build all pages FROM ONE sorted asof state and verify losslessness."""
 ranked,excluded=ranked_eligible_at_cached(eligible_cache,launch_times,expiry_cache,asof)
 n=len(ranked)
 count=(n+REVIEW_BATCH_SIZE-1)//REVIEW_BATCH_SIZE
 pages=[page_from_ranked(ranked,asof,i) for i in range(count)]
 if sum(len(p["selected_for_possible_GPT_review"]) for p in pages)!=n or len({
  x["mint"] for p in pages for x in p["selected_for_possible_GPT_review"]})!=n:
  raise ValueError("CANDIDATE_PAGING_LOSS_OR_DUPLICATE")
 return pages,excluded,research_shortlist_from_ranked(ranked,asof)

def download_feature(day,target,expected):
 import pyarrow.parquet as pq
 url=SOURCE+"data/features/"+day+".parquet?download=true"
 h=hashlib.sha256();total=0
 with urlopen(Request(url,headers={"User-Agent":"R29-V4-Historical-AsOf-Feature-Only"}),
  timeout=80) as response, target.open("wb") as fp:
  while True:
   b=response.read(128*1024)
   if not b:break
   total+=len(b)
   if total>12_000_000:raise ValueError("FEATURE_FILE_OVERSIZE")
   h.update(b);fp.write(b)
 if h.hexdigest()!=expected["sha256"]:raise ValueError("PINNED_FEATURE_SHA_MISMATCH_"+day)
 pqfile=pq.ParquetFile(target)
 if pqfile.metadata.num_rows!=expected["rows"]:raise ValueError("FEATURE_ROW_COUNT_MISMATCH")
 if not set(FEATURE_COLS).issubset(pqfile.schema_arrow.names):
  raise ValueError("MISSING_POINT_IN_TIME_FEATURE_COLUMNS")
 return pqfile.read(columns=list(FEATURE_COLS)).to_pylist()

def sha256_file(fp):
 h=hashlib.sha256()
 with fp.open("rb") as f:
  while True:
   b=f.read(1024*1024)
   if not b:break
   h.update(b)
 return h.hexdigest()

def replay_features(source_dir,output,start,end,expected,read_day=download_feature):
 db=source_dir/"source-only-48h.sqlite"
 if not db.is_file():raise ValueError("COMPLETE_RAW_LAUNCH_LEDGER_NOT_AVAILABLE")
 conn=sqlite3.connect(db)
 init_priority(conn)
 # Disposable retrospective runner: cache immutable launch IDs and each
 # latest known feature to avoid millions of redundant SQLite SELECTs.
 # SQL still persists every upsert before the corresponding as-of checkpoint.
 raw_launches=list(conn.execute("SELECT mint,t0,expires FROM launches WHERE chain='solana'"))
 launch_times={r[0]:r[1] for r in raw_launches}
 expiry_cache={r[0]:r[2] for r in raw_launches}
 del raw_launches
 feature_cache={r[0]:(r[1],r[2]) for r in
  conn.execute("SELECT mint,last_t,buys FROM asof_feature_state")}
 eligible_cache={r[0]:(r[1],r[2],r[3],r[4],r[5]) for r in
  conn.execute("SELECT mint,last_t,buys,sol_curve_reserve,score,reason "
  "FROM asof_feature_state WHERE eligible=1")}
 output.parent.mkdir(parents=True,exist_ok=True)
 result={"schema":"sniper_r29_v4_all_asof_features_to_48h_research_queue.v1",
  "source_days":0,"total_minute_feature_rows":0,
  "source_feature_rows_joined_to_all_neutral_launches":0,
  "total_technical_hourly_frames":0,"gpt_model_calls":0,
  "fast_in_memory_asof_priority_index_used":True,
  "SQL_full_universe_JOIN_query_per_hour":False,
  "historical_PnL_TEST_USDC":None,
  "creator_wallet_diversity_independently_verified":False,
  "market_USDC_volume_or_executable_quote_verified":False,
  "source_original_live_delivery_verified":False,
  "technical_priority_only_no_strategy":True,
  "complete_pages_archive_written":True,
  "all_eligible_candidates_persisted_not_just_page_zero":True,
  "gpt_research_queue_is_technical_only_not_model_call":True,
  "max_suggestions_per_possible_hourly_gpt_review":16,
  "total_eligible_candidate_checkpoint_pairs":0,
  "total_exported_candidate_checkpoint_pairs":0,
  "total_candidate_pairs_deferred_but_preserved":0,
  "total_shortlist_suggestions_not_actual_model_calls":0,
  "total_feature_events_audited":0,
  "total_feature_events_not_eligible":0,
  "excluded_feature_reason_counts":{},
  "period_start":str(start),"period_end":str(end),
  "days":[]}
 try:
  with tempfile.TemporaryDirectory(prefix="r29-v4-asof-feature-") as tmp:
   f=Path(tmp)/"feature.parquet"
   for dayn in range((end-start).days+1):
    day=start+timedelta(days=dayn)
    d=str(day)
    if d not in expected:raise ValueError("MISSING_HISTORIC_FEATURE_DAY_"+d)
    events=read_day(d,f,expected[d])
    f.unlink(missing_ok=True)
    if len(events)!=expected[d]["rows"]:raise ValueError("FEATURE_ROW_COUNT_INVALID")
    start_ts=datetime.combine(day,datetime.min.time(),timezone.utc).timestamp()
    # Original chronological as-of rows ONLY. Invalid/out-of-day source rows
    # are explicitly archived with a reason rather than silently discarded.
    usable=[e for e in events if finite(e.get("t")) and
     start_ts<=e["t"]<start_ts+86400]
    usable.sort(key=lambda e:(e["t"],str(e.get("mint",""))))
    omitted_clock=[e for e in events if not (finite(e.get("t")) and
     start_ts<=e["t"]<start_ts+86400)]
    if len(usable)+len(omitted_clock)!=len(events):
     raise ValueError("SOURCE_ROW_CLOCK_RECONCILIATION_FAILED")
    page_path=output.parent/"hourly-pages"/(d+".jsonl.gz")
    decision_path=output.parent/"feature-decisions"/(d+".jsonl.gz")
    shortlist_path=output.parent/"model-shortlists"/(d+".jsonl.gz")
    for target in (page_path,decision_path,shortlist_path):
     target.parent.mkdir(parents=True,exist_ok=True)
    pos=0;day_joined=0
    day_eligible_events=0;day_rejected_events=0
    reasons=Counter();reviews=[];frame_index=[]
    with gzip.open(page_path,"wt",encoding="utf8",compresslevel=6) as pg, \
         gzip.open(decision_path,"wt",encoding="utf8",compresslevel=6) as audit, \
         gzip.open(shortlist_path,"wt",encoding="utf8",compresslevel=6) as mq:
     def audit_sink(record):
      audit.write(json.dumps(record,separators=(",",":"),ensure_ascii=False)+"\n")
     for x in omitted_clock:
      reasons["FEATURE_TIMESTAMP_NOT_IN_ORIGINAL_SOURCE_DAY"]+=1
      day_rejected_events+=1
      audit_sink({"mint":x.get("mint"),"observed_t_unix":x.get("t"),
       "eligible_asof_feature":False,"technical_score":0,
       "reason":"FEATURE_TIMESTAMP_NOT_IN_ORIGINAL_SOURCE_DAY",
       "GPT_decision":None,"provider_call_made":False})
     for hour in range(1,25):
      cutoff=start_ts+hour*3600
      with conn:
       pos,stats=apply_rows_until(conn,usable,pos,cutoff,launch_times,
        feature_cache,eligible_cache,expiry_cache,audit_sink=audit_sink)
      day_joined+=stats["rows_joined_to_raw_launches"]
      day_eligible_events+=stats["eligible_feature_events"]
      day_rejected_events+=stats["excluded_feature_events"]
      reasons.update(stats["event_reason_counts"])
      pages,suppressed,shortlist=review_all_pages_at_cached(
       eligible_cache,launch_times,expiry_cache,cutoff)
      eligible_count=pages[0]["eligible_count_not_truncated"] if pages else 0
      emitted=0
      for page in pages:
       pg.write(json.dumps(page,separators=(",",":"),ensure_ascii=False)+"\n")
       emitted+=len(page["selected_for_possible_GPT_review"])
      if emitted!=eligible_count:
       raise ValueError("CANDIDATE_PAGE_EXPORT_DROPPED_IDENTITIES")
      mq.write(json.dumps(shortlist,separators=(",",":"),ensure_ascii=False)+"\n")
      frame_index.append({
       "asof_utc":capture.iso(cutoff),"eligible_candidate_count":eligible_count,
       "full_pages_written":len(pages),"candidate_rows_written":emitted,
       "candidate_rows_not_exported":eligible_count-emitted,
       "review_queue_suggestions_not_actual_GPT_calls":shortlist["selected_count"],
       "deferred_by_GPT_budget_but_still_in_archive":
        shortlist["deferred_by_capacity_not_lost"],
       "stale_feature_deferred_but_still_in_archive":
        shortlist["deferred_due_to_stale_feature_not_lost"],
       "technical_retention_not_eligible_at_hour":suppressed})
      # Backwards compatible first-page summary, but it is not the full archive.
      reviews.append(pages[0] if pages else page_from_ranked([],cutoff))
      result["total_eligible_candidate_checkpoint_pairs"]+=eligible_count
      result["total_exported_candidate_checkpoint_pairs"]+=emitted
      result["total_candidate_pairs_deferred_but_preserved"]+=(
       shortlist["deferred_by_capacity_not_lost"]+
       shortlist["deferred_due_to_stale_feature_not_lost"])
      result["total_shortlist_suggestions_not_actual_model_calls"]+=shortlist["selected_count"]
    if pos!=len(usable):raise ValueError("UNCONSUMED_ASOF_FEATURE_EVENTS")
    if day_eligible_events+day_rejected_events!=len(events):
     raise ValueError("DAILY_PER_FEATURE_EXCLUSION_REASON_RECONCILIATION_FAILED")
    if sum(reasons.values())!=len(events):
     raise ValueError("DAILY_REASON_COUNTS_UNACCOUNTED")
    if any(f["candidate_rows_not_exported"] for f in frame_index):
     raise ValueError("SILENT_PAGING_LOSS")
    result["days"].append({
     "day":d,"sha256":expected[d]["sha256"],"original_rows":len(events),
     "rows_with_valid_clock":len(usable),
     "features_joined_to_known_tokens":day_joined,
     "daily_feature_events_technically_eligible":day_eligible_events,
     "daily_feature_events_not_eligible":day_rejected_events,
     "per_feature_event_reason_counts":dict(reasons),
     "complete_hourly_page_archive":{
      "path":str(page_path.relative_to(output.parent)),
      "sha256":sha256_file(page_path),
      "frames":24,"candidate_rows":sum(f["candidate_rows_written"] for f in frame_index)},
     "all_feature_decisions_archive":{
      "path":str(decision_path.relative_to(output.parent)),
      "sha256":sha256_file(decision_path),"rows":len(events)},
     "neutral_model_research_shortlists_archive":{
      "path":str(shortlist_path.relative_to(output.parent)),
      "sha256":sha256_file(shortlist_path),"frames":24},
     "hourly_asof_full_export_index":frame_index,
     "hourly_asof_research_queue_frames":reviews,
     "real_model_calls":0,"real_trades":0})
    result["total_feature_events_audited"]+=len(events)
    result["total_feature_events_not_eligible"]+=day_rejected_events
    combined=Counter(result["excluded_feature_reason_counts"])
    combined.update(reasons)
    result["excluded_feature_reason_counts"]=dict(combined)
    result["source_days"]+=1
    result["total_minute_feature_rows"]+=len(events)
    result["source_feature_rows_joined_to_all_neutral_launches"]+=day_joined
    result["total_technical_hourly_frames"]+=24
    result["reactivation_events_verified_asof"]=conn.execute(
     "SELECT count(*) FROM research_reactivations").fetchone()[0]
    print("R29_V4_ASOF_PRIORITY_DAY",d,len(events),
     "joined",day_joined,"end_hour_eligible",reviews[-1]["eligible_count_not_truncated"],flush=True)
  result["distinct_mints_with_joined_feature"]=len(feature_cache)
  result["source_launches_without_any_joined_feature"]=len(launch_times)-len(feature_cache)
  if result["total_feature_events_audited"]!=result["total_minute_feature_rows"]:
   raise ValueError("SOURCE_FEATURE_EVENT_AUDIT_INCOMPLETE")
  if result["total_eligible_candidate_checkpoint_pairs"]!=result["total_exported_candidate_checkpoint_pairs"]:
   raise ValueError("CANDIDATE_EXPORT_NOT_LOSSLESS")
 finally:conn.close()
 output.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n")
 return result
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument("--source-dir",type=Path,required=True)
 ap.add_argument("--output",type=Path,required=True)
 ap.add_argument("--from-date",required=True)
 ap.add_argument("--to-date",required=True)
 ap.add_argument("--feature-matrix",type=Path,default=BASE/"results"/"REAL_60_DAY_EVIDENCE_MATRIX_43D_2026-11-16.csv")
 a=ap.parse_args()
 report=replay_features(a.source_dir,a.output,capture.parse_day(a.from_date),
  capture.parse_day(a.to_date),matrix(a.feature_matrix))
 print("R29_V4_FEATURES",json.dumps({k:report[k] for k in (
  "source_days","total_minute_feature_rows",
  "source_feature_rows_joined_to_all_neutral_launches",
  "total_technical_hourly_frames","gpt_model_calls","historical_PnL_TEST_USDC")}))
if __name__=="__main__":main()
