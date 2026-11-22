# R29 – Verbindliche GitHub-Übergabe für neue Chats

> **Versionsstand:** R29 V1.9, 22. November 2026, Cleanroom-Branch. **Dieses Dokument zusammen mit `AGENTS.md` und `docs/V19_IMPLEMENTATION_PROGRESS.md` vor jedem Auftrag LIVE aus GitHub lesen.** Es ist kein Garant für automatische Synchronisierung mit ChatGPT; der neue Chat muss GitHub lesen können. Bei Widersprüchen gelten live verifizierter Code, GitHub-Commits und tatsächliche Test-/Evidenzdateien über ältere Chat-Aussagen.

## 0. Projekt – 30 Sekunden

| Schlüssel | Verbindliche Vorgabe |
|---|---|
| Repository | `127027/Sniperbot-` |
| EXAKTER Arbeitsbranch | `codex/r29-cleanroom-paper-20261121` |
| Verbotene Änderungen | Kein `main`, kein Legacy-Bot, keine Echtgeldtransaktionen, kein Überschreiben existierender Paper-Konten/Orders/Receipts |
| Steuerung | **Genau fünf bestehende Dots**, alle fünf Automationen **pausiert** |
| Architektur | **Ein** gemeinsamer Decision-Kern `src/unified-decision-v18.mjs`; Live-Paper und historischer Replay verwenden dieselben Entscheider, unterscheiden nur Uhr/Datenquelle |
| Kapital für isolierten Backtest | 5.000 TEST-USDC, maximal 50 TEST-USDC pro Coin (keine Änderung des echten lokalen Testguthabens) |
| Datum / Uhr | 11.10.2026, 19:00 UTC bis 12.10.2026, 00:00 UTC (Vorlauf); dann 12.10.2026, 00:00–24:00 UTC (Handelssimulation) |
| Frequenz | 4/8/12/24 tatsächliche GPT-Vollreviews pro Tag, automatisch je nach Aktivität; **API-Aufrufe/Exit-Beobachtungen unabhängig** von diesem Limit |
| Datenbelege | Vorhandene frühere Originaldaten und Retro-Rekonstruktionen strikt trennen, niemals später bekannte Gewinner als frühe Discovery verwenden |
| Aktuelle Zielgröße | **61 definierte V1.9-Maßnahmen**, `COMPLETE (targeted)` bedeutet Commit + gezielte Funktionsprüfungen, **nicht** vollständige CI- oder End-to-End-Abnahme |

## 1. Verifizierter Übergabestand

**Die verbindliche aktuelle Zählung steht in [V19_IMPLEMENTATION_PROGRESS.md](V19_IMPLEMENTATION_PROGRESS.md).** Aktueller Stand nach D3-03-Abnahme: **19/61 = 31,1 %**, 42 offen. Bei späteren Fortsetzungen **immer zuerst** den aktuellen Stand in der Fortschrittsdatei prüfen. Diese Zählung nicht aus Gewohnheit fortschreiben: alle späteren Commits/Abnahmen prüfen.

Bisher als `COMPLETE (targeted)` dokumentiert:

- `D3-03` gemeinsamer Quotezeit-Prüfer für drei Datenklassen und denselben Live-/Replay-Entscheidungsprozess (`src/v19-dot3-quote-time.mjs`, `src/risk-authorization-v18.mjs`, `src/v19-dot3-source-pairs.mjs`, `src/market-observer-v18.mjs`). HTTP-Erfassungszeit nicht mit Provider-Quotezeit verwechseln; fehlende Providerzeit INDICATIVE, aber keine SELL-/BUY-Autorisierung. 12/12 Zeit-/Observer-Prüfungen und 5/5 Gegenkontrollen zum Preflight. `docs/V19_DOT3_QUOTE_TIME.md`; vollständiger Node/CI-Lauf weiterhin offen.
- `D3-02` zwei-Domänen-Quellenbeobachtungen mit eigener Upstream-/Quotezeit-Diagnostik ohne falsche echte Authentizität (`src/v19-dot3-source-pairs.mjs`, `src/feed-handoff.mjs`, `src/v19-dot3-risk-status.mjs`, `src/v19-dot3-recheck-scheduler.mjs`). 21/21 gezielte isolierte Prüfungen, weitere echte Provider-/Node-CI-Abnahme offen; `docs/V19_DOT3_SOURCE_CAPABILITY.md`.

