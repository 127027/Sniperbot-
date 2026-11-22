# R29 – Originalabnahme aller 46 PARTIAL-Aufgaben und vorbereiteter nächster Backtest

**Datum:** 22.11.2026, nach kontrollierter Wiederaufnahme der kostenlosen öffentlichen Research-APIs. **Gültiger Branch:** `codex/r29-cleanroom-paper-20261121` im Repo `127027/Sniperbot-`. Alle Einträge wurden mit der **ursprünglichen 61-Aufgaben-Matrix**, nicht mit einer nachträglich vereinfachten Checkliste abgeglichen.

## 1. Verbindliches Qualitätsurteil

| Nachweisstufe | Zahl | Bedeutung |
|---|---:|---|
| PASS | **13 / 61 = 21,31 %** | Nach enger ursprünglicher Abnahme bereits bestätigt |
| PARTIAL | **46 / 61 = 75,41 %** | Code/Forschung vorhanden, vollständige ursprüngliche Abnahme fehlt |
| OPEN | **2 / 61 = 3,28 %** | Echtes unabhängiges Dot3-Risikoissuer-Gate (`D3-04`) und Onchain-Sellability (`D3-05`) |
| PASS + PARTIAL | **59 / 61 = 96,72 %** | **Nur technisch berührt**, weder reale Profitabilität noch Handelsfreigabe |

**Diese Runde hat 46/46 PARTIAL-Aufgaben einzeln auf die ursprüngliche Abnahmevoraussetzung und den nächsten überprüfbaren Beleg abgeglichen.** In diesem Arbeitsschritt wurde **keine** der 46 Aufgaben ohne passenden externen Vollnachweis zu PASS umgestuft.

