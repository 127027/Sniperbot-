# R29 V1.3 – Ungefiltertes, blindes Memecoin-Lernen: erster echter Betriebsnachweis

## Ziel
Erkenne künftige Memecoin-Ausbrüche aus **damals vorhandenen** Daten. Die 65 historischen Gewinner dienen nur dem **Vergleich danach**, niemals dem ersten Scan, einer priorisierten Kandidatenliste oder einem direkt trainierten Klassifikator.

## Was der Original-XLSX belegt
65 Retrospektivmeldungen ≥100 %, 8 direkte Pool-Links, 57 ohne eindeutige Pool-ID. 27 Robinhood / 27 Solana / 7 Ethereum / 3 BNB / 1 Cronos. Insgesamt 46 meme-/meme-nahe Einträge und 19 Projekt-/Utility-Einträge unklaren Meme-Status. **0 bereits belegte exakt eingegrenzte UTC-Tief→Hoch-Kursverläufe laut Original-Übersicht.** Diese Angaben nicht als damalige Original-Beobachtungen im Bot verwenden.

## Konkrete V1.3-Fixes
1. **Fair-Rechecks:** `src/discovery-fair-queue.mjs`: neue und lange nicht geprüfte Pools werden rotierend statt permanent dieselben ältesten sechs ausgewählt. Nachweis mit 18 Pools in drei Sechser-Runden; kein Pool verhungert in einem endlichen Bestand.
2. **Paging:** `src/discovery-page-scheduler.mjs`: jede Chain wechselt zwischen neuer Seite 1 und nächster unerledigter Seite. Die alte Auswahl hing von `GITHUB_RUN_NUMBER % 2` ab und konnte bei genau sechs Chains niemals von Seite 1 wechseln. Das ist korrigiert.
3. **Neutrale Samples:** `src/forward-learning.mjs` speichert alle tatsächlich gesehenen öffentlichen Pool-Datensätze ohne Auswahl bekannter Gewinner; Quellen/UTC, vollständige Identität, Preis, Liquidität und Volumen. Zweitquellen-DEX-Recheck-Kurse werden künftig ebenfalls Teil der unselektierten Zeitreihe.
4. **Kein Zukunftswissen:** Die Rangliste `-asof-ranking.json` verwendet nur bis zum jeweiligen Zeitpunkt gespeicherte Samples und verlangt zwei ausreichend getrennte Beobachtungen. Keine Risiko- oder Kaufautorisierung.
5. **Nachher-Labels:** Erst mit echte 24h späteren Quellen, inklusive Verlierern, wird der tatsächliche beobachtete **Endpunkt**-Anstieg bestimmt. Das ist NICHT identisch mit maximalem Tief/Hoch innerhalb 24h.
6. **Zeitlicher Trainings-/Holdout-Split:** `src/temporal-learning.mjs` verweigert das Lernen aus der reinen Gewinnerliste bzw. weniger als 30 ordentlich gelabelten Fällen (≥5 Gewinner, ≥5 Nichtgewinner). Das Training erzeugt keinen automatischen BUY.

## Tatsächliche GitHub-Läufe am 21. November 2026
| Testlauf | Chain | Neue API-Pools | Recheck-Preise | Gespeicherte Gesamtpools | Rankbare as-of-Signale |
|---|---|---:|---:|---:|---:|
| [44938248515](https://github.com/127027/Sniperbot-/actions/runs/44938248515) | Base | 6 | 6 Detailprüfungen | 75 | 0 |
| [44938541583](https://github.com/127027/Sniperbot-/actions/runs/44938541583) | Ethereum | 3 | 6 verifizierte neue Zeitreihenbeobachtungen | 78 | 0 |

Der zweite Lauf war nach weniger als fünf Minuten: Das Signalfenster wurde absichtlich **nicht** vorzeitig als bestätigte Veränderung gewertet. Null rankbar bedeutet nicht null Chancen und nicht null Marktaktivität, sondern **noch ungenügende zeitliche Daten**. Für einen 24h-Erfolg liegen ebenfalls noch keine vorwärts aufgenommenen Endwerte vor.

## Ehrliche Erkennungsmetriken
| Kennzahl | Nachweisbarer Stand |
|---|---|
| Zahl gemeldeter retrospektiver Gewinner | 65 (unverifizierter UTC-Tief→Hoch-Nenner) |
| Zahl tatsächlich prospektiv aufgenommener unabhängiger API-Captures | 2 |
| Verifizierte rechtzeitig erkannte Oktober-Gewinner | nicht messbar |
| Prospektive 24h positiv/negativ gelabelte Pools | 0 |
| Blind-Rekall/Präzision | **nicht messbar** |
| Ziel ≥10 % früh erkannte echte Gewinner | **offen, nicht behauptet** |
| Echte Paper-Orders und Client-Fills | **0 / 0** |

## Was als Nächstes echte Leistung beweist
Die bestehenden fünf stündlichen Dots müssen weiter auf GitHub schreiben, dabei tatsächlich mit allen gesehenen Pools inklusive unspektakulären/Verlustcoins arbeiten und ihre Nachprüfung nicht wieder auf dieselben sechs Pools begrenzen. Nach genügend Zeit werden reale Folgepreise gesammelt, positive und negative Fälle getrennt gelabelt und eine **neue, vorher ungesehene** Folgeperiode getestet. Erst das erlaubt eine glaubwürdige Trefferquote und später einen echten Paper-Handelsnachweis unter unveränderten Sicherheitsbedingungen.

**Zusatz:** Die früheren V1.2-Modelle erzielten auf sechs rückblickend ausgesuchten Oktober-Pools −5,30 TEST-USDC realisierten Modell-PnL; dieses Ergebnis ist keine unabhängige Vorhersageleistung. 24 historische Modellscans werden nicht zu damals realen Dot-Läufen umetikettiert.