- `SYS-01` 29h as-of-Zeitplan
- `SYS-02` neutrales historisches Pool-/Contract-Register; 65 Excel-Meldungen nur Evaluations-Oracle
- `SYS-03` Zeit-/Herkunftsklassen für Original/Retro/Synthetic/Oracle
- `SYS-04` ältere Research-Historie getrennt von frischen Ausführungsquotes
- `SYS-05` budgetierte Sechs-Chain-/Multi-Page-Dot2-Erfassung (ohne Live-Capture-Beweis)
- `SYS-06` manueller 29h-Backtest-Workflow (ohne Actions-Run-Beweis)
- `SYS-07` archivierte Original-HTTP-Dateien mit SHA-256 und optionaler GitHub-Blob-ID gegenprüfen; zeitgerechte Verfügbarkeit getrennt behandeln
- `SYS-08` Herkunftsaudit in `src/v19-dot-execution-audit.mjs`, `src/v18-requested-backtest.mjs` und `test/v19-dot-execution-audit.test.mjs`: Alle fünf Rollen im Replay `SIMULATED`, keine echte GPT-Ausführung ohne unabhängig überprüfte Artefakte; selbst ein `verified:true`-Feld zählt nicht als Nachweis. 24 Takte/120 Modell-Rollenbeiträge/4 Modell-Vollreviews/0 bestätigte GPT-Ausführungen und 0 echte Paper-Fills. 8 direkte +10 integrierte gezielte Prüfungen, vollständige CI weiterhin ausstehend.
- `D1-01` vergleichbare Chain/Page-Aktivitätsmessung
- `D1-02` gezielte API-Wiederholungsaufträge bei DATA_GAP
- `D1-03` adaptive Review-Frequenz mit sofortigem 4→24 und geregeltem 24→12→8→4
- `D2-02` Offset-Paging- und Gap-Journal
- `D2-07` Hot-/Fair-Warteschlange und Servicezeiten
- `D2-08` alle neuen Pools priorisieren statt nur zwei erste crosschecken
- `D2-05` erstmals **ältere** trending Pools je Chain/1h-/24h-Fenster erkennen, as-of vorwärts testen und in denselben Hot/Fair/Dot3-Handoff geben (`src/v19-older-pool-discovery.mjs`, `test/v19-older-pool-discovery.test.mjs`; 13/13 isolierte Prüfungen, echter Anbieter-Capture noch ausstehend).
- `D2-09` nur ein Fair-Recheck-Planer: `src/market-memory.mjs::planIncrementalScan` delegiert an `src/discovery-fair-queue.mjs::fairRecheckPlan`; Dot2-Anweisungen bleiben pausiert, zielgerichtete Regression `test/v19-unified-recheck-planner.test.mjs`

**Nicht als erledigt zählen:** `D2-01` echte Sechs-Chain-Abdeckung, `D2-03` Contract-Resolver, `D2-04` wiederholte Preis-/OHLCV-Beobachtungen, `SYS-09` isolierte Wallet-Abnahme, `SYS-11` echte per-Endpoint API-Budgets und Caches, `D3-02..07` weiterhin offene Dot3-Quellen-/Freigabeaufgaben, `QA-06` echtes abgeschlossenes npm-test-/Actions-Resultat. Vollständige Liste: [V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md](V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md).

### Bisher tatsächlich überprüfte Datenlage

- Oktober-Excel: 65 historische Anbieter-Meldungen, acht Pool-URLs und 57 nicht eindeutig identifizierte Referenzen. Die Datei gehört **nicht** zum Marktuniversum des Backtests.
- Sechs post-hoc ausgewählte Kursreihen aus `research/training/2026-10-12/frozen-v11/`; nicht ausreichend für einen ehrlichen historischen Fünf-GPT-Dot-Erfolgsnachweis.
- Ohne contemporaneous Oktober-Manifest: strenger Oktober-V1.8-Replay ergab 24 DATA_GAP-Stunden, vier simulierte Reviews, 0 BUY, 0 SELL, **keine echten GPT-Orders oder Paper-Fills**.
- `signals/index.json` zuletzt mit 0 Orders geprüft. **Aktuellen Stand vor erneutem Bericht abfragen.**
- Getestete Module wurden vielfach durch isolierte JS-Funktionsprüfungen validiert; **kein bestätigter vollständiger GitHub-Actions-/Node-Testlauf**.

