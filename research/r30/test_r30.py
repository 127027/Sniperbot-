#!/usr/bin/env python3
"""Offline invariants for the R30 research-frequency diagnostic."""
import copy
from datetime import timedelta
from hashlib import sha256
import json
import unittest
import r30_backtest as r30

def fake_source():
    begin = r30.ms(r30.START) - r30.WARMUP * r30.HOUR_MS
    raw = {}
    for j, symbol in enumerate(r30.SYMBOLS):
        if j < 4:
            bars = []
            for i in range(r30.HOURS + r30.WARMUP):
                o = 1 + j * 0.2 + i * 0.0006
                c = o * 1.001
                bars.append(dict(t=begin+i*r30.HOUR_MS, o=o, h=c*1.002,
                                 l=o*0.998, c=c, qv=1000000+1000*i,
                                 trades=100))
            raw[symbol] = dict(status='COMPLETE', bars=bars,
                               sha256_normalized=r30.digest(bars))
        else:
            raw[symbol] = dict(status='UNAVAILABLE', bars=[])
    return dict(schema='sniper_r30_binance_spot_1h.v1',
                start_utc=r30.iso(r30.START),
                end_exclusive_utc=r30.iso(r30.END),
                warmup_hours=r30.WARMUP, symbols=raw)

class R30Tests(unittest.TestCase):
    def test_exact_thirty_utc_days_and_four_frequencies(self):
        self.assertEqual((r30.END-r30.START).days,30)
        self.assertEqual([len(r30.schedule(f)) for f in r30.FREQUENCIES],
                         [30,120,360,720])
        self.assertEqual(r30.schedule(1)[-1],'2026-11-14T00:00:00Z')
        self.assertEqual(r30.schedule(24)[-1],'2026-11-14T23:00:00Z')
        with self.assertRaisesRegex(ValueError,'INVALID_FREQUENCY'):
            r30.schedule(5)

    def test_source_integrity_and_timestamp_rejection(self):
        source=fake_source()
        self.assertEqual(len(r30.eligible_source(source)),4)
        bad=copy.deepcopy(source)
        bad['symbols'][r30.SYMBOLS[0]]['bars'][-1]['c'] *= 100
        self.assertNotIn(r30.SYMBOLS[0],r30.eligible_source(bad))
        bad=copy.deepcopy(source)
        bad['symbols'][r30.SYMBOLS[1]]['bars'][0]['t'] += 3600000
        bad['symbols'][r30.SYMBOLS[1]]['sha256_normalized']=r30.digest(bad['symbols'][r30.SYMBOLS[1]]['bars'])
        self.assertNotIn(r30.SYMBOLS[1],r30.eligible_source(bad))
        bad=copy.deepcopy(source)
        bad['end_exclusive_utc']='2026-12-01T00:00:00Z'
        with self.assertRaisesRegex(ValueError,'WRONG_R30_SOURCE_OR_WINDOW'):
            r30.eligible_source(bad)

    def test_full_gpt_strategy_stays_unproven_and_no_paper_mutation(self):
        source=fake_source()
        unchanged=copy.deepcopy(source)
        result=r30.run_all(source)
        self.assertEqual(source,unchanged)
        self.assertEqual(len(result['historical_price_only_runs']),4)
        self.assertEqual(len(result['full_research_evidence']),4)
        self.assertTrue(result['no_live_orders'])
        self.assertTrue(result['no_user_paper_account_changes'])
        self.assertEqual([a['total_planned_scans'] for a in
                          result['full_research_evidence']],[30,120,360,720])
        for full in result['full_research_evidence']:
            self.assertEqual(full['verified_buy_orders'],0)
            self.assertEqual(full['verified_sell_orders'],0)
            self.assertIsNone(full['paper_pnl_test_usdc'])
        for run in result['historical_price_only_runs']:
            self.assertEqual(len(run['daily_journal']),30)
            self.assertLessEqual(run['max_open_cost_test_usdc'],150.000001)
            self.assertLessEqual(run['max_concurrent_positions'],3)
            self.assertTrue(all(d['full_research_status'] ==
                             'DATA_GAP_NOT_A_NO_TRADE_SIGNAL'
                             for d in run['daily_journal']))
            self.assertEqual(sum(len(d['price_only_top_candidate_examples'])
                                 for d in run['daily_journal']),
                             30*run['frequency_per_day'])
            self.assertEqual(run['realized_trade_count'],
                             len(run['sells']))
            self.assertEqual(run['buy_count'],len(run['buys']))
            self.assertEqual(run['equity_if_liquidated_test_usdc'],
                             round(5000+run['net_pnl_test_usdc'],8))

    def test_missing_market_data_never_fabricates_a_win(self):
        source=fake_source()
        for symbol in r30.SYMBOLS:
            source['symbols'][symbol]={'status':'UNAVAILABLE','bars':[]}
        result=r30.run_all(source)
        self.assertEqual(result['source_complete_count'],0)
        self.assertTrue(all(x['status']=='UNTESTABLE_MARKET_COVERAGE' for x in
                            result['historical_price_only_runs']))
        self.assertTrue(all('equity_if_liquidated_test_usdc' not in x
                            for x in result['historical_price_only_runs']))
        self.assertIn('nicht bestimmbar',r30.report_md(result).lower())

if __name__ == '__main__':
    unittest.main()
