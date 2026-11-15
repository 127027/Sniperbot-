#!/usr/bin/env python3
"""R30 diagnostic: 30 UTC days, four research schedules, NO live/regular paper orders.

Two deliberately separate conclusions:
(A) full multi-source strategy is UNTESTABLE without verified historical as-of inputs;
(B) public Binance hourly PRICE-ONLY baseline is a diagnostic proxy, not GPT research.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import importlib.util
import json
import math
from pathlib import Path
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'research' / 'frequency-backtest'))
import r26_replay as legacy

START = datetime(2026, 10, 16, tzinfo=timezone.utc)
END = datetime(2026, 11, 15, tzinfo=timezone.utc)
HOURS = 720
WARMUP = 48
CAPITAL = 5000.0
FREQUENCIES = (1, 4, 12, 24)
SYMBOLS = (
    'DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'FLOKIUSDT', 'BONKUSDT',
    'WIFUSDT', 'BOMEUSDT', 'PENGUUSDT', 'TRUMPUSDT', 'PNUTUSDT',
    'TURBOUSDT', 'NEIROUSDT', 'MOODENGUSDT',
)
HOUR_MS = 3600000
URL = 'https://data-api.binance.vision/api/v3/klines'
ASOF_GAPS = ('POOL_UNIVERSE', 'NEWS_SOCIAL', 'ONCHAIN_MARKET',
             'CONTRACT_SECURITY', 'DEX_EXECUTION_QUOTES')
def iso(t):
    return t.isoformat().replace('+00:00', 'Z')
def ms(t):
    return int(t.timestamp() * 1000)
def digest(value):
    return sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
def schedule(freq):
    if freq not in FREQUENCIES:
        raise ValueError('INVALID_FREQUENCY')
    return [iso(START + timedelta(hours=i * 24 // freq)) for i in range(30 * freq)]
def validate_candles(raw, symbol):
    if not isinstance(raw, list) or len(raw) > 1000:
        raise ValueError('INVALID_PROVIDER_RESPONSE')
    bars = []
    for row in raw:
        if not isinstance(row, list) or len(row) < 9:
            raise ValueError('INVALID_PROVIDER_CANDLE')
        t = int(row[0])
        o, h, l, c, qv = (float(row[k]) for k in (1, 2, 3, 4, 7))
        trades = int(row[8])
        if (t % HOUR_MS != 0 or not all(map(math.isfinite, (o, h, l, c, qv)))
                or not (0 < l <= min(o, c) <= max(o, c) <= h)
                or qv < 0 or trades < 0):
            raise ValueError('INVALID_PRICE_OR_TIMESTAMP')
        if bars and t <= bars[-1]['t']:
            raise ValueError('NON_MONOTONIC_CANDLES')
        bars.append(dict(t=t, o=o, h=h, l=l, c=c, qv=qv, trades=trades))
    return bars
def get_symbol(symbol):
    first = ms(START) - WARMUP * HOUR_MS
    end = ms(END)
    url = URL + '?' + urlencode(dict(symbol=symbol, interval='1h',
                                    startTime=first, endTime=end - 1, limit=1000))
    last_error = None
    for attempt in range(2):
        try:
            req = Request(url, headers={'user-agent': 'SniperR30PublicPriceResearch/1.0'})
            with urlopen(req, timeout=25) as response:
                body = response.read(3_000_001)
            if len(body) > 3_000_000:
                raise ValueError('TOO_MANY_BYTES')
            bars = validate_candles(json.loads(body), symbol)
            timeline = list(range(first, end, HOUR_MS))
            complete = len(bars) == len(timeline) and all(
                bars[i]['t'] == t for i, t in enumerate(timeline))
            return dict(status='COMPLETE' if complete else 'INCOMPLETE',
                        bars=bars, sha256_normalized=digest(bars),
                        observed_bars=len(bars), expected_bars=len(timeline),
                        source_url=url)
        except (HTTPError, URLError, TimeoutError, ValueError, OSError,
                json.JSONDecodeError) as error:
            last_error = ('HTTP_' + str(error.code)) if isinstance(error, HTTPError) else type(error).__name__
            if attempt == 0:
                time.sleep(1)
    return dict(status='UNAVAILABLE', error=last_error, bars=[],
                observed_bars=0, expected_bars=HOURS + WARMUP, source_url=url)
def acquire():
    by_symbol = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(get_symbol, symbol): symbol for symbol in SYMBOLS}
        for future in as_completed(futures):
            symbol = futures[future]
            by_symbol[symbol] = future.result()
            print('R30 SOURCE', symbol, by_symbol[symbol]['status'],
                  by_symbol[symbol]['observed_bars'], flush=True)
    return dict(schema='sniper_r30_binance_spot_1h.v1',
                start_utc=iso(START), end_exclusive_utc=iso(END),
                warmup_hours=WARMUP,
                source='PUBLIC_BINANCE_SPOT_HOURLY_USDT_NOT_ONCHAIN',
                selected_cohort='13_RETROSPECTIVELY_NAMED_CEX_LISTINGS_NOT_NEW_TOKENS',
                acquired_at_utc=iso(datetime.now(timezone.utc)),
                symbols={s: by_symbol[s] for s in SYMBOLS})
def eligible_source(source):
    if (source.get('schema') != 'sniper_r30_binance_spot_1h.v1'
            or source.get('start_utc') != iso(START)
            or source.get('end_exclusive_utc') != iso(END)
            or source.get('warmup_hours') != WARMUP
            or set(source.get('symbols', {})) != set(SYMBOLS)):
        raise ValueError('WRONG_R30_SOURCE_OR_WINDOW')
    accepted = {}
    first = ms(START) - WARMUP * HOUR_MS
    for sym in SYMBOLS:
        item = source['symbols'][sym]
        bars = item.get('bars', [])
        if item.get('status') != 'COMPLETE' or len(bars) != HOURS + WARMUP:
            continue
        if any(row.get('t') != first + i * HOUR_MS or not all(
                isinstance(row.get(k), (int, float)) and math.isfinite(row[k])
                for k in ('o', 'h', 'l', 'c', 'qv'))
               or not (0 < row['l'] <= min(row['o'], row['c'])
                       <= max(row['o'], row['c']) <= row['h'])
               for i, row in enumerate(bars)):
            continue
        if digest(bars) == item.get('sha256_normalized'):
            accepted[sym] = bars
    return accepted
def daily_journal(run):
    journals = []
    for day in range(30):
        date = iso(START + timedelta(days=day))[:10]
        decisions = [x for x in run.get('decisions', [])
                     if x['at_utc'][:10] == date]
        buys = [x for x in run.get('buys', []) if x['at_utc'][:10] == date]
        sells = [x for x in run.get('sells', []) if x['exit_at_utc'][:10] == date]
        journals.append(dict(date_utc=date,
             scans_planned=run['frequency_per_day'],
             full_research_status='DATA_GAP_NOT_A_NO_TRADE_SIGNAL',
             missing_required_sources=list(ASOF_GAPS),
             verified_gpt_buy_orders=0, verified_gpt_sell_orders=0,
             price_only_scan_count=len(decisions),
             price_only_top_candidate_examples=[
                 dict(at_utc=e['at_utc'], candidates=e['top_research_candidates'])
                 for e in decisions],
             price_only_modeled_buys=buys, price_only_modeled_sells=sells))
    return journals
def run_all(source):
    valid = eligible_source(source)
    runs = []
    for freq in FREQUENCIES:
        # Expose the 30-day time window to the legacy price-only evaluator.
        # Size is exactly 50 TEST units. Max 3 positions => 150 / 5000 = 3%.
        # A 12% modeled stop implies 6 (0.12% of equity) nominal risk per
        # trade BEFORE slippage/gaps; this is NOT a guaranteed loss bound.
        legacy.START_MS = ms(START)
        legacy.END_MS = ms(END)
        legacy.HOURS = HOURS
        legacy.MIN_ORDER = 50.0
        legacy.MAX_ORDER = 50.0
        legacy.MAX_OPEN = 3
        legacy.eligible_data = lambda _source: valid
        run = legacy.evaluate(source, freq)
        run['price_only_paper_proxy_not_user_account'] = True
        run['uses_research_security_score'] = False
        run['uses_actual_historical_gpt'] = False
        run['uses_real_fill_quotes'] = False
        run['fitted_after_known_winners'] = True
        run['daily_journal'] = daily_journal(run)
        runs.append(run)
    full = [dict(frequency_per_day=f, total_planned_scans=30*f,
                 completed_verified_multisource_scans=0,
                 provenance='NO_VERIFIED_POINT_IN_TIME_COMPLETE_UNIVERSE',
                 verified_buy_orders=0, verified_sell_orders=0,
                 paper_pnl_test_usdc=None, winner_cannot_be_determined=True,
                 missing=list(ASOF_GAPS)) for f in FREQUENCIES]
    return dict(schema='sniper_r30_diagnostic_comparison.v1',
       start_utc=iso(START), end_exclusive_utc=iso(END),
       days=30, virtual_start_balance_each=CAPITAL,
       schedules={str(f):schedule(f) for f in FREQUENCIES},
       full_research_evidence=full,
       historical_price_only_runs=runs,
       source_cohort=list(SYMBOLS), valid_symbols=list(valid),
       source_complete_count=len(valid),
       source_total_count=len(SYMBOLS),
       key_conclusion='NO_FULL_RESEARCH_FREQUENCY_WINNER_WITHOUT_VERIFIED_HISTORICAL_SOURCES',
       risk='Modeled next-hour CEX opens are not executable DEX quotes. All four price-only runs are proxies only.',
       no_live_orders=True, no_user_paper_account_changes=True)
def report_md(result):
    lines = [
      '# R30 – 30-Tage-Diagnose (16.10.–14.11.2026 UTC)',
      '',
      '**Striktes Ergebnis:** Der vollständige mehrstufige GPT-/On-chain-/Social-/Security-'
      'Backtest ist mangels historisch zeitgeprüfter Quellen nicht beweisbar. '
      'Keine erfundenen Trades oder falschen Gewinner.',
      '',
      '| Recherchen/Tag | Vorgesehene 30-Tage-Scans | Historische GPT-Forschungs-Scans belegt | GPT-P&L |',
      '|---:|---:|---:|---|']
    for x in result['full_research_evidence']:
        lines.append(f"| {x['frequency_per_day']} | {x['total_planned_scans']} | "
                     f"{x['completed_verified_multisource_scans']} | nicht bestimmbar |")
    lines.extend(['',
      '## Preis-/Volumen-Proxy (SEPARAT, keine vollständige Strategie)',
      '',
      'Vorher definierte 13 bekannte Binance-Spot-Memecoin-Paare, USDT-Stundenkerzen; '
      'kein vollständiger Coin-Launch-Markt. R26-Preis-Signalregeln werden unverändert '
      'als diagnostisches Baseline-Signal verwendet, jedoch Positionsgröße 50, '
      'maximal 3 Positionen (3 % Nominal-Exposition). '
      'Modellierte 1 % Handelsgebühr und 0,2 % Slippage je Richtung. '
      'Stunden-Open des Folgetakts als theoretische Ausführung; keine ausführbare DEX-Quote. '
      'R26-Score ist ausdrücklich NICHT das neue 100-Punkte-Sicherheits-Scoring.',
      '',
      f"Belegte vollständige CEX-Stundenkursreihen: {result['source_complete_count']} "
      f"von {result['source_total_count']}.",
      '',
      '| Preisanalysen/Tag | Scans | Modellkäufe | Geschlossene Trades | Gewinne/Verluste | '
      'Virtuelles Endkapital | Netto-P&L | Max-DD |',
      '|---:|---:|---:|---:|---:|---:|---:|---:|'])
    for r in result['historical_price_only_runs']:
        if 'equity_if_liquidated_test_usdc' not in r:
            lines.append(f"| {r['frequency_per_day']} | {r['scheduled_analysis_epochs']} "
                         '| n/a | n/a | n/a | n/a | n/a | n/a |')
        else:
            lines.append(f"| {r['frequency_per_day']} | {r['completed_analysis_epochs']} "
            f"| {r['buy_count']} | {r['realized_trade_count']} "
            f"| {r['wins']}/{r['losses']} "
            f"| {r['equity_if_liquidated_test_usdc']:.2f} "
            f"| {r['net_pnl_test_usdc']:+.2f} "
            f"| {r['max_drawdown_pct']:.2f}% |")
    lines.extend(['',
      'Die oben genannten Proxy-Gewinne dürfen **nicht** zur Auswahl der besten GPT-'
      'Forschungsfrequenz verwendet werden. Jede Frequenz enthält 30 Tagesjournale '
      'mit den eigenen Zeitpunkt-Entscheidungen, Kauf-/Verkaufsproxies und Datenlücken.',
      '',
      '## Was der Diagnoseführer tatsächlich veranlassen darf',
      '',
      '- Kandidat WATCH oder BUY_CANDIDATE erst nach zeitkorrekter Sicherheit, '
      'Poolidentität, liquidierbarer Quote und nachvollziehbaren Social-/On-chain-Belegen.',
      '- Ohne diese Belege: DATA_GAP, niemals ein rückwirkend behaupteter BUY.',
      '- Neue Paper-Aufträge nur über separate signierte, validierte R29-Pipeline; '
      'dieser Test publiziert KEINE Aufträge.',
      '- Echtgeldhandel und echte Wallets bleiben unverändert gesperrt.',
      '',
      '## Quellen- und Methodengrenzen',
      '',
      '- Historische Binance-Spot-OHLCV belegt nur Kurs/Volumen bereits gelisteter Coins.',
      '- Namensbasiertes, rückblickend gewähltes Universum hat Listing-/Survivorship-Bias.',
      '- Keine geprüfte historische On-chain-Sicherheit, DEX-Pool-Liquidität, '
      'Social-Velocity, Story-Neuheit oder echten Kauf-/Verkaufsquotes.',
      '- 1 USDT ist nur als virtuelle 1 TEST-USDC-Recheneinheit angenähert.',
      '- Das Preis-Proxy setzt die Tages-/Wochenverlust-Kill-Switches und den neuen Security-Score NICHT um.',
      '- Ergebnisse sind Sensitivitätsdiagnosen, keine Trading-Empfehlungen.',
      ''
    ])
    return '\n'.join(lines)

def daily_markdown(result):
    """A chronological human-readable journal of modeled, NOT GPT-approved trades."""
    lines=['# R30 – Tagesjournal der vier Preis-Proxys',
           '',
           'Zeitraum 16.10.–14.11.2026 (UTC). BUY/SELL in diesem Journal '
           'sind ausschließlich virtuelle Preis-Proxy-Entscheidungen, '
           'keine signierten Bot-Aufträge und keine vollständige KI-Recherche.',
           '',
           'Für alle 30 Tage fehlen die für eine sichere historische GPT-Order '
           'erforderlichen Point-in-Time-Sicherheits-, Pool-, Social- und DEX-Quotes.',
           'Deshalb ist der tatsächliche GPT-Handelsentscheid an jedem Tag '
           'DATA_GAP, nicht etwa nachweislich NO_TRADE.',
           '']
    for run in result['historical_price_only_runs']:
        f=run['frequency_per_day']
        lines.extend([f'## {f} Recherche(n) täglich',
                      '',
                      '| UTC-Tag | Recherchen | Virtuelle BUY-Proxys | Virtuelle SELL-Proxys (Netto-P&L) | Tages-P&L geschlossener Trades |',
                      '|---|---:|---|---|---:|'])
        for day in run['daily_journal']:
            buys = ', '.join(x['symbol'].replace('USDT','') + ' ' +
                             x['at_utc'][11:16] + ' (50)' for x in
                             day['price_only_modeled_buys']) or '–'
            sells = ', '.join(x['symbol'].replace('USDT','') + ' ' +
                              x['exit_at_utc'][11:16] + ' (' +
                              format(x['net_pnl_test_usdc'], '+.2f') + ')' for x in
                              day['price_only_modeled_sells']) or '–'
            pnl=sum(x['net_pnl_test_usdc'] for x in day['price_only_modeled_sells'])
            lines.append(f"| {day['date_utc']} | {day['scans_planned']} "
                         f"| {buys} | {sells} | {pnl:+.2f} |")
        lines.extend(['',''])
    lines.extend(['**Nicht enthalten:** historische bestätigte On-chain-Sicherheits-'
                  'entscheidungen, tatsächliche GPT-Aufrufe, durchgeführte Wallet-'
                  'Transaktionen und belastbare DEX-Fills. '
                  'Tagesverluste sind ausschließlich realisierte Proxy-Verkäufe, '
                  'nicht das gesamte tagesaktuelle Portfolioergebnis.',''])
    return '\n'.join(lines)

def source_manifest(source):
    return dict(schema='r30_source_manifest.v1', collected_at=source.get('acquired_at_utc'),
        period=[iso(START),iso(END)], source=source.get('source'),
        cohort_selection=source.get('selected_cohort'),
        symbols={s: {k:v for k,v in source['symbols'][s].items() if k!='bars'}
                 for s in SYMBOLS})
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source')
    parser.add_argument('--output-dir', default='r30-output')
    args = parser.parse_args()
    target = Path(args.output_dir)
    target.mkdir(parents=True, exist_ok=True)
    if args.source:
        source = json.loads(Path(args.source).read_text(encoding='utf8'))
    else:
        source = acquire()
    (target/'source.json').write_text(json.dumps(source, separators=(',',':')))
    result = run_all(source)
    runs = result['historical_price_only_runs']
    published = {k:v for k,v in result.items()
                 if k not in ('historical_price_only_runs', 'schedules')}
    published['price_only_summary'] = [
        {k:v for k,v in r.items() if k in (
          'frequency_per_day','status','scheduled_analysis_epochs',
          'completed_analysis_epochs','available_symbols','initial_test_usdc',
          'ending_cash_test_usdc','equity_if_liquidated_test_usdc',
          'net_pnl_test_usdc','return_pct','realized_pnl_test_usdc',
          'unrealized_net_pnl_test_usdc','realized_trade_count','buy_count',
          'wins','losses','max_drawdown_pct','max_concurrent_positions',
          'max_open_cost_test_usdc','total_modeled_fees_and_slippage_test_usdc'
        )} for r in runs]
    (target/'summary.json').write_text(json.dumps(published, indent=2))
    (target/'journal.json').write_text(json.dumps(
      [{'frequency_per_day':r['frequency_per_day'],
        'daily_journal':r['daily_journal']} for r in runs], indent=2))
    (target/'source-manifest.json').write_text(json.dumps(source_manifest(source),indent=2))
    report = report_md(result)
    (target/'REPORT_DE.md').write_text(report,encoding='utf8')
    (target/'DAILY_JOURNAL_DE.md').write_text(daily_markdown(result),encoding='utf8')
    print(report,flush=True)
if __name__ == '__main__':
    main()
