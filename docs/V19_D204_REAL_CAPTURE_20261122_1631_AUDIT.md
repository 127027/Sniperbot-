# R29 V1.9 – Tatsächlicher 22.11.2026-Research-Capture und Folgeregression

**Arbeitsbereich:** Nur `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`. Ausschließlich öffentliches Research und Paper-Nachweis; **keine fünf Dots aktiviert, kein Echtgeld, keine Orders oder Änderung der bestehenden Windows-Paper-Kasse**.

## 1. Chronologie, getrennt nach wirklicher Ausführung

1. **Erster kontrollierter Versuch**: request `research/requests/2026-11-22/20261122T162607Z-v19-d204-real-six-chain-repair.json`, Workflow [#45043861696](https://github.com/127027/Sniperbot-/actions/runs/45043861696), **FAILED** bei JSON.parse in `scripts/cloud-discovery-runner.mjs:485`. Die alte Datei `research/state/dot1-cadence-advice.json` enthielt den ungültigen wörtlichen ASCII-Abschluss `5c6e` (Backslash plus n) statt einem echten Zeilenumbruch. Es gab vermutlich Netzwerkversuche, jedoch **KEINE versioniert veröffentlichten Ergebnisse** aus diesem fehlgeschlagenen Workflow: keine HTTP200-Quote der einzelnen Versuche behaupten.
2. **Nachgewiesene zweite Ursache:** Der produktive Reader suchte mit einem doppelt escapten Regex nach `research/observations/*.json` und `*-activity-pages.json`; die vorhandenen Archivdateien wurden still **nicht** gelesen. Die historisch gesicherte Datei `research/observations/2026-11-22/45036887325-activity-pages.json` enthielt ebenfalls den wörtlichen ungültigen Abschluss. Neues Modul `src/v19-observation-archive-reader.mjs`: echte Suffix-Übereinstimmung statt fragiler Regex, streng begrenzte Legacy-`5c6e`-Wiederherstellung **nur bei sonst vollständig gültigem JSON**, mit expliziter Audit-Metrik. Original-Archivdateien wurden **nicht** überschrieben. Zwei JSON-Schreibstellen im Runner erzeugen nun echte Newlines. Die mutable Dot1-Cadence-Datei wurde durch die erfolgreiche erneute Ausführung korrekt neu geschrieben.
3. **Zweiter kontrollierter Versuch:** request `research/requests/2026-11-22/20261122T163116Z-v19-d204-archive-repair-retry.json`, Workflow [#45044300013](https://github.com/127027/Sniperbot-/actions/runs/45044300013) **COMPLETED/SUCCESS**, **echter** Cleanroom-Datencommit `9859a3c4f43d0c3dbdf7f1d041d9d8a74a245bae`. Echte Quelle: `research/feeds/2026-11-22/45044300013/evidence.json`, letzte versionierte Zeigerdatei `research/feeds/latest.json`, Observer `research/observations/2026-11-22/45044300013.json`, as-of-Ranking `research/observations/2026-11-22/45044300013-asof-ranking.json`.
4. **Danach ausschließlich Code/Tests**, keine erneuten öffentlichen API-Aufrufe: transparentes REPAIR-Outcomes-Protokoll, as-of-Liquiditätspriorität, dokumentiertes ETH-Gap-Retry nach Cooldown. Erfolgreicher GitHub-Actions-Node22-Test [#45044910257](https://github.com/127027/Sniperbot-/actions/runs/45044910257), Quellcommit `8b2df70e0b681d0ebd254581c548e7fb84ff452f`: **441 von 441 Tests bestanden, 0 Fehler, TEST_ONLY_NO_SIGNAL_WRITE 0**. Diese Green-CI-Aussage ist **kein** weiterer echter Capture oder Handelsnachweis.

## 2. Ergebnisse des einzigen erfolgreichen echten Capture #45044300013

| Gemessen | Belegbarer Istwert |
|---|---|
| Angeforderte Chains | Solana, Base, Ethereum, BSC, Robinhood, Cronos (6) |
| GeckoTerminal-HTTP-Abfragen | 6 mit mindestens 6,1 s Abstand zwischen Starts |
| HTTP 200 | 5: BSC, Robinhood, Cronos, Solana, Base |
| HTTP 429 | 1: **Ethereum Seite 1**, erfasst 2026-11-22T16:31:56.465Z |
| Provider-Header | `Retry-After: 0`; lokales Sicherheits-Backoff überschreibt diesen Nullwert |
| Persistierte erneute Anfragesperre | **2026-11-22T18:31:56.465Z** (19:31:56 MEZ) |
| Gültig dekodierte Gecko-Pooleinträge | **79**, dazu **1 ausdrücklich verworfene Parserzeile** |
| DEXScreener HTTP-200-Paar-Requests | **4** |
| DEX-Pair genau identifiziert | **3**, aber nur **1** mit indikativem Zwei-Provider-Research-Status |
| DEX-HOT/FAIR/REPAIR | **2 HOT / 1 FAIR / 1 REPAIR** tatsächlich geplant und abgefragt |
| EHUNT-REPAIR (Cronos, `0x1620e73ff3494ee3d67522a0ec3be0e2e5152243`) | DEX `HTTP200`, aber **0 zurückgegebene Paare** / `NO_MATCHING_CHAIN_POOL_BASE_TOKEN`, **kein** frischer validierter zweiter Preis |
| Letzte vorherige EHUNT-Liquidität | **0,0005 USD** in der archivierten 15:11-Observation; schlechte DEX-Budgetpriorität |
| Alter as-of-Research-Replay vor diesem Capture | 284 eindeutige Pools, 100 fällige REPAIR-Kandidaten an die Auswahl angeboten |
| Neue nachträgliche as-of-Liste um 16:31:57Z | **360** beobachtete eindeutige Pools; davon **1 research-rankbar: URPS / Base**, **nicht risk- oder handelsberechtigt** |
| Andere as-of-Fälle | **184** alte Captures, **18** überlange Preisvergleichs-Abstände, **157** weitere unzureichende wiederholte Daten |
| Dot3-Statuspreview | **58 WATCH, 21 DATA_GAP, 0 PAPER_ELIGIBLE** |
| Dot1-Advisory | Empfehlung **12 GPT-Reviews/Tag** aus der Zustandsmaschine, **0 tatsächlich ausgeführte GPT-Reviews** |
| Verifizierte lokale Paper-Fills / Order-Veröffentlichungen | **0 / 0** |

**Integrität:** `source_integrity.checked=10` Rohantworten wurden auf Belege geprüft, `0` Rejected; der eine HTTP-Fehler wird im Report ausdrücklich als Fehler gezählt. `metrics.v19_legacy_json_suffix_recovery` protokolliert die Wiederherstellung des original ungültigen Dot1-State-Suffixes sowie der alten Activity-Datei, **ohne** die Archive zu überschreiben. HTTP-Capturezeit ist **nicht** unabhängig verifizierte Provider-Quotezeit; weder vollständige Marktabdeckung noch Preis-Ausführbarkeit ist dadurch belegt.

## 3. Technische Gegenmaßnahmen nach dem echten Befund

- `src/v19-discovery-budget-plan.mjs`: Ein zuvor fehlgeschlagener Page-Cursor **mit nachweislich abgelaufener gespeicherter Retry-Frist** wird beim nächsten (erst dann zulässigen) Multi-Chain-Plan vor den normal rotierenden Chains gezogen; der alte ETH-Retry soll dadurch nicht abermals erst als sechster Request an die Rate-Grenze geraten. **Keine** Verringerung von HTTP-429 bestätigt, bis ein späterer echter Capture vorliegt.
- `src/v19-recheck-service-metrics.mjs`: Separate real eingetretene `EVIDENCE_REPAIR`-Requests, P50/P95-Wartezeit, Statusverteilung, Indikativquoten und `NO_MATCHING_CHAIN_POOL_BASE_TOKEN`. Ein DEX-HTTP200 mit null Paaren ist **kein** validierter Marktpreis.
- `src/forward-learning.mjs::scoreAsOf`: gibt jetzt die tatsächliche `latest_observed_liquidity_usd` aus dem bereits bekannten Capture an den Forschungs-Trichter weiter (nicht aus der Zukunft).
- `src/v19-evidence-repair-queue.mjs`: begrenztes REPAIR-Prioritäts-Tiering nach zuvor beobachteter Liquidität und positivem Marktvolumen. **≥5.000 USD** ist die **vorläufige bestehende Research-Liquiditätsgrenze**, keine Gewinngarantie/Buy-Autorisierung. Tiefe oder fehlende Liquidität bleibt in der Watchlist; nur das knappe unmittelbare DEX-Preisprüfbudget geht vorrangig an Pools mit höherer beobachteter Marktqualität. Innerhalb eines Tiers bleibt die Fairness anhand des letzten Recheck-Zeitpunkts bestehen.
- `scripts/cloud-discovery-runner.mjs`: `selected_for_actual_dex_attempt` ist weiterhin die Slot-Planung, zusätzlich werden jetzt separat `actually_attempted_dex_checks`, `actual_dex_response_count`, `exact_pair_responses`, `new_observed_repair_prices`, `attempt_status_counts` geschrieben; vergangenes 16:31-Artefakt bleibt **unverändert**, neue Attribute gelten erst für kommende Captures.
- Regressionen: `test/v19-observation-archive-reader.test.mjs`, `test/v19-multichain-discovery-budget.test.mjs`, `test/v19-recheck-service-metrics.test.mjs`, `test/v19-evidence-repair-queue.test.mjs`, `test/v19-real-price-repair-handoff.test.mjs` mit ursprünglicher zeitgerechter Preisbeobachtung und echten Provider-HTTP-Belegen.

## 4. Abnahme und Grenzen

**D2-04 bleibt OFFEN**: Der Code kann nun fehlende Kursbestätigungen aktiv anfragen und hat **eine reale REPAIR-Abfrage** durchgeführt, aber **kein gültiges REPAIR-Paar** in diesem Capture erhalten. Um Robustheit tatsächlich zu beweisen, weitere Prospektiv-Captures nach providerkonformer Freigabe mit wiederholten echten Kursen, exakter Paar-/Tokenidentität und unabhängiger Provider-/Quotezeit-Sicherheit. Unbekannte/fehlende Paare nicht als `NO_TRADE` im Sinne eines erfolgreichen Modells zählen.

**SYS-11 bleibt OFFEN**: Wiederholter ETH-HTTP429 zeigt, dass 6,1s Pacing **nicht zuverlässig** für alle sechs Chain-Anfragen reicht. Anbieterweite Sperre bis mindestens 18:31:56.465 UTC respektieren. Keine weitere Api-Ausführung oder unbeaufsichtigte Dot-Aktivierung im Rahmen dieses Updates. Einer späteren Messung sind konservativere Request-Abstände und Abfolge vorab prüfbar vorzuschlagen.

**Gesamter Projektstand unverändert 25/61 = 41,0 % technisch abgeschlossen, 36 offen.** Keine künstliche Erhöhung nach einer nur teilweise erfolgreichen Marktprobe und keinem einzigen Client-Fill. Nächstes echtes Ziel: abgelaufenen ETH-429-Proof mit echtem neuen HTTP200 prüfen sowie repräsentative hoch- und niedrigliquide, zeitversetzte Recheck-Kandidaten samt Negativfällen verfolgen. Historische Excel-Gewinner dürfen zu keinem Zeitpunkt in as-of-Einstiegssignale gelangen.
