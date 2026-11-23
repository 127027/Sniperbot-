# R29 V2.0 – verbindliches Ziel und Implementierungsstatus (23.11.2026)

## 23.11.2026, 18:48 UTC – NÄCHSTER VERBINDLICHER STAND: V2.0 ISOLIERTER 29H-SOFTWAREDIAGNOSEPFAD, 819/819 PASS

**[Neuester vollständig geprüfter technischer Bericht](R29_V20_ISOLATED_29H_DIAGNOSTIC_20261123.md)**. Tatsächlich in **GitHub CI #45242081198** (Node22, 819/819 PASS, 0 FAIL, 0 Orders) zwei isolierte 5h-Warmup/24h-Diagnosen ausgeführt: echtes Oktober-Quellen-GAP=0 hypothetische Trades; ausdrücklich synthetische Preisfixture=1 Modell-BUY, 1 Modell-SELL, 5.000→5.023,24502994 TEST-USDC ausschließlich hypothetische Buchhaltungsrechnung, **nicht** historischer Gewinn. Strenger eigener Auditor für Cash/Lots/PnL/negative Verluste, deduplizierte Frischquotes, Gebühren/Spread/Impact, Hourly Stop/Take/No-fill. Dateien `src/v20-isolated-scenario.mjs`, `scripts/v20-isolated-scenario-diagnostic.mjs`, `test/v20-isolated-scenario*.test.mjs`; `npm run diagnose:v20` und `npm run diagnose:v20:synthetic`. CI archiviert beide Quelle-GAP-/Fixture-Protokolle. **QA-04 NICHT freigegeben**, originale Nicht-Backtest-Abnahme unverändert **13/60 = 21,67 %** und **8 externe Beweisgates blockiert**, keine echte GPT-/Windows-Fill-Quittung, keine Dots oder Konten geändert. Nächste Chats bitte dieses aktuelle Dossier vor älteren Prozent-/Backtest-Dokumenten lesen.


## NEUSTER TECHNISCHER NACHTRAG 23.11.2026, 18:35 UTC – 802/802 GRÜN, KEIN QA-04

**ZUERST LESEN:** [Dokumentierte kausale Replay-/Dot2-Pending-Reparatur](R29_V20_CAUSAL_REPLAY_AND_DOT2_PENDING_CI_20261123.md) .
GitHub [Source-only CI #45239801393](https://github.com/127027/Sniperbot-/actions/runs/45239801393): **802/802 PASS, 0 FAIL, 0 Orderwrites**, `NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE`; **963 Research-Pools** (keine weltweite Marktdeckung), **13/60** echte Nicht-Backtest-Originalabnahmen, acht Blocker. Späte historische Captures werden nicht rückwirkend als damals verfügbare Replay-Daten genutzt; Zeitstempel sind UTC-strikt und Gewinner-/Oracle-Felder quarantänisiert. Aktueller Dot2-Pending-Forensikstatus und `gpt_execution_identity:'UNVERIFIED'` werden SHA-geprüft, nicht als echte GPT-Authentifizierung ausgegeben. Kein tatsächlicher QA-04-Backtest, keine Orders/Windows-Kontoänderungen, keine Dots angehalten.


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
