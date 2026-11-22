# R29 V1.9 — Vollständiger Baustellen- und 29-Stunden-Backtestplan

**Status:** reine Bestandsaufnahme / vorgeschlagene Änderungen; **keine Implementierung, keine Aktivierung, keine Orders**. 22.11.2026. Repository `127027/Sniperbot-`, ausschließlich Branch `codex/r29-cleanroom-paper-20261121`. 5.000 TEST-USDC Start, 50 TEST-USDC/Coin, nur Paper. Zeitraum: 11.10.2026 19:00 bis 13.10.2026 00:00 UTC (5 Stunden Aufwärmen + 24 Stunden Bewertung).

## 1. Quellen und Datenqualität

- Benutzerdatei `R29_Memecoin_Gewinner_2026-10-12.xlsx`: zwei Blätter `Gewinnerliste` / `Übersicht`, 65 Zeilen Rang 1–65, 64 Dextape-Archivmeldungen und 1 MemeDesk-Artikel, 46 Meme/meme-nah (45 davon Dextape), 19 Projekt/Utility unklar. Chains: Robinhood 27, Solana 27, Ethereum 7, BNB 3, Cronos 1. 28 gemeldete Kursanstiege >=1.000%, 4 >=5.000%. **Nur acht Pool-Links**, 57 ohne Pool-Link. Prozentangaben sind 24-Stunden-Anbieterwerte von nicht minutengenau belegten Ablesezeitpunkten; keine technisch ausführbaren exakten UTC-Tief→Hoch-Trades. Einträge sind Pools/Archivmeldungen, nicht unbedingt 65 eindeutige Token. Die externe Dextape-Launchseite nennt 80 ausgewählte Launches, nicht den gesamten Markt: https://dextape.com/launches/2026-10-12 .
- Historische GitHub-Referenz `research/training/2026-10-12/frozen-v11/oct12-training-summary.json`: acht Poolhinweise, **sechs** Single-Source-Kerzentapes `oct12-candles-{0,1,2,4,5,7}.json`, zwei Solana-Pools (SEAN/CRAWLER) mit SOURCE_ERROR HTTP_404. Kein historischer Token-Contract im Frozen-Modelleintrag. Weitere 59 der 65 ohne eingefrorene Modellreihe. Die sechs Tapes sind **nachträglich ausgewählt**; kein glaubwürdiger historischer Dot2-Discovery-Erfolgszähler.
- V1.8 `src/v18-requested-backtest.mjs` ohne eigens bereitgestelltes Contemporaneous-Manifest ergibt 24/24 DATA_GAP, 4 adaptive Vollreviews, 0 BUY/SELL/Receipts. Dies ist eine **Datenlücke**, keine bestätigte Trading-Rendite von 0%. Die vier älteren `research-paper-lab.mjs`-Presets sind **nicht die aktive V1.8-Strategie**. Do not compare old guarded_reentry PnL to V1.8 as if it were a new independent V1.8 trading result.
- Aktuelle R29-Signal- und Dot-Snapshots sind November-Belege, keine Oktober-Beweise. Keiner der fünf pausierten ChatGPT-Dots wurde durch diese Untersuchung ausgeführt.
- Anbieter-Referenzen: GeckoTerminal gratis: bis zu 30 Requests/Minute laut https://support.coingecko.com/articles/6867086195-does-geckoterminal-have-an-api ; v2 https://api.geckoterminal.com/docs/index.html (OHLCV, `before_timestamp`, `limit` bis 1000 je Abfrage in API-Dokumentation); DEX Screener: 60/min für Profile, 300/min für Pair-/Token-/Search-Endpoints laut https://docs.dexscreener.com/api/reference ; GitHub Actions Workflow https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax . **Dies sind Anbieterobergrenzen, keine garantierten tatsächlich verfügbaren Kontingente; 429, lokale IP-Limits und Ausfälle bleiben möglich.**
- Prognoseaufgabe: Wahrscheinlichkeit einer Fortsetzung ist **nicht** gleichbedeutend mit der bekannten späteren +1000%-Meldung; Handelbarkeit und tatsächliche erreichbare Preisniveaus getrennt prüfen.

## 2. Priorisierung und genau definierte Baustellen

**P0:** Mindestvoraussetzung für einen ehrlichen End-to-End-Test. **P1:** wesentliche Chancen-/Positionsqualität. **P2:** Optimierung und Komfort. **P3:** optional experimentell. Alle P0 werden **vor** einem Leistungsnachweis erforderlich; P1/P2 gehören in kontrollierte A/B-Versuche und dürfen nicht durch Blick auf den bekannten Oktober-Tag als voreingestellte Gewinnerstrategie übernommen werden.

