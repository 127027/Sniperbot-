# R29 V1.9 – Fortsetzung: forensische Echtjournal-Inventur und harte As-of-Quellengrenze

**Datum:** 22.11.2026 · **Repo:** `127027/Sniperbot-` · **Branch:** `codex/r29-cleanroom-paper-20261121` · **Modus:** READ-ONLY / TESTS-ONLY / PAPER-ONLY. **Kein historischer Backtest ausgelöst.**

## Entscheidung des Nutzers

Der tatsächliche Backtest soll die **Arbeit jedes der fünf GPT-Dots** statt nur theoretische Coins-/PnL-Performance prüfen. Verpflichtend ist eine sehr detaillierte kausale Auditspur: echte Quelle, Pool/Contract/Chain, UTC, von wem beobachtet, welche Alternative erwogen, WARUM WATCH/NO_TRADE/BUY/HOLD/SELL, welche Sicherheitsgates und wie der Fehler konkret zu beheben ist. Am 12.10.2026 00:00 UTC beginnt ein blindes 24h-Fenster mit fünf aktiv beobachteten Warmup-Stunden ab 11.10. 19:00 UTC und mit älterem, zu diesem Zeitpunkt tatsächlich verfügbarem historischem Wissen. Die 65 später bekannt gewordenen Coins sind **Post-Run-Oracle, keine Dot2-Vorauswahl**.

## Bestandsaufnahme tatsächlicher GitHub-Journale (als geprüfte Momentaufnahme, kein GPT-Review-Herkunftsnachweis)

Die fünf aktuellsten Rollenpointer befanden sich unter `research/latest/dot-{1..5}.json`. Chronologische Rollenjournale existieren unter `research/journal/dot-{1..5}/...`. Bei der überprüften Momentaufnahme:

| Dot | Tatsächliche Rolle und Forschungsstatus | Auffällige Diagnose |
|---|---|---|
| Dot 1 | 4 GPT-Reviews/Tag **empfohlen**, fehlende aktuelle vergleichbare Marktdeltas; `DATA_GAP` | `research/latest/dot-1.json` enthält Journalpfad, jedoch keinen `journal_blob_sha`. Zahl 4 ist eine Empfehlung, kein tatsächlich vollzogener Vierer-Review-Nachweis |
| Dot 2 | Ein neuer Capture war bei der letzten GPT-Journalveröffentlichung zunächst noch `CAPTURE_PENDING` | `research/latest/dot-2.json` verweist noch auf vorherigen Capture `45066246697`, während `research/feeds/latest.json` neueren tatsächlich gespeicherten Capture `45070668194` mit `2026-11-22T21:11:22.118Z` ausweist. Das ist ein **Journal-/Latest-Pointer-Lag**, nicht der Beweis eines fehlgeschlagenen neuen Provideraufrufs |
| Dot 3 | sechs konkret priorisierte Risiko-Nachprüfungen: **0 ELIGIBLE**, 5 WATCH, 1 DATA_GAP | Issuer, Quotezeit und empirische Sellability weiter unbestätigt; gültige Quoten lassen sich nicht per SHA-Selbstclaim erzeugen |
| Dot 4 | 2 WATCH, 2 DATA_GAP, 0 Orders / Fills | `gpt_reviews_completed_this_run: 1` im Forschungsjournal ist **nicht** gleich `independent_gpt_receipt_verified: true`. Keine sichere Dot3-Paper-Freigabe |
| Dot 5 | eigene tatsächliche forensische Forschung unter `research/audits/dot-traces/2026-11-22/dot5-20261122T214110789Z-wake11/dot-5-control.json` | Letzter `research/latest/dot-5.json`-Pointer hat `updated_at_utc=21:41:10.789Z`, aber sein generischer `journal_path` zeigt noch auf die ältere Forschung `20:43`. Neue forensische Datei ist separat referenziert; die einheitliche Five-Dot-Schemaabnahme bleibt offen |

Diese Diagnose erhebt **keine historischen Oktober-GPT-Ausführungen**. Bereits heute live vorhandene November-Journale dürfen nicht in den Oktober umdatiert werden.

## Umgesetzte Softwareerweiterungen

