#!/usr/bin/env python3
"""One-day 2026-10-15 REAL pump.fun trade research: source first.
Read CC-BY 4.0 public historical Parquet. No order creation or live bot access.
Two modes: manifest (small launch and receipt data) or full (all four large shards).
All 'as-of' reviews use strictly past ledger events; model decisions are NOT generated.
"""
import argparse
import collections
import hashlib
import json
import os
from pathlib import Path
import tempfile
import time
from urllib.request import Request, urlopen
from datetime import datetime, timezone

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq

DAY = "2026-10-15"
START = int(datetime(2026, 10, 15, tzinfo=timezone.utc).timestamp())
END = START + 86400
DATASET = "pumpdatafun/pump-fun-trades-sample"
HF = "https://huggingface.co/datasets/" + DATASET + "/resolve/main/"
ROOT = Path(__file__).resolve().parent
DEST = ROOT / "generated"
REPORT = DEST / "complete-2026-10-15-neutral-token-swaps.json"
SIZES = (434390742,414831245,402788445,121411812)
ROW_COUNTS=(12802709,12802709,12802709,3822283)
META={"launches/pumpdata-2026-10-15-launches.parquet":3395780,
      "receipt.json":494}
MAX_REQUEST_BYTES=1_430_000_000
MAX_SELECTION=50000
MAX_EVENTS_EACH=12000
WRAPPED_SOL="So11111111111111111111111111111111111111112"
SCANNED_COLUMNS=["ts","slot","idx","seq","mint","pool","wallet","side",
                 "failed","venue","quote_mint","quote_amount","token_amount",
                 "fee_lamports","sol_lamports"]
def iso(ts):
    return datetime.fromtimestamp(ts,timezone.utc).isoformat().replace("+00:00","Z")
