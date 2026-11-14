# Memecoin Sniper V0.5 – neue Starts, 2× bis 200×, lokales Forschungslernen

**Stand:** 09.11.2026 · **GitHub-Branch:** `codex/research-gateway-v04` · **PAPER ONLY / NO TRADES**.
**Produktspezifikation:** frühe Entdeckung neu gegründeter, neu gelisteter oder gerade gehypter Memecoins – nicht nachträgliches Auswählen bereits bekannter großer Alt-Memecoins.

## Historische Basis: zeitlich saubere Beispiele und Gegenproben

[10 dokumentierte historische Gewinner und vier Gegenproben](MEMECOIN_10_CASE_STUDIES_20261109.md) enthalten u. a. DOGE, SHIB, PEPE, BONK, WIF, FLOKI, BRETT, POPCAT, BOME, FARTCOIN sowie SQUID, BALD, HAWK und eine weitere Negativkontrolle. Sie sind **Lehrbeispiele für damalige Muster, keine zufällige Grundgesamtheit und keine Wahrscheinlichkeitsschätzung**. Die nächste quantitative Studie muss auch alle im betreffenden Zeitraum beobachteten Erfolglosen, verschwundene und illiquide Pools dokumentieren.

**Forschungsfragen:** Was war unmittelbar vor dem Hype tatsächlich erkennbar? Poolalter, neue individuelle Käufer und unabhängige Social-Autoren, 5/15/60-Minuten-Volumen, Pool-Liquidität, Werbung/Promotions, Deployer-/Holder-Cluster, Contract-Rechte, LP-Kontrolle, reale Verkaufbarkeit und Gebühren/Slippage. Kein späterer Höchstkurs darf als beim Einstieg bereits bekannte Information behandelt werden.

## Technischer Umfang der neuen V0.5-Stufe

| Baustein | Umsetzung |
|---|---|
| Breiterer Neupool-Collector | `runner/research-market-collector.mjs` liest **höchstens zwei neue-Pools-Seiten pro Chain** für Solana, Base, BSC und Ethereum pro **120-Sekunden-Durchlauf**. Maximal **96 deduplizierte Identitäten pro Durchlauf**; 429/Provider-Ausfälle werden als Teilausfall markiert und nicht blind wiederholt |
| Datenumfang | Initiale `price_usd`, `liquidity_usd`, 5-Minuten-Volumen und Buy-/Sell-Transaktionszahl, sofern öffentlich im Provider-Snapshot vorhanden; unbekannte Felder bleiben `null` |
| Lokale Archivierung | Gzip-Rohsnapshots unter `.local/research-market/history/`, maximal 45 Tage **wenn** 512-MiB-Gesamtgrenze und 40.000-Dateien-Grenze das erlauben. Daten sind öffentliche Marktbeobachtungen, keine privaten Paper-Konten |
| Nachbeobachtung | Separater `runner/memecoin-followups.mjs` speichert unter `.local/research-learning/pools.json` eine **ausgewählte**, zeitlich gestaffelte Stichprobe. Pro Chain höchstens ein neu aufgenommener Forschungsfall pro sechs Stunden, maximal 56 gleichzeitig aktive Pools pro Chain, Beobachtung bis Tag 14 |
| Wiederholte Poolabfragen | Öffentlicher GeckoTerminal-Multi-Pool-Endpunkt: **maximal vier Batch-Requests pro 120-Sekunden-Zyklus**, bis zu 30 genaue Pooladressen pro Batch/Chain. Hohe anfängliche Dynamik: zunächst ca. alle 15 Minuten, danach 1–6 Stunden; Kontrollfälle ca. alle 6 Stunden. Provider-Rate-Limits können die tatsächlich erreichte Dichte reduzieren |
| Gegenproben | Deterministische, zeitlich verteilte `DETERMINISTIC_CONTROL`-Stichprobe neben `EARLY_MOMENTUM`. Diese Stichprobe ist **noch nicht repräsentativ für alle Launches** |
| Auswertung | `runner/memecoin-outcomes.mjs`: indikative maximale Preisbewegungen **2×, 5×, 10×, 50×, 200×** im 14-Tage-Fenster. Ein unbeobachtetes oder unvollständig dokumentiertes Nicht-Erreichen wird `UNKNOWN`, **nicht** als bestätigter Fehlstart gezählt |
| Lernvergleich | `runner/memecoin-learning.mjs` zählt beobachtete und nur unter vollständigen Zeitreihen beurteilbare Kohorten sowie Preis-Schwellenereignisse. Kein trainiertes Vorhersagemodell, kein automatisch validierter Vorteil, keine voreilige Erfolgsquote |
| Desktop-Anzeige | `/api/research/learning` und Dashboard zeigen die aktive lokale Forschung und den letzten Nachbeobachtungsstatus **ohne** Änderungen am Paper-Portfolio |
| Fünf Dots | Alle fünf bestehenden Forschungsautomationen wurden auf V0.5-Früherkennung, historische Gegenproben, Belege und 2×/5×/10×/50×/200×-Ziele ausgerichtet. Ihre Zeitpläne und ihre jeweils autorisierten GitHub-Dateien bleiben unverändert |

