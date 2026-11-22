# R29 V1.9 – Prioritätsumbau API-Budget / GitHub-Fortsetzung (D2-09, SYS-11, D1-04, QA-03)

**Stand:** 22.11.2026. **Repository:** `127027/Sniperbot-`, **nur** Branch `codex/r29-cleanroom-paper-20261121`. Auftrag vom Nutzer am selben Tag zur Umsetzung der vier priorisierten Arbeiten ausdrücklich freigegeben. Kein neuer Bot; vorhandener `scripts/cloud-discovery-runner.mjs` und eine faire Warteschlange. Alle fünf GPT-Dots bleiben deaktiviert, ausschließlich Research/Paper; keine Order oder Windows-Kontoänderung.

## Grundidee: Daten werden akkumuliert, nicht bei jedem Scan neu begonnen

Der GitHub-Runner liest vor einer Erfassung die vorhandenen Quellen:
- `research/state/market-memory.json`: Pool-IDs, Originalquellen, Recheck-Ergebnisse, Chain-Paging;
- `research/state/page-coverage.json`: je Chain erfolgreich beobachtete und noch fehlende Seiten;
- `research/state/older-pool-captures.json` und `ohlcv-backfill.json`: separate, aber gemeinsam limitierte Quellen;
- **NEU, beim nächsten echten Capture erstmalig zu erzeugen:** `research/state/provider-budget.json`: ein gemeinsamer gespeicherter HTTP-Aufrufzähler/Rate-Limiter für GeckoTerminal (NEW_POOLS, TRENDING, OHLCV) und DEX Screener (PAIR) mit Sperrzeiten, Antworten und Fehlversuchen. Dieser nächste Original-Capture wurde im Rahmen dieses Umbaus **nicht** erzwungen.

Ein fester Beispielfortschritt mit je zehn Seiten bei sechs Chains bedeutet **60 geplanter Chain/Page-Proben**:
- sechs unique erfolgreich erfasste und referenzierte Seiten = **10 % des festen Probenplans**;
- nach weiterer erfolgreicher Seite pro Chain = **20 %**;
- nur vorgemerkte, fehlgeschlagene, HTTP-429-gesperrte und *nicht angefragte* Seiten = **0 zusätzlicher Fortschritt**.

**Das ist niemals 10/20/100 % des gesamten Memecoin-Marktes.** Pages sind bewegliche Offsets; ein alte Quelle kann mittlerweile veraltet sein, und mehrere Pools teilen sich Symbole. Die einzelne Kaufbereitschaft hängt nicht von der globalen Scanfortschrittszahl ab, sondern von konkreter as-of-/Quoten-/Risiko-/Sellability-Evidenz. Bereits beim ersten Sample kann ein Pool Forschungsrang haben, ohne eine sichere Paper-Kaufzulassung zu erhalten.

## Phase 1 – D2-09: als PASS des ursprünglichen Software-Abnahmekriteriums vorgesehen

`src/discovery-fair-queue.mjs` akzeptiert dieselbe archivierte Recheck-Quittung jetzt idempotent, verweigert widersprüchliche Quittungen zur gleichen Zeit und die Rückdatierung von Cursors. `test/v19-d209-persistent-restart.test.mjs` testet längere kalte Datei-/JSON-Neustarts, Erhalt älterer Pools anderer Chains, faire Bedienung aller ursprünglichen Kandidaten, und **einen tatsächlich neu gestarteten Node-Prozess** aus der gespeicherten Datei. Legacy-Fassade und aktiver Runner nutzen denselben `fairRecheckPlan`. Keine Order-Erteilung.

**Grenze:** Kein wirklicher Windows-Neustart; für D2-09s ursprüngliche allgemeine Queue/Restart-Abnahme ist die frische Node-Prozessprüfung repräsentativ. Der Windows-Paper-Client gehört zu anderen Abnahmen.

## Phase 2 – SYS-11: wesentlicher Teilfortschritt, noch keine echte API-Dauerabnahme

`src/v19-provider-budget.mjs` implementiert konservative persistente rollierende 60-Sekunden-Limits, **8 Gecko-Starts/Minute** und **120 DEX-Starts/Minute** mit Teilbudgets NEW_POOLS=6, TRENDING=2, OHLCV=2 und PAIR=120. Diese Zahlen sind **eigene Schutzlimits, keine Zusage der Anbieter**; New/Trending/OHLCV teilen dieselbe globale Gecko-Kapazität. Sie sollen den HTTP-429-Druck senken, nicht jeden 429 ausschließen.

Zusammen mit der vorhandenen Gecko-Startabstandskontrolle (6,1 Sekunden) gelten HTTP-429-, HTTP-503-, 408- und Netzwerkfehler-Cooldowns sowie Retry-After, exponentielles Backoff, deterministisches Jitter und Persistenz über neue Runs. Der bestehende Capture-Runner erzwingt die Reservierung **vor** dem HTTP-Request, verbucht den echten Status **danach**, wartet bei erschöpftem Minutenbudget und versucht bei aktiver Provider-Sperre nicht blind neu. Neue Pools, ältere Trending-Pools und OHLCV werden nicht fälschlich als erfolgreich betrachtet.

Nach einer Sperre verbleiben nicht abgefragte Chain-Seiten im `page-coverage.json`-Backlog. Ein DEX-Preischeck, der wegen einer Provider-Sperre überhaupt nicht stattfand, darf ebenfalls **nicht** als echter Recheck gelten; sein FAIR-Cursor wird nicht künstlich vorgeschoben.

