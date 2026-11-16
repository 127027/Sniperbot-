# R29 – Fortsetzung des 60-Tage-Memecoin-Blindtests (16.11.2026)

**Modus:** ausschließlich RESEARCH / PAPER_ONLY. GPT ist der alleinige strategische Entscheider. Der lokale Bot darf nur signierte, gültige GPT-Aufträge technisch prüfen, nötige Umwandlungen im Paper-Kontext berechnen und Paper-Ausführungen quittieren; keine eigene Coinauswahl oder Handelsstrategie. Technische Sicherheitsblockaden bleiben unabhängig aktiv.

## 1. Unveränderte Forschungsgrenze

60 UTC-Kalendertage: **18.09.–16.11.2026**. Aktuelle Quellenmatrix:
`results/REAL_60_DAY_EVIDENCE_MATRIX_43D_2026-11-16.csv`
(Git-Blob `bfd966dc863cfc0c5fbf4585105fef21e7b19f18`).

- **49/60** Tage mit historisch dokumentierten Solana-Launch-Identitäten.
- **43/60** Tage mit historischen Minutensignalen, 24.09.–05.11.2026.
- **1/60** vollständiger DEX-Transaktionstag für eine zeitneutral gewählte Gruppe: 15.10.2026.
- **0/60** vollständig durch Original-GPT-Entscheidung, historisch gültige Pool-/Contract-/Sellability-Proofs, reale bidirektionale Kosten-Quotes und virtuelle Fill-/PnL-Nachweise abgeschlossene GPT-DEX-Handelstage.
- Die zuvor vorliegenden 60 Tage Binance-CEX-Kursvergleiche sind nur **Shadows** mit retrospektiv bekannten Coinpaaren und modellierter Ausführung; keinesfalls echter neuer Memecoin-GPT-Sniper-Profit.

**Tagesweise Arbeitsliste:** `results/R29_60_DAY_SOURCE_GAP_TRIAGE_20261116.csv`.
Daraus: 1 priorisierter DEX-Pilot-Tag (P0), 42 weitere Tage mit Minutenfeatures ohne vollständige Swap-Belege (P1), 6 frühe Tage nur mit Launch-Identitäten (P2), 11 Tage ganz ohne diese Launch-/Minute-Belege (P3). Fehlt ein Tag, bleibt er **DATA_GAP**, nicht NO_TRADE und nicht Nullrendite.

## 2. Die neu hochgeladene historische Memecoin-Datenbank

Datei `meme_coins_2013_2026_historische_datenbank(10).xlsx`, SHA-256
`f746a855675807f1dc0ad9d2170f1efef0c35d9d105eb545821a49304ad44a88`.
Recherche-Stichtag der Datei: **09.11.2026**; 89 chronologisch eingeordnete Coins, 281 Kategorie-Snapshot-Einträge, 23 ATH-Preiswerte, 14 historische Hype-Fälle.

14 Hype-Fälle unter `results/HISTORICAL_MEME_HYPE_REFERENCE_POSTHOC_20261109.json` als **bekannte historische Beispiele** archiviert. Dieser Ausschnitt enthält **keine** vollständig verifizierten historischen Contract-/Pool-Identitäten. Ausschließlich für Hypothesen über virale Katalysatoren, Narrative und Risiken verwenden. **Nie** rückblickend aus Gewinnerlisten Kaufkandidaten für einen Blindtest wählen oder spätere ATH-/Rug-/Peak-Felder in die damaligen GPT-Eingaben kopieren. Bei gleichen Tickern (z.B. verschiedene TRUMP-Token) zwingend Chain+Token+Pool prüfen.

## 3. Neu implementierte, rein lesende GPT-Prüfung

`strict-asof-gpt-scan.mjs` + `strict-asof-gpt-scan.test.mjs`:

- Nur **GPT-autorisierte** Forschungsentscheidungen werden als solche angenommen; Bot-autonome Strategie ist ungültig.
- Scan-Kandidaten benötigen eindeutige Chain-/Token-/Pool-Identität, frühen UTC-Beobachtungszeitpunkt und neutrale chronologische Auswahl.
- Spätere Marktereignisse, rückblickende Gewinner-Labels und manipulierte GPT-Entscheidungs-Transkripte werden abgelehnt.
- BUY-Stakes von **50 bis 5.000 TEST-USDC** werden nur als Forschungsszenario angenommen; die bestehende separate Beweisprüfung `historical-evidence-gate.mjs` verlangt sechs unabhängige as-of Proof-Klassen für historische Reviewbarkeit.
- Ein erfolgreich formulierter GPT-BUY wäre weiter **kein historischer Fill**, keine ausführbare Quote und kein Beweis für Profit. Das neue Modul erstellt bewusst **keine Order**, ändert **kein** Paper-Guthaben und schaltet **kein** Echtgeld frei.
- Rückblickende GPT-Modellaufrufe werden mit ihrem **tatsächlichen späteren Laufzeitpunkt** ausgewiesen, nicht auf historische Tage rückdatiert.

