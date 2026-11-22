# R29 V1.9 – 70-%-Meilenstein: fünf ehrlich teilimplementierte Originalaufgaben

**Datum:** 22. November 2026. **Repository/Branch:** `127027/Sniperbot-`, `codex/r29-cleanroom-paper-20261121`. **Scope:** ausschließlich bestehender Cleanroom, Research und isolierte Tests. Die fünf ChatGPT-Dots bleiben pausiert, keine echten oder Paper-Orders, keine Änderung am lokalen Windows-Paper-Wallet, am Legacy-Code oder an `main`.

## 1. Klare Bezugsgröße statt scheinbarem Rückschritt

Vor diesem Schritt: **38/61 = 62,3 % der Originalaufgaben PASS oder PARTIAL**, davon 12 vollständig nach Originalabnahme `PASS`, 26 `PARTIAL`, 23 `OPEN`.

Neu **aus OPEN in PARTIAL**: `D1-05`, `D3-06`, `D4-03`, `D5-04`, `QA-05`.

**Jetzt: 43/61 = 70,5 % technisch bearbeitete Originalaufgaben**, davon **12/61 = 19,7 % PASS**, **31/61 = 50,8 % PARTIAL**, **18/61 = 29,5 % OPEN**. **Nicht** 70,5 % vollständig fertiger Trading-Bot; kein früherer Codeverlust. Es wurden keine Original-Aufgaben entfernt, nur technische Fortschritte mit neuen Code-/Testnachweisen dokumentiert.

### Warum jede neue Aufgabe höchstens PARTIAL ist

| Original-ID | Wirklich implementiert | Wirklich geprüft | Fehlende ORIGINAL-Abnahme |
|---|---|---|---|
| **D1-05** | `src/v19-chain-service-sla.mjs`, Anpassung `src/v19-discovery-budget-plan.mjs`, Integration im **bestehenden** `scripts/cloud-discovery-runner.mjs`: aktuelle as-of Poolzahlen und offene Seiten je Chain, faire Mindestbedienung und nur nach Wartezeit ausschlaggebender Demand-Tie-Break; echter HTTP200-Fortschritt getrennt von geplanten Requests | Sechs-Chains-/Ein-Slot-Starvation-Test, überfälliger 429-Recheck, aktive Sperre, P95 vergangene Zeit seit Chain-Request. **Unbelegte Warteschlangen-Alter bleiben `null`** | Tatsächliche Chain-Coverage-Prozente sowie **gemessene** P95-Einzelkandidaten-Wartezeit und maximale Backlog-Alterung über mehrere echte Research-Läufe |
| **D3-06** | `src/v19-paper-liquidity-sensitivity.mjs`, Runner schreibt `paper-liquidity-sensitivity.json` für Originalquellen im aktuellen Capture. 50 TEST-USDC, bestehende 5.000-USD-Minimum-Liquidität und 1-%-Nutzung bleiben unverändert; Gebühren, Spread, modellierter Impact und vier Liquiditäts-Szenarien | Kosten steigen bei weniger Liquidität; negative bzw. unbekannte Liquidität wird nicht handelbar; kein Policy-Reset | Empirische Chance/False-BUY/Slippage-Sensitivitätskurven mit tatsächlich unabhängigen Preisen und verifizierten Outcomes; **nur Modell**, keine Risiko-Lockerung |
| **D4-03** | `src/v19-exit-counterfactual.mjs`: unveränderliche Experiment-Alternativen **Baseline TP20/SL10**, **Trailing mit Aktivierung TP20 / Drawdown12 / SL10**, **Teilverkauf TP20 + Trailing**, **60-Minuten-Time-Stop**; Gebühren und modellierte Kosten | Positive, negative, Liquiditäts-/Datenlücken-Pfade und Rückblick-Verbote; weder Phantom-Fill noch künstlich erreichter Maximal-High-PnL. **Noch eigenständige reine Versuchsbibliothek**, nicht in Windows-Client/Runner-Trading integriert | Mit VORHER fixierten Regeln über zeitgerechte neutrale Holdout-Daten Gesamt-PnL inkl. späterer Rückläufer und realistischer Slippage vergleichen; keine Aktivierung vor Risikoverifizierung |
| **D5-04** | `src/v19-missed-opportunity-root-causes.mjs`, Runner archiviert `missed-opportunity-process-gaps.json`; **NOT_FOUND, TOO_LATE, NO_CONTRACT, NO_QUOTE, RISK, NO_GPT_BUDGET, NO_CASH, NO_FILL, EARLY_SELL** mit je konkreter Gegenmaßnahme. Trennung belegter Ursachen und bloßer Forschungs-/Datenlücken | Echte archivierte 409-Pool-Population ohne erfundene Gewinne/Verluste; NO_CASH, NO_FILL, NO_GPT_BUDGET oder EARLY_SELL benötigen ausdrücklich zugehörige authentifizierte Process-Belege | Unabhängige Outcome-/Dot-/Paper-Receipts und vollständiges neutrales Referenzuniversum; erst dann wirkliche **verpasste Chancen und ihre Ursachen** zuordnen |
| **QA-05** | `src/v19-prospective-holdout-freeze.mjs` speichert vor dem **nächsten tatsächlichen** Capture einmalige `research/state/prospective-holdout-freeze.json`, SHA-256-Regelfreeze (Basis v18 und separate Exit-Alternativen), **6h Purge + 24h Validation + 6h Purge + 24h Holdout**, unveränderte 50 TEST-USDC, keine automatische Dot-/Trading-Aktivierung; späterer Runner verwirft jede veränderte Freeze-Konfiguration | Zeitfenster, SHA-/Regelmanipulation, 65 Post-Event-Winner-Referenzen verboten, in der laufenden Research-Erfassung keine fiktiven GPT-Reviews oder Outcomes | Tatsächlich prospektive mehrere Erfassungs-/Reviewzyklen auf dem **zuvor eingefrorenen** zukünftigen Holdout, belastbarer negativer Nenner, keine Optimierung nach Holdout-Einsicht |

