# R29 V4 – vollständige neutrale historische Entdeckung und 48h-Kandidatenbestand

**Stand 17.11.2026. PAPER_ONLY. V4 ist als gesamte autonome Handels- und Zehn-Backtest-Abnahme noch NICHT abgeschlossen.**

## 1. Korrigierte Hauptursache

Vorher: nur vier starre Prüfzeitpunkte pro Tag, jeweils acht innerhalb von fünf Minuten gestartete Coins. Mehr als 99,9 % der Starts des betrachteten Oktober-Zeitraums wurden dem Modell dadurch nicht übergeben. Die bereits bekannten vier Referenzgruppen waren zwar im tatsächlichen Originalarchiv, aber nicht in der kleinen Modellauswahl.

Jetzt: `research/replay-120d-real/r29-v4-complete-48h-source.py` nimmt jede **gültige** original aufgezeichnete Solana-Mint-Identität in den persistenten SQLite-Quellenkandidatenbestand und in per Tag vollständig exportierte `.jsonl.gz`-Dateien auf. Jede Startidentität wird mindestens 48 Stunden ab Start gehalten; über Mitternacht, Vorlauf-/Handelsgrenze und über die Tage hinweg. Inkonsistente Duplikate, spätere Zukunftsfelder und Quellenänderungen schlagen fehl. Keine Gewinnernamen, späteren Preiskurven oder Ergebnislabels in der Erfassungslogik.

## 2. Nachweisbarer Oktober-Regressionstest

- Zeitraum 05.–11. Oktober 2026 Vorbereitung, 12.–21. Oktober 2026 Handel.
- **821.849/821.849** im originalen Solana-Launch-Korpus erfasste gültige Tokenstarts wurden beim unabhängigen zuerst durchlaufenen GitHub-Actions-Job vollständig aufgenommen. 351.726 Starts im Vorlauf + 470.123 im Handel.
- Kein Acht-Coin-Limit; alle 821.849 Original-Identitäten wurden als unterschiedliche Mints eingetragen; die Tagesdatei-SHA-256 stammen aus dem eingefrorenen Ursprungsdatensatz.
- Der getrennte **erst nach Erzeugung des vollständigen neutralen Stroms** gestartete Regressionstest fand **4/4 benannte Fallgruppen und 6/6 konkrete Solana-Mint-Adressen** (zwei PIERRE, ein FTR, zwei Dacity, ein Trump $1). Das ist **technischer Quellen-Recovery-Recall**, keine Aussage über GPT-Kaufentscheidung oder Profit.
- Reproduzierbarer ursprünglicher vollständiger Lauf: https://github.com/127027/Sniperbot-/actions/runs/44164625844

## 3. Technische 48h-Interessenpriorisierung auf echten Minutenmerkmalen

`r29-v4-asof-feature-priority.py` verwendet ausschließlich originale Minutendaten, die am simulierten Prüfzeitpunkt bereits mit Zeitstempel vorliegen: früh aufgezeichnete Käufe, SOL-Kurvenreserve (KEINE USDC- oder reale Bid-Liquidität), Konzentration und offensichtliche Risiko-Flags. Die tatsächlichen Minuten-Datei-SHA-256 werden geprüft. Während jedes Tages werden die Features **streng in zeitlicher Reihenfolge** vor allen simulierten Stundenschlussprüfungen eingespielt, nicht mit Datensätzen späterer Stunden vermischt.

Die so entstandene technische GPT-Research-Warteschlange hat keinen harten Acht-Coin-Verlust: Jede technisch geeignete Identität ist in 64er-Seiten mit Gesamtzählung und Seitenzahl erreichbar; die 64er-Grenze ist nur ein Übertragungspaket, keine heimliche Kandidatenlöschung. Bei authentisch neu beobachteten Käufen kann die 48-Stunden-Aufbewahrung verlängert werden. Der Collector darf weder BUY noch SELL bestimmen.

Felder wie Wallet-Diversität, vollständige Liquidität, tatsächliche Bid-/Ask-Slippage, unabhängig geprüfte Holder/LP-Ownership und veröffentlichte Trades sind in den bisherigen Feature-Rohdaten nicht umfassend nachgewiesen. Sie bleiben UNBEKANNT statt künstlich positiv.

Die Originaldaten wurden erst **nach** dem historischen Ereignis veröffentlicht. Alle Uhrzeiten sind streng retrospektiv abgesperrte **simulierte** AS-OF-Zeiten und BEWEISEN keine damalige echte Echtzeit-Auslieferung an GPT.

## 4. Zehn historische Handelstests: ehrliche Quellenverfügbarkeit