1. `src/v19-dot-journal-inventory.mjs`: Rein deterministischer Read-only-Pointer-/Datei-/Git-Blob-Abgleich für fünf Rollen, prüft Dateipfad, Rollenidentität, Blob SHA, Journal-/Pointer-Zeitordnung, neuere Feed-Beweise gegenüber älteren Dot2-Referenzen und fehlenden Link auf ein individuelles forensisches Rollenprotokoll. Gibt `INCOMPLETE_EVIDENCE` statt vorgetäuschter Gesamtsystemabnahme aus. `verified_live_gpt_runs`, `verified_historical_gpt_runs`, `verified_client_fills` bleiben **0 bis zu unabhängigen Belegen**, nicht kraft JSON-Claims.
2. `scripts/v19-audit-current-dot-journals-readonly.mjs`: Offline-CLI auf dem vorhandenen Branch-Checkout. Ausführung: `node scripts/v19-audit-current-dot-journals-readonly.mjs`. Liest ausschließlich Repository-Dateien und gibt den strukturierten Befund auf stdout aus; **kein Netzwerk, keine GitHub-Schreibaktion, kein GPT-/Backtest-/Wallet-Aufruf**.
3. `test/v19-dot-journal-inventory.test.mjs`: sechs spezielle Testfälle (fünf Rollen, gültige Git-Blob-Einheit, SHA-Manipulationen, verkehrte Zeitstempel, fehlendes Journal, Dot2-Feed-Verzug, Dot5 älteres Journal, ungültige Pfade) sowie ein CLI-Lauf unter CI mit **realen, bereits im Repo enthaltenen** Rollenpointern.
4. `src/v19-five-dot-forensic-trace.mjs`: Verweigert positive `BUY`, `SELL`, `ELIGIBLE`-Behauptung, wenn keine Eingangsbelege vorliegen oder bekannte Sicherheits-/Datenlücken noch bestehen. Vorbedingung exakter Poolidentität für Dot3-ELIGIBLE. Source-`event_at`, `captured_at`, `available_at` müssen chronologisch möglich sein. Aus später nachgeladenen `RETRO_ASOF_RECONSTRUCTION`-Daten darf **keine** damalige `DISCOVERED`-Behauptung abgeleitet werden; forensisches Forschungs-WATCH bleibt möglich. Nachträgliche Backtest-, Training- und Evaluationsartefakte sind als Blindquellen gesperrt.
5. `test/v19-five-dot-forensic-trace.test.mjs`: zusätzliche Regressionen für fehlende Source bei BUY/SELL/ELIGIBLE, nachträglich erfundene Entdeckung, Source-Timestamp-Fehler und Oracle-/Trainings-/Backtest-Pfadlecks.

## Verifizierte Softwaretests und ihre Grenzen

Die echte GitHub-CI für den neuen Read-only-Auditor meldete **688/688 PASS**, beide Workflows:
- [#45073762304](https://github.com/127027/Sniperbot-/actions/runs/45073762304)
- [#45073762301](https://github.com/127027/Sniperbot-/actions/runs/45073762301)

Für CLI und verschärfte Zeit-/Blind-Quellengates wurden weitere Commits durchgeführt und die nachfolgenden CI-Läufe an dieser Stelle noch gesondert geprüft. Grün heißt Software-Regression, **nicht** aus eigenen GitHub-Daten unabhängig beglaubigte GPT-Ausführung. Keine Verbesserung einer unbestätigten Originalaufgabe als `PASS` verbuchen.

## P0 – vor Endabnahme noch erforderlich

1. Dot1–5 müssen ihre echten zukünftigen Wakes in ein **gemeinsames unveränderliches Event-/Quellenschema** schreiben; die aktuellen November-Rollenjournale sind noch heterogen. Pro Pool `Chain+Contract+Pool`, Quelle/Quellezeit, tatsächliche GPT-Ausführungsreferenz, genaue WHY-/WHAT-/ALTERNATIVES-/Missing-Fields und kausale Vorgänger-IDs. Fehlende Dokumentation ist expliziter Blocker.
2. Dot2 muss einen erfolgreich abgeschlossenen Capture revisionssicher gegen einen neuen Current-Journal-Eintrag mit richtigem Feed-Blob verknüpfen, ohne den früheren `CAPTURE_PENDING`-Eintrag rückwirkend als fertige GPT-Prüfung auszugeben.
3. Echte unabhängige Dot3-Issuer-/Provider-Quotezeit-/Chain-Sellability-Belege (D3-04/D3-05) fehlen. Darum weiterhin keine echte Authorisierung eines Paper-BUY.
4. Ein lokaler Windows-Paper-Client muss bei späterer echter Freigabe getrennt einen unveränderlichen Paper-Fill unter dem ursprünglichen Guthaben von 5.000 TEST-USDC/50 TEST-USDC pro Coin beglaubigen. Den bestehenden Kontostand nicht zurücksetzen oder verändern.
5. Die neutrale Oktober-Population sowie vollständige Quellen- und News-As-of-Belege bleiben nötig. 65 bekannte spätere Gewinner sind **kein** neutraler Markt-Nenner. Kein historischer Provider-429 oder nachträgliches OHLCV als tatsächliche damalige Dot-Observation maskieren.
6. Verbindliche 60 ursprüngliche Nicht-Backtest-Abnahmen weiterhin vor QA-04. Originalstatus zuletzt **13 PASS / 46 PARTIAL / 2 OPEN (61 Kriterien)**. Holdout erst nach dem 25.11.2026 06:54 UTC und gereiften Labels prüfen.

**Keine Änderung** der fünf Automation-Zeitpläne, des Main-/Legacy-Branches, der GitHub-Orders, der lokalen Windows-Balances oder des isolierten Oktober-Backtests. Kein `QA-04` gestartet. Die Arbeit ist eine **neue überprüfbare Diagnosefähigkeit**, keine Vollabnahme.
