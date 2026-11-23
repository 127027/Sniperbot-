# R29 V2.1 – Tatsächlicher aktueller Dot2→Dot3-Forschungs-Handoff und gemeinsamer Dot4-Entscheidungsmodus

Datum: 23.11.2026, UTC. Ausschließlich `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`. Alle Prüfungen **read-only**, `PAPER_ONLY`, keine aktivierten Orders und keine Eingriffe in den lokalen Windows-Paper-State.

## 1. Ausgangspunkt und tatsächlich geprüfter Feed

Archivierter GitHub-Capture: `research/feeds/2026-11-23/45246727202/`, originaler Abschluss `2026-11-23T19:13:54.580Z`, Chain Robinhood. Der Feed ist **kein Oktober-Backtest** und keine verlässliche Quote für spätere Stunden.

- Originales Dot2-Handoff: **19** Kandidaten, 19 Pool-/Contract-Identitäten, **0** als handelbar bestätigte Kandidaten.
- Originales Dot3-Status-Preview: **18 WATCH**, **1 DATA_GAP**, **0 PAPER_ELIGIBLE**; kein authentifizierter Dot3-Risk-Issuer und keine validierte Chain-Sellability.
- Persistierte Dot3-Nachprüfplanung: **19** offene Pools, davon **6** priorisiert, **13** als Warteschlange. Für alle 19 lautet der aktuelle nächste Arbeitstyp `FETCH_MISSING_EXACT_POOL_SECOND_SOURCE`; dabei sind zwei sichtbare Websites nicht automatisch zwei unabhängig attestierte Kursquellen.
- Im CI-Lauf am 23.11.2026 19:39 UTC war der Capture bereits **älter als zehn Minuten**. Die korrekte Aktion ist daher `RECAPTURE_THEN_REASSESS` statt der Wiederverwendung als frische Handelsquote.

## 2. Implementierte Änderungen (nicht nur Dokumentation)

`src/v21-five-dot-handoff-audit.mjs` stellt die verbindliche rein funktionale Querprüfung bereit:

1. Verhindert die Mischung von JSON-Artefakten verschiedener GitHub-HTTP-Capture-Runs, ungültigen Pfaden, vorgezogenen Zeitstempeln und nachträglich bekannten Coin-Gewinnen.
2. Vergleicht Dot2-Kandidaten mit Dot3-Risikostatus und Dot3-Recheck-Warteschlange; keine verlorenen oder gedoppelten Kandidaten.
3. Berechnet die aktuellen Dot3-Zustände **mit dem existierenden** `summarizeDot3RiskStatuses` und die Recheck-Reihenfolge mit `planDot3EvidenceRechecks` erneut. Dies ist keine zweite Risikostrategie.
4. Erkennt archivierte Status-/Scheduler-Abweichungen und stale Captures getrennt. Auch ein strukturell korrektes Git-Journal bleibt **keine** independent attestierte GPT-Ausführung.
5. Zeigt die Anzahl offener Aufgaben, den Quellstatus und die noch fehlenden Trust-Belege ohne ORDER-Promotion: `dot4_buy_orders_authorized=0`, `dot4_sell_orders_authorized=0`, `dot5_verified_client_fills=0`, `orders_written=0`.

`scripts/v21-five-dot-handoff-audit.mjs` lädt nur bereits im lokalen Git-Checkout vorhandene Referenzdateien; Dateinamen, Git-Index und **HEAD-Blob-SHAs** werden verifiziert. Kein HTTP, kein GPT-Aufruf, keine lokale Windows-Zustandsänderung. Über `npm run audit:v21:handoff` aufrufbar.

`src/v18-dot4-live-decision.mjs`: strikte ISO-UTC-Zeitprüfung. `scripts/v18-dot4-decision.mjs`: übergibt `evaluationMode:data.time_mode` nun ausdrücklich an **denselben** Dot4-Kernel für Live und historische As-of-Analyse. Der ausgeführte Modus wird nur im CLI-Außenumschlag `kernel_invocation_mode` ausgegeben, damit die eigentlichen BUY/WATCH/HOLD/SELL-Ergebnisse **bytegleich** bleiben – insbesondere die Regression `QA-01 exact shared mode parity`.

`test/v21-five-dot-handoff-audit.test.mjs` und `test/v21-five-dot-handoff-cli.test.mjs`: echte archivierte 19-Pool-Quelle, Verwahrung aller Kandidaten, drohende Zeitreise, Hindsight-Label, gefälschte PAPER_ELIGIBLE-, fehlende Risikorechecks, keine Client-Fills, strikt read-only. `test/v21-dot4-cli-mode.test.mjs`: beide Dot4-Zeitmodi, saubere UTC-Zeitstempel, keine Orderfreigabe.

`.github/workflows/cleanroom-v19-ci.yml` prüft und archiviert `probe-artifacts/v21-five-dot-handoff-audit.log`, ohne historische QA04-Ausführung.

## 3. Tatsächliche GitHub-CI-Belege

- [Source-only CI #45251153506](https://github.com/127027/Sniperbot-/actions/runs/45251153506): **835/835 PASS** und tatsächliche Auswertung der 19 Kandidaten; keine ORDER-Veröffentlichung.
- [Source-only CI #45251456838](https://github.com/127027/Sniperbot-/actions/runs/45251456838): **838/838 PASS**, einschließlich Dot4-UTC- und Live/As-of-Paritätsfix.
- Spätere Kommandozeilen-/Abschlusstests müssen vor einer Erhöhung dieser bestätigten Testzahl tatsächlich in CI grün werden.

## 4. Nächster fachlicher Schritt

Alle 19 Kandidaten brauchen neue, unabhängige aktuelle Kurs-/Upstream-Belege und die eigenständige Dot3-Sicherheits-/Sellability-Abnahme. Die priorisierte Sechserliste ist **kein Kaufauftrag**. Erst bei belegter Kursidentität und auf der jeweiligen Chain tatsächlich simulierbarem Exit kann Dot4 eine ernsthafte Orderprüfung durchlaufen. Für aktuelle Fills sind zudem echte authentifizierte GPT-Review-/Git-Bindungen und lokale Client-Receipts erforderlich. Die 29h-Oktoberquelle fehlt weiterhin in originärer damaliger Captureform.

Die ursprüngliche Originalabnahme bleibt **13/60 Nicht-Backtest-Aufgaben (21,67%)** und **8** separaten Beweisgates; ursprüngliches `QA-04` nicht freigegeben. Zero Orders = **keine behauptete historische Gewinnrate**.
