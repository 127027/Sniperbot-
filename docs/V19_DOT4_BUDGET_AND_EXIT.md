# R29 V1.9 – D4-07 Shared Budget (gezielt abgeschlossen), D4-08 Safe Exit (teilweise)

**Stand:** 22.11.2026. Branch **`codex/r29-cleanroom-paper-20261121`**. Ausschließlich PAPER/SHADOW, keine Dot-Reaktivierung.

## D4-07 – Gemeinsames Budget und Positionsinventar – COMPLETE (targeted)

Die **einzige**, versionsgebundene Konfiguration ist `research/config/paper-budget-v19.json`:

```json
{
  "schema": 1,
  "kind": "R29_V19_SHARED_PAPER_BUDGET",
  "initial_test_usdc": 5000,
  "stake_per_coin_test_usdc": 50,
  "max_open_positions": 30
}
```

- `src/v19-paper-budget-policy.mjs` validiert diese drei Werte, lehnt zusätzliche nicht freigegebene Risikoparameter ab und berechnet dieselbe versionsbezogene `policy_id` in **Live-Paper und HISTORICAL_ASOF**.
- `src/runner.mjs` lädt die Datei beim Start aus dem lokalen Checkout; fehlt sie in einem alten Checkout, bleibt der bisherige Standard **5.000/50/30** gültig. Ein **bestehendes** Konto wird ausdrücklich **nicht** mit dem `initial_test_usdc`-Wert zurückgesetzt. Guthaben, offene Positionen, frühere Quittungen und Handelsjournal bleiben erhalten. Ein geänderter GitHub-Wert wird erst nach Übernahme in die lokale Datei und Neustart des Runners wirksam; es gibt keinen automatischen UI-Sync.
- `scripts/v18-backtest-on-demand.mjs` lädt dieselbe Datei aus dem Checkout und übergibt sie an `src/v18-requested-backtest.mjs`, `src/point-in-time-strategy.mjs` und `src/v18-shared-evidence-gate.mjs`. Der Forschungs-Backtest verwendet sein **separates In-Memory-Konto** (SYS-09). `src/v18-dot4-live-decision.mjs` nimmt dieselbe Einstellung als expliziten Parameter.
- `src/core.mjs` lehnt einen erneuten BUY desselben Tokens auf derselben Chain auch über einen **anderen Pool oder EVM-Schreibweise** ab, berücksichtigt bisherige Cash-/maxPositions-/Liquiditäts-Checks und schreibt eine chronologische `trade_history` nach jedem Modell-Fill. Bereits gespeicherte `processed`- und `receipts`-Einträge werden nicht überschrieben. Historische ältere Schema-1-States ohne `trade_history` werden beim nächsten zulässigen neuen Fill kompatibel ergänzt.
- `src/core.mjs` akzeptiert bei SELL optional `exit_position_source_order_id` und blockiert bei abweichender Eröffnungs-BUY-ID. Für **neue externe/prospektive SELL-Aufträge** verlangen `src/publisher.mjs` und `src/runner.mjs` dieses Feld verpflichtend. Für ältere isolierte Replay-Datensätze bleibt die direkte Core-Funktion rückwärtskompatibel.

**Gezielte Prüfungen:** 9/9 Portfoliokontrollen, 8/8 Budgetkonfigurations-Kontrollen, 11/11 integrierte Live-/Backtest-Vergleiche in einer isolierten V8-Funktionsausführung bestanden. Im Vergleichsszenario erzeugten Live-Dot4 und historischer Replay bei identischen zeitgerechten synthetischen Daten dieselbe BUY-Begründung, 100 TEST-USDC Einsatz und 2.000 TEST-USDC Startkapital. **0 reale Orders/Fills**. Eingereichte Node-Regressionsdateien: `test/v19-paper-lot-identity.test.mjs` (7 Testfälle), `test/v19-shared-paper-budget.test.mjs` (6), `test/v19-live-backtest-budget-parity.test.mjs` (2). **Diese vollständige Node-Testdatei-/CI-Ausführung ist noch nicht nachgewiesen.** D4-07 ist ausdrücklich `COMPLETE (targeted)`, nicht vollständige End-to-End- oder UI-Abnahme. Eine interaktive Budgetänderung auf der lokalen Oberfläche ist noch kein Teil dieser Aufgabe; zurzeit wird die versionierte JSON-Datei geändert.

