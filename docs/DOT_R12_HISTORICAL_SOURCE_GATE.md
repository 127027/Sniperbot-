# R12 – Historische Ereignisquellen einspeisen, ohne Zukunftswissen

## Zweck
Die fünf Dots sollen die 61 virtuellen Tage **10.09.–09.11.2024** chronologisch erleben. Vorliegen tun derzeit nur vereinzelte 2024-datierte Web-/Social-Hinweise und Providerbeschreibungen – nicht 61 Tage verifizierte Originalnachrichten plus Poolzustände.

### Wichtig: Rückblickende Gewinner-Fälle bleiben außerhalb der Dot-Eingaben!
In diesem Dokument stehen absichtlich **KEINE Namen von nachträglich erfolgreichen Coins, Kursanstiegen oder exakte profitable Einstiegstage**. Sie würden den Blindtest kompromittieren. Die vom Nutzer früher genannten Trades/Beträge/Prozentwerte waren ausdrücklich erfunden und sind keine Trainingsdaten. Öffentliche Coin-Historien dürfen für eine spätere Holdout-Auswertung dienen, nicht um die Dots auf Gewinner hinzuweisen.

## Neue Gate-Komponente
`runner/dot-historical-source-gate.mjs` klassifiziert JSON-Metadaten **ohne Netzwerk**, Orderweg, Handelsschnittstelle oder echte Portfoliobuchung:

- `STRICT_ASOF_INPUT`: ausschließlich archivierte Originalbytes mit einem nachgewiesenen Capture spätestens zum simulierten Tag, URL-Capture-Zeit gleich UTC-Zeit, geprüfter Content-Hash und explizitem Audit-Vermerk. Der rein lokale Test prüft Formalia; Menschen bzw. zusätzliche unabhängige Fetcher müssen die Echtheit der Quelle prüfen.
- `RECONSTRUCTED_LEDGER_EVENT_DISCOVERY_NOT_PROVEN`: ursprüngliche Chain-TX/Slot-Information kann aus einem historischen Ledger rekonstruiert sein, ist aber **nicht** automatisch ein Beweis dafür, dass der damalige Dot sie live entdeckt hätte. Quelle, Blockzeit, Signatur, historisch rekonstruierter Zustand und externe Bestätigung notwendig.
- `PUBLICATION_METADATA_NOT_ORIGINAL_BYTES` bzw. `PROVISIONAL_RESEARCH_LEAD`: ein heute abrufbarer, mit 2024 datierter Artikel oder Socialpost. Darf als Quelle für weitere Nachforschungen dienen, **nicht** als streng bewiesener damaliger Originaltext oder handelbare Gelegenheit.
- `HINDSIGHT_PRICE_FOR_EVALUATION_ONLY`: heute rückblickend verfügbare Preis-/ATH-/OHLC-Zeilen. Nie als Eingabe an einen früheren virtuellen Tag.
- `FUTURE_BLOCKED`: Event oder verfügbare Quelle liegt nach dem Tagesstichtag. Keine Freigabe.

`buildDayPackets()` erzeugt pro vorhandenem virtuellen Tag strukturierte Quellenstatus-Container. **Das ist kein Beweis für 61 bearbeitete Tage**: Nicht mit Originaldaten gefüllte Tage bleiben leer und bekommen weder Coin-Namen noch fiktive Kaufentscheidungen.

## Datenversorgung vor einem echten Backtest
1. **Nachrichtenarchiv**: Pro historischen Tag neutrale, breite Original-Feeds (Politik, Celebrity, Tiere, Internet-Memes, KI, Communities) mit damaligem Originaltext, dokumentiertem Veröffentlichungs-/Capturezeitpunkt, URL und Inhalts-Hash. Kein nachträglicher Winner-Suchbegriff als Tagesinput.
2. **Social-Archiv**: Originalposts und Interaktionsstände, soweit zum Tag tatsächlich archiviert. Heutige Likes/Followers nicht auf 2024 zurückdatieren. Missing = UNKNOWN.
3. **Onchain-Archive**: Chain-/Launchpad-Mint-, Pool-, Swap- und LP-Historie mit unveränderlicher Block-/Slotzeit; erforderliche Archiv-RPC-/Indexerdaten und ggf. Zugangsrechte sind gegenwärtig nicht für alle vier Chains nachgewiesen. Ein heutiger DEX-New-Pools-Endpunkt liefert **keinen** verlässlichen historischen Tagesfeed.
4. **Kurs und Ausführung**: Historischer Poolzustand plus tatsächlich zum damaligen Zeitpunkt ausführbare BUY- und SELL-Quotierung für die Größe der hypothetischen Position; fees, impact, slippage und illiquide Ausstiege. Allgemeine aggregierte Tages-OHLCs oder spätere Handelsplätze reichen als Nachweis **nicht** aus.
5. **Unvoreingenommene Kohorte**: positive und negative Launches aus demselben originalzeitlich beobachtbaren Universum, ohne Gewinner-Vorselektion; Testlabels erst nach eingefrorenen Entscheidungen öffnen.

## Ausführungsgrenzen
- Research-only, `TRAINING_ONLY`, Botzustellung pausiert.
- `runner/dot-causal-timemachine.mjs` und `runner/dot-historical-source-gate.mjs` sind isolierte Offline-Analysetools, kein abgeschlossener realer 61-Tage-Backtest.
- Alle automatisierten Tests nutzen **nur ausdrücklich synthetische Fälle**, die nichts über historische Trading-Performance aussagen.
- Keine Zugangsdaten im Repository, keine Live-Orders, kein BUY/SELL-Kurier, keine Paper- oder Echtgeldkonto-Änderung.

## Nächster echter technischer Meilenstein
Ein unabhängig und reproduzierbar verifizierter **lückenloser** Original-News-/Social-/Chain-/Pool-Paketabschnitt für die ersten Tage, danach eine echte, vor dem Folgetag gesperrte Entscheidung aller fünf Dots. Solange das fehlt, ist die Ursache `BLOCKED_INPUT_DATA`, **nicht** "Dots haben alle Chancen verpasst".
