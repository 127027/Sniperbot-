# R29 V1.9 – D2-04: aktuelle Kursbeobachtungen statt veralteter Momentum-Signale

## Ziel
Der Nutzer will zukünftige starke Memecoin-Anstiege anhand zeitgerecht und unabhängig erfasster Marktbeobachtungen rechtzeitig erkennen. Die fünf **bereits bestehenden, pausierten** Dots sollen bei nachgewiesener Aktivität 4/8/12/24 GPT-Vollreviews pro Tag empfehlen; Datensammlung/Positionen-Exit-Beobachtungen sind **nicht** auf diese Frequenz beschränkt. Nur Paper-Trading, 5.000 TEST-USDC/50 je Coin im isolierten Research-Modell; keine Orders durch diesen Fix.

Die retrospektive Excel-Datei `R29_Memecoin_Gewinner_2026-10-12.xlsx` enthält **65 historische Anstiegsmeldungen** (64 Tagesarchiv +1 Artikel), aber **0** exakte, ausführbar belegte Tief→Hoch-Trades im 12.10. UTC-Intervall. Diese Referenzen werden ausschließlich später zur Evaluation benutzt und fließen nie in Discovery/Ranking/BUY ein.

## Nachgewiesener Fehler in der tatsächlichen gespeicherten November-Rangliste
Versioniertes Original: `research/observations/2026-11-22/45036887325-asof-ranking.json`, as-of **2026-11-22T15:11:16.013Z**.
- Beobachtetes Panel **284 eindeutige Pools**, **3 Research-Ranglistensignale** mit Score.
- `FNG` (BSC, Pool `0x03aa0e5114c12d3974da2ab1843cd197e24e4274`): letzte Preisbeobachtung **2026-11-21T22:34:24.433Z**, also **997 Minuten** alt und trotzdem Rang 1/3.
- `TRUMP` (BSC, Pool `0x364f490a973f8fecddb5845ebc66562ec94ad54a`): gleiche letzte Beobachtungszeit, **997 Minuten** alt, trotzdem Rang 2/3.
- `CROVIA` (Cronos, Pool `0x835a8fe7370c5c08b9a4efda273e28ff7bcf161c`): neueste Erfassungszeit entspricht dem As-of, aber der Preis-Vergleich stammt aus einer deutlich weiter als vier Stunden zurückliegenden Beobachtung.
- **Die vollständige read-only Rekonstruktion** mit `maxCandidates:100000` fand über das ganze Panel zusätzlich **18 Fälle mit zu großen Preisen-Beobachtungsabständen**, nicht nur CROVIA. Nach den vorläufigen 120-/240-Minuten-Kriterien **0 aktuelle Research-Rankings**; das ist ein Befund über Datenfrische, nicht über die Anzahl möglicher Marktgewinner.
- Dies beweist **keine** wirklichen zukünftigen Gewinner, reale Trades, Marktabdeckung oder historische Kaufbarkeit, sondern eine konkrete *Aktualitätslücke* im bisherigen Research-Score. Alle Werte stammen aus der alten gespeicherten Rangliste; deren Datei wird nicht rückwirkend überschrieben.

## Änderung am gemeinsamen vorwärtsgerichteten Forschungspfad
`src/forward-learning.mjs::scoreAsOf` wurde erweitert:
1. `maxLatestCaptureAgeMinutes=120` (konfigurierbar 5..1440). Eine letzte Erfassung außerhalb dieses Zeitfensters bleibt als **WATCH_STALE_LAST_CAPTURE** sichtbar; alter Momentum-Score wird nicht als derzeit priorisierbar ausgegeben. Historische Preisänderung und Source-Referenzen bleiben erhalten.
2. `maxPriceObservationGapMinutes=240` (konfigurierbar 5..1440). Zwei Preisbeobachtungen müssen mindestens fünf Minuten und höchstens vier Stunden auseinanderliegen, damit daraus ein aktuelles Research-Momentum berechnet wird. Größere Lücken sind **WATCH_PRICE_OBSERVATION_GAP**, nicht ein LIVE-Preissignal.
3. Exakte Auditmerkmale am Kandidaten: `latest_capture_age_minutes`, `latest_capture_is_recent`, `prior_price_capture_at_utc`, `prior_price_observation_gap_minutes`, `prior_price_gap_within_current_window` und angewendete TTL-/Gap-Grenzen.
4. Panel-Abschlusszahlen trennen `research_rankable`, `stale_last_captures`, `long_price_observation_gaps` und `insufficient_repeated_data`. Kein Kandidat wird aus dem historischen Marktgedächtnis gelöscht. Jeder Research-Score bleibt `risk_eligible:false`, `trade_authorized:false`.
5. Diese 120-/240-Minuten-Fenster sind **vorläufige Forschungsschwellen**, keine optimierten Gewinngarantien. Vor Strategie-/Paper-Freigabe mit periodisierten negativen Fällen und Holdout validieren. Der Browser-/HTTP-Capture-Zeitpunkt ersetzt keine verifizierte *Provider-Quotezeit*.

