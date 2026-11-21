# R29 Cleanroom V0.6 — Fehlerkorrektur und erneuter 24-Stunden-Replay

**Diagnosetag:** 2026-11-15 00:00 UTC bis 2026-11-16 00:00 UTC (deutsche MEZ +1). Bereits entblindeter Tag, daher **Regression/Training**, kein neuer unabhängiger Holdout.

## Nachgewiesener Ablauf-Fehler

Alte Funktion \`asOfCandidate(c, at)\` verwendete \`at = hh:35 UTC\`, obwohl Dot 2 schon bei \`hh:15\` sucht und Dot 3 bei \`hh:25\` bewertet. Ein um 00:32 eröffneter Pool hätte dadurch im falschen 00:35-Scan als bereits entdeckt erscheinen können.

**V0.6:** Kandidaten müssen ihre ursprüngliche Abruf- und Veröffentlichungszeit spätestens um \`hh:15\` erfüllen. Risikodaten spätestens um \`hh:25\`. Frische, exakt passende Quotes werden erst dann durch Dot 4 um \`hh:35\` bewertet. Ein nach \`hh:15\` auftauchender Pool geht frühestens in den nächsten stündlichen Dot-2-Zyklus, sofern kein tatsächlich dokumentierter zusätzlicher Discovery-Wake belegt ist.

## Zweiter Fehler: Quiet-Markt-Downshift trotz festem 24-Stunden-Regressionstest

\`replay24HourlyScans\` übergab \`targetPer24h:24\`, doch \`chooseCadence\` konnte bei zwei ruhigen Beobachtungen trotzdem auf vier Reviews herunterschalten. V0.6 fügt einen dedizierten \`forceHourlyReview\`-Modus ausschließlich für den angeforderten Test hinzu. Der live-adaptive Betrieb bleibt unverändert.

## Dritter Fehler: Snapshot konnte Dot 2 umgehen

Ein beliebig zugesandter \`CONTEMPORANEOUS_RECORD\` mit behauptetem \`ELIGIBLE\` wurde zuvor auch ohne nachgewiesene zugehörige Dot-2-Poolbeobachtung direkt an die Shadow-Strategie übergeben. V0.6 verlangt eine zeitgerechte, exakt passende ursprüngliche Kandidatenidentität und risikozeitgerechten Prüfzeitpunkt.

## Replay nach Korrektur

- **24/24** Strategie-Scans, einer je Stunde von 00:35 bis 23:35 UTC.
- **0** historische, zum damaligen Zeitpunkt tatsächlich belegte Original-Pool-Snapshots vom 15.11. im Repository.
- **0** nachweisbare damalige Coin-Käufe, **0** Verkäufe, **0** GitHub-Orders, **0** Client-Paper-Quittungen.
- Keine rechnerische historische Rendite; unverändertes Papierguthaben im leeren Replay ist **keine erfolgreiche Strategie-Rendite**.
- Der Test beweist, dass die Software die zeitlichen Regeln und Datenlücken korrekt behandelt; ohne historische Datenquelle lässt sich die echte Handelsleistung nicht beweisen.

## Nächster überprüfbarer Datenweg

Der öffentlich dokumentierte GeckoTerminal-\`ohlcv\`-Endpunkt akzeptiert \`before_timestamp\`, wodurch sich frühere Pool-Kerzen grundsätzlich abfragen lassen. Quellen: https://api.geckoterminal.com/docs/index.html und https://www.coingecko.com/learn/coingecko-api-troubleshooting-guide-and-solutions . Ein Candle gilt im Replay erst **nach dessen Schlusszeitpunkt** als bekannt. OHLCV einer extern abgefragten Börsenquelle allein ist **kein** unabhängig bestätigter Handels-/Liquiditätsnachweis. Für wirklich belastbare BUY/SELLs müssen Contract, exakter Pool, historische Liquidität, unabhängige Quellen und reale Risiken zeitgerecht nachgewiesen werden. Keine späteren Gewinnerlisten als Kandidatenfilter.
