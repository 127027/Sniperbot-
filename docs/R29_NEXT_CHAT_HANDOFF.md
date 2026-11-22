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

**Die verbindliche aktuelle Zählung steht in [V19_IMPLEMENTATION_PROGRESS.md](V19_IMPLEMENTATION_PROGRESS.md).** Stand nach D2-09-Abnahme: **13/61 = 21,3 %**, 48 offen. Bei späteren Fortsetzungen **immer zuerst** den aktuellen Stand in der Fortschrittsdatei prüfen. Diese Zählung nicht aus Gewohnheit fortschreiben: alle späteren Commits/Abnahmen prüfen.

Bisher als `COMPLETE (targeted)` dokumentiert:

- `SYS-01` 29h as-of-Zeitplan
- `SYS-02` neutrales historisches Pool-/Contract-Register; 65 Excel-Meldungen nur Evaluations-Oracle
- `SYS-03` Zeit-/Herkunftsklassen für Original/Retro/Synthetic/Oracle
- `SYS-04` ältere Research-Historie getrennt von frischen Ausführungsquotes
- `SYS-05` budgetierte Sechs-Chain-/Multi-Page-Dot2-Erfassung (ohne Live-Capture-Beweis)
- `SYS-06` manueller 29h-Backtest-Workflow (ohne Actions-Run-Beweis)
- `D1-01` vergleichbare Chain/Page-Aktivitätsmessung
- `D1-02` gezielte API-Wiederholungsaufträge bei DATA_GAP
- `D1-03` adaptive Review-Frequenz mit sofortigem 4→24 und geregeltem 24→12→8→4
- `D2-02` Offset-Paging- und Gap-Journal
- `D2-07` Hot-/Fair-Warteschlange und Servicezeiten
- `D2-08` alle neuen Pools priorisieren statt nur zwei erste crosschecken
- `D2-09` nur ein Fair-Recheck-Planer: `src/market-memory.mjs::planIncrementalScan` delegiert an `src/discovery-fair-queue.mjs::fairRecheckPlan`; Dot2-Anweisungen bleiben pausiert, zielgerichtete Regression `test/v19-unified-recheck-planner.test.mjs`

**Nicht als erledigt zählen:** `D2-01` echte Sechs-Chain-Abdeckung, `D2-03` Contract-Resolver, `D2-04` wiederholte Preis-/OHLCV-Beobachtungen, `D2-05` ältere/re-aktivierte Pools, `SYS-07` Byte-/Hash-Provenienz, `SYS-08` echte GPT-vs-Simulations-Trennung, `SYS-09` isolierte Wallet-Abnahme, `SYS-11` echte per-Endpoint API-Budgets und Caches, `D3-01..07` Dot3-positiver Risk/Freigabepfad, `QA-06` echtes abgeschlossenes npm-test-/Actions-Resultat. Vollständige Liste: [V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md](V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md).

### Bisher tatsächlich überprüfte Datenlage

- Oktober-Excel: 65 historische Anbieter-Meldungen, acht Pool-URLs und 57 nicht eindeutig identifizierte Referenzen. Die Datei gehört **nicht** zum Marktuniversum des Backtests.
- Sechs post-hoc ausgewählte Kursreihen aus `research/training/2026-10-12/frozen-v11/`; nicht ausreichend für einen ehrlichen historischen Fünf-GPT-Dot-Erfolgsnachweis.
- Ohne contemporaneous Oktober-Manifest: strenger Oktober-V1.8-Replay ergab 24 DATA_GAP-Stunden, vier simulierte Reviews, 0 BUY, 0 SELL, **keine echten GPT-Orders oder Paper-Fills**.
- `signals/index.json` zuletzt mit 0 Orders geprüft. **Aktuellen Stand vor erneutem Bericht abfragen.**
- Getestete Module wurden vielfach durch isolierte JS-Funktionsprüfungen validiert; **kein bestätigter vollständiger GitHub-Actions-/Node-Testlauf**.

## 2. Arbeitsreihenfolge – aktuelle nächsten Schritte

1. **Sofort regressionssichere Laufzeitfehler beheben:** Beim V1.9 Multi-Chain-Runner war `oldCheckpoint` nach Umbau nicht mehr definiert. Mit zusätzlichem per-Chain-Checkpoint-Metrikfeld in `scripts/cloud-discovery-runner.mjs` korrigiert; Runner-Integrationstest und echtes Actions-Run noch offen.
2. **P0 Dot2 – `D2-04`:** **Teilimplementiert, offen.** `src/forward-learning.mjs` kann inzwischen zeitgerechte DEX-Preis-Nachprüfung und bis vier Stunden alte Gecko-Volumenbeobachtung desselben Pool-Keys für reine Research-Priorisierung kombinieren, ohne sie als neue unabhängige Quote oder Paper-Freigabe auszugeben. `test/v19-forward-rechecks.test.mjs` mit 12 isolierten Prüfpunkten, alter Ranking-Basistest weiterhin logisch korrekt. **Nicht abgeschlossen**: echtes mehrfaches Rohcapture/zeitgerechter OHLCV-Backfill mit Quellenbelegen und End-to-End-Nachweis. Der volle Rest:  Zwei zeitlich getrennte **echte** Quellen-/Marktbeobachtungen je Pool plus OHLCV-Historie korrekt erfassen, durch Raw-Archive und as-of verfügbar; aktuelle `src/forward-learning.mjs` verlangt unabhängige Capture-Zeitpunkte, doch öffentliche Captures fehlen. Keine nachträglichen OHLCV-Daten als Original-Oktober-Capture ausgeben.
3. **P0 Dot2 – `D2-01` und `D2-05`:** echte sechs Chains und ältere reaktivierte Pools abdecken (mehr als `new_pools`-Endpoint); reale Providerfehler/Rate-Limits auditieren. Nicht als abgeschlossen deklarieren ohne tatsächlichen belegten Capture.
4. **P0 Dot3 – `D3-01` ff.:** von `DATA_GAP/WATCH/REJECTED` zu einer überprüfbaren positiven `PAPER_ELIGIBLE`-Entscheidung; aktuell `src/risk-recheck-queue.mjs` und `src/risk-authorization-v18.mjs` **nicht kaufautorisierend**.
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
- **Zähler bleibt 13/61 = 21,3 %**; die D2-04-Zwischenarbeit zählt nicht als Aufgabe 14.

## 6. Sicherer Prompt für jeden neuen Chat

> **R29 FORTSETZEN**: Lies über den verbundenen GitHub-Zugang im Repository `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`, zuerst `AGENTS.md`, `docs/R29_NEXT_CHAT_HANDOFF.md`, `docs/V19_IMPLEMENTATION_PROGRESS.md` und `docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md`. Prüfe den tatsächlichen Branch-Stand und korrigiere gegebenenfalls die Fortschrittszählung. Arbeite danach die nächste offene P0-Maßnahmen-ID ab, implementiere sie ausschließlich im Cleanroom-Branch, prüfe gezielt und protokolliere die Änderung. Berichte nach jeder Aufgabe `x/61` und Prozent. Synchronisiere bei Rollenänderungen die gespeicherten **pausierten** Dot-Anweisungen. Keine Dot-Reaktivierung, kein `main`, kein alter Bot, kein Echtgeld und kein Überschreiben des vorhandenen Paper-Guthabens. Halte Live-Paper und Backtest als **ein einziges Entscheidungssystem** ohne Zukunftswissen.
