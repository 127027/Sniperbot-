# Sniperbot R29 – 120 Tage mit tatsächlich abgerufenen historischen Daten

**Echtmarkt-Quellenerhebung am 16.11.2026**, UTC-Cutoff `2026-11-16T09:12:00Z`.  
**Repo:** `127027/Sniperbot-`, Branch `codex/r29-chatgpt-github-paper-cycle-20261115`.  
**Status:** Historischer Kursdaten-Replay **durchgeführt**; vollständiger historischer GPT-Memecoin-DEX-Blindtest **NICHT abgeschlossen und NICHT bewiesen**.

## 1. Historische Fakten statt erfundener Kurse

Die Cloud-CI hat am 16.11.2026 tatsächlich Online-Quellen abgefragt, Antwortdaten auf Gültigkeit und UTC-Reihenfolge geprüft und die Rohantworten/normalisierten Zeitreihen mit SHA-256-Quellbelegen in ein isoliertes Artefakt gespeichert.

| Datensatz | Tatsächliches Ergebnis |
|---|---:|
| Öffentliche Binance Spot 1h-Kurshistorien vollständig | **12 von 13** rückblickend ausgewählten Memecoin-Paaren |
| Echte stündliche CEX-Kerzen einschließlich 48h Warmup | **34.956** |
| Pump.fun-Retrospektivstatistik | **138 Tageszeilen**, Juli bis 15.11.2026 |
| Historische PEPE-Ethereum-DEX-Tageskerzen | **119** |
| Historische Solana-Tokenstarts aus unabhängiger HF-Datenquelle | **200 eingelesene Einträge**, nur as-of-Merkmale übernommen |
| Fehlender Binance-Vollabruf | **MOODENGUSDT** |

**Wichtige Einschränkungen:**
- Die zwölf Binance-Paare stammen aus dem bisherigen R30-Katalog und wurden rückblickend benannt. Sie sind **keine** vollständige, neutrale historische Entdeckung aller neuen Memecoins. Insbesondere sind Binance-Spot-Kurse keine Pool-Liquiditäts- oder historische DEX-Exit-Simulation.
- Die Pump.fun-Statistiken wurden nachträglich berechnet; selbst wenn frühere Onchain-Ereignisse darin stehen, ist die damalige Verfügbarkeit der heutigen Aggregatwerte **nicht unabhängig archiviert nachgewiesen**. Sie erscheinen in der Tagesdokumentation, aber wurden **nicht als binnen desselben Tages verfügbare Entscheidungssignale benutzt**. Am noch unvollständigen 16.11. fehlt die Tagesaggregatstatistik.
- Die 200 Solana-Launch-Samples wurden aus einer größeren Datenbank mit potenziell **nachträglich bekannten** Rug-/Graduation- und Hochpreisetiketten übernommen. Diese Zukunftsfelder wurden im Reader ausdrücklich ausgeschlossen. Der Auszug ist weder ein vollständiges historisches Universum noch ein Blockchain-RPC-Audit.
- Von GeckoTerminal liegt eine echte historische Preisreihe eines älteren PEPE-Pools vor, **kein** as-of-Sicherheitsnachweis und kein vollständiges Launch-Universum über vier Chains.
- Umfangreiche historisch beweisbare Social-Media-, Contract-/Mint-/Freeze-, LP- und Sellability-Belege für *jeden* handelbaren Kandidaten fehlen.

**Quellen:** 
- Binance Spot Historical Data: https://github.com/binance/binance-public-data
- Öffentliche historische Binance-Klines: https://data-api.binance.vision/api/v3/klines
- Pump.fun-Tagesstatistiken: https://pumpdata.fun/stats/2026-07 ; https://pumpdata.fun/stats/2026-08 ; https://pumpdata.fun/stats/2026-09 ; https://pumpdata.fun/stats/2026-10 ; https://pumpdata.fun/stats/2026-11
- GeckoTerminal API-Dokumentation: https://api.geckoterminal.com/docs/index.html
- 2026-Launch-Stichprobe: https://huggingface.co/datasets/loopholetape/pumpfun-launches

## 2. Chronologischer tatsächlicher Daten-Replay

### Trainingsperiode: 20.07.2026–17.09.2026 (60 Tage)

Für jedes Datum wurden ausschließlich zu dessen Scanzeitpunkt bereits **abgeschlossene** CEX-Stundenkerzen analysiert. Die Trainingsphase enthält **680 reproduzierte Kurs-Scans**, keine 680 Aufrufe eines tatsächlichen GPT-Modells.

Die Kriterien für die spätere Phase B wurden zum **18.09.2026, 00:00 UTC** fixiert. Die aus den damaligen Trainingskerzen ermittelten Schwellen und der Hash wurden im Ergebnis-JSON gespeichert: `4a764b28f9d9cf0f311e9e3ec0d62c22c014166b6e37b35f3ebccd25774939c1`. Das feste Momentumminimum liegt bei **1,6561 % über sechs Stunden** plus positivem 24h-Return und mindestens 1,05-mal so viel vergangenem Sechsstundenvolumen wie im vorangegangenen Sechsstundenfenster.

