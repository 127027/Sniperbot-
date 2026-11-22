# R29 V1.9 – SYS-09: Backtest-Forschungswallet darf das Paper-Konto nicht verändern

**22.11.2026 · Arbeitsbranch `codex/r29-cleanroom-paper-20261121` · COMPLETE (targeted).**

## Gemeinsames System, getrennte Zustandsspeicher

`src/point-in-time-strategy.mjs` verwendet im historischen Replay den bestehenden `src/core.mjs`-Paper-Simulationskern in einem **eigenen in-memory `newState()`** mit 5.000 TEST-USDC und 50 TEST-USDC je Coin. Das Replay öffnet `src/runner.mjs` nicht und stellt keine GitHub-Orders zu. LIVE_PAPER und HISTORICAL_ASOF bleiben dieselbe Entscheidungslogik, aber **nicht dasselbe Paper-Konto**.

`src/v19-replay-isolation.mjs` ist ein **rein lesender SHA-256-Snapshot-/Vergleichsprüfer**. Der existierende `scripts/v18-backtest-on-demand.mjs` nimmt vor und nach dem Replay Fingerabdrücke von `signals/index.json` und – **nur wenn auf der ausführenden Maschine vorhanden** – `R29_STATE_DIR/state.json` bzw. sonst `~/.r29-cleanpaper/state.json`. Es wird **keine** alte Datei angelegt, verändert oder überschrieben. Veränderungen an beliebigen Bytes blockieren das Forschungsergebnis mit `PROTECTED_PAPER_STATE_CHANGED_ABORT_REPORT`.

Das Skript schreibt ausschließlich **neu** nach `probe-artifacts/` und nutzt `flag:'wx'` (keine Überschreibung). Die Forschungsquittung `R29_V19_ISOLATED_RESEARCH_REPLAY_RECEIPT` hat eine `research-...`-Kennung und enthält ausdrücklich `simulation:true`, `actual_client_paper_fills:0`, `never_post_to_github_signals:true`. Das ist **niemals** eine echte Paper-Receipt. Der Befehl `--training-reference` bleibt gesonderte historische Evaluation, kein Marktsignal.

## Prüfungen und Gültigkeitsgrenzen

- `test/v19-replay-isolation.test.mjs`: echte temporäre Dateien, Vorher-/Nachher-SHA-256, versteckte Positionsänderung bei unverändertem Cash, nicht vorhandene Datei ohne Neuanlage, doppelte Schutzpfade, Forschungsquittung und statische CLI-Grenzen.
- **7/7 direkte Node-22-Prüfungen des identischen GitHub-Moduls bestanden**; tatsächlich berechneter Git-Blob-SHA1 `9ab05f7e863aff01823770fcf596784d1e8d7aa1`, exakt gleich dem GitHub-Datei-SHA. Die fünf zusätzlichen Node-Testfälle sind auf GitHub eingecheckt, **die vollständige npm-/Actions-Suite ist noch nicht nachgewiesen**.
- Der Vergleich kann nur Dateien prüfen, die auf dem ausführenden Rechner zugänglich sind. Eine GitHub-Actions-Maschine sieht das **Windows-Paper-Konto des Nutzers nicht** und darf deshalb **nicht** behaupten, dessen echte Dateien vor Ort ausgelesen zu haben. Auf Windows sollte die CLI vor und nach Test das lokale Konto einlesen, **nur lesend**.
- `src/runner.mjs` und `src/publisher.mjs` wurden wegen D3-04 zusätzlich mit einer **fail-closed** risk gate versehen: momentan sogar signierte, aber nicht extern belegte Sicherheitsdaten **können keinen echten Paper-Fill auslösen**. Der eigenständige historische Modelltest bleibt davon unabhängig und unverändert simuliert.

Keine Änderungen an `main`, Legacy, Echtgeld, vorhandenen `signals/orders` oder realem Paper-Guthaben; alle fünf Dots bleiben pausiert.
