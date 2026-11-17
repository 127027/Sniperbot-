# Sniperbot R29 – Neuester 60-Tage-Backtest: Restart mit GPT-verfasster Forschungsstrategie

**Stichtag:** 17.11.2026. **Auswertung wirklich als GitHub Actions erfolgreich ausgeführt:** https://github.com/127027/Sniperbot-/actions/runs/44040656066
**Original-Artefakt dieses erneuten Laufs:** https://github.com/127027/Sniperbot-/actions/runs/44040656066/artifacts/14308549593

**Präzise Bezeichnung:** Rückwirkende 60-Tage-Auswertung einer am 17.11.2026 von GPT **formulierten, danach automatisiert ausgeführten Research-Policy**. Der historische GPT-BUY/HOLD/SELL-DEX-Blindtest ist **nicht** vollständig nachgewiesen. Diese Unterscheidung ist wichtig: Eine durch GPT verfasste Strategie und ihre reproduzierbare Programmausführung ist nicht dasselbe wie Hunderte individuell belegte GPT-Modellentscheidungen an virtuellen Entscheidungspunkten.

## 1. Eingaben und zeitlich korrekter Ablauf

- Handelstest-Tage: **18.09.–16.11.2026**, insgesamt 60 Tage.
- Echte archivierte neutrale Pump.fun-Frühbeobachtungen in **43 Tagen** (24.09.–05.11.), insgesamt **1.032 historische Stundenframes** aus 5.645.886 verifizierten Feature-Rohzeilen und 8.256 neutral zeitlich sortierten Coin-Beobachtungen.
- Die 17 Tage ohne frühe Minutenfeatures bleiben **DATA_GAP / UNKNOWN**, ausdrücklich **nicht** modellseitige NO_TRADE-Tage.
- Quelldateien und ihre Roh-Parquet-Hashes: `research/replay-120d-real/results/REAL_60_DAY_EVIDENCE_MATRIX_43D_2026-11-16.csv`. Originalartefakt: Run 43944372099, Artifact 14265305978. Dieser historische Featuresatz hat einen dokumentierten nicht-zufälligen Selektionsbias.
- Die neue `gpt-authored-60d-policy-proxy.mjs` nutzt pro virtuellem Zeitpunkt nur bis dahin sichtbare Daten und plant abhängig von der bisherigen Stundenaktivität **1/4/12/24** mögliche Scans pro Tag. Keine Verwendung von spätere Spitzenpreise, Rug-/Graduation-Outcomes oder rückblickend bekannten Gewinnerlisten.
- Beim ersten unabhängigen GitHub Actions Replay am 17.11.2026 wurden Tests und die Neuberechnung aus dem Original-Artefakt vollständig **erfolgreich** abgeschlossen.

## 2. Das echte Ergebnis der neuen Forschungs-Policy

| Nachweis / Zahl | Ergebnis |
|---|---:|
| Vollständige Tageszeilen im Bericht | **60 / 60** |
| Tage mit historischen Minuteneingaben | **43 / 60** |
| Fehlende historische Minuten-Tage | **17 / 60** |
| Historische Stundenframes mit Quelle | **1.032** |
| Tatsächlich erneut berechnete historische Policy-Proxy-Scans | **513** |
| Scans mit mindestens einem enger beobachtenswerten Coin | **9** |
| Frühkandidaten-Ablehnungen nach Warnfiltern in den ausgewerteten Scans | **3.575** |
| Originäre GPT-Modellaufrufe am damaligen historischen Datum | **0 nachgewiesen** |
| Nachweisbare historische GPT-BUY-Fills | **0** |
| Nachweisbare historische GPT-HOLD-Aktionen auf bestätigten Positionen | **0** |
| Nachweisbare historische GPT-SELL-Fills | **0** |
| Belastbarer 60-Tage-GPT-DEX-PnL | **UNBEKANNT** |

**Vorsicht:** 3.575 geblockte Frühkandidaten sind keine 3.575 bewiesenen vermiedenen Verlusttrades. Neun WATCH-Scans sind keine neun guten Kaufsignale. Null belegte Trades ist **keine Aussage**, dass GPT alle schlechten Trades erfolgreich erkannt hätte; die historische Handelbarkeit ist unzureichend dokumentiert.

