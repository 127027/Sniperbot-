#!/usr/bin/env python3
"""Synthetic fixtures ONLY for temporal correctness of real-data audit."""
import importlib.util
from pathlib import Path
import unittest

target=Path(__file__).with_name("actual-outcome-audit.py")
spec=importlib.util.spec_from_file_location("actual_outcome_audit",target)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
MINT="DKqreigeHRrprvz7zduATdY3442dgVbsuhMSZ35Ppump"
D={"mint":MINT,"virtual_decision_at_utc":"2026-10-15T01:00:00Z","research_verdict":"WATCH"}
def swap(ts,quote,quote_mint="SOL",pool="pool1",mint=MINT,failed=False):
    return {"mint":mint,"at_utc":ts,"failed":failed,"side":"buy",
            "venue":"curve","pool":pool,"quote_mint":quote_mint,
            "quote_amount_raw":quote,"token_amount_raw":100,"wallet":"W"}

class TestPosthoc(unittest.TestCase):
    def test_correct_candidate_future_observed_later_rally(self):
        a=mod.audit_review(D,[
            swap("2026-10-15T00:59:00Z",100),
            swap("2026-10-15T01:10:00Z",200),
            swap("2026-10-15T01:20:00Z",500,pool="wrongpool"),
            swap("2026-10-15T01:30:00Z",500,mint="othermint")
        ],"2026-10-15T02:00:00Z")
        self.assertEqual(a["observed_peak_price_multiple"],2.0)
        self.assertEqual(a["future_same_pool_quote_trade_count"],1)
        self.assertTrue(a["observed_later_75pct_price_rise"])
        self.assertEqual(a["hypothetical_pnl_test_usdc"],None)
        self.assertFalse(a["hypothetical_executable_fill_verified"])
    def test_missing_pre_decision_price_means_unknown_not_winner(self):
        a=mod.audit_review(D,[swap("2026-10-15T01:20:00Z",100)],
                           "2026-10-16T00:00:00Z")
        self.assertEqual(a["result"],"NO_COMPARABLE_PRE_DECISION_TRADE")
        self.assertIsNone(a["observed_later_75pct_price_rise"])
    def test_same_native_quote_venue_pool_needed(self):
        a=mod.audit_review(D,[
            swap("2026-10-15T00:59:00Z",100),
            swap("2026-10-15T01:20:00Z",10000,"USDC"),
            swap("2026-10-15T01:25:00Z",10000,pool="otherpool"),
            swap("2026-10-15T01:30:00Z",10000,failed=True)
        ],"2026-10-16T00:00:00Z")
        self.assertEqual(a["result"],"NO_COMPARABLE_POST_DECISION_TRADE")
        self.assertIsNone(a["observed_peak_price_multiple"])
    def test_next_day_data_cannot_go_back_to_old_outcome_cutoff(self):
        a=mod.audit_review(D,[
            swap("2026-10-15T00:59:00Z",100),
            swap("2026-10-15T02:00:00Z",300)
        ],"2026-10-15T01:30:00Z")
        self.assertIsNone(a["observed_peak_price_multiple"])
    def test_no_posthoc_history_in_original_research(self):
        a=mod.audit_review(D,[
            swap("2026-10-15T00:59:00Z",100),
            swap("2026-10-15T02:00:00Z",200)
        ],"2026-10-16T00:00:00Z")
        self.assertFalse(a["current_policy_may_retroactively_change_original_decision"])
        self.assertEqual(a["original_verdict_immutable"],"WATCH")
        self.assertEqual(a["result"],"REJECTED_OR_WATCHED_LATER_RALLY_IN_RECORDED_PRICES_NOT_EXECUTABLE_PROFIT")

if __name__=="__main__":
    unittest.main()
