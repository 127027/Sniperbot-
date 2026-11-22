# R29 – Vollständige Restbaustellenliste mit 48 Originalabnahmen

**Stand:** 22. November 2026 · **Repo/Branch:** `127027/Sniperbot-` / `codex/r29-cleanroom-paper-20261121`.

**Verbindlich:** Nicht "noch 3 %" bis fertig. Es gibt 13 streng abgenommene Originalaufgaben und **48 nicht vollständig abgenommene**, davon **47 Umbau** plus **QA-04 abschließender 29h-Backtest**. Die 59/61 = 96,72 % werden nur als *technisch bearbeitet* bezeichnet. Das nachträglich ermittelte Konto kann nicht allein durch Unit-Tests abgenommen werden.

**Freigabereihenfolge:** Alle **60 Nicht-Backtest-Originalaufgaben** tatsächlich mit authentischen Originalbelegen PASS, davor jederzeit Research ohne Orders erlaubt. Dann Backtest QA-04 auf unabhängig bestätigtem neutralem as-of Marktuniversum durchführen; erst danach kann insgesamt 61/61 geprüft werden.

**Absolute Stopps:** Echte unabhängig signierte Dot3 Risk-Issuer-/Quellenbelege (`D3-04`), verifizierte chain-spezifische Sellability (`D3-05`), echte Windows Paper-Client-Quittungen und vollständiges positives/negatives historisches oder prospektives Marktuniversum. Fehlende originale Oktober-Quellen kann niemand rückwirkend als damalige Beobachtung verifizieren. Alle fünf Dot-Automationen sind Research-only. **Kein Backtest oder Orderwrite in dieser Arbeit.**

## Sämtliche ursprünglichen offenen Original-Abnahmekriterien

Die Tabelle enthält pro Aufgabe die Original-ID, ursprüngliche Abnahme und den nächsten **extern oder technisch tatsächlich überprüfbaren** Schritt. Jeder Eintrag bleibt bis dahin PARTIAL bzw. OPEN.

### Scanner, sechs Chains, Archiv und API-SLA (13)

| ID | Status | Ursprüngliche Abnahme | Fehlt für PASS |
|---|---|---|---|
| **SYS-05** | PARTIAL | Mindestabdeckung aller sechs unterstützten Chains in definierten Zeitfenstern, 429-resume ohne verlorene Seite | Repeat small six-chain bounded captures across consecutive windows; audit failed-page resume and complete candidate queue. |
| **SYS-10** | PARTIAL | Nach Neustart und Monaten gleicher Replay-Hash ohne überschriebenen alten Beleg | Prove immutable evidence replay after restart across months; do not mistake temporary Actions gzip artifacts for permanent storage. |
| **SYS-11** | PARTIAL | Simulierter 429-Kaskadentest und Fortsetzung ohne Kandidatenverlust | Exercise additional real cooldown/retry windows and verify no silent provider-limit or page loss. |
| **SYS-14** | PARTIAL | Ressourcenbericht je Dot/Chain/Stunde; fehlende Messwerte = null, nicht 0 | Measure multi-hour provider/queue/GPT and Actions cost; missing financial and token readings remain null. |
| **D1-04** | PARTIAL | 4 Vollreviews und dennoch viele dokumentierte Preis-/Positionsbeobachtungen | Provide actual independent frequent quote/position monitoring while full GPT reviews remain only 4 in a real day. |
| **D1-05** | PARTIAL | 6 Chains mit Coverage %, P95-Wartezeit und Max Backlog-Age | Measure real six-chain coverage and P95 wait/max page backlog aging across subsequent provider windows. |
| **D2-01** | PARTIAL | Alle sechs Chains erreicht, auch Robinhood/Solana in 5h-Warmup und Test | Prove all six chains receive scheduled and HTTP200 page captures in the specified warmup/evaluation window. |
| **D2-02** | PARTIAL | Page1..N geprüft, Deckung/Unsicherheit je Chain, deduplizierte vollständig gespeicherte IDs | Verify each requested page in a bounded shifting-offset page set and preserve missing page IDs for retry. |
| **D2-04** | PARTIAL | Von zeitgerecht vorhandenen Preisen aus mindestens zwei getrennten Zeitpunkten valide Features | Capture at least two real same-pool price observations separated in time; retro-OHLCV must remain separate from original as-of. |
| **D2-05** | PARTIAL | Erst im Vortag/älter erschaffener Ausbruch wird entdeckt, nie aus Zukunftsliste eingespeist | Obtain real older-pool reactivation observations available before any decision and compare to never-seen prior pools. |
| **D2-07** | PARTIAL | P95 Fresh-to-Risk-Latenz, keine Starvation, definierte Hot-SLA | Measure Hot versus Fair queue P95 fresh-to-risk and ensure no starvation of old/negative pools over multiple captures. |
| **D2-08** | PARTIAL | Kein Kandidat geht vor Ranking still unter; Top-K zeitgerecht erneut prüfen | Track every original pool through ranking/deferred/hot-recheck queue and verify no truncation before Top-K. |
| **QA-03** | PARTIAL | Keine still verschwundenen Kandidaten, endliche Backlogs und wiederaufnehmbare Cursors | Run multi-window six-chain paging/429 provider recovery, demonstrating preserved pending pages across restarts. |

