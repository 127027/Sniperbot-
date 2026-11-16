# Sniperbot R29 – 60 echte historische Tage: Kursbasierter Handelstest mit Einsätzen 50/100/250 TEST-USDC

**Ausgeführt und geprüft:** 16.11.2026 · **Quelle:** unveränderte öffentliche Binance-Spot-Stundenkurse in `research/replay-120d-real/results/`, aus dem bereits früher eingefrorenen historischen CEX-Schattenmodell mit 12 rückblickend bekannten Memecoin-Paaren. **Nur Forschung: keine historischen GPT-Trades, keine echten DEX- oder lokalen Paper-Fills, kein Echtgeld.**

## 1. Es gibt jetzt zwei vollständig gespeicherte Tagestabellen über die 60 Handelstage

1. **Tagesgenaue drei Risikomodelle A und B:** `results/60_TAGE_HANDELSTABELLE_ECHTE_CEX_PREISE_MODELLIERTE_TRADES.csv` – 60 Tage mit Scans, täglich gekauften/verkauften Coins, Einsatz und realisiertem Modell-PnL, Cash und offenen Coins für A und B.
2. **Einsatzmodell C (50/100/250 USDC):** `results/60_TAGE_STAFFELEINSATZ_50_100_250_CEX_KURSMODELL.csv` – jeder der 60 Kalendertage, nur echte frühere Binance-Preis-Candles; Positionssignale stammen **unverändert** von A, und nur die Einsatzhöhe wurde bei Entscheidung nach den damals bereits offenen Modellpositionen neu gestaffelt. Jeweils die erste Position **250**, die zweite **100**, die dritte **50 TEST-USDC**. Nicht nach späteren Gewinnern umsortiert. Ein Testkapital von **5.000 TEST-USDC**.
3. **Vollständiger C-Tradeverlauf:** `results/60_TAGE_STAFFELEINSATZ_CEX_69_TRANSAKTIONSEREIGNISSE.json` – 36 modellierte BUYs und 33 modellierte SELLs mit jeweiligen historischen Einstieg-/Ausstiegszeiten, bekannten Binance-Kursen, Kosten und Ergebnis, keine echte Börsenausführung.
4. **Maschinenlesbare C-Auswertung:** `results/60_TAGE_STAFFELEINSATZ_CEX_ZUSAMMENFASSUNG.json`, mit vollständiger SHA-256-Quellkette und Verweis auf die erfolgreiche GitHub-Ausführung.
5. **Echte Solana-Signalabdeckung pro Tag, separat:** `results/REAL_60_DAY_EVIDENCE_MATRIX_2026-11-16.csv`. Historische Solana-Launchs und Wallet-Minutenmerkmale sind **nicht** mit den vorselektierten Binance-Paaren gleichzusetzen.

## 2. C-Ergebnis – beide positive und negative abgeschlossene Modell-Trades

| Messwert | Ergebnis |
|---|---:|
| Simuliertes Startkapital | **5.000 TEST-USDC** |
| Handelstage (UTC) | **18.09.–16.11.2026** (60 Tage; letzter Tag nur bis zum damaligen Cutoff) |
| Preisbasierte, chronologische Berechnungs-Scans | **800** (über die 60 Tage, **keine** tatsächlichen GPT-Aufrufe) |
| Tage mit 1 / 4 / 12 / 24 geplanten historischen Preis-Scans | **10 / 9 / 18 / 22** |
| Letzter nur teilweise gelaufener Tag | **10** Preis-Scans |
| Modellierte BUYs / SELLs | **36 / 33** |
| Geschlossene Gewinne / Verluste | **3 / 30** |
| Positive / negative Tage nach realisiertem Handels-PnL | **3 / 19** (andere Tage ohne realisierten Schlussgewinn/-verlust) |
| Realisierter Kursmodell-PnL bis Cutoff | **−186,93 TEST-USDC** |
| Offene Positionen | **3**: TURBO (250), NEIRO (100), DOGE (50) |
| Modell-Kontoguthaben als Cash | **4.413,07 TEST-USDC** |
| Indikativer Wert der offenen Positionen | **388,71 TEST-USDC** |
| Indikative Gesamt-Equity inkl. modellierter Ausstiegskosten | **4.801,78 TEST-USDC** |
| Gesamtveränderung inkl. offenen Markierungen | **−198,22 TEST-USDC (−3,96 %)** |
| Tatsächliche vollständige historische GPT-DEX-Orders / nachgewiesene DEX-Fills | **0 / 0** |
| Nachgewiesener GPT-Gewinn über die 60 Tage | **UNBEKANNT**, kein belegter PnL |

**Beispiel einzelner tatsächlich verwendeter Börsenkurse:** Im Modell stieg PNUT von 0,0486 USD (Einstieg 18.09. 03:00 UTC) auf 0,0579 USD (Ausstieg 22.09. 09:00 UTC). Nach modelliert je 1 % Kauf- und Verkaufskosten entstand bei **250 TEST-USDC** ein rechnerischer Gewinn von **41,91 TEST-USDC**. Auf der Verlustseite wurde BOME beispielsweise am 24.09. mit einem modellierten Einsatz von 250 TEST-USDC geschlossen, **−35,09 TEST-USDC**. Das sind **historisch belegte CEX-Kurswerte** mit **modellierter** Ausführung, keine belegten Bot-Orders.

