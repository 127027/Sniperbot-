# R29 V1.9 – Reale HTTP429-Rückmeldung und ehrliche inkrementelle Scan-Abnahme

**Stand:** 22.11.2026. **Scope:** ausschließlich `127027/Sniperbot-` / `codex/r29-cleanroom-paper-20261121`, ohne Dot-Aktivierung, Wallet-/Clientzugriff, GitHub-`main`, Echtgeld oder BUY/SELL-Orderpublikation.

## 1. Wirklich nachgewiesener Fehler im alten Workflow

Beim echten manuellen Research-Job [#45057658912](https://github.com/127027/Sniperbot-/actions/runs/45057658912) am 22.11.2026:
- Geplant sechs GeckoTerminal-Kettenseiten, HTTP200 für Ethereum 1, BSC 2, Robinhood 2, Cronos 2 und Solana 2: **5 erfolgreich angeforderte Seiten, 79 Poolbeobachtungen**; Base 2 erhielt **HTTP429**. Zwei separate DEX-Pair-HTTP200, 0 Orders, 0 Client-Fills.
- Alle Original-HTTP-Rohbytes einschließlich 429, SHA-256, laufenden Provider-Zähler, Cursor, Pending-Base-Seite und die erste prospektive Holdout-Freeze-Datei wurden in GitHub bewahrt.
- Trotzdem meldete das GitHub-Actions-Workflow-Ende **success**, weil es lediglich `steps.dot2_capture.outcome == 'success'` und `steps.media_capture.outcome == 'success'` prüfte. **Runner lief zu Ende** wurde damit missverständlich als **angeforderter Sechs-Chain-Sample vollständig** kommuniziert.
- Ein grüner GitHub-Prozess ist nicht gleich ein vollständig abgefragter Anbieter, komplette globale Coin-Abdeckung oder Paper-Trading-Reife.

## 2. Korrigierte Betriebssemantik

`src/v19-capture-completion-gate.mjs` prüft den **konkreten Run**, dessen geplante Chain/Seite, originale Gecko-HTTP-Belege, tatsächlich erhaltene HTTP200-Seiten, Fehlversuche, nicht versuchte Seiten und den finalen In-flight-Cursor.

| Abschlussklassifikation | Konkreter Zustand | Workflow-Behandlung |
|---|---|---|
| `REQUESTED_SAMPLE_COMPLETE` | Alle angeforderten Chains mit HTTP200, sämtliche geplanten Seiten belegt | Erfolg des **begrenzten** Samples, niemals Gesamtmarktabdeckung |
| `BOUNDED_SAMPLE_COMPLETE_COVERAGE_INCOMPLETE` | Bewusst kleineres API-/Page-Budget; **alle geplanten** Seiten HTTP200, übrige Chains ungescannt | Legitim gespeicherter **Teilfortschritt**, nicht als 6/6 oder Markt vollständig ausgeben |
| `DEFERRED_BY_PERSISTED_COOLDOWN` | Bereits aktive, zeitlich nachgewiesene providerweite Sperre; keine neue Gecko-Abfrage, alle geplanten Seiten als offen dokumentiert | Legitime Verschiebung ohne Rate-Limit-Missachtung; keinesfalls 0 Coins oder ruhiger Markt |
| `PARTIAL_OR_INVALID_CAPTURE` | Geplante Seite scheitert tatsächlich (z. B. HTTP429), Originalbeleg fehlt/ist verfälscht, unerwarteter Datenverlust oder Inkonsistenz | Nachdem sämtliche Partial-/Raw-/Budget-Dateien committed sind: **Workflow-Fehler** |

**Besonders wichtig:** Die Scanner müssen **nicht** über Nacht die globale Marktabdeckung auf 100 % bringen. Kleine, nachweisbar gespeicherte Teilfortschritte sind gültig; unerledigte Chain/Page-Paare werden **nicht** als HTTP200 oder als Käuferfreigabe dargestellt.

## 3. Exakte technische Einbindung

- `src/v19-capture-completion-gate.mjs`: reiner, nebenwirkungsfreier Abnahme-Kern für einen bereits vorhandenen Capture-Journal-/Evidence-Snapshot.
- `scripts/cloud-discovery-runner.mjs`: schreibt ab nächsten tatsächlichen Capture zusätzlich `research/feeds/<date>/<run-id>/capture-completion-verdict.json` **nach** dem originalen `inflight-capture.json` und **vor** dem Commit als maschinenlesbaren Status; keine zusätzliche API-Abfrage.
- `scripts/v19-assert-capture-completion.mjs`: liest genau den `GITHUB_RUN_ID`-Originalrun, verifiziert sämtliche gespeicherten Gecko-/DEX-Rohbytes erneut via SHA-256, prüft die Resultate und gibt eine strukturierte `DOT2_CAPTURE_COMPLETION_VERDICT`-Diagnose aus. Bei fehlerhaftem Sample/Hash setzt es Exit-Code 1. Ein bereits abgeschlossener Run #45057658912 wurde rein offline nachgeprüft; das ist KEIN zweiter Provider-Capture.
- `.github/workflows/cleanroom-dot2-capture.yml`: sammelt und committet weiterhin **immer** Raw/Recovery-State, danach erst wird im finalen Schritt der Abschlussstatus geprüft. Teilmengen und begründete 429-Pausen sind keine künstlich defekten GitHub-Jobs, aber ein **neuer** echter API-429 innerhalb geplanter Seiten ist ein echter fehlgeschlagener Capture. Der Workflow zeigt den Status zusätzlich als GitHub-Actions-Schrittzusammenfassung.
- `test/v19-qa03-honest-capture-status.test.mjs` und `test/v19-qa03-capture-completion-cli.test.mjs`: echter 5/6-Archivfehler, bewusst kleine legitime Sample-Budgets, fehlerfrei eingefrorene hypothetische 6/6-Belege (nur **synthetisch**), persistente Cooldown-only-Zwischentakte, falsche Cooldown-Angaben, offline geprüfte Original-SHA und Workflow-Reihenfolge. Alle Tests ohne echte neue Provider-Aufrufe.

## 4. Was für die Originalabnahme weiterhin fehlt

- **SYS-11 / QA-03: PARTIAL**, bis wenigstens zwei unabhängige **wirklich ausgeführte** Research-Läufe nach Ende des letzten 429-Backoffs mit unveränderten Page-/Pool-Hashes, begrenztem Providerbudget und reproduzierbarer Continuation vorliegen.
- Letzte tatsächlich persistierte Gecko-Sperre: **2026-11-22T19:54:35.719Z**, vor diesem Zeitpunkt keine Gecko-Abfrage. Ob die konservativen **vier Requests pro Minute / höchstens drei NEW_POOLS** und **15.100 ms Startabstand** nach dem Backoff wirklich ohne neuen 429 funktionieren, ist noch offen.
- Offene Pages/Provider-Quotealter/Sellability, echte autorisierte Dot3-/Dot4-GPT-Outputs und belegte lokale Client-Paper-Fills sind dadurch **nicht** erledigt. Fünf Dots bleiben pausiert. Kein Echtgeld und keine Paper-Wallet-Veränderung.
- **Verbindlicher ursprünglicher Fortschritt bleibt 12 PASS / 31 PARTIAL / 18 OPEN = 43/61 = 70,5 % technisch bearbeitet; streng abgenommen 12/61 = 19,7 %.** Neue Checks reparieren schon teilweise umgesetzte SYS-11/QA-03; keine künstliche 61er-Hochstufung.
