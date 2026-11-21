# R29 – 15.11.2026, 24 stündliche Agenten-Scans

Testfenster **2026-11-15 00:00 UTC – 2026-11-16 00:00 UTC**, Deutschland (MEZ) 01:00–01:00 Uhr.

## Verifizierbare Simulation
- GitHub-Lock `LOCK.json` wurde bereits vor der vorangegangenen Ergebnisrecherche eingefroren. **Dieser Holdout wurde jedoch in der letzten Auswertung bereits teilweise entblindet**; er ist kein neuer unabhängiger Test mehr.
- `src/holdout-hourly.mjs` führt **24** vollständige stündliche Entscheidungs-Ticks und die stündlichen fünf Dot-Phasen (:05, :15, :25, :35, :45 UTC) durch, mit 24 statt 4 Strategie-Reviews.
- Der aktuelle Repository-Datenbestand enthält historische, während des Fensters original archivierte Pool-/Quote-Snapshots **nicht**. Die vorhandenen `research/snapshots/2026-11-21/*.json` sind sechs Tage zu spät.
- **24 DATA_GAP**, 0 tatsächlich belegte historische Entdeckungen, 0 nachweisbare historische BUY/SELL, 0 verifizierte PnL. Dieses Nullergebnis bezeichnet die **unvollständigen Testeingaben**, nicht einen Markt ohne Kandidaten.
- Endkapital im leeren Shadow-Ledger bleibt 5.000 TEST-USDC; eine echte historische Performance lässt sich nicht berechnen.

## Ex-post-Diagnose (niemals Strategieseed)
Das [Sasa-Tagesarchiv](https://sasapad.fun/day/2026-11-15/) meldet 5.877 neue Pools und mehrere extreme Tagesanstiege. [Dextape Launch Radar](https://dextape.com/stories/launch-radar-2026-11-15) erfasste in seinem eigenen, anders begrenzten Universum 678 Tokens, wovon nach einem Tag nur 29,5 % noch genügend Liquidität hatten. Diese beiden Zahlen sind keine vollständigen, miteinander identischen Marktuniversen.

Beispielhafte **theoretisch früheste** stündliche Review-Zeit nach rückblickend dokumentierter Pool-Eröffnung (UTC), noch **keine** authentische damalige Dot-Entdeckung oder Buy-Quote:

| Coin | Pool geöffnet (UTC) | Nächster stündlicher Dot4-Review (UTC) | Rückblickend gemeldeter Tagesanstieg |
|---|---|---|---|
| DOPE / BSC | 00:32 | 00:35 | ca. +1.100% |
| MTX / BSC | 00:33 | 00:35 | +788% |
| WANTED / Solana | 09:46 | 10:35 | +889% |
| VICITY / Ethereum | 12:07 | 12:35 | ca. +1.500% |
| GTA / Ethereum | 13:37 | 14:35 | ca. +5.500% |
| Jacket / BSC | 15:40 | 16:35 | ca. +2.800% |
| GATO / Ethereum | 18:12 | 18:35 | ca. +5.000% |

Eine geöffnete Pooladresse ist noch **keine** Kaufmöglichkeit: Für jede Zeit fehlen nachweisbare, zeitgerechte vollständige Contract-, aktuelle Liquiditäts-, unabhängig übereinstimmende Preis- und Sicherheitsnachweise. Endtags- und aktuelle Live-Seiten sind keine historischen Preisquellen.

## Konkrete technische Blocker
1. **Kein historisches, unveränderlich archiviertes Kandidatenuniversum zum jeweiligen Scanzeitpunkt.** Das scheitert bei Dot 2, *bevor* eine Strategie über BUY vs WATCH entscheiden kann.
2. **Kein synchroner zweiter Preisbeleg pro Contract+Pool zur damaligen Uhrzeit.** Dot 3 kann deswegen kein ELIGIBLE belegen.
3. **Kursverläufe und sichere SELL-Ausführung fehlen ebenfalls.** Das spätere Tagesplus erlaubt keine rückwirkenden Orderpreise.
4. **Der isolierte historische Replay ist kein echtes Gespräch aller fünf GPT-Dots.** Ohne originale Dateneingänge können ihre damaligen Bewertungen nicht behauptet werden.

## Nächste Abhilfe
Prospektive Snapshot-Erfassung je stündlichem Dot2-Wake über alle verfügbaren Chains mit vollständiger Pagination, vollständig aufgelöster Contract+Pool-Identität, Originalseite oder Rohdaten-SHA und tatsächlicher Abrufzeit; Dot3 soll zwei unabhängige Poolquellen bestätigen. Dot4 soll beim ersten validen Scan BUY/WATCH/NO_TRADE erwägen und stündlich SELL/HOLD für bestätigte Positionen evaluieren. Erst mit solchen Daten kann ein **neuer, vorher unbeobachteter** Zufallstag ohne Hindsight nachweislich abgeschlossen werden.

Siehe [REPLAY_24_HOURLY.json](REPLAY_24_HOURLY.json) und [POST_HOC_DIAGNOSTIC.json](POST_HOC_DIAGNOSTIC.json).