### Gemeinsam / Daten / Orchestrierung

| ID | Prio | Nachgewiesene Lücke und Datei | Erforderliche Maßnahme | Test und Abnahme |
|---|---|---|---|---|
| SYS-01 | P0 | `src/v18-requested-backtest.mjs` akzeptiert kein nutzbares dokumentiertes 29h-Marktuniversum; 24h Datenlücke | Einheitliches `as_of`-Ereignismodell einschließlich 5h Vorlauf, alle benötigten historischen Quellen, gewinnende und verlierende Pools, identische Live-/Replay-Verträge | 29h synthetischer Zeitreplay, sämtliche Inputs vor Zeitgrenze, 0 Zukunftslecks |
| SYS-02 | P0 | 57/65 Excel-Poollinks fehlen, sechs Tapes nicht repräsentativ | Neutrales Pool-/Contract-Identitätsregister mit Quelle, Confidence, fehlenden Werten, 65 Referenzen erst als **nachträgliches** Evaluationsmanifest | 65/65 dokumentierte Identitätsstatus, keine Symbol-only-Käufe; missende 57 explizit |
| SYS-03 | P0 | 12.10. Originalcaptures nicht archiviert; nachträglicher OHLCV-Download ist kein damaliger API-Beweis | Belegklassen `ORIGINAL_CAPTURE`, `RETRO_ASOF_RECONSTRUCTION`, `POST_EVENT_ORACLE` durchgängig technisch taggen; außerdem `event_time`, `provider_time`, `captured_at`, `available_at` | Backtest weist retro abrufbare zukünftige Daten korrekt zurück, schreibt nie erfundene Historie |
| SYS-04 | P0 | `src/point-in-time-strategy.mjs:27-32` lädt bei Starteingang nur letzte max. 2h aus dem Vortag | Historischen Lookback vollständig getrennt vom **frischen Preisquote-Fenster** laden: fünf Stunden warm-up plus Tage/Wochen alte abgeschlossene Daten, mit as-of-Filter | Alter Trend beeinflusst Features, wird nie als frischer Kaufkurs verwendet |
| SYS-05 | P0 | `src/discovery-feed.mjs:13-14` max. 2 Gecko-/10 DEX-Requests je Request; `scripts/cloud-discovery-runner.mjs:29,57-61` effektiv nur eine Chain/Seite | Budgetierter, fairer Multi-Chain-/Multi-Page-Scheduler, persistent über Unterbrechungen; einzelne Arbeiten klein für GH-Actions-Timeout halten | Mindestabdeckung aller sechs unterstützten Chains in definierten Zeitfenstern, 429-resume ohne verlorene Seite |
| SYS-06 | P0 | Kein belastbarer on-demand 29h-Datenbereitsteller; `.github/workflows/cleanroom-dot2-capture.yml` startet bei Request-Push, kein `workflow_dispatch` | Manuellen `BacktestRequest` mit Zeit, erlaubten Quellen, Budgets, abgesichertem Branch und 29h-Materialisierungsplan entwerfen; Dot-Schedules bleiben aus | Ein expliziter Auftrag erzeugt isolierte Forschungsartefakte und keine Signale/Orderdateien |
| SYS-07 | P0 | GitHub-Commit-SHA allein verifiziert keine ursprüngliche Oktober-Quellenzeit; `src/v18-shared-evidence-gate.mjs:27` prüft nur SHA-Form | Originalbelege verknüpfen: Quelle/HTTP-Metadaten, Raw Hash, Git-Commit, Snapshot-Zeit und Echtheit getrennt; Retro-Belege nicht in `CONTEMPORANEOUS_RECORD` umetikettieren | Falsche Hashstrings und nachträglich datierte Captures werden nicht als Originale akzeptiert |
| SYS-08 | P0 | Tatsächliche GPT-Automationen vs deterministische Rollensimulation | Einheitliche `as-of`-Inputpakete, Dot-Review-Aufträge und getrennte echte GPT-Outputs; der deterministische Replay darf keine autonome GPT-Ausführung vortäuschen | 5 Rollen mit Herkunft `SIMULATED` vs `GPT_EXECUTED` transparent, keine Phantom-Fills |
| SYS-09 | P0 | `src/core.mjs` verarbeitet Paper-Orders unabhängig vom isolierten Backtest; `src/runner.mjs` nutzt echtes lokales State-Verzeichnis | Paper-Wallet/Orders/Receipts ausschließlich im isolierten Backtest-State, **niemals** im existierenden `~/.r29-cleanpaper` oder `signals/orders/` | Vor-/Nachher-Guthaben und Dateien identisch; Backtest-Receipt trägt Forschungskennung |
| SYS-10 | P1 | `src/market-memory.mjs` fortlaufende GitHub-Raw- und Statusdateien, 7-Tage Actions-Artefaktretention | Immutable Raw-Objekte mit SHA, Dedupe, komprimierten/partionierten Zeitarchiven und GitHub-Index; Git-Repo-Wachstum und Actions-Minuten beachten | Nach Neustart und Monaten gleicher Replay-Hash ohne überschriebenen alten Beleg |
| SYS-11 | P1 | API-Zeitfenster und Providerlimiter nicht zentral orchestriert | Token-Bucket je Anbieter/Endpoint und Reserven für neue Pools, Hot-Rechecks, OHLCV-Historie, Retries; `Retry-After`, Backoff+Jitter, Fortschritts-Cursor | Simulierter 429-Kaskadentest und Fortsetzung ohne Kandidatenverlust |
| SYS-12 | P1 | Alte Retrospektive nach Gewinnern ausgewählt, kein negativer Nenner | Neutrales Population-Register mit nicht erfolgreichen und nicht handelbaren Pools; gemeldete 65 nur nach abgeschlossenen Entscheidungen als Evaluationslabels | Recall/FPR nur mit festgelegtem Zähler/Nenner; not evaluated sonst |
| SYS-13 | P1 | Inkonsistente Chain-/Pool-ID-Formate | Canonical Chain+Contract+Typed Pool, eindeutiger Pool- und Token-Schlüssel (Mehrfachpools), historische Migration ohne Neubewertung | V4 32-byte, Solana, Robinhood, BNB, doppelte Symbole und Konflikte getestet |
| SYS-14 | P2 | Monitoring der API-/GPT-/Queue-Auslastung unzureichend | Minuten/Run je Provider, Seiten, neue Pools, Backlog-Wartezeit, Alter, Fehlversuche, ausgeführte GPT-Reviews, Token/Job-Kosten | Ressourcenbericht je Dot/Chain/Stunde; fehlende Messwerte = null, nicht 0 |