**Aktuell grüne Node22-CI:** [GitHub #45065041171](https://github.com/127027/Sniperbot-/actions/runs/45065041171), Quellcommit `ad5313f17fc3ad15f56deb4a7174d9fe9d925440`: **612/612 Tests PASS, 0 FAIL, TEST_ONLY_NO_SIGNAL_WRITE 0**, 46/46 Prüfeinträge, alle neuesten Raw-SHA256 verifiziert. Es sind 30-Tage-GitHub-Actions-Artefakte; die durable Abnahme-Methodik liegt in `src/v19-partial-acceptance-readiness.mjs` und `scripts/v19-audit-all-partials-and-backtest-readiness.mjs`.

## 2. Neue echte, budgetierte GitHub-Marktdaten seit 21 Uhr MEZ

**Capture 1 – [#45064131641](https://github.com/127027/Sniperbot-/actions/runs/45064131641), 20:02:39 UTC:** Das wegen HTTP429 seit 18:54 UTC fehlende **Base/new_pools Seite 2** wurde nach dokumentiertem 20:54:35-MEZ-Cooldown wirklich mit **HTTP200** repariert. **19 valide Pools und 2 HTTP200-DEX-Abfragen**, persistierte Memory **488 → 507**, Dot2 erstmals verifiziert **79 → 98**. 7/7 RSS/Social HTTP-Abrufe mit 225 entnommenen Ereignissen. Originale Base429-Error-Bytes bleiben archiviert.

**Capture 2 – [#45064898786](https://github.com/127027/Sniperbot-/actions/runs/45064898786), 20:10:40 UTC:** Gecko **Ethereum Seite 4 und BSC Seite 1 jeweils HTTP200**, **39 weitere valide Pools und 2 HTTP200-DEX-Quotenrechecks**, persistierte Memory **507 → 546**, Dot2 erstmals verifiziert **98 → 137**. 7/7 freie Medien-/Social-Quellen mit 227 Ereignissen. Beide API-Captures `BOUNDED_SAMPLE_COMPLETE_COVERAGE_INCOMPLETE`, kein 429 in diesen beiden Läufen, **0 GitHub-Orders und 0 lokale Paper-Fills**. Beide Ergebnisse und Rohantwort-SHA sind unter `research/feeds/2026-11-22/<run_id>/` gespeichert, auch weiterhin die früheren 488 Pools.

**Providerbudget:** Nach Capture 2 Gecko zuletzt HTTP200 und kein aktiver 429-Cooldown. Das begründet **keine unbegrenzte API-Freigabe**; rolling provider/endpoint caps und `Retry-After` gelten weiterhin. Sechs Chains haben zumindest einzelne Seiten, keine bekannte vollständige globale Memecoin-Abdeckung. Die Anzahl noch nicht besuchter Seiten bleibt eine eigene Warteschlange. Gleiche Pool-ID, aktueller Kurs und nachweislich vom Provider datierter Kurs sind drei verschiedene Anforderungen.

## 3. Alle 46 verbliebenen ursprünglichen Akzeptanzkriterien

Die Tabelle nennt jeweils das **unveränderte Original-Abnahmekriterium** und die **nächste fehlende überprüfbare Arbeit**. Ein `PARTIAL` ist kein erledigter Echtgeld-/Paper-Trade.

### A. Provider, Paging, Archiv und sechs Chains (13)

| ID | Original-Abnahme | Noch fehlender, überprüfbarer Nachweis |
|---|---|---|
| **SYS-05** | Mindestabdeckung aller sechs unterstützten Chains in definierten Zeitfenstern, 429-resume ohne verlorene Seite | Repeat small six-chain bounded captures across consecutive windows; audit failed-page resume and complete candidate queue. |
| **SYS-10** | Nach Neustart und Monaten gleicher Replay-Hash ohne überschriebenen alten Beleg | Prove immutable evidence replay after restart across months; do not mistake temporary Actions gzip artifacts for permanent storage. |
| **SYS-11** | Simulierter 429-Kaskadentest und Fortsetzung ohne Kandidatenverlust | Exercise additional real cooldown/retry windows and verify no silent provider-limit or page loss. |
| **SYS-14** | Ressourcenbericht je Dot/Chain/Stunde; fehlende Messwerte = null, nicht 0 | Measure multi-hour provider/queue/GPT and Actions cost; missing financial and token readings remain null. |
| **D1-04** | 4 Vollreviews und dennoch viele dokumentierte Preis-/Positionsbeobachtungen | Provide actual independent frequent quote/position monitoring while full GPT reviews remain only 4 in a real day. |
| **D1-05** | 6 Chains mit Coverage %, P95-Wartezeit und Max Backlog-Age | Measure real six-chain coverage and P95 wait/max page backlog aging across subsequent provider windows. |
| **D2-01** | Alle sechs Chains erreicht, auch Robinhood/Solana in 5h-Warmup und Test | Prove all six chains receive scheduled and HTTP200 page captures in the specified warmup/evaluation window. |
| **D2-02** | Page1..N geprüft, Deckung/Unsicherheit je Chain, deduplizierte vollständig gespeicherte IDs | Verify each requested page in a bounded shifting-offset page set and preserve missing page IDs for retry. |
| **D2-04** | Von zeitgerecht vorhandenen Preisen aus mindestens zwei getrennten Zeitpunkten valide Features | Capture at least two real same-pool price observations separated in time; retro-OHLCV must remain separate from original as-of. |
| **D2-05** | Erst im Vortag/älter erschaffener Ausbruch wird entdeckt, nie aus Zukunftsliste eingespeist | Obtain real older-pool reactivation observations available before any decision and compare to never-seen prior pools. |
| **D2-07** | P95 Fresh-to-Risk-Latenz, keine Starvation, definierte Hot-SLA | Measure Hot versus Fair queue P95 fresh-to-risk and ensure no starvation of old/negative pools over multiple captures. |
| **D2-08** | Kein Kandidat geht vor Ranking still unter; Top-K zeitgerecht erneut prüfen | Track every original pool through ranking/deferred/hot-recheck queue and verify no truncation before Top-K. |
| **QA-03** | Keine still verschwundenen Kandidaten, endliche Backlogs und wiederaufnehmbare Cursors | Run multi-window six-chain paging/429 provider recovery, demonstrating preserved pending pages across restarts. |

### B. Historische Quellenidentität und Risiko (7)

| ID | Original-Abnahme | Noch fehlender, überprüfbarer Nachweis |
|---|---|---|
| **SYS-07** | Falsche Hashstrings und nachträglich datierte Captures werden nicht als Originale akzeptiert | Recheck every original raw byte/hash/Git-blob and timestamp; require independently authenticated October capture time before claiming it. |
| **D2-03** | 65 Referenzen einzeln klassifiziert, keine erfundenen IDs | Resolve or explicitly quarantine all 65 post-event identities using exact typed chain/pool/token, never winner symbols for entry. |
| **D2-10** | Robinhood, Solana, BSC, ETH, Cronos jeweils erfolgreiche negative/positive Contract-Prüfung | Validate exact onchain typed chain, contract and pool matching for the five provider chains, including negative cases. |
| **D3-02** | Quellpaar gültig nur bei identischem Token/Pool und wahrheitsgemäßem As-of; keine perma-blocked-only Chains | Prove distinct underlying upstream prices rather than merely two HTTP hostnames for exact same market. |
| **D3-03** | Frische echte Belege funktionieren, unbekannter Zeitstempel bleibt explizite Unsicherheit, kein falscher „geprüft“ | Independently verify upstream provider quote-as-of and source-age classes; never backfill timestamp from HTTP arrival. |
| **D3-06** | Abhängigkeitskurve erkannte Chancen / False BUY / simulierte Slippage dokumentiert | Compare pre-frozen size/slippage/risk sensitivities with neutral false-buy and missed-buy outcomes. |
| **D3-07** | Time-to-Risk und unblock-Quote pro Coin, Recheck führt tatsächlich zu Entscheidung | Measure genuine risk-unblock latency and evidence TTL from authorized recheck to final decision, with retries. |

### C. Tatsächliche fünf GPT-Dots und Review-Takt (9)

| ID | Original-Abnahme | Noch fehlender, überprüfbarer Nachweis |
|---|---|---|
| **SYS-08** | 5 Rollen mit Herkunft `SIMULATED` vs `GPT_EXECUTED` transparent, keine Phantom-Fills | Obtain actual signed distinct GPT review journals for five roles; keep deterministic model events separately marked. |
| **D1-01** | Gleiche 24h-Kohorte mit mehr/ohne Momentum führt nachweisbar zu verschiedenem Tempo | Compare matched 24h activity cohorts across high/low momentum to test rate response rather than one-page counts. |
| **D1-02** | DATA_GAP-Stunden erhöhen gezielt Datenerfassung statt stilles NO_TRADE | Demonstrate DATA_GAP → source retry, not quiet market, over a real review cycle. |
| **D1-03** | Erster Scan 24 möglich; 24→12→8→4 ohne Hysterese-Pendeln | Verify first GPT review can request 24 then hysteretically decrease 24/12/8/4 on genuine executed full reviews. |
| **D1-06** | Rechnung 4/8/12/24 tatsächlich messbar, keine fiktiven GPT-Scans | Compare actual GPT completion receipts, skipped reviews, token and cost accounting for 4/8/12/24. |
| **D1-07** | Prospektive Studie vor Schwellenänderung, nicht nur Gewinner-Oracle | Evaluate pre-frozen cost/utility thresholds prospectively using real reviews and independent outcomes. |
| **D4-01** | Identischer Input+Version+State → identische Aktion; echter Paper-Order-Publisher nur mit unabhängigen Prüfungen | Run same unified Dot4 decision through trusted signed Dot3 publisher and separately verified Paper-client receipt. |
| **D5-03** | Kein GPT-Trading-Erfolgsanspruch ohne tatsächlichen Dot-Output | Cross-check real GPT inputs, outputs and costs against deterministic simulated role timeline. |
| **D5-07** | Unbekanntes als `null` und nicht erfundene 100% Arbeit ausgeben | Measure real per-Dot tasks/queue/duration/P50/P95/errors/token costs, not approximate HTTP activity. |

### D. Neutrale Outcomes, Strategien und Holdout (9)

| ID | Original-Abnahme | Noch fehlender, überprüfbarer Nachweis |
|---|---|---|
| **SYS-12** | Recall/FPR nur mit festgelegtem Zähler/Nenner; not evaluated sonst | Create a frozen neutral complete as-of pool denominator, including negative and untradeable pools and honest unknown labels. |
| **D4-02** | Vorab eingefrorene Regeln vs unveränderte Baseline auf Holdout mit Gewinnern und Nichtgewinnern | Prospectively evaluate frozen momentum/volume/liquidity regimes against untouched baseline and losers. |
| **D4-03** | Gesamt-PnL inkl. Rückläufer/Slippage, nicht nur maximaler theoretischer Hochpunkt | Evaluate fixed TP, trailing, partial and timed exit including slippage on neutral matured paths. |
| **D4-05** | Weniger wiederholte Verlusttrades ohne systematisches Verschlafen von Rebounds | Study genuine realized loss lot and later reentry on neutral holdout without cherry-picked recoveries. |
| **D4-06** | Pro 1/3/6h Kalibrierung (Brier/ECE), Prognose-Null bei unzureichend gelabeltem Nenner | Score 1/3/6h endpoint, observed intrahorizon peak and drawdown on dense time-matured neutral paths. |
| **D5-01** | Excel-Oracles im getrennten Eval-Container, nie im Dot2/Dot4-Entry-Input | Join 65 winner oracle references only after decision end to a complete unselected October pool denominator. |
| **D5-04** | Detaillierter Grund jeder Fehlchance mit konkreter nächster Gegenmaßnahme | Verify each claimed missed opportunity with actual event+outcome evidence; leave unmeasured profit null. |
| **D5-05** | 1/3/6h Brier, Accuracy, Precision, Recall, MAE, Coverage und Missing-Label-Quote | Evaluate 1/3/6h mature positive/negative holdout cohorts with purging and frozen predecision parameters. |
| **QA-05** | Keine Nachoptimierung am Holdout, vorher gefrorene Regeln, belastbarer Nenner | Wait for genuine frozen Nov prospective validation+holdout windows and score a complete neutral denominator. |

### E. Reale Windows-Paper-Quittungen (8)

| ID | Original-Abnahme | Noch fehlender, überprüfbarer Nachweis |
|---|---|---|
| **SYS-09** | Vor-/Nachher-Guthaben und Dateien identisch; Backtest-Receipt trägt Forschungskennung | Obtain independent read-only before/after hashes of the existing Windows paper account; do not operate on its files here. |
| **D4-04** | Zwischen GPT-Reviews Stop-/Takeprofit-Ereignisse, bei fehlender Quote **kein** PAPER_FILLED | Demonstrate real read-only independent position monitoring and protected exit between GPT reviews; no quote=no fill. |
| **D4-08** | Einmalige Positionsschließung, kein negativer Cash, kein Phantom-Fill oder Fake-Stop | Prove STOP+Dot4 concurrent SELL idempotent within actual client order/accept/fill/blocked/receipt chain. |
| **D4-09** | UI-PAPER nur echte gespeicherte Zustände, alle offenen Positionen nachvollziehbar | Verify real dashboard shows all open client positions and last known quote/risk/receipt age with no fabricated fill. |
| **D5-02** | Jede Entscheidung und jedes Loch auf einen `event_id` zurückführbar | Provide signed end-to-end event lineage from original source and risk through actual decision, order and receipt. |
| **D5-06** | Summen je Ledger und niemand liest `0 DATA_GAP-Trades` als 0%-Performance | Prove original Oracle, synthetic model and real client-Paper profit ledgers never mix and source-specific totals reconcile. |
| **QA-01** | Identischer BUY/WATCH/HOLD/SELL, Gründe, Quote-/Risk-Block; anderes Datum nur im as-of-Gate | Demonstrate same versioned state and input has equal action/reason in historical/current modes with independent risk proof. |
| **QA-04** | Hash/Stamps, Cash/Position/Receipts lückenlos, kein Kontakt zum wirklichen lokalen Paper-State | Perform isolated true October 29h E2E with source-time-authenticated neutral population and separate client-level receipts. |

## 4. Nächster Backtest: exakt zwei strikt getrennte Prüfpfade

### A – Historischer 29-Stunden-Test Oktober 2026

- Fester Backtestbereich: **11.10.2026 19:00 UTC bis 13.10.2026 00:00 UTC**, inklusive 5h Warmup / 24h Entscheidung.
- Authentische, **damals bereits verfügbare**, unselektierte Oktober-Pool-/Contract-/Quote-/Sellability-Snapshots: weiterhin **nicht nachgewiesen**. Die echten heutigen November-HTTP-Snapshots dürfen nicht rückdatiert werden.
- Die 65 bekannten Gewinner bleiben außerhalb der Discovery-/Strategie-Eingaben und werden erst nach Ende des historischen Entscheidungsfensters evaluiert.
- **Aktuelle Abnahme:** Ein technischer Offline-29h-Replay ist möglich, die einzig seriöse Original-Datenausgabe bei 0 historischen Originalmarktdaten ist aber **24/24 DATA_GAP und 0 BUY/SELL**. Ein neuer solcher Test wäre nur eine erneute Infrastrukturprüfung, kein echter Rendite-Backtest.

### B – Prospektiver eingefrorener November-Holdout

- Originaler unveränderter Rule-Freeze: **22.11.2026, 18:54:05.033 UTC**.
- Validierungsfenster: **23.11.2026 00:54:05 bis 24.11.2026 00:54:05 UTC**.
- Eigentliche Holdoutphase: **24.11.2026 06:54:05 bis 25.11.2026 06:54:05 UTC**.
- **Erst nach Ende 25.11.2026 06:54 UTC** und mit verifizierter, neutraler Positiv-/Negativ-Kohorte, ausreichend 1/3/6h gereiften Labels und unabhängigen Preis-/Risk-Provenienzen lässt sich die Güte belastbar messen. Dieser Stichtag allein garantiert noch keine vollständige Datenlage.
- Der auf GitHub archivierte 4/8/12/24-Reviewplan dient der künftigen GPT-Kosten-/Aktivitätsauswertung; bloß stündlich ausgeführter API-Code erzeugt **keine echten fünf GPT-Review-Quittungen**.

### Unverzichtbare Release-Gates vor einer Paper-Order

1. Ein identischer getypter Chain/Pool/Contract, unveränderliche Originalbytes und unabhängige Quote-As-of-Zeit.
2. Zwei wirklich unabhängige aktuelle Liquiditäts-/Preisquellen, nicht nur zwei Webseiten mit identischem Upstream.
3. Unabhängig authentifizierte Dot3-Sicherheits-/Issuerbelege und erfolgreich verifizierte Onchain-Sellability.
4. Autorisierte versionierte Dot4-Entscheidung, einmalige idempotente Order, tatsächlicher Akzeptanz-/Fill-Receipt vom vorhandenen Windows-Paper-Client; kein Überschreiben der bestehenden 5.000 TEST-USDC bzw. 50 TEST-USDC/Coin durch den Replay.
5. Getrennte Ergebnisledger für künstliche Modelltrades, reine Oracle-Obergrenzen und tatsächliche lokale Paper-Quittungen. Fehlende Daten bleiben `null`/`DATA_GAP`, nicht „0 % Performance“.

## 5. Aktuelle fünf GPT-Dots

Die fünf vorhandenen ChatGPT-Aufgaben wurden geprüft: **alle derzeit pausiert**. Ihre gespeicherten alten Prompts enthalten inzwischen veraltete 70-%-Prozentwerte, frühere 429-Zeitangaben und mehrfach die ausdrückliche Anweisung, deaktiviert zu bleiben. **Diese Runde hat die öffentliche Research-API-Erfassung via GitHub wirklich wieder aufgenommen, aber nicht stillschweigend fünf widersprüchliche stündliche GPT-Automationen reaktiviert.** Für deren sichere tatsächliche Wiederaufnahme müssen die vorhandenen Prompts auf den aktuellen Cleanroom und fail-closed Research-only-Gates vereinheitlicht werden. Das ist getrennt von der inzwischen funktionierenden Github-Marktdatenerfassung. Insbesondere dürfen keine tatsächlichen Paper-BUY/SELL-Signale aus den noch ungeprüften Dot3-Daten geschrieben werden.

**Offen zur echten Abnahme bleiben:** unverfälschte neutrale historische Oktober-Quellen, prospektive mehrtägige Originalbeobachtung, bestätigte fünf GPT-Rollenläufe, unabhängige Chain-Sicherheitsbeweise und Windows-Client-Quittungen. 612 grüne Softwaretests sind keine 612 echte GPT-Entscheidungen.
