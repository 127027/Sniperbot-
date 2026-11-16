#!/usr/bin/env python3
"""One-day 2026-10-15 REAL pump.fun trade research: source first.
Read CC-BY 4.0 public historical Parquet. No order creation or live bot access.
Two modes: manifest (small launch and receipt data) or full (all four large shards).
All 'as-of' reviews use strictly past ledger events; model decisions are NOT generated.
"""
import argparse
import collections
import sqlite3
import gzip
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
MAX_SELECTION=3000000
MAX_EVENTS_EACH=3000000
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
    counters=collections.Counter()
    proofs=[]
    db=sqlite3.connect(tmp/"neutral-swap-records.sqlite")
    db.execute("PRAGMA journal_mode=OFF")
    db.execute("PRAGMA synchronous=OFF")
    db.execute("PRAGMA temp_store=FILE")
    db.execute("""CREATE TABLE selected_swaps (
      mint TEXT, ts INTEGER, slot INTEGER, idx INTEGER, seq INTEGER,
      pool TEXT, wallet TEXT, side TEXT, failed INTEGER, venue TEXT,
      quote_mint TEXT, quote_amount INTEGER, token_amount INTEGER,
      fee_lamports INTEGER
    )""")
    fields=("mint","ts","slot","idx","seq","pool","wallet","side","failed",
            "venue","quote_mint","quote_amount","token_amount","fee_lamports")
    insert="INSERT INTO selected_swaps VALUES ("+",".join(["?"]*len(fields))+")"
    value_set=pa.array(sorted(selected_mints))
    for ix,size in enumerate(SIZES):
        name=f"data/pumpdata-2026-10-15-{ix:05d}-of-00004.parquet"
        filepath=tmp/Path(name).name
        t0=time.monotonic()
        proof=download(name,filepath,expected_size=size)
        parquet=pq.ParquetFile(filepath)
        if parquet.metadata.num_rows!=ROW_COUNTS[ix]:
            raise ValueError("SHARD_ROWS_MISMATCH")
        missing=set(SCANNED_COLUMNS)-set(parquet.schema_arrow.names)
        if missing:raise ValueError("PROVIDER_SWAP_FIELDS_MISSING:"+str(sorted(missing)))
        batch_count=0
        for batch in parquet.iter_batches(batch_size=65536,columns=SCANNED_COLUMNS):
            batch_count+=1
            counters["all_rows"]+=batch.num_rows
            fcol=batch.column(batch.schema.get_field_index("failed"))
            failed_sum=pc.sum(pc.fill_null(fcol,False)).as_py()
            counters["failed"]+=failed_sum
            mintcol=batch.column(batch.schema.get_field_index("mint"))
            filtered=batch.filter(pc.is_in(mintcol,value_set=value_set))
            counters["selected_rows"]+=filtered.num_rows
            if counters["selected_rows"]>MAX_SELECTION:
                raise ValueError("SELECTION_EXCEEDS_DISK_BACKED_CAP_NO_PARTIAL_RESULTS")
            rows=filtered.to_pylist()
            for row in rows:
                if not isinstance(row["ts"],int) or not START<=row["ts"]<END:
                    raise ValueError("SWAP_TIME_OUTSIDE_ARCHIVED_UTC_DAY")
                if row["mint"] not in selected_mints:
                    raise ValueError("UNSELECTED_MINT_IN_COHORT")
            db.executemany(insert,[tuple(int(e[k]) if k=="failed" else e[k]
                for k in fields) for e in rows])
        db.commit()
        counters["shards_complete"]+=1
        proofs.append({**proof,"reported_num_rows":parquet.metadata.num_rows,
                       "processed_batches":batch_count,
                       "elapsed_seconds":round(time.monotonic()-t0,3)})
        filepath.unlink(missing_ok=True)
        print("REAL_FULLDAY_SHARD",json.dumps({
          "number":ix+1,"total":4,"rows":parquet.metadata.num_rows,
          "selected_cumulative":counters["selected_rows"],
          "source_sha256":proof["sha256_raw_response"]}),flush=True)
    if counters["all_rows"]!=sum(ROW_COUNTS) or counters["failed"]!=manifest["receipt"]["rows"]["trades_failed"]:
        raise ValueError("FULL_DAY_CENSUS_OR_FAILED_COUNT_NOT_VERIFIED")
    db.execute("CREATE INDEX ix_by_mint_time ON selected_swaps (mint,ts,slot,idx,seq)")
    db.commit()

    # Each selected real mint gets a COMPLETE, separately compressed 24h swap
    # history: never silently truncate a popular coin. If source is too large,
    # fail before publishing any audit result.
    out=DEST/"full_day_trade_events"
    out.mkdir(parents=True,exist_ok=True)
    findings=[]
    for k,c in enumerate(selected):
        mint=c["mint"]
        checkpoints=[START+(hour+1)*3600 for hour in range(c["selection_hour"],24)]
        cursor=db.execute("SELECT "+",".join(fields)+
                          " FROM selected_swaps WHERE mint = ? ORDER BY ts,slot,idx,seq",
                          (mint,))
        name=f"coin-{k:02d}-{mint}.jsonl.gz"
        destination=out/name
        events_count=0;buys=0;sells=0;failed=0;other_quotes=0
        seen_buy_wallets=set();seen_sell_wallets=set()
        snapshots=[]
        cp=0
        def snapshot(when):
            return {
              "review_at_utc":iso(when),
              "asof_event_inclusion":"EVENT_TS_STRICTLY_BEFORE_SCAN_TIME",
              "observed_events":events_count,
              "successful_buys":buys,
              "successful_sells":sells,
              "failed_swaps":failed,
              "distinct_observed_buyer_wallets":len(seen_buy_wallets),
              "distinct_observed_seller_wallets":len(seen_sell_wallets),
              "historical_non_SOL_quote_swaps":other_quotes,
              "independent_historic_onchain_security":False,
              "contemporaneously_executable_costed_swap_quote":False,
              "gpt_paper_order":"NO_ORDER_EVIDENCE_GAP_NOT_MODEL_NO_TRADE",
              "historical_GPT_calls_made_in_replay":0
            }
        with gzip.open(destination,"wt",encoding="utf8",compresslevel=6) as outstream:
            for tup in cursor:
                e=dict(zip(fields,tup))
                if not START<=e["ts"]<END:raise ValueError("EXPORTED_TRADE_OUTSIDE_DAY")
                while cp<len(checkpoints) and checkpoints[cp]<=e["ts"]:
                    snapshots.append(snapshot(checkpoints[cp]))
                    cp+=1
                outstream.write(json.dumps({
                    "at_utc":iso(e["ts"]),**e
                },separators=(",",":"))+"\n")
                events_count+=1
                if events_count>MAX_EVENTS_EACH:
                    raise ValueError("PER_COIN_EXCEEDS_BOUNDED_COMPLETE_RECORD_CAP")
                if e["failed"]:
                    failed+=1
                elif e["side"]=="buy":
                    buys+=1
                    if e["wallet"]:seen_buy_wallets.add(e["wallet"])
                elif e["side"]=="sell":
                    sells+=1
                    if e["wallet"]:seen_sell_wallets.add(e["wallet"])
                if not e["failed"] and e["quote_mint"]!=WRAPPED_SOL:
                    other_quotes+=1
            while cp<len(checkpoints):
                snapshots.append(snapshot(checkpoints[cp]))
                cp+=1
        digest=hashlib.sha256()
        with destination.open("rb") as raw:
            for part in iter(lambda:raw.read(256*1024),b""):
                digest.update(part)
        findings.append({
          **c,"source":"REAL_RECORDED_NEUTRAL_SOLANA_LAUNCH",
          "historical_full_day_trade_sequence_path":"full_day_trade_events/"+name,
          "historical_full_day_trade_sequence_gzip_sha256":digest.hexdigest(),
          "total_historical_transaction_events":events_count,
          "successful_buys":buys,"successful_sells":sells,
          "failed_swaps":failed,"non_SOL_quote_swaps":other_quotes,
          "has_both_executed_buy_and_sell":buys>0 and sells>0,
          "timestamp_sealed_asof_hourly_analyses":snapshots,
          "historical_buy_sellability_and_execution": "UNPROVEN",
          "real_paper_GPT_buy_fill":None
        })
    selected_total=sum(x["total_historical_transaction_events"] for x in findings)
    if selected_total !=counters["selected_rows"]:
        raise ValueError("ONE_OR_MORE_MINT_TRADES_NOT_FULLY_EXPORTED")
    output={
      "schema":"sniper_r29_real_full_day_neutral_swaps_v2",
      "date":DAY,
      "source_class":"RETROSPECTIVE_THIRD_PARTY_ACTUAL_LEDGER_EVENTS",
      "verified_daywide_swaps_and_failed":counters["all_rows"],
      "verified_daywide_failed":counters["failed"],
      "verified_shards":len(proofs),
      "checked_against_publisher_block_receipt":True,
      "actual_independent_sol_rpc_attestation_per_selected_trade":False,
      "source_proofs":proofs,
      "source_receipt":manifest["receipt"],
      "neutral_coin_selection":"FIRST_TWO_TOKENS_PER_UTC_HOUR_BY_THEN_KNOWN_LAUNCH",
      "selected_mint_count":len(findings),
      "complete_selected_swaps":selected_total,
      "actual_replayed_GPT_model_calls":0,
      "actual_GPT_paper_fills":0,
      "historical_GPT_strategy_PNL_USDC":None,
      "user_wallet_or_live_paper_modified":False,
      "source_limitations":[
        "Future success/rug/ATH selection prohibited, no cherry-picked winners",
        "Archived raw swaps are actual transactions by other wallets, NOT ours",
        "Historical Mint/Freeze security proof, exact executable swap quotes and unique buyer authenticity not established",
        "Quote token decimals and quote/USD valuation not established",
        "Third-party archive is retrospective, not a historical model call",
        "Only this one day has full free swap data"
      ],
      "coins":findings
    }
    dump(REPORT,output)
    frames_public=[{
       "coin_mint":c["mint"],
       "launched_at_utc":c["launch_at_utc"],
       "selection_rule":c["selection_rule"],
       "decision_virtual_asof_utc":c["timestamp_sealed_asof_hourly_analyses"][0]["review_at_utc"],
       "visible_event_summary_asof_only":c["timestamp_sealed_asof_hourly_analyses"][0],
       "research_only":True,
       "no_historical_model_call_made":True
    } for c in findings[:6]]
    dump(DEST/"real-2026-10-15-asof-decision-frames.json",{
      "schema":"sniper_r29_real_full_day_scouter_asof_frame_only.v1",
      "historic_utc_day":DAY,
      "data_source":"ARCHIVED_REAL_LEDGER_EVENTS_3RD_PARTY",
      "source_released_later_than_event_day":True,
      "frames":frames_public,
      "does_not_contain_subsequent_trades":True,
      "no_independent_historic_contract_or_executable_quote":True
    })
    for frame in frames_public:
        print("REAL_FULLDAY_SEALED_FRAME",json.dumps(frame),flush=True)
    print("REAL_FULLDAY_RESULT",json.dumps({
      "all_actual_day_swaps":counters["all_rows"],
      "actual_failed":counters["failed"],
      "neutral_mints":len(findings),
      "complete_selected_swaps":selected_total,
      "mints_with_both_actual_buy_and_sell":sum(x["has_both_executed_buy_and_sell"] for x in findings),
      "historical_GPT_fills":0,
      "source_coverage_days":1,
      "output":str(REPORT)}),flush=True)
    db.close()

def main():
    arg=argparse.ArgumentParser()
    arg.add_argument("--stage",choices=("manifest","full"),default="manifest")
    flags=arg.parse_args()
    with tempfile.TemporaryDirectory(prefix="r29-historic-free-20261015-") as tmpdir:
        launches,manifest=prepare_meta(Path(tmpdir))
        if flags.stage=="full":full_one_day(Path(tmpdir),launches,manifest)
if __name__=="__main__":
    main()
