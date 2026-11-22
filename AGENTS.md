# R29 Cleanroom – verbindliche Arbeitsanweisungen für neue Chats und Coding-Agenten

> **AKTUELLSTER GITHUB-STAND 22.11.2026:** **12/61 PASS (19,7 %), 24/61 PARTIAL, 25/61 OPEN** nach ursprünglichen Abnahmekriterien; technischer Bearbeitungsstand `PASS+PARTIAL = 36/61 = 59,0 %`. Alte 50,8 %, 9/61 und 10/61 sind historische Angaben; **kein Code wurde zurückgebaut**. SYS-13 und D2-11 sind nach 12 neuen Regressionstests und 409 realen Pool-Indexeinträgen (61 V4-Pools) gegen ursprüngliche Software-Abnahme bestätigt: keine Token-/Pool-Verwechslung; `first_original_pool_created_at`, `first_dot2_detected_at` und `first_archive_reconstructed_at` dürfen nie als ein und dieselbe Zeit behandelt werden. CI #45050581906 auf `b2b29f8431205f5691bc05f43e7c52f7c92598ad`: **498/498 PASS**. Detail `docs/V19_20261122_SYS13_D211_IDENTITY_PROVENANCE_REVIEW.md`. Die fünf Automationen bleiben pausiert, kein echter API-Nach-Cooldown-Betrieb nach neuem Limiter, keine Trading-Orders/Windows-/Echtgeld-/main-Änderungen. Folgearbeit nur nach wirklichen Original-Abnahmen hochstufen.



> **NEUER STAND 22.11.2026 – fortlaufender API/GitHub-Umbau:** **10/61 PASS (16,4 %), 24/61 PARTIAL, 27/61 OPEN** nach ORIGINALEN Abnahmesätzen; frühere 9/61 und 31/61 historische Snapshots. D2-09 durch frischen Node-Prozess-Restart akzeptiert. SYS-11 (Rolling-Window + 429/503-Retry), D1-04 (leichter Capture- vs GPT-Review-Takt), QA-03 (12 simulierte sechs-Chain-Runs) **weiter PARTIAL bis Realnachweis**. Für alle Details `docs/V19_API_GITHUB_INCREMENTAL_SCANNER_PHASES_20261122.md` lesen. Letzter vollständiger Node22-Code-CI #45049551379 auf `33adcf81...`: **486/486 PASS, TEST_ONLY_NO_SIGNAL_WRITE 0**. Keine Dots aktivieren, keinen GitHub-Research-Workflow automatisch scharfstellen, keine Orders/Echtgeld/Windows-Paper-Änderungen. Nach dem Original-Gecko-429 frühester Retry 2026-11-22T18:31:56.465Z; neue Provider-Persistenz noch nicht live geprüft.

> **VERBINDLICHE KORREKTUR DER 50-%-AUSSAGE (22.11.2026):** 31/61 = 50,8 % bezeichnete nur gezielt getestete *Teilimplementierungs-Arbeitspakete*, nicht 31 erfüllte ursprüngliche Abnahmekriterien. Unabhängige strenge Zweitabnahme: **9/61 = 14,8 % PASS**, **22/61 PARTIAL**, **30/61 OPEN**. Vor weiteren Änderungen immer docs/V19_REAUDIT_31_TASKS_ORIGINAL_ACCEPTANCE_20261122.md lesen; docs/V19_IMPLEMENTATION_PROGRESS.md und docs/R29_NEXT_CHAT_HANDOFF.md wurden korrigiert. Ein grüner Unit-CI-Lauf ist kein echter Provider-/GPT-/Windows-/Paper-Fill-Nachweis.


> **Einstieg:** Vor jeder Änderung **[docs/R29_NEXT_CHAT_HANDOFF.md](docs/R29_NEXT_CHAT_HANDOFF.md)** und **[docs/V19_IMPLEMENTATION_PROGRESS.md](docs/V19_IMPLEMENTATION_PROGRESS.md)** vollständig lesen. Maßgebliche Aufgabendefinitionen stehen in **[docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md](docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md)**. Die Dokumentation ist eine Anleitung, kein Beweis für einen durchgeführten Test.