### Nachtrag vom 22.11.2026: Trending/ältere Pools (D2-05)

- `D2-05` ist **COMPLETE (targeted)**: `src/v19-older-pool-discovery.mjs` plant bei ausdrücklichem Capture-Auftrag optional `max_older_pool_requests=0..2` innerhalb des Gecko-Gesamtbudgets. Wiederholte `1h`/`24h`-Trending-Samples pro Chain, ein persistenter und gerechter Chain-Checkpoint, 429-Cooldown, Original-Rohantworten und Kennzeichnung des eigenen Capture-Zeitpunkts. `scripts/cloud-discovery-runner.mjs` speichert Kandidaten im **selben** Marktgedächtnis und `src/feed-handoff.mjs` reicht sie an den bestehenden Dot3-Risk-Review weiter.
- **Grenze:** Trending ist nur eine Stichprobe und belegt weder vollständige ältere Poolabdeckung noch tatsächliche Wiederbelebung, Sellability oder Erfolg. Ein angebliches `pool_created_at` nach Capture wird ausgeschlossen. **13/13 isolierte Prüfungen plus Runner-Syntax erfolgreich; kein echter Anbieter-/GitHub-Actions-Trending-Capture ausgeführt.** Keine Orders, keine Dot-Reaktivierung.
- Nächster Schwerpunkt: D2-04 abschließen durch tatsächliche wiederholte Preis-/OHLCV-Captures und saubere As-of-Artefakte; dann Dot3 positive Risk-Freigabekette und End-to-End.

### Nachtrag vom 22.11.2026: SYS-08 und offene Dot3-Nachprüfung

- **SYS-08 gezielt abgeschlossen**: Per-Rollen-Nachweis für fünf simulierte Dot-Rollen implementiert. Keines der 120 virtuellen Rollenereignisse ist automatisch eine tatsächliche GPT-Ausführung. Alle fünf weiterhin pausierten Dot-Prompts sind synchronisiert.
- **D3-07 teilimplementiert, weiterhin OFFEN**: `src/v19-dot3-recheck-scheduler.mjs` und `test/v19-dot3-recheck-scheduler.test.mjs` erzeugen aus einem bestehenden Dot2-Handoff konkrete `DATA_GAP`-Nachprüfungsaufträge. Im bestehenden `scripts/cloud-discovery-runner.mjs` wird das nur als `research/feeds/.../dot3-next-evidence-rechecks.json` archiviert. Die Warteschlange führt KEINE API-Aufrufe und KEINE Paper-Käufe aus.
- Konkrete Archivkontrolle: `research/feeds/2026-11-22/45002280249/dot2-to-dot3-handoff.json` zeigt Bigfoot und Mfer, beide Ethereum, Kursdivergenz deutlich über 100 %, extrem geringe Liquidität, unbestätigte Sellability/Security. Neuer Plan: beide `DATA_GAP` mit konkretem Quellen-Recheck, nicht nachweislich endgültig `REJECTED`, nicht `PAPER_ELIGIBLE`.
- 429-Wiedervorlage gezielt geprüft. Seit D3-01 kommt die gemeinsame Klassifikation **2 × WATCH** (statt alter pauschaler DATA_GAP-Notiz). Echte Provider-Nachprüfung, Time-to-Risk-Statistik und positive authentische Dot3-Freigabe bleiben offen.
- Gesamtfortschritt: **17/61 = 27,9 %**, 44 offen; vollständiger Node-/Actions-Testlauf weiterhin nicht nachgewiesen.
### Nachtrag vom 22.11.2026: OHLCV/Source-SHA

