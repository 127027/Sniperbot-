# R29 – Tatsächlich gestarteter 24-Stunden-Scanner-Test vom 12.10.2026

**Ausführung:** [GitHub Actions #45128206759](https://github.com/127027/Sniperbot-/actions/runs/45128206759), erfolgreich auf Code `a102d1b991757dcc3a77078c31d8889ebb9a9433`, **737/737 Node-Tests, 0 Fehler**. Zusätzlich erster Run [#45127656595](https://github.com/127027/Sniperbot-/actions/runs/45127656595), erfolgreich mit 736/736 Tests. Beide lieferten **24/24** tatsächlich berechnete isolierte Modellentscheidungszeitpunkte.

**WICHTIG:** Es handelt sich um den vom Nutzer explizit freigegebenen, jedoch **unvollständigen Research-only-24h-Diagnoselauf**, nicht den vollzertifizierten QA-04-GPT-Dot-Client-Backtest. Die durch reale Originale gestützte **historische Handelsperformance ist weiterhin unbekannt**; die ebenfalls echte strenge QA-04-Release-Gate-Prüfung meldet `NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE` bei `13 PASS/46 PARTIAL/2 OPEN`.

## 1. Verbindlicher Scanablauf umgesetzt

- Vorlauf: **11.10.2026, 19:00 UTC**; Marktkenntnisse aus der gesamten tatsächlich früher verfügbaren Vergangenheit sind für Forschung zulässig. Kein beliebiger alter Preis wird als handelbarer aktueller Quote ausgegeben.
- 24 Entscheidungen exakt **12.10.2026 00:00 bis 23:00 UTC**, jede volle Stunde. Der ursprüngliche Code führte fälschlich nur Scan 1 um :00 und die folgenden um :35 aus. Korrigiert in `src/v19-backtest-window.mjs` und `src/point-in-time-strategy.mjs`.
- Scan 1 um **00:00 kann bereits BUY** ergeben: alter, tatsächlich früher liegender Vorlaufquote als Momentum-Basis und höchstens 90 Sekunden alter aktueller ausführbarer Dual-Quote-/Risikobeleg. Regressions-Test mit **synthetischen** Preisen BUY ab 00:00 bestanden – kein echter Oktober-Trade.
- Scan 2 um **01:00** prüft erneut neue Kandidaten und offene Positionen. Neue Kandidaten können aus tatsächlich vor 01:00 verfügbaren **zwei zwischen den Scans aufgezeichneten, gültigen Beobachtungen** modellhaft gekauft werden; bestehende Positionen können SELL erhalten. Dieselbe Position wird nicht nach SELL im selben Scan auf dem alten Preis sofort wieder gekauft. Das ist explizit durch synthetische Tests `test/v18-requested-backtest.test.mjs` abgedeckt.
- Nur der echte aus `src/v18-shared-evidence-gate.mjs` abgeleitete vollständige Source-/Preis-/Risikocheck darf als Momentum-Baseline für modellierte BUYs dienen. Der Codefehler einer formal älteren, aber **falschen Pool-URL** als BUY-Kursbaseline wurde mit den bestehenden Sicherheitstests gefunden und korrigiert.
- 24 vollständige **algorithmische** Rechercheentscheidungen sind **keine** 24 historisch unabhängigen GPT-Calls. Es wurden keine automatischen fünf historischen GPT-Dot-Instanzen gestartet, keine echten Client-Signale geschrieben.

## 2. Vorliegender Source-gap-Backtest und zweites Originalarchiv

Der aktuelle Cleanroom-Replay erhielt **0 hinreichend nachgewiesene Oktober-Originalkurspakete, 0 unabhängig authentifizierte Sellability-Belege**, also **0 Modell-BUY, 0 Modell-SELL, 0 überprüfbare Live-/historische GPT-Reviews und 0 Windows-Paper-Fills**. Das bedeutet **NICHT**, dass keine Coins existierten oder der Bot absichtlich gute Trades verweigert hat.

**Zusätzliche echte, nachträgliche Recherche (erst nach den Entscheidungen!):** Im separaten älteren kanonischen Quellprojekt liegt ein gespeichertes *neutrales Solana-Pump.fun-Archiv* [GitHub Run #44048309420](https://github.com/127027/Sniperbot-/actions/runs/44048309420), Artefakt `14312891173`, mit den Tages-JSONs `2026-10-11.json` und `2026-10-12.json`. ZIP-SHA256 `71665923352ed392e6314cad9afcf9219354cc46390b050019f6426c026b96b1`. Dieses Archiv wurde erst am **17.11.2026** erzeugt. Historische Eventzeiten sind **keine** unabhängigen Belege für damalige Providerbereitstellung oder ausführbare Preise.

Die nachträgliche Quelle enthält für die **24 disjunkten 5-Minuten-Stundenfenster** in Summe **2.598 Mint-Nennungen** (nicht zwangsläufig einmalige Coins), **11.226 Minutenmerkmal-Zeilen** und eine neutrale Auswahl von **192 unterschiedlichen Solana-Mint-Adressen** (acht je Scan). Diese 192 sind **NICHT** allesamt über-100%-Gewinner und **NICHT** beweisbar gehandelte Positionen. Die Quelle deckt nur eine Solana-Quelle, nicht sämtliche sechs Chains oder 24 volle Stunden jeweils lückenlos ab.

## 3. Liste der 24 echten Scannerentscheidungen mit nachträglich bekanntem neutralem Kandidatenaufkommen

Alle UTC-Stunden. **BUY/SELL „—“ = kein durch diesen evidenzlosen Offline-Replay modellierter Trade, NICHT: kein echter möglicher Coin.** Die beiden mittleren Spalten wurden erst nach der Modellentscheidung aus einem separat archivierten Solana-Forschungsdatensatz ermittelt und NICHT als damalige Dot-Inputs verwendet.

| Scan | UTC | Rückblickende frische Mint-Nennungen (5m) | Rückblickende Merkmalszeilen (5m) | Neutrale Mints als Stichprobe | Modell-BUY | Modell-SELL | Beleglage |
|---:|:---:|---:|---:|---:|---:|---:|---|
| 1 | 00:00 | 99 | 402 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 2 | 01:00 | 84 | 288 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 3 | 02:00 | 95 | 381 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 4 | 03:00 | 67 | 447 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 5 | 04:00 | 79 | 351 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 6 | 05:00 | 82 | 406 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 7 | 06:00 | 62 | 304 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 8 | 07:00 | 65 | 332 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 9 | 08:00 | 70 | 347 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 10 | 09:00 | 122 | 417 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 11 | 10:00 | 58 | 362 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 12 | 11:00 | 97 | 448 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 13 | 12:00 | 91 | 389 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 14 | 13:00 | 123 | 498 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 15 | 14:00 | 113 | 582 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 16 | 15:00 | 159 | 556 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 17 | 16:00 | 195 | 641 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 18 | 17:00 | 178 | 699 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 19 | 18:00 | 118 | 541 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 20 | 19:00 | 139 | 629 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 21 | 20:00 | 157 | 727 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 22 | 21:00 | 121 | 522 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 23 | 22:00 | 120 | 616 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |
| 24 | 23:00 | 104 | 341 | 8 | — | — | Keine zeitgerecht unabhängig belegten BUY-/SELL-Quotes |

Die **192 vollständig ausgeschriebenen Solana-Mint-Adressen mit UTC-Ereigniszeitstempeln** und den methodischen Quellenwarnungen liegen im zusätzlich angefertigten herunterladbaren Diagnosedokument der Unterhaltung sowie im ursprünglichen GitHub-Actions-Quellartefakt. Die 24 Stunden werden aus dem letzten Frame des 11.10. (00:00) und den ersten 23 Stundenframes des 12.10. (01:00–23:00) gebildet.

## 4. Gewinnervergleich erst NACH Abschluss – 65 sind kein Markt-Nenner

Das nachträgliche Originalregister `research/evaluation/2026-10-12/v19-winner-reference-identity-status.json` enthält **65 rückblickende Coin-/Pool-Meldungen**, davon nur **8 mit Pool-Links**, 57 **ohne** vollständige Poolzuordnung und **alle 65 ohne unabhängigen historischen Entry-/Sellability-Beweis**. Die rückblickenden Prozentgewinne sind keine exekutierbare 24h-Bot-Netto-Gewinnquote. Es sind **mehr als 65 mögliche berichtete Marktstarts**, aber die Anzahl **aller über 100 % steigenden Tokens am 12.10.** ist **unbekannt**; eine vollständige Gewinnergrundgesamtheit wurde nie nachgewiesen.

Resultat: **0 tatsächlich nachgewiesene BUY/SELL und keine messbare echte Gewinner-Recallquote**. Nicht gekaufte Gewinner werden hier **UNKNOWN_NOT_PROVEN_MISSED_OPPORTUNITY**, nicht als 65 nachgewiesene verpasste Gewinntrades oder als Strategiefehler gezählt.

## 5. Fehlerursache, die unmittelbar als Nächstes bearbeitet werden muss

**P0 – Originales neutrales Oktober-Marktuniversum an die fünf Rollen übertragen, mit vollständiger Source-/Availability-/Zeitprovenienz.** Der Test wird sonst stets `DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE` liefern, egal wie gut die Strategie ist. Ältere neutrale Recherchearchive können **als RESEARCH_ONLY** importiert werden, aber ihre später gespeicherten Daten dürfen nicht rückwirkend zu Oktober-Original-API-Captures umdeklariert werden.

**P0 – unabhängige USDC/SOL-Angebots-/Abnahmequoten, D3-04 Issuer-, D3-05 Chain-/Pool-/Tax-/Blacklist-/Exit-Proofs** vor positiven Paper-BUYs. Selbst 2.598 neue Mint-Nennungen werden ohne diese Belege nicht zu nachgewiesenen kaufbaren Memecoins.

**P1 – vollständige Rollentätigkeiten und Wiederholung auf externen unbekannten Holdout-Daten**, danach neue Gegenüberstellung von echten BUY/HOLD/SELL und neutralen Gewinner-/Nichtgewinner-Pools. Zeit- und Markt-Source-Recovery müssen offen als Datenbeschaffung, nicht als „alle Coins wurden sicher erkannt“, geführt werden.

**Unverändert:** Modellbudget 5.000 TEST-USDC, 50 TEST-USDC pro Coin; LIVE-/Echtgeld AUS, bestehendes Windows-Paper-Konto nicht durch GitHub geprüft oder verändert, Main nicht geändert, QA-04 nicht abgenommen.
