# Umsetzungsnachweis – Historische Memecoin-Fälle und fünf optimierte Sniper-Dots

**Datum:** 09.11.2026. **Umfang:** ausschließlich `127027/Sniperbot-`, Branch `codex/research-gateway-v04`.

## 1. Neue/angepasste Repository-Dateien

| Datei | Zweck |
|---|---|
| [MEMECOIN_10_CASE_STUDIES_20261109.md](MEMECOIN_10_CASE_STUDIES_20261109.md) | Zehn historische Gewinner (DOGE, SHIB, PEPE, BONK, WIF, FLOKI, BRETT, POPCAT, BOME, FARTCOIN), vier zusätzliche Gegenproben (SQUID, BALD, HAWK, LIBRA), Quellen, Datierung, vorab sichtbare Hypothesen, fehlende Rohdaten und Survivorship Bias |
| [DOT_DISCOVERY_PLAYBOOK_V1.md](DOT_DISCOVERY_PLAYBOOK_V1.md) | Fünf fachlich getrennte Rollen, strukturierte kostenlose Datenquellen, Entscheidung zur alleinigen Scout-Kandidatennominierung, persistente Research-Watchlist, Anti-Duplikate, Wiedervorlage, 17-/18-Tage-Evaluationshorizonte ohne Profitversprechen |
| [../research/watchlist/current.json](../research/watchlist/current.json) | Leere initiale `research_watchlist.v1`, paper_only=true, actionable=false; **keine** fingierten Coins und **keine** von einem planmäßigen Dot behauptete Publikation |
| [../runner/research-watchlist.mjs](../runner/research-watchlist.mjs) | Pure Read-only/Research-Funktionen: gültige Chain/Token/Pool-Identität, schema-strikte Validierung, Merge mit persistenter First-Seen-Zeit, Dedup, Rejected-/Archived-Statusschutz, deterministische PRIORITY/next-check-Sortierung |
| [../runner/research-watchlist.test.mjs](../runner/research-watchlist.test.mjs) | Sieben neue automatisierte Tests (safe empty, EVM-Identität, verschiedene Pools, Merge, veraltete Updates, kein unautorisierter Restart, Due Queue, ungültige Felder), keine echten Handelsläufe |

