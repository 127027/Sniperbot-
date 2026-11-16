#!/usr/bin/env python3
"""Neutral Solana launch-source neutral universe for R29 120d genuine historical work.
NO GPT calls, trading, fills, hidden future/outcome labels, or live channels.
Use ONLY creator-signed-at-launch token identity, vetted by event time.
Third-party retrospective capture is NOT independent as-of execution evidence.
"""
import hashlib
import json
import os
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
import tempfile
from urllib.request import Request, urlopen

import pyarrow.parquet as pq

REVISION = "9b9a04e7e3e85775d614d16105daad2e69ce8544"
DATASET = "loopholetape/pumpfun-launches"
LAUNCH_DAYS = tuple(
    (datetime(2026, 8, 31, tzinfo=timezone.utc) + timedelta(days=i)).strftime("%Y-%m-%d")
    for i in range(67)
)
TRAIN_END = "2026-09-18"
COLS = ("mint", "creator", "t0", "launched_at", "name", "symbol")
FORBIDDEN_FUTURE = {
    "graduated", "migrate_dt_s", "rugged", "rug_dt_s", "peak_rs",
    "terminal_rs", "dev_first_sell_dt_s", "curve_complete",
    "curve_read_at", "rug_branch_inferred", "f10_rep_rug",
    "f10_rep_grad", "f60_rs"
}
ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "generated" / "neutral-launches-67d.json"
MAX_FILE_BYTES = 20_000_000


def ts(s):
    if not isinstance(s, str) or not s.endswith("Z"):
        raise ValueError("UTC_ISO_REQUIRED")
    return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()


def filter_frame(rows, scan_iso, limit=12):
    """Deliberately excludes any row not yet created at this virtual T."""
    if not isinstance(limit, int) or not 0 <= limit <= 12:
        raise ValueError("FRAME_LIMIT")
    now = ts(scan_iso)
    subset = []
    for row in rows:
        if set(row) - set(COLS):
            raise ValueError("FUTURE_LABEL_ENTERED_DECISION_INPUT")
        if not isinstance(row.get("mint"), str) or not isinstance(row.get("creator"), str):
            continue
        if not isinstance(row.get("t0"), (int, float)):
            continue
        if float(row["t0"]) > now:
            continue
        if abs(float(row["t0"]) - ts(row.get("launched_at"))) > 0.002:
            raise ValueError("LAUNCH_TIME_INCONSISTENT")
        subset.append(row)
    subset.sort(key=lambda r: (r["t0"], r["mint"]))
    return subset[:limit]


def load_day(day):
    if day not in LAUNCH_DAYS:
        raise ValueError("UNAPPROVED_EXTERNAL_DAY")
    config = "launches_legacy" if day <= "2026-09-26" else "launches"
    url = (f"https://huggingface.co/datasets/{DATASET}/resolve/{REVISION}/"
           f"data/{config}/{day}.parquet?download=true")
    digest = hashlib.sha256()
    with tempfile.TemporaryDirectory(prefix="r29-launch-read-") as tmpdir:
        dest = Path(tmpdir) / "launches.parquet"
        req = Request(url, headers={
            "User-Agent": "Sniper-R29-Point-In-Time-Research/1",
            "Accept": "application/octet-stream"
        })
        with urlopen(req, timeout=40) as response, dest.open("wb") as f:
            while True:
                data = response.read(128 * 1024)
                if not data:
                    break
                if f.tell() + len(data) > MAX_FILE_BYTES:
                    raise ValueError("SOURCE_FILE_EXCEEDS_BOUND")
                digest.update(data)
                f.write(data)
        # Read ONLY launch-time columns. No future success/ATH/rug fields
        # are ever loaded, serialized or handed to decision frames.
        table = pq.read_table(dest, columns=list(COLS))
        if table.num_rows <= 0 or table.num_rows > 100000:
            raise ValueError("INVALID_UNIVERSE_SIZE")
        rows = table.to_pylist()
        checked = []
        for row in rows:
            mint = row.get("mint")
            launch = row.get("launched_at")
            when = ts(launch)
            if not isinstance(mint, str) or not 32 <= len(mint) <= 44:
                raise ValueError("INVALID_MINT")
            if datetime.fromtimestamp(when, timezone.utc).strftime("%Y-%m-%d") != day:
                raise ValueError("LAUNCH_OUTSIDE_DECLARED_DATE")
            if abs(float(row["t0"]) - when) > .002:
                raise ValueError("INCONSISTENT_EVENT_TIME")
            checked.append(row)
        if len({r["mint"] for r in checked}) != len(checked):
            raise ValueError("DUPLICATE_LAUNCH_TOKEN")
        return {
            "source_url": url, "provider_subset": config, "raw_parquet_sha256": digest.hexdigest(),
            "total_records_in_day": len(checked), "launch_min_utc": min(r["launched_at"] for r in checked),
            "launch_max_utc": max(r["launched_at"] for r in checked)
        }, checked


