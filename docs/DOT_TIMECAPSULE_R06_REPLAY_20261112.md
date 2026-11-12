# Fünf-Dot-Forschungsreplay R06 – 61-Tage-Zeitkapsel

**12.11.2026 · Research only · Kein Trading, kein zeitversetztes Starten der Cloud-Dots.**

## Was implementiert wurde
- `runner/dot-historical-replay.mjs`: Chronologischer UTC-Tageslauf; nur Forschungsquellen mit ausdrücklich nachgewiesener historischer Capture-Metadatenlage können in den virtuellen Tagesstand eingehen. Fünf getrennte deterministische **Ersatzprüfungen** für News, Social, Onchain, Security und QA. Das sind **NICHT** die fünf historisch ausgeführten LLM-/Cloud-Dots.
- `runner/fixtures/timecapsule_R06_evidence.json`: datierte historische öffentlich zugängliche Seiten, jedoch ohne unabhängige verifizierte ursprüngliche Archive. Sie bleiben deshalb ausgeschlossen, statt dem Detektor nachträglich als früh verfügbare News untergeschoben zu werden.
- `runner/dot-historical-replay.test.mjs`: sechs lokale Regressionstests zur 61-Tage-Struktur, Einschleusung von Zukunftsdaten, fehlender Risk-/Sellability-Nachweis und zur Trennung der erst nach dem Replay verfügbaren Grundwahrheit.

## Testfenster und versiegeltes Ziel
R06 beginnt am **10.09.2024** und endet am **09.11.2024** einschließlich, also 61 Kalendertage. Der retrospektiv ausgewählte Fall ist **Goatseus Maximus (GOAT)**, Solana, Launch am 10.10.2024. Zielname, spätere Kurse und Gewinn-Label werden dem Replay **nicht** als Eingabeparameter übergeben. Für echte isolierte Cloud-Dot-Tests muss das geheime Ziel außerhalb des von den Dots einsehbaren Repositories bleiben.

Achtung: Die heutige öffentliche Ereignisauswahl ist trotzdem rückblickend stark auf GOAT fokussiert. Dieser erste Test ist daher **nur ein Time-Capsule-Prototyp**, noch kein fairer Blindtest gegen sämtliche vergleichbaren erfolgreichen und gescheiterten Launches. Ein echter Test muss einen vollständigen Startkohorten-Snapshot desselben Zeitfensters (inklusive negativer Beispiele) statt vorselektierter GOAT-Nachrichten enthalten.

## Veröffentlichte Hinweise: Quellen und Zeit-Lücken

| Datum | heute nachweisbare Beschreibung | as-of-Freigabe |
|---|---|---|
| 10.10.2024 | Truth Terminal erwähnt die Meme-Idee; Tokenstart ist rückblickend nachvollziehbar | **NEIN**, originale Tages-Capture-Bytes, exakter damaliger Pool und Trader-Quotes nicht verifiziert |
| 14.10.2024 | Cointelegraph berichtet bereits von rund **150 Mio. USD** Marktkapitalisierung | **NEIN**, Originalfassung am Veröffentlichungstag nicht unabhängig verifiziert und bereits nach starkem frühen Pump |
| 16.10.2024 | CoinDesk meldet etwa **+16.000 %** | **NEIN**, eine retrospektive Gewinnerquelle darf vor dem 16.10. nie erscheinen |
| 23.10.2024 | Know Your Meme archiviert einen Screenshot des 10.10.-Posts | **NEIN** für eine 10.10.-Zeitreise: spätere Bildveröffentlichung |
| 25.10.2024 | The Block berichtet über Rückgänge | **NEIN**, kein datiertes originales 2024-Archiv für eine sellbare Exit-Quote |

Öffentliche Quellen:
- https://knowyourmeme.com/photos/2931834-goatseus-maximus-goat
- https://pump.fun/CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump
- https://cointelegraph.com/news/ai-bot-didnt-launch-goat-memecoin-did-promote-it
- https://www.coindesk.com/news-analysis/2024/10/16/crypto-degens-baited-an-experimental-ai-bot-into-promoting-a-token-its-now-up-16000
- https://www.theblock.co/news/markets/2024-10-25-ai-memecoins-endorsed-by-the-truth-terminal-chatbot-see-double-digit-price-drop-322835

## Beobachtetes Resultat
- **61 Tagesdurchläufe**, **5** vorhandene historische Quellhinweise.
- **0** bislang unabhängig authentifizierte Capture-Originalfassungen aus dem damaligen jeweiligen Zeitfenster.
- **0** zulässige realhistorische Kandidaten im Zeitkapsel-Lauf.
- **0** nachgewiesene Ausführungssignale und **0** Paper-Trades.
- Befund: `UNTESTABLE_NO_VERIFIED_ASOF_SOURCES`.
- Keine historische Gewinn-/Trefferquote ableitbar. Das bedeutet **nicht**, dass GOAT damals unauffindbar gewesen wäre; es ist eine **Datenverfügbarkeitslücke**.

Die Software verlangt für mögliche Eingaben deklarierte Wayback-Captures mit Zeitstempel, Original-URL und Hashformat. Solche Metadaten müssen **zusätzlich extern an den echten Archivbytes unabhängig bestätigt werden**, bevor ein Kandidat als historisch bewiesen gilt. Die Software selbst verifiziert weder die Internet-Archive noch die historischen Trades.

## Tests
```bash
node --test runner/dot-historical-replay.test.mjs
```
Sechs analoge Tests der lokalen Entwicklungsversion wurden am 12.11.2026 ausgeführt und bestanden. GitHub CI für diesen konkreten Commit noch nicht nachgewiesen.

## Nächste Schritte ausschließlich für die Dots
1. Archivierte Original-Social-/News-Versionen, damalige Pool-/RPC-/Token-Identitäten und Handels-/Sell-Quotes sammeln und auditieren.
2. Reale negative Startkohorten desselben Zeitfensters einbeziehen.
3. Fünf Forschungsrollen **isoliert** anhand identischer zeitgesperrter Rohquellen nacheinander betreiben, ohne aktuelle Websuche, spätere Ergebnisdatei oder Gewinnerkennzeichnung.
4. Prognose-Erstzeitpunkt, 2x/5x/10x etc. über getrennte Testzeiträume und Fehlalarme messen; erst nach Holdout-Kalibration numerische Wahrscheinlichkeiten veröffentlichen.
5. Getrennte Research-Handoff-Daten an den Bot liefern. **Keine Änderung an Trading-Engine, Wallet, PayPal, Echtgeld oder bestehendem Papierkonto.**
