# R29 V2.0 – tatsächlich implementierte isolierte 29-Stunden-Softwarediagnose
Stand 23.11.2026, 18:48 UTC. Ausschließlich Repo `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`. **KEIN** Original-QA-04, keine Echtgeld-/Paper-Order, keine Windows-Paper-Kontoänderung.

## 1. Technische Änderungen
- `src/v20-isolated-scenario.mjs` – reine In-Memory-Funktion `runV20IsolatedScenario` für **ausdrücklich synthetische** Fixed-Plan-Szenarien mit genau 5h Warmup (11.10., 19:00 UTC bis 12.10., 00:00 UTC) und 24 stündlichen Entscheidungstakten bis 13.10., 00:00 UTC. Keine Realmarkt-Evidenz behauptet.
- Sämtliche Quoten müssen `synthetic_fixture:true` tragen, eine gültige Chain/Contract/Pool-Identität besitzen und bereits zur virtuellen Stunde erfasst sein. Mindestens zwei verschiedene frische Quellen, unterschiedliche Originalbyte-SHA, maximal 3% Preisabweichung, Liquidität mindestens 5.000 TEST-USD und Positionsgrößenregel. Die Provenienzbooleans sind bei diesen Szenarien **nur Testassertionen**, keine unabhängigen Providerbeweise.
- Fixed-Testpläne müssen spätestens **vor dem Warmup** als Testpläne markiert sein; kein GPT-Autonomie- oder tatsächlicher Decision-Receipt wird erfunden. `BUY`, `SELL`, `HOLD`, gezielte Test-`NO_FILL`, 50 TEST-USDC pro Coin, max. 30 Positionen, keine Doppelposition für denselben Chain/Token in anderem Pool.
- Modellierte Ausführung verwendet Kosten aus `DEFAULT_POLICY`: 75 bps Fee je Seite, 40 bps Spread, zusätzliche Liquiditätsimpact-Schätzung. Jede Marktbeobachtung wird **erst ab der Original-Capturezeit der synthetischen Quelle** sichtbar; nachträgliche November-Captures sind für den Oktober-Test ausgeschlossen. Stop-Loss und Take-Profit können nur bei einem jeweils **frischen Zwei-Quellen-Nachweis zur stündlichen Uhrzeit** als Modell-Exit ausgeführt werden; sonst HOLD mit DATA_GAP. Weder Candle-Hoch/Tief zwischen Stunden noch fiktive End-of-Day-Liquidation werden als Fill gerechnet.
- `auditV20IsolatedScenario` gleicht Sequenzen, Gebühren, BUY-/SELL-Lots, negative/positive realisierte Modell-PnL und Endcash unabhängig vom Simulationspfad nach; manipulierte Rechnungen/angebliche Client-Fills werden abgelehnt.
- `scripts/v20-isolated-scenario-diagnostic.mjs` liefert ohne Parameter ein **echtes leeres Quellendaten-Diagnoseergebnis**; mit `--synthetic-fixture` eine ausschließlich künstliche, vorgegebene Modellrechnung. Beide Varianten greifen **niemals** auf API, GitHub-Signals, Broker oder Windows-Client zu.
- `test/v20-isolated-scenario.test.mjs`, `test/v20-isolated-scenario-cli.test.mjs`: 17 neue Regressionen für Causal-No-Future, BUY/SELL, Verlust, Gewinn, No-fill, Zero-Source, Providerduplikate, Pool-Liquidität, Plan/Oracle, gleiche Tokenadresse in anderen Pools, Lot- und Cash-Audit und echte Null-Order-Grenze.
- `package.json`: `npm run diagnose:v20` und `npm run diagnose:v20:synthetic`.
- `.github/workflows/cleanroom-v19-ci.yml`: Beide **synthetischen/nicht-empirischen** Softwarediagnosen laufen als read-only CI-Checks und werden als eigene Protokolle `probe-artifacts/v20-no-original-market-input.log`, `probe-artifacts/v20-synthetic-math-only.log` archiviert. Der normale CI führt **keinen originalen QA-04-Backtest** aus.

