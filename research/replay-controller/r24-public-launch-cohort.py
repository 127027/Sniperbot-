#!/usr/bin/env python3
"""R24 neutral 50+ Solana launch discovery from a public historical parquet export.

Research-only; NO orders, wallets, model calls or live trading. This is an
UNVERIFIED retrospective discovery cohort, not a certified blind-test feed.
Do not send this file into R22 as-of intake as verified source evidence.
"""
import argparse
import csv
import hashlib
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCHEMA = "r24_public_launch_cohort.v1"
SOURCE = "https://huggingface.co/datasets/Slinky21/Pumpfun_Memecoin_Corpus"
KNOWN_OUTAGE_DAY = "2026-07-03"
MINT = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
CLOCK_COLS = ("created_at", "first_seen_at", "launch_at", "minted_at",
              "token_created_at", "first_trade_at", "block_time", "event_ts")
NAME_COLS = ("token_name", "name", "coin_name")
SYMBOL_COLS = ("symbol", "ticker", "token_symbol")


def fail(reason):
    raise ValueError(reason)


def utc(value):
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
    if dt.tzinfo is None:
        fail("TIMESTAMP_WITHOUT_TIMEZONE")
    return dt.astimezone(timezone.utc)


def chosen(cols, candidates, mandatory=False):
    hit = next((x for x in candidates if x in cols), None)
    if mandatory and hit is None:
        fail("NO_LAUNCH_TIMESTAMP_COLUMN_AVAILABLE: " + ",".join(sorted(cols)))
    return hit


def quote(identifier):
    return '"' + identifier.replace('"', '""') + '"'


