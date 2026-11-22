# R29 V1.9 – Root-Cause-Reparatur: aktuelle Dot1/2/5-Journale

**Datum:** 22.11.2026. **Branch:** `codex/r29-cleanroom-paper-20261121`, Repo `127027/Sniperbot-`. Keine Hauptbranch-, Windows-, Guthaben-, Order- oder Backtest-Änderung. Drei echte nachgewiesene Anomalien von `research/latest` bearbeitet. Wichtig: **Git-Blob-SHA ist Dateiintegrität, keine unabhängig attestierte ChatGPT-GPT-Ausführung**.

## Fehler FP-01 – Dot 1: fehlender Journal-SHA

**Fund:** `research/latest/dot-1.json` verwies auf `research/journal/dot-1/2026-11-22/UTC-210715-dot1-v19-20261122T210715727Z.json`, enthielt aber keinen `journal_blob_sha`.

**Root Cause:** Der von Dot 1 erzeugte Latest-Pointer übernahm den Journalpfad, aber nicht den vollständigen unveränderlichen SHA des tatsächlich gespeicherten GitHub-Blobs. Die Inventur durfte das nicht als überprüft zählen.

**Reparatur:** Vorhandene Raw-GitHub-Datei direkt erneut gelesen; tatsächlichen Git-Blob-SHA `7b282cc216ecbc11b26750a71603e172cf970cd1` verwendet. `research/latest/dot-1.json` mit CAS (Original-Blob-SHA) berichtigt; kein neuer Review oder alternativer Marktbeleg erzeugt. Die bereits aktive Dot-1-Automation wurde angewiesen, bei jedem neuen Journal die tatsächliche unveränderliche SHA zu pinnen. Test in `test/v19-dot-journal-inventory.test.mjs` liest den **echten** Blob und rechnet SHA eigenständig nach.

**Bewertung:** Der damalige konkrete Dateiverweis ist **korrigiert**, die präventive Promptregel installiert. Die Authentizität des GPT-Runs bleibt unabhängig **nicht bestätigt**.

## Fehler FP-02 – Dot 5: generischer Journal-Pointer veraltet

**Fund:** `research/latest/dot-5.json` hatte `updated_at_utc=2026-11-22T21:41:10.789Z`, verwies aber unter `journal_path` noch auf das ältere `research/journal/dot-5/2026-11-22/20261122T204310Z-dot5-v19-qa11.json`. Ein echtes neues forensisches Research-Journal stand bereits unter `research/audits/dot-traces/2026-11-22/dot5-20261122T214110789Z-wake11/dot-5-control.json`.

**Root Cause:** Unterschiedliche Schreibziele für generisches Dot5-Journal und neuere forensische Erfassung, jedoch eine unverändert alte `journal_path`-Referenz im aktuellen Status.

**Reparatur:** `research/latest/dot-5.json.journal_path` zeigt jetzt auf das **bereits existierende** neuere forensische Journal, `journal_blob_sha=6bd5234182abd29823fbc718cfdba8d3a541dd40`, `forensic_trace_path` stimmt exakt überein. Historische frühere Referenz unter `previous_generic_journal_path` erhalten. `src/v19-dot-journal-inventory.mjs` und die lokale Inventur-CLI akzeptieren den streng validierten Dot5-Forensikpfad und prüfen echte Raw-Bytes. Eine künftig abweichende Paarung von `journal_path` und `forensic_trace_path` führt zu `DOT5_FORENSIC_JOURNAL_POINTER_DIVERGENCE`. Bestehende Dot5-Automation für Zukunft repariert. Kein neues GPT-Ereignis erfunden.

**Bewertung:** Dieser **konkrete Pointer-Fehler ist behoben**. Vollständige per-Pool-GPT-Dot5-Forensik weiterhin nicht abgenommen.

## Fehler FP-03 – Dot 2: neueste API-Daten und letzte GPT-Prüfung verwechselt

**Fund:** `research/latest/dot-2.json` hielt korrekt das beim GPT-Wake am 22.11.2026, 21:11 UTC zunächst **ausstehende** Capture-Request-Journal und referenzierte den älteren Capture `45066246697` (20:24 UTC). Kurz danach dokumentierte `research/feeds/latest.json` einen **neueren** über GitHub Actions gespeicherten Capture `45070668194` um 21:11:22 UTC. Die unterschiedlichen „latest“-Semantiken führten zu einem stale-source-Befund.