## 3. Vergleich aller drei Varianten

| Shadow-Risiko | Einsätze | Modellierte abgeschlossene Gewinner / Verlierer | End-Equity | Veränderung |
|---|---|---:|---:|---:|
| A – sehr klein | feste 50 | 3 / 30 | 4.895,38 | −104,62 |
| B – sehr aggressiv | dynamisch 50 bis 5.000 | 4 / 22 | 2.497,62 | −2.502,38 |
| C – gestaffelt | 250 / 100 / 50, offene Slots bestimmen Einsatz | 3 / 30 | 4.801,78 | −198,22 |

B ist eine **andere Positionsauswahl** mit bis zu fünf Slots; A und C haben dieselben tatsächlichen CEX-Signale und Ausstiege, aber unterschiedliche Risikoeinsätze. Die B-Ergebnisse dürfen daher nicht als isolierter Kapitalgrößentest für A interpretiert werden.

**Interpretation:** Der getestete alte CEX-Momentum-Ansatz hat in den belegten 60 Tagen **verloren**, auch bei gestaffelten Einsätzen. Höhere Einsätze sind keine belegte Verbesserung. Keine „positiv bestandene GPT-Strategie“. Das Live-Paper-Budget bleibt unverändert, die bisherige lokale vorsichtige Risikogrenze wird nicht auf 250 TEST-USDC angehoben.

## 4. Wichtige Einschränkungen für den vom Nutzer tatsächlich gewünschten Test

Die zwölf Binance-Paare waren **rückblickend ausgewählt**, nicht damals neutral aus allen entstehenden DEX-Memecoins gefunden. Der 60-Tage-CEX-Vergleich ist ein **separater deterministischer Kurs-Test**, kein 60-Tage-Memecoin-Neuentdeckungs-GPT-Backtest.

Die Scanfrequenzen 1/4/12/24 stammen aus einer im **Training** eingefrorenen, **tagesweise** aus historischen Vorperioden hergeleiteten Quar­til-Logik. Sie sind bislang **nicht** mit der inzwischen auf GitHub entwickelten intraday-stündlichen adaptiven GPT-Steuerung gleichzusetzen. Die exakt 10 Scans am letzten Tag sind auf den historischen Cutoff begrenzt. Ein stündlich adaptiver 60-Tage-Handels- und GPT-Kreislauftest ist weiterhin offen.

Echte GPT-Entscheidungen zur damaligen Uhrzeit, vollständige unabhängige historische DEX-Liquidität, Security, Sellability, Social-/Narrative-Daten und realistisch ausführbare BUY/SELL-Quotes der neutral entdeckten Solana-Coins fehlen. **49/60 Launch- und 36/60 Minuten-Feature-Tage** sind Rohdatenabdeckung, keine abgeschlossenen Strategietage. Ein später trainiertes GPT-Modell kann Vorwissen tragen, weshalb selbst ein rückblickend versiegelter Daten-Frame nicht automatisch einen historischen Blindtest beweist.

## 5. Wiederholbar und überprüfbar

- Code: `research/replay-120d-real/tiered-stake-cex-shadow.mjs`.
- Regression: `research/replay-120d-real/tiered-stake-cex-shadow.test.mjs`.
- Erfolgreiche Ausführung einschließlich vier Tests: https://github.com/127027/Sniperbot-/actions/runs/43943034647
- Dortiges Source-/CSV-Archiv: https://github.com/127027/Sniperbot-/actions/runs/43943034647/artifacts/14264895518
- Alle 69 Einzelereignisse und die beiden dauerhaften 60-Tage-CSVs sind direkt in `research/replay-120d-real/results/` eingecheckt.
- Nie als `PAPER_FILLED`, echter GPT-Gewinn oder Echtmarkt-Execution ausgeben.

## 6. Folgerungen für den weiterlaufenden Auftrag

1. Vollständige historische, vor dem Kauf beobachtbare Solana-/Base-/Ethereum-/BNB-Kandidaten unabhängig identifizieren; die 36 vorhandenen Solana-Minuten-Tagesarchive sind die erste echte Grundlage.
2. Ein **actual GPT** bekommt ausschließlich zeitlich abgeschottete Beobachtungsframes. BUY/WATCH/HOLD/SELL/NO_TRADE mit Quellenhash speichern, unverändert einfrieren, danach unabhängige später beobachtete Outcomes auswerten; abgelehnte später gestiegene Coins ebenfalls archivieren.
3. Für jede hypothetische Order tatsächliche damalige Markttiefe, Contract-Sicherheit und ausführbaren Einstieg/Ausstieg beschaffen. Wenn nötig `DATA_GAP`, nicht 0 % Gewinn.
4. Die **tagesintern variable** Auswahl 1–24 Vollanalysen separat auf authentischen zeitlich abgeschlossenen Intraday-Daten reproduzierbar testen und erst danach den vollständigen Strategietest gegen die geschützten Holdout-Tage ausführen.
5. Erst mit **nachgewiesenen** GPT-Paper-Entscheidungen, lokal quittierten Paper-Käufen und -Verkäufen sowie einem unabhängigen Forward-Test über ausreichend viele Fälle könnte die Reife für einen echten 24/7-Live-Paper-Betrieb bewertet werden. Kein Echtgeld ohne gesonderte ausdrückliche Freigabe.