## Unverhandelbare Projektgrenzen

1. Ausschließlich Repository `127027/Sniperbot-` und Branch `codex/r29-cleanroom-paper-20261121` bearbeiten. Branch **immer explizit** an GitHub-Operationen übergeben. **Nie `main` oder den Legacy-Bot ändern.**
2. Alle **fünf bestehenden** ChatGPT-Dots bleiben pausiert, auch nach Tests. Keine neuen Bots oder zusätzliche parallel laufende Dot-Architektur.
3. **Nur Paper-Trading / Research.** Keine echten Wallet-/DEX-Transaktionen, keine echten Orders und niemals vorhandenes Windows-Paper-Konto, Journale oder Receipts überschreiben. Standard-Research-Modell: 5.000 TEST-USDC, Einsatz 50 TEST-USDC/Coin; bestehende tatsächliche Konten sind davon unabhängig.
4. **Ein Handelssystem mit einem gemeinsamen Entscheidungskern** `src/unified-decision-v18.mjs` für Live-Paper und historische As-of-Simulation. Datenquelle und Uhr sind austauschbar, Logik und Risk-Gates bleiben gleich. Keine zweite Backtest-Strategie.
5. **Kein Zukunftswissen.** 65 Excel-Gewinnerreferenzen liegen ausschließlich in `research/evaluation/2026-10-12/v19-winner-reference-identity-status.json` als `POST_EVENT_ORACLE`. Diese dürfen nie in Discovery-/Ranking-/Kaufinputs einfließen. `ORIGINAL_CAPTURE` ist ohne unabhängige Hash-/Herkunftsprüfung nur ein behauptetes Original; `RETRO_ASOF_RECONSTRUCTION` ist keine damalige Dot-Entdeckung; synthetische Daten sind ausschließlich Tests.
6. Keine Geschäfte bei fehlenden aktuellen, identifizierten, ausreichend verlässlichen Quellen behaupten. Fehlende Informationen als `DATA_GAP` mit erneutem Prüfauftrag dokumentieren – nicht als bestätigten Betrug oder ruhigen Markt. Zusätzliche Sicherheits-Blocker nicht ohne begründeten Abnahmetest hinzufügen.
7. Nach **jedem** geprüften Arbeitspaket den Fortschritt gegen die **61 V1.9-Aufgaben** ausweisen: `erledigt/61` und `(erledigt / 61) × 100 %`. Keine Doppelzählung, keine Aufgabe ohne gezielte Regression und Commit als `COMPLETE (targeted)`. End-to-End-/Actions-CI bleibt separat offen, bis tatsächlich ausgeführt.
8. Neue Chats können GitHub nicht automatisch lesen: Den Nutzer ggf. auffordern, diese Datei zu verlinken oder GitHub zu verbinden. Immer im neuen Chat **zuerst live GitHub lesen**, damit der Stand nicht aus alten Chat-Nachrichten geschätzt wird.

## fünf Rollen (keine neuen Dots)

- **Dot 1:** 4/8/12/24-Vollanalysen, Aktivität pro Chain/Seite und Zeitfenster, Wechsel 4→24 sofort bei ausreichend Belegen, Reduktion nur nach bestätigter Ruhe. API-Datenerfassung und Positions-/Exit-Beobachtung laufen unabhängig vom GPT-Budget.
- **Dot 2:** alle unterstützten Chains, paginierte neue/ältere Pools, V4, persistentes Marktgedächtnis, Hot-/Fair-Queue, Endpoint-Budget, 429/Retry und historische Beobachtungen. Keine Kandidaten wegwerfen, nur weil Risk-Daten fehlen.
- **Dot 3:** Verbindliche gemeinsame Statusmaschine `src/v19-dot3-risk-status.mjs` mit `DISCOVERED`, `DATA_GAP`, `WATCH`, `REJECTED`, `PAPER_ELIGIBLE` für Live-/Historien-Research und Rechecks. **Der positive `PAPER_ELIGIBLE`-Test ist bislang ausschließlich `SYNTHETIC_REGRESSION_ONLY`, immer `trade_authorized:false`; echte Quellen-/Issuer-Prüfung fehlt (D3-04).** Details: `docs/V19_DOT3_RISK_STATE_MACHINE.md`. Fehlende Daten nicht als dauerhafte Ablehnung maskieren.
- **Dot 4:** einheitliche zeitgerechte BUY/WATCH/HOLD/SELL-Entscheidungen, Chancen-/Risiko-Prognosen, verfügbare 50 TEST-USDC/Coin, unabhängige Markt-/Exit-Prüfungen auch zwischen Vollreviews. Kein Fake-Fill.
- **Dot 5:** vollständiger Audit für Erkennung, Review-Auslastung, Prognosen, PnL und Fehlergründe, echte GPT-Ausführung vs deterministischer Rollen-Replay trennen. Excel-Oracles erst nach simuliertem Zeitpunkt für Evaluation.