## 2. Nachweise und ursprüngliche Grenzwerte

**Aktuell verifizierter Node22-GitHub-Test:** [GitHub Actions #45055292351](https://github.com/127027/Sniperbot-/actions/runs/45055292351), Source-Commit `5dfa7634e31e809ca25cb0dbe8fa4441e0b3d2fb`, **553/553 PASS, 0 FAIL und TEST_ONLY_NO_SIGNAL_WRITE 0**.

Vollständige Quell-/Testpfade:
- `src/v19-chain-service-sla.mjs`, `test/v19-d105-chain-service-sla.test.mjs`
- `src/v19-paper-liquidity-sensitivity.mjs`, `test/v19-d306-paper-liquidity-sensitivity.test.mjs`
- `src/v19-exit-counterfactual.mjs`, `test/v19-d403-exit-counterfactual.test.mjs`
- `src/v19-missed-opportunity-root-causes.mjs`, `test/v19-d504-missed-opportunity-causes.test.mjs`
- `src/v19-prospective-holdout-freeze.mjs`, `test/v19-qa05-prospective-holdout-freeze.test.mjs`

**Wichtige Trennung:** 553 grüne Softwaretests sind weder 553 ausgeführte GPT-Tradingreviews noch echte Paper-Fills oder echte API-Chain-Coverage. Die bekannten 409 Pools sind archivierte Pools, keine 409 geprüften/handelbaren Coins. Das Nach-Dot2-/Risiko-/Kauf-System bleibt in mehreren entscheidenden Original-Aufgaben unvollständig. Die fünf ChatGPT-Dots bleiben deaktiviert. Originaler 429-Retry aus dem letzten vergangenen GitHub-HTTP-Aufruf war `2026-11-22T18:31:56.465Z` (UTC); neue Echt-Provider-Mehrläufe nach diesem neuen Code-Stand wurden in diesem Arbeitsschritt nicht gestartet.

## 3. Was vor echtem fortlaufendem Paper-Betrieb weiter fehlt

1. `SYS-11` + `QA-03` – mindestens zwei aufeinanderfolgende **echte** budgetierte Research-Captures und konservative, nachgewiesene 429-/Page-/Raw-SHA-Fortsetzung. Ein Plan oder Test-Simulation ist kein echtes Anbieter-SLA.
2. `D1-04` – tatsächlich zeitgesteuerte, vom GPT-Review-Takt unabhängige Preis- und offene Positionen überwachende Paper-Client-Prozesse; bisher nur Forschungsvorschläge.
3. `D3-02`, `D3-03`, `D3-04`, `D3-05` – echte Quotenzeit, Sellability, Risikopublisher-Authentizität. Niemals fehlende Safety-Evidenz durch angenommene HTTP-Zeit ersetzen.
4. `D4-03` + `QA-05` – erst nach ausreichend gereiften, nicht nach Gewinnern vorselektierten Holdout-Daten Exit-Regeln experimentell vergleichen; keine ungemessenen Verbesserungsversprechen.

**Keine Aktivierung der fünf Dots, keine Echtgeldkäufe, keine neuen Bots, keine Änderungen am originalen 5.000-TEST-USDC-Paper-Kontostand**. Der nächste Chat liest dieses Dokument zuerst und verwendet stets die ursprünglichen 61 Aufgaben-Abnahmesätze, nicht die bloße Zahl 70,5 % als Fertigstellungsbehauptung.
