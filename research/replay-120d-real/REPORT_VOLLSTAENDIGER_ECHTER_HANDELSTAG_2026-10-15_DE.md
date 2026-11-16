# Sniperbot R29 – ECHTER vollständiger Memecoin-Handelstag (15.10.2026)

**Stand:** 16.11.2026 · **Repository:** `127027/Sniperbot-` · Branch `codex/r29-chatgpt-github-paper-cycle-20261115`

## Was tatsächlich gemacht wurde

Anstatt eine kleine Binance-Kursliste oder 100 einzelne Zeilen zu benutzen, wurde am 16.11.2026 das **vollständige frei veröffentlichte Solana-Handelsarchiv für den 15.10.2026** eingelesen. Vier Parquet-Dateien und die tatsächlich bereitgestellte Launch-/Blockchain-Abgleichsquittung wurden verarbeitet.

| Reale historische Beobachtung | Beleg |
|---|---:|
| Alle Pump.fun- und PumpSwap-Handelsereignisse des Tages | **42.230.410** |
| Davon tatsächlich erfolgreiche Transaktionen anderer Marktteilnehmer | **21.801.882** |
| Davon fehlgeschlagene Trades | **20.428.528** |
| Vom Anbieter erfasste tatsächliche Tokenstarts | **46.540** |
| Vorab *ohne spätere Erfolgsdaten* ausgewählte Mints | **48** |
| Für diese 48 Mints vollständig herausgefilterte Transaktionsereignisse | **28.112** |
| Ausgewählte Mints mit historisch beobachteten erfolgreichen Käufen **und** Verkäufen | **41** |
| Unabhängig bewiesene für den Bot ausführbare BUY-/SELL-Fills | **0** |
| Tatsächlich im historischen Jahr 2026 durch GPT gesendete Orders | **0 – dieses Replay erzeugt keine historische Originalhandlung** |

**Quellen:**
- https://huggingface.co/datasets/pumpdatafun/pump-fun-trades-sample
- https://huggingface.co/datasets/pumpdatafun/pump-fun-trades-sample/blob/main/summary.json
- https://huggingface.co/datasets/pumpdatafun/pump-fun-trades-sample/blob/main/receipt.json
- https://github.com/127027/Sniperbot-/actions/runs/43918226868

**Erzeugte Forschungsdateien (GitHub-Actions-Artefakt, 30 Tage aufbewahrt):**
https://github.com/127027/Sniperbot-/actions/runs/43918226868/artifacts/14252596029

Der Download enthält den JSON-Abschlussbericht mit Tages- und Kandidatenzählung, die Quellendatei-Prüfsummen, ein separates frühes **As-of-Datenpaket mit sechs echten Tokenadressen** sowie für jeden der 48 Token ein eigenes vollständig extrahiertes **`.jsonl.gz`-Handelsprotokoll**. Keine historischen Transaktionen wurden stillschweigend auf 12.000 Ereignisse gekürzt; stattdessen erfolgte die Aufbereitung über ein temporäres, speicherschonendes SQLite-Journal.

**Provenienz:** Die Daten stammen laut Anbieter aus einer nachträglich angelegten Solana-Ledger-Aufzeichnung; die Quittung beschreibt einen Abgleich der Tages-Slots mit der Blockchain. Dieser Anbieterbeleg ist **keine von uns unabhängig durchgeführte Signatur-/RPC-Verifikation jeder historischen Einzeltransaktion**. Auch die damalige Verfügbarkeit des später veröffentlichten Datensatzes für ein historisches GPT-Modell ist **nicht** garantiert.

## Neutrale, zeitliche Kandidatenwahl

Bei jeder der 24 UTC-Stunden wurden die ersten zwei tatsächlichen Tokenstarts ausgewählt, also **48 Coins**, ohne nach ihrer späteren Performance, ihrem Rug-Status oder ihren Kurs-Hochs zu filtern.

- Tokenidentität und Launchzeit stammen aus der echten Launch-Parquet-Datei.
- Für alle vier historischen Swaps-Dateien wurden ausschließlich diese zuvor definierten Tokenadressen extrahiert.
- Pro Coin wurden sämtliche in dieser **einen** Tagesdatei beobachteten Käufe, Verkäufe und Fehlversuche in Reihenfolge `ts,slot,idx,seq` archiviert.
- Zu jeder vollen Uhrzeit werden nur Ereignisse mit `event_ts < scan_time` in die frühe Recherche-Zusammenfassung übernommen.
- Das Modell erhält in den separaten Entscheidungsframes weder späteres ATH noch spätere Handelsereignisse.
- Alle 24 Stunden werden als Daten-Zeitschnitt untersucht, **nicht** als 24 tatsächlich ausgeführte GPT-Calls ausgegeben.

## Erste sechs echte datengestützte GPT-Forschungsentscheidungen

