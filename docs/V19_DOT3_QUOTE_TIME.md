# R29 V1.9 – D3-03: HTTP-Abrufzeit ist keine Anbieter-Quotezeit

**Stand:** 22.11.2026. Branch: `codex/r29-cleanroom-paper-20261121`. **Technisch gezielt abgeschlossen**, aber externe Provider-/CI-Abnahme weiterhin offen.

## Gleicher Zeitprüfer in allen Betriebsarten

`src/v19-dot3-quote-time.mjs::classifyDot3QuoteTime` prüft:
- `capturedAtUtc`: wann die HTTP-Beobachtung laut Beleg erfolgte,
- `availableAtUtc`: wann die Beobachtung dem jeweiligen Replay-/Live-Betrieb überhaupt verfügbar war,
- `providerQuoteAsOfUtc`: welcher Quotezeitpunkt **tatsächlich vom Provider berichtet** wird, falls vorhanden,
- `asOfUtc`: der aktuelle virtuelle oder Live-Zeitpunkt der gemeinsamen Entscheidung.

Jede Datumsklasse schützt vor Zukunftswissen. Im Forschungsmodus darf ein **zeitgerecht erfasster aktueller Webkurs** bis zu 600 Sekunden als `HTTP_CAPTURE_ONLY_INDICATIVE` beobachtet werden; das ist keine kaufbare Quote. Der strukturelle Dot3-Preflight akzeptiert nur einen **vorhandenen und höchstens 90 Sekunden alten** Quotezeitpunkt sowie entsprechend frische Abruf-/Verfügbarkeitszeiten. Er **autorisiert trotzdem niemals Orders**, weil echte Quell-/Issuer-Nachweise weiter fehlen.

## Statusklassen

| Status | Bedeutung | Handelsfreigabe |
|---|---|---|
| `HTTP_CAPTURE_ONLY_INDICATIVE` | Providerzeitpunkt unbekannt, HTTP-Erfassungszeit vorhanden und max. 600 s alt | Nein |
| `PROVIDER_TIMESTAMP_CLAIMED_FRESH` | Quotierungszeit vorhanden und strukturell max. 90 s alt, externe Authentizität nicht bewiesen | Nein |
| `PROVIDER_TIMESTAMP_CLAIMED_STALE` | Quotezeitpunkt oder HTTP-Capture zu alt | Nein |
| `STALE_HTTP_CAPTURE` | Nur ältere HTTP-Beobachtung; für neue Analyse erneut abrufen | Nein |
| `FUTURE_NOT_AVAILABLE` | Quelle am as-of noch nicht vorhanden | Nein |
| `INVALID_TIME_SEQUENCE` / `INVALID_PROVIDER_TIME` | Unmöglicher Zeitablauf bzw. fehlerhafter Zeitwert | Nein |

## Durchgängiger Codepfad

- `src/market-observer-v18.mjs`: Shadow-Positionsbeobachtung liefert `quote_time_classifications`; die existierenden öffentlichen Gecko-/DEX-Felder haben regelmäßig `provider_quote_asof_utc:null`.
- `src/v19-dot3-source-pairs.mjs`: Webdomains bekommen dieselbe Zeitklassifizierung. Unterschiedliche Domains sind nicht automatisch unabhängige Upstreams.
- `src/risk-authorization-v18.mjs`: **derselbe** Zeitprüfer ersetzt eigene Datumsbedingungen im strukturellen SHADOW-Preflight. Selbst bei Bestehen sind Blob-/Issuer-/Sellability-Nachweise unabhängig zu prüfen.
- `src/v19-dot3-risk-status.mjs` und `src/v18-requested-backtest.mjs`: verwenden den gleichen Dot3-Weg für `LIVE_PAPER` und `HISTORICAL_ASOF`, keine zweite Strategie.

## Tests und Grenzen

- `test/v19-dot3-quote-time.test.mjs` – sechs Node-Regressionen für unbekannt/frisch/alt/future/retro, Quellenpaar, lesenden Shadow-Observer. Tests eingecheckt.
- **12/12 gezielte Zeitklassentests** und **5/5 Kontrollen des bisherigen strukturellen Risiko-Preflights** wurden isoliert ausgeführt.
- **Kein vollständiger `npm test`-/GitHub-Actions-Lauf nachgewiesen. Keine echte Provider-Timestamp-Attestation, kein authentischer Issuer und keine aktive Paper-Order.**
- Die Quelle kann über den HTTP-Body allein nicht beweisen, **wann** ein nachträglich eingereichter Wert tatsächlich vom Anbieter berechnet wurde. D3-04 und D3-05 sowie D3-07 bleiben für echte Freigaben offen.

Keine Dot-Reaktivierung, kein `main`, kein Echtgeld und keine Änderung am bestehenden Windows-Testkonto.