def build_day(day, source, rows):
    base = datetime.fromisoformat(day).replace(tzinfo=timezone.utc)
    frames = []
    prior = 0
    for hour in range(24):
        tick = base + timedelta(hours=hour + 1)
        # Hourly checkpoint AFTER previous hour ends, never earlier.
        moment = tick.isoformat().replace("+00:00", "Z")
        seen = sum(row["t0"] < tick.timestamp() for row in rows)
        eligible = [row for row in rows
                    if base.timestamp() + hour * 3600 <= row["t0"] < tick.timestamp()]
        front = filter_frame(eligible, moment)
        if any(r["t0"] > tick.timestamp() for r in front):
            raise ValueError("FUTURE_LEAKAGE")
        frames.append({
            "at_utc": moment,
            "observed_cumulative_launch_count": seen,
            "new_launches_previous_hour": len(eligible),
            "neutral_first_12_by_event_timestamp": front,
            "source_captured_retroactively": True,
            "source_has_not_verified_independent_asof_onchain_snapshot": True,
            "contract_sellability_liquidity_quote": "UNKNOWN",
            "actual_gpt_decisions_at_this_frame": 0,
            "paper_buy_fills": None
        })
        if seen < prior:
            raise ValueError("NON_MONOTONIC_LAUNCH_COUNT")
        prior = seen
    if sum(f["new_launches_previous_hour"] for f in frames) != len(rows):
        raise ValueError("DAY_EVENT_COVERAGE_DROPPED_OR_DUPLICATED")
    return {
        "day": day, "phase": "TRAIN" if day < TRAIN_END else "HOLDOUT",
        "source": source, "records_excluded_outcome_columns": sorted(FORBIDDEN_FUTURE),
        "frames": frames, "source_provenance": "RETROSPECTIVE_THIRD_PARTY_CAPTURE_UNVERIFIED_AT_EACH_T",
        "is_this_a_complete_120d_neutral_universe": False
    }


def main():
    assert not (set(COLS) & FORBIDDEN_FUTURE)
    result = {
        "schema": "sniper_r29_real120_neutral_pump_launch_67days.v1",
        "source_dataset": DATASET, "pinned_revision": REVISION,
        "source_license": "CC-BY-4.0",
        "declared_dataset_coverage": ["2026-08-31", "2026-11-05"],
        "covered_days": list(LAUNCH_DAYS),
        "declaration": "Actual captured Solana launches, but late-published source and source recorder errors; NOT execution-tradable evidence.",
        "limitations": [
            "2026-07-20 through 2026-08-30 missing from this source",
            "2026-11-06 through 2026-11-16 missing from this source",
            "legacy capture pre-2026-09-27 missed some buy instructions; no early buy features read",
            "capture may have other gaps and does not prove complete neutral launch universe",
            "future outcome and 60-second features are never loaded",
            "historical contract safety, liquidity, independent sellability and exact executable DEX prices unverified",
            "scanning a recorded event is not an historical model call or user paper trade"
        ],
        "days": [], "total_real_solana_launches_covered": 0,
        "total_time_sealed_hour_frames": 0, "source_errors": []
    }
    for day in LAUNCH_DAYS:
        try:
            source, rows = load_day(day)
            data = build_day(day, source, rows)
            result["days"].append(data)
            result["total_real_solana_launches_covered"] += source["total_records_in_day"]
            result["total_time_sealed_hour_frames"] += len(data["frames"])
            print("NEUTRAL_LAUNCH_DAY", day, source["total_records_in_day"],
                  source["raw_parquet_sha256"])
        except Exception as exc:
            error = {"day": day, "error": type(exc).__name__ + ": " + str(exc)[:180]}
            result["source_errors"].append(error)
            print("NEUTRAL_LAUNCH_SOURCE_GAP", day, error["error"], flush=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("NEUTRAL_LAUNCH_MANIFEST", json.dumps({
        "days_success": len(result["days"]),
        "days_failed": len(result["source_errors"]),
        "total_captured_mints": result["total_real_solana_launches_covered"],
        "time_sealed_hour_frames": result["total_time_sealed_hour_frames"],
        "not_historical_gpt_trades": True,
        "output_path": str(OUTPUT)
    }))
    if not result["days"]:
        raise RuntimeError("NO_AUTHENTIC_HISTORIC_LAUNCH_DAY_RETRIEVED")


if __name__ == "__main__":
    main()