**Grenzen:** Unterlying Shared-IP-Quotas oder andere API-Nutzer können weiterhin 429 verursachen. Kein realer Nach-Cooldown-Capture und keine längere Live-Messung nach dem neuen Code. Das ursprünglich geforderte klassische Token-Bucket-Verfahren wurde funktional zunächst als strikteres rolling-window+lane-budget implementiert. **SYS-11 bleibt daher PARTIAL**, bis aktive GitHub-Runs und die restlichen Akzeptanzdetails verifiziert sind.

## Phase 3 – D1-04: eigene Datenerfassung vorgesehen, GPT-Takt getrennt

`src/v19-independent-observation-schedule.mjs` plus Integration im bestehenden Runner:
- regulärer Rückstand/ruhige Beobachtung: 60 Minuten vorgeschlagene Datenerfassung;
- dokumentierte ausstehende Pages: 30 Minuten;
- HOT-Kandidaten: 15 Minuten;
- nach unabhängig authentifiziert übermittelte offenen Paper-Positionen: 5 Minuten als **Schutzziel**, keine selbständig laufende echte Positionserfassung.

Diese Empfehlungen sind vollständig getrennt von Dot1s 4/8/12/24 **GPT-Vollreviews/Tag**. Getestet: 96 zu protokollierende viertelstündliche Beobachtungsfenster bei vier geplanten GPT-Reviews. **Das sind synthetische Beobachtungsfenster, keine 96 bereits ausgeführten Provider-Runs.** Tatsächliche Zahl offener Windows-Paper-Positionen bleibt im cloudbasierten Research-Job unbekannt (`null`); kein falsches „0 Positionen“. Dots bleiben pausiert, und es wird **keine automatische GitHub-Actions-Schedule aktiviert**. **D1-04 PARTIAL.**

## Phase 4 – QA-03: 12 Replays mit sechs Chains und Ausfällen

`test/v19-qa03-multirun-429-endurance.test.mjs`:
- zwölf aufeinanderfolgende Zwei-Stunden-Läufe mit sechs Chains und persistenter JSON-Zwischenablage;
- in Lauf eins simulierter echter HTTP-429-Antwortstatus; korrekt zurückgehaltene übrige Seiten;
- in Folgeläufen nach abgelaufener Sperre erfolgte Wiederaufnahme ohne still verlorene ID;
- Seiten 1, 2 und 3 aller sechs Chains erreichbar; Ergebnis nur Sample-Coverage, nicht Marktkomplettheit;
- zusätzlicher Test für Provider-503, bei dem nur die tatsächlich versuchte Anfrage als Fehler zählt und alle unversuchten Seiten vorgemerkt bleiben.

`test/v19-cumulative-scan-progress.test.mjs` beweist die sachlich begrenzte 10→20-%-Fortschrittsanzeige, unveränderte Werte trotz 429 und sichere Behandlung fehlender/zukünftiger Hash-/Quellenfelder.

**Grenze:** Kein echter 24/7-API-Dauertest, kein realer sechs-Chain-HTTP200-Lauf seit Codeänderung; **QA-03 PARTIAL**, nicht durch 12 synthetische Testläufe auf vollständige Live-Abnahme hochstufen.

## Re-Audit-Gesamtstatus

Ausgangspunkt vor Umbau: 9/61 PASS, 22/61 PARTIAL, 30/61 OPEN. Für diese Phase soll bei grüner abschließender CI gelten:

| ID | Ursprünglich | Nach genau geprüftem Code/CI | Originale Restabnahme |
|---|---|---|---|
| D2-09 | PARTIAL | **PASS** | Neuer Node-Prozess stellt dieselbe persistente FAIR-Queue reproduzierbar wieder her |
| SYS-11 | OPEN | **PARTIAL** | Echte Rate-/Provider-Messung und ggf. ursprüngliche Token-Bucket-Anforderung |
| D1-04 | OPEN | **PARTIAL** | Tatsächlich wiederkehrende Markt-/Positionsbeobachtungen unabhängig von GPT |
| QA-03 | OPEN | **PARTIAL** | Realer mehrstündiger API-/429-/sechs-Chain-Dauertest |
| D2-02 (zusätzlich) | PARTIAL | **PARTIAL** | Echte Page1..N-Kohorten mit belegtem Raw und Coverage-/Zeitfenster-Analyse |

**Daraus: 10/61 = 16,4 % Original-PASS, 24/61 = 39,3 % PARTIAL, 27/61 = 44,3 % OPEN.** Dies ist strenge TASK-Abnahme, keine prozentuale Trading-Reife. Die neue Implementierung erhöht die Menge getesteten Codes, darf aber nicht als tatsächlich autonome GPT-Ausführung ausgegeben werden.

## Abnahme-/Sicherheitsgrenzen und Folgearbeiten

1. Nach bestehendem echten ETH-/Gecko-429-Cooldown (zuletzt **2026-11-22T18:31:56.465Z**) einen kontrollierten echten GitHub-Forschungscapture starten **nur mit separater Freigabe für diesen Lauf**, den neuen `provider-budget.json`-State erzeugen und echte 200/429, Page-Resume und Ratehistogramme prüfen. Kein Ergebnis vorab annehmen.
2. Erst danach Wiederholung über mehrere tatsächliche Scanzyklen mit stabilen Chain-/Page-Cursors, echten Quelle-Hashes, eigener Captureregel und kein Auslisten unbekannter Coins; nach Bedarf Quoten konservativer.
3. D1-04 echte Research-Taktung und positionsbezogene Quote-/Exit-Überwachung in separatem autorisierten Paper-Client-Test nachweisen; vorher keine echten Trading-Zustände anfassen.
4. Fünf GPT-Dots bleiben pausiert; keine echten BUY-/SELL-Orders, kein Test-USDC-Reset, kein `main`-Schreibzugriff.