## Fester historischer Test

- **Warmup:** 11.10.2026 19:00 UTC – 12.10.2026 00:00 UTC. Rückblick in ältere verfügbare Vergangenheit grundsätzlich unbegrenzt; nie alte Preise als frische ausführbare Quotes verwenden.
- **24h-Trading:** 12.10.2026 00:00 UTC – 13.10.2026 00:00 UTC. Jeden as-of-Takt unabhängig von späteren Gewinnen auswerten; 1-/3-/6-h-Labels werden erst nach Fälligkeit zugänglich.
- Das Oktober-Archiv belegt **keinen** vollständigen ursprünglichen Markt oder tatsächliche damalige Dot-GPT-Trades; sechs post-hoc Kursreihen sind Trainingsreferenzen, keine unabhängige Prognoseperformance.

## Ablauf jeder Änderung

1. Aktuellen Branch, Fortschrittsbericht, relevante Module, Tests und ursprüngliche Evidenzen direkt aus GitHub lesen.
2. Eine offene Maßnahmen-ID wählen, die konkrete Ursache/Abnahmekriterien prüfen, **nur bestehenden Cleanroom-Branch** ändern.
3. Regressionstests ergänzen und **tatsächlich** so gut wie möglich ausführen. Isolierte Funktionsprüfungen niemals mit `npm test`/Actions-CI verwechseln. Auftretende Fehler zuerst beheben.
4. `docs/V19_IMPLEMENTATION_PROGRESS.md` mit präziser Aufgaben-ID, Beleg, Teststatus und offenem Risiko aktualisieren. `docs/R29_NEXT_CHAT_HANDOFF.md` bei Änderungen der Architektur, Priorität oder Übergabe ebenfalls aktualisieren.
5. Bei geänderter Rolle die **gespeicherten Anweisungen des jeweiligen pausierten Dots** synchronisieren, ohne ihn zu aktivieren. GitHub-Dokumentation ersetzt diese Synchronisierung nicht.
6. Nutzer berichten: Aufgabe erledigt/offen, genaue Tests, GitHub-Links, `x/61` / Prozent, die nächsten Hindernisse.

## Zentrale Dateien

- Überblick und Chat-Übergabe: `docs/R29_NEXT_CHAT_HANDOFF.md`
- Fortschritt: `docs/V19_IMPLEMENTATION_PROGRESS.md`
- Vollständige 61-Punkte-Liste: `docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md`
- **Aktuelle 50-%-Abnahme und kritischer Architektur-Soll/Ist-Abgleich:** `docs/V19_MILESTONE_50_PERCENT_ARCHITECTURE_REVIEW.md` (Stand 31/61, 50,8 %, 30 offen; grüner Node-22-CI 465/465, **keine** realen GPT-Reviews oder Client-Paper-Fills).
- Ein-System-Vertrag: `docs/V18_ONE_SYSTEM_CONTRACT.md`; Rollen: `docs/DOT_PIPELINE.md`
- Manueller research-only Replay: `docs/V19_MANUAL_BACKTEST_USAGE.md`, `.github/workflows/cleanroom-v19-manual-backtest.yml`
- Anwendbare Tests: `test/v19-*.test.mjs` und `npm test`; Status der Node-/CI-Abnahme unbedingt verifizieren.
