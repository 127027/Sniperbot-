# R29 V1.9 – Fortsetzung: Raw-Receipt-/API-Kohärenz und Order-Index ohne stille Verluste

**Datum:** 22.11.2026 · **Scope:** ausschließlich `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121` · **Keine Backtest-Ausführung, keine Paper-/Echtgeld-Order und keine Änderung an Main oder Windows-Bestand.**

## 1. Nachweisbare Implementierung dieser Fortsetzung

### A. SYS-11 / QA-03 – echte geplante HTTP200-Pages an denselben Lauf binden

- [Commit `43f6187`](https://github.com/127027/Sniperbot-/commit/43f61873c808cf82a23f9d7ad90cb09e04e6301b): `src/v19-partial-capture-durability.mjs`. Ein als vollständig abgeschlossener Page-Cursor muss mit einem **tatsächlich journalisierten HTTP200** dieses Runs übereinstimmen: exakte Chain, Page, Endpoint, Rohdatenpfad, SHA256 sowie Empfangszeit. Andernfalls bleibt er ausstehend, auch wenn ein späteres Coverage-Feld scheinbar vollständig aussieht. Das Stage-Journal verwirft doppelte Chain/Page-Aufträge, schreibpfadfremde Responses und unmögliche Zeitstempel.
- [Commit `4ed9491`](https://github.com/127027/Sniperbot-/commit/4ed94914735de2982c42392c2cc6e1a68a9d99a7): Regressionen in `test/v19-sys11-partial-capture-recovery.test.mjs`, unter anderem falscher Run, falsche Seiten-URL, SHA-Differenz, HTTP429 und fehlender Journalbeleg. Zwei CI-Läufe [#45071675587](https://github.com/127027/Sniperbot-/actions/runs/45071675587), [#45071675647](https://github.com/127027/Sniperbot-/actions/runs/45071675647): **660/660 PASS, 0 FAIL**.

### B. QA-03 – Quellenjournal gegen unabhängig gespeichertes API-Evidenz-Manifest abgleichen

- [Commit `4f8bac2`](https://github.com/127027/Sniperbot-/commit/4f8bac2cf1b575ecdfd1d5babca1334f61c01ffc): `src/v19-capture-completion-gate.mjs`. Jede behauptete Journal-HTTP-Antwort wird mit dem separat archivierten `api_evidence`-Datensatz auf Rohpfad, SHA, URL, HTTP-Status und Start-/Empfangszeit abgeglichen; neue eindeutige Fehlergründe für Diskrepanzen und falsche Planned-Page-Endpunkte.
- [Commit `5e19f42`](https://github.com/127027/Sniperbot-/commit/5e19f42e4b26b2fe1eea4b67cbf510adbe6cb086): Angepasste eindeutig als synthetisch markierte Positivbelege sowie zwei neue Fälschungstests in `test/v19-qa03-honest-capture-status.test.mjs`. Grüne CI: [#45071803709](https://github.com/127027/Sniperbot-/actions/runs/45071803709), [#45071803702](https://github.com/127027/Sniperbot-/actions/runs/45071803702), **662/662 PASS, 0 FAIL**.
- Wichtig: Abgleich zweier intern archivierter Manifest-Dateien plus SHA ist **keine** extern attestierte API-Quoten- oder historische Zeitprovenienz. Die abschließende GitHub-Workflow-CLI prüft weiterhin die echten gespeicherten Rohbytes. Kein externer Handel autorisiert.

### C. Publisher – keine stillschweigende GitHub-Order-Index-Verdrängung

- [Commit `ce39d52`](https://github.com/127027/Sniperbot-/commit/ce39d52f2a39a6786dc776a998178d7188d692fa): neuer reiner Planner `src/v19-signal-index-integrity.mjs` für validierte `PAPER`-Order-Index-IDs, SHA, Dedupe, Kapazität, Idempotenz. Ohne Mutationen und ohne API.
- [Commit `98ef5eb`](https://github.com/127027/Sniperbot-/commit/98ef5eb3272d41ffb3371fcdcf015e6901de4717): `src/publisher.mjs` prüft Kapazität vor Erzeugung des GitHub-Order-Blobs. Beim konkurrenzbedingt später erreichten Cap wird kontrolliert abgebrochen, **niemals** `slice(-maxIndexSize)` auf offene ältere Order-Zeiger ausgeführt. Der Dot3-Auth-Gate bleibt unverändert fail-closed.
- [Commit `c9b3be6`](https://github.com/127027/Sniperbot-/commit/c9b3be6c4283db563d1582e760640890b0edef52): fünf Regressionstests in `test/v19-signal-index-integrity.test.mjs` (Kapazitätsgrenze, keine Eviction, Idempotenz, falsche SHA/IDs, Verifikation vor GitHub-PUT). Beide GitHub-Workflows **SUCCESS, 667/667 PASS, 0 FAIL**: [#45071920360](https://github.com/127027/Sniperbot-/actions/runs/45071920360), [#45071920311](https://github.com/127027/Sniperbot-/actions/runs/45071920311).

## 2. Dot-Betrieb und tatsächliche Evidenz

Die fünf vorhandenen R29-Cleanroom-Dot-Automationen wurden in der Automationsübersicht schreibgeschützt wiedergefunden; am Prüfzeitpunkt waren **alle fünf aktiviert**. Der zuletzt ausgewiesene Dot3-Lauf lag um 21:21 UTC, die übrigen früher. Die Aktivierung beweist weder 4/8/12/24 vollendete GPT-Reviews in derselben Kohorte, noch signierte GitHub-Rollenjournale, noch eine Dot4→Windows-Paper-Fill-Quittung.

## 3. Strenger unveränderter Original-Sollstand

- **61 Originalaufgaben: 13 PASS / 46 PARTIAL / 2 OPEN; 13/61 = 21,31 % streng abgenommen.**
- **Vor QA-04 60 Nicht-Backtest-Aufgaben: 13 PASS / 45 PARTIAL / 2 OPEN.**
- `D3-04` (unabhängiger vertrauenswürdiger Issuer und Quell-/Zeitbeleg) und `D3-05` (echte Chain-/Route-/Honeypot-/Tax-/Blacklist-Verkaufbarkeit) bleiben **OPEN**.
- `QA-04` bleibt bewusst PARTIAL, weil der vollständige Oktober-29h-Backtest nicht gestartet wurde.
- Für weiteren Original-PASS fehlen unter anderem vollständige sechs-Chain-Captures über das vorgeschriebene Fenster, authentifizierte fünf-GPT-Rollen-Journale, unabhängige Original-Oktober-Quellen mit neutralem positiven und negativen Marktuniversum, verifizierte Windows-Client-PAPER-Receipts und der nach dem **25.11.2026 06:54 UTC** tatsächlich gereifte prospektive Holdout.
- Das vorhandene Freigabe-Gate `scripts/v19-verify-100pct-before-backtest.mjs` bleibt fail-closed; **nicht umgehen**. Quell-/Code-Prüfung ist nicht Original-Gesamtabnahme. Die Tests prüfen lokale Modellzustände/archivierte Daten, keine echte Paper-Fill-Ausführung.

## 4. Klares Ergebnis

**Weitere reale Softwarefehler behoben und verifiziert. Noch nicht backtest-ready gemäß den vom Nutzer selbst geforderten strengen 60/60-Gates.** Die verbleibenden unabhängigen Evidenz- und Zeitbedingungen können nicht durch grüne CI-Tests ersetzt werden. Erst alle 60 originalen Nicht-Backtest-Aufgaben mit tatsächlichen Belegen abnehmen, dann nach separater Nutzerfreigabe QA-04 ausführen.

Keine Browser-/Windows-/Wallet-Dateien geändert, kein Orderindex, keine Signal-Order und keine Paper-Guthabenbuchung erstellt. Datensammel-Dots nicht umkonfiguriert. Aktuelle vollständige Ursprungsreferenzen: `docs/V19_48_ORIGINAL_RESTBAUSTELLEN_VOR_BACKTEST_20261122.md`, `docs/V19_PREBACKTEST_60_OF_60_RELEASE_GATE_20261122.md`, `docs/R29_NEXT_CHAT_HANDOFF.md`.