Offizielle Quellen: https://api.geckoterminal.com/docs/index.html und https://docs.dexscreener.com/api/reference . Öffentliche APIs und Limits können sich ändern. Die Public-GeckoTerminal-API hat schwankende Zugriffsgrenzen; der Bot arbeitet mit konservativem Anfragebudget und markiert fehlende Daten als `SOURCE_UNAVAILABLE`. `CROSS_PROVIDER_IDENTITY` bestätigt nur dieselbe Chain/Token/Pool-Identität, **nicht** den Contract oder die ausführbare Verkaufsroute.

## Lokale Daten: was wird geschützt?

- **Paper-Kontostand, persönliche Einstellungen, Positionen:** weiterhin unter `%LOCALAPPDATA%\MemeSniperPaper`, nicht in den neuen Research-Dateien, nicht in öffentlichen GitHub-Dateien.
- **Historische Markt-Snapshots:** `<Projektordner>\.local\research-market\history\`.
- **Neue wiederkehrende Pool-Beobachtungen und 14-Tage-Indikatoren:** `<Projektordner>\.local\research-learning\pools.json`.
- **Status der fünf GitHub-Forschungsrollen:** `<Projektordner>\.local\research-network\status.json`.
- GitHub bekommt nur ausdrücklich freigegebene, öffentliche nicht handelbare Markt- und Rollen-Snapshots, **keine** private `.local`-Historie, Portfoliodaten, Schlüssel oder DPAPI-Token.
- Wenn das Projekt auf dem Windows-Desktop liegt, liegen dessen `.local`-Forschungsdateien ebenfalls dort. Ein Cloud-Dot besitzt dadurch **keine** direkte Windows-Dateiberechtigung. Der lokale Collector schreibt sie.

## Wichtige Qualitäts- und Sicherheitsgrenzen

**Neuentdeckung ist keine vollständige Marktüberwachung.** Zwei API-Seiten und eine begrenzte Stichprobe reichen nicht zur Behauptung, alle Hunderttausende existierenden Coins, alle Launchpads oder sekündliche Hypes zu sehen. Wallet-Unabhängigkeit, Contract-Sicherheit und Verkaufbarkeit müssen unabhängig nachgeprüft werden. Mehrfach derselbe Datenaggregator ist keine unabhängige Bestätigung. Fehlende Daten sind `UNKNOWN`.

**Ein indikativ beobachtetes 200×-Hoch ist kein simulierbarer 200×-Exit.** Ohne reale Pooltiefe, Verkaufspfad, Gebühren, Slippage und vollständige Preisabdeckung werden keine erzielten Gewinne, sicheren Ausbruchswahrscheinlichkeiten oder realistischen abgeschlossenen Paper-Trades behauptet. Das Modell `runner/breakout-forecast.mjs` braucht zuerst vollständig überprüfte historische Holdout-Kohorten; **95 Forschungs-Score ≠ 95% Wahrscheinlichkeit**.

**Keine automatischen Realmarkt-Paper-Fills:** Der Gateway bleibt für echte neue externe Token unter `BLOCKED_REAL_VALIDATOR_UNAVAILABLE`, bis unabhängige Contract-/LP-/Sellability-Adapter, zeitgültiges 5-Rollen-Quorum, signierter Publisher und nachprüfbare lokale Paper-Quotes tatsächlich funktionieren. Die neuen Module leiten weder BUY noch SELL in `runner/core.mjs` ein. Der bisherige signierte synthetische Testpfad bleibt erhalten.

Die vertiefte Long-Hold-/Exit-Forschung und eine statistisch belegte Selbstverbesserung sind weiter offene Entwicklungsstufen. Eine erste lokale Kohortenauswertung beginnt erst nach echten, 14 Tage vollständig beobachteten neuen Pools. Die alten historisch gewählten Erfolgsgeschichten erfüllen diese Voraussetzung nicht.

## Start und Abnahme

1. Bei laufendem Bot beide Prozesse über **Q** geordnet beenden; vor dem Update den **gesamten** Projektordner einschließlich `.local` und zusätzlich `%LOCALAPPDATA%\MemeSniperPaper` sichern.
2. ZIP dieses Arbeitsbranches laden und **Programmdateien in den vorhandenen Ordner** kopieren. Nicht den Datenordner löschen oder ein Synchronisierungswerkzeug zum Entfernen alter Nutzerdaten verwenden.
3. Weiterhin nur **`Sniperbot_Starten.bat`** doppelklicken. Im zentralen Fenster sollten lokale Pool-Followup-Zähler erscheinen, sobald Marktanbieter erreichbar sind.
4. Dashboard: `http://127.0.0.1:3030`; der Abschnitt **Forschungsnetzwerk** zeigt alle fünf Rollenberichte und darunter die Anzahl lokal nachbeobachteter Pools. Alternativ `GET http://127.0.0.1:3030/api/research/learning`.
5. `Windows_Tests.bat` ist nur für Offline-Tests, kein zweiter regulärer Starter. Die CI führt `node runner/test.mjs`, `node --test runner/*.test.mjs` und Windows-Smoke-Tests aus. Ein CI-Erfolg belegt **nicht**, dass die neue ZIP bereits auf dem privaten Laptop ausgeführt wurde.

**V0.5 ist ein überprüfbarer Forschungs-Ausbau, noch kein fertiger autonom profitabler Paper-Trader.** Keine Echtgeldfunktionen, keine Wallets, keine Änderungen an Hixton oder `main`.