### Testperiode: 18.09.2026–16.11.2026 (60 Kalendertage)

**800 reale historische Preis-Scanzeitpunkte**, ohne nach dem 18.09. die Grenzwerte anhand späterer Preise zu optimieren.

| Tagesfrequenz | Anzahl der Testtage |
|---|---:|
| 1 Scan | 10 |
| 4 Scans | 9 |
| 12 Scans | 18 |
| 24 Scans | 22 |
| Letzter Tag, nur bis 09:12 UTC | 10 tatsächliche Scanzeitpunkte |

Diese Scans sind **algorithmische, retrospektive Analysen echter Kurse**. Sie sind ausdrücklich **keine** 800 tatsächlich durchgeführten GPT-Modellaufrufe und kein Nachweis eines vollständigen Meme-Scout-Systems. Ohne vollständigen damaligen Sicherheits-/DEX-Kontext wären echte GPT-BUY-Entscheidungen wissenschaftlich nicht belegbar.

## 3. Gegenprobe: Zwei Preis-Only-Strategien mit echten Kursen, modellierten Orders

Um trotzdem eine reale Kurshistorie an einem nachvollziehbaren, vor Phase B eingefrorenen Handelsschema zu prüfen, wurden beide auf **exakt denselben echten Binance-Historien** ausgeführt.

- Beide Varianten starten mit **5.000 separaten virtuellen USDC**. Trades sind niemals tatsächlich gesendet worden.
- **A (konservativ):** Maximal 50 USDC je Position und drei parallele Positionen.
- **B (aggressiv):** Je nach Signalstärke 35, 75 oder bis zu 100 % des verfügbaren Kapitals, maximal 5 Positionen.
- Signalentscheidung nur anhand abgeschlossener Stundenkerzen; Ausführung zur **nächsten Stundenöffnung** als Preisproxy, 1 % modellierte Ein- und 1 % Ausstiegskosten.
- BUY-/SELL-/HOLD-Heuristiken stammen aus einem **deterministischen Kursmodell, nicht aus ChatGPT**, und nicht aus historischen Sicherheitsbelegen. Auch der Schatten-Stop ist kein wirklich ausgeführter DEX-Stop.

| Ergebnis der 60 Testtage | Variante A | Variante B |
|---|---:|---:|
| Modellierte BUYs | **36** | **30** |
| Geschlossene Modellpositionen / SELLs | **33** | **26** |
| Gewinnende Abschlüsse | **3** | **4** |
| Verlustabschlüsse | **30** | **22** |
| Noch offene Preis-Modellpositionen | **3** | **4** |
| Realisierte modellierte P&L | **−100,30** | **−2.442,14** TEST-USDC |
| Indikativer Gesamtwert inkl. offener Positionen | **4.895,38** | **2.497,62** TEST-USDC |
| Indikative Veränderung zum 5.000er-Start | **−2,09 %** | **−50,05 %** |

**Achtung:** Die P&L ist die mathematische Folge **echter historischer Kursdaten und angenommener Ausführungen/Kosten**, kein real ausgezahlter Gewinn/Verlust. Kein Binance-Handel und kein DEX-Swap wurden ausgeführt oder nachweislich zum Modellpreis füllbar gewesen.

### Beispielhafte belegte Preis-Only-Trades

- **PEPEUSDT (A):** Modell-Einstieg `2026-10-15T17:00Z`, Verkauf `2026-10-23T13:00Z`, 188 Stunden Haltedauer, modellierter Gewinn **+9,6070 TEST-USDC** nach Kosten (20%-Kursziel als Modelltrigger).
- **PEPEUSDT (A):** Modell-Einstieg `2026-10-29T17:00Z`, Ausstieg `2026-10-29T23:00Z`, 6 Stunden Haltedauer, modellierter Verlust **−9,3440 TEST-USDC** (10%-Preisstop).
- **PNUTUSDT (B):** Modell-Einstieg `2026-09-18T03:00Z`, Verkauf `2026-09-22T09:00Z`, 102 Stunden, modellierter Gewinn **+838,25 TEST-USDC**.
- **BOMEUSDT (B):** Modell-Einstieg `2026-09-24T07:00Z`, Verkauf `2026-09-24T11:00Z`, 4 Stunden, modellierter Verlust **−701,8230 TEST-USDC**.

**Vollständige Trade-Liste:** `results/cex-shadow-complete-trade-ledger.csv` – **66** tatsächlich anhand realer Historien modellierte Einstiege mit Chain-Markt-Symbol, Zeitpunkt, Betrag, Einstieg, Verkauf beziehungsweise Offenstatus, Haltedauer, Begründung und P&L. Bitte die eindeutige Spalte `source_class=...NOT_GPT_NOT_DEX` beachten.