### Dot 1 — Tempo und Prioritäten

| ID | Prio | Nachweis / Datei | Änderung | Abnahme |
|---|---|---|---|---|
| D1-01 | P0 | `src/cadence.mjs:18`: 24er-Schwelle `newPools>=80`, Capture häufig 20-Pool-Seite | Neue **gleichartig gemessene** Chain-/Zeitfenster-Aktivitätswerte; nicht einzelne Seiten mit Gesamttageswerten verwechseln | Gleiche 24h-Kohorte mit mehr/ohne Momentum führt nachweisbar zu verschiedenem Tempo |
| D1-02 | P0 | 12.10. strenger Replay: 24 DATA_GAP, Ziel 4 unverändert | Fehlende Daten = Abdeckungsalarm + gezielte Quellennachfrage; kein „Markt ruhig“; geplante 4/8/12/24-Regime im As-of-Durchlauf | DATA_GAP-Stunden erhöhen gezielt Datenerfassung statt stilles NO_TRADE |
| D1-03 | P1 | `researchDue` läuft nur auf Auswertungsweckpunkten, nicht nach Ereignisdruck | Bei plötzlicher hoher Aktivität sofortiger Wechsel 4→24 inkl. erster voller Kaufanalyse, Absenkung nach bestätigter Ruhe | Erster Scan 24 möglich; 24→12→8→4 ohne Hysterese-Pendeln |
| D1-04 | P0 | Vollreviews sind keine Live-Marktabfragen | Separates stündlich/minütliches (nach API-Budget) Markterfassen und positionsbezogene Exit-Check-Frequenz, unabhängig von GPT-Reviews | 4 Vollreviews und dennoch viele dokumentierte Preis-/Positionsbeobachtungen |
| D1-05 | P1 | Mehrere Chains um sechs gleichwertige Slots konkurrieren | Kapazität pro Chain, Kandidatenmenge und Risiko priorisieren; Mindestservice je Chain und kein Hungern älterer Pools | 6 Chains mit Coverage %, P95-Wartezeit und Max Backlog-Age |
| D1-06 | P1 | Aktuell unzureichend echte GPT-Rollenlaufmetriken | `target_reviews`, `actually_completed_reviews`, übersprungene, Tokens/Kosten, Arbeitslänge getrennt dokumentieren | Rechnung 4/8/12/24 tatsächlich messbar, keine fiktiven GPT-Scans |
| D1-07 | P2 | `cadence.json` aktuelle Quelle teils unvollständig, no stability score | Empirisch validierte Schwellen für erwarteten Erkenntnisgewinn weiterer Scans; Shadow-Prognose für Kosten/Nutzen | Prospektive Studie vor Schwellenänderung, nicht nur Gewinner-Oracle |

