# R29 · Echte neutrale Solana-Tokenstarts im 120-Tage-Backtest

**Stand: 16. November 2026.** Reine historische Quellenforschung. **Keine Echtgeld- oder lokalen Paper-Trades.**

## 1. Was diesmal wirklich aus echten Blockchain-Aufzeichnungen stammt

Wir haben den offen verfügbaren, unveränderlich auf den Commit `9b9a04e7e3e85775d614d16105daad2e69ce8544` festgelegten Datensatz [loopholetape/pumpfun-launches](https://huggingface.co/datasets/loopholetape/pumpfun-launches) abgerufen. Er basiert nach Angaben des Anbieters auf einer Solana-Yellowstone-Aufzeichnung und umfasst die tatsächlich erfassten Pump.fun-Tokenstarts vom 31.08. bis 05.11.2026. Der Datensatz enthält **auch fehlgeschlagene bzw. nie populär gewordene Tokenstarts**, keine reine Liste späterer Gewinner.

**Tatsächlich ausgeführter und bestandener GitHub-Actions-Lauf:** https://github.com/127027/Sniperbot-/actions/runs/43907525937

**Belegbare Ergebnisse:**

| Eigenschaft | Ergebnis |
|---|---:|
| Tatsächlich geladene historische Parquet-Tagesdateien | **67/67** |
| Gegen Rohdateien mit SHA-256 gesicherte Tokenstart-Datensätze | **2.713.057** |
| 24 abgeschlossene stündliche Beobachtungsfenster je verfügbarem Tag | **1.608** |
| Abgedeckte Tage der ursprünglichen 60-Tage-Trainingsphase | **18/60** |
| Fehlende Tage der Trainingsphase | **42/60** |
| Tokenstarts der vorhandenen Trainingstage | **546.291** |
| Abgedeckte Tage der ursprünglichen 60-Tage-Handelsphase | **49/60** |
| Fehlende Tage der Handelsphase | **11/60** |
| Tokenstarts der vorhandenen Handelstage | **2.166.766** |
| Quellenfehler bei diesen 67 Datensätzen | **0** |
| Nachweislich vom historischen GPT selbst ausgeführte Modellscans | **0** |
| Aus diesen Daten erfolgreich nachgewiesene Paper-BUY-/SELL-Trades | **0 – nicht getestet, kein Beweis für NO_TRADE** |

**Wichtig:** Der letzte Punkt ist KEIN Beweis, dass eine vollständig informierte GPT-Strategie nie gekauft hätte. Er besagt nur, dass hier keine Käufe simuliert oder als historische GPT-Trades ausgegeben wurden.

Die vollständige 120-Tage-Tabelle – einschließlich der 53 echten Datenlücken – wurde dauerhaft gespeichert: `research/replay-120d-real/results/neutral-solana-launch-120-day-coverage.csv`. Die Quellen- und Methodendetails stehen in `results/neutral-solana-coverage-summary.json`.

## 2. Keine Zukunftsinformationen an den Modellentscheider

Der Replay-Reader verarbeitet ausschließlich die aus dem Launch-Vorgang ableitbaren Felder:

- `mint` (Solana-Tokenadresse)
- `creator` (Creator-Adresse auf der Chain)
- `t0` und `launched_at` (Startzeit)
- `name` und `symbol` (anfängliche Bezeichnung)

**Nicht** an den Entscheidungsprozess weitergegeben wurden unter anderem:
`graduated`, `rugged`, `rug_dt_s`, `peak_rs`, `terminal_rs`, `migrate_dt_s`, `dev_first_sell_dt_s` und spätere Creator-/Score-Klassifikationen. Diese Felder enthalten später festgestellte Entwicklungen, die bei einem Kauf nicht bekannt gewesen wären.

Jeder Token darf in einem historischen Check erst erscheinen, **wenn seine gemeldete Startzeit erreicht ist**. Pro Tag gibt es 24 abgeschlossene UTC-Stundenfenster. Die ersten zwölf Kandidaten je Fenster werden nach **Startzeit**, nicht nach späterem Gewinn, ausgewählt. Die Fenster wurden gegen Zukunftsinformationen und doppelte oder verlorene Randzeitpunkte getestet.

Die `1.608` Stundenfenster sind **technische, datengestützte Zeitschnitte**, keine `1.608` tatsächlich durchgeführten GPT-Aufrufe.

## 3. Quellenqualität und Grenzen

Der Datensatz wurde **am 12.11.2026** veröffentlicht bzw. in dieser Form aktualisiert, nicht im Juli. Er enthält Zeitangaben aus einer historischen Solana-Aufzeichnung; damit stehen echte retrospektive Ereignisse zur Verfügung. Eine nachträgliche Veröffentlichung beweist allein aber noch **nicht**, dass wir jeden Eintrag bereits am damaligen Scanzeitpunkt unabhängig hätten abfragen können. Für einen vollständig unabhängigen historischen Blindtest sind zusätzliche Archiv-/Blockchain-Attestierungen notwendig.

**Vom Anbieter dokumentierte Einschränkungen:**

- Die erste Tagesdatei vom 31.08.2026 beginnt erst um circa **04:03 UTC**.
- Vor dem Decoder-Fix am **27.09.2026** wurden etwa 48 % bestimmter Kaufereignis-Zeilen nicht erfasst; die **frühen Kauf- und Bündel-Indikatoren** können daher unterschätzt sein. Wir nutzen diese Felder hier **überhaupt nicht**.
- Der Anbieter dokumentiert kürzere Recorder-Ausfälle und keine unabhängige vollständige Blockchain-Zählung.
- Nicht jeder Pump.fun-Tokenstart ist ein wirtschaftlich handelbarer Memecoin.
- Das gesamte Datenset endet am **05.11.2026**. Die Tage 06.–16.11. sind in dieser Quelle nicht vorhanden.
- Es fehlen noch zeitlich geprüfte Contract-Sicherheit, Mint-/Freeze-Berechtigungen, LP-Status, historische DEX-Bid-/Ask- beziehungsweise Swap-Quotes und unabhängige Käufer-/Social-Media-Belege für die einzelnen Mints.

Siehe: https://huggingface.co/datasets/loopholetape/pumpfun-launches/blob/main/KNOWN_ISSUES.md

## 4. Bedeutung für die bestehende Handelsstrategie

**Vorher:** Der reale Preis-Only-Vergleich nutzte zwölf rückblickend bekannte Binance-Memecoin-Paare. Der konservative Vergleich endete indikativ bei **4.895,38 TEST-USDC**, die aggressive Variante bei **2.497,62 TEST-USDC** – jedoch ohne echte GPT-, DEX- oder Sicherheitsprüfung.

**Jetzt zusätzlich:** Für **67 historische Tage** liegt ein unabhängig von späteren Gewinnerlisten zusammengestellter Rohkatalog tatsächlich erfasster neuer Solana-Mints vor. GPT kann für einen zukünftigen, versiegelten Replay-Frame deren Namen, Tokenadressen und damalige Startzeit sehen, ohne den nachträglichen Erfolg zu kennen.

**Das löst nur den ersten Teil der Forschungsaufgabe.** Ohne damalige ausführbare Kauf-/Verkaufskurse, unabhängige Safety-Gates und vollständige Modellentscheidungen lässt sich keine realistische persönliche Trade-Tabelle oder Profitabilität dieser 2.713.057 Token errechnen. Erfundene Orders werden nicht erstellt.

## 5. Umsetzung und Nachweise

- `neutral-launch-pilot.py`: inzwischen auf **alle 67 Tage** ausgebauter, auf eine exakte veröffentlichte Dataset-Revision festgelegter Parquet-Reader; ausschließlich sichere Launch-Identitätsmerkmale.
- `test_neutral_launch_pilot.py`: sechs erfolgreiche Tests für chronologische Fenster, Mitternachtsereignisse und verbotene spätere Ergebnisfelder.
- `results/neutral-solana-launch-120-day-coverage.csv`: dauerhaftes tatsächliches 120-Tage-Abdeckungsjournal mit allen Tages-SHAs und 53 expliziten Datenlücken.
- `results/neutral-solana-coverage-summary.json`: maschinenlesbarer Audit.
- [Vollständiges GitHub-Quellarchiv mit dem neutralen 67-Tage-Replay](https://github.com/127027/Sniperbot-/actions/runs/43907525937/artifacts/14246123089) (zeitlich begrenzter CI-Download).

**Ergebnis:** `LAUNCH_DISCOVERY_HISTORICAL_EVENT_COVERAGE_67_OF_120_DAYS` – bestanden. `FULL_GPT_STRATEGY_REAL_HISTORICAL_BUY_HOLD_SELL` – **noch nicht bewiesen**. Das laufende Paper-Konto und Echtgeld bleiben unberührt.