### Pool-Identität, Quellen und Risiko (9)

| ID | Status | Ursprüngliche Abnahme | Fehlt für PASS |
|---|---|---|---|
| **SYS-07** | PARTIAL | Falsche Hashstrings und nachträglich datierte Captures werden nicht als Originale akzeptiert | Recheck every original raw byte/hash/Git-blob and timestamp; require independently authenticated October capture time before claiming it. |
| **D2-03** | PARTIAL | 65 Referenzen einzeln klassifiziert, keine erfundenen IDs | Resolve or explicitly quarantine all 65 post-event identities using exact typed chain/pool/token, never winner symbols for entry. |
| **D2-10** | PARTIAL | Robinhood, Solana, BSC, ETH, Cronos jeweils erfolgreiche negative/positive Contract-Prüfung | Validate exact onchain typed chain, contract and pool matching for the five provider chains, including negative cases. |
| **D3-02** | PARTIAL | Quellpaar gültig nur bei identischem Token/Pool und wahrheitsgemäßem As-of; keine perma-blocked-only Chains | Prove distinct underlying upstream prices rather than merely two HTTP hostnames for exact same market. |
| **D3-03** | PARTIAL | Frische echte Belege funktionieren, unbekannter Zeitstempel bleibt explizite Unsicherheit, kein falscher „geprüft“ | Independently verify upstream provider quote-as-of and source-age classes; never backfill timestamp from HTTP arrival. |
| **D3-04** | OPEN | Gefälschte Order mit Feld `dots` reicht nicht; wirklicher Beleg verifizierbar | Independent trusted Dot3 risk-issuer source-byte, quote timestamp and signed order proof from the actual origin, never self-declared verified:true. |
| **D3-05** | OPEN | Besonders riskante Pools nicht Paper-füllen, aber Research-Entdeckung erhalten | Real per-chain/pool anti-honeypot, tax, blacklist and sell-route proof for a 50 TEST-USDC lot, with independent up-to-date source provenance. |
| **D3-06** | PARTIAL | Abhängigkeitskurve erkannte Chancen / False BUY / simulierte Slippage dokumentiert | Compare pre-frozen size/slippage/risk sensitivities with neutral false-buy and missed-buy outcomes. |
| **D3-07** | PARTIAL | Time-to-Risk und unblock-Quote pro Coin, Recheck führt tatsächlich zu Entscheidung | Measure genuine risk-unblock latency and evidence TTL from authorized recheck to final decision, with retries. |

### Fünf echte GPT-Dots und Review-Zeitplan (9)

| ID | Status | Ursprüngliche Abnahme | Fehlt für PASS |
|---|---|---|---|
| **SYS-08** | PARTIAL | 5 Rollen mit Herkunft `SIMULATED` vs `GPT_EXECUTED` transparent, keine Phantom-Fills | Obtain actual signed distinct GPT review journals for five roles; keep deterministic model events separately marked. |
| **D1-01** | PARTIAL | Gleiche 24h-Kohorte mit mehr/ohne Momentum führt nachweisbar zu verschiedenem Tempo | Compare matched 24h activity cohorts across high/low momentum to test rate response rather than one-page counts. |
| **D1-02** | PARTIAL | DATA_GAP-Stunden erhöhen gezielt Datenerfassung statt stilles NO_TRADE | Demonstrate DATA_GAP → source retry, not quiet market, over a real review cycle. |
| **D1-03** | PARTIAL | Erster Scan 24 möglich; 24→12→8→4 ohne Hysterese-Pendeln | Verify first GPT review can request 24 then hysteretically decrease 24/12/8/4 on genuine executed full reviews. |
| **D1-06** | PARTIAL | Rechnung 4/8/12/24 tatsächlich messbar, keine fiktiven GPT-Scans | Compare actual GPT completion receipts, skipped reviews, token and cost accounting for 4/8/12/24. |
| **D1-07** | PARTIAL | Prospektive Studie vor Schwellenänderung, nicht nur Gewinner-Oracle | Evaluate pre-frozen cost/utility thresholds prospectively using real reviews and independent outcomes. |
| **D4-01** | PARTIAL | Identischer Input+Version+State → identische Aktion; echter Paper-Order-Publisher nur mit unabhängigen Prüfungen | Run same unified Dot4 decision through trusted signed Dot3 publisher and separately verified Paper-client receipt. |
| **D5-03** | PARTIAL | Kein GPT-Trading-Erfolgsanspruch ohne tatsächlichen Dot-Output | Cross-check real GPT inputs, outputs and costs against deterministic simulated role timeline. |
| **D5-07** | PARTIAL | Unbekanntes als `null` und nicht erfundene 100% Arbeit ausgeben | Measure real per-Dot tasks/queue/duration/P50/P95/errors/token costs, not approximate HTTP activity. |