- `D2-04` bleibt **TEILWEISE**, nicht abgeschlossen: `src/v19-gecko-ohlcv.mjs` dekodiert echte OHLCV-Arrayform `[unix_seconds,open,high,low,close,volume]`; `src/v19-ohlcv-backfill-queue.mjs` verwaltet per Pool rückwärtige `before_timestamp`-Cursor, Cache-/Restart-Status und 429. `src/discovery-feed.mjs` akzeptiert optional `max_ohlcv_requests=0..2`, solange mindestens ein Gecko-Slot für Discovery bleibt; `scripts/cloud-discovery-runner.mjs` archiviert OHLCV mit tatsächlicher HTTP-Erfassungszeit. `test/v19-gecko-ohlcv.test.mjs` und `test/v19-ohlcv-backfill-queue.test.mjs` sind eingecheckt. Acht isolierte Integrations-/Budget-/Cursorprüfungen plus Syntaxprüfung bestanden. **Noch kein echter OHLCV-Provider-Capture/Actions-Run.**
- `SYS-07` ist **COMPLETE (targeted)**: `src/v19-source-integrity.mjs` und Dot2-Runner prüfen Raw SHA256 gegen tatsächlich gelesene Dateien, optional Git Blob SHA1. Echte `research/feeds/2026-11-22/44997708364/gecko-base-page3.raw.json`: 37.031 Bytes; Byte-SHA256 stimmt mit `evidence.json` überein, GitHub-Blob `b078886e87fe35e538403844de24f19d1601b2a5`. Ein solcher November-Capture bleibt am Oktober-As-of **nicht verfügbar**. Node-Regressionsdateien vorhanden, komplette CI-Abnahme weiterhin offen.
- GeckoTerminal-Dokumentation hat zwei widersprüchliche öffentliche Angaben: ungefähr **10/min** laut öffentlicher API-Doku, **30/min** laut CoinGecko-Hilfe. Bis zum echten Anbieterbeleg konservativ planen und bei 429 zurückstellen; `max_gecko_requests` pro Auftrag ist keine zeitbasierte Rate-Limit-Garantie.
- Dot2 und Dot3 gespeicherte Anweisungen wurden aktualisiert, ohne Aktivierung. Alle fünf Dots bleiben pausiert. **Fortschritt siehe stets live in V19_IMPLEMENTATION_PROGRESS.md.**

### Nachtrag vom 22.11.2026: D3-01 – gemeinsame positive und negative Risikostatuskette

- **D3-01 = COMPLETE (targeted), 17/61 = 27,9 %:** `src/v19-dot3-risk-status.mjs` ist **der eine Dot3-Statusentscheider** für `DISCOVERED`, `DATA_GAP`, `WATCH`, `REJECTED`, `PAPER_ELIGIBLE` in Live-Paper, Replay und Nachprüfungsqueue. Die gleiche Funktion wird in `scripts/cloud-discovery-runner.mjs`, `src/v19-dot3-recheck-scheduler.mjs` und `src/v18-requested-backtest.mjs` verwendet, keine neue Handelsstrategie.
- Der **positive synthetische Test** erreicht `PAPER_ELIGIBLE`, aber `trade_authorized:false` und `paper_filled:false`. In echten Live- und historischen Modi reicht ein selbst behauptetes Paket nicht: `DATA_GAP` bis die unabhängige Quellen-/Issuer-Verifikation von **D3-04** implementiert und nachgewiesen wurde. **D3-02/03/04/05/07 weiter offen**. Permanent `REJECTED` nur nach tatsächlich belegter schwerer Gefahr.
- Das originale archivierte Handoff vom 22.11. (`research/feeds/2026-11-22/45002280249/dot2-to-dot3-handoff.json`) ergibt Bigfoot/Mfer: **2 × WATCH**, beide hoher Preiswiderspruch und sehr niedrige Liquidität, **0 × bestätigte REJECTED**, **0 × positive reale PAPER_ELIGIBLE**.
- **Tests:** 12/12 gezielte Statuskontrollen und 10/10 Live-/historischer Replay-/Queue-Integrationskontrollen bestanden; Node-Testdateien hinzugefügt, vollständige `npm test`-/Actions-Ausführung weiterhin unbestätigt. Dot3-/Dot4-/Dot5-Prompts während Pausierung synchronisiert.
- Vollständiger Vertrag, Implementierung und Abnahme: **[`docs/V19_DOT3_RISK_STATE_MACHINE.md`](V19_DOT3_RISK_STATE_MACHINE.md)**.
- Bestehende `test/v19-dot3-recheck-scheduler.test.mjs` wurde auf `WATCH`-Einstufung aktualisiert. Nicht behaupten, echte Dot3-Provider-Sicherheitschecks seien schon ausgeführt worden.

### Nachtrag vom 22.11.2026: D3-02 – Domain ≠ unabhängiger Upstream

