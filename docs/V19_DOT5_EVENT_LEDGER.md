# R29 V1.9 – D5-02: neutraler, nachvollziehbarer Ereignistrichter

**Stand 22.11.2026 | Branch `codex/r29-cleanroom-paper-20261121` | COMPLETE (targeted), Gesamt-CI noch offen**

## Ziel

Dot 5 soll **jeden beobachteten Pool und jede erkennbare Datenlücke** über eine nachvollziehbare Ereignis-ID verfolgen, ohne eine Gewinnerliste, bekannte spätere Kursverläufe oder angebliche Paper-Fills in die Entscheidungen von Dot 2/3/4 einzuspeisen.

`src/v19-dot5-event-ledger.mjs` enthält `buildDot5DiscoveryLedger` und `annotateDot5ResearchEvent`. `scripts/cloud-discovery-runner.mjs` archiviert nach dem **bestehenden** Dot2-Handoff und der **bestehenden** Dot3-Statusvorschau künftig `research/feeds/<date>/<run_id>/dot5-neutral-event-ledger.json` und schreibt dessen Pfad in `research/feeds/latest.json`. **Keine** Bestellung, kein zusätzlicher Dot und keine Wallet-Aktion.

## Event-Vertrag

Jeder angenommene Kandidat besitzt eine deterministische `event_id`, Chain, getypten Pool, Contract (oder null), Token-Symbol, tatsächlich beobachtete Source-Chain/-Page/-Row/-Pool-ID, `first_seen_in_this_capture_at_utc`, separat `source_available_at_utc`, die beobachtete (aber nicht independently attestierte) Dot3-Risikovorschau, Status und Begründung. `forecast`, `order`, `client_receipt` und `outcome` sind **null**, solange ein entsprechender realer Nachweis fehlt; kein hypothetisches `BUY` oder `PAPER_FILLED`. Ein später bloß behaupteter Forecast/Order/Receipt wird ausschließlich als `DOT5_UNVERIFIED_CLAIM` protokolliert und **nicht** zu einem bestätigten Trade hochgestuft.

Jede vom Quellparser abgewiesene Poolzeile bleibt als `DISCOVERY_REJECTED` einschließlich ursprünglicher `source_pool_id`, Chain, Seite, Zeilennummer, Rohdateipfad und Ablehnungsgrund erhalten. Das ist **kein** Beweis, dass der Coin tatsächlich unhandelbar ist. Bei mehreren Chains/Seiten enthält die Aggregation alle `rejected`-Zeilen statt sie wie zuvor zu verwerfen. Fehlt der eigentliche Pool-Identifier, wird eine seiten- und capture-spezifische ID verwendet, um keine fiktiv identische Pool-Identität über verschiedene Abrufe hinweg anzunehmen.

Fehlgeschlagene HTTP-Seiten inklusive `HTTP_429` werden als `PAGE_CAPTURE_FAILED`, nicht durchgeführte zurückgestellte Seiten als `PAGE_CAPTURE_DEFERRED` protokolliert. Diese Ereignisse erhalten **keinen** Pool, Contract oder handelbaren Kurs. Selbst wenn kein Gecko-Capture erfolgreich war (`gecko:null`), bleibt ein aussagekräftiges Gap-Protokoll erhalten.

## Konkreter historisch archivierter Beleg

Quelle ist die tatsächlich in GitHub archivierte **Ethereum-Seite 3 vom 22.11.2026, 08:19 UTC**:
- `research/feeds/2026-11-22/45002280249/evidence.json` und
  `research/feeds/2026-11-22/45002280249/dot2-to-dot3-handoff.json`;
- 20 Quellzeilen, davon **2** übernommene Kandidaten (**Bigfoot**, **Mfer**) und **18** mit `POOL_ADDRESS_MISSING_OR_INVALID` dokumentierte Einträge;
- alle 18 abgewiesenen Zeilen besitzen in diesem Originaldatensatz eine `source_pool_id` sowie den `dex_id=uniswap-v4-ethereum`. Das ist ein **konkreter Parserverlust**, nicht ein Beweis für 18 gute handelbare Coins;
- 0 belegte eigenständige GPT-Reviews, 0 verifizierte Orders oder Client-Receipts und keine Information über einen nachweislich vollständigen Markt-Nenner.

**Es wurden keine dieser Ereignisse rückwirkend als im Oktober bekannt umetikettiert.** Der 22.-November-Originalcapture wurde zur Funktionsprüfung retrospektiv erneut gelesen. Eine retrospektiv erzeugte Ereignisauswertung ist selbst **kein** original zu dieser Zeit laufender Dot5-Report.

## Prüfung und offene Grenzen

`test/v19-dot5-event-ledger.test.mjs` enthält **10 Node-Regressionstests** gegen das echte archivierte Dateipaar und synthetische Mehrseiten-, 429- und Zukunftszeit-Fälle. **13 von 13 gezielten isolierten Funktionsprüfungen** am aktuellen Code mit archiviertem Datensatz und einem zusätzlichen deterministischen V8-Hash-Mock bestanden; Syntaxprüfungen von Modul, Runner und Testdatei ebenfalls erfolgreich. Der Mock demonstriert Event-Identität/Dedupe, ist **kein** kryptografischer SHA-256-Nachweis. Die Node-Testdatei nutzt dagegen tatsächlich Node `createHash('sha256')`. **Der gesamte `npm test`-/GitHub-Actions-Run ist weiterhin nicht als erfolgreich nachgewiesen (QA-06).**

**Offen über D5-02 hinaus:** Echte Ausführungs- und Issuer-Nachweise für positive Dot3-Freigaben, reale Order/Receipt-Verknüpfungen (D3-04, D4-08), kalibrierte Prospektivprognosen (D5-05) und vollzählige Marktpopulation/Recall-Messung (D5-01/SYS-12). Jedes `null` ist ausdrücklich eine unbekannte oder nicht nachgewiesene Tatsache, nicht der Zahlenwert Null.

**Aufgabenzähler nach dem gezielten Abschluss: 23/61 = 37,7 %, 38 offen.** Fünf Dots pausiert, Cleanroom only, keine Echtgeld-/Paper-Order aktiviert, kein Eingriff in `main` oder das bestehende Windows-Paper-Konto.
