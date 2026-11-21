# R29 V1.1 – Erweiterter erster Scan + 23 inkrementelle Updates (12. Oktober 2026)

**GitHub-Action [44934074915](https://github.com/127027/Sniperbot-/actions/runs/44934074915): bestanden, 109/109 Softwaretests.** 24 historische algorithmische Modell-Scans, nicht 24 ursprünglich aufgezeichnete autonome GPT-Calls.

## Vorher/Nachher: Daten, keine Rendite-Illusion

| Kennzahl | V1.0 (kurzer API-Lauf) | V1.1 (längerer erster Abruf) |
|---|---:|---:|
| Retrospektive Gewinnerhinweise | 65 | 65 |
| Exakte Pool-Links in ursprünglicher Excel | 8 | 8 |
| Rekonstruierte Pool-Kursverläufe | 2 | **6** |
| Abgedeckte direkte Pool-Links | 2/8 (25%) | **6/8 (75%)** |
| Historische 5-Minuten-Kerzen | 251 | **1087** |
| Verfügbare Vortags-Kerzen | 0 | **66** |
| Pools beim ersten Scan 02:35 MESZ | 0 | **1 (MARG)** |
| Bekannte Kerzen bei Scan 1 | 0 | **68** |
| Pools bei Scan 24 | 2 | **6** |
| Modell BUY/SELL – explorativ | 6/6 | **18/17** |
| Modell PnL explorativ (nur realisiert, TEST-USDC) | −66,01 | **−109,08** |
| Modell PnL konservativ (nur realisiert, TEST-USDC) | −33,52 | **−84,58** |
| Modell PnL Volatilitätsschutz (nur realisiert, TEST-USDC) | 0,00 | **−15,31** |
| Echte ursprünglich historische Dot4-Orders / Client-Fills | 0 / 0 nachgewiesen | **0 / 0 nachgewiesen** |

**Warum der PnL-Vergleich kein Erfolgsnachweis ist:** Die untersuchte Population wächst von zwei handverlesenen Pools auf sechs. Mehr Modelltrades und ein größerer absoluter Verlust können daraus entstehen, ohne dass die Strategie schlechter oder besser geworden sein muss. Zusätzlich sind in den drei Modellen noch 1 / 2 / 1 Positionen offen, ohne bewerteten Schlusskurs. Es sind Forschungstrades mit angenommenen Kosten und ohne Beweis damaliger Sellability.

## Acht geprüfte Pool-Links

| Coin | Chain | 5m-Kerzen | Status |
|---|---|---:|---|
| BNBCAT | bsc | 194 | RECONSTRUCTED |
| Smoking Inu SI/WETH | robinhood | 57 | RECONSTRUCTED |
| Smoking Inu SI/NVDA | robinhood | 249 | RECONSTRUCTED |
| Sean Dynasty Prosper SEAN | solana | 0 | HTTP_404 |
| 파랭이 SKHYB | bsc | 206 | RECONSTRUCTED |
| 파랭이 USDT | bsc | 110 | RECONSTRUCTED |
| Crawlerpad CRAWLER | solana | 0 | HTTP_404 |
| Marginalia MARG | ethereum | 271 | RECONSTRUCTED_WITH_66_PRE_DAY_CANDLES |

Das öffentliche GeckoTerminal-API-Limit HTTP 429 wurde zweimal mit je 65 Sekunden Pause behandelt; danach konnten sechs von acht Links rekonstruiert werden. Bei zwei Solana-Links lieferte der Provider HTTP 404. Die anderen 57 Listeneinträge besitzen keine direkte Pool-ID; daraus lässt sich keine historische autonome Entdeckungsquote bestimmen.

## 24 Scans – kein künstlicher 2h-/Kalendertag-Rückblick

Die Kurs-/Marktbeobachtungen werden zu den jeweiligen historischen Dot2-Zeitpunkten :15 UTC nur aus bereits abgeschlossenen und nach mindestens 60 Sekunden verfügbaren Kerzen simuliert. Strategieprüfung folgt um :35 UTC. Ein älterer Coin darf bei Scan 1 komplett soweit tatsächlich verfügbar nachgeladen werden. Die folgenden 23 Scans halten den Wissensstand persistent und fügen neue Daten hinzu. **Die Verwendung historisch später bekannter Pool-IDs ist eine Modellannahme, kein originaler Dot2-Beleg aus Oktober.**

| Scan | MESZ | Neue Pool-IDs (Modell) | Im Gedächtnis | Geschlossene Kerzen | Modell BUY | Modell SELL |
|---:|---|---:|---:|---:|---:|---:|
| 1 | 02:35 | 1 | 1 | 68 | 0 | 0 |
| 2 | 03:35 | 0 | 1 | 77 | 1 | 0 |
| 3 | 04:35 | 0 | 1 | 89 | 0 | 1 |
| 4 | 05:35 | 0 | 1 | 100 | 1 | 0 |
| 5 | 06:35 | 2 | 3 | 128 | 2 | 1 |
| 6 | 07:35 | 0 | 3 | 160 | 0 | 2 |
| 7 | 08:35 | 0 | 3 | 195 | 2 | 0 |
| 8 | 09:35 | 1 | 4 | 231 | 1 | 2 |
| 9 | 10:35 | 1 | 5 | 280 | 0 | 1 |
| 10 | 11:35 | 0 | 5 | 327 | 1 | 0 |
| 11 | 12:35 | 0 | 5 | 369 | 0 | 1 |
| 12 | 13:35 | 0 | 5 | 414 | 0 | 0 |
| 13 | 14:35 | 0 | 5 | 459 | 0 | 0 |
| 14 | 15:35 | 0 | 5 | 507 | 2 | 0 |
| 15 | 16:35 | 0 | 5 | 555 | 0 | 1 |
| 16 | 17:35 | 1 | 6 | 600 | 1 | 0 |
| 17 | 18:35 | 0 | 6 | 658 | 2 | 1 |
| 18 | 19:35 | 0 | 6 | 713 | 2 | 1 |
| 19 | 20:35 | 0 | 6 | 770 | 0 | 1 |
| 20 | 21:35 | 0 | 6 | 824 | 1 | 0 |
| 21 | 22:35 | 0 | 6 | 875 | 1 | 1 |
| 22 | 23:35 | 0 | 6 | 932 | 0 | 1 |
| 23 | 00:35 | 0 | 6 | 983 | 1 | 1 |
| 24 | 01:35 | 0 | 6 | 1038 | 0 | 2 |

## Welche Coins führten im explorativen Forschungsmodell zu Verlusten?

| Symbol | Modell BUY | Modell SELL | Realisiertes Modell-PnL TEST-USDC |
|---|---:|---:|---:|
| Marginalia MARG | 3 | 3 | -16.97 |
| Smoking Inu SI/WETH | 2 | 2 | 6.88 |
| Smoking Inu SI/NVDA | 3 | 3 | 40.56 |
| 파랭이 SKHYB | 5 | 4 | -75.06 |
| BNBCAT | 4 | 4 | -72.88 |
| 파랭이 USDT | 1 | 1 | 8.39 |

Die Tabellen zeigen keine echten Börsengewinne. Unabhängige historische Sicherheits-/Liquiditätsfreigaben und tatsächliche historische Dot-2-Entdeckungen fehlen.

## Konkrete verbleibende Blocker

1. Keine vollqualifizierte historische 65-Coin-Population: 57 ohne exakte Pool-ID und 2 mit HTTP404; vorhandene Kurse aus 6 **rückblickend ausgesuchten** Pools.
2. Es gibt noch kein wiederholbar eingefrorenes unabhängiges Vorher/Nachher-Dataset: differierende Source-Abdeckung bedeutet differierende Modell-PnL.
3. Bei der Echtzeit-Kette Dot2→Dot3→Dot4 fehlt noch die vollständige aktuelle Risikofreigabe und ein gültiger Paper-Order/Client-Receipt; dieser Oktober-Backtest kann sie nicht rückwirkend beweisen.
4. Der erste historische Scan durfte alle verfügbare Vergangenheit lesen, aber ein ausgeführter einstündiger GPT-Hintergrundprozess wird nicht behauptet. Der tatsächliche Workflow besteht aus begrenzten GitHub-Actions-Ausführungen.

Nachweis: GitHub-Action 44934074915, Workflow-Artefakt `historical-ohlcv-probe` mit vollständigem `oct12-v11-firstscan-24h-report.json`, `oct12-training-summary.json`, Quell-Kerzen und CSV.