- **18/61 = 29,5 %**, 43 Maßnahmen offen. D3-02 ist gezielt geprüft, aber nicht extern provider-validiert.
- Dot2 übergibt `source_observations` mit HTTP-Erfassungszeit sowie `provider_quote_asof_utc:null`, sofern nicht wirklich belegt. Die gemeinsame Dot3-Statusmaschine nutzt `source_pair_audit` für Live-Paper und As-of-Replay. Nachprüfungsplan fordert noch unabhängigen Upstream, Providerzeit und Sellability nach.
- **Kein unabhängig verifizierter Upstream, keine gültige Original-Oktober-Bestätigung, keine realen Paper-Orders**. D3-03, D3-04 und D3-05 bleiben offen; `npm test`/Actions-CI ebenfalls.

### Nachtrag vom 22.11.2026: D3-03 – Time-Provenance

- **19/61 = 31,1 %, 42 offen.** Seit D3-03 klassifiziert `src/v19-dot3-quote-time.mjs` einheitlich `HTTP_CAPTURE_ONLY_INDICATIVE`, `PROVIDER_TIMESTAMP_CLAIMED_FRESH/STALE`, Zukunfts- und ungültige Zeitfälle. `src/risk-authorization-v18.mjs` nutzt dieselbe Zeitprüfung und bleibt SHADOW / `trade_authorized:false`.
- **NICHT als echte Belege darstellen:** Eigenes JSON `provider_quote_asof_utc`, selbst behauptete SHA-/Issuer-Zeichenfolgen, heutiges OHLCV als ursprüngliches Oktober-Archiv oder zwei Domains als bewiesen unabhängigen Upstream.
- Priorität anschließend: D3-04 Quellen-/Issuer-Authentifizierung, D3-05 echte Sellability-/Chain-Safety-Beobachtung und D3-07 tatsächlich erledigte Rechecks. Volle Node-/GitHub-Actions-Abnahme ausstehend.

## 2. Arbeitsreihenfolge – aktuelle nächsten Schritte

1. **Sofort regressionssichere Laufzeitfehler beheben:** Beim V1.9 Multi-Chain-Runner war `oldCheckpoint` nach Umbau nicht mehr definiert. Mit zusätzlichem per-Chain-Checkpoint-Metrikfeld in `scripts/cloud-discovery-runner.mjs` korrigiert; Runner-Integrationstest und echtes Actions-Run noch offen.
2. **P0 Dot2 – `D2-04`:** **Teilimplementiert, offen.** `src/forward-learning.mjs` kann inzwischen zeitgerechte DEX-Preis-Nachprüfung und bis vier Stunden alte Gecko-Volumenbeobachtung desselben Pool-Keys für reine Research-Priorisierung kombinieren, ohne sie als neue unabhängige Quote oder Paper-Freigabe auszugeben. `test/v19-forward-rechecks.test.mjs` mit 12 isolierten Prüfpunkten, alter Ranking-Basistest weiterhin logisch korrekt. **Nicht abgeschlossen**: echtes mehrfaches Rohcapture/zeitgerechter OHLCV-Backfill mit Quellenbelegen und End-to-End-Nachweis. Der volle Rest:  Zwei zeitlich getrennte **echte** Quellen-/Marktbeobachtungen je Pool plus OHLCV-Historie korrekt erfassen, durch Raw-Archive und as-of verfügbar; aktuelle `src/forward-learning.mjs` verlangt unabhängige Capture-Zeitpunkte, doch öffentliche Captures fehlen. Keine nachträglichen OHLCV-Daten als Original-Oktober-Capture ausgeben.
3. **P0 Dot2 – `D2-01` und `D2-05`:** echte sechs Chains und ältere reaktivierte Pools abdecken (mehr als `new_pools`-Endpoint); reale Providerfehler/Rate-Limits auditieren. Nicht als abgeschlossen deklarieren ohne tatsächlichen belegten Capture.
4. **P0 Dot3 – `D3-02..05` und `D3-07`:** D3-01 hat die gemeinsame Statuslogik und synthetischen Positivpfad geprüft; für eine echte `PAPER_ELIGIBLE`-Freigabe fehlen weiterhin unabhängige Anbieterzeiten, authentische GitHub-/Issuer-Belege und tatsächliche Sellability-/Security-Prüfungen. `src/risk-authorization-v18.mjs` ist noch nicht kaufautorisierend.
5. **P0 Dot4 – `D4-01,D4-04,D4-08`:** gemeinsame Entscheider/Belege an vorhandenen Paper-Client anbinden; eigenständige Exit-Preisbeobachtung und einmalige Receipts – weiterhin shadow bis E2E-Abnahme.
6. **QA-06:** vollständiges `npm test` und ggf. Actions-Job-Protokolle wirklich ausführen/prüfen. Aus GitHub-Workflow-Definition allein keinen Erfolg behaupten.

