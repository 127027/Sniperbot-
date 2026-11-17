#!/usr/bin/env python3
"""POSTHOC-only identity recall check after sealed GPT blind candidate review.

Never supplied to GPT's earlier market decision input. Verifies exact
published Solana mint identities against *all* 17 SHA-pinned retrospective
launch-day files, then compares with the 320 selected sampled IDs.
No wallet, local bot, orders, profits, future price or trade calls.
"""
import argparse,csv,hashlib,json,os,re,tempfile
from pathlib import Path
from datetime import date,timedelta,datetime,timezone
from urllib.request import Request,urlopen

REV="9b9a04e7e3e85775d614d16105daad2e69ce8544"
SRC="https://huggingface.co/datasets/loopholetape/pumpfun-launches/resolve/"+REV+"/"
DAYS=[(date(2026,10,5)+timedelta(days=i)).isoformat() for i in range(17)]
BENCHMARKS={
 "PIERRE":{
  "mint_candidates":[
   "D3S6J9s1byrNBt3ZKwEDiPsNRqHtoEP8zQKdhyBdpump",
   "8GroyR3X7C2qTWX33EY6T2tLYkvXFTuvoTExUVTApump"],
  "names":["French Goku Hero"],"ticker":["PIERRE"],
  "source":"DexTrading token Solana D3S6J9; Dexonomics alternate 8GroyR3"
 },
 "FTR":{
  "mint_candidates":["DFMt2FyLpB6ekPNAzVErLXgpSnJ9CRf1VnxBAkTLpump"],
  "names":["Flying Tesla Roadster"],"ticker":["FTR"],
  "source":"KuCoin Alpha official listing contract address"
 },
 "DACITY":{
  "mint_candidates":["nxPqZ4F7ux8Vph5NFu25rEP6Kx9Gr1U6Fmj36Rjpump",
  "DKYcjobF7HPtL9RyQBRdeRQ2iWvizpfbgWwPWNXdpump"],
  "names":["Dacity Coin","DacityCoin","AudaCity"],"ticker":["Dacity","DacityCoin"],
  "source":"DexTrading Dacity and different DacityCoin contracts"
 },
 "TRUMP_1":{
  "mint_candidates":["2bCCHQadi4QeHWPKG3w13siCyWWQPgkFtniouTqVpump"],
  "names":["Trump $1 Coin"],"ticker":["1"],
  "source":"DexTrading Solana token 1"
 }
}
INPUT_SHA="0c1fd1f22ad7cb9d37498b99ccc65dfcf0ee6a32f8845a3b322e754f8ed9dad1"
INPUT_CANONICAL_SHA="a35744004c886aca385b02d48e359436a558eeba66a9a1185af413f6431f743e"
FREEZE_SHA_COMMIT="525446cc631b10cd40c80780a9d8dfca86a11060"
def sha(data):return hashlib.sha256(data).hexdigest()
def normalize(value):
 return re.sub(r"[^a-z0-9]+","",value.lower()) if isinstance(value,str) else ""
def pinned_matrix(file):
 with open(file,newline="",encoding="utf-8") as f:r=list(csv.DictReader(f))
 d={}
 for row in r:
  if row.get("date") in DAYS:
   k=row["date"]
   if k in d:raise ValueError("DUPLICATE_SOURCE_DAY")
   d[k]={"sha256":row["raw_parquet_sha256"],"expected_rows":int(row["captured_launch_count"])}
 if len(d)!=17 or any(not re.fullmatch("[a-f0-9]{64}",v["sha256"]) for v in d.values()):
  raise ValueError("SOURCE_MATRIX_GAP")
 return d
