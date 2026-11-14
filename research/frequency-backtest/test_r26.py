#!/usr/bin/env python3
import copy,hashlib,json,math,unittest
from datetime import datetime,timezone
from r26_replay import (asof_signal,eligible_data,evaluate,run,FREQUENCIES,START_MS,
                         END_MS,HOUR_MS,REQUIRED_WARMUP)

# All generated prices are deliberately SYNTHETIC UNIT TEST FIXTURES, not
# historical 2026 evidence. They never enter the real backtest result.
def fixture(dynamic=False):
    warmup=48;hours=360+warmup
    names=["DOGEUSDT","PEPEUSDT","SHIBUSDT","BONKUSDT","FLOKIUSDT","WIFUSDT"]
    symbols={}
    for n,name in enumerate(names):
        bars=[]
        for i in range(hours):
            t=START_MS+(i-warmup)*HOUR_MS
            price=1.0+(0.0015*i+0.045*math.sin(i/7+n*.2)) if dynamic else 1.0
            high=price*1.002
            low=price*.998
            b={"t":t,"o":price,"h":high,"l":low,"c":price,
               "qv":2000000.0,"trades":3000}
            bars.append(b)
        digest=hashlib.sha256(json.dumps(bars,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        symbols[name]={"symbol":name,"status":"COMPLETE","expected_bars":hours,
                       "observed_bars":hours,"missing_bars":0,"sha256_normalized":digest,
                       "source_url":"https://synthetic.invalid/NOT_A_REAL_PROVIDER","bars":bars}
    return {"schema":"sniper_r26_binance_spot_hourly.v1",
       "start_utc":"2026-10-30T00:00:00Z","end_exclusive_utc":"2026-11-14T00:00:00Z",
       "quote_currency":"USDT","warmup_hours":warmup,
       "predeclared_symbols":names,"symbols":symbols}

class FrequencyBacktestTests(unittest.TestCase):
    def test_615_epochs_independent_full_budget(self):
        r,_=run(fixture())
        self.assertEqual(r["total_scheduled_epochs"],615)
        self.assertEqual([x["completed_analysis_epochs"] for x in r["runs"]],[15,60,180,360])
        self.assertTrue(all(x["initial_test_usdc"]==5000 and x["net_pnl_test_usdc"]==0
                           for x in r["runs"]))
        self.assertTrue(all(x["realized_trade_count"]==0 for x in r["runs"]))
        self.assertTrue(all(x["max_open_cost_test_usdc"]==0 for x in r["runs"]))
    def test_future_candle_edits_cannot_change_asof_signal(self):
        bars=fixture(dynamic=True)["symbols"]["PEPEUSDT"]["bars"]
        at=120
        signal=asof_signal(bars[:at])
        after=copy.deepcopy(bars)
        for i in range(at,len(after)):
            after[i]["o"]*=10
            after[i]["c"]*=10
            after[i]["qv"]*=1000
            after[i]["h"]*=10
            after[i]["l"]*=10
        self.assertEqual(signal,asof_signal(after[:at]))
    def test_fee_risk_pnl_and_position_cap(self):
        baseline=fixture(dynamic=True)
        r,detailed=run(baseline)
        self.assertEqual(len(r["runs"]),4)
        self.assertTrue(any(x["buy_count"]>0 for x in r["runs"]))
        for x in r["runs"]:
            self.assertLessEqual(x["max_open_cost_test_usdc"],5000.000001)
            self.assertLessEqual(x["max_concurrent_positions"],5)
            self.assertGreaterEqual(x["ending_cash_test_usdc"],0)
            self.assertAlmostEqual(x["net_pnl_test_usdc"],
               x["realized_pnl_test_usdc"]+x["unrealized_net_pnl_test_usdc"],places=4)
            for trade in x["buys"]:
                self.assertGreaterEqual(trade["size_test_usdc"],50)
                self.assertLessEqual(trade["size_test_usdc"],5000)
            for trade in x["sells"]:
                self.assertTrue(trade["simulated_not_real_fill"])
                self.assertFalse("REAL_FILL" in trade["execution_evidence"])
        self.assertEqual(r["test_type"],"DETERMINISTIC_PRICE_ONLY_BASELINE_NOT_ACTUAL_AI_NEWS")
    def test_mutation_breaks_source_sha_and_blocks_coverage(self):
        data=fixture(dynamic=True)
        data["symbols"]["PEPEUSDT"]["bars"][70]["c"]*=1.2
        self.assertNotIn("PEPEUSDT",eligible_data(data))
        for name in list(data["symbols"])[:3]:
            data["symbols"][name]["status"]="UNAVAILABLE"
        x=evaluate(data,4)
        self.assertEqual(x["status"],"UNTESTABLE_MARKET_COVERAGE")
        self.assertEqual(x["completed_analysis_epochs"],0)
    def test_incomplete_future_data_rejected_not_backfilled(self):
        data=fixture()
        name=data["predeclared_symbols"][0]
        data["symbols"][name]["bars"].pop()
        self.assertNotIn(name,eligible_data(data))
        self.assertEqual(len(eligible_data(data)),5)

if __name__=="__main__":
    unittest.main()