### Dot 2 — Discovery und vollständige Markterfassung

| ID | Prio | Nachweis / Datei | Änderung | Abnahme |
|---|---|---|---|---|
| D2-01 | P0 | `scripts/cloud-discovery-runner.mjs:29,57-61` eine gewählte Chain/Poolseite | Captures jeder unterstützten Chain und definierter Seiten pro Zeitfenster, ressourcengeplant | Alle sechs Chains erreicht, auch Robinhood/Solana in 5h-Warmup und Test |
| D2-02 | P0 | `src/discovery-page-scheduler.mjs` alterniert Seite 1/Backlog; schnell neu erscheinende Pools verschieben Seiten | API-Paging mit per-Chain-Zeit-/Cursorbeleg, Page-Set-Vollständigkeit, wiederholtem Fresh-Page-1 und nicht still verlorenen überholten Seiten | Page1..N geprüft, Deckung/Unsicherheit je Chain, deduplizierte vollständig gespeicherte IDs |
| D2-03 | P0 | 57 Listenzeilen ohne Pool-ID; zwei weitere Quellfehler | Historisches Contract-/Pool-Resolver-Rechercheverfahren für Einträge mit `NAME_ONLY`, `AMBIGUOUS`, `CONFLICT`, `VERIFIED`; keine Namens-Heuristik für BUY | 65 Referenzen einzeln klassifiziert, keine erfundenen IDs |
| D2-04 | P0 | `src/forward-learning.mjs` verlangt mehrfach beobachtete Preise; letzter auditierter Stand 201 Unique/0 rankbar | Recheck in unterschiedlichen Zeitpunkten, echtes OHLCV Backfill in separatem As-of-Kontext, Marktabstände und fehlende Kerzen markieren | Von zeitgerecht vorhandenen Preisen aus mindestens zwei getrennten Zeitpunkten valide Features |
| D2-05 | P0 | Neue Coins dominieren `new_pools`-Endpoint | Separate Watchlisten für ältere Pools und Reaktivierung: steigendes Volumen, Liquidität, Trendwechsel, Rückkehr nach Inaktivität | Erst im Vortag/älter erschaffener Ausbruch wird entdeckt, nie aus Zukunftsliste eingespeist |
| D2-06 | P1 | `src/live-pool-discovery.mjs` V4 gefixt; `src/v18-archived-v4-recovery.mjs` archiviert, alte Liste nicht live gemessen | 20-Record-V4-Regressionen/Inkonsistenzen und Original-Recovery auf den aktuellen Zustand abnehmen | 9→20 lokal reproduzierbar, Pooltyp über gesamte Handoff-Pipeline, 0 Fake-Live-Belege |
| D2-07 | P1 | `src/discovery-fair-queue.mjs:24-33` fair, aber Hot- und Recheck-Service konkurrieren | Zwei Queues: unverzichtbare Fairnessquote + Hot-Candidate-SLA, negative und alte Pools bleiben erhalten | P95 Fresh-to-Risk-Latenz, keine Starvation, definierte Hot-SLA |
| D2-08 | P1 | `scripts/cloud-discovery-runner.mjs:101` nimmt nur erste zwei neuen Pools zum unmittelbaren DEX-Crosscheck | Priorisierung sämtlicher neu gefundener Pools nach verfügbaren as-of-Signalen, anschließend budgetgerecht mehrere Crosschecks | Kein Kandidat geht vor Ranking still unter; Top-K zeitgerecht erneut prüfen |
| D2-09 | P1 | `src/market-memory.mjs:89-93` enthält älteren last-seen-Plan zusätzlich zur tatsächlichen Fairqueue | Nicht verwendete/alternative Recheck-Funktion bereinigen, ein persistentes Scheduling-Regelwerk | Nach Neustart reproduzierbare Queue und kein doppelter widersprüchlicher Plan |
| D2-10 | P1 | DEX Fallback und Gecko können abweichende Pool-/Base-Token-IDs liefern | Chain-spezifische Providerkompatibilität, Contract-/Pool-Link, Quelle/Quoteage mit eindeutigen Fehlergründen | Robinhood, Solana, BSC, ETH, Cronos jeweils erfolgreiche negative/positive Contract-Prüfung |
| D2-11 | P2 | GitHub-Berichte `latest` allein nicht ausreichend | Pro Quelle Full-page + Immutable-Beobachtungs-Index mit `discovered_at` vs `observed_at` | „First seen by Dot2“ getrennt von „Pool created“ und „Rekonstruiert“ |

