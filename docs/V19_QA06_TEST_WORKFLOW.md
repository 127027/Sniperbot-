# R29 V1.9 – QA-06: GitHub-Actions-/Node-Abnahme

**22.11.2026 · Status: COMPLETE (targeted) nach belegtem GitHub-Actions-Lauf.**
**Arbeitsbranch:** `codex/r29-cleanroom-paper-20261121`. Keine Echtgeld-/Handelsfreigabe durch diesen Status.

## Tatsächlich geprüfte Ergebnisse

### Ursprüngliche reale Fehlersituation

Der echte GitHub-Actions-Lauf **45035923332** (22.11.2026 15:01 UTC) führte **395 Node-Tests** aus, davon **393 PASS / 2 FAIL**. Detaillierte tatsächliche Job-Logs bestätigten die beiden Ursachen:

1. `test/point-in-time-strategy.test.mjs`: Erwartet wurde der ältere Sammelgrund `FUTURE_OR_UNVERIFIED_ARCHIVE`. Die inzwischen vorgeschaltete strengere `classifyAsOfEvidence`-Prüfung verweigerte denselben spät archivierten Input korrekt als `ASOF_NOT_YET_AVAILABLE_AT_VIRTUAL_TIME`.
2. `test/v19-dot3-authenticated-gate.test.mjs`: Ein veränderter Risk-Pointer wurde inzwischen schon an der früheren GitHub-Blob-Identitätsprüfung als `GITHUB_BLOB_IDENTITY_MISMATCH` abgefangen. Erst nach übereinstimmend präsentiertem Blob scheitert er zusätzlich am unterschriebenen `BINDING_ORDER_OR_COIN_MISMATCH`.

**Nur die veralteten Testerwartungen wurden berichtigt** (Commits `5609759fb0f792d1ac1723edb28d7e78502887b7`, `c63689834bb4d36a4125b30989e487135685666a`). Der zweite Test prüft jetzt **beide fail-closed-Stufen**. Sicherheitsgates, Echtgeldsperren, Positionsbedingungen und Produktlogik wurden zur Erreichung des PASS nicht abgeschwächt.

### Erfolgreicher Original-CI-Nachweis

- **GitHub-Run:** [R29 V1.9 Cleanroom Tests Only #45036620227](https://github.com/127027/Sniperbot-/actions/runs/45036620227)
- **Quelle:** Git-Commit `c63689834bb4d36a4125b30989e487135685666a`
- **Job:** `local-model-regression` / GitHub-Job-ID `137251707121`
- **Ergebnis:** `completed / success`; Syntaxprüfung, `npm test` und Order-/Signalindex-Schutzprüfung jeweils `success`.
- **Tatsächliche Node-Ausgabe:** **395 Tests, 395 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED**.
- **Schutz:** `TEST_ONLY_NO_SIGNAL_WRITE 0`; Workflow mit `permissions: contents: read` und `persist-credentials: false`, kein Paper-Runner/Publisher/Handel.

- **Zusätzlicher reproduzierbarer CI-Beweis mit herunterladbarem Artefakt:** [Run #45036848094](https://github.com/127027/Sniperbot-/actions/runs/45036848094) · Git-Commit `6e2be6d6af32a3be3fd4ca3a52ed52bab086b131` · Job `137252396522` · alle Schritte `success` · **395/395 PASS**, `TEST_ONLY_NO_SIGNAL_WRITE 0`.
- **GitHub-Actions-Artefakt:** `r29-v19-node-tests-45036848094`, Artifact-ID **14759732706**, sha256 `5802a2c3161e3d7053304bb6159779641cb764c78489529e1935c74fef4fd549`, gültig bis **22.12.2026**. Enthält tatsächliches Testprotokoll `v19-node-tests.tap` und `v19-node-ci-receipt.json` mit Quell-Commit/Run-ID/Testzählung.
- **Zusätzlicher alter Cleanroom-Testworkflow:** `R29 Cleanroom Paper Tests` #45036620169 erreichte nach den zwei Testkorrekturen ebenfalls `completed / success` (ein anderer Workflow mit zusätzlichen historischen Forschungsprüfungen). Nachvollziehbare Run-IDs statt Schätzungen verwenden.

## Umfang und klare Grenzen

QA-06 zählt nur für den **belegten Node-22-CI-Lauf, die dazugehörigen Actions-Logs, den unveränderlichen Quellcommit und das archivierte CI-Testartefakt**. Sie zählt **NICHT** als reale Paper-Handelsfreigabe oder als Nachweis, dass die pausierten Dots eigenständig Analyse- oder Orderbelege publiziert hätten. Der gerade neu ausgelöste Dot2-Sechs-Chain-Capture ist ein **separater** Run (#45036887325), kein Teil des zuvor bestandenen 395-Test-CI. Neue Änderungen benötigen ihre eigenen neuen CI-Runs und dürfen nicht mit einem früheren grünen Commit verwechselt werden.

Insbesondere noch offen: D3-04/05 (authentischer unabhängiger Issuer-/Sellability-/Provider-Nachweis), D4-08 (ausgeführte SELL-/Client-Receipt-Kette), D2-01 (echte, vollständige sechs Chains im Fünf-Stunden-Ziel). Die Nutzer-Windows-Paper-Dateien waren für CI nicht zugänglich und wurden nicht verändert. Keine Echtgeld-Transaktionen.

**V1.9-Aufgabenzähler nach QA-06: 25/61 = 41,0 %, 36 offen.**
