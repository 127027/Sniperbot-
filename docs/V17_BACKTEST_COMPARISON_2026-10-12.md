# R29 V1.6 → V1.7: reproduzierbare Auswertung der archivierten Oktober-Modellergebnisse

**Stand:** 2026-11-22. **Branch:** `codex/r29-cleanroom-paper-20261121`. **Forschungsmodus:** kein Live-/Paper-Orderauftrag.

## Was tatsächlich geprüft wurde
Die vorhandene V1.1-Frozen-Ergebnisdatei `research/training/2026-10-12/frozen-v11/oct12-v11-firstscan-24h-report.json` wurde programmatisch erneut eingelesen und die dokumentierten BUY-/SELL-Ereignisse pro Modell gepaart und nachgerechnet. Die eingefrorenen V1.6- und V1.7-Kurs-/Strategiepfade sind identisch: Die V1.7-Codeänderung betrifft **nur** `src/candidate-queue.mjs` (Konfliktmarkierung bei unterschiedlichen gültigen Token-Contracts für denselben Chain+Pool-Schlüssel). Die historischen `runResearchPaperLab`-/`replayFirstScanMemory`-Funktionen importieren `candidate-queue.mjs` nicht. Die sechs bereits ausgewählten Modellpools werden dadurch nicht anders gehandelt.

**Wichtig:** Dies ist eine deterministische **Reauswertung vorhandener gespeicherter Backtest-Ergebnisse**, kein neu ausgeführter GitHub-Actions-Run und kein vollständiger historischer Prospektiv-Blindtest. Der GitHub-Connector erlaubt das Lesen und Schreiben, aber keinen direkten Workflow-Dispatch; ein separat in Node.js durchgeführter `npm test`-/Replay-Lauf wurde hier nicht ausgeführt.

Die Quellliste enthält 8 rückblickende Poolhinweise und 8 verschiedene Chain+Pool-Schlüssel (Duplikate nach Chain+Pool: 0). Es fehlen im Quellindex vollständige geprüfte Contract-Paare für einen echten V1.7-Konflikt-Test mit historischen Daten. 0 gefunden ≠ 0 in der historischen Realität. Es gibt keinen Nachweis, dass V1.7 einen Handelsentscheid im eingefrorenen Set verändert.

## Vergleich – Modellhandel

| Modell (unverändert) | V1.6 BUY/SELL | V1.7 abgeleitet BUY/SELL | V1.6 realisierter PnL | V1.7 abgeleiteter PnL | Δ PnL |
|---|---:|---:|---:|---:|---:|
| exploratory | 18/17 | 18/17 | -109.0793 | -109.0793 | 0,0000 |
| conservative | 13/11 | 13/11 | -84.5782 | -84.5782 | 0,0000 |
| volatility_guard | 8/7 | 8/7 | -15.3077 | -15.3077 | 0,0000 |

*Die V1.7-Werte sind die durch den unveränderten Modellhandel bedingten Werte, nicht das Ergebnis eines separaten ausgeführten V1.7-Runs.* Ohne nachgewiesene damalige Dot3-ELIGIBLE-Belege gab es 0 tatsächliche Orders / 0 bestätigte Client-Fills. Alle Beträge sind TEST-USDC, 50 pro BUY, anfängliche 5.000. Nicht realisierte Positionen werden nicht als Profit verbucht.

## exploratory — sämtliche dokumentierten Modell-Trades

| Coin | BUY UTC | SELL UTC | BUY-Preis USD | SELL-Preis USD | Modell-PnL TEST-USDC |
|---|---|---|---:|---:|---:|
| Marginalia MARG | 01:35 | 02:35 | 0.00021 | 0.00028 | 13.8554 |
| Marginalia MARG | 03:35 | 04:35 | 0.00036 | 0.00024 | -18.4435 |
| Smoking Inu SI/WETH | 04:35 | 05:35 | 0.00038 | 0.00074 | 43.9187 |
| Smoking Inu SI/NVDA | 04:35 | 05:35 | 0.00083 | 0.00110 | 14.0824 |
| Smoking Inu SI/WETH | 06:35 | 07:35 | 0.00006 | 0.00002 | -37.0434 |
| Smoking Inu SI/NVDA | 06:35 | 07:35 | 0.00096 | 0.00135 | 17.8779 |
| 파랭이 SKHYB | 07:35 | 08:35 | 0.00055 | 0.00044 | -11.0255 |
| 파랭이 SKHYB | 09:35 | 10:35 | 0.00055 | 0.00019 | -33.5863 |
| BNBCAT | 13:35 | 14:35 | 46.17867 | 9.16985 | -40.3942 |
| BNBCAT | 15:35 | 16:35 | 6.39797 | 3.55813 | -23.0975 |
| 파랭이 SKHYB | 16:35 | 17:35 | 0.00076 | 0.00046 | -20.4390 |
| BNBCAT | 17:35 | 18:35 | 2.27884 | 1.44849 | -19.2522 |
| BNBCAT | 19:35 | 20:35 | 0.56361 | 0.69746 | 9.8627 |
| 파랭이 SKHYB | 20:35 | 21:35 | 0.00063 | 0.00052 | -10.0111 |
| Smoking Inu SI/NVDA | 13:35 | 22:35 | 0.00070 | 0.00085 | 8.6005 |
| 파랭이 USDT | 17:35 | 23:35 | 0.00022 | 0.00026 | 8.3948 |
| Marginalia MARG | 16:35 | 23:35 | 0.00024 | 0.00019 | -12.3791 |
| 파랭이 SKHYB | 22:35 | OFFEN | 0.00050 | — | nicht realisiert |

