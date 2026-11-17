#!/usr/bin/env python3
"""R29 V4 complete neutral launch ingestion + cross-day >=48-hour research retention.

Historical SOURCE replay only. Not a GPT invocation, shortlist, trading signal,
security assessment or fill. Original late-published event timestamps establish
a hypothetical as-of boundary, not contemporaneous historical provider delivery.
No retrospective winning identities or outcomes are read.
"""
import argparse
import csv
import gzip
import hashlib
import json
import math
import sqlite3
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE_REV="9b9a04e7e3e85775d614d16105daad2e69ce8544"
SOURCE_BASE="https://huggingface.co/datasets/loopholetape/pumpfun-launches/resolve/"+SOURCE_REV+"/"
SOURCE_COLS=("mint","creator","t0","launched_at")
SOURCE_FORBIDDEN=("rugged","graduated","peak_rs","terminal_rs","migrate_dt_s","rug_dt_s","f10_rep_rug","f60_rs")
B58=frozenset("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")
OBSERVATION_SECONDS=48*3600
DAY_SECONDS=86400
MAX_DAY_BYTES=22_000_000
UTC=timezone.utc
HERE=Path(__file__).resolve().parent
MATRIX=HERE/"results"/"neutral-solana-launch-120-day-coverage.csv"
MANIFEST_SCHEMA="sniper_r29_v4_neutral_all_valid_launches_48h_retention.v1"

def parse_day(x):
 d=date.fromisoformat(x)
 if d.strftime("%Y-%m-%d")!=x:raise ValueError("UNTRUSTED_DAY")
 return d
def unixtime(x):
 if not isinstance(x,str) or not x.endswith("Z"):raise ValueError("UTC_LAUNCH_REQUIRED")
 t=datetime.fromisoformat(x.replace("Z","+00:00"))
 if t.utcoffset()!=timedelta(0):raise ValueError("UTC_OFFSET_REQUIRED")
 return t.timestamp()
def iso(t):
 return datetime.fromtimestamp(t,UTC).isoformat(timespec="microseconds").replace("+00:00","Z")
def valid_mint(x):
 return isinstance(x,str) and 32<=len(x)<=44 and all(c in B58 for c in x)
def sha(data):
 return hashlib.sha256(data).hexdigest()
def pinned_days(matrix_path):
 with open(matrix_path,newline="",encoding="utf-8") as f:rows=list(csv.DictReader(f))
 result={}
 for row in rows:
  if row.get("dataset_coverage")!="THIRD_PARTY_RETROSPECTIVE_CAPTURE":
   continue
  d=row.get("date")
  if not d:continue
  if d in result:raise ValueError("DUPLICATE_DAY_IN_PINNED_MATRIX")
  if len(row.get("raw_parquet_sha256",""))!=64:raise ValueError("DAY_MISSING_SHA_PIN")
  result[d]={
   "sha256":row["raw_parquet_sha256"],
   "expected_records":int(row["captured_launch_count"])
  }
 return result

def normalized_event(x,day):
 """Only creator+mint+launch timestamp. No later outcome fields, even falsy."""
 if set(x)!=set(SOURCE_COLS):raise ValueError("RETROSPECTIVE_LAUNCH_FIELD_LEAK")
 mint=x["mint"]
 if not valid_mint(mint):return None,"INVALID_MINT"
 when=x["t0"]
 if not isinstance(when,(float,int)) or not math.isfinite(when):
  return None,"INVALID_LAUNCH_TIMESTAMP"
 start=datetime.combine(parse_day(day),datetime.min.time(),UTC).timestamp()
 if not start<=when<start+DAY_SECONDS:
  return None,"LAUNCH_OUTSIDE_DAY"
 if not isinstance(x["launched_at"],str):
  return None,"MISSING_EVENT_ISO"
 try:original=unixtime(x["launched_at"])
 except (ValueError,TypeError):return None,"INVALID_EVENT_ISO"
 if abs(original-when)>0.002:return None,"EVENT_TIME_MISMATCH"
 creator=x["creator"]
 if not valid_mint(creator):return None,"INVALID_CREATOR_ADDRESS"
 return {"chain":"solana","mint":mint,"creator":creator,
  "source_event_at_utc":iso(when),"eligible_simulated_asof_at_utc":iso(when),
  "retain_until_utc":iso(when+OBSERVATION_SECONDS),
  "source_original_publication_delay_verified":False,
  "source_historic_live_delivery_verified":False,
  "technical_observation_only":True,
  "strategy_decision":None,"GPT_model_call_id":None,
  "paper_order_id":None},None

def init_db(conn):
 conn.execute("PRAGMA journal_mode=WAL")
 conn.execute("CREATE TABLE IF NOT EXISTS launches ("
  "chain TEXT NOT NULL, mint TEXT NOT NULL, t0 REAL NOT NULL, "
  "expires REAL NOT NULL, creator TEXT NOT NULL,"
  "PRIMARY KEY(chain,mint))")
 conn.execute("CREATE INDEX IF NOT EXISTS ix_launches_expires ON launches(expires)")
 conn.execute("CREATE INDEX IF NOT EXISTS ix_launches_t0 ON launches(t0)")
 conn.commit()