Der bestehende Preflight-Workflow `.github/workflows/r29-60d-backtest-preflight.yml` wurde erweitert, damit GitHub Actions beide Unit-Test-Suiten und die Posthoc-Quarantäne prüft. **Grüne Unit-Tests beweisen Schutzregeln, aber nicht den Abschluss des Backtests.**

## 4. Neue geprüfte Quelle und genau ihre Grenze

Dune dokumentiert `dex_solana.trades` für historische Solana-DEX-Handelstransaktionen mit Zeitstempel, Token-Mint-Identität, Wallet/Transaktion, Tokenmengen und geschätztem USD-Handelswert:
https://dune.com/data/dex-trading?id=dex_solana.trades

Diese Rohdaten sind ein **Kandidat zur Ergänzung der historischen Swap-Historie**, jedoch ohne garantierten kostenlosen Vollabruf. Normalisierte Transaktionszeilen allein beweisen **keine** aktuelle Pool-Reserve, keinen kontraktseitig möglichen Rückverkauf zu unserer USDC-Positionsgröße und keine damals wirklich verfügbare ausführbare Kauf-/Verkaufsquote. Kosten, Datenzugang und Reproduzierbarkeit müssen vor einem verpflichtenden API-Schritt getrennt geprüft werden. Es wurde kein Abonnement gekauft.

Die vorhandene freie Minutenfeature-Quelle ist weiterhin auf 05.11.2026 begrenzt:
https://huggingface.co/datasets/loopholetape/pumpfun-launches/blob/main/README.md
Sie dokumentiert Selektionsverzerrung und vor dem 27.09.2026 fehlende Teile des Buy-Decodings. Solche Frühsignale nicht als bevölkerungsrepräsentativ oder vollständig ausgeben.

## 5. Nächster belastbarer Durchlauf

1. **P0 / 15.10.2026:** Bereits neutrale 48 Mint-Kandidaten an historische Pool-/Authority-/Bidirektional-Quote- und Walletdaten binden; nur dann zusätzliche historische GPT-Frames wirklich entscheiden lassen. BUYs ohne Proof bleiben BLOCKED. Originaldaten und GPT-Transkripte jeweils hashen.
2. **P1 / 42 Tage:** Bereits zeitlich geschlossene Frühfeature-Frames mit neutralen DEX-Swaps ergänzen. Keine rückblickende Auswahl nach späteren Gewinnern.
3. **P2 / sechs Tage und P3 / elf Tage:** Quelle für historische Erfassung und Minutenaktivität rekonstruieren oder ausdrücklich als nicht nachgewiesen reporten. Nicht mit CEX-DOGE/PEPE-Ersatzdaten auffüllen.
4. **Ausführung und Risiko:** Bei später tatsächlich prüfbaren historischen BUY-/SELL-Signalen Gebühren, Slippage, Pooltiefe, SOL↔USDC-Wechsel, 50–5.000 TEST-USDC Einsatz und freie virtuelle Liquidität berücksichtigen. Auch WATCH/NO_TRADE/abgelehnte spätere Gewinner chronologisch auswerten.
5. Erst wenn 60 Tage GPT-as-of-Retroentscheidungen und eine belastbare DEX-Ausführungssimulation dokumentiert sind, die **Live-24/7-Paper-Signalkette** (1–24 bedarfsgesteuerte GPT-Scans täglich) getrennt end-to-end testen. Bestehende stündliche Automation nicht duplizieren.

**Aktuelle Schlussfolgerung:** Das vollständige historische GPT-Memecoin-PnL ist **unbekannt**, keinesfalls 0 und keinesfalls mit dem CEX-Schatten-PnL gleichzusetzen. **Keine neuen signierten BUY-Aufträge**, kein Eingriff in das bestehende Paper-Ledger oder die Echtgeldsperre durch diese Forschung.