**Kontrolle:** 17 realisierte Trades, 1 offene Modellposition(en); aufsummierter PnL -109.07932046 TEST-USDC = Archivwert -109.07932046.

## conservative — sämtliche dokumentierten Modell-Trades

| Coin | BUY UTC | SELL UTC | BUY-Preis USD | SELL-Preis USD | Modell-PnL TEST-USDC |
|---|---|---|---:|---:|---:|
| Marginalia MARG | 03:35 | 04:35 | 0.00036 | 0.00024 | -18.4435 |
| Smoking Inu SI/WETH | 04:35 | 05:35 | 0.00038 | 0.00074 | 43.9187 |
| Smoking Inu SI/NVDA | 04:35 | 05:35 | 0.00083 | 0.00110 | 14.0824 |
| Smoking Inu SI/WETH | 06:35 | 07:35 | 0.00006 | 0.00002 | -37.0434 |
| Smoking Inu SI/NVDA | 06:35 | 07:35 | 0.00096 | 0.00135 | 17.8779 |
| 파랭이 SKHYB | 07:35 | 08:35 | 0.00055 | 0.00044 | -11.0255 |
| 파랭이 SKHYB | 09:35 | 10:35 | 0.00055 | 0.00019 | -33.5863 |
| BNBCAT | 13:35 | 14:35 | 46.17867 | 9.16985 | -40.3942 |
| Smoking Inu SI/NVDA | 15:35 | 17:35 | 0.00067 | 0.00084 | 10.4858 |
| 파랭이 SKHYB | 16:35 | 17:35 | 0.00076 | 0.00046 | -20.4390 |
| 파랭이 SKHYB | 20:35 | 21:35 | 0.00063 | 0.00052 | -10.0111 |
| 파랭이 USDT | 18:35 | OFFEN | 0.00022 | — | nicht realisiert |
| 파랭이 SKHYB | 22:35 | OFFEN | 0.00050 | — | nicht realisiert |

**Kontrolle:** 11 realisierte Trades, 2 offene Modellposition(en); aufsummierter PnL -84.57821098 TEST-USDC = Archivwert -84.57821098.

## volatility_guard — sämtliche dokumentierten Modell-Trades

| Coin | BUY UTC | SELL UTC | BUY-Preis USD | SELL-Preis USD | Modell-PnL TEST-USDC |
|---|---|---|---:|---:|---:|
| Marginalia MARG | 01:35 | 02:35 | 0.00021 | 0.00028 | 13.8554 |
| Smoking Inu SI/NVDA | 06:35 | 07:35 | 0.00096 | 0.00135 | 17.8779 |
| 파랭이 SKHYB | 09:35 | 10:35 | 0.00055 | 0.00019 | -33.5863 |
| 파랭이 SKHYB | 16:35 | 17:35 | 0.00076 | 0.00046 | -20.4390 |
| 파랭이 SKHYB | 20:35 | 21:35 | 0.00063 | 0.00052 | -10.0111 |
| Smoking Inu SI/NVDA | 13:35 | 22:35 | 0.00070 | 0.00085 | 8.6005 |
| 파랭이 USDT | 17:35 | 23:35 | 0.00022 | 0.00026 | 8.3948 |
| 파랭이 SKHYB | 22:35 | OFFEN | 0.00050 | — | nicht realisiert |

**Kontrolle:** 7 realisierte Trades, 1 offene Modellposition(en); aufsummierter PnL -15.30771836 TEST-USDC = Archivwert -15.30771836.

## Technisches Verbesserungsergebnis V1.7
- V1.6 konnte unterschiedliche gültige Token-Contracts zum selben Chain+Pool-Schlüssel ohne explizite Konfliktwarnung auf einen Kandidaten zusammenführen.
- V1.7 setzt in diesem Fall `CONTRACT_IDENTITY_CONFLICT`, verlangt `WATCH_OR_VERIFY` und gibt die beiden vollständigen Contract-Identitäten im Ergebnis zurück.
- Die drei zugehörigen Regressionstests wurden auf GitHub eingecheckt, aber hier nicht mit Node ausgeführt.
- Für die vorliegenden sechs historischen Modellpools ist **kein messbarer zusätzlicher Profit** nachgewiesen; Δ = 0,0000 TEST-USDC ist eine abgeleitete Invarianz der unveränderten Modellrechnung.

## Nächster aussagekräftiger Test
Ein Original-Snapshot mit **zwei verschiedenen gültigen Contract-Zuordnungen zum selben Pool zur damaligen Zeit** wäre ein notwendiger positiver Realwelt-Test. Erst danach ein frisches prospektives Holdout und aktueller unabhängiger Quote-/Sellability-Beleg, bevor mögliche BUY-/SELL-Verbesserungen behauptet werden. Kein Echtgeld.