**Alle 60 Handelstage:** `results/holdout60-real-price-daily.csv` – Date, Scans, getrennte Modell-BUY/-SELL-Zahlen, rückblickend berichtete Pump.fun-Launchmengen und explizit fehlender GPT-DEX-Nachweis.

## 4. Was der Test wirklich über den GPT-Sniperbot sagt

### Nachgewiesen

- Die Vergangenheit wurde über Online-Schnittstellen **tatsächlich abgefragt**, nicht frei erfunden.
- 60 Tage Training sind vor 60 Tagen Test getrennt.
- Der Preis-Reader sperrt unvollständige und zeitlich spätere Stundenkerzen.
- Aus den Trainingstagen wurden feste Schwellen für ein nachvollziehbares 1/4/12/24-Scanexperiment abgeleitet.
- Der öffentliche Kursalgorithmus erzeugt anhand echter vergangener Preise eine vollständige Liste mit Kauf-/Halte-/Verkaufssignalen und modellierten Beträgen.
- 30 bis 36 simulierte Einstiege und ihre tatsächlichen Kursfolgen sind nachrechenbar; die aggressive Variante schneidet in diesem Test ausgesprochen schlecht ab.
- Das private Laptop-Paper-Konto, der produktive GitHub-Handelskanal und eine Wallet wurden **nicht** verändert.

### Nicht nachgewiesen

- Dass GPT diese Coins damals unabhängig von der heutigen rückblickenden Liste entdeckt hätte.
- Dass GPT seine Handelsentscheidung selbst bei jedem historischen Scan getroffen hat. **In dieser 120-Tage-Analyse wurden 0 vollständige historische GPT-Modellaufrufe durchgeführt.**
- Dass das damalige Solana-/EVM-/LP-/Mint-/Sellability-Gate konkrete BUYs bestanden hätte.
- Dass die betreffenden DEX-Pools damals bei den modellierten Beträgen tatsächlich kauf- und verkaufbar waren.
- Dass externe Nachrichten-/Social-Media-Quellen für sämtliche Tage point-in-time authentisch vorlagen.
- Dass die Strategie bei Live-Einsatz die historische Modellergebnisse erreichen würde.

**Daraus folgt nicht, dass GPT 0 Trades gemacht hätte. Die Anzahl echter historischer GPT-Trades bleibt unbekannt.** Null nachweisbare GPT-Fills und null damalige Modellaufrufe sind **kein Beweis**, dass GPT bei vollständiger Datenlage alles abgelehnt hätte.

## 5. Konsequenz für mögliche Live-Freigabe

**Keine Freigabe des Echtgeldhandels auf Basis dieses Versuchs.** Das reale 60-Tage-Kurs-Szenario ist deutlich negativer als ein reiner technischer Fixture-Test. Die testweise 100%-Kapitalvariante verlor indikativ etwa die Hälfte des virtuellen Kapitals.

Für die Prüfung vor echten Käufen fehlen ein neutrales vollständiges historisches DEX-Launchuniversum, unabhängig prüfbare as-of-Vertrags-/Pool-/Exit-Daten, eine echte historische GPT-Entscheidungsserie und genügend unverfälschte Forward-Paper-Fills. Die aktuelle GPT-Paper-Automation kann weiter **ausschließlich mit Spielgeld** lernen. Ein einzelner Backtest, selbst mit echten Kursdaten, würde außerdem nicht das Risiko extremer Memecoin-Verluste eliminieren.

## 6. Dateien und reproducible Tests

- `source-collector.mjs`: Abruf aktueller historischer Online-Quellen, Rohantwort-SHA und Datenvalidierung.
- `real-replay.mjs`: Zeitsperre, Trainings-Freeze, echte vergangene Kursfeatures und **nur gekennzeichnete Preis-Only-Modellorders**.
- `real-replay.test.mjs`: Schutz gegen Zukunftskerzen, 60/60-Verwechslung und fehlerhafte Zeitstempel.
- `results/holdout60-real-price-daily.csv`: alle 60 Testtage.
- `results/cex-shadow-complete-trade-ledger.csv`: vollständiges rückblickendes CEX-Preis-Modell.
- `results/summary.json`: Ergebnis, Quellengrenzen, alle Warnungen.
- **GitHub-Actions-Lauf:** https://github.com/127027/Sniperbot-/actions/runs/43842315653
- **Alle tatsächlichen Online-Rohdaten, SHA-Provenienz, 120 Tage einschließlich Training, minutengenaue Scan-Uhrzeiten und einzelne Modellorders als JSON-Artefakt:** https://github.com/127027/Sniperbot-/actions/runs/43842315653/artifacts/14213063574

**Endstatus:** `REAL_HISTORICAL_PRICE_REPLAY_DONE`; `FULL_GPT_MEMECOIN_DEX_BACKTEST_NOT_YET_PROVEN`; `REAL_TRADING_FORBIDDEN`.
