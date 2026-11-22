# R29 V1.9 – Fortlaufender Umsetzungsstand (22.11.2026)

**Maßstab:** 61 konkrete Aufgaben aus `docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md`. Eine Aufgabe gilt hier als technisch abgeschlossen, wenn die konkrete Codeänderung auf dem Cleanroom-Branch eingecheckt und mittels gezielter Regression/Funktionsprüfung geprüft wurde. **Noch keine vollständige Node-/GitHub-Actions-End-to-End-Abnahme**; diese zählt separat als QA-06 und bleibt offen. Zahl ist **Aufgabenzählung**, keine Berechnung von Gesamtarbeitsstunden.

**Stand: 6/61 = 9,8 % technisch abgeschlossen. 55 offen.**

| Task | Status | Verifizierbare Änderungen | Prüfung / offene Einschränkung |
|---|---|---|---|
| SYS-03 | COMPLETE (targeted) | `src/v19-asof-evidence.mjs`; `src/v18-shared-evidence-gate.mjs`; `test/v19-asof-evidence.test.mjs` | 7/7 isolierte Funktionsprüfungen; Original/Retro/Oracle/Synthetic strikt unterschieden, echte Blobprovenienz weiter offen |
| SYS-04 | COMPLETE (targeted) | `src/v19-asof-lookback.mjs`; `src/point-in-time-strategy.mjs`; `test/v19-asof-lookback.test.mjs`, `test/v19-replay-lookback.test.mjs` | 8/8 reine Historienprüfungen und 8/8 Replayprüfungen; alte Analysefeatures sind keine frischen Kaufquotes |
| SYS-01 | COMPLETE (targeted) | `src/v19-backtest-window.mjs`; `src/v18-requested-backtest.mjs`; `test/v19-backtest-window.test.mjs` | 14/14 isolierte Checks; 5h Vorlauf +24h Entscheidungssimulation, noch keine originalen Oktober-Quellen |
| SYS-02 | COMPLETE (targeted) | `src/v19-neutral-pool-registry.mjs`; `research/evaluation/2026-10-12/v19-winner-reference-identity-status.json`; `test/v19-neutral-pool-registry.test.mjs` | 14/14 isolierte Checks, 65/65 Excel-Referenzen kategorisiert, nur 8 Pool-URLs, 57 NAME_ONLY; es wird **keine** eindeutige Contract-Zuordnung behauptet |
| SYS-05 | COMPLETE (targeted) | `src/v19-discovery-budget-plan.mjs`, `src/discovery-feed.mjs`, `scripts/cloud-discovery-runner.mjs`, `test/v19-multichain-discovery-budget.test.mjs`, Dot2-Workflow-Timeout angepasst | 15/15 isolierte Plan-/Checkpoint-Prüfungen und Runner-Syntaxprüfung; bis zu 12 budgetierte Anfragen/Run; **kein aktueller tatsächlicher Mehrchain-Capture ausgeführt** |
| D1-02 | COMPLETE (targeted) | `src/v19-coverage-recovery.mjs`; `src/point-in-time-strategy.mjs`; `src/v18-requested-backtest.mjs`; `test/v19-data-gap-coverage.test.mjs`; gespeicherte pausierte Dot1-Anweisung aktualisiert | 16/16 isolierte Checks; Datenlücken erzeugen konkrete **empfohlene**, noch nicht ausgeführte Capture-Aufträge, keine fingierten GPT-Scans |

## In Bearbeitung, NICHT abgeschlossen

- **SYS-11:** Bereits implementiert: `src/v19-provider-backoff.mjs`, `src/market-memory.mjs`, `src/v19-discovery-budget-plan.mjs`, `scripts/cloud-discovery-runner.mjs`, `test/v19-provider-backoff.test.mjs`; 18/18 gezielte Retry-/Checkpointprüfungen. **Noch offen:** echte Budget-/Rate-Limit-Kontrolle je Endpoint, garantierte Reserven für History/Rechecks, getesteter Cache-Hit-Pfad, realer 429-Integrationstest und ggf. Jitter. Daher noch NICHT in den 6 Abschlüssen enthalten.
- **D2-01/D2-02/D2-07/D2-08:** Teilunterstützung durch neuen Scheduler, aber Seitendeckung/Hot-Queue und Integration über echte Läufe noch nicht unabhängig bestätigt.
- **QA-06:** Ein vollständiger `npm test`- und erfolgreicher CI-Lauf ist weiterhin nicht nachgewiesen.

## Invariante Grenzen

Alle fünf R29-Dots bleiben deaktiviert. Die gespeicherten Prompts von Dot1 und Dot2 sind mit den bisherigen V1.9-Erweiterungen synchronisiert, die übrigen Dot-Prompts werden erst bei tatsächlichen Rollenänderungen angefasst. Es gibt **keine** neuen echten Orders, keine MAIN/Legacy-Änderungen und keine Änderungen am lokalen Windows-Paper-Konto. Die Historien- und Replay-Module bleiben research-/shadow-only. Alle Prozentangaben beziehen sich ausschließlich auf 61 Aufgaben; nicht auf Prozent Rendite oder Marktabdeckung.
