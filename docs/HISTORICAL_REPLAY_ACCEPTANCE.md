# R29 Cleanroom – ehrliche Abnahme eines historischen Handelstages

## Testtag und Umgebungsgrenze
Der erste fest ausgewählte Tag bleibt **12. Oktober 2026**, 00:00:00Z bis 13. Oktober 00:00:00Z. Die später identifizierten Tagesgewinner dienen AUSSCHLIESSLICH der nachträglichen Bewertung, niemals der Dot-2-Kandidatenwahl. Die GitHub-Historie der am 21. November gestarteten Cloud-Dots beweist keine Dot-Entscheidungen vom Oktober.

## Zwei strikt getrennte Prüfungen

### A: Software und Zusammenarbeit (testbar)
- Bestätigte, chain-spezifische Contract- und Pool-URL-Prüfung, SHA-gerechte Signalpublikation und idempotente Paper-Receipts.
- Keine Order darf länger als fünf Minuten gültig sein.
- Dot 1 akzeptiert negative Volumenänderungen und reduziert das Tempo erst nach zwei echten ruhigen Kontrollen.
- Dot 4 untersucht **bestätigte** offene Paper-Positionen bei jedem stündlichen Wake, nicht nur beim Vollreview.
- Der isolierte Shadow-Code \`src/point-in-time-strategy.mjs\` kann aus **synthetischen** Chronik-Snapshots eigenständig BUY und SELL einschließlich Gewinnmitnahme und Verluststopp ableiten.
- Mindestens 42 grüne Tests sind nach dem 21.11.2026-Stand erreicht. Ein bestandener Test sagt nichts über reale historische PnL.

### B: Tatsächlich historischer Blind-Backtest (offen)
Für ein positives Ergebnis müssen ALLE Punkte belegt sein:
1. Ein hinreichend breites, nicht nach Gewinnern zusammengestelltes damaliges Candidate-Universe mit zeitlich belegten Entdeckungswegen, inklusive Nicht-Gewinnern.
2. Für Entscheidungen vom 12. Oktober mindestens zwei verschiedene, zeitlich ausreichend nahe und nachweislich damals verfügbare Quoten pro exakt gleicher Chain + Token-Contract + Pool-ID; voneinander unabhängige Quellen (oder separat rekonstruiert aus unbestreitbar datierten Onchain-Ereignissen mit nachvollziehbarer Berechnung), keine rückdatierten Webseiten.
3. Die Dot-Entscheidung wurde ausschließlich aus zu diesem Zeitpunkt verfügbaren Merkmalen hergeleitet. Datumslose Spätveröffentlichungen werden ausgefiltert.
4. BUY und SELL werden simuliert mit tatsächlich zeitgerechten Liquiditätswerten, Gebühren, Slippage und realistischem Ausführungsrisiko; bei fehlender Quelle NO_TRADE_DATA_GAP.
5. Netto-Paper-PnL > 0 und mindestens ein vollständig belegtes Kauf-Verkauf-Paar. Einzelne gewonnene Positionen beweisen noch keinen robusten Vorteil.
6. Separater nächster unbekannter Tag als Holdout – erst nach erfolgreicher Prüfung des ersten Tages; kein Nachoptimieren anhand dessen Gewinner.

## Diagnosestatus 12.10.2026
- Recherchequelle https://pumpdata.fun/stats/2026-10-12 meldet nachträglich 49.578 pump.fun-Launches, 1.180 Graduierungen und minutenschnelle Bewegungen. Das sind echte **Tagesstatistiken**, keine automatisch zeitgerecht verfügbaren Preissignale.
- https://dextape.com/launches/2026-10-12 zeigt einige spätere Gewinner und erklärt ausdrücklich, dass dies die **zuletzt an dem Tag gemessenen** Werte sind.
- https://launchtape.io/wild/2026-10-12 veröffentlicht ein Rückblick-Klassifikationsresultat, warnt aber selbst davor, den rückblickend optimalen Exit als handelbaren Gewinn darzustellen; vollständige Tape-Daten kosten Geld.
- Auf der frei zugänglichen Hugging-Face-Stichprobe https://huggingface.co/datasets/pumpdatafun/pump-fun-trades-sample/tree/main ist nach Stichprobenprüfung die hervorgehobene Datenbasis ab 15.10.2026, **nicht** der 12.10.2026. Keine unbelegte Behauptung, dass diese Rohdaten den Testtag abdecken.
- Es fehlen für den 12.10. nachweislich geeignete, jeweils damals verfügbare unabhängige Quotensnapshots; daher **STATUS DATA_GAP_NOT_VERIFIED** und 0 belegte historische Fills. Der verbliebene Mangel kann nicht durch Einstellen einer positiven Backtest-Rendite behoben werden.

## Kontinuierlicher Verbesserungszyklus
1. **Archivieren:** Jede echte Dot-2-/Dot-3-Beobachtung unveränderlich mit Original-URL, exakter Chain/Contract/Pool, Quotedaten, Abrufzeit, explizit ablesbarem Kursstand und unabhängigem Git-Blob-SHA sichern.
2. **Konsolidieren:** Dot 5/6 führt alle 24h denselben retrospektiven Audit und den strengen No-Lookahead-Replay erneut auf neuen Originaldaten aus. Bei fehlenden Quellen DATA_GAP, keine künstliche Erfolgszahl.
3. **Fehlerzuordnung:** erste belegte Störung Discovery / Risk / Strategy / GitHub-Publisher / offline Client plus dauerhafte Änderungs-IDs.
4. **Kontrollierte Reparatur:** nur eine rücksetzbare, technische Änderung pro Tageslauf ohne Öffnen von Sicherheitsgates; Run mit exakt denselben Originaldaten erneut ausführen.
5. **Fortschritt:** vor/nach der Änderung identische Abnahmekriterien. Wiederholte Tests desselben Tages ersetzen nie den unabhängigen nächsten Holdout-Tag.

## Aktuelle GitHub-Testnachweise
- Iteration 1: https://github.com/127027/Sniperbot-/actions/runs/44901653794 – 39/39.
- Iteration 2: https://github.com/127027/Sniperbot-/actions/runs/44901794295 – 42/42.
- Exakte Dateien: \`research/backtests/2026-10-12/iterations/01-diagnosis.json\`, \`02-retest.json\`. Die synthetischen Gewinne sind nur Unit-Test-Ereignisse. Keine Signaldateien oder Client-Receipts wurden durch diesen Replay veröffentlicht.