## 2. Originaler CI-Nachweis und tatsächlich ausgeführte Diagnose
[GitHub Actions #45242081198](https://github.com/127027/Sniperbot-/actions/runs/45242081198), Ergebnis **SUCCESS**, Node22, **819/819 Tests PASS, 0 FAIL**, `TEST_ONLY_NO_SIGNAL_WRITE 0`; [Paper-only CI #45242081114](https://github.com/127027/Sniperbot-/actions/runs/45242081114) ebenfalls SUCCESS.

Zwei tatsächlich in CI ausgeführte und archivierte reine Softwareläufe:

| Input | Warmup/Entscheidungen | Modell-BUY/SELL | Modell-Kapital | Echtes Handelsergebnis |
|---|---:|---:|---:|---|
| Kein zeitgerecht nachgewiesenes Oktober-Kursmaterial | 5h / 24h | 0 / 0 | 5.000 → 5.000 TEST-USDC | **UNBEKANNT**, 0 verifizierte Trades, `DATA_GAP_NO_ORIGINAL_OCTOBER_QUOTE_INPUT` |
| Explizit synthetische Zwei-Quellen-Fixture (Testpreise 1,00 → 1,50) | 5h / 24h | 1 / 1 | 5.000 → 5.023,24502994 TEST-USDC | **KEINES**. +23,24502994 TEST-USDC ist nur deterministisches Rechenbeispiel nach modellierten Gebühren/Impact. Keine tatsächlich verfügbare Oktober-Marktquote. |

Beide Reports: `internal_synthetic_ledger_audit=SYNTHETIC_MODEL_LEDGER_RECONCILED_NOT_REAL_FILLS`, `real_market_profit_estimate=null`, `real_historical_trades_verified=0`, `real_gpt_reviews_verified=0`, `order_writes=0`, `original_qa04_approved=false`.

**Wichtig:** 819 grüne Softwaretests dürfen **nicht** als 819 authentifizierte GPT-Reviews oder als 100% Markt-/QA-04-Abnahme bezeichnet werden.

## 3. Ehrlicher noch offener Originalstatus
Die strenge 61er-Ursprungsliste wurde **nicht** künstlich verändert: **13 PASS, 46 PARTIAL, 2 OPEN**, davon **13/60 = 21,67%** der Nicht-Backtest-Aufgaben vollständig originalabgenommen. Quasi vollständig *technisch bearbeitet* ist nicht *fachlich geprüft*. Das formelle Gate meldet weiterhin `NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE` mit acht Beweisblöcken:
1. `NON_BACKTEST_ORIGINAL_TASK_ACCEPTANCE`
2. `PROSPECTIVE_HOLDOUT` (läuft bis frühestens 25.11.2026 06:54 UTC)
3. `ORIGINAL_OCTOBER_MARKET_POPULATION`
4. `PROSPECTIVE_HOLDOUT_OUTCOMES`
5. `DOT3_INDEPENDENT_ISSUER_AND_QUOTE`
6. `DOT3_CHAIN_SELLABILITY`
7. `FIVE_DOT_GPT_JOURNALS`
8. `WINDOWS_CLIENT_END_TO_END`

Darüber hinaus ist ein **echter autonomer fünf-GPT-Dot-Signalpfad mit verifizierten Eingangsquellen** weiterhin kein Teil dieses synthetischen Tests. Fünf echte GPT-Reviews sind nicht durch statische Tests oder virtuelle Rollen ersetzbar.

## 4. Nächste technisch/fachlich notwendige Umsetzung
1. Die bestehenden v19-Five-Dot-Journale auf aktuelle Original-SHA, echte zeitgerechte Quoten und unabhängige GPT-Ausführungs-Receipts prüfen; fehlende Quittungen niemals aus Zeitplänen rekonstruieren.
2. Ein neutrales, nicht gewinnerselektiertes historisches Oktoberuniversum mit Original-**damaligem** Capture-/Verfügbarkeitsnachweis finden; falls nicht vorhanden, `NO_REAL_HISTORICAL_RESULT`.
3. D3-04/D3-05 unabhängig belegen; Token-2022 / Solana und andere Chain-spezifische Sellability nur als vollständig geprüften Bot-Exit werten, nicht allein aus Verkäufen anderer Teilnehmer.
4. Prospektiven Holdout nach Fensterende inkl. negativer Kohorte und Quellenreife ohne nachträgliches Parametertuning evaluieren.
5. Tatsächliche Windows-State-Prüfung **nur lokal und read-only** (siehe `docs/V19_PREBACKTEST_60_OF_60_RELEASE_GATE_20261122.md`) und echte Paper-Client-Receipts nachvollziehbar herstellen. Original-QA-04 bleibt bis dahin gesperrt.

## 5. Genaue reproduzierbare Befehle
```bash
npm test
npm run diagnose:v20
npm run diagnose:v20:synthetic
```
Alle drei Befehle sind Software-/Fixtureprüfungen; **keine** Echtgeldaktion, kein tatsächlicher GPT-/API-/Windows-Trade, keine nachträgliche Umdeklaration Oktoberfrüher Quellen.
