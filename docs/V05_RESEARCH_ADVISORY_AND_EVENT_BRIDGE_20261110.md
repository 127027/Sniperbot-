> **Archiv V0.5:** Seit V0.6 ist die ursprüngliche pro-Trade Min/Max-Semantik überholt. Gültig sind ein bevorzugter Einsatz und ein **hartes Gesamt-Exposure-Budget**; neue lokal beobachtete Profil-/Takeover-/Boost-Hinweise sind zusätzlich verfügbar. Siehe [V0.6](V06_TOTAL_BUDGET_AND_MULTI_SOURCE_DISCOVERY_20261110.md).

# Sniperbot V0.5 – neue Memecoin-Hypes → fünf Dots → lokale Prüfwarteschlange

**Stand:** 10.11.2026. **Nur Paper, keine Wallets, keine echten Orders, kein main-Merge.**

## Was im Code tatsächlich neu funktioniert

1. **Marktbeschleunigungs-Erkennung**: `runner/research-hype-triggers.mjs` vergleicht zeitnahe (1–30 Minuten auseinanderliegende) öffentliche Messungen **desselben exakt identifizierten Pools** auf Solana, Base, BNB Chain oder Ethereum. Recherchehinweis nur bei starker Zunahme des 5-Minuten-Volumens, erheblichen Kauftransaktionen, genügend Pool-Liquidität und zusätzlicher Preis-/Liquiditätsentwicklung. Ein solches Aggregator-Muster kann auf Wash-Trading oder Bots beruhen: **kein Social-Hype-Beweis, keine Kursprognose, keine Kaufempfehlung**.
2. **Lokale und gemeinsame Forschungs-Weitergabe**: Der Windows-Collector archiviert Research-Alerts dedupliziert unter `.local/research-learning/market-alerts.json` (maximal 1000 Einträge, 45 Tage, 4-MiB-Leselimit). Die letzten 60 Minuten, maximal 24 Ereignisse, können beim nächsten 15-Minuten-GitHub-Publish in `research/market/latest.json` als `research_alerts[]` stehen, `paper_only:true`, `actionable:false`. Das vermeidet, dass die stündlichen Dots einen nur zwei Minuten sichtbaren Auslöser sofort verpassen. **Nicht garantiert**: Bei ausgeschaltetem Laptop, ausgefallener GitHub-Veröffentlichung oder stündlichem Recherchelauf nach 60 Minuten ist keine rechtzeitige Zustellung garantiert.
3. **Fünf Cloud-Forschungsrollen**: Die fünf vorhandenen ChatGPT-Forschungsautomationen wurden ohne neuen Zeitplan und ohne neue Aufgaben um die optionale Liste `research_alerts[]` ergänzt. Sie sollen bei einem Hinweis die konkrete Chain/Token/Pool-Identität in ihrem Fachgebiet untersuchen, unabhängig neue Quellen suchen und Gegenbeweise offenlegen. Die Rollenberichte bleiben allein `research/roles/<rolle>/latest.json` und bei Scout seine bereits autorisierten Watchlist/Notice-Pfade.
4. **Gemeinsame lokale Prüfwarteschlange**: `runner/research-advisories.mjs` kombiniert Watchlist mit den fünf tatsächlich vorhandenen Rollenberichten. Die Anzeige umfasst eindeutige Pool-ID, Watchlist-Priorität, beteiligte Rollen, Quellprovider-Korrelation, offene Contract/LP/Sellability/Sozial-Nachweise und einen **rein illustrativen** Rahmen aus den lokal gespeicherten `minTrade`/`maxTrade`/freien Test-USDC. Drei Erwähnungen sind **kein** dreifaches unabhängiges YES. Es wird **keine** automatisierte Paper-BUY-Freigabe erzeugt.
5. **Dashboard und lokale API**: `http://127.0.0.1:3030/api/research/advisories` liefert die nicht handelbaren Kandidaten, ebenso der Abschnitt `Forschungsnetzwerk` im Dashboard. `/api/research/learning` zeigt den letzten lokalen Nachbeobachtungs-/Market-Alert-Status. Das Dashboard kontrolliert keine fremden Guthaben und öffnet keinen öffentlichen Web-Port.
6. **GitHub-Datenbrücke repariert**: Der Collector kann bis zu 96 deduplizierte Poolidentitäten liefern; `runner/research-market-publisher.mjs` erlaubt nun ebenfalls maximal 96 statt der alten Grenze 48. Das Publisher-Gate verwirft zusätzliche unerlaubte Marktfelder, private Handelskommandos und angebliche kalibrierte Wahrscheinlichkeiten in Research-Alerts.

## Historische Datenbank des Nutzers (lokale Datei)

