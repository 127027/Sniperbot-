# R29 V1.9 – Offline-Resume-Preflight und Drei-Capture-SHA-Nachweis (22.11.2026)

**Scope:** Nur `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`. **Research/Paper-only, keine Echtgeld-Ausführung, keine BUY/SELL-Signale, keine Dot-Aktivierung, kein Zugriff auf den lokalen Windows-Paperbestand.**

## 1. Tatsächlicher Ausgangszustand

Der letzte echte Providerlauf [GitHub Actions #45057658912](https://github.com/127027/Sniperbot-/actions/runs/45057658912) erhielt am 22.11.2026 zwischen 18:54:05 und 18:54:35 UTC fünf Gecko-HTTP200-Seiten (79 vollständige Poolbeobachtungen) und ein **Base-Seite-2-HTTP429**. Original-Rohbytes und SHA sind erhalten. Persistierter providerweiter Gecko-Retry-Not-Before: **2026-11-22T19:54:35.719Z** (= 20:54:35 MEZ). Vorher **keine** weitere Gecko-Anfrage; Source-/Unit-Tests führen keine Provider-HTTP-Requests aus. Providerlimit nach echtem Fehlversuch konservativ **4 Requests/min insgesamt / maximal 3 NEW_POOLS/min**, Startabstand **15.100 ms**; **noch nicht** mit einem neuen echten Nach-Cooldown-Lauf validiert.

## 2. Neue Netz-freie Startprüfung

`src/v19-scan-restart-preflight.mjs` akzeptiert den **persistierten Iststand** aus `market-memory.json`, `page-coverage.json`, `provider-budget.json`, `older-pool-captures.json` und `ohlcv-backfill.json`. Sie vereint die providerweite 429-Sperre (auch TRENDING/OHLCV), rollierende Provider- und NEW_POOLS-Budgets und die als OPEN gespeicherten Seiten. Ergebnis ist einer von:

- `WAIT_PERSISTED_PROVIDER_COOLDOWN`: Status abwarten; `can_issue_provider_http_now=false`, exakte späteste Retry-Uhrzeit dokumentieren.
- `WAIT_ROLLING_WINDOW`: Minute ist ausgelastet; `not_before_utc` aus dem persistenten Anfragebudget, keinesfalls zusätzliche Requests erzwingen.
- `READY_TO_ATTEMPT_BOUNDED_RESEARCH`: **ein Versuch** innerhalb des konservativen Limits ist laut gespeicherten Regeln zulässig; **kein** Nachweis, dass der externe Provider mit HTTP200 antwortet.
- `NO_CURRENTLY_ELIGIBLE_PAGE`: Kein geplanter sicherer Seitenabruf, keine falsche 0-Coin-Meldung.

`scripts/plan-r29-research-restart.mjs` bietet denselben Report **rein lesend** über `node scripts/plan-r29-research-restart.mjs` aus der Repo-Wurzel. Standardlimit: eine Seite (`R29_PREFLIGHT_PAGE_BUDGET=1`). Ein explizit gesetztes `R29_PREFLIGHT_ASOF_UTC` ist **nur eine deterministische Simulation dieses Zeitpunkts**, nicht eine neue externe Feststellung. Die Preflight-Prüfung tätigt keine HTTP-, GPT-, GitHub-Write- oder Wallet-Operation.

Im nächsten **wirklich gestarteten** `scripts/cloud-discovery-runner.mjs` wird die von der echten Chain-/Seitenpriorität abgeleitete Vorschau zusätzlich vor dem ersten möglichen Provider-Request unter `research/feeds/<date>/<run-id>/restart-preflight.json` archiviert. Die geplanten Aufgaben werden auf exakte Übereinstimmung mit der gemeinsamen Live-Planung geprüft. Der schon zuvor eingeführte `capture-completion-verdict.json` dokumentiert anschließend, ob der **geplante** Budget-Sample vollständig, nur absichtlich begrenzt oder tatsächlich 429-fehlerhaft war.

## 3. Echte mehrstufige Evidenz – kein erfundener neuer Liveversuch

Die aktuellen `research/state/page-coverage.json`-Indizes enthalten **15 echte erfolgreich heruntergeladene Gecko-Seiten aus genau drei früheren echten Capture-Runs**:

- GitHub #45036887325,
- GitHub #45044300013,
- GitHub #45057658912.

`test/v19-qa03-real-multirun-source-continuity.test.mjs` liest **jede der 15 Originaldateien** und verifiziert die SHA-256 der Rawbytes gegen die gespeicherte Page-Coverage **und** den dazugehörigen originalen HTTP200-API-Beleg. Alle 15/15 stimmen überein; die fehlgeschlagene Base-Seite 2 ist ausdrücklich **nicht** Bestandteil dieser HTTP200-Seiten, sondern bleibt im `pending_pages`-Backlog. So wurde nachgewiesen, dass reale historische Seiten über unabhängige GitHub-Läufe persistent vorliegen.

**Fester Beispiel-Seitenplan: 15 von 60 = 25 %.** Berechnung: 6 Chains × 10 fest definierte Offsetseiten; **kein** Prozentanteil an allen Memecoins oder an einer atomaren Marktabdeckung. Offset-Paging kann wegen Seitenverschiebung weiterhin doppelte oder versäumte Pools ergeben. Alte Originalzeitpunkte sind keine erfundenen neuen Dot2-Entdeckungen.

Die 409 Pool-Identitäten des älteren Vor-Capture-Baselinesatzes wurden zuvor in `test/fixtures/v19-original-409-pool-provenance-baseline.json` eingefroren; nach dem letzten echten Capture sind 488 Pools gespeichert. Der Preflight hat diese Memory-Dateien weder überschrieben noch neue Kandidaten hinzugefügt.

## 4. Erfolgreiche Regressionstest-Abnahme

[GitHub Source-only CI #45059990547](https://github.com/127027/Sniperbot-/actions/runs/45059990547), Commit `de26f82748a8e06a550669429789f62ac47877e9`: **574 von 574 Tests PASS, 0 FAIL, `TEST_ONLY_NO_SIGNAL_WRITE 0`**. Darunter echte Raw-SHA-Verifikation über drei frühere GitHub-Capture-Runs, fehlerhafte Rate-Budget-/Clock-Fälle, Offline-CLI und Preflight-Vorschau der gespeicherten Base-Seite 2 nach fiktivem spätem Auswertungszeitpunkt. **Keine aktuellen API-Anfragen** in diesen Tests.

## 5. Nächster noch fehlender Abnahmenachweis

Ein echter *neuer* konservativer **Ein-Seiten-Capture** darf erst nach `2026-11-22T19:54:35.719Z` auf dem Cleanroom-Branch mit eigenen neuen Run-/SHA-Belegen ausgelöst werden. Im bekannten Istzustand wird `base:page2` als erster abgelaufener Fehlseiten-Retry priorisiert. Das ist vor dem neuen Lauf nur eine Planungsprognose. Ein Provider-429 wäre wiederum echt zu speichern und neuer Cooldown; ein HTTP200 müsste SHA, ursprüngliches Empfangsdatum und Checkpoint nachweisen. Anschließend mindestens einen weiteren unabhängigen Research-Wake ausführen und alten Bestand unverändert mit neuen Daten abgleichen. Bis dahin **SYS-11 und QA-03 PARTIAL** und nicht behaupten, die neue 4/min-Rate sei praktisch als 429-frei bewiesen.

**Original 61er-Abnahme unverändert: 12 PASS (19,7 % vollständig), 31 PARTIAL, 18 OPEN = 43/61 (70,5 % technisch bearbeitet).** Keine zusätzlichen AI-APIs, keine Dot- oder Echtgeldaktivierung, keine signierten lokalen Paper-Fills.
