#!/usr/bin/env python3
"""As-of research frames from real archived minute features, never actual GPT trades."""
import re,json,math,hashlib,tempfile
from pathlib import Path
from datetime import datetime,timezone,timedelta
from urllib.request import urlopen,Request
import pyarrow.parquet as pq

REV="9b9a04e7e3e85775d614d16105daad2e69ce8544"
URL="https://huggingface.co/datasets/loopholetape/pumpfun-launches/resolve/"+REV+"/"
OUT=Path(__file__).resolve().parent/"generated"/"real-minute-36days"
DAYS=[(datetime(2026,9,24,tzinfo=timezone.utc)+timedelta(days=i)).date().isoformat() for i in range(36)]
RX=re.compile(r"^[ \t]*\|?[ \t]*features\s*\|\s*(data/features/20[0-9]{2}-[0-9]{2}-[0-9]{2}\.parquet)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([a-f0-9]{64})",re.M)
SAFE=("mint","t","ts","age_s","window","slot_ms","mayhem",
 "quote_asset","quote_is_sol","quote_modelled","quote_holder_rewards","quote_evidence",
 "flag_creator_sold","flag_bundle_dumped","flag_pool_drained",
 "flag_curve_closed_low","flag_migrate_below_grad","flag_graduated",
 "flag_curve_complete_grad","flag_serial_rugger_creator","flag_warm_launch",
 "f_dev_share","f_insider_share","f_bundle_wallets","f_rep_n",
 "f_rep_rug","f_rep_grad","f_rs","f_n_buys","f_age","f_mayhem")
BLOCKED={"graduated","rugged","rug_dt_s","migrate_dt_s","peak_rs","terminal_rs",
 "rugged_before_row","migrated_before_row","rug_within_300s_after_row","flag_curve_drained",
 "labels_as_of","outcome_status","outcome_pending","repaired","repair_reason",
 "launch_t0","launch_quote_asset","launch_mayhem","launch_decoder_complete",
 "p_rug_within_300s","p_true_graduation","rug_model_score_uncalibrated",
 "capture_lag_s","dev_first_sell_dt_s"}
assert not set(SAFE)&BLOCKED
def digest(x):return hashlib.sha256(x).hexdigest()
def iso(x):return datetime.fromtimestamp(x,timezone.utc).isoformat().replace("+00:00","Z")
def fetch(relative):
 with urlopen(Request(URL+relative,headers={"User-Agent":"r29-historical-asof-research"}),timeout=120) as r:
  data=r.read(12_000_001)
 if len(data)>12_000_000:raise ValueError("SOURCE_FILE_OVERSIZE")
 return data
def manifest(text):
 found={}
 for p,rows,sz,sha in RX.findall(text):
  if p in found:raise ValueError("DUPLICATE_MANIFEST_PATH")
  found[p]=(int(rows.replace(",","")),int(sz.replace(",","")),sha)
 selected={f"data/features/{day}.parquet" for day in DAYS}
 missing=selected-set(found)
 if missing:
  print("FEATURE_MANIFEST_DEBUG",json.dumps({
   "found_count":len(found),
   "first_matches":list(found)[:5],
   "first_readme_feature_lines":[line[:200] for line in text.splitlines()
     if "data/features/" in line][:4]}),flush=True)
  raise ValueError("SOURCE_MISSING_REQUIRED_36_DAYS "+str(sorted(missing)[:5]))
 return {day:found[day] for day in selected}
def safe_asof(record,at):
 if set(record)-set(SAFE):raise ValueError("RETROSPECTIVE_COLUMN_LEAK")
 if record["t"]>at:raise ValueError("FUTURE_ROW_LEAK")
 return record