Die bereitgestellte Arbeitsmappe `meme_coins_2013_2026_historische_datenbank.xlsx` enthält die Register `Überblick`, `Chronologie`, `ATH-Kurse`, `Hype-Ereignisse`, `Index-Snapshot` und `Methodik`. Im Überblick werden **89 chronologische Einträge**, **281 CoinGecko-Kategorie-Snapshot-Namen**, **23 Kursdatensätze** und **14 Hype-Ereignisse** ausgewiesen. Die Einträge enthalten u. a. historische ATHs, einzelne datierte Ereignisse, Fallbeispiele und Quellenlinks. Die Exceldatei wurde **nicht** in das öffentliche Repository, in GitHub-Research-Dateien oder in Windows-ZIP-Quelltexte hochgeladen.

**Fachliche Grenze**: ATL und ATH sind oft zeitlich nicht in der korrekten Reihenfolge; aus ATL/ATH-Verhältnis darf keine realistisch rückwirkend erzielbare Rendite gefolgert werden. Ein historischer Virus-/Politikpost kann zum Kursgeschehen zeitlich korrelieren, beweist aber nicht im Voraus eine echte 95-%-Chance. Für probabilistische Prognosen müssen auch alle nicht erfolgreichen Starts und valide zeitgenössische Entry-/Exit-Quotes mit erfasst werden.

## Autonome Paper-Kauf-/Exit-Kette: Stand und Blocker

```text
Lokaler Collector / stündliche fünf Dots
   → nicht handelbare Discovery-/Hype-Research-Events  [IMPLEMENTIERT, TESTS]
   → gemeinsame GitHub-Rollenberichte & lokale Watchlist [IMPLEMENTIERT, TESTS]
   → zentrale Kandidatenprüfung im Dashboard           [IMPLEMENTIERT, TESTS]
   → unabhängige echte Contract-/LP-/Holder-Prüfung     [FEHLT]
   → unabhängiger Pool-/Sell-Route-Quote je Betrag      [FEHLT]
   → echtes authentifiziertes 5/5-YES mit VETO          [FEHLT]
   → signierter Publisher mit Ablaufzeit/Replay-Schutz [NUR SYNTHETISCHES LABOR]
   → automatisch eröffneter Paper-Kauf echter Tokens   [BLOCKIERT]
   → autonome echte DEX-Paper-Exits mit Slippage        [BLOCKIERT]
   → 14-Tage-OOS-Kalibrierung/Lernverbesserung          [FORSCHUNGSBASIS, NICHT BELEGT]
```

Der lokale Gateway zeigt daher bewusst `BLOCKED_REAL_VALIDATOR_UNAVAILABLE`. Aus GitHub-Rollenreports `actionable:false` werden niemals direkt `PAPER_BUY`-/`PAPER_SELL`-Kommandos erzeugt.

**Synthetischer Exit-Abnahmetest:** Das bereits vorhandene `TRAILING`-Demo-Verhalten ist zusätzlich als automatischer End-to-End-Test nachgewiesen: ein durch synthetische Schlüssel und Risiko-Freigaben erlaubter Demo-Kauf übersteht den dreifachen Kursanstieg und löst erst nach ausreichend starkem Rückgang vom Hoch den simulierten Verkauf aus, auch bei ausgeschalteten Neueinstiegen. Der Test beweist weder reale Liquidität noch die Profitabilität echter Meme-Token.

## Installation und Tests

Vor dem Aktualisieren am Windows-Laptop **mit Taste Q sauber stoppen**. Den vorhandenen Projektordner `Sniperbot0.1` einschließlich `.local` und `%LOCALAPPDATA%\MemeSniperPaper` separat sichern. Die neue ZIP entpacken und **nur Programmdateien** in das bisherige Verzeichnis kopieren; nicht die privaten Forschungs- und Paper-Laufzeitdaten entfernen.

Einziger regulärer Starter bleibt **`Sniperbot_Starten.bat`**. Die fünf ChatGPT-Dots arbeiten stündlich unabhängig vom Laptop; sie können den PC nicht direkt bedienen. Windows darf für lokale 120-Sekunden-Marktbeobachtung nicht in den Schlafmodus wechseln. Bei einem fehlenden GitHub-Forschungs-PAT oder API-Limit können externe Daten und Weitergabe ausfallen; keine automatische Handelsfreigabe wird dann angenommen.

Tests: `node runner/test.mjs`, `node --test runner/*.test.mjs`, Windows-Smoke mit DPAPI/JobObject und den erweiterten Research-Tests. Erfolgreiche GitHub-CI-Tests sind kein Nachweis, dass diese Version bereits auf dem privaten Laptop gestartet wurde.

## Nächste sichere technische Stufe

Ein unabhängiger, read-only Onchain/Contract/LP/Holder-Prüfadapter und nicht-ausführende **betragsspezifische** BUY-/SELL-Routenbewertungen für Solana und die EVM-Chains, jeweils mit Datenalter, Quellenidentität, Negativtests und klaren `UNKNOWN`-/`BLOCK`-Ergebnissen. Erst danach darf ein separater signierter, fünfmal bestätigter Research-Advisory-Transport auf **lokale** Paper-Ausführung getestet werden. Niemals aus einem viralen Tweet oder drei Rollen-Erwähnungen allein kaufen.