def dump(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
def download(rel,path,expected_size=None):
    if ".." in rel or not rel.endswith((".json",".parquet")):
        raise ValueError("BAD_HF_SOURCE")
    request=Request(HF+rel, headers={"User-Agent":"R29-history-research/1.0"})
    sha=hashlib.sha256()
    with urlopen(request,timeout=120) as resp,open(path,"wb") as out:
        while True:
            part=resp.read(2*1024*1024)
            if not part:break
            if out.tell()+len(part)>MAX_REQUEST_BYTES:
                raise ValueError("PROVIDER_FILE_TOO_LARGE")
            sha.update(part);out.write(part)
    if expected_size is not None and path.stat().st_size !=expected_size:
        raise ValueError(f"DOWNLOAD_SIZE_MISMATCH {rel}: {path.stat().st_size}/{expected_size}")
    return {"source_url":HF+rel,
            "actual_bytes":path.stat().st_size,
            "sha256_raw_response":sha.hexdigest()}
def prepare_meta(tmp):
    m={}
    for p,size in META.items():
        pth=tmp/Path(p).name
        m[p]=download(p,pth,expected_size=size)
    receipt=json.loads((tmp/"receipt.json").read_text())
    launches=pq.ParquetFile(tmp/"pumpdata-2026-10-15-launches.parquet")
    summary={"kind":"REAL_PROVIDER_MANIFEST_ONLY",
         "recorded_day":DAY,"asof_source_release_is_retroactive":True,
         "launch_columns":launches.schema_arrow.names,
         "launch_rows":launches.metadata.num_rows,
         "receipt":receipt,
         "source_files":m,
         "expected_trade_shards":[
           {"file":f"data/pumpdata-2026-10-15-{n:05d}-of-00004.parquet",
            "expected_bytes":size,"expected_rows":ROW_COUNTS[n]}
           for n,size in enumerate(SIZES)
         ]}
    if launches.metadata.num_rows != receipt["rows"]["launches"]:
        raise ValueError("LAUNCH_RECEIPT_COUNT_MISMATCH")
    if sum(ROW_COUNTS)!=receipt["rows"]["trades_landed"]+receipt["rows"]["trades_failed"]:
        raise ValueError("TRADE_RECEIPT_COUNT_MISMATCH")
    dump(DEST/"real-2026-10-15-source-manifest.json",summary)
    print("REAL_FULLDAY_MANIFEST",json.dumps({
      "launch_columns":launches.schema_arrow.names,"launch_rows":launches.metadata.num_rows,
      "expected_shards":len(SIZES),"expected_swaps":sum(ROW_COUNTS)}),flush=True)
    return launches,summary

def launch_candidates(launches):
    cols=set(launches.schema_arrow.names)
    stamp="ts" if "ts" in cols else "t0" if "t0" in cols else None
    if stamp is None or "mint" not in cols:
        raise ValueError("LAUNCH_TIMESTAMP_FIELD_NOT_DISCOVERED_SCHEMA_REVIEW_REQUIRED")
    rows=launches.read(columns=["mint",stamp]).to_pylist()
    hours=collections.defaultdict(list)
    for r in rows:
        ts=r[stamp]
        if isinstance(ts,datetime):ts=ts.timestamp()
        if isinstance(ts,(int,float)) and START<=ts<END and isinstance(r["mint"],str):
            hours[int(ts-START)//3600].append((float(ts),r["mint"]))
    if not hours:raise ValueError("NO_LAUNCHES_WITH_VALID_SOURCE_TIME")
    # The very FIRST two launches per hour are selected without knowing
    # volume, price, survival, ATH, or future trade count.
    candidates=[]
    for hour in range(24):
        for ts,mint in sorted(hours[hour],key=lambda x:(x[0],x[1]))[:2]:
            candidates.append({"mint":mint,"launch_at_utc":iso(ts),
                               "selection_hour":hour,
                               "selection_rule":"EARLIEST_TWO_LAUNCH_EVENTS_PER_HOUR_NO_WINNER_LOOKUP"})
    if len(candidates)<24:
        raise ValueError("NOT_ENOUGH_NEUTRAL_LAUNCHES")
    if len(set(c["mint"] for c in candidates))!=len(candidates):
        raise ValueError("DUPLICATE_NEUTRAL_MINT")
    return candidates

def asof_snapshot(events,now):
    """Only same-mint events with ts <= current UTC hour checkpoint."""
    visible=[e for e in events if e["ts"]<=now]
    buys=[e for e in visible if not e["failed"] and e["side"]=="buy"]
    sells=[e for e in visible if not e["failed"] and e["side"]=="sell"]
    return {"review_at_utc":iso(now),
            "observed_events":len(visible),"successful_buys":len(buys),
            "successful_sells":len(sells),
            "failed_swaps":sum(bool(e["failed"]) for e in visible),
            "unique_observed_buy_wallets":len(set(e["wallet"] for e in buys if e["wallet"])),
            "unique_observed_sell_wallets":len(set(e["wallet"] for e in sells if e["wallet"])),
            "available_historical_contract_security":False,
            "historical_executable_costed_swap_quote_proven":False,
            "gpt_model_called_in_2026_replay":False,
            "paper_order":"NOT_AUTHORIZED_DATA_GAP"}

def full_one_day(tmp, launches, manifest):
    selected=launch_candidates(launches)
    selected_mints=set(x["mint"] for x in selected)
    events={x["mint"]:[] for x in selected}
    counts=collections.Counter()
    shard_sources=[]
    for ix,size in enumerate(SIZES):
        name=f"data/pumpdata-2026-10-15-{ix:05d}-of-00004.parquet"
        filepath=tmp/Path(name).name
        t0=time.monotonic()
        proof=download(name,filepath,expected_size=size)
        pqfile=pq.ParquetFile(filepath)
        if pqfile.metadata.num_rows!=ROW_COUNTS[ix]:
            raise ValueError("SHARD_ROWS_MISMATCH")
        missing=set(SCANNED_COLUMNS)-set(pqfile.schema_arrow.names)
        if missing:raise ValueError("PROVIDER_SWAP_FIELDS_MISSING:"+str(sorted(missing)))
        batches=0
        for batch in pqfile.iter_batches(batch_size=32768,columns=SCANNED_COLUMNS):
            batches+=1
            counts["all_rows"]+=batch.num_rows
            failed=batch.column(batch.schema.get_field_index("failed"))
            counts["failed"]+=pc.sum(pc.fill_null(failed,False)).as_py()
            mintcol=batch.column(batch.schema.get_field_index("mint"))
            mask=pc.is_in(mintcol,value_set=pa.array(sorted(selected_mints)))
            filtered=batch.filter(mask)
            counts["selected_rows"]+=filtered.num_rows
            if counts["selected_rows"]>MAX_SELECTION:
                raise ValueError("TOO_MANY_SELECTED_TRADES_WOULD_TRUNCATE_FULL_SEQUENCE")
            for e in filtered.to_pylist():
                if not isinstance(e["ts"],int) or not START<=e["ts"]<END:
                    raise ValueError("SWAP_EVENT_TIME_OUTSIDE_DAY")
                if e["mint"] not in events:raise ValueError("SELECTION_FILTER_BROKEN")
                if len(events[e["mint"]])>=MAX_EVENTS_EACH:
                    raise ValueError("PER_MINT_TRADE_HISTORY_TOO_LARGE_NEVER_TRUNCATE_SILENTLY")
                events[e["mint"]].append(e)
        counts["shards_complete"]+=1
        shard_sources.append({**proof,"num_rows":pqfile.metadata.num_rows,
          "batch_count":batches,"elapsed_seconds":round(time.monotonic()-t0,3)})
        filepath.unlink(missing_ok=True)
        print("REAL_FULLDAY_SHARD",json.dumps({"shard":ix+1,"of":4,
          "rows":pqfile.metadata.num_rows,
          "selected_total_rows":counts["selected_rows"],
          "source_sha256":proof["sha256_raw_response"]}),flush=True)
    if counts["all_rows"]!=sum(ROW_COUNTS) or counts["failed"]!=manifest["receipt"]["rows"]["trades_failed"]:
        raise ValueError("CANNOT_VERIFY_COMPLETE_TRADE_CENSUS")
    findings=[]
    for c in selected:
        rows=sorted(events[c["mint"]],key=lambda e:(e["ts"],e["slot"],e["idx"],e["seq"]))
        # Full-day paper portfolio result cannot be determined without
        # executable quotes / historical fee and chain-state security proof.
        # Keep actual native quote raw units to avoid token-decimal mistakes.
        preview=[{
            "timestamp_utc":iso(e["ts"]),"slot":e["slot"],"idx":e["idx"],"seq":e["seq"],
            "pool":e["pool"],"venue":e["venue"],"side":e["side"],
            "failed":e["failed"],"wallet":e["wallet"],
            "quote_mint":e["quote_mint"],"quote_amount_raw":e["quote_amount"],
            "token_amount_raw":e["token_amount"],"fee_lamports":e["fee_lamports"]
          } for e in rows]
        checkpoint=START+(c["selection_hour"]+1)*3600
        checkpoints=[checkpoint,checkpoint+3600,checkpoint+4*3600,END-1]
        checkpoints=sorted(set(x for x in checkpoints if x<END))
        findings.append({**c,
            "source":"NON_CHERRY_PICKED_ACTUAL_SOLANA_LAUNCH",
            "selected_total_transactions":len(rows),
            "selected_successful_swaps":sum(1 for e in rows if not e["failed"]),
            "selected_failed_swaps":sum(1 for e in rows if e["failed"]),
            "historical_events":preview,
            "asof_snapshots":[asof_snapshot(rows,t) for t in checkpoints],
            "historical_fully_independent_security_and_execution":False,
            "real_gpt_buy_sell_held_orders":None})
    result={"schema":"sniper_r29_real_full_day_neutral_swaps_v1",
            "date":DAY,"source_class":"AUTHENTIC_THIRD_PARTY_ARCHIVED_SOLANA_TRANSACTIONS",
            "not_actual_GPT_call":True,"not_actual_DEX_fills_for_bot":True,
            "user_wallet_untouched":True,"laptop_paper_ledger_untouched":True,
            "no_real_money":True,"source_summary_and_receipt":manifest["receipt"],
            "source_recorded_shard_proofs":shard_sources,
            "counts":dict(counts),
            "neutral_launch_selection":"TWO_EARLIEST_EACH_UTC_HOUR_ONLY",
            "selected_mint_count":len(findings),
            "source_limitations":[
              "All individual rows are third-party retrospective events, not independent historical API availability proof",
              "Swaps are historical executed trades by others, never orders sent by this GPT",
              "Raw quote prices require actual quote-token decimals and valuation, don't treat raw units as USD",
              "No independent historical executable paper fill quotes or Mint/Freeze security checks",
              "Without time-sealed historical model calls, cannot claim historical GPT found winners",
              "Full source is one day only; no inference about other 59 holdout days"
            ],"coins":findings}
    dump(REPORT,result)
    print("REAL_FULLDAY_RESULT",json.dumps({
      "full_trade_census":counts["all_rows"],
      "total_failed_swaps":counts["failed"],
      "selected_mints":len(findings),
      "complete_selected_mint_swaps":counts["selected_rows"],
      "tokens_with_both_buy_and_sell":sum(
       1 for x in findings if sum(e["side"]=="buy" and not e["failed"]
       for e in x["historical_events"])>0 and
       sum(e["side"]=="sell" and not e["failed"]
       for e in x["historical_events"])>0),
      "actual_GPT_model_buy_fills":0,
      "output":str(REPORT)}),flush=True)

def main():
    arg=argparse.ArgumentParser()
    arg.add_argument("--stage",choices=("manifest","full"),default="manifest")
    flags=arg.parse_args()
    with tempfile.TemporaryDirectory(prefix="r29-historic-free-20261015-") as tmpdir:
        launches,manifest=prepare_meta(Path(tmpdir))
        if flags.stage=="full":full_one_day(Path(tmpdir),launches,manifest)
if __name__=="__main__":
    main()
