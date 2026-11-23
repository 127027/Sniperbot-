# R29 V2.8 – Alle 24 Scanner mit BUY / HOLD / SELL

**Status: echter GitHub-Quellenprüflauf erfolgreich, aber historischer GPT-/Client-Backtest NICHT bestanden.**

**Datum:** 12.10.2026; Scan 1 um 00:00 UTC, Scan 24 um 23:00 UTC; 13.10.2026 00:00 UTC ist das **exklusive Ende**, kein 25. Scan.

**Prüfquelle:** [GitHub Actions V2.8 #45283823647 – SUCCESS](https://github.com/127027/Sniperbot-/actions/runs/45283823647); **11/11 Python-Tests PASS**. Das vollständige SHA-audierte Artefakt `r29-v28-exact-24-scan-actions-45283823647`, **ID #14870493656**, enthält `24-scans.md`, `24-scans.csv`, `24-scans.json`. SHA-256: JSON `1d2e57ecbf112c4ecd8e97ac7d853db23e1b00c90c67b507894a3d680514cce5`; CSV `4e0a126651b209753785dd7e12dbc9eaced487ca359ae803b16b005e455ca9ad`; Markdown `cf23e7a2823624b6419aeb0c5386c7d6574142e52e7f1cdfa77e7c52d5ce6240`.

## 1. Vollständige Scan-Tabelle, aus ORIGINALEN geprüften Artefakten

> Alle 24 Zeilen sind **tatsächlich simulierte Uhr-/Softwaremodell-Takte** aus dem eingefrorenen 12.10.-Diagnoselauf; **keine 24 echten unabhängigen GPT-Reviews**. Null BUY/HOLD/SELL bedeutet **unvollständige Original-Quoten**, nicht dass es keine handelswürdigen Memecoins gab.

| Scan | UTC | Retrospektive Solana-Mints im zweitägigen Roharchiv | Neu seit vorherigem Scan | Modell-BUY | Modell-HOLD (offene gekaufte Positionen) | Modell-SELL | Nur nachträglich geprüfte Drittverkäufe |
|---:|:---:|---:|---:|:---:|:---:|:---:|---|
| 1 | 00:00 | 30.181 | 30.181 | – | – | – | – |
| 2 | 01:00 | 31.288 | 1.107 | – | – | – | – |
| 3 | 02:00 | 32.660 | 1.372 | – | – | – | **TANK: 2 SellV2/V3 fremde Wallets, KEIN Bot-SELL** |
| 4 | 03:00 | 33.917 | 1.257 | – | – | – | – |
| 5 | 04:00 | 34.878 | 961 | – | – | – | – |
| 6 | 05:00 | 36.002 | 1.124 | – | – | – | – |
| 7 | 06:00 | 36.938 | 936 | – | – | – | – |
| 8 | 07:00 | 37.795 | 857 | – | – | – | – |
| 9 | 08:00 | 38.797 | 1.002 | – | – | – | – |
| 10 | 09:00 | 39.920 | 1.123 | – | – | – | – |
| 11 | 10:00 | 41.102 | 1.182 | – | – | – | – |
| 12 | 11:00 | 42.266 | 1.164 | – | – | – | – |
| 13 | 12:00 | 43.589 | 1.323 | – | – | – | – |
| 14 | 13:00 | 44.942 | 1.353 | – | – | – | – |
| 15 | 14:00 | 46.568 | 1.626 | – | – | – | – |
| 16 | 15:00 | 48.380 | 1.812 | – | – | – | – |
| 17 | 16:00 | 50.296 | 1.916 | – | – | – | – |
| 18 | 17:00 | 52.506 | 2.210 | – | – | – | – |
| 19 | 18:00 | 54.293 | 1.787 | – | – | – | **ARIANA: 2 SellV3 fremde Wallets, KEIN Bot-SELL** |
| 20 | 19:00 | 56.312 | 2.019 | – | – | – | – |
| 21 | 20:00 | 58.406 | 2.094 | – | – | – | – |
| 22 | 21:00 | 60.547 | 2.141 | – | – | – | – |
| 23 | 22:00 | 62.293 | 1.746 | – | – | – | – |
| 24 | 23:00 | 63.890 | 1.597 | – | – | – | – |

## 2. Strikte Trennung der drei Evidenzarten

1. **Modellentscheidungen**: Aus dem eingefrorenen echten V2.2-GitHub-Diagnoseergebnis #45257966772 stammen **24/24 Modell-Zeitpunkte, 0 BUY, 0 HOLD, 0 SELL, 0 handelbar bestätigte Original-Oktober-Quotes**. Er ist kein historischer fünf-GPT-Dot-Lauf; **0 authentifizierte Original-Reviews**, **0 tatsächliche Windows-Paper-Fills**.
2. **Rückblickende Marktquelle**: Aus der original SHA-geprüften V2.6-Zweitagesparquet-Quelle #45272055484 stammen **259.851 rohe Mint-Feature-Zeilen** und die hier gezeigten *kumulativen* eindeutigen Solana-Mints je virtuellen Zeitpunkt. **30.181 bei Scan 1** umfassen bereits den Vortag; **63.890 bei Scan 24** sind keine 63.890 bestätigten damaligen GPT-Entdeckungen, keine vollständige sechs-Chain-Marktmenge und keine handelbare Pool-/Token-Liste.
3. **Historische Chain-Ereignisse anderer Wallets**: Aus dem SHA-fixierten V2.7-Join #45276830073 stammen TANK (Scan 3, 02:00 UTC) und ARIANA (Scan 19, 18:00 UTC), je zwei vor dem Tick liegende echte Solana-Drittverkäufe. **Diese Verkäufe sind keine eigenen Bot-Verkäufe und erzeugen keine HOLD-/BUY-Position.**

Ein WATCH-/NO_ACTION-Signal ist **nie** gleich HOLD: HOLD wird ausschließlich nach belegtem Modell-BUY und während einer noch offenen gekauften Position geführt. Gleiches gilt für Verkäufe: Ein fremder SELL-Beleg wird niemals zu einer erfundenen eigenen Exit-Order hochgestuft.

Die **65 rückblickenden Gewinner** sind ein getrenntes POSTRUN-Vergleichs-Oracle. Sie sind keine vorbereitete Kandidatenliste und wurden für keinen der 24 Entscheidungszeitpunkte als BUY-Signal eingebracht.

## 3. Belege, Implementierung und keine erneute Prüfschleife

- GitHub-Code: `scripts/v28-exact-24-scan-evidence-ledger.py` (neue, rein offline SHA-gepinnte Quellen- und Modell-Ledger-Verknüpfung), `test/v28-exact-24-scan-evidence-ledger.test.py` (11 echte negative Regressionsfälle), `.github/workflows/cleanroom-v28-exact-24-scan-buy-hold-sell-audit.yml`.
- Ausgeführter CI-Run #45283823647 hat alle drei Originalartefakte erneut geladen, bytegenau gegen SHA-256 verifiziert und die vollständige Tabelle als Markdown, CSV und JSON veröffentlicht. Der genaue Source-Commit ist auf der GitHub-Run-Seite dokumentiert.
- Ursprungstransaktionen und exakter historischer Fremd-Sell wurden in [V2.7](R29_V27_FULL_RAW_SOURCE_TO_OCT12_ONCHAIN_SELL_EVIDENCE_20261123.md) dokumentiert.
- Keine Orders ausgelöst, kein Echtgeld, keine vorhandene Windows-Paper-Historie verändert, kein `main`-Merge, keine alten Bot-Trading-Dateien übernommen.

## 4. Nächster technisch notwendiger Nachweis – nicht dieselben 24 Uhrpunkte wiederholen

Erforderlich sind **zeitgerecht damals tatsächlich verfügbare** neutrale multichain Discovery-Daten, exakte Original-Poolzustände und original tokenrechtliche Risiken sowie unabhängig belegte **50-TEST-USDC-BUY-/SELL-Ausführbarkeit mit Reserveauswirkung, Gebühren, Slippage, SOL/USDC-Konversion und Exit-Sellability**. Danach müssen Dot1–Dot5 echte GPT-Request/Response-Quittungen mit SHA, Source-As-of und originalen Paper-Client-Receipts erzeugen; ein neuer prospektiver Holdout darf nicht mit den 65 Gewinnern vorbereitet werden.

**Formelle Gesamtabnahme weiterhin 13/60 (21,67 %), acht externe Evidenzblocker, QA-04 = NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE.**
