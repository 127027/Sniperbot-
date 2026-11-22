# R29 – Umbau-Freigabe V1.9: 60/60 vor dem abschließenden Backtest

**Stichtag:** 22.11.2026 · **Repo:** `127027/Sniperbot-` · **Branch ausschließlich:** `codex/r29-cleanroom-paper-20261121`.

## 1. Präzise Bedeutung von 100 % – kein Zirkelschluss

In der **ursprünglichen** 61-Aufgaben-Liste ist `QA-04` der abschließende echte 29h-End-to-End-Backtest. Diese Aufgabe kann logisch **erst nach** der Ausführung des vom Nutzer abschließend freigegebenen Backtests PASS bekommen. Darum lautet die verbindliche, technisch umgesetzte Abnahmereihenfolge:

1. **Alle 60 anderen Originalaufgaben (ohne `QA-04`) haben 60 echte PASS**, jede mit dem passenden Originalabnahmebeleg (nicht nur Testcode).
2. **Auch die separaten unverzichtbaren Evidenzgates** sind unabhängig verifiziert: neutrales originales historisches Marktuniversum und gereifte Prospektivdaten mit Nichtgewinnern; vertrauenswürdige Quell-/Issuer- und Quotezeitprüfung; tatsächlich überprüfbare Chain-spezifische Sellability; alle fünf echten GPT-Review-Journale; echte lokale Windows-Paper-Client-Quittungen.
3. Erst **dann** darf der finale, zeitgerecht quellenreine Backtest auf demselben Cleanroom ausgeführt werden.
4. Die echte Backtest-Abnahme kann daraufhin `QA-04` als 61. Aufgabe PASS bestätigen – **niemals vorher**, nie aus künstlich profitablen Modellreplays.

Aktuell **13/60 Nicht-Backtest-Aufgaben PASS (21,67 % vollständig)**; die **anderen 47 Nicht-Backtest-Aufgaben** bleiben 45 PARTIAL und 2 OPEN. Zusätzlich bleibt `QA-04` PARTIAL. Für das Gesamtprojekt: **13 PASS, 46 PARTIAL, 2 OPEN**, also 13/61 = 21,31 % vollständig und 59/61 = 96,72 % lediglich technisch bearbeitet. Die Aussage „noch 3–10 % und alles fertig“ wäre als **Vollabnahme unzutreffend**.

## 2. Tatsächlich neu implementierte, ausführbare Voraussetzungen

### A. Unabhängiger, schreibgeschützter Windows-Paper-Kontocheck

- **`src/v19-local-client-readonly-proof.mjs`** liest ausschließlich bereits als Bytes übergebene Paper-State-Dateien; prüft Start-/Restbestand, tatsächliche in `state.json` gespeicherte `PAPER_FILLED` vs `PAPER_REJECTED`-Quittungen, eindeutige Sequenzen und Trade-Events, Einstand-/Restlots und dieselbe Chain/Contract/Pool-Identität, doppelte oder verschobene SELLs, Gebühren-/Verlust- und Cash-Summen.
- **Wichtig:** Ein negativer realisierter P&L ist ein **zulässiger Verlust**, kein korruptes Konto. Er wird korrekt als endlicher negativer Betrag mit Kassenbuch/Einstand abgeglichen.
- **`scripts/v19-readonly-windows-paper-proof.mjs`** liest auf dem Windows-Rechner die existierende Datei standardmäßig aus `%USERPROFILE%\.r29-cleanpaper\state.json` oder aus explizitem `--state`. Es erstellt keine Datei bei fehlendem Konto, startet keinen Bot, verändert kein TEST-USDC, liest keinen Wallet-Key, sendet nichts nach GitHub und druckt nur gekürzte Hash-/Buchhaltungsdaten auf dem lokalen Bildschirm.
- Für die selbst ausgeführte Prüfung im lokalen Cleanroom-Repository (Windows PowerShell) gilt:

  ```powershell
  node .\scripts\v19-readonly-windows-paper-proof.mjs
  ```

  Bei abweichendem State-Pfad:

  ```powershell
  node .\scripts\v19-readonly-windows-paper-proof.mjs --state "C:\Pfad\zum\bestehenden\state.json"
  ```

- Diese Funktion ist **im GitHub-CI nur mit künstlichen in-process Zuständen getestet** und kann die lokale Windows-Datei aus GitHub **NICHT** eigenständig lesen. Ein lokal gutes Ergebnis ist ein Nachweis interner Paper-Konsistenz, **kein externer Broker- oder Blockchain-Fill**.

