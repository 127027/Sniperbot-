# R29 V1.9 – QA-06: Code- und Regressionstests, keine Bots

**Stand 22.11.2026 · Status: IN PROGRESS, NICHT abgeschlossen.** Branch `codex/r29-cleanroom-paper-20261121`.

## GitHub-Workflow

`.github/workflows/cleanroom-v19-ci.yml` wurde auf dem isolierten Branch eingecheckt. Er ist ausdrücklich **kein Dot** und **keine Handelsautomation**:

- `push` nur auf `codex/r29-cleanroom-paper-20261121` und nur für geänderte `src/**`, `test/**`, `scripts/**`, `research/config/**`, `package.json` oder die Workflowdatei selbst; optional `workflow_dispatch`.
- `permissions: contents: read`; Checkout mit `persist-credentials:false`, Node 22.
- `node --check` für den Paper-Kern, den Runner, Dashboard/Monitor, Dot3-Trust-Gate, Exit-Konvergenz und On-Demand-Replay.
- `npm test` führt die komplette im Repository konfigurierte Node-Test-Suite `test/*.test.mjs` aus.
- abschließende reine Prüfung, dass `signals/index.json`, `signals/orders` und `signals/receipts` im Checkout nicht geändert wurden.
- Keine API-Keys/Wallet-Secrets, keine Trainings-/GPT-/Dot-Aufrufe, kein `src/runner.mjs`-Start, kein Publisher, keine neuen Orders und keine Echtgeldtransaktionen.

## Abnahmegrenzen und Status

Ein commitierter Workflow ist **KEIN erfolgreiches CI-Ergebnis**. Für Commit `fbc6f0f2a551203c0d32d5c6738830d5d6971d4e` lieferte die über den GitHub-Connector verfügbare Commit-Statusabfrage `statuses:[]`; eine weitere Query zeigte null PR-ausgelöste Läufe, unterstützt aber keine vollständige Aussage über alle Push-Läufe. Daher ist weder ein PASS noch ein FAIL der kompletten Node-/Actions-Suite bestätigt.

**QA-06 bleibt OFFEN**, bis ein tatsächlicher abgeschlossener GitHub-Actions-Run einschließlich Job-/Schritt-Logs und grünem `npm test` nachgewiesen wurde und ggf. gefundene Fehler behoben wurden. Eventuell nötige Testkorrekturen sind **nicht** durch stillschweigende Änderungen am Modell oder Einschränkung der Tests zu erschleichen.

Die bereits separat gezielt getesteten Module bleiben `COMPLETE (targeted)` nach dem V1.9-Aufgabenmaßstab, nicht vollständig CI-abgenommen. Nutzer-Windows-Paper-Dateien sind GitHub-Actions nicht zugänglich, unabhängig davon, ob der CI-Workflow später grün ist.

**Aktueller V1.9-Zähler: 22/61 = 36,1 %, 39 offen.**
