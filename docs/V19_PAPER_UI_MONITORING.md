# R29 V1.9 – D4-09: lokale PAPER-Oberfläche (gezielt abgeschlossen)

**Datum:** 22.11.2026 · **Branch:** `codex/r29-cleanroom-paper-20261121` · **Status:** COMPLETE (targeted), keine vollständige Node-/GitHub-Actions-Abnahme.

## Ergebnis

`src/dashboard.mjs` zeigt jetzt lesend:
- das wirklich gespeicherte Paper-Cash in TEST-USDC und die tatsächliche Anzahl offener Positionen;
- die Summe der historischen **Kostenbasis** der offenen Positionen (nicht als aktueller Marktwert ausgeben);
- den Einsatz/Coin und die maximale Positionsanzahl aus der **gemeinsamen** `src/v19-paper-budget-policy.mjs`-Policy, die `src/runner.mjs` beim Start an das Dashboard übergibt;
- pro Position Coin, Chain, Pool, die ursprüngliche Opening-BUY-ID, Menge, Einstiegskurs, Kostenbasis sowie die letzte im lokalen State vorhandene HTTP-Capture-Zeit und deren Alter;
- explizite Datenlücken: `NO_CAPTURE`, `FUTURE_CAPTURE_INVALID`, `PROVIDER_TIME_UNVERIFIED`, `PROVIDER_TIME_REPORTED_UNATTESTED`. Selbst eine vorhandene Zeitangabe ist **kein** nachgewiesener echter Providerpreis;
- den Risikostatus `UNKNOWN_NO_ATTESTED_RISK`, solange im lokalen State kein unabhängig verifizierter Dot3-Beleg vorliegt;
- die letzten 30 lokalen Quittungen, reale **lokale** Ablehnungsgründe wie `DOT3_AUTH_NOT_VERIFIED`, Pending-Status und Dauer seit Erstellung einer nicht veröffentlichten Quittung.

Der Datenprojektor `src/v19-paper-monitor.mjs` ist **rein lesend**. Fehlende Kurse führen niemals zu einem erfundenen aktuellen Marktwert, aktuellen PnL, aktueller Verkaufbarkeit oder bestätigten externen Fill. Ein als `published:true` gespeicherter Receipt-Status wird lediglich als **lokal als gesendet markiert** angezeigt, nicht als unabhängig bestätigte Veröffentlichung.

Die HTTP-Oberfläche bleibt auf `127.0.0.1` mit CSP, HTML-Escaping, Cache-Verbot und nur GET `/`. Keine BUY-/SELL-/Echtgeld-/Dot-Aktivierungsbuttons. Die lokale Ansicht wird weiterhin alle 15 Sekunden neu geladen, das ist **kein** Marktscan.

## Tests

- `test/v19-paper-monitor.test.mjs` – sieben Node-Testfälle eingecheckt: Guthaben/Einsatz, Quittungsverzug, Risiko-/Kurs-Datenlücken, ungültige Zukunftszeiten, HTML-Escaping/XSS, unverändertes Konto, LIVE-Schema-Ablehnung.
- `test/dashboard.test.mjs` – bestehender XSS-Test bleibt erhalten.
- **11/11 direkte gezielte Funktionskontrollen mit identischem GitHub-Modulcode bestanden**: gespeichertes Cash, Einsatz, Kostenbasis, Pending, Quittungsverzug, fehlende Kurse/PnL/Risiko, sicheres Escaping, Ablehnungscode und rein lesender Zustand. Die **vollständige Node-/Actions-Testsuite** war zu diesem Zeitpunkt noch nicht nachgewiesen.

## Einschränkungen

Es wurde **kein echter Gecko-/DEX-/On-Chain-Kurs** hinzugefügt. Die lokale Windows-Oberfläche kann erst nach Pull/Neustart den neuen Code anzeigen; es wurde kein lokales Konto verändert. `D3-04`/`D3-05` (echte Sicherheit/Sellability), `D4-08` (echte SELL-Verarbeitung) und `QA-06` (bestätigte CI) bleiben offen. Kein echtes Paper-Guthaben verändert. Alle fünf Dots pausiert.

**Zähler nach D4-09: 22/61 = 36,1 %, 39 offen.**