### Neutraler Ausgang, Strategie und Holdout (9)

| ID | Status | Ursprüngliche Abnahme | Fehlt für PASS |
|---|---|---|---|
| **SYS-12** | PARTIAL | Recall/FPR nur mit festgelegtem Zähler/Nenner; not evaluated sonst | Create a frozen neutral complete as-of pool denominator, including negative and untradeable pools and honest unknown labels. |
| **D4-02** | PARTIAL | Vorab eingefrorene Regeln vs unveränderte Baseline auf Holdout mit Gewinnern und Nichtgewinnern | Prospectively evaluate frozen momentum/volume/liquidity regimes against untouched baseline and losers. |
| **D4-03** | PARTIAL | Gesamt-PnL inkl. Rückläufer/Slippage, nicht nur maximaler theoretischer Hochpunkt | Evaluate fixed TP, trailing, partial and timed exit including slippage on neutral matured paths. |
| **D4-05** | PARTIAL | Weniger wiederholte Verlusttrades ohne systematisches Verschlafen von Rebounds | Study genuine realized loss lot and later reentry on neutral holdout without cherry-picked recoveries. |
| **D4-06** | PARTIAL | Pro 1/3/6h Kalibrierung (Brier/ECE), Prognose-Null bei unzureichend gelabeltem Nenner | Score 1/3/6h endpoint, observed intrahorizon peak and drawdown on dense time-matured neutral paths. |
| **D5-01** | PARTIAL | Excel-Oracles im getrennten Eval-Container, nie im Dot2/Dot4-Entry-Input | Join 65 winner oracle references only after decision end to a complete unselected October pool denominator. |
| **D5-04** | PARTIAL | Detaillierter Grund jeder Fehlchance mit konkreter nächster Gegenmaßnahme | Verify each claimed missed opportunity with actual event+outcome evidence; leave unmeasured profit null. |
| **D5-05** | PARTIAL | 1/3/6h Brier, Accuracy, Precision, Recall, MAE, Coverage und Missing-Label-Quote | Evaluate 1/3/6h mature positive/negative holdout cohorts with purging and frozen predecision parameters. |
| **QA-05** | PARTIAL | Keine Nachoptimierung am Holdout, vorher gefrorene Regeln, belastbarer Nenner | Wait for genuine frozen Nov prospective validation+holdout windows and score a complete neutral denominator. |

### Windows-Paper, Lots und Receipts (7)

| ID | Status | Ursprüngliche Abnahme | Fehlt für PASS |
|---|---|---|---|
| **SYS-09** | PARTIAL | Vor-/Nachher-Guthaben und Dateien identisch; Backtest-Receipt trägt Forschungskennung | Obtain independent read-only before/after hashes of the existing Windows paper account; do not operate on its files here. |
| **D4-04** | PARTIAL | Zwischen GPT-Reviews Stop-/Takeprofit-Ereignisse, bei fehlender Quote **kein** PAPER_FILLED | Demonstrate real read-only independent position monitoring and protected exit between GPT reviews; no quote=no fill. |
| **D4-08** | PARTIAL | Einmalige Positionsschließung, kein negativer Cash, kein Phantom-Fill oder Fake-Stop | Prove STOP+Dot4 concurrent SELL idempotent within actual client order/accept/fill/blocked/receipt chain. |
| **D4-09** | PARTIAL | UI-PAPER nur echte gespeicherte Zustände, alle offenen Positionen nachvollziehbar | Verify real dashboard shows all open client positions and last known quote/risk/receipt age with no fabricated fill. |
| **D5-02** | PARTIAL | Jede Entscheidung und jedes Loch auf einen `event_id` zurückführbar | Provide signed end-to-end event lineage from original source and risk through actual decision, order and receipt. |
| **D5-06** | PARTIAL | Summen je Ledger und niemand liest `0 DATA_GAP-Trades` als 0%-Performance | Prove original Oracle, synthetic model and real client-Paper profit ledgers never mix and source-specific totals reconcile. |
| **QA-01** | PARTIAL | Identischer BUY/WATCH/HOLD/SELL, Gründe, Quote-/Risk-Block; anderes Datum nur im as-of-Gate | Demonstrate same versioned state and input has equal action/reason in historical/current modes with independent risk proof. |