Der Nutzer möchte nach **jedem** abgeschlossenen Arbeitspaket sofort eine verständliche Meldung mit `x/61` und Prozentstand. Dokumentation ohne konkrete Maßnahmen-ID **nicht** als neue Abnahme zählen.

## 3. Dateien und Datenfluss

```text
GeckoTerminal / DEX Screener / weitere dokumentierte Anbieter
   → scripts/cloud-discovery-runner.mjs
   → src/v19-discovery-budget-plan.mjs + src/v19-page-coverage.mjs
   → src/market-memory.mjs + src/forward-learning.mjs
   → src/v19-market-activity.mjs + src/v19-adaptive-cadence.mjs [Dot 1]
   → src/v19-hot-fair-recheck.mjs + Dot2-Priorisierung [Dot 2]
   → src/risk-recheck-queue.mjs / src/risk-authorization-v18.mjs [Dot 3]
   → src/unified-decision-v18.mjs [Dot 4]
   → vorhandener Windows-Paper-Client, nach Freigabe / ausschließlich virtuelle Order
   → Dot 5 Audits, Label-/Forecast-/Receipt-Journale
Historischer Modus verwendet die selben Entscheidungen:
   → src/v19-backtest-window.mjs / src/v18-requested-backtest.mjs
   → src/point-in-time-strategy.mjs
   → dieselbe src/unified-decision-v18.mjs
```

Relevante Daten liegen in `research/feeds/`, `research/observations/`, `research/state/`, `research/forecasts/`. Verifizierte Belege tragen Originalquelle und Erfassungszeit. Unbekannt bleibt unbekannt.

## 4. Synchronisierung mit ChatGPT-Dots

Die GitHub-Dateien und gespeicherten Dot-Automationsprompts sind **getrennte Speicherorte**. Wenn der Code oder der Vertrag einer Dot-Rolle geändert wird, muss **dieselbe Änderung auch in den Anweisungen des betroffenen pausierten Dots** dokumentiert werden. `is_enabled:false` beim Aktualisieren belassen. Vorher und nachher den Status abfragen, niemals einen Dot automatisch reaktivieren.

## 5. Weiterer Prüfschritt ohne neue Entwicklungs-Aufgabe

- `scripts/cloud-discovery-runner.mjs` enthielt nach Multi-Chain-Umbau einen Laufzeitfehler `oldCheckpoint` (nicht mehr definiert). Er wurde durch per-Chain-Checkpoint-Metriken ersetzt. Prüfe in einem echten Node-/Actions-Lauf, dass der Capture-Runner tatsächlich beendet und archiviert.
- `test/v19-cleanroom-handoff-and-runner.test.mjs` validiert Node-`--check` und Dokumentationslinks. **Noch nicht** als vollständig ausgeführter CI-Test ausgegeben.
- Alle Dot2-Vertragsänderungen in den weiterhin deaktivierten gespeicherten Dot2-Anweisungen synchronisiert.
- **Zähler aktuell 16/61 = 26,2 %**; die D2-04-Zwischenarbeit zählt nicht als Aufgabe 14.

## 6. Sicherer Prompt für jeden neuen Chat

> **R29 FORTSETZEN**: Lies über den verbundenen GitHub-Zugang im Repository `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`, zuerst `AGENTS.md`, `docs/R29_NEXT_CHAT_HANDOFF.md`, `docs/V19_IMPLEMENTATION_PROGRESS.md` und `docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md`. Prüfe den tatsächlichen Branch-Stand und korrigiere gegebenenfalls die Fortschrittszählung. Arbeite danach die nächste offene P0-Maßnahmen-ID ab, implementiere sie ausschließlich im Cleanroom-Branch, prüfe gezielt und protokolliere die Änderung. Berichte nach jeder Aufgabe `x/61` und Prozent. Synchronisiere bei Rollenänderungen die gespeicherten **pausierten** Dot-Anweisungen. Keine Dot-Reaktivierung, kein `main`, kein alter Bot, kein Echtgeld und kein Überschreiben des vorhandenen Paper-Guthabens. Halte Live-Paper und Backtest als **ein einziges Entscheidungssystem** ohne Zukunftswissen.