**CI-Verifikation:** GitHub Actions-Lauf [42621484728](https://github.com/127027/Sniperbot-/actions/runs/42621484728) für Commit `ccf3714b296b51aa7adb23f8629d0607f64cf0a3` **success**, nach echten Job-Logs **56/56 Node-Tests bestanden, 0 failed**. Alle neuen Tests sind in bestehendem `node --test runner/*.test.mjs` enthalten. Keine neue kostenpflichtige CI-Aufgabe eingerichtet.

## 2. Echte aktualisierte ChatGPT-Automationen

Alle fünf bereits existierenden Sniper-Aufgaben wurden über die Automationsverwaltung **promptseitig aktualisiert**, und nach Aktualisierung erneut gelesen. Die Nachprüfung ergab bei allen `enabled=true`, identischen Zeitplänen/Timing-Modi wie vorher, vorhandenem Promptmarker `SNIPER_DISCOVERY_PLAYBOOK_V1_20261109` und Verweis auf das neue Playbook. **Es wurden keine zusätzlichen Automationen erstellt.**

| Rolle | Tatsächliche Aufgabe / ID | Neue Priorität |
|---|---|---|
| news_discovery | Meme Scout – Forschungsradar / `6aed110ecec48191b7c74a899068b7f1` | vier Chain-APIs durchsuchen, echte Token-/Pool-IDs erstmalig nominieren, **alleiniger Watchlist-Schreiber**, bestehender neunfeldiger `research_notice.v1`-Statusfeed **unverändert** |
| social_acceleration | Sniper Social Research / `Automation_6fb34c116d4c819183447cb83d021528` | Watchlist zuerst, unabhängige echte Social-Quelle/Autoren und Paid-Ad-Abgrenzung |
| onchain_liquidity | Sniper Onchain Research / `Automation_86b58a5512548191bd1d556d2a080908` | echte Pool-Trades/Volumen/Liquidität, Wallet-Cluster, externe Sellability=UNKNOWN ohne Validator |
| contract_security | Meme Sniper – Techniklabor / `Automation_f4c566f4335081919c8d2e3167c0b7e4` | konkrete Contract-/Tokenkontorisiken der Watchlist vor allgemeinem Technik-Research untersuchen |
| opportunity_qa | Sniper Opportunity QA / `Automation_f0bc047f97d48191873d6d3910c2a405` | Watchlist gleicher candidate_id, Zeit-/Quellen-Korrelation und Gegenhypothesen prüfen; keine 5x dieselbe Quelle |

**Wichtige Korrektur:** Die fünf Rollen dürfen `CANDIDATE_OBSERVED` bereits nach identifizierter und quellbelegter `chain:token_address:pool_address`-Identität setzen, **ohne** dass der andere Dot den Coin zuvor gefunden hat. Der alte gegenseitige Wartezustand ist damit im Prompt behoben. Dies ist nur eine Forschungsnominierung, **keine** Kaufentscheidung oder Validierung der Verkaufsfähigkeit.

**Prompt-Freigabe:** Beim Scout ist neben bisherigem Statusfeed und Rollen-Snapshot genau ein weiterer eigener Schreibpfad `research/watchlist/current.json` ausdrücklich zugelassen. Alle anderen Rollen **lesen** Watchlist und schreiben ausschließlich ihren eigenen bisherigen `research/roles/<role>/latest.json`. SHA-/Readback-Prüfungen und fehlende Rechte sind verpflichtend; nur echtes Schreiben darf als abgeschlossen gemeldet werden.

## 3. Was die Veränderung real leistet – und was nicht

- **Real umgesetzt:** historische Quellenübersicht, dokumentierte falsifizierbare Frühsignalhypothesen, deduplizierte persistente Watchlist als leeres Research-Artefakt, getestete Offline-Review-Funktionen, fünf tatsächlich aktualisierte laufende Automationsprompts.
- **Erster echter Scout-Lauf nach der Umstellung nachgewiesen:** Geplanter Lauf vom **09.11.2026 um 13:03 UTC** hat das neue Playbook und die anderen Research-Snapshots gelesen und die Watchlist tatsächlich mit Zeitstempel **13:03:33.025 UTC** per GitHub-Commit `f2f909532b6fbef2a7dd858f97de70b7a303fc42` aktualisiert. Der Zugriff auf strukturierte New-Pool-APIs scheiterte dabei teilweise an Web-Rechten beziehungsweise DNS; daher **0** validierte Adressen, kein Coin, keine Order. Die vier Fachrollen müssen eine erste gemeinsame echte Kandidatenanalyse noch beweisen. Einzelheiten/Backoff: [DOT_DISCOVERY_PLAYBOOK_V1.md](DOT_DISCOVERY_PLAYBOOK_V1.md), Abschnitt 8. Eine laufende ChatGPT-Stundenaufgabe ist noch kein Sekundentakt-Marktdienst.
- **Nicht implementiert:** eine globale minuten-/sekundengenaue WebSocket-/RPC-Überwachung, vollständige historische Onchain-OHLCV-/Wallet-/Social-Daten, autonome Modell-Nachtrainierung oder empirisch kalibrierte Gewinnwahrscheinlichkeit; sichere Ed25519-Publisher-/Queue- und vollständige unabhängige Contract-/Sell-Quote-Adapter fehlen weiter.
- **Handel bleibt BLOCKED:** research_notice.v1 sowie research_role_snapshot.v1 und research_watchlist.v1 sind ausschließlich `actionable=false`; keine Verbindung zu externen Paper-Orders, keine Echtgeld-/Wallet-/PayPal-Verbindungen.
- **Kein lokaler PC-Eingriff:** bestehende virtuelle 1.000 Test-USDC, Min/Max und Laptop-Prozess wurden **nicht** angetastet. Kein Hixton-Touch und kein Merge nach `main`.

## 4. Nächste objektive Research-Abnahme

1. In echtem planmäßigem Scout-Lauf aus einem strukturierten API-Pooldatum eine konkrete, nachprüfbare **`solana|base|bsc|eth:token:pool`**-ID erzeugen (nicht Symbol).
2. Dieselbe ID im Scout-Snapshot und in der Watchlist, mit UTC, unabhängiger Quelle, `first_seen` und `next_check`, auf dem Arbeitsbranch per SHA-konfliktsicherem Commit+Readback nachweisen.
3. Mindestens zwei andere bestehende Research-Rollen lesen die ID und veröffentlichen **eigene** geprüfte oder ehrlich unbekannte Evidenz; QA prüft Quelle/Datum/Unabhängigkeit.
4. Fortschrittsmetriken über mehrere echte Beobachtungsfenster dokumentieren; negative Pools und gescheiterte Kandidaten behalten. **Kein** Kaufsignal aus diesem Ablauf erzeugen.
5. Erst separate technische Implementierung eines sicheren Live-Collectors, unabhängigen Validierers und Publishers, bevor irgendein externer Paper-Fill jemals freigegeben wird.

**Die zehn Gewinner sind historische Trainingsbeispiele für Suchheuristiken, keine zehn Backtests; kein verifizierter Nettogewinn wurde berechnet.**

## Nachtrag: dynamische Watchlist und CI-Regressionskorrektur

Der neue Test hatte zunächst irrtümlich einen dauerhaft leeren `published_at_utc` erwartet. Der erste echte Scout-Lauf aktualisierte den Wert korrekt. Der Test wurde daraufhin geändert: Er prüft nun die aktuelle Research-Datei auf schema-strikte Gültigkeit, paper_only=true und actionable=false, ohne echte neue Veröffentlichungszeitpunkte oder künftige Kandidaten zu verbieten. Die korrigierte GitHub Actions-Pipeline [42622372929](https://github.com/127027/Sniperbot-/actions/runs/42622372929) lief anschließend erfolgreich. Dieser Testfehler war **kein** Handels- oder Forschungsdatenfehler.