### Dot 3 — Risiko ohne unnötige Sackgassen

| ID | Prio | Nachweis / Datei | Änderung | Abnahme |
|---|---|---|---|---|
| D3-01 | P0 | `src/risk-recheck-queue.mjs` erstellt Worklist, `eligible_for_buy:false` für alle | Standardisierte Statusübergänge `DISCOVERED`→`DATA_GAP`/`WATCH`/`REJECTED`/`PAPER_ELIGIBLE`; eigene tatsächliche Risk-Instanz entscheidet | Positives simuliertes vollständiges Evidenzpaket führt zu PAPER_ELIGIBLE, negatives nicht; niemals hartes Auslisten bei DATA_GAP |
| D3-02 | P0 | `src/core.mjs:48-84` zwei Quotes, 3% Drift, 5k Liquidität; nicht alle Partnerketten können gleiche Art Quote liefern | Je Chain/Provider echte Quellenfähigkeit und Alternativen messen, unabhängige Domains vs unabhängiger **Upstream** auseinanderhalten | Quellpaar gültig nur bei identischem Token/Pool und wahrheitsgemäßem As-of; keine perma-blocked-only Chains |
| D3-03 | P0 | `src/risk-authorization-v18.mjs:30-32` verlangt Providerquotezeit <90s, während `src/market-observer-v18.mjs` provider_time=null liefert | Evidenzklassen für indikative vs nachgewiesen frische Quotes mit klar getrenntem Paper-Fill- und Forschungs-Gate; keine erfundenen Quotenzeitstempel | Frische echte Belege funktionieren, unbekannter Zeitstempel bleibt explizite Unsicherheit, kein falscher „geprüft“ |
| D3-04 | P0 | `src/risk-authorization-v18.mjs` nur strukturelle SHA-/Issuer-Strings; kein authentischer Risk-Publisher | Dot3 attestierter unveränderlicher Risikobeleg, SHA-Byteprüfung und authentischer GitHub-Autorisierungsweg, TTL | Gefälschte Order mit Feld `dots` reicht nicht; wirklicher Beleg verifizierbar |
| D3-05 | P0 | Sellability vom historischen Oktober nicht belegbar | Chain-spezifische Prüfung Contract-Owner, Tax/Blacklist/Honeypot/Routing, historische Prüfung nur soweit nachweisbar; DATA_GAP statt erdachte Ausführung | Besonders riskante Pools nicht Paper-füllen, aber Research-Entdeckung erhalten |
| D3-06 | P1 | 50 TEST-USDC vs starrer 5k-Liquidität/1%-Nutzung/3%-Drift | Sensitivitäts- und Liquiditätstiefentest nach erwarteter Slippage, messbar verschiedene Kriterien je Marktregime **ohne ungeprüfte Lockerung** | Abhängigkeitskurve erkannte Chancen / False BUY / simulierte Slippage dokumentiert |
| D3-07 | P1 | Risk-Checks können viel länger als schnelles Momentum dauern | Konkrete `missing_field`, Retry-/Provider-/Deadline-Aufträge statt pauschalem Reject; TTL der einzelnen Evidenzen getrennt | Time-to-Risk und unblock-Quote pro Coin, Recheck führt tatsächlich zu Entscheidung |

### Dot 4 — Strategie, Handel, Positionsschutz

