# R29 V1.0 – All-Time-Marktgedächtnis und neuer 24-Scan-Backtest

**Stand:** GitHub Action [44932501367](https://github.com/127027/Sniperbot-/actions/runs/44932501367), 105/105 Tests erfolgreich. Zweiter Speichertest [44932649891](https://github.com/127027/Sniperbot-/actions/runs/44932649891) ebenfalls erfolgreich.

## Was tatsächlich verbessert wurde

- Nach zwei realen Captures: **30 → 49 verschiedene gespeicherte Pools** (+19), **29 → 49 Contracts**. Zwischen den Runs bleiben die acht Erstlauf-Pools erhalten; GitHub-Checkpoint #44932649891 belegt Fortschritt und alte Quellbezüge.
- Frühere stündliche Einzelsuche und hinterher unbekannte Kandidaten werden jetzt durch `research/state/market-memory.json` mit beobachteter Chain/Pool-Identität, Quellenverweisen und Checkpoints ersetzt.
- Alte Beobachtungen werden **nicht** nach zwei Stunden, 24 Stunden oder bei Datumswechsel gelöscht. Für Kauf-/Verkaufspreise bleiben die bestehenden 10min-/90sec-Quoten und Risikogates bestehen.
- **Kein vollständiger Gratis-Blockchain-Indexer**, pro Run weiterhin nur ein begrenzter Teil der tatsächlich angebotenen öffentlichen Quellen. Backfill-Seiten bleiben offene Arbeit.

## Historischer 12.10.2026 – Vorher vs V1

| Kennzahl | Vorher | V1.0 |
|---|---:|---:|
| Scans | 24 | 24 |
| Nachträglich rekonstruierte Coin-Pools | 2 | 2 |
| Historische Vor-Tages-Kerzen in dieser Stichprobe | 0 | 0 |
| Explorativ BUY / SELL | 6 / 6 | 6 / 6 |
| Explorativ Modell-PnL | −66,01 TEST-USDC | −66,01 TEST-USDC |
| Konservativ Modell-PnL | −33,52 TEST-USDC | −33,52 TEST-USDC |
| Volatilitäts-Gate Modell-PnL | 0,00 TEST-USDC | 0,00 TEST-USDC |
| Tatsächliche historische Dot-Orders | 0 nachgewiesen | 0 nachgewiesen |
| Client-Quittungen | 0 | 0 |

Die unbegrenzte Zugriffsmöglichkeit verbessert das **Systemdesign**, nicht rückwirkend den vergangenen Tag: Die beiden zugänglichen Beispielpools wurden erst am 12.10. erstellt; der kostenlose Anbieter lieferte keine vorherigen Kurskerzen. Die anderen 63 gemeldeten Tagesanstiege sind keine bewiesenen autonom erreichbaren Kandidaten. Ein realer BLIND-Test wäre ein noch nicht gehandelter zukünftiger Tag mit vordefiniertem Datenuniversum.

## Alle 24 Modell-Scans (MESZ)

| Scan | MESZ | Exploratory-Modellereignisse | Saldo der geschlossenen Experimente (TEST-USDC) |
|---:|---|---|---:|
| 1 | 02:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 2 | 03:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 3 | 04:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 4 | 05:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 5 | 06:35 | Smoking Inu SI/WETH BUY | – |
| 6 | 07:35 | Smoking Inu SI/WETH SELL | 43.92 |
| 7 | 08:35 | Smoking Inu SI/WETH BUY | – |
| 8 | 09:35 | Smoking Inu SI/WETH SELL | -37.04 |
| 9 | 10:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 10 | 11:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 11 | 12:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 12 | 13:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 13 | 14:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 14 | 15:35 | BNBCAT BUY | – |
| 15 | 16:35 | BNBCAT SELL | -40.39 |
| 16 | 17:35 | BNBCAT BUY | – |
| 17 | 18:35 | BNBCAT SELL | -23.10 |
| 18 | 19:35 | BNBCAT BUY | – |
| 19 | 20:35 | BNBCAT SELL | -19.25 |
| 20 | 21:35 | BNBCAT BUY | – |
| 21 | 22:35 | BNBCAT SELL | 9.86 |
| 22 | 23:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 23 | 00:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |
| 24 | 01:35 | Kein BUY/SELL (WATCH/DATA_GAP möglich) | – |

## Belegstatus der fünf Dots

Dot1 misst noch keine mehrstufigen verifizierten Stunden-Volumenfenster; Dot2 hat im letzten **eigenen Rollenbericht** 23 Kandidaten/21 volle Contracts; der neu geschaffene getrennte GitHub-Memory-Index hält **49** Pools. Dot3 bestätigte zuletzt 7 WATCH, 10 REJECTED und 4 DATA_GAP, 0 risk-eligible. Dot4 hat 0 BUY/SELL-Orders, Dot5 muss den neuen V1-Checkpoint noch in einem **eigenen echten** Bericht auditieren. Die fünf Automationsprompts wurden V1 entsprechend geändert. Keines dieser Ergebnisse beweist 24 originale alte GPT-Dot-Sitzungen.

**Wichtig:** Ein 49-Pool-Speicher ist kein 49-Coin-Oktober-Backtest, kein von GPT erlerntes Modellgewicht und kein realer Gewinn. Verifizierte Paper-Orders und Client-Fills bleiben null.
