#!/usr/bin/env python3
"""R29 V4: real historical minute features -> persistent as-of candidate research queue.

All original mint IDs are already in the complete 48h neutral source ledger.
No winner labels, ticker lookup, BUY/SELL strategy, model or local account access.
Only feature rows <= each simulated hourly checkpoint can influence priority.
"""
import argparse,csv,hashlib,json,math,sqlite3,tempfile
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
 conn.commit()

def apply_rows_until(conn,ordered,pos,cutoff,launch_times=None,feature_cache=None,eligible_cache=None,expiry_cache=None):
 processed=0;valid=0;unmatched=0
 while pos<len(ordered) and ordered[pos]["t"]<=cutoff:
  x=ordered[pos];pos+=1;processed+=1
  if not valid_row(x):continue
  mint=x["mint"];t=x["t"]
  # launch from original complete neutral source, not a pre-selected shortlist
  if launch_times is not None:
   t0=launch_times.get(mint)
  else:
   row=conn.execute("SELECT t0 FROM launches WHERE chain='solana' AND mint=?",
    (mint,)).fetchone()
   t0=row[0] if row else None
  if t0 is None:unmatched+=1;continue
  if t+0.002<t0:continue
  if feature_cache is not None:
   previous=feature_cache.get(mint)
  else:
   previous=conn.execute(
    "SELECT last_t,buys FROM asof_feature_state WHERE mint=?",(mint,)).fetchone()
  if previous and previous[0]>t:raise ValueError("FEATURE_STATE_NONCHRONOLOGICAL")
  prev={"t":previous[0],"buys":previous[1]} if previous else None
  info=priority(x,prev)
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
 return pos,{"rows_consumed":processed,"rows_joined_to_raw_launches":valid,
  "rows_without_matching_launch":unmatched}

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

def review_at_cached(eligible_cache,launch_times,expiry_cache,asof,page=0):
 """Fast deterministic as-of view, byte-equivalent fields to SQL review_at.

 O(number of currently eligible identities) instead of repeated JOIN+SORT of
 the entire ever-growing launch universe at every one of 408 hourly checks.
 The full neutral source ledger is never truncated or sampled.
 """
 if not finite(asof) or not isinstance(page,int) or page<0:
  raise ValueError("INVALID_ASOF_RESEARCH_PAGE")
 rows=[]
 for mint,(last_t,buys,reserve,score,reason) in eligible_cache.items():
  t0=launch_times.get(mint)
  expiry=expiry_cache.get(mint)
  if t0 is None or expiry is None:continue
  if t0<=asof and expiry>asof and last_t<=asof:
   rows.append((mint,t0,last_t,buys,reserve,score,reason))
 rows.sort(key=lambda r:(-r[5],-r[2],r[0]))
 n=len(rows)
 section=rows[page*REVIEW_BATCH_SIZE:(page+1)*REVIEW_BATCH_SIZE]
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
   for x in section],
  "this_is_not_an_actual_GPT_model_invocation":True,
  "paper_trade_execution_verified":False}

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
    # Single chronological sort. A future feature cannot leak into an earlier hour.
    usable=[e for e in events if finite(e.get("t")) and
     start_ts<=e["t"]<start_ts+86400]
    usable.sort(key=lambda e:(e["t"],str(e.get("mint",""))))
    pos=0;day_joined=0
    reviews=[]
    for hour in range(1,25):
     cutoff=start_ts+hour*3600
     with conn:
      pos,stats=apply_rows_until(conn,usable,pos,cutoff,launch_times,
       feature_cache,eligible_cache,expiry_cache)
     day_joined+=stats["rows_joined_to_raw_launches"]
     reviews.append(review_at_cached(eligible_cache,launch_times,expiry_cache,cutoff))
    if pos!=len(usable):raise ValueError("UNCONSUMED_ASOF_FEATURE_EVENTS")
    result["days"].append({
     "day":d,"sha256":expected[d]["sha256"],"original_rows":len(events),
     "rows_with_valid_clock":len(usable),
     "features_joined_to_known_tokens":day_joined,
     "hourly_asof_research_queue_frames":reviews,
     "real_model_calls":0,"real_trades":0})
    result["source_days"]+=1
    result["total_minute_feature_rows"]+=len(events)
    result["source_feature_rows_joined_to_all_neutral_launches"]+=day_joined
    result["total_technical_hourly_frames"]+=24
    result["reactivation_events_verified_asof"]=conn.execute(
     "SELECT count(*) FROM research_reactivations").fetchone()[0]
    print("R29_V4_ASOF_PRIORITY_DAY",d,len(events),
     "joined",day_joined,"end_hour_eligible",reviews[-1]["eligible_count_not_truncated"],flush=True)
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