| ID | Prio | Nachweis / Datei | Änderung | Abnahme |
|---|---|---|---|---|
| D4-01 | P0 | `src/v18-dot4-live-decision.mjs` ist read-only; tatsächliche GPT-Dot4-Order nicht angebunden | Gleicher Dot4-Entscheidungs-/Risk-Pfad für echte gegenwärtige Paper- und historische As-of-Eingaben, mit separater signierter Order-Übertragung; keine zweite Strategie | Identischer Input+Version+State → identische Aktion; echter Paper-Order-Publisher nur mit unabhängigen Prüfungen |
| D4-02 | P0 | `src/unified-decision-v18.mjs` setzt Momentum +5%, TP+20%, SL−10% ohne Marktregime | Zeitgerechte Trendrichtung, Beschleunigung, Volumen, Liquiditätsänderung, Poolalter und Rücksetzrisiko **als experimentelle Features** | Vorab eingefrorene Regeln vs unveränderte Baseline auf Holdout mit Gewinnern und Nichtgewinnern |
| D4-03 | P1 | Große Gewinner laufen wesentlich über +20%; statischer TP kann früh kappen | Dynamische Exit-Varianten (Teilverkäufe, Trailing, Zeitablauf), bei T0 festgelegt, vorab nicht an Gewinnkurven angepasst | Gesamt-PnL inkl. Rückläufer/Slippage, nicht nur maximaler theoretischer Hochpunkt |
| D4-04 | P0 | `src/runner.mjs` fragt GitHub-Orders, nicht Marktkurse | `src/market-observer-v18.mjs` und `src/protective-exit.mjs` zuerst read-only integrieren; nur autorisierte Paper-Schutzregeln für bestehende Positionen | Zwischen GPT-Reviews Stop-/Takeprofit-Ereignisse, bei fehlender Quote **kein** PAPER_FILLED |
| D4-05 | P1 | In altem Oktober-Modell SKHYB −66% binnen 1h, BNBCAT Reentries | Reentry an tatsächliche Verlust-Exit-Historie, Trend-/Liquiditätswechsel, Fluktuation und Zeit koppeln, nicht jede kleine Pause zu hart | Weniger wiederholte Verlusttrades ohne systematisches Verschlafen von Rebounds |
| D4-06 | P1 | `src/forecast-calibration-v18.mjs` 1/3/6h grobe Preis-Endpunktmodelle, noch unkalibriert | Definiere zwei getrennte Ziele: Endpunkt-Return und während Horizont beobachteter Peak/Drawdown; nur tatsächlich beobachtete ausreichend dichte Kerzen | Pro 1/3/6h Kalibrierung (Brier/ECE), Prognose-Null bei unzureichend gelabeltem Nenner |
| D4-07 | P0 | `src/core.mjs` Kauf strikt `entryAmount=50`, Budget max5k; Risiko mehrerer Pools | Positionsanzahl, Available Cash, Block pro Token/mehrere Pools, FIFO-Einstiegs-/Exit-Historie, Benutzer-Parameter als gleicher Replay-/Live-Config-Wert | 5k Cash, 50/Coin, kein Doppel-BUY durch mehrere Pools, Restcash unverändert |
| D4-08 | P0 | `src/runner.mjs` Exit/State nicht an Shadow-Quote eingebunden; `src/core.mjs` Receipt modelliert Fills | Trenne Signal/Order/Accept/Fill/Blocked/Receipt; konvergente Idempotenz bei parallelem STOP und Dot4-SELL, echte konservative Preis-/Liquiditätsannahme | Einmalige Positionsschließung, kein negativer Cash, kein Phantom-Fill oder Fake-Stop |
| D4-09 | P2 | Aktuelle UI zeigt wenige Monitoring-/Exitsignale | `src/dashboard.mjs` Riskstatus, „last observed“, offene Position und Price-Age, Order-Receipt-Lag, Benutzerbudget | UI-PAPER nur echte gespeicherte Zustände, alle offenen Positionen nachvollziehbar |

### Dot 5 — Kontrolle, Lernen und Diagnose

| ID | Prio | Nachweis / Datei | Änderung | Abnahme |
|---|---|---|---|---|
| D5-01 | P0 | Heute 65 Winner-Referenzen, unvollständige Negative | Dot5 muss nachträglich 65 Gewinnerlabels mit vollständigem unselektierten Pooluniversum matchen und Fehlerraten nur auf bekanntem Nenner messen | Excel-Oracles im getrennten Eval-Container, nie im Dot2/Dot4-Entry-Input |
| D5-02 | P0 | `src/forward-oracle-journal.mjs` Forecast/Labels getrennt, aber sparse Daten | Ereignis-Ledger: Quelle/Chain/Page/Pool/Contract/FirstSeen/Risk/Prognose/Order/Receipt/Outcome und Gründe der nicht ergriffenen Chance | Jede Entscheidung und jedes Loch auf einen `event_id` zurückführbar |
| D5-03 | P0 | `src/v18-requested-backtest.mjs` 5 Rollen-Audit deterministisch, keine historischen GPT-Prompt-Ausführungen | Separater Messbericht `dot_role_simulation` vs `actual_gpt_run`; Kosten und Ein-/Ausgaben dokumentieren | Kein GPT-Trading-Erfolgsanspruch ohne tatsächlichen Dot-Output |
| D5-04 | P1 | Gewinner-/Verlierer- und Coin-Cohort-Auswertung fehlt | Fehlende Chance pro Ursache kategorisieren: NOT_FOUND, TOO_LATE, NO_CONTRACT, NO_QUOTE, RISK, NO_GPT_BUDGET, NO_CASH, NO_FILL, EARLY_SELL | Detaillierter Grund jeder Fehlchance mit konkreter nächster Gegenmaßnahme |
| D5-05 | P1 | `src/temporal-learning.mjs`, `src/forecast-calibration-v18.mjs` brauchen reife positive UND negative Labels | Train/Validation/Holdout zeitlich purgen, prädiktive Scorekalibration und Tail-risk-Outcome messen; automatische Retrospektiv-Überanpassung verhindern | 1/3/6h Brier, Accuracy, Precision, Recall, MAE, Coverage und Missing-Label-Quote |
| D5-06 | P1 | Trade-PnL aus Forschung und tatsächlichem Paper im alten Reporting teils missverständlich | Drei strikt getrennte Ledger: Oracle-Upperbound, deterministisches Paper-Modell, tatsächlich vom Client quittierte Paper-Fills | Summen je Ledger und niemand liest `0 DATA_GAP-Trades` als 0%-Performance |
| D5-07 | P1 | Dot-Auslastung bislang nicht real quantifizierbar | Je Dot Anzahl Aufgaben, Inputvolumen, Warteschlange, P50/P95-Wartezeit, echte GPT-Reviews, Kosten und Fehlerklassen speichern | Unbekanntes als `null` und nicht erfundene 100% Arbeit ausgeben |