def csv_rows(source, start, end):
    with open(source, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or "mint" not in reader.fieldnames:
            fail("CSV_MINT_COLUMN_MISSING")
        cols = set(reader.fieldnames)
        when = chosen(cols, CLOCK_COLS, mandatory=True)
        name = chosen(cols, NAME_COLS)
        symbol = chosen(cols, SYMBOL_COLS)
        for row in reader:
            value = utc(row[when])
            if start <= value < end:
                yield {"mint": row["mint"], "at": value,
                       "name": row.get(name) if name else None,
                       "symbol": row.get(symbol) if symbol else None}


def parquet_rows(source, start, end):
    try:
        import duckdb
    except ImportError:
        fail("DUCKDB_REQUIRED_FOR_PARQUET: python -m pip install duckdb")
    db = duckdb.connect(database=":memory:")
    try:
        cols = {r[0] for r in db.execute("DESCRIBE SELECT * FROM read_parquet(?)", [str(source)]).fetchall()}
        if "mint" not in cols:
            fail("PARQUET_MINT_COLUMN_MISSING")
        when = chosen(cols, CLOCK_COLS, mandatory=True)
        name = chosen(cols, NAME_COLS)
        symbol = chosen(cols, SYMBOL_COLS)
        name_sql = "CAST(" + quote(name) + " AS VARCHAR)" if name else "NULL"
        symbol_sql = "CAST(" + quote(symbol) + " AS VARCHAR)" if symbol else "NULL"
        clock = "CAST(" + quote(when) + " AS TIMESTAMPTZ)"
        sql = ("SELECT CAST(mint AS VARCHAR), " + clock + ", " + name_sql + ", " +
               symbol_sql + " FROM read_parquet(?) WHERE " + clock +
               " >= ? AND " + clock + " < ? ORDER BY 2,1")
        # No outcomes, ATH, graduation, later balances or post-launch aggregates
        # are read into the agent-facing selection.
        for mint, at, name_value, symbol_value in db.execute(sql, [str(source), start, end]).fetchall():
            yield {"mint": mint, "at": utc(at), "name": name_value, "symbol": symbol_value}
    finally:
        db.close()


def digest_file(filename):
    h = hashlib.sha256()
    with open(filename, "rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def build(rows, *, start, end, per_day, target, source_hash, source_type):
    if not (start < end):
        fail("BAD_TIME_WINDOW")
    if not (1 <= per_day <= 500 and 1 <= target <= 50000):
        fail("INVALID_SELECTION_LIMIT")
    days = []
    cursor = start.date()
    while cursor < end.date() or (cursor == end.date() and end.time().isoformat() != "00:00:00"):
        days.append(cursor.isoformat())
        cursor += timedelta(days=1)
    if KNOWN_OUTAGE_DAY in days:
        fail("KNOWN_2026_07_03_WEBSOCKET_OUTAGE: USE_SEPARATE_GAP_CASE")
    daily = defaultdict(list)
    seen = set()
    dropped = {"invalid_mint": 0, "duplicate_mint": 0, "out_of_window": 0}
    for record in rows:
        at = utc(record["at"])
        if at < start or at >= end:
            dropped["out_of_window"] += 1
            continue
        mint = record["mint"]
        if not isinstance(mint, str) or not MINT.fullmatch(mint):
            dropped["invalid_mint"] += 1
            continue
        if mint in seen:
            dropped["duplicate_mint"] += 1
            continue
        seen.add(mint)
        daily[at.date().isoformat()].append({
            "mint": mint, "at": at,
            "name": record.get("name"), "symbol": record.get("symbol")
        })
    selected = []
    for day in days:
        # First-N daily is independent of future success and can be emulated online.
        entries = sorted(daily[day], key=lambda r: (r["at"], r["mint"]))
        selected.extend(entries[:per_day])
    selected = selected[:target]
    launches = []
    for r in selected:
        mint = r["mint"]
        label = {"name": r.get("name"), "symbol": r.get("symbol")}
        launches.append({
            "id": "launch:" + hashlib.sha256(mint.encode()).hexdigest()[:24],
            "candidate_id": "sol:" + mint, "chain": "solana",
            "event_at": r["at"].isoformat().replace("+00:00", "Z"),
            "kind": "TOKEN_LAUNCH_UNVERIFIED",
            "launch_metadata": label,
            "asof_verified": False,
            "onchain_verified": False,
            "quote_verified": False,
            "security_verified": False,
            "proof": {
                "method": "PUBLIC_RETROSPECTIVE_EXPORT",
                "source_file_sha256": source_hash,
                "source_uri": SOURCE,
                "original_timestamp_capture_verified": False
            }
        })
    count_by_day = {d: len(daily[d]) for d in days}
    return {
        "schema": SCHEMA, "mode": "TRAINING_ONLY_RESEARCH_ONLY",
        "source": SOURCE, "source_file_sha256": source_hash,
        "source_type": source_type,
        "window": {"start": start.isoformat().replace("+00:00", "Z"),
                   "end_exclusive": end.isoformat().replace("+00:00", "Z")},
        "selection": "FIRST_N_NEW_LAUNCHES_PER_UTC_DAY_NO_FUTURE_LABELS",
        "daily_quota": per_day, "requested_candidates": target,
        "distinct_valid_launches_in_window": len(seen),
        "selected_candidates": len(launches),
        "target_candidates_found": len(launches) >= target,
        "independently_confirmed_memecoins": 0,
        "historically_executable_buy_signals": 0,
        "real_or_paper_trades": 0,
        "observed_launch_rows_by_day": count_by_day,
        "incomplete_daily_quotas": [day for day in days if count_by_day[day] < per_day],
        "data_quality_dropped": dropped,
        "future_outcome_columns_exposed": False,
        "neutral_blindtest_ready": False,
        "limitations": [
            "This third-party historical export has not been independently as-of verified.",
            "A pump.fun launch is a candidate, not proof that a token is a genuine memecoin.",
            "Launch metadata may have been revised after launch; independently verify.",
            "The dataset has published trade, holder, and coverage defects.",
            "Future graduation and outcome labels are excluded and must stay in an isolated evaluator.",
            "No liquidity, quotes, gas, sellability or executable trades are demonstrated.",
            "The selected cohort is limited to the specified UTC days and is not all chains."
        ],
        "launches": launches
    }


def self_test():
    start = utc("2026-06-12T00:00:00Z")
    end = utc("2026-06-22T00:00:00Z")
    alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    records = []
    for d in range(10):
        for i in range(6):
            # Differ only in mint, never in later profit or label.
            number = d * 6 + i
            a = alphabet[number % len(alphabet)]
            b = alphabet[(number // len(alphabet)) % len(alphabet)]
            records.append({"mint": a * 40 + b,
                            "at": start + timedelta(days=d, minutes=i),
                            "name": "test", "symbol": "TST",
                            "graduated": i == 5, "outcome_label": "major_pump"})
    result = build(records, start=start, end=end, per_day=5, target=50,
                   source_hash="test-only", source_type="SYNTHETIC_UNIT_TEST")
    assert result["selected_candidates"] == 50, result["selected_candidates"]
    assert result["independently_confirmed_memecoins"] == 0
    assert "outcome_label" not in json.dumps(result)
    assert result["future_outcome_columns_exposed"] is False
    assert len(result["observed_launch_rows_by_day"]) == 10
    try:
        build([], start=utc("2026-07-03T00:00:00Z"),
              end=utc("2026-07-04T00:00:00Z"), per_day=5,
              target=50, source_hash="x", source_type="TEST")
        raise AssertionError("OUTAGE_UNDETECTED")
    except ValueError as exc:
        assert "OUTAGE" in str(exc)
    print("R24_SELF_TEST_OK: 50 synthetic launches, 0 real memecoins, no future labels")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--tokens", help="Local source tokens.parquet or .csv")
    p.add_argument("--output", help="New research-only JSON output; never overwrites")
    p.add_argument("--start", default="2026-06-12T00:00:00Z")
    p.add_argument("--end-exclusive", default="2026-06-22T00:00:00Z")
    p.add_argument("--per-day", type=int, default=5)
    p.add_argument("--target", type=int, default=50)
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.tokens or not args.output:
        fail("MISSING_TOKENS_OR_OUTPUT")
    src, out = Path(args.tokens), Path(args.output)
    if not src.is_file() or out.exists():
        fail("INPUT_MISSING_OR_OUTPUT_EXISTS")
    start, end = utc(args.start), utc(args.end_exclusive)
    source_type = "PARQUET" if src.suffix.lower() == ".parquet" else "CSV"
    if source_type == "PARQUET":
        rows = parquet_rows(src, start, end)
    elif src.suffix.lower() == ".csv":
        rows = csv_rows(src, start, end)
    else:
        fail("ONLY_PARQUET_OR_CSV_SUPPORTED")
    result = build(rows, start=start, end=end, per_day=args.per_day,
                   target=args.target, source_hash=digest_file(src),
                   source_type=source_type)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "x", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(json.dumps({"status": "RESEARCH_COHORT_ONLY",
                      "selected_candidates": result["selected_candidates"],
                      "verified_memecoins": 0, "paper_trades": 0,
                      "source_sha256": result["source_file_sha256"],
                      "output": str(out)}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, RuntimeError) as ex:
        print("R24_BLOCKED: " + str(ex)[:300], file=sys.stderr)
        sys.exit(2)