def ingest_day_records(conn,day,records,gzip_path):
 """One source day, sorted chronologically; NEVER truncate/success-rank."""
 clean=[];reasons={}
 for raw in records:
  r,reason=normalized_event(raw,day)
  if reason:reasons[reason]=reasons.get(reason,0)+1
  else:clean.append(r)
 clean.sort(key=lambda r:(r["eligible_simulated_asof_at_utc"],r["mint"]))
 written=0;duplicates=0
 gzip_path.parent.mkdir(parents=True,exist_ok=True)
 with gzip.open(gzip_path,"wt",encoding="utf-8",compresslevel=6) as out:
  with conn:
   for r in clean:
    t=unixtime(r["eligible_simulated_asof_at_utc"])
    cursor=conn.execute("INSERT OR IGNORE INTO launches(chain,mint,t0,expires,creator) VALUES(?,?,?,?,?)",
      (r["chain"],r["mint"],t,t+OBSERVATION_SECONDS,r["creator"]))
    if cursor.rowcount:
     out.write(json.dumps(r,ensure_ascii=False,separators=(",",":"))+"\n")
     written+=1
    else:
     previous=conn.execute("SELECT t0,creator FROM launches WHERE chain=? AND mint=?",
      (r["chain"],r["mint"])).fetchone()
     if previous is None or abs(previous[0]-t)>0.002 or previous[1]!=r["creator"]:
      raise ValueError("DUPLICATE_MINT_WITH_CONFLICTING_LAUNCH_IDENTITY")
     duplicates+=1
 return {"raw_records":len(records),"accepted_records":len(clean),
  "new_contract_identities":written,"same_identity_duplicates":duplicates,
  "invalid_records_by_reason":reasons}

def active_at(conn,asof_timestamp):
 """Do not remove persisted records; lifecycle is computed AS-OF query."""
 return conn.execute("SELECT count(*) FROM launches WHERE t0<=? AND expires>?",
  (asof_timestamp,asof_timestamp)).fetchone()[0]
def recorded_before(conn,asof_timestamp):
 return conn.execute("SELECT count(*) FROM launches WHERE t0<=?",
  (asof_timestamp,)).fetchone()[0]
def candidate_asof(conn,mint,asof_timestamp):
 record=conn.execute("SELECT t0,expires FROM launches WHERE chain='solana' AND mint=?",
  (mint,)).fetchone()
 if not record or asof_timestamp<record[0]:return "NOT_YET_LAUNCHED"
 # In a historical replay, the persisted expires field can be extended by
 # an event seen LATER. Time-travel queries must reconstruct the original
 # expiry and only include retention extensions observable by this clock.
 retention_available=conn.execute(
  "SELECT 1 FROM sqlite_master WHERE type='table' AND name='research_retention_events'"
 ).fetchone() is not None
 expires=record[1]
 if retention_available:
  previous=conn.execute(
   "SELECT max(new_expires) FROM research_retention_events "
   "WHERE mint=? AND observed_t<=?",(mint,asof_timestamp)).fetchone()[0]
  expires=max(record[0]+OBSERVATION_SECONDS,
   previous if previous is not None else record[0]+OBSERVATION_SECONDS)
 if asof_timestamp<expires:return "MONITORING_SOURCE_ONLY"
 return "EXPIRED_SOURCE_ONLY"

def download_day(day,target,expected):
 import pyarrow.parquet as pq
 folder="launches_legacy" if day<="2026-09-26" else "launches"
 url=SOURCE_BASE+"data/"+folder+"/"+day+".parquet?download=true"
 h=hashlib.sha256();total=0
 with urlopen(Request(url,headers={
    "User-Agent":"R29-v4-neutral-complete-source-retention/1",
    "Accept":"application/octet-stream"}),timeout=80) as response, target.open("wb") as fp:
  while True:
   chunk=response.read(128*1024)
   if not chunk:break
   total+=len(chunk)
   if total>MAX_DAY_BYTES:raise ValueError("SOURCE_DAILY_FILE_OVERSIZE")
   h.update(chunk);fp.write(chunk)
 if h.hexdigest()!=expected["sha256"]:raise ValueError("PINNED_RAW_SOURCE_SHA_MISMATCH_"+day)
 parquet=pq.ParquetFile(target)
 if parquet.metadata.num_rows!=expected["expected_records"]:
  raise ValueError("PINNED_SOURCE_ROW_COUNT_MISMATCH_"+day)
 if not set(SOURCE_COLS).issubset(parquet.schema_arrow.names):
  raise ValueError("PINNED_SOURCE_REQUIRED_FIELDS_MISSING")
 # Only original launch-only fields are read. Hidden future columns stay on disk.
 return parquet.read(columns=list(SOURCE_COLS)).to_pylist()