`r29-v4-test-window-planner.py` reserviert zehn nicht überlappende Zehntages-Handelsfenster mit sieben vorangehenden Tagen. Die vorhandene Originalquelle 31.08.–05.11.2026 reicht nur für **sechs vollständige 17-Tage-Startfenster**, darunter **drei** mit durchgängig vorhandenen Minutenmerkmalen (aus 24.09.–05.11.). Vier der zehn angefragten Fenster haben zwingende Rohdatenlücken. Zum Erreichen von zehn voneinander getrennten 10-Tage-Handelsperioden plus Vorlauf sind mindestens 107 fortlaufende Tage nötig, zusätzlich unabhängige nachweisbare historische Deal-/Pool-/Quote-Daten.

Die vorhandenen Oktober-/September-Daten wurden schon mehrfach in vorangegangenen Chats und Modellanalysen untersucht. Deshalb sind die gewählten restlichen sechs Fenster NICHT mehr als völlig unabhängige Blind-Holdouts anzuerkennen; neue unverbrauchte Quellen oder eine vorab registrierte zukünftige Forward-Phase sind erforderlich. Insbesondere kann man keine „letzten drei unbekannten Holdouts“ behaupten, die bereits bekannt sind.

## 5. Keine erfundenen autonomen GPT-Trades

| Abnahmedimension | Nachgewiesen |
|---|---|
| Sämtliche gültigen Starts des Oktober-Originalproviders erfassen | JA – 821.849/821.849 |
| 48h identitätsgetreue Quelle über Tagesgrenzen | JA – CI und Offline-Tests |
| Bekannte vier Referenzgruppen technisch in neutralem Strom | JA – postfreeze 4/4 (6/6 Contracts) |
| Tatsächliche Oktober-Modellempfehlungen für jeden interessanten Coin | NEIN |
| Verifizierte Größe-/Zeitpunktabhängige DEX-Kauf- und Verkaufsausführung | NEIN |
| 10 unabhängige abgeschlossene 10-Tage-GPT-Tradingtests | NEIN – Quelle reicht nicht |
| Nachweisbar realisierte Gewinne/Verluste | UNBEKANNT, NICHT 0 oder PLUS |
| Aktive Echtgeldfreigabe / User-Wallet verändert | NEIN / NEIN |

Der Referenzbetrag **5.000 TEST-USDC pro Handelstest** ist lediglich eine unabhängig anzusetzende Paper-Simulation. Der echte R29-Laptop-Paper-Ledger, sein Guthaben, Startskript und seine lokalen DPAPI/Walet-Daten bleiben unverändert. Die GitHub-Test-Runner führen keine Transaktionen aus.

## 6. Nächste zwingende Schritte

1. Kontinuierlich alle original beobachteten Markt- und Feature-Updates in den historischen as-of Research-GPT-Input leiten. Für jeden GPT-Modellaufruf echte Modellidentität, virtuelle Zeit, tatsächliche Aufrufzeit und Begründung archivieren; lokale technische Scores nie als GPT-Entscheidung ausgeben.
2. Unabhängige, zum selben virtuellen Zeitpunkt archivierte Coin-bezogene Swap-/Pool-/Token-/Liquidity-Belege und ausführbare Hin-/Rück-Verkaufsquotes nach realistischen Gebühren und Slippage beschaffen. Anderenfalls `NO_EXECUTABLE_QUOTE` mit unbekanntem PnL.
3. Fehlende mindestens vier weitere unabhängige 17-Tage-Quellenfenster und einen tatsächlich bislang unangetasteten Holdout finden; wenn nicht möglich, strikt mit vorab eingefrorenen Kriterien in den prospektiven Forward-Paper-Test wechseln.
4. Erst danach GPT-autorisierte, unterschriebene virtuelle BUY/HOLD/SELL-Entscheidungen in **einem** isolierten Test-Ledger und exakte Positions-/Orderquittungen durchführen. Nie Echtgeld ohne separate ausdrückliche Freigabe.

## Fortsetzung

Startpunkt für neue Chats: `SNIPERBOT_R29_START_HERE.md` und `research/r29/operations/R29_LATEST_CHECKPOINT.json`. Neuer V4-Source-/Priority-Branch `codex/r29-v4-full-launch-48h-scope-20261117`; durch GH Actions getestete Codes `r29-v4-complete-48h-source.py`, `r29-v4-asof-feature-priority.py`, `r29-v4-test-window-planner.py`, `r29-v4-oct-posthoc-regression.py`. Die nachträglich bekannten PIERRE/FTR/Dacity/Trump-Mints niemals zu Trainings- oder GPT-Rangierregeln hinzufügen.