Die nachstehenden sechs Bewertungen wurden **heute** vom GPT anhand der getrennten, nachweislich zeitlich begrenzten historischen Frames formuliert. Sie sind **rückblickende Forschung**, keine im Oktober 2026 tatsächlich versendeten Handelsorders und kein vollständig blindes Training einer damals unbekannten Zukunft.

| Historische Uhr (UTC) | Echte Solana-Tokenadresse (gekürzt) | Zu diesem Zeitpunkt sichtbare Trades | GPT-Rechercheentscheidung |
|---|---|---:|---|
| 15.10. 01:00 | `7xWcYfVm…qyo` | 1 Kauf / 5 Verkäufe / 1 Fehlversuch | NO_TRADE |
| 15.10. 01:00 | `DKqreige…pump` | 186 Käufe / 162 Verkäufe / 50 Fehlversuche | **WATCH** |
| 15.10. 02:00 | `8uW96gmk…pump` | 30 Käufe / 28 Verkäufe, aber nur 2 beobachtete Käufer-Wallets | NO_TRADE |
| 15.10. 02:00 | `6srHSToJ…pump` | 3 Käufe / 4 Verkäufe, alle gegen ein Nicht-SOL-Quote-Asset | NO_TRADE |
| 15.10. 03:00 | `75hA6A6Z…pump` | 2 Käufe / 1 Verkauf, 1 Käufer-Wallet | NO_TRADE |
| 15.10. 03:00 | `GVgTAzUX…pump` | 13 Käufe / 10 Verkäufe / 7 Käufer-Wallets | **WATCH** |

**Grund für kein BUY:** Es liegen keine vollständig unabhängigen, damals verfügbaren Contract-/Freeze-Sicherheitsbelege, Pool-Liquiditätsnachweise, organischen Käuferbewertungen und ausführbaren, kostenbereinigten Kauf-/Verkaufsquotes für das eigene Paper-Konto vor. Historische Trades **anderer Wallets** beweisen nicht, dass unser Bot seinen eigenen Trade zu einem vergleichbaren Preis sicher hätte ausführen können.

**Maschinenlesbarer Originalbericht mit vollständigen Tokenadressen, Review-UTC, Datenzahlen und Gründen:**
`research/replay-120d-real/reviews/2026-10-15-six-neutral-real-frames-current-gpt.json`

## Was wir für die 60 Handelstesttage noch nicht behaupten dürfen

Die oben dargestellte vollständige Transaktionshistorie gilt **nur für den 15. Oktober**, nicht für sämtliche 60 Handelstesttage. Die Anbieter halten den restlichen Mehrmonats-Swap-Datensatz nach aktuellem Stand überwiegend kostenpflichtig vor; weder ein kostenpflichtiger Export noch eine bezahlte API wurde genutzt.

Die vorhandenen 67 Tage mit **2.713.057** tatsächlichen Solana-Launch-Identitäten stellen wichtige Entdeckungsevidenz bereit, jedoch keine vollständigen Kauf-/Verkaufszeiten, Bid-/Ask-/Liquidity- und Security-Zustände je Token. Die vorangegangenen Binance-Preis-Schatten-Backtests sind **kein** unabhängiger DEX-/GPT-Handelsnachweis.

**Abnahmestatus:**
- `ONE_COMPLETE_FREE_ONCHAIN_DAY_20261015`: **BESTANDEN**
- `NEUTRAL_48_SOLANA_MINTS_COMPLETE_24H_TRADES`: **BESTANDEN**
- `ASOF_SIX_REAL_CANDIDATE_GPT_RESEARCH_VERDICTS`: **NACHVOLLZIEHBAR, retrospektiv**
- `SIX_INDEPENDENT_HISTORICAL_ORDER_SECURITY_GATES`: **NICHT BESTANDEN (fehlende Quellen)**
- `60D_FULL_ACTUAL_HISTORIC_GPT_BUY_HOLD_SELL_PNL`: **NICHT NACHGEWIESEN**
- `REAL_MONEY_LAUNCH`: **NICHT FREIGEGEBEN**

**Nächster inhaltlicher Schritt:** Für die bestehenden Mints historical SOL-/Nicht-SOL-Quote-Decimals, historische Sicherheits-/LP-Zustände und belegbare bidirektionale Ausführungskosten ergänzen; anschließend dieselbe as-of-GPT-Auswertung auf weitere verfügbare Handelsdaten ausweiten. Ein echter Forward-Paper-Test auf dem Laptop ist weiterhin erforderlich, bevor Echtgeldhandel überhaupt erwogen werden sollte.

**Unverändert:** `PAPER_ONLY`; keine Veränderung des laufenden Laptop-Guthabens, keine Produktiv-GitHub-Order, keine Wallet-Transaktion.
