# R29 V1.9 SYS-11 – GeckoTerminal Provider-429-Schutz (Teilabnahme)

Stand: 22.11.2026, reiner Cleanroom-Paper-/Research-Branch `codex/r29-cleanroom-paper-20261121`.

## Ausgangsbeweis
- Einmaliger expliziter sechs-Chain-Original-Capture: GitHub Actions #45036887325.
- Fünf Chain-Antworten HTTP 200, Ethereum Page 1 HTTP 429 am 22.11.2026 15:11:15.734 UTC.
- Tatsächliche Rohantwort/HTTP-Fehler sind in `research/feeds/2026-11-22/45036887325/` archiviert.
- Persistierter `retry_after_utc` für Ethereum: **22.11.2026 16:11:15.734 UTC**. Vor Ablauf keine neue Gecko-Anfrage auf diesem Shared-Provider durchführen.
- Ursprung: sechs API-Requeststarts in etwa 1,4 Sekunden. Das vorher hinzugefügte 1,7-s-Pacing kann die strengere dokumentierte Grenze von ca. 10 Aufrufen/Minute NICHT einhalten.

## Technische Korrektur (keine Handelsausführung)
- `src/v19-gecko-provider-cooldown.mjs`: eine einzige pure Provider-429-Prüfung mit strikter Sperrfrist. Quellen sind die *bestehenden* persistenten Checkpoints:
  - `research/state/market-memory.json` (neue Pools: `last_status=HTTP_429`),
  - `research/state/older-pool-captures.json` (Trending: `status=HTTP_429`),
  - `research/state/ohlcv-backfill.json` (OHLCV: `last_status=HTTP_429`).
  Nur tatsächlich mit 429 markierte, noch aktive Retryfristen blockieren den Gecko-Anbieter. Der späteste gültige Zeitpunkt gewinnt; andere Anbieter (DEXScreener) werden nicht global gesperrt.
- `scripts/cloud-discovery-runner.mjs` lädt **alle drei** Checkpoints *vor* dem nächsten Gecko-Request. `fetchRaw` lehnt jegliche Gecko-New-Pool-/Trending-/OHLCV-Abfrage während des Cooldowns ab, noch bevor ein HTTP-Request beginnt.
- Noch nicht abgefragte geplante neue Pool-Seiten erhalten `PROVIDER_429_COOLDOWN` / `DEFERRED_NOT_FETCHED`, bleiben in der persistierten Page-Coverage-Warteschlange und zählen **nicht** als HTTP-Anfrage/Quellbeweis. Nach einem 429 im aktuellen Run werden spätere Gecko-Arbeiten ebenfalls übersprungen.
- Ältere/Trending- und OHLCV-Planungen vermerken `DEFERRED_PROVIDER_429` explizit, ohne vorzutäuschen, sie seien abgefragt worden; die Persistenz-Cursor bleiben erhalten. Das ursprüngliche echte 429 bleibt samt Rohantwort und Retrybeleg archiviert.
- `src/v19-gecko-pacing.mjs`: Mindestabstand von 1.700 ms auf **6.100 ms zwischen Requeststarts** für ALLE Gecko-Endpunkte angehoben. Keine Behauptung, dies garantiere HTTP 200 oder liefere einen echten dynamischen Token-Bucket.
- `test/v19-gecko-provider-cooldown.test.mjs` und `test/v19-gecko-pacing.test.mjs` prüfen Original-429, Ablauf, Startzeit, providerübergreifende Unabhängigkeit, Trending-/OHLCV-Persistenz, Codeintegration und die konservative 6,1-s-Startabstandsregel.

## Quellen und konservative Budgetentscheidung
- Offizielle GeckoTerminal Public API Docs: https://api.geckoterminal.com/docs/index.html – ungefähr 10 Calls/Minute, schwankt mit Netzwerkverkehr; etwa eine Minute Cache.
- Offizielle CoinGecko-Hilfeseite, zuletzt 02.10.2026 aktualisiert: https://support.coingecko.com/articles/6867086195-does-geckoterminal-have-an-api – 30 Calls/Minute.
- **Widerspruch ungelöst**: Für den kostenlosen Public-Endpoint gilt hier konservativ die strengere veröffentlichte Zahl. Ein Abstand von 6,1 Sekunden ist eine Vorsichtsregel, kein gemessener oder garantierter Limitnachweis. Shared IPs und vorherige externe Last können weiter 429 verursachen.

## Abnahmegrenzen / nächster Schritt
- SYS-11 **bleibt offen**: echte nach-Cooldown Sechs-Chain-Erfassung, per-Endpoint-Ratenbudget/Reservierung (neue Pools, FAIR/HOT, OHLCV), URL-/Antwort-Cache, Retry-After plus Jitter und Provider-Last unter realem Actions-Run prüfen.
- D2-01 **bleibt offen**: 5/6 tatsächliche HTTP-200-Chains im letzten gemeinsamen Run; eine geplante Chain/Seite ist kein erfolgreicher Capture. Für den historischen Oktober-Zeitraum existiert kein beweisender vollständiger Original-Capture.
- GitHub Node-22-CI auf dem finalen Code-Commit ist gesondert über das zugehörige Actions-Run-/Artefakt zu verifizieren; isolierte Tests oder alte grüne CI-Läufe nicht umdeuten.
- **Keine Dots aktiviert, keine Orders oder Echtgeldtransaktionen, keine Änderungen an `main` oder am Windows-Paper-Konto.** Fortschrittszähler bleibt **25/61 = 41,0 %**, bis SYS-11 tatsächlich die vollständige Abnahme erfüllt.
