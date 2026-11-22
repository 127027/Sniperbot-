# R29 V1.9 – GitHub-API-Abbruchschutz und D2-10 Cross-Chain-Prüfung

**Datum:** 22.11.2026, im bestehenden Cleanroom-Branch `codex/r29-cleanroom-paper-20261121` im Repository `127027/Sniperbot-`.

## Hintergrund und tatsächlicher Ausgangszustand

Die ursprüngliche Idee ist kumulativ: 00:00 Uhr teilweise Daten/Chain-Seiten erfassen, Rohbeweise auf GitHub sichern, beim nächsten Scan die noch offenen Lücken fortsetzen. Die fünf Dots dürfen weder automatisch gestartet noch echte Orders erzeugen. Die selbst entwickelte API-Budgetlogik bestand schon aus einem konservativen Rolling-Window, Retry-After und anbieterweiten 429/503-Cooldowns, aber die Persistierung von `research/state/provider-budget.json` fand bislang **erst am Ende** von `scripts/cloud-discovery-runner.mjs` statt. Damit konnte ein nicht erfolgreich beendeter GitHub-Job zwar echte HTTP-Aufrufe verbrauchen, aber vor dem letzten Write gespeicherten Quoten-Zustand und noch nicht dokumentierte geplante Seiten verlieren. Zudem lief der GitHub-Actions-Commit-Schritt zuvor **nicht** nach einem fehlgeschlagenen Capture.

## SYS-11 + QA-03 – Neuer persistenter Abbruchschutz

1. Neue reine Funktionen `src/v19-partial-capture-durability.mjs`: `stagePendingCapture`, `appendPartialHttpReceipt`, `closePartialCapture`.
2. Der existierende Runner legt **vor dem ersten Netzwerkaufruf** alle konkret eingeplanten `chain/page`-Kombinationen als **PENDING** in `research/state/page-coverage.json` an und schreibt `research/feeds/<tag>/<runid>/inflight-capture.json` mit `STARTED_NOT_FINALIZED`.
3. Jede **API-Start-Reservierung** im bestehenden Rate-Limiter schreibt `provider-budget.json` sofort auf Disk; jede dokumentierte HTTP-Antwort (200/429/503 etc.) sowie der Netzwerkfehler-Fallback werden sofort wieder im selben Budgetzustand gesichert. Ein durch Abbruch unbeantworteter Aufruf bleibt konservativ als Start mit `http_status:null` in seinem Ratefenster berücksichtigt.
4. Jede tatsächlich erhaltene Antwort wird zunächst unverändert als rohe `research/feeds/.../*.raw.json` gespeichert und erst danach in das temporäre `inflight-capture.json`-Journal aufgenommen. `http_status:200` ist **kein** nachgewiesener dekodierter Pool/Preis oder BUY-Nachweis.
5. Erst die vorhandene nachgeschaltete `updatePageCoverage`-Prüfung kann PENDING nach einem erfolgreichen Parse plus Quellreferenz entfernen. Beim erneuten Start werden die ausstehenden Seiten aus GitHub übernommen; ein Crash darf fehlende Seiten nicht als „ruhiger Markt“ interpretieren.
6. **Zusätzlicher nachträglicher Review-Fix:** Ein normal durchlaufener Runner mit 429 und fünf unversuchten Seiten wird im `inflight`-Journal zwar als `FINALIZED_BY_RUNNER` markiert, aber mit `status_is_not_successful_capture:true`, `has_unresolved_page_gaps:true`, `proven_successful_pages_this_run` und einer expliziten Liste der nicht bestätigten Seiten. Ein 200-Beleg aus einem **anderen Run** darf nicht als Erfolg des aktuellen Runs zählen.
7. `.github/workflows/cleanroom-dot2-capture.yml`: Der Capture-Schritt zeichnet seine echte `outcome` auf. Research-/Budget-/Raw-Dateien werden nun auch nach einem Capture-Fehler zum *gleichen* Cleanroom-Branch committed; die anschließende Kontrolle lässt den GitHub-Job trotzdem **fehlschlagen**, wenn Capture oder Media-Capture unvollständig waren. GitHub-Commit- und Git-Rebase-Fehler bleiben separat fehlerhaft. Keine Änderung des `main`-Branches, keine Signal- oder Orderdateien. Bestehende Actions-Concurrency für diesen Capture-Workflow bleibt aktiv.

**Grenze:** Diese Maßnahmen zeigen bei kontrollierten Unit-/Prozess-/Dateitests, dass der Zwischenstand nicht still verloren geht. **Ein echter Github-Capture-Crash mit erfolgreichem Teilcommit und Wiederanlauf wurde in dieser Phase noch nicht künstlich ausgelöst**. Übergreifende externe Provider-Quoten eines geteilten IP-Adressraums lassen sich damit nicht garantieren. SYS-11 und QA-03 bleiben `PARTIAL` bis ursprüngliche echte Mehrlauf-Abnahme.