### Tests, Vergleich und Betrieb

| ID | Prio | Aufgabe | Bestehensnachweis |
|---|---|---|---|
| QA-01 | P0 | `test/**` gemeinsame Cross-Mode-Parität: identisches Inputpaket in LIVE_PAPER und HISTORICAL_ASOF | Identischer BUY/WATCH/HOLD/SELL, Gründe, Quote-/Risk-Block; anderes Datum nur im as-of-Gate |
| QA-02 | P0 | Original vs Retrospektiv vs Oracle Daten strikt gegeneinander testen | Später rekonstruierte Gewinner-/Tief-Hoch-Information beeinflusst keinen früheren Takt |
| QA-03 | P0 | API-Paging-/429-/6-Chain-Coverage-Dauertest | Keine still verschwundenen Kandidaten, endliche Backlogs und wiederaufnehmbare Cursors |
| QA-04 | P0 | 29h E2E-Test in sauberer Paper-Sandbox (replay arrival, quote capture, risk, BUY/HOLD/SELL, receipt) | Hash/Stamps, Cash/Position/Receipts lückenlos, kein Kontakt zum wirklichen lokalen Paper-State |
| QA-05 | P1 | Prospektiver Holdout statt sechs post-hoc ausgewählter Gewinner | Keine Nachoptimierung am Holdout, vorher gefrorene Regeln, belastbarer Nenner |
| QA-06 | P1 | GitHub Node-Tests/Aktionslogs und Versionsprovenienz | `npm test` und ein tatsächliches CI-Run-Artifact; fehlendes CI ist **nicht** „bestanden“ |

## 3. Konkrete 29h-Recherche- und API-Slots

**Wichtig:** Der 12.10. ist Vergangenheit; heute erst heruntergeladene historische OHLCV-Kerzen dürfen nur als `RETRO_ASOF_RECONSTRUCTION` verwendet werden. Der 11.10.19:00-Vorlauf war für einen wirklich damals arbeitenden Bot nur möglich, wenn damals tatsächlich schon erfasst wurde; er kann nicht nachträglich erzeugt werden. Die Zeitplanung definiert den **Sollbetrieb** und den virtuellen historischen Scheduler.

| Virtuelle Uhrzeit UTC | Aufgaben | Grenze |
|---|---|---|
| 11.10. 19:00 | Sechs Chains: neue/ältere Pools, vollständige Page-Sets, neutraler Kandidatenindex, bestehende alte Marktgeschichte laden | Nur damals bereits existierende Pools |
| 20:00 | Ausstehende Seiten + 429-Requeue, alternativer Provider, Token-/Pool-Resolver | Keine späteren Winnernamen als Liste |
| 21:00 | OHLCV bis zum jetzt virtuellen Zeitpunkt und Pool-/Liquiditäts-Trajektorien; Verdacht auf Reaktivierung | Historisch nicht vorhandene Provider-Quotes als unbekannt markieren |
| 22:00 | Hot-Pool-Zweitmessung, Liquidität/Sellability-Daten soweit archiviert, Queue-Abdeckung | Keine Kaufkurse aus dem späteren 12.10. |
| 23:00 | Alle Chain-Lücken, Fair-Queue und Hot-SLA, T0-Features, Cache/SHA-Index checkpointen | Konfiguration vor T0 einfrieren |
| 12.10. 00:00 | Strategiestart: Zustand null/übernommene Positionen, Quote-Memory, Dot1-GPT-Cadence | Kein Oracle im Prompt |
| 00:00–24:00 | As-of-neue Pool-Events, OHLCV/aktuelle Quotes in engeren Intervallen, 4/8/12/24 GPT-Vollreviews, parallele Exitprüfung; alle 24 Stunden dokumentieren | Zukunftscandles erst nach dem Close und verfügbarer Quellenzeit |
| 13.10. 00:00+ | Erst jetzt Outcomes, Oracle-Liste und Counterfactual-Fehler auswerten; 6h-Horizonte mit Endzeit nach Tagesende gesondert behandeln | Nie Label vor Fälligkeit |

