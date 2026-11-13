"""Offline provenance/cutoff checks, not a trading-performance test."""
import json,pathlib,datetime as dt
R=pathlib.Path(__file__).parent
rows=json.loads((R/'daily-ledger.json').read_text())
assert len(rows)==62 and len({r['date'] for r in rows})==62
assert rows[0]['date']=='2023-03-14' and rows[-1]['date']=='2023-05-14'
checks=0
for row in rows:
    raw=json.loads((R/'daily-raw'/f"{row['date']}.json").read_text())
    s=raw['sources']; h=s.get('header',{}).get('result')
    if h:
        cutoff=int(dt.datetime.fromisoformat(row['date']+'T23:59:59+00:00').timestamp())
        assert int(h['timestamp'],16)<=cutoff
        assert int(h['number'],16)==row['block']
        if s.get('next_header',{}).get('result'): assert int(s['next_header']['result']['timestamp'],16)>cutoff
        checks+=1
    if row['reserve_pepe'] is not None:
        assert s['token0']['result'].lower().endswith('6982508145454ce325ddbe47a25d4ec3d2311933')
        assert s['token1']['result'].lower().endswith('c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
        assert row['reserve_pepe']>0 and row['reserve_weth']>0
    assert row['decision']=='NO_BUY'
swaps=json.loads((R/'verified-swaps.json').read_text())
assert {r['side'] for r in swaps}=={'BUY_PEPE','SELL_PEPE'}
assert all(r['independent_receipt_matches'] for r in swaps)
result={'calendar_days':62,'headers_with_cutoff_checked':checks,'token_absent_days':sum(r['coverage']=='TOKEN_ABSENT_AT_DAY_END' for r in rows),'reserve_days':sum(r['reserve_pepe'] is not None for r in rows),'unknown_days':sum(r['coverage']=='UNKNOWN' for r in rows),'paper_buys':0,'verified_historical_other_traders_swaps':2,'scope':'PEPE targeted case; NOT blind discovery, calibrated probability or executable strategy backtest'}
(R/'validation-result.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