## Tests
- `test/v19-forward-rechecks.test.mjs`: In-Memory-Regressionen für 16h alte Gewinner-Momentum-Signale, 8h Beobachtungslücke, tatsächliche Zwei-Erfassungs-Folge, Konfigurationsgrenzen und As-of-Zukunftsfilter.
- `test/v19-real-asof-freshness-regression.test.mjs`: read-only Recompute aus den im Repository gespeicherten ursprünglichen Beobachtungs-Batches des 22. November; erfasst explizit, dass die alte Rangliste nur Top-100 aus dem 284er-Panel zeigt. Der Test verwendet `maxCandidates:100000`, um **alle** Datensätze für die Prüfung zu sehen, ohne die produktive Output-Grenze zu ändern.
- **Echter GitHub-Actions-Node-22-Testworkflow abgeschlossen/success**: Run [#45040031378](https://github.com/127027/Sniperbot-/actions/runs/45040031378), quellengepinnter Code-Commit `c5f6ab708d79ded0e1c713cec1ef266e9b61a62b`. Die zwischenzeitlichen roten CI-Läufe führten zu einer korrigierten tatsächlichen Archivannahme (18 statt 1 Langzeitlücke) und zu korrektem Recompute über alle 284 Pools (die produktive Top-100-Liste ist kein vollständiger Testnenner). Keine echte API-/Quote-/Paper-Order-End-to-End-Ausführung durch diese Tests.

## Weitere entscheidende Lücke
**D2-04 bleibt OFFEN**: Ein Code-Fix erzeugt keine neuen tatsächlichen Preis-Samples. Es müssen regelmäßig zwei und mehr echte zeitversetzte, vollständig identifizierte, archivierte Kursbeobachtungen je Pool vorliegen, ohne 429 zu provozieren. Ein unabhängiger Anbieter-/Quotezeit-/Sellability-Nachweis und die Client-BUY-/SELL-/Receipt-Abnahme fehlen weiterhin. Die API-Erfassung muss unabhängig von 4/8/12/24 GPT-Reviews stattfinden und die 100+-Kandidaten-Watchliste fair nachprüfen. Erst echte prospektive Captures mit Regression und unveränderlicher Provenienz dürfen diesen Punkt als abgeschlossen zählen.

Weder Excel-Gewinnernamen noch zukünftige Labels werden als aktuelle Kaufmerkmale benutzt; keine Dots aktiviert, keine Orders, kein Echtgeld, keine Änderungen an `main`/Legacy/Windows-Paper-Guthaben.

## 22.11.2026 – D2-04 Fortsetzung: echte WATCH-Lücken im bestehenden DEX-Budget nachprüfen

**Nachgewiesene Lücke:** Der Runner konnte `WATCH_INSUFFICIENT_REPEATED_EVIDENCE` und `WATCH_PRICE_OBSERVATION_GAP` feststellen, aber die vorhandenen DEX-Prüfplätze zuvor nur für HOT-Neufunde und allgemeine FAIR-Rechecks vergeben. Im letzten Originalcapture wurden 99 Gecko-Pooleinträge und nur 2 DEX-Paarprüfungen gespeichert; keine separate, zeitlich fällige Preis-Reparaturpriorität.

**Codeänderung ohne zweite Bot-Architektur:**
- `src/v19-evidence-repair-queue.mjs::planEvidenceRepairRechecks` generiert read-only Vorschläge aus zuvor gespeicherten vorwärtsgerichteten `R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS` und bestehenden `R29_PERSISTENT_MARKET_MEMORY`-Identitäten. Nur die beiden WATCH-Statusklassen sind erlaubt; letzter Capture muss mindestens **5 Minuten** und höchstens **120 Minuten** zurückliegen. Future- und Excel-/Oracle-Gewinner-Labels werden ausgeschlossen.
- Der **bestehende** `memory.rechecks`-Zeitcursor sperrt erneute Kurzintervall-Abfragen und sortiert nie geprüfte WATCH-Kandidaten vor wiederholt fehlerhaften Fällen. Alte 16h-Coins bleiben im normalen FAIR-Backlog, werden nicht als frische Signale ausgegeben.
- `src/v19-hot-fair-recheck.mjs` hat die Kategorien HOT / EVIDENCE_REPAIR / FAIR. Bei einem Budget von 2 DEX-Paarabfragen bekommt HOT einen Platz; der zweite wechselt zwischen REPAIR und FAIR. Bei höherem Budget können alle drei gleichzeitig berücksichtigt werden. Es gibt **keine** Erhöhung des bestehenden `request.max_dex_pairs`-Budgets und keine Doppelanfrage für denselben Pool im Run.
- `scripts/cloud-discovery-runner.mjs` liest vor dem vorhandenen DEX-Plan ausschließlich frühere gültige Forward-Observation-Batches, berechnet die as-of-Lücken über `scoreAsOf(..., maxCandidates:100000)` (damit nicht Top-100-Trunkierung die Warteschlange beschneidet), übergibt nur `repairProposal.selected` und protokolliert `metrics.v19_evidence_repair_rechecks`. Die Planner selbst senden keine HTTP-Anfrage, führen keinen GPT-Scan aus und schreiben keine Orders.

**Verifizierte Regression:** `test/v19-evidence-repair-queue.test.mjs`, `test/v19-hot-fair-recheck.test.mjs`, `test/v19-real-price-repair-handoff.test.mjs` inklusive read-only Original-November-Beobachtungen `research/observations/2026-11-22/45036887325.json`. Tatsächlicher Node-22-CI [#45041098328](https://github.com/127027/Sniperbot-/actions/runs/45041098328) auf Commit `d13784e51055114e951f417e4275d0d39edd83df`: **428/428 PASS, 0 FAIL, TEST_ONLY_NO_SIGNAL_WRITE 0**.

**Weiter offen:** Dies ist noch **kein** neuer echter Gecko-/DEX-Capture und kein Nachweis erfolgreicher zeitversetzter, authentischer Preisproben. D2-04 ist erst nach tatsächlichen wiederholten Provider-Erfassungen und externer Quote-/Sellability-/E2E-Prüfung vollständig abnehmbar. Kein 4–24 GPT-Reviews/Tag- oder Trading-/P&L-Erfolgsbeweis. Alle fünf Dots bleiben pausiert, keine Orders/kein Echtgeld, `main` und Windows-Guthaben unverändert. **Gesamtzähler unverändert 25/61 = 41,0 %.**