### B. Tatsächliches 60-Aufgaben-Release-Gate vor jedem Backtest

- **`src/v19-original-acceptance-release-gate.mjs`** prüft alle 61 Original-IDs auf Katalog-/Zähler-Gleichheit und zählt die 60 Nicht-Backtest-Aufgaben getrennt. Es kann weder über `PASS + PARTIAL` noch über gefälschte `61 PASS`-Strings Paper-/Sellability-/Originalmarktbelege als vorhanden ausgeben.
- **`scripts/v19-verify-100pct-before-backtest.mjs`** erzeugt ausschließlich ein read-only `probe-artifacts/v19-61-original-tasks-prebacktest-gate.json` und meldet alle aktuell fehlenden externen Evidenzgates. Mit `--require-ready` **verweigert es die Freigabe per Exitcode 3**, solange Originalbelege fehlen.
- Der neue Pflichtschritt ist **vor** den Backtest-/Replay-Befehlen in allen relevanten GitHub-Workflows integriert:
  - `.github/workflows/cleanroom-v19-explicit-offline-request.yml`
  - `.github/workflows/cleanroom-v19-manual-backtest.yml`
  - `.github/workflows/cleanroom-tests.yml` vor jedem manuellen `run_training_replays=true`
- Der normale source-only CI-Lauf prüft die Gate-Ausgabe mit **Exitcode 0** und archiviert die tatsächlichen Blocker, sodass Änderungen an Research, Risiko, API oder Tests weiterhin erlaubt sind. **Ein historischer Backtest wird beim regulären CI niemals gestartet**.
- Heute erwartet: `readiness=NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE`, `release_authorized=false`, `allow_backtest_run=false` und der echte ursprüngliche Stand 13 PASS/46 PARTIAL/2 OPEN. **Eine erfundene Liste mit 60 oder 61 PASS würde den unabhängigen Quellen-/Sicherheitsnachweis nicht erfüllen**. Das Gate wird nicht abgeschaltet, um einen grünen Backtest zu erzwingen.

## 3. Verbleibende externe und zeitgebundene Blocker

- Die echten Originalinformationen zum **Oktober-29h-Fenster** sind weiterhin nicht als vollständige unselektierte, zeitgerecht authentifizierte Marktkohorte nachgewiesen. Nov-2026-API-Rawdaten bleiben November-Belege, kein zeitgerechter Oktober-Einstieg.
- Der schon **am 22.11.2026 eingefrorene Prospektiv-Holdout** endet erst am **25.11.2026, 06:54 UTC**. Auch danach braucht es tatsächlich vollständige positive UND negative Outcome-Reihen und 1-/3-/6h-Labels samt ohne Hindsight gefrorenem Parameterstand.
- `D3-04` verlangt **unabhängig vertrauenswürdige** Chain/Pool-/Issuer- und Quotezeitbelege, nicht nur ein gültiges eigenes Ed25519-Paket oder einen selbstberichteten SHA.
- `D3-05` verlangt **belastbare Onchain-Sellability** inklusive realistischen 50-TEST-USDC-Exit-Routes, Taxes/Blacklist/Honeypot auf den unterstützten Chains. Die bisher einzige öffentliche Honeypot-Rohprobe lieferte HTTP404 und muss DATA_GAP bleiben.
- Authentifizierte fünf GPT-Dot-Journale im bestehenden GitHub-Austauschkanal, Quell-/Risiko-/Entscheidungsbezüge und tatsächlich lokal geprüfte Windows-Client-Fill-Quittungen fehlen für die vollständige Endabnahme noch.

## 4. Originaldokumente

- `docs/V19_PREBACKTEST_ALL_NONBACKTEST_WORK_STATUS_20261122.md` – bestätigte API-/Fünf-Dot-/CI-/Onchain-Research-Bestandsaufnahme
- `docs/V19_46_PARTIAL_ACCEPTANCE_AND_NEXT_BACKTEST_PLAN_20261122.md` – jedes Originalkriterium mit einzelner noch fehlender Evidenz
- `research/audits/2026-11-22/r29-v19-offline-61-task-reconciliation.json` – 61 ID-genaue PASS/PARTIAL/OPEN-Stände
- `AGENTS.md` und `docs/R29_NEXT_CHAT_HANDOFF.md` – aktuelle technische Handoffs.

**Kein Echtgeld, kein automatisches Paper-BUY/SELL, kein alter Windows-Bot-Reset, kein API-Limit-Bypass, kein Backtest in dieser Umbau-Runde.**
