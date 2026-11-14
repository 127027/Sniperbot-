#!/usr/bin/env python3
"""R25 source-neutral Ethereum V2 factory history from a fixed public CSV.

Historical discovery, NOT a verified blind-test cohort, market tape or trade.
Acknowledge any uncovered tail rather than invent data after the last row.
"""
import argparse
import csv
import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path

QUOTES={
 "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", # WETH
 "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", # USDC
 "0xdac17f958d2ee523a2206206994597c13d831ec7", # USDT
}
FACTORY="0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f"
ADDR=re.compile(r"^0x[0-9a-f]{40}$")
HEX=re.compile(r"^0x[0-9a-f]{64}$")
URL="https://github.com/bhemen/uniswap-data/blob/main/data/uniswap_v2_factory_events.csv"
def digest(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()
def parse_iso(s):
    d=dt.datetime.fromisoformat(s.replace("Z","+00:00"))
    if d.tzinfo is None: raise ValueError("TIMEZONE_REQUIRED")
    return d.astimezone(dt.timezone.utc)
def file_hash(p):
    h=hashlib.sha256()
    with p.open("rb") as f:
        for b in iter(lambda:f.read(1024*1024),b""): h.update(b)
    return h.hexdigest()
def extract(csv_path,start,end):
    if not(start<end): raise ValueError("INVALID_WINDOW")
    totals={"rows":0,"invalid_rows":0,"window_factory_pairs":0,"window_quote_pairs":0}
    sources=[]
    earliest=None;latest=None
    seen_logs=set()
    with csv_path.open("r",newline="",encoding="utf-8") as file:
        reader=csv.DictReader(file)
        required={"address","blockHash","blockNumber","pair","timestamp","token0","token1","transactionHash"}
        if not required.issubset(set(reader.fieldnames or [])):
            raise ValueError("REQUIRED_FACTORY_COLUMNS_MISSING")
        for row in reader:
            totals["rows"]+=1
            try:
                stamp=dt.datetime.fromtimestamp(int(row["timestamp"]),dt.timezone.utc)
                earliest=min(earliest,stamp) if earliest is not None else stamp
                latest=max(latest,stamp) if latest is not None else stamp
                if stamp<start or stamp>end:continue
                factory=row["address"].strip().lower()
                token0=row["token0"].strip().lower()
                token1=row["token1"].strip().lower()
                pair=row["pair"].strip().lower()
                tx=row["transactionHash"].strip().lower()
                bh=row["blockHash"].strip().lower()
                block=int(row["blockNumber"])
                if factory!=FACTORY or not all(ADDR.fullmatch(x) for x in (token0,token1,pair)) or not all(HEX.fullmatch(x) for x in (tx,bh)) or block<0:
                    raise ValueError("INVALID_ONCHAIN_ID")
                totals["window_factory_pairs"]+=1
                is0=token0 in QUOTES;is1=token1 in QUOTES
                if is0==is1:continue
                token=token1 if is0 else token0
                quote=token0 if is0 else token1
                key=(tx,pair)
                if key in seen_logs:raise ValueError("DUPLICATE_PAIR_LOG")
                seen_logs.add(key)
                totals["window_quote_pairs"]+=1
                sources.append({
                  "id":"v2:"+digest(tx+pair)[:32],
                  "candidate_id":"eth:"+digest(token)[:32],
                  "kind":"POOL_UNVERIFIED",
                  "chain":"ethereum","event_at":stamp.isoformat().replace("+00:00","Z"),
                  "block_number":block,"block_hash":bh,
                  "token":token,"quote_token":quote,"pool":pair,"tx_hash":tx,
                  "proof":{"source_uri":URL,"transaction_uri":"https://etherscan.io/tx/"+tx,
                    "retrospective_csv":True,"historical_ledger_verified":False,
                    "available_at_verified":False}
                })
            except (ValueError,OverflowError,TypeError):
                totals["invalid_rows"]+=1
                continue
    if earliest is None or latest is None:raise ValueError("SOURCE_EMPTY")
    sources.sort(key=lambda x:(x["event_at"],x["id"]))
    complete_start=earliest<=start;complete_end=latest>=end
    return {
      "schema":"r25_uniswap_neutral_factory.v1","mode":"TRAINING_ONLY_SOURCE_RECON",
      "requested_window":{"start":start.isoformat().replace("+00:00","Z"),"end":end.isoformat().replace("+00:00","Z")},
      "source_span":{"first":earliest.isoformat().replace("+00:00","Z"),"last":latest.isoformat().replace("+00:00","Z")},
      "source_file_sha256":file_hash(csv_path),"source_uri":URL,
      "complete_requested_start":complete_start,"complete_requested_end":complete_end,
      "complete_requested_window":complete_start and complete_end,
      "source_ledger_independently_verified":False,
      "timestamp_authenticity_independently_verified":False,
      "pool_candidates":len({x["candidate_id"] for x in sources}),
      "verified_memecoin_count":0,"historically_executed_trades":0,
      "totals":totals,"sources":sources,
      "limitations":[
        "An indexer's past CSV is not independent as-of chain proof.",
        "This export may stop BEFORE target launch: never extrapolate missing days.",
        "POOL event does not establish any market quote, security, or meme identity.",
        "No targeting winner name/token or future outcome in source selection.",
        "The role-facing ID is hashed, but address references can still reveal identity; strict blindtest not attested."
      ]
    }
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",required=True)
    p.add_argument("--output",required=True)
    p.add_argument("--start",default="2023-03-14T00:00:00Z")
    p.add_argument("--end",default="2023-05-14T23:59:59Z")
    a=p.parse_args()
    inp=Path(a.input);out=Path(a.output)
    if not inp.is_file() or out.exists():raise ValueError("INPUT_MISSING_OR_OUTPUT_EXISTS")
    d=extract(inp,parse_iso(a.start),parse_iso(a.end))
    out.parent.mkdir(parents=True,exist_ok=True)
    with out.open("x",encoding="utf-8") as f:json.dump(d,f,indent=2);f.write("\n")
    print(json.dumps({"result":"PARTIAL_HISTORICAL_UNVERIFIED","window_complete":d["complete_requested_window"],
        "source_last":d["source_span"]["last"],"pool_candidates":d["pool_candidates"],
        "verified_memecoins":0,"executed_trades":0,"file_sha256":d["source_file_sha256"]}))
if __name__=="__main__":
    try:main()
    except (ValueError,OSError) as e:
        print("R25_SOURCE_BLOCKED:"+str(e)[:180],file=sys.stderr);sys.exit(2)