**Die vollständige dauerhafte 60-Tage-Tagesübersicht im Repo:** `research/replay-120d-real/results/R29_60D_GPT_POLICY_PROXY_DAILY_CI_20261117.csv`. Die **513 Einzel-Scans** mit virtuellem UTC-Zeitpunkt, Scanrate und den jeweils relevantesten WATCH-Kandidaten sind als originales GitHub Actions Artefakt unter obigem Link verfügbar.

## 3. Was GPT entschieden hat – und was bisher nicht erkennbar ist

Die eingefrorene GPT-verfasste Forschungs-Policy wertet frühe Wallet-/Buy-/Creator- und Insidermerkmale aus, verwirft belegte frühere Rug-Creator, Creator-Verkäufe, bekannte Bundles, riskante Konzentrationen und frühere Rug-Häufigkeiten, und gibt höchstens `WATCH_NO_ORDER_EXECUTION_UNPROVEN` aus, solange ein tragfähiger unabhängiger historischer DEX-Security- und Quotenachweis fehlt. Der angezeigte 0–100-Forschungs-Score ist **keine mathematisch kalibrierte Wahrscheinlichkeit** für eine Kursexplosion.

Dieser 60-Tage-Lauf **beweist ausdrücklich nicht**, dass die aktuelle Version des GPT einen neuen Coin an einem einzelnen früheren Scan entdeckt, tatsächlich für 50–5.000 TEST-USDC gekauft, danach über mehrere Wochen gehalten und zum geeigneten Zeitpunkt verkauft hätte. Solche Aussagen wären ohne tatsächlich rekonstruierte historische Poolreserven, unabhängige bidirektionale Quotes, Gebühren/Slippage und zeitgebundene GPT-Entscheidungsprotokolle erfunden.

## 4. Verlustreduktion – getrennt vom ausführenden Bot

Die vorläufigen, durch das vorliegende Sample inspirierten Forschungshypothesen sind **nur** im Bot-Projektgedächtnis unter
`research/r29/gpt-strategy/experiences/2026-11-17/60d-gpt-policy-loss-filter-hypotheses-v1.md`
gespeichert. **Nicht** in die lokale aktive Risiko-/Order-Policy kopiert, da kein unabhängiger PnL-Nachweis ihrer Verbesserung existiert.

Ein hypothetischer fester Forschungsbetrag bei einem WATCH-Kandidaten ist **kein Kauf**. Die Unterscheidung von GPT-Strategieentscheidungen und Bot-Ausführung bleibt strikt: Bot selektiert niemals autonom Coins.

## 5. Nächste unabhängig notwendige Belege

1. Authentische historische Pool-/Reserve- und Mint-/Freeze-/Verkaufbarkeitsnachweise für eine **vorab neutral** ausgewählte Stichprobe, beginnend mit den vollständig archivierten 48 Mints vom 15.10.2026.
2. Zum virtuellen Zeitpunkt tatsächlich ausführbar abschätzbare **BUY- und spätere SELL-Quotes**, mit USDC-Konversion, Spread, Gebühren, Slippage und LP-Rückzug.
3. Historisch begrenzte GPT-Transkripte explizit mit **heutigem** tatsächlichen Modell-Ausführungsdatum und separatem virtuellem Datum, für BUY/WATCH/HOLD/SELL/NO_TRADE; später die tatsächlichen Outcomes ohne Zukunftswissen in vorherige Frames zurückzugeben.
4. PnL erst nach realistisch simulierbaren Fills und offen ausgewiesenen fehlenden Tagen. Entwicklungstuning auf denselben 43 Tagen gilt als **in-sample**, nicht als verlässliche Renditeverbesserung.
5. Benutzer nur bei notwendigem kostenpflichtigem Datenzugang/neuen Berechtigungen befragen. Die einzige stündliche R29-Automation ist ab 17.11.2026 ausdrücklich auf **Backtest-only** priorisiert, nicht auf neue Live-Kaufaufträge.

**Sperren:** PAPER_ONLY, Echtgeld deaktiviert. Dieser Replay hat das bestehende Laptop-Paper-Ledger nicht verändert und keinen BUY-Pointer veröffentlicht.