## D2-10 – Cross-Chain-Pool- und Contract-Prüfung

`src/live-pool-discovery.mjs::crossCheckDexPair` und `src/discovery-feed.mjs::fromDexPairOnly` verwenden jetzt die in SYS-13 hinzugekommenen **typisierten Pool-Identitäten**. Der Abgleich prüft Chain-Alias, Chain-ID, den *exakten* Pool, den *exakten Base-Token-Contract*, einen etwaigen originalen Pool-Quelllink und die Beobachtungsreihenfolge. Bei Fehlschlag werden separate Gründe/Statistiken `wrong_chain`, `wrong_pool`, `wrong_base_token` und `malformed_provider_pair` geloggt. 32-Byte-Uniswap-V4-PoolIDs sind nicht durch 20-Byte-EVM-Pooladressen ersetzbar; Solana-Base58 ist case-sensitiv.

**Tests:** Für **Robinhood, Solana, BSC/BNB, Ethereum V4 und Cronos** werden jeweils echte erfolgreiche *Software-Identitätsabgleiche* gegen synthetische passende DEX-Payloads sowie negative falsche Chains, Pools und Token-Contracts getestet, dazu falsche Source-URLs, Zukunfts-Source-Beobachtungen, V4-Fehlformen. Die positiven synthetischen Testdaten **sind kein Nachweis, dass jeder Provider real jede Chain mit HTTP200 bedient**.

Zusätzliche *echte archivierte* HTTP-Beweise:
- `research/feeds/2026-11-22/45044300013/`: Die originale **Base-Uniswap-V4-** Gecko-Entdeckung und die reale rohe DEX-Antwort ergeben einen korrekt typisierten Pool-/Token-Abgleich mit Hash-Prüfung und `TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY`.
- Der ebenfalls originale **Cronos-DEX-** HTTP200-Body enthält keinen passenden Pool; der neue Adapter liefert weiter `NO_VERIFIED_EXACT_PAIR_AND_BASE`, keine erfundene Quote.

Auch bei positivem Match bleiben `provider_quote_asof_utc:null`, `provider_quote_asof_verified:false`, `upstream_provider_independence_proven:false`, `trade_authorized:false`. Ein HTTP-Abrufzeitpunkt ist **nicht** automatisch die frische Quote des Providers. D2-10 wird daher **OPEN → PARTIAL** gezählt: echte Positiv-Beweise auf allen fünf verlangten Chains und unabhängige Live-Quote-Provenienz sind noch nicht vorhanden.

## Verifizierter CI-Stand, genaue Zählung und Grenzen

**Letzter vollständiger Node22-Test auf unverändertem Quellcode-Snapshot:** GitHub [#45053198019](https://github.com/127027/Sniperbot-/actions/runs/45053198019), Commit `4ffea8d2979e28c9123f6d216c019e96c2329525`: **516/516 Tests PASS, 0 FAIL**, `TEST_ONLY_NO_SIGNAL_WRITE 0`.

**Akzeptanz-Snapshot nach Originalkatalog:**
- **12/61 PASS = 19,7 %** (unverändert);
- **25/61 PARTIAL = 41,0 %** (D2-10 jetzt bearbeitet, aber nicht realvollständig);
- **24/61 OPEN = 39,3 %**;
- **37/61 = 60,7 % PASS+PARTIAL technisch bearbeitet**, **nicht** 60,7 % voll funktionierender oder historisch bestätigter Handel.

Kein echter API-Capture seit dem Umbau; die ältere tatsächliche 5/6 Gecko-HTTP200/429-Quelle ist ausdrücklich nur **vor** dem neuen Limiter. Der im aktuellen Research-State dokumentierte letzte Ethereum-Backoff liegt bis **2026-11-22T18:31:56.465Z** in der Zukunft relativ zum Bearbeitungszeitpunkt dieser Phase. Ein vorzeitiger erneuter Gecko-Abruf wäre unzulässig. `research/state/provider-budget.json` wird erst bei einem echten, später zulässigen Capture auf GitHub öffentlich sichtbar. Fünf Dots pausiert, keine Echtgeldkäufe, keine neuen Bots, keine Windows-Paper-Kontoänderung, kein PnL oder BUY/SELL-Fill erfunden.

**Nächste Arbeit mit Priorität:** Kontrollierte tatsächliche GitHub-Multirun-Research-Captures nach dem bestehenden 429-Cooldown, echte HTTP200/429-Quoten und Chain-Fairness belegen; Abnahme von SYS-11 und QA-03 erst nach Ergebnis und Original-Anforderungen. Echte positive Quell-Checks für alle fünf D2-10-Chains separat nachweisen. Kein Trading-Moduswechsel.
