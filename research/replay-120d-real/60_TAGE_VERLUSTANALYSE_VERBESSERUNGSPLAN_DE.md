# R29 – 60 Tage: Verlustursachen, Experiment und belastbarer Weg zur Verbesserung

**Auswertung:** 16. November 2026 · **Research / PAPER_ONLY**. Die bisher voll belegten 60 Tage betreffen nur einen **preisbasierenden CEX-Schattenvergleich** auf echten Binance-Stundenkursen, nicht 60 Tage geprüften GPT-DEX-Handel. Der neue, neutrale historische Solana-Quellenstand bleibt **43 von 60 Tagen Minuten-Daten**, davon nur ein kompletter DEX-Swap-Tag. Ein positiver GPT-Handelstest ist **noch nicht bestanden**.

## 1. Diagnose: Woran verliert das gestaffelte Modell?

Abgleich mit 69 unverändert archivierten CEX-Modellereignissen (36 Modell-BUYs, 33 Modell-SELLs). 5.000 TEST-USDC Start; 250 / 100 / 50 je nach bereits offener Position, je 1 % hypothetische Kauf- und Verkaufskosten.

| Kennzahl | Ergebnis |
|---|---:|
| 33 geschlossene Trades | **3 positiv / 30 negativ** |
| Gewinnrate abgeschlossener Trades | **9,09 %** |
| Durchschnittlicher Gewinn | **+32,57 TEST-USDC** |
| Durchschnittlicher Verlust | **−9,49 TEST-USDC** |
| Gewinnsumme der 3 Gewinner | **+97,70 TEST-USDC** |
| Verlustsumme der 30 Verlierer | **−284,63 TEST-USDC** |
| Realisierter Verlust | **−186,93 TEST-USDC** |
| Indikativer Endverlust einschließlich 3 offener Positionen | **−198,22 TEST-USDC** |
| Wichtigste Einzelcoin-Verlustgruppen | BOME **−58,66**, PEPE **−45,96**, TRUMP **−37,82** TEST-USDC |
| Anteil dieser drei Coins am realisierten Modellverlust | **ca. 76 %** |

**Mathematischer Kern:** Bei unverändertem durchschnittlichem Gewinn (+32,57) und Verlust (−9,49) müssten mindestens ungefähr **22,6 %** der geschlossenen Trades gewinnen, nur um in der betrachteten geschlossenen Gewinn-/Verlustverteilung die Gewinnschwelle zu erreichen. Tatsächlich gewannen **9,1 %**. Das ist eine Diagnose, **keine zulässige Prognose** der nächsten Handelsperiode. Weniger Handelsschleifen kann helfen, muss aber nicht.

**Kosten-Stresstest mit identischen historischen Trades:** Bei künstlich **0 % Kosten** statt 1 % je Seite wäre das Kursmodell immer noch negativ: realisierter PnL ungefähr **−108,50**, indikative Endequity **4.888,11 TEST-USDC**. Selbst unrealistisch kostenfreier Handel hätte den bestehenden Einstiegssatz noch nicht profitabel gemacht. Je 0,1 % hypothetischer Seite ergibt ungefähr **4.879,44** TEST-USDC Endwert. Diese Zahlen gelten nur für **exakt dieselben** historischen Modelltrades und unveränderte hypothetische Preis-Markierungen, nicht für reale DEX-Kosten, MEV und Slippage.

## 2. Ein geprüftes neues Experiment: Verzicht auf spätere wiederholte Verlust-Trades

Das zweite Modell wurde **erst nach Einsicht in den 60-Tage-Testsatz** entworfen. Es kennt bei jeder Entscheidung nur **bereits vollständig geschlossene** frühere Modelltrades desselben Coins – keine späteren Outcomes; Verkäufe mit exakt gleichem UTC-Zeitstempel zählen vorsichtshalber noch **nicht** als vorher bekannt.

**Vorläufige Regel:** Wenn für den Coin in den vorangegangenen **7 bzw. 14 Tagen mindestens zwei bereits realisierte Verluste** vorliegen, keinen weiteren modellierten Kauf dieses Coins aus dem ursprünglichen CEX-Signalsatz annehmen. Alle übrigen originalen Einstiegs-/Ausstiegssignale bleiben unverändert; die 250/100/50-Einsätze ergeben sich weiterhin aus der Zahl der zu diesem Zeitpunkt offenen Modellpositionen.

| Durchlauf | Angenommene BUYs / SELLs | Gewinne / Verluste | Abgelehnte einstige BUYs | Indikative Endequity | Veränderung ab 5.000 |
|---|---:|---:|---:|---:|---:|
| Original-C ohne Filter | 36 / 33 | 3 / 30 | 0 | **4.801,78** | **−198,22** |
| Mindestens 2 vorangegangene Verluste binnen 7 Tagen | 33 / 30 | 3 / 27 | 3 | **4.824,02** | **−175,98** |
| Mindestens 2 vorangegangene Verluste binnen 14 Tagen | 29 / 26 | 3 / 23 | 7 | **4.848,20** | **−151,80** |

**Ergebnis:** Der 14-Tage-Hypothesenfilter hätte in diesem bereits bekannten Test **46,42 TEST-USDC** weniger Verlust produziert, bleibt aber **im Minus**. Beide Varianten sind **retrospektive Diagnosen auf einem schon bekannten Testzeitraum**. Der zuvor eingesehene 60-Tage-Holdout ist damit für diese neue Filterregel nicht mehr unabhängig. Es ist **kein Beleg** für eine zuverlässig verbesserte Strategie. Die ursprünglichen CEX-Kaufsignale sind zudem vom alten Positionsverlauf abhängig; unter neuen freien Slots könnten tatsächlich weitere, hier nicht erfasste Signale entstehen. Der Test ist deshalb kein vollständiger alternativer Handelslauf.