def run(start,end,output,matrix_path,read_day=download_day):
 if end<start:raise ValueError("REVERSED_REPLAY_PERIOD")
 available=pinned_days(matrix_path)
 dates=[start+timedelta(days=i) for i in range((end-start).days+1)]
 if len(dates)>67:raise ValueError("HISTORICAL_REPLAY_MAX_67_DAYS")
 missing=[str(d) for d in dates if str(d) not in available]
 if missing:raise ValueError("PINNED_NEUTRAL_SOURCE_DAY_GAP_"+",".join(missing[:4]))
 output.mkdir(parents=True,exist_ok=True)
 dbpath=output/"source-only-48h.sqlite"
 if dbpath.exists():raise ValueError("REPLAY_OUTPUT_MUST_BE_FRESH_NOT_OVERWRITTEN")
 conn=sqlite3.connect(dbpath)
 init_db(conn)
 manifest={"schema":MANIFEST_SCHEMA,
  "period_start":str(start),"period_end":str(end),"source_revision":SOURCE_REV,
  "source_data_published_after_original_trading_dates":True,
  "independent_original_period_data_delivery_proven":False,
  "source_scope":"recorded Pump.fun Solana starts only, NOT entire DEX market",
  "source_evidence_only_no_GPT_model_calls":True,
  "actual_gpt_model_calls":0,"actual_GPT_BUY":0,"actual_GPT_HOLD":0,
  "actual_GPT_SELL":0,"actual_GPT_NO_TRADE":0,"paper_buy_fills":0,
  "paper_sell_fills":0,"realized_pnl_test_usdc":None,
  "paper_start_reference_test_usdc":5000,
  "paper_user_ledger_touched":False,"real_trading_enabled":False,
  "retention_seconds":OBSERVATION_SECONDS,
  "all_valid_source_starts_ingested_not_random_first_eight":True,
  "total_original_records":0,"total_valid_records":0,
  "total_distinct_new_contracts":0,"total_same_identity_duplicates":0,
  "all_source_days_count":len(dates),
  "recorded_contract_recall_census_without_future_labels":True,
  "daily_audit":[]}
 try:
  with tempfile.TemporaryDirectory(prefix="r29-v4-historic-") as tmp:
   target=Path(tmp)/"source.parquet"
   for day in dates:
    d=str(day)
    rows=read_day(d,target,available[d])
    result=ingest_day_records(conn,d,rows,output/"all-launches"/(d+".jsonl.gz"))
    target.unlink(missing_ok=True)
    if result["raw_records"]!=available[d]["expected_records"]:
     raise ValueError("DAILY_SOURCE_EXPECTED_ROWS_CHANGED")
    day_start=datetime.combine(day,datetime.min.time(),UTC).timestamp()
    next_day=day_start+DAY_SECONDS
    # Clock evidence only; no promotion or automatic GPT model invocation.
    result.update({
     "date_utc":d,"original_raw_parquet_sha256":available[d]["sha256"],
     "candidate_state_at_next_midnight":
      {"MONITORING_SOURCE_ONLY":active_at(conn,next_day),
       "ever_seen_asof":recorded_before(conn,next_day)},
     "gpt_review_requests_sent":0,"actual_model_calls":0,
     "historical_bidirectional_sellability_verified":False,
     "historical_buy_sell_fills":0
    })
    manifest["daily_audit"].append(result)
    manifest["total_original_records"]+=result["raw_records"]
    manifest["total_valid_records"]+=result["accepted_records"]
    manifest["total_distinct_new_contracts"]+=result["new_contract_identities"]
    manifest["total_same_identity_duplicates"]+=result["same_identity_duplicates"]
    print("R29_V4_COMPLETE_SOURCE_DAY",d,result["raw_records"],
     result["new_contract_identities"],"active48h",active_at(conn,next_day),flush=True)
   n=conn.execute("SELECT count(*) FROM launches").fetchone()[0]
   if n!=manifest["total_distinct_new_contracts"]:
    raise ValueError("UNIVERSE_HAS_UNACCOUNTED_MINT")
 finally:
  conn.close()
 (output/"SUMMARY.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 return manifest

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument("--from-date",required=True)
 ap.add_argument("--to-date",required=True)
 ap.add_argument("--output-dir",required=True,type=Path)
 ap.add_argument("--matrix",default=MATRIX,type=Path)
 args=ap.parse_args()
 summary=run(parse_day(args.from_date),parse_day(args.to_date),
  args.output_dir,args.matrix)
 print("R29_V4_ALL_RECORDED_STARTS",json.dumps({
  k:summary[k] for k in ("all_source_days_count","total_original_records",
   "total_distinct_new_contracts","retention_seconds","actual_gpt_model_calls",
   "paper_buy_fills","realized_pnl_test_usdc")}))

if __name__=="__main__":main()