## D4-08 – Sicherer SELL-Pfad – TEILIMPLEMENTIERT, NICHT zum Zähler addieren

- `src/v19-paper-exit-convergence.mjs` erstellt **nur lesend** eine positions- und lot-gebundene Exit-Absicht. Gleichzeitig eingehende `PROTECTIVE_STOP` und `DOT4_SELL` werden zur **einen** `exit-...`-ID zusammengeführt. Jeder Vorschlag wird über **denselben** `src/protective-exit.mjs`-Prüfer und `src/unified-decision-v18.mjs`-Signalalgorithmus neu bewertet; ein von außen behaupteter STOP/SELL ist allein kein Beleg.
- Schließt ein Modell-SELL eine Position, darf ein zweiter STOP nicht noch einmal Cash gutschreiben. Ein veralteter SELL zu einem früheren BUY-Lot darf niemals eine wiedereröffnete Position desselben Pools schließen. `src/core.mjs` nutzt persistierte `sourceOrderId`, `processed`, `receipts` und `trade_history`.
- Das Modell zeichnet `SHADOW_EXIT_CANDIDATE`, `SHADOW_HOLD` oder `EXIT_RECHECK_REQUIRED` auf. Die konservative Liquiditäts-/Slippage-Abschätzung im vorhandenen `src/protective-exit.mjs` bleibt **nur Research**: nicht unabhängige Providerquotes, nicht nachgewiesene ausführbare DEX-Route.
- `auditSingleExitReceipt` prüft, ob ein **isoliert modellierter** Core-Receipt zu einem einzigen Verkaufs-Lot passt, meldet aber ausdrücklich `independently_authenticated_client_receipt:false`. Kein Phantom-Receipt und keine autorisierte Order.
- **7/7 gezielte Exit-Zusammenführungs-Kontrollen** in isoliertem Funktionslauf bestanden. Eingereichte Node-Regression `test/v19-paper-exit-convergence.test.mjs` (5 Tests), ebenfalls noch ohne bestätigtes gesamtes Node-/Actions-Ergebnis.

**Kritischer offener Punkt:** `src/v19-dot3-authenticated-gate.mjs` blockiert derzeit **neue BUY UND SELL**, da die unabhängigen Daten-/Issuer-/Sellability-Beweise fehlen. Die Exit-Absicht darf diese Sperre nicht umgehen. Deshalb D4-08 **NICHT abgeschlossen**, solange der echte Publisher → GitHub → Windows-Client → einmaliger Receipt-Status mit authentischen Quellen nicht erfolgreich end-to-end abgenommen ist. Eventuell vorhandene offene Paper-Positionen bleiben bis zur separat geprüften sicheren Exit-Freigabe unter der aktuellen Fail-Closed-Sperre.

## Neue Chat-Übergabe

1. `AGENTS.md`, `docs/R29_NEXT_CHAT_HANDOFF.md`, `docs/V19_IMPLEMENTATION_PROGRESS.md` und diese Datei live von GitHub lesen.
2. Gesamtstand nach D4-07 **21/61 = 34,4 %**, 40 offen. D4-08, D3-04/D3-05 und vollständige Node-/Actions-Abnahme **OFFEN**.
3. Niemals `main`, Legacy, Echtgeld, existierende lokale Paper-Dateien oder die pausierten fünf Dots verändern. Keine simulierten Modell-Fills als echte GPT-/Paper-Trades bezeichnen.
