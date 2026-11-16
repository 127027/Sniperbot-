#!/usr/bin/env python3
"""Append-only, post-decision outcomes of authentic 2026-10-15 Solana trades.

Never put future price observations into historic GPT decision frames.
Raw same-quote+same-venue+same-pool price ratios are RESEARCH observations,
not hypothetical executable paper fills or realized USD profit.
"""
import gzip
import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "generated" / "complete-2026-10-15-neutral-token-swaps.json"
REVIEW = HERE / "reviews" / "2026-10-15-six-neutral-real-frames-current-gpt.json"
OUTPUT = HERE / "generated" / "2026-10-15-posthoc-six-coin-outcomes.json"
MIN_PRICE_RATIO = Decimal("1.75")
MAX_OBSERVED_EVENTS = 3000000
DAY_END_UTC = "2026-10-16T00:00:00Z"


def parse_time(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("TIME_MUST_BE_UTC")
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as raw:
        for chunk in iter(lambda: raw.read(256 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def executed_price_record(event, expected_mint):
    if event.get("mint") != expected_mint or event.get("failed") not in (False, 0):
        return None
    if event.get("side") not in ("buy", "sell") or not isinstance(event.get("venue"), str):
        return None
    quote = event.get("quote_mint")
    if not isinstance(quote, str) or not quote:
        return None
    try:
        q = Decimal(str(event.get("quote_amount_raw", event.get("quote_amount"))))
        units = Decimal(str(event.get("token_amount_raw", event.get("token_amount"))))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if not q.is_finite() or not units.is_finite() or q <= 0 or units <= 0:
        return None
    event_time = event.get("at_utc")
    if event_time is None and isinstance(event.get("ts"), int):
        event_time = datetime.fromtimestamp(event["ts"], timezone.utc).isoformat().replace("+00:00", "Z")
    t = parse_time(event_time)
    return {"t": t, "at_utc": event_time, "price": q / units,
            "quote_mint": quote, "venue": event["venue"],
            "pool": event.get("pool"), "side": event["side"],
            "wallet": event.get("wallet")}


def audit_review(decision, events, evaluation_at_utc=DAY_END_UTC, baseline_minutes=60):
    """Return observed post-hoc price ratios; NEVER a profit or order."""
    when = parse_time(decision["virtual_decision_at_utc"])
    evaluation = parse_time(evaluation_at_utc)
    if evaluation <= when:
        raise ValueError("FUTURE_OUTCOME_NOT_AVAILABLE_YET")
    mint = decision["mint"]
    vetted = []
    for event in events:
        p = executed_price_record(event, mint)
        if p is not None and p["t"] < evaluation:
            vetted.append(p)
    vetted.sort(key=lambda r: (r["t"], r["at_utc"]))
    baseline_candidates = [r for r in vetted
                           if when - baseline_minutes * 60 <= r["t"] < when]
    base = baseline_candidates[-1] if baseline_candidates else None
    output = {
        "chain": "solana", "mint": mint,
        "original_verdict_immutable": decision["research_verdict"],
        "original_decision_at_utc": decision["virtual_decision_at_utc"],
        "posthoc_evaluated_asof_utc": evaluation_at_utc,
        "real_data_scope": "THIRD_PARTY_RECORDED_EXECUTED_TRADES_BY_OTHERS",
        "sourced_trade_rows": len(events),
        "matching_successful_spot_price_rows": len(vetted),
        "reference_price_at_or_before_decision": None,
        "reference_quote_mint": None,
        "reference_pool": None,
        "reference_venue": None,
        "future_same_pool_quote_trade_count": 0,
        "observed_peak_price_multiple": None,
        "observed_low_price_multiple": None,
        "observed_later_75pct_price_rise": None,
        "hypothetical_executable_fill_verified": False,
        "hypothetical_pnl_test_usdc": None,
        "rejected_coin_trade_would_have_been_safe": None,
        "current_policy_may_retroactively_change_original_decision": False,
        "result": "NO_COMPARABLE_PRE_DECISION_TRADE"
    }
    if base is None:
        return output
    matching = [r for r in vetted if when <= r["t"] < evaluation and
                r["pool"] == base["pool"] and
                r["venue"] == base["venue"] and
                r["quote_mint"] == base["quote_mint"]]
    output.update({
        "reference_at_utc": base["at_utc"],
        "reference_price_at_or_before_decision": str(base["price"]),
        "reference_quote_mint": base["quote_mint"],
        "reference_pool": base["pool"],
        "reference_venue": base["venue"],
        "future_same_pool_quote_trade_count": len(matching),
        "result": "NO_COMPARABLE_POST_DECISION_TRADE"
    })
    if not matching:
        return output
    ratios = [(r["price"] / base["price"], r) for r in matching]
    peak, extreme = max(ratios, key=lambda z: z[0])
    low, low_event = min(ratios, key=lambda z: z[0])
    later_rise = peak >= MIN_PRICE_RATIO
    rejected = decision["research_verdict"] in ("WATCH", "NO_TRADE")
    output.update({
        "observed_peak_price_multiple": float(round(peak, 8)),
        "observed_low_price_multiple": float(round(low, 8)),
        "observed_peak_at_utc": extreme["at_utc"],
        "observed_low_at_utc": low_event["at_utc"],
        "later_75pct_move_in_actual_third_party_trade_price": later_rise,
        "observed_later_75pct_price_rise": bool(later_rise and rejected),
        "distinct_future_trade_wallets_in_matched_market":
            len(set(r["wallet"] for r in matching if r["wallet"])),
        "result": "REJECTED_OR_WATCHED_LATER_RALLY_IN_RECORDED_PRICES_NOT_EXECUTABLE_PROFIT"
            if later_rise and rejected else
            "POSTHOC_COMPARABLE_TRANSACTION_PRICES_OBSERVED",
        "caveat": "Ratios compare RAW native quote/token units for SAME token, quote asset, venue and pool. Decimals cancel for relative changes, not for USD valuation. Single-price spikes, impact, market manipulation and unavailable fills remain unverified."
    })
    return output


def read_events(path):
    records = []
    with gzip.open(path, "rt", encoding="utf8") as f:
        for line in f:
            records.append(json.loads(line))
            if len(records) > MAX_OBSERVED_EVENTS:
                raise ValueError("OVER_BOUNDED_MINT_TRADE_COUNT")
    return records


def run():
    source = json.loads(SOURCE.read_text())
    review = json.loads(REVIEW.read_text())
    if source.get("schema") != "sniper_r29_real_full_day_neutral_swaps_v2":
        raise ValueError("UNEXPECTED_SOURCE_COHORT_SCHEMA")
    if review.get("type") != "CURRENT_GPT_RETROSPECTIVE_RESEARCH_ONLY":
        raise ValueError("NOT_A_SEALED_PRE_EXISTING_MODEL_REVIEW")
    if source.get("selected_mint_count") != 48 or len(review.get("decisions", [])) != 6:
        raise ValueError("UNEXPECTED_SOURCE_OR_REVIEW_COUNT")
    coins = {x["mint"]: x for x in source["coins"]}
    audits = []
    for decision in review["decisions"]:
        mint = decision["mint"]
        if mint not in coins:
            raise ValueError("REVIEW_TOKEN_NOT_SELECTED_BY_NEUTRAL_RULE")
        x = coins[mint]
        if "generated/" in x["historical_full_day_trade_sequence_path"]:
            raise ValueError("DANGEROUS_SOURCE_PATH")
        file = HERE / "generated" / x["historical_full_day_trade_sequence_path"]
        expected = x["historical_full_day_trade_sequence_gzip_sha256"]
        if sha256_file(file) != expected:
            raise ValueError("HISTORICAL_SOURCE_HASH_MISMATCH")
        events = read_events(file)
        if len(events) != x["total_historical_transaction_events"]:
            raise ValueError("HISTORICAL_MINT_TRADES_INCOMPLETE")
        audit = audit_review(decision, events)
        audit["source_gzip_sha256"] = expected
        audits.append(audit)
    report = {
        "schema": "sniper_r29_posthoc_real_oct15_outcome_v1",
        "data_day": "2026-10-15",
        "review_originally_authored_on": review["authored_now_utc"],
        "audit_performed_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "comparison_window_cutoff_utc": DAY_END_UTC,
        "immutable_original_review_ref": "research/replay-120d-real/reviews/2026-10-15-six-neutral-real-frames-current-gpt.json",
        "source_census": {"total_daily_events": source["verified_daywide_swaps_and_failed"],
                          "selected_mints": source["selected_mint_count"],
                          "all_selected_swap_events": source["complete_selected_swaps"]},
        "audits": audits,
        "missed_raw_price_move_count_not_missed_executable_winners": sum(
            x["observed_later_75pct_price_rise"] is True for x in audits),
        "original_decisions_rewritten": False,
        "independently_executable_USDC_profit_demonstrated": False,
        "requires_forward_paper_validation": True,
        "lessons": [
            {"mint": x["mint"], "policy_change_now": False,
             "forward_only_research_hypothesis": (
                "Check whether independent buyer diversity, contract safety, current pool depth and comparable contemporaneous executed quotes could have made this candidate watchable. Preserve fail-closed safety gates; never backfill earlier model decisions."
             ),"price_spike_is_not_proven_tradeable": True}
            for x in audits if x["observed_later_75pct_price_rise"] is True
        ]
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    print("REAL_POSTHOC_OUTCOME", json.dumps({
        "actual_reviews_audited": len(audits),
        "posthoc_detected_75pct_raw_price_rallies": report["missed_raw_price_move_count_not_missed_executable_winners"],
        "results": [(x["mint"], x["original_verdict_immutable"], x["result"],
                     x["observed_peak_price_multiple"]) for x in audits],
        "source_complete_but_dex_USDC_fill_unverified": True,
        "filepath": str(OUTPUT)
    }))


if __name__ == "__main__":
    run()
