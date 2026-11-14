#!/usr/bin/env python3
"""R26 source collector: public Binance SPOT 1h candles, no accounts or keys.

A historically reconstructed price series is NOT a historical news archive.
No future candle may be exposed to the replay decision function.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API = "https://data-api.binance.vision/api/v3/klines"
START = "2026-10-30T00:00:00Z"
END = "2026-11-14T00:00:00Z"  # end exclusive
WARMUP_HOURS = 48
# Predeclared before outcomes are calculated. Restricted to large established
# meme-associated Binance Spot pairs. NOT a representative DEX launch universe.
SYMBOLS = (
    "DOGEUSDT", "SHIBUSDT", "PEPEUSDT", "FLOKIUSDT",
    "BONKUSDT", "WIFUSDT", "BOMEUSDT", "PENGUUSDT",
    "TRUMPUSDT", "PNUTUSDT", "TURBOUSDT", "NEIROUSDT",
    "MOODENGUSDT",
)
HOUR_MS = 3_600_000
def ms(t):
    return int(datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp() * 1000)

def normalize(symbol, raw):
    if not isinstance(raw, list) or len(raw) > 500 or not all(isinstance(x, list) and len(x)>=11 for x in raw):
        raise ValueError("UNEXPECTED_PROVIDER_KLINES")
    result = []
    previous = None
    for x in raw:
        epoch = int(x[0])
        if epoch < 10**12 or epoch > 10**13 or epoch % HOUR_MS:
            raise ValueError("INVALID_HOURLY_TIMESTAMP")
        if previous is not None and epoch <= previous:
            raise ValueError("NON_MONOTONIC_KLINES")
        previous = epoch
        open_, high, low, close = (float(x[i]) for i in (1,2,3,4))
        quote_volume = float(x[7])
        transactions = int(x[8])
        if not (0 < low <= min(open_,close) <= max(open_,close) <= high and
                quote_volume >= 0 and transactions >= 0 and
                all(v < 1e15 for v in (open_,high,low,close,quote_volume))):
            raise ValueError("INVALID_OHLCV")
        result.append({"t":epoch,"o":open_,"h":high,"l":low,"c":close,
                       "qv":quote_volume,"trades":transactions})
    return result

def fetch_one(symbol):
    start = ms(START)-WARMUP_HOURS*HOUR_MS
    end = ms(END)
    url = API + "?" + urlencode({"symbol":symbol,"interval":"1h",
                "startTime":start,"endTime":end-1,"limit":1000})
    last_error = "UNAVAILABLE"
    for attempt in range(2):
        try:
            req = Request(url, headers={"accept":"application/json",
                                        "user-agent":"SniperR26HistoricalPublicReplay/1.0"})
            with urlopen(req,timeout=25) as response:
                body=response.read(1_500_001)
                if len(body)>1_500_000: raise ValueError("PROVIDER_RESPONSE_TOO_LARGE")
                raw=json.loads(body)
                bars=normalize(symbol,raw)
                # Binance live API returns millisecond timestamps by default.
                # Do not fill gaps, and do not assume an absent pair traded.
                grid={p["t"]:p for p in bars}
                expected=list(range(start,end,HOUR_MS))
                missing=[t for t in expected if t not in grid]
                complete=not missing and len(bars)==len(expected)
                digest=sha256(json.dumps(bars,sort_keys=True,separators=(',',':')).encode()).hexdigest()
                return {"symbol":symbol,"status":"COMPLETE" if complete else "INCOMPLETE",
                        "expected_bars":len(expected),"observed_bars":len(bars),
                        "missing_bars":len(missing),"first_missing_hour_utc":
                         datetime.fromtimestamp(missing[0]/1000,timezone.utc).isoformat() if missing else None,
                        "source_url":url,"sha256_normalized":digest,"bars":bars}
        except (HTTPError,URLError,TimeoutError,ValueError,json.JSONDecodeError,OSError) as e:
            code=getattr(e,'code',None)
            last_error=("HTTP_"+str(code) if code else type(e).__name__)
            if attempt==0:
                time.sleep(1.5)
    return {"symbol":symbol,"status":"UNAVAILABLE","error":last_error,
            "source_url":url,"expected_bars":WARMUP_HOURS+360,
            "observed_bars":0,"missing_bars":WARMUP_HOURS+360,"bars":[]}

def build():
    result={}
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures={pool.submit(fetch_one,s):s for s in SYMBOLS}
        for f in as_completed(futures):
            x=f.result()
            result[x["symbol"]]=x
            print(x["symbol"],x["status"],"hours",x["observed_bars"],
                  "missing",x["missing_bars"],flush=True)
    return {"schema":"sniper_r26_binance_spot_hourly.v1",
            "source":"BINANCE_PUBLIC_SPOT_1H_OHLCV",
            "source_terms":"Public Binance Spot aggregated klines, not historical original news",
            "start_utc":START,"end_exclusive_utc":END,
            "warmup_hours":WARMUP_HOURS,
            "quote_currency":"USDT", "expected_candles_per_symbol":360+WARMUP_HOURS,
            "predeclared_symbols":list(SYMBOLS),
            "selection_warning":"Named predeclared established memecoin cohort, selected retrospectively; survivorship/listing bias possible; no new-DEX-launch discovery",
            "collected_at_utc":datetime.now(timezone.utc).isoformat(),
            "symbols":{k:result[k] for k in SYMBOLS}}
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",default="r26-15d-hourly-source.json")
    args=parser.parse_args()
    result=build()
    path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+"\n",encoding="utf8")
    ok=sum(x["status"]=="COMPLETE" for x in result["symbols"].values())
    print("R26_SOURCE",json.dumps({"complete_symbols":ok,"selected":len(SYMBOLS),"file":str(path)}))
    if ok < 4: raise SystemExit("INSUFFICIENT_PUBLIC_HOURLY_MARKET_DATA")
if __name__=="__main__":
    main()
