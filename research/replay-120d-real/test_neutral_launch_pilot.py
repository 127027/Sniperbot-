#!/usr/bin/env python3
import unittest
from datetime import datetime, timezone
from neutral_launch_pilot import PILOT_DAYS, COLS, FORBIDDEN_FUTURE, filter_frame, build_day, ts

class NeutralLaunchAsOfTests(unittest.TestCase):
    def row(self, second, mint):
        when = datetime.fromtimestamp(second,timezone.utc).isoformat().replace("+00:00","Z")
        return dict(mint=mint,creator="C"*40,t0=second,launched_at=when,
                    symbol="TEST",name="Test token")

    def test_real_universe_dates_contain_train_and_holdout(self):
        self.assertEqual(len(PILOT_DAYS),6)
        self.assertTrue(any(x<"2026-09-18" for x in PILOT_DAYS))
        self.assertTrue(any(x>="2026-09-18" for x in PILOT_DAYS))
        self.assertFalse(set(COLS) & FORBIDDEN_FUTURE)
        self.assertNotIn("graduated",COLS)
        self.assertNotIn("rugged",COLS)

    def test_future_launch_rejected_at_clock(self):
        t=ts("2026-09-18T01:00:00Z")
        rows=[self.row(t-10,"A"*40),self.row(t+10,"B"*40)]
        result=filter_frame(rows,"2026-09-18T01:00:00Z")
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]["mint"],"A"*40)

    def test_future_outcome_field_hard_fails_even_if_false(self):
        t=ts("2026-09-18T01:00:00Z")
        row=self.row(t-10,"A"*40)
        row["graduated"]=0
        with self.assertRaisesRegex(ValueError,"FUTURE_LABEL"):
            filter_frame([row],"2026-09-18T01:00:00Z")

    def test_event_times_cannot_be_mislabeled(self):
        t=ts("2026-09-18T01:00:00Z")
        row=self.row(t-10,"A"*40)
        row["launched_at"]="2026-09-18T00:00:00Z"
        with self.assertRaisesRegex(ValueError,"LAUNCH_TIME"):
            filter_frame([row],"2026-09-18T01:00:00Z")

    def test_24_hourly_frames_are_monotone_and_last_frame_sees_all(self):
        first=ts("2026-09-18T00:00:00Z")
        data=build_day("2026-09-18",{"status":"TEST_SOURCE_ONLY"},[
            self.row(first+50,"A"*40),
            self.row(first+3700,"B"*40),
            self.row(first+82000,"D"*40)])
        self.assertEqual(data["phase"],"HOLDOUT")
        self.assertEqual(len(data["frames"]),24)
        self.assertEqual(data["frames"][0]["observed_cumulative_launch_count"],1)
        self.assertEqual(data["frames"][1]["observed_cumulative_launch_count"],2)
        self.assertEqual(data["frames"][-1]["observed_cumulative_launch_count"],3)
        self.assertEqual(data["frames"][0]["new_launches_previous_hour"],1)
        self.assertEqual(data["frames"][1]["new_launches_previous_hour"],1)
        for frame in data["frames"]:
            at=ts(frame["at_utc"])
            self.assertTrue(all(x["t0"]<=at for x in frame["neutral_first_12_by_event_timestamp"]))
            self.assertEqual(frame["actual_gpt_decisions_at_this_frame"],0)
            self.assertIsNone(frame["paper_buy_fills"])
            self.assertEqual(frame["contract_sellability_liquidity_quote"],"UNKNOWN")

if __name__=="__main__":
    unittest.main()