**Root Cause:** API-Capture läuft als eigener GitHub-Actions-Workflow. Dieser aktualisiert `research/feeds/latest.json` zeitversetzt; ein GPT-Review unter `research/latest/dot-2.json` aktualisiert sich nicht automatisch. Ein nachträgliches Umschreiben von `CAPTURE_PENDING` in `GPT_CAPTURE_COMPLETED` wäre eine **falsche GPT-Ausführungsbehauptung**.

**Reparatur:** `src/v19-dot2-capture-view.mjs` erzeugt aus den zwei wahren Quelldatensätzen eine unveränderliche **getrennte, aktuelle Sicht**: `last_gpt_review_*` vs. `latest_feed_*`, tatsächliche Run-ID, aktueller Research-Capture-Pfad und `new_capture_requires_separate_gpt_review`. Validiert Branch-sichere Quellpfade, expliziten Research-only-Typ und den As-of-Zeitpunkt, ohne neue API-/GPT-Aktivität oder eine Paper-Fill-Quittung vorzutäuschen. `src/v19-dot-journal-inventory.mjs` zeigt diese aufgelöste Sicht pro Dot2-Rolle. Der historische pending-Journalzustand wird **nicht überschrieben**. Die bestehende Dot2-Automation wurde angewiesen, beim nächsten echten Wake den aktuellen Feed mit Original-Source-SHA abzugleichen und dann **ein neues** reales Research-Journal mit CAS zu schreiben.

**Bewertung:** Der **lesende Inkonsistenz-/Fehldeutungsfehler ist behoben**. Die jüngere API-Capture-Observation beweist weiterhin nicht, dass ein späterer unabhängiger GPT-Review stattgefunden hat. Das künftige Verhalten der Automation ist erst durch einen realen Folge-Wake abnehmbar.

## Technisch nachgewiesener Testumfang

- `src/v19-dot-journal-inventory.mjs`, `scripts/v19-audit-current-dot-journals-readonly.mjs`, `src/v19-dot2-capture-view.mjs`.
- `test/v19-dot-journal-inventory.test.mjs`, `test/v19-dot2-capture-view.test.mjs`.
- Regressionen: reale aktuelle Git-Blob-Integrität **aller fünf Dot-Journale**; fehlender/manipulierter Hash; Altjournal und Forensikzeit; Dot5-Pfad-Divergenz; Dot2-neueres/älteres/future/fehlendes/untrusted Feed; ausdrücklicher Nachweis **0** selbstautorisiert authentifizierter GPT-Runs oder Orders.
- Beide GitHub-CI-Workflows auf Code-SHA `dd75a8203c4e0474989fabd7b60d041fd5f295fe`: [R29 Cleanroom Paper Tests #45074412370](https://github.com/127027/Sniperbot-/actions/runs/45074412370) und [R29 V1.9 Cleanroom Tests Only #45074412367](https://github.com/127027/Sniperbot-/actions/runs/45074412367) – **700/700 PASS, 0 FAIL**. Die abschließenden Regressionen für den Dot5-Pfadabweichungs-Guard auf Code-SHA `2a65a84808cf5049bc1830612811b6a7329c43cb` sind ebenfalls erfolgreich: [R29 Cleanroom Paper Tests #45074538244](https://github.com/127027/Sniperbot-/actions/runs/45074538244) und [R29 V1.9 Cleanroom Tests Only #45074538245](https://github.com/127027/Sniperbot-/actions/runs/45074538245), jeweils **701/701 PASS, 0 FAIL**.

## Nicht durch Code-/Pointerreparatur ersetzbare Original-Blocker

- `D3-04`: unabhängiger vertrauenswürdiger Issuer / echte Preis- und Quellenprovenienz; **OPEN**.
- `D3-05`: authentisch nachgewiesene chain-spezifische Sellability, Tax, Honeypot-/Blacklist-/Exit-Route; **OPEN**. Der reale einzelne Honeypot.is-BSC-HTTP404 im archivierten Run `45066522539` ist `DATA_GAP`, keine Handelsfreigabe.
- Historisches neutrales Pooluniversum + OCT-12-News-/Quote-`available_at` noch nicht ausreichend.
- Authentische fünf GPT-Role-Run-Quittungen, durchgängige Live-/historische Dot-Kausalkette und separate Windows-Paper-Fill-Quittungen fehlen.
- Fortlaufende forensische TRACE-Journale aller fünf Dots müssen noch über weitere echte Wakes gesammelt und überprüft werden.

**Originale strenge Abnahme:** weiterhin `13 PASS / 46 PARTIAL / 2 OPEN` von 61. **Backtest QA-04 nicht ausgeführt**, kein Paper-Guthaben verändert, weder `main` noch `signals/` beschrieben. Keine der drei Fixes hebt externe D3-/Client-Gates auf.