### Finaler 29-Stunden-Backtest (1)

| ID | Status | Ursprüngliche Abnahme | Fehlt für PASS |
|---|---|---|---|
| **QA-04** | PARTIAL | Hash/Stamps, Cash/Position/Receipts lückenlos, kein Kontakt zum wirklichen lokalen Paper-State | Perform isolated true October 29h E2E with source-time-authenticated neutral population and separate client-level receipts. |

## Technische Prüfungen, die bereits erfolgreich sind (nicht als vollständige Akzeptanz missverstehen)

- Originalzahl 61 mit Statusquelle `research/audits/2026-11-22/r29-original-48-not-accepted-worklist.json` ist jetzt gegen die 48 Rest-IDs vollständig abgeglichen.
- [Source-only 7-Läufe-Research-Audit](https://github.com/127027/Sniperbot-/actions/runs/45068663846): 642/642 Tests, 41 archivierte HTTP-Antworten, 20 echte Gecko-HTTP200-Seiten, 3 alte HTTP429, 6 Chains, 332 unique Pools innerhalb dieser engen 7-Läufe-Menge; **0 gleichpoolige frische 5–240min-Gecko-Preispaar-Nachweise**, keine extern verifizierte Quotezeit.
- Zwei DEX-Abfragen eines SNAP/Base-Pools über ca. 68 Minuten enthielten **byteidentische** Rohantworten mit niedriger Liquidität (1.066,35 USD). Selbst zwei echte HTTP200 zeigen damit **kein bewiesenes neues Preisupdate**. Deshalb trennt `src/v19-dex-cached-quote-audit.mjs` identische Rohantwort, HTML-/Provider-Capture und tatsächliche Price-As-Of-Verifikation; kein BUY aus gecachten Daten.
- Der vorhandene 60-vor-QA04-Freigabeprüfer und alle GitHub-Workflow-Stopps bleiben aktiv. `scripts/v19-readonly-windows-paper-proof.mjs` steht für die wirkliche lokale schreibgeschützte Prüfung bereit, hat aber noch keinen Remote-Windows-Beleg.
- Der eingefrorene November-Holdout endet erst **25.11.2026 06:54 UTC**. Vorher ist eine echte vollständig gereifte Holdoutauswertung unmöglich. Danach müssen noch positive wie negative Original-Outcomes wirklich beschafft und geprüft werden.

## Nächste sinnvolle reale Reihenfolge

1. API-/Paging-/Longitudinal- und 429-Captures über getrennte Stunden fortsetzen, neuartige Poolidentitäten nur als beobachtet führen, **wirklich neue** exakte Preis-/Liquiditätsbeobachtungen mit Hersteller-Quotezeit dokumentieren.
2. Alle fünf GPT-Dot-Läufe als echte zeit- und SHA-gepinnte Research-Journale nachweisen; 4/8/12/24 adaptive Vollreviews gegen tatsächlich vollendete Reviews messen.
3. Dot3-Quell-Zeit-/Issuer-/Chain-Sellability mit unabhängigen Upstreams, Sell-Routes und Sicherheitsbefunden liefern. Ohne diese Belege keine vorzeitige PAPER-ELIGIBLE-Order.
4. Lokales vorhandenes Windows-Paper-Konto nur read-only prüfen. Spätere sichere Order-/Receipt-Integration separat autorisieren, nie 5000/50-Konto oder alte Lots resetten.
5. Prospektiven Holdout am richtigen Tag mit vollständigem neutralem Nenner und zeitlich gereiften positiven UND negativen Outcomes evaluieren.
6. Alle Original-60 nicht-Backtest-Kriterien noch einmal gegen echte unabhängige Belege abnehmen; nur nach bestandenem Gate `QA-04` starten. Der Schlussbericht darf die synthetischen +12,01/-18,97 TEST-USDC nicht als realen Profit verkaufen.

**Maschinenlesbare Aufgabenquelle:** `research/audits/2026-11-22/r29-original-48-not-accepted-worklist.json`. **Ursprünglicher Kriterienkatalog:** `docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md`. **Handoff:** `docs/R29_NEXT_CHAT_HANDOFF.md`. 
