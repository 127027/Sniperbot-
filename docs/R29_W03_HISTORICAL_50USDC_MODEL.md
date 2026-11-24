# R29 W03 — historical SOL-USDC FX and indicative 50-USDC curve model (24.11.2026)

NEW completed technical delta, not another empty replay. Source: verified reserve pairs in r29-w03-reserve-continuity.json. [Successful run #45388727848](https://github.com/127027/Sniperbot-/actions/runs/45388727848); [full regression #45388712599](https://github.com/127027/Sniperbot-/actions/runs/45388712599) 910/910 PASS. Coinbase SOL-USDC minute request #45388592069 HTTP404 recorded, never repeat. Alternative official Binance public market-data endpoint one request HTTP200, ten 1m candles, raw SHA256 6003341dba4440823318e159660f29999a683d92f0b0820b1f8b33399c9b72ff; persisted exact response bytes. Last eligible candle 11 Oct 23:57–23:58 UTC with 60s modeled availability lag, close 111.27 USDC/SOL, low 111.24 high 111.27. Later candles excluded from virtual input. Original October provider receipt not claimed. Two public read-only requests total this phase, no API key or paid source.

| Mint prefix | Tokens for 50 USDC (model) | Entry impact | Immediate exit (model) |
|---|---:|---:|---:|
| DyxRTvjpx | 13,826,744.592654 | 1.39% | 48.288796 USDC |
| DpThJ5k2 | 12,524,684.540663 | 1.32% | 48.288796 USDC |
| HjSHammin | 13,177,807.227880 | 1.36% | 48.288796 USDC |

Model uses integer constant product, observed 95+30 bps fees, assumed extra 25 bps buffer per leg and 1,005,000 lamports network fee per leg, high/low pre-tick candle conversion and real reserve limits. Own buy followed immediately by sell on its modeled post-buy curve explains equal roundtrip costs 1.711204 USDC, NOT a prediction of market profitability or independent actual exit execution. Risk unknown, size-dependent exact fees and reserve state at tick not proven. No model trade authorized, no client fills or live orders. Model cannot be used as a real quote. No assertion of actual October GPT run. Remaining: historical mint/transfer authority evidence and bounded continuity, integrate genuine current GPT review and isolated simulation. No repetition of FX or reserve reconstruction. Formal product acceptance remains frozen 13/60, no new full day backtest with empty trade inputs.
