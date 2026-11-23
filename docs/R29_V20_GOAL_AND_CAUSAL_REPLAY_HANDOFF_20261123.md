# R29 V2.0 – verbindliches Ziel und Implementierungsstatus (23.11.2026)

## Nutzerfreigabe
Der Nutzer hat die vollständige Weiterentwicklung einschließlich eines **rein offline simulierten, chronologischen Diagnose-Backtests** für 12.10.2026 00:00–13.10.2026 00:00 UTC ausdrücklich freigegeben. Die frühere Anweisung „noch keinen Backtest“ ist nur insofern ersetzt: **ein echter belastbarer historischer Blindbacktest darf weiterhin nicht behauptet werden**, solange originale neutrale und zeitgerecht verfügbare Oktoberquellen fehlen. Keine Paper-/Echtgeldorders und keine Änderung des lokalen Clients.

## Ziel
Fünf bestehende Dots sollen mit denselben Erkenntnis-/Risikoregeln in Forschung, Offline-Replay und späterem lokalem Paperbetrieb arbeiten: kontinuierliche mehrkettenfähige Discovery, News- und Volumenbeobachtung, Nachladen fehlender Belege über mehrere Stunden, adaptive 4/8/12/24 **echte** GPT-Vollreviews pro Tag, chain-spezifische Sicherheit, BUY/HOLD/SELL/NO_TRADE, nachprüfbare simulierte Exits und separate echte Client-Receipts. GitHub dient als persistentes, begrenztes, byte-/origin-gesichertes Gedächtnis. Neue Pools und Verlierer sind ebenso wichtig wie Gewinner. Keine „alle Memecoins“-Behauptung ohne gemessene Abdeckung.

## Exakte Oktoberuhr
Warmup 11.10.2026 19:00 UTC bis 12.10.2026 00:00 UTC; Test 12.10.2026 00:00 bis 13.10.2026 00:00 UTC (Ende exklusiv). 65 retrospektive Oktoberlabels ausschließlich **nach** dem Blindlauf. Alle Quellen benötigen Published-, Available- und Capture-Zeit sowie unabhängigen Ursprung. Ein heutiger historischer Candle-Fetch beweist **keine** damalige Verfügbarkeit. Simulierte Handelsentscheidungen nur in getrenntem hypothetischen Ledger, nie in signals/orders.

## Neuer konkreter Patch
- `src/v19-causal-replay-research.mjs`: rein funktionaler fail-closed Replay-Kern, stündliche virtuelle Uhr, Ereignisquarantäne bei fehlenden/widersprüchlichen Zeitstempeln, fehlender Quellorigin-/Originalbyte-Bestätigung, fehlender Identität oder Oracle-Leak. Immer NO_TRADE, solange keine autorisierte separate Strategie-/Risiko-/Client-Ausführung integriert ist. Keine Orders, kein Guthabenzugriff.
- `test/v19-causal-replay-research.test.mjs`: sechs Node-Testfälle für stündliche Verfügbarkeit, fehlende Zeit, Oracle, rückwirkenden Abruf, Zeitwiderspruch und Null-Daten. Tests wurden in dieser Bearbeitung **nicht in GitHub Actions ausgeführt**. Keine PASS-Promotion.
- Wichtig: Dieser Kern ist ein **Diagnose-Replay**, **kein** fertiger Backtest mit simulierten Fills und **kein** Beleg für erfolgreichen Handel. Ohne neutralen Oktober-Datensatz bleiben die realen 24 Stunden nicht empirisch testbar.

## Bekannte weiterhin offene Abnahme
13/60 Nicht-Backtest-Aufgaben PASS (21,67%); 45 PARTIAL, 2 OPEN, darunter D3-04 unabhängiger Risk-Issuer und D3-05 empirische Sellability. November-Holdout frühestens 25.11.2026 06:54 UTC vollständig. 4/8/12/24 sind echte GPT-Reviews, HTTP-Jobs zählen nicht.

## Nächste Schritte, ohne Rückfragen
1. Regression des neuen Replay-Kerns auf Node22 ausführen, GitHub Actions/CI verifizieren und Fehler beheben.
2. Neutrales historisches Pooluniversum und damalige Quelleingangszeiten für Oktober sichern. Wenn unmöglich: klarer BLOCKER, kein künstlicher Backtest-Erfolg.
3. News-/Social-Quellen mit Published-/Available-/Capture-Timestamps und bytegenauer Provenienz integrieren.
4. Authentifizierten unabhängigen Risk-Issuer (D3-04) und empirische Chain-Sellability (D3-05) vor Paper-BUY nachweisen; Honeypot.is allein ist keine Freigabe.
5. Virtuelles Portfolio, Stop/Exit, Gebühren, Slippage, No-fill und stündliche Positionskontrolle als **separaten Offline-Simulator** mit invarianten Null-Orderwrites ergänzen.
6. Erst danach vier weitere vorab festgelegte, unbekannte Holdout-Tage ohne Gewinner-/Zukunftsleak testen und Gesamtstrategie gegen Baselines vergleichen.

## Unveränderliche Grenzen
Nur Repo `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`; niemals main/Legacy. Bestehende fünf Dots nicht deaktivieren, keine neue Automation. Keine Echtgeldaktion, kein Paper-Orderwrite, keine falschen GPT-/API-/Client-Quittungen, keine Provider-Limit-Umgehung. Fortschritt nur nach nachgewiesener Originalabnahme erhöhen.