def day_frames(day,safe_table,raw_column_names):
 if set(SAFE)-set(safe_table.schema.names):raise ValueError("SOURCE_COLUMNS_MISSING")
 if not BLOCKED.intersection(raw_column_names):raise ValueError("MISSING_LABEL_BOUNDARY")
 t0=datetime.fromisoformat(day).replace(tzinfo=timezone.utc).timestamp()
 hours=[{} for _ in range(24)]
 count=[0]*24;invalid=0
 for batch in safe_table.to_batches(max_chunksize=32768):
  for row in batch.to_pylist():
   t=row["t"];addr=row["mint"]
   if not isinstance(t,(int,float)) or not math.isfinite(t) or not t0<=t<t0+86400 or not isinstance(addr,str) or not 32<=len(addr)<=44 or row["age_s"] is None or row["age_s"]<0:
    invalid+=1;continue
   h=int((t-t0)//3600);count[h]+=1
   if addr not in hours[h] or t<hours[h][addr]["t"]:hours[h][addr]=row
 frames=[]
 for hour in range(24):
  at=t0+(hour+1)*3600
  cohort=sorted(hours[hour].values(),key=lambda x:(x["t"],x["mint"]))[:8]
  frames.append({"at_utc":iso(at),"previous_hour_utc":hour,
    "sampled_feature_rows":count[hour],
    "first_eight_neutral_distinct_mints":[
      {"observed_at_utc":iso(row["t"]),"asof_features":safe_asof(row,at)}
      for row in cohort],
    "gpt_model_reviews_actual":0,"paper_buy_sell_fills":None,
    "independent_sellability_and_tradeable_USDC_quote":False})
 return {"day":day,"model_asof_columns":list(SAFE),
  "source_future_label_columns_excluded":sorted(BLOCKED.intersection(raw_column_names)),
  "real_feature_rows":safe_table.num_rows,"invalid_or_prelaunch_rows":invalid,
  "frames":frames,"candidate_occurrences":sum(len(x["first_eight_neutral_distinct_mints"]) for x in frames),
  "future_outcome_known_to_replay":False,"gpt_model_calls":0,"actual_paper_trades":0}
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 readme=fetch("README.md")
 expected=manifest(readme.decode())
 sumry={"schema":"r29_real_36day_asof_feature_audit_v1","revision":REV,
  "from_date":DAYS[0],"to_date":DAYS[-1],"source_readme_sha256":digest(readme),
  "verified_days":0,"total_real_rows":0,"hourly_asof_frames":0,
  "first8_candidate_occurrences":0,
  "future_labels_in_gpt_frames":False,"actual_gpt_trades":0,
  "verified_executable_USDC_profit":None,
  "data_is_retrospectively_published":True,"days":[]}
 with tempfile.TemporaryDirectory(prefix="real-minute-") as directory:
  target=Path(directory)/"data.parquet"
  for day in DAYS:
   rel=f"data/features/{day}.parquet"
   row_count,size,source_sha=expected[rel]
   raw=fetch(rel)
   if len(raw)!=size or digest(raw)!=source_sha:raise ValueError("SOURCE_SHA_OR_SIZE_MISMATCH_"+day)
   target.write_bytes(raw)
   f=pq.ParquetFile(target)
   if f.metadata.num_rows!=row_count:raise ValueError("SOURCE_ROWS_MISMATCH_"+day)
   table=f.read(columns=list(SAFE))
   result=day_frames(day,table,f.schema_arrow.names)
   result.update({"source_sha256":source_sha,"source_url":URL+rel})
   (OUT/(day+".json")).write_text(json.dumps(result,separators=(",",":"),allow_nan=False)+"\n")
   sumry["verified_days"]+=1;sumry["total_real_rows"]+=row_count
   sumry["hourly_asof_frames"]+=24
   sumry["first8_candidate_occurrences"]+=result["candidate_occurrences"]
   sumry["days"].append({"date":day,"rows":row_count,"sha256":source_sha,
     "candidate_occurrences":result["candidate_occurrences"]})
   print("REAL_MINUTE_DAY",json.dumps({"day":day,"rows":row_count,
     "sha256":source_sha,"candidate_occurrences":result["candidate_occurrences"]}),flush=True)
   target.unlink()
 if sumry["verified_days"]!=36 or sumry["total_real_rows"]!=4702805 or sumry["hourly_asof_frames"]!=864:
  raise ValueError("INCOMPLETE_OR_CHANGED_SOURCE")
 (OUT/"SUMMARY.json").write_text(json.dumps(sumry,indent=2)+"\n")
 print("REAL_MINUTE_36D_RESULT",json.dumps({k:sumry[k] for k in (
  "verified_days","total_real_rows","hourly_asof_frames","first8_candidate_occurrences",
  "future_labels_in_gpt_frames","actual_gpt_trades")}),flush=True)
if __name__=="__main__":main()
