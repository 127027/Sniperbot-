#!/usr/bin/env python3
"""Offline invariants only. Unit fixtures are NEVER historic market data."""
import unittest
from pathlib import Path
from importlib.util import spec_from_file_location,module_from_spec
from datetime import datetime,timezone

file=Path(__file__).with_name("full-day-neutral-swaps.py")
spec=spec_from_file_location("full_day_neutral_swaps",file)
mod=module_from_spec(spec);spec.loader.exec_module(mod)

class FullDayAsOfTests(unittest.TestCase):
    def test_empty_or_late_events_never_exposed(self):
        T=mod.START+3600
        rows=[
          {"ts":T-2,"side":"buy","failed":False,"wallet":"W1"},
          {"ts":T+2,"side":"sell","failed":False,"wallet":"W2"},
          {"ts":T-1,"side":"buy","failed":True,"wallet":"W3"}
        ]
        r=mod.asof_snapshot(rows,T)
        self.assertEqual(r["observed_events"],2)
        self.assertEqual(r["successful_buys"],1)
        self.assertEqual(r["successful_sells"],0)
        self.assertEqual(r["failed_swaps"],1)
        self.assertEqual(r["unique_observed_buy_wallets"],1)
        self.assertEqual(r["paper_order"],"NOT_AUTHORIZED_DATA_GAP")
        self.assertFalse(r["gpt_model_called_in_2026_replay"])
    def test_utc_day_boundaries(self):
        self.assertEqual(mod.END-mod.START,86400)
        self.assertEqual(mod.iso(mod.START),"2026-10-15T00:00:00Z")
        self.assertEqual(mod.iso(mod.END),"2026-10-16T00:00:00Z")
    def test_counts_only_after_full_census(self):
        self.assertEqual(sum(mod.ROW_COUNTS),42_230_410)
        self.assertEqual(sum(mod.SIZES),1_373_422_244)
        self.assertEqual(mod.MAX_EVENTS_EACH,12000)
        self.assertEqual(mod.MAX_SELECTION,50000)
    def test_fail_closed_source_size(self):
        self.assertEqual(mod.META["launches/pumpdata-2026-10-15-launches.parquet"],3395780)
        self.assertTrue(mod.HF.startswith("https://huggingface.co/datasets/"))
        self.assertEqual(mod.SCANNED_COLUMNS.count("mint"),1)

if __name__=="__main__":
    unittest.main()