**Verified CI mit Leakage- und Reproduktionsprüfungen:** https://github.com/127027/Sniperbot-/actions/runs/43947405737

**Code, Tests, Ergebnisse:**
- `research/replay-120d-real/cex-loss-control-diagnostic.mjs`
- `research/replay-120d-real/cex-loss-control-diagnostic.test.mjs`
- `research/replay-120d-real/results/60_TAGE_VORHERIGE_VERLUSTE_COOLDOWN_NUR_DIAGNOSE.json`
- Vollständige abgelehnte und angenommene Ereignisse einschließlich zwei Tagesprotokollen: https://github.com/127027/Sniperbot-/actions/runs/43947405737/artifacts/14265846154

## 3. Was plausibel von Minus nach Plus helfen könnte – erst als zu testende Hypothesen

**Kaufqualität statt bloß höhere Einsätze:** (a) Sicherheits-/Sellability-KO-Regeln mit unabhängig belegten Ausstiegsmöglichkeiten; (b) frühe **organische einzigartige Käufer**, Wallet-Konzentration, Quellenvielfalt und Pool-Liquidität/Preise in USDC; (c) Social-/News-Timestamps und neue reale Narrative; (d) Marktregime und Abstinenz an Tagen ohne belastbare Signale. 50/100/250 TEST-USDC ist nur eine mögliche Staffel, solange Positions-/Drawdown-Obergrenzen eingehalten werden.

**Wiederholte Verluste:** Eine vordefinierte, kurze Quarantäne nach nachweislich abgeschlossenen Verlusten einer Coin-/Pool-Kombination ist ein plausibler *Risikofilter*, den zukünftige Forward-Perioden prüfen können; kein Automatismus zur Verlustvermeidung. Bremsen dürfen nicht verhindern, dass der Bot valide neue Wallet-/Pool-/Contract-Identitäten einzeln prüft.

**Stop und Gewinnsicherung:** Exit auf Portfolio- und Einzelpositionsebene bei verlorener Sellability, Abzug der Liquidität, Konzentration oder zunehmendem Price-Impact; dynamischer Trailing-Stop und Teilgewinnmitnahmen sind **Gegenhypothesen**, noch nicht als verbessert getestet. Ein Stop-Loss garantiert bei Memecoin-Rugpulls keinen Verkaufspreis.

**Variable Scans:** Stundenweise 1↔4↔12↔24 Neuplanung nach echten, unabhängigen neuen Daten und offenen Positionen, anstatt jeden Tag eine starre Scanfrequenz zu übernehmen. Ein ausgeführter Scan ist noch kein guter Kauf.

**Analyse ohne verbotene nachträgliche Optimierung:** Die 60 bekannten Tage dienen nun für Diagnose/Entwicklung. Hypothesen und Schwellen müssen mit Versionshash eingefroren und dann auf **neuer, unberührter historischer/forward Paper-Periode** verglichen werden: Gebühren, Slippage, Latenz, Fehlfills, echte Live-Datenqualität, Kapitalauslastung, Maximaldrawdown und False-Negatives. Nicht nur Umsatz/Endgewinn betrachten; höhere Einsätze bei ungeprüfter Trefferquote vergrößern Risiken.

## 4. Konkretes Ziel für die nächste Etappe

1. **Daten schließen:** Die bereits 43/60 geprüften historischen Solana-Frühfeatures sind real, aber es fehlen 17 Feature-Tage dieser Quelle und fast alle echten DEX-Ausführungs-/Security-Quellen. Fehlende Perioden bleiben `DATA_GAP`, nie als Nullhandel oder Gewinner erfinden.
2. **Modell entscheiden lassen:** Echte GPT-Entscheidungen auf vorab zeitlich abgeschotteten Frames mit Contract-/Pool-ID und Source-Hash protokollieren, alle WATCH/NO_TRADE-Signale separat nachverfolgen, spätere Ergebnisse niemals in frühere Entscheidungen einspielen.
3. **Risiko-Hypothesen erst unabhängig prüfen:** Gültige Kandidaten- und Portfolio-Sicherheitsfilter auf nicht schon zum Design verwendete neue Daten anwenden. Ein einzelner historisch scheinbar positiver Lauf ist noch keine belastbare Erwartungsrendite.
4. **LIVE-PAPER vollständig testen:** Nur authentische BUY-, HOLD-, SELL-Entscheidungen mit unabhängigen Quotennachweisen, tatsächlich lokalen `PAPER_FILLED`-Quittungen und funktionierendem Notstopp gelten als Erfolg. Echtgeld bleibt bis zu gesonderter Freigabe und erfolgreichen technischen Prüfungen gesperrt.

**Fazit:** 60 Tage Kurs-Schattenhandel liegen komplett vor und haben Verluste offengelegt; die echten GPT-DEX-Handelsnachweise für 60 Tage fehlen weiterhin. Das getestete nachträgliche Verlustfilter-Experiment reduziert den Modellverlust etwas, kehrt ihn aber nicht ins Plus. Ein echter positiver Ertrag muss erst durch unabhängige Forward-Validierung belegt werden.