def sampled_input(file):
 raw=Path(file).read_bytes()
 j=json.loads(raw)
 # Python set iteration in the source recorder changed only the ordering
 # of as-of feature object keys between two successful original Action runs.
 # The originally SEALED bytes remain recorded, but compare normalized
 # content across runs instead of accepting an arbitrary edited file.
 canonical=json.dumps(j,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
 if sha(canonical)!=INPUT_CANONICAL_SHA:
  raise ValueError("BLIND_CANDIDATE_FREEZE_SOURCE_CHANGED")
 if j.get("schema")!="r29_oct05_21_strict_asof_source_only_replay.v1" or \
  j.get("ten_trade_days_unique_neutral_sample_candidates")!=320 or \
  j.get("winner_names_or_retrospective_pnl_as_model_input") is not False:
  raise ValueError("NOT_THE_PRE_COMPARISON_NEUTRAL_SAMPLE")
 bymint={}
 for day in j["day_by_day"]:
  for f in day["candidate_evidence_checkpoint_frames"]:
   for c in f["observed_neutral_mints"]:
    bymint.setdefault(c["mint"],[]).append({
     "review_at_utc":f["at_utc"],"source_observed_at_utc":c["first_observed_at_utc"]})
 if len(bymint)!=320:raise ValueError("SAMPLE_MINT_COUNT_MISMATCH")
 return bymint

def source_match_record(row,day):
 mint=row.get("mint")
 if not isinstance(mint,str) or len(mint)<32 or len(mint)>44:return None
 name=row.get("name");sym=row.get("symbol")
 ts=row.get("t0")
 if not isinstance(ts,(int,float)) or not float(ts)==float(ts):return None
 start=datetime.fromisoformat(day).replace(tzinfo=timezone.utc).timestamp()
 if not start<=ts<start+86400:return None
 return {"mint":mint,"day":day,"launched_at_utc":row.get("launched_at"),
  "name_at_launch":str(name)[:90] if name is not None else None,
  "symbol_at_launch":str(sym)[:35] if sym is not None else None}
def scan_records(day,rows):
 findings={k:{"by_exact_contract":[],"by_name":[],"by_symbol_count":0,
  "by_symbol_first_five":[]} for k in BENCHMARKS}
 for raw in rows:
  x=source_match_record(raw,day)
  if not x:continue
  name=normalize(x["name_at_launch"])
  symbol=normalize(x["symbol_at_launch"])
  for key,bench in BENCHMARKS.items():
   if x["mint"] in bench["mint_candidates"]:
    findings[key]["by_exact_contract"].append(x)
   if name and name in {normalize(y) for y in bench["names"]}:
    findings[key]["by_name"].append(x)
   if symbol and symbol in {normalize(y) for y in bench["ticker"]}:
    findings[key]["by_symbol_count"]+=1
    if len(findings[key]["by_symbol_first_five"])<5:
     findings[key]["by_symbol_first_five"].append(x)
 return findings

def finish_audit(day_rows,source_sha,by_mint):
 findings={k:{"source_mints":list(v["mint_candidates"]),
  "exact_mint_source_hits":[],"name_matches_at_launch":[],
  "ticker_matches_count":0,"ticker_match_examples":[],
  "was_in_320_neutral_research_sample":False,
  "was_an_actual_prior_october_GPT_trade":False,
  "evidence_classification":"UNRESOLVED"} for k,v in BENCHMARKS.items()}
 days_proved=[]
 for day in DAYS:
  if day not in day_rows or day not in source_sha:
   raise ValueError("MISSING_SOURCE_DAY_"+day)
  matches=scan_records(day,day_rows[day])
  days_proved.append({"day":day,"source_sha256":source_sha[day],
    "launches_read_for_comparison":len(day_rows[day])})
  for key,case in matches.items():
   dest=findings[key]
   dest["exact_mint_source_hits"].extend(case["by_exact_contract"])
   dest["name_matches_at_launch"].extend(case["by_name"][:30])
   dest["ticker_matches_count"]+=case["by_symbol_count"]
   dest["ticker_match_examples"].extend(case["by_symbol_first_five"][:5])
 for key,d in findings.items():
  contract_hits=d["exact_mint_source_hits"]
  d["was_in_320_neutral_research_sample"]=any(m in by_mint for m in d["source_mints"])
  d["selected_neutral_observation_times"]=[
   {"mint":m,"times":by_mint[m]} for m in d["source_mints"] if m in by_mint]
  if d["was_in_320_neutral_research_sample"]:
   d["evidence_classification"]="SAMPLED_NEUTRAL_WITH_PREVIOUS_GPT_RESEARCH_DECISION"
  elif contract_hits:
   d["evidence_classification"]="EXACT_CONTRACT_IN_FULL_RAW_LAUNCHES_BUT_MISSED_BY_320_RESEARCH_SAMPLE"
  elif d["name_matches_at_launch"]:
   d["evidence_classification"]="EXACT_NAME_IN_FULL_RAW_SOURCE_BUT_NOT_CONFIRMED_SAME_CONTRACT"
  else:
   d["evidence_classification"]="NO_EXACT_CONTRACT_OR_NAME_IN_THIS_SOLANA_PUMPFUN_SOURCE"
  d["contract_ambiguity_warning"]="Ticker and token name are not identifiers. Contract evidence only supports specifically listed addresses."
 return {
  "schema":"r29_oct2026_posthoc_benchmark_identity_recall.v1",
  "provenance":"POSTHOC_AFTER_GPT_FROZEN_WATCHLIST",
  "frozen_gpt_review_commit":FREEZE_SHA_COMMIT,
  "frozen_source_sha256":INPUT_SHA,
  "source_revision":REV,
  "all_17_days_raw_source_files_sha256_verified":True,
  "source_coverage":"ONLY_RECORDED_SOLANA_PUMPFUN_LAUNCHES_NOT_ALL_MEMECOINS_OR_ALL_CHAINS",
  "winner_names_seen_by_previously_frozen_GPT_decision_input":False,
  "actual_historic_GPT_calls":0,
  "actual_historic_paper_fills":0,
  "profit_pnl_test_usdc":None,
  "all_days":days_proved,
  "benchmark_results":findings
 }
def download_day(day,path,expected):
 import pyarrow.parquet as pq
 url=SRC+"data/launches/"+day+".parquet?download=true"
 data=b""
 with urlopen(Request(url,headers={"User-Agent":"R29-Posthoc-ONLY-Contract-Recall/1",
   "Accept":"application/octet-stream"}),timeout=60) as f:
  while True:
   chunk=f.read(128*1024)
   if not chunk:break
   data+=chunk
   if len(data)>20_000_000:raise ValueError("RAW_LAUNCH_FILE_TOO_LARGE_"+day)
 if sha(data)!=expected["sha256"]:raise ValueError("SOURCE_SHA_NOT_MATCH_PINNED_"+day)
 path.write_bytes(data)
 tab=pq.read_table(path,columns=["mint","name","symbol","t0","launched_at"])
 if tab.num_rows!=expected["expected_rows"]:raise ValueError("WRONG_RAW_LAUNCH_ROWS_"+day)
 return tab.to_pylist()
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--matrix",required=True)
 p.add_argument("--frozen-source",required=True)
 p.add_argument("--output",required=True)
 args=p.parse_args()
 by_mint=sampled_input(args.frozen_source)
 matrix=pinned_matrix(args.matrix)
 collected={}
 with tempfile.TemporaryDirectory(prefix="r29-posthoc-only-") as tmp:
  dest=Path(tmp)/"day.parquet"
  for day in DAYS:
   collected[day]=download_day(day,dest,matrix[day])
   dest.unlink(missing_ok=True)
   print("R29_POSTHOC_PINNED_FULL_LAUNCH_DAY",day,len(collected[day]),flush=True)
 result=finish_audit(collected,{d:matrix[d]["sha256"] for d in DAYS},by_mint)
 out=Path(args.output)
 out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n")
 for k,v in result["benchmark_results"].items():
  print("R29_POSTHOC_IDENTITY",k,v["evidence_classification"],
   "exact_contract_matches",len(v["exact_mint_source_hits"]),
   "exact_name_matches",len(v["name_matches_at_launch"]),
   "ticker_matching_count",v["ticker_matches_count"],flush=True)
if __name__=="__main__":main()