### Kontingentmodell, *vorläufige Planung*, nicht gemessene Realität
- Referenz-Gecko: öffentlich derzeit **30/min** theoretisch (kein Garantie-SLA), 5 Stunden hätten **9.000 theoretische Aufrufslots**, aber GitHub 5-min-Workflows, 429, Provider-Ressourcen und Pooluniversum sind echte Engpässe. **Diese 9.000 sind eine rechnerische Obergrenze, kein Plan für 9.000 echte Requests.**
- DEX Screener: offizieller Dokumentationsstand **300/min** für Pair-/Token-Lookups, **60/min** für Profile/andere Kategorien. Auch dies ist kein garantiertes effektives Kontingent.
- Erste niedrige Planungsrate: pro Stunde 6 Chains × 2 neue Poolseiten = 12 Gecko-Requests; dazu zielgerichtete Hot-Pool-Rechecks/OHLCV innerhalb des Restbudgets. Nur **Beispiel**, echte Endpoint-Page-Caps und Discovery-Wachstum vor Festlegung prüfen.
- 65 Pools × 29 Stunden 1-Minuten-Historie wären rechnerisch 1.740 Kerzen pro Pool, also bei voller 1.000-Bar-Unterstützung mindestens zwei OHLCV-Seiten je Pool, **sofern** Poolidentitäten und lückenlose Kerzen existieren. Die 65 Winner dürfen die Quellenauswahl **nicht** steuern; diese Rechnung dient nur der Kapazitätsplanung nach dem Test.
- APIs unabhängig vom GPT-Budget: 4 Vollreviews bedeuten nicht nur 4 API-Abfragen. Laufende Beobachtungen/Exits benötigen höhere Taktfrequenz mit realistischen Rate-Limits.
- Ein `new_pools`-Endpoint allein ist kein vollständiges Marktuniversum und kein historisches Ereignisarchiv. Für rekonstruierte all-chain Discoverability sind ggf. historische Factory-Events/Chain-Logs/Archive-Indizes mit neutralen Kandidaten notwendig, deren kostenlose Verfügbarkeit zuerst zu verifizieren ist.

## 4. Ereignisvertrag für genau ein System

`event_id`, `chain`, `token_contract`, `pool_id`, `pool_kind`, `pool_created_at`, `event_at`, `provider_quote_asof`, `http_captured_at`, `first_known_to_dot2_at`, `historical_reconstruction_at`, `source_path`, `source_sha256`, `reconstruction_class`, `feature_as_of`, `risk_decision`, `dot1_cadence`, `dot4_decision`, `prediction_horizons`, `order_id`, `paper_fill_id`, `receipt_id`, `label_available_at`, `outcome_return_pct`, `cause_code`.

**Freigabe für echten Backtest-Nachweis:** Ein historisch nicht bekanntes Feld ist `null`, nicht nachträglich „geheilt“. Wenn keine contemporaneous Quellen existieren, ist ein rückkonstruierter **zeitfilterter Forschungsreplay** möglich, aber kein bewiesener historischer Fünf-GPT-Dot-Lauf.

## 5. Abnahme-/Nichtziele

- Erst nach gesonderter Umsetzungsfreigabe Code und fünf gespeicherte Dot-Anweisungen in **demselben Branch** synchron ändern. Alle fünf Automationen bleiben pausiert; kein Main, kein Legacy-Bot.
- Zuerst P0: Datenuniversum und Original-/Retro-Zeitgates, API-Cursor und neutrale Discovery, Dot3-Entscheidungsfähigkeit, Dot4 gemeinsame Handelspipeline, isolierter Paper-E2E. Danach P1: Reaktivierungserkennung, Marktregime, dynamische Exits, Kalibrierung.
- Der bisherige negative Forschungspnl beweist keine tatsächliche zukünftige Strategieperformance; ein großer gemeldeter Prozentanstieg ist **kein** nachweisbar mit 50 TEST-USDC erzielbarer Gewinn.
- Ohne vorher festgelegten unbekannten Holdout oder prospektiven Shadow-Day niemals `perfekt eingestellt` oder `Gewinner nachweislich erkannt` behaupten.
