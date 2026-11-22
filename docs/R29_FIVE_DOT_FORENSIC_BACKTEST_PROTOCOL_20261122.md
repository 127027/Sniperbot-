# R29 – Verbindliches forensisches Fünf-Dot-Protokoll vor dem Backtest

**Nutzerfreigabe 22.11.2026:** Den bestehenden Umbau auf dieses Ziel und die hochgeladene Datei `R29_Backtest_12-10-2026_65_Coins_und_Ablauf.md` ausrichten, **noch keinen Backtest ausführen**. Die zusätzliche Nutzerforderung lautet: **Alle Dots müssen dokumentieren, was sie wo (exakte Chain/Contract/Pool), wann, warum, auf welchen Daten und mit welchem Ergebnis getan oder nicht getan haben.** Das Resultat dient als Fehlerdiagnose und gezielter Umbauplan, bis ihre Aufgaben nachprüfbar erfüllt sind.

## 1. Die Frage, die der Backtest beantworten muss

**Arbeiten alle fünf tatsächlich prüfbaren GPT-Dots vom ersten Scan bis zum letzten Exit so zusammen, wie ein in dieser Zeit lebender 24/7-Bot arbeiten sollte – ohne Zukunftswissen, mit vollständiger Kausalkette und verantwortungsvoller Paper-Entscheidung?**

Das Ziel ist **nicht**, das theoretische Kurshoch eines später bekannten Gewinners zu erwischen. Zu vergleichen sind:
1. Rückblickendes Oracle-Ideal **erst nach dem Blindlauf**, klar nicht handelbar und nicht zur Optimierung verwendet.
2. Realistische, chronologische, quellengedeckte Paper-Modellentscheidungen unter nachvollziehbarem tatsächlichem Markt-/API-Datendefizit.
3. Nachweisbare GPT-Dot-Ausführungen und – sofern später vorhanden – von einem echten separaten lokalen Client bestätigte Paper-Receipts, **niemals** aus einem Modell-Receipt abgeleitet.

Der Oktober-Tag ist durch Voranalysen bereits **Diagnose-/Trainingsfall**. Strategieverbesserungen müssen anschließend an einem zuvor nicht ausgewerteten neuen Zeitfenster bestehen.

## 2. Exaktes Zeitfenster und das Langzeitgedächtnis

- **Wissensgrenze des Vorbereitungsstands:** 12.10.2026 **00:00 UTC exklusiv**. Beliebig weit in die VORHERIGE Geschichte zurückreichende belegbar verfügbare News, vollständige abgeschlossene Kerzen, frühere Gewinner und Verlierer dürfen gelernt werden. Auch intensive Vorbereitung über mehrere heutige Arbeitsstunden ist erlaubt, solange keine Oktober-Zukunft gezeigt wird.
- **Fünf Stunden aktive, streng beobachtete Aufwärmphase:** 11.10.2026 **19:00 UTC** bis 12.10.2026 **00:00 UTC**. In dieser Phase Erfassung, Reviews, Datenbasis, Marktgedächtnis und Warteschlangen; **keine Testfenster-Paper-Fills**.
- **Blindentscheidung und Startprüfung:** exakt **12.10.2026 00:00:00 UTC**. Eine erste BUY-/WATCH-/SELL-Entscheidung ist unmittelbar gestattet, **wenn** zeitgerechte gültige Risiko-/Quote-/Sellabilitybelege vorliegen. Nie auf :35 oder 01:00 künstlich warten.
- **24-Stunden-Blindlauf:** 12.10.2026 **00:00:00 UTC einschließlich** bis 13.10.2026 **00:00:00 UTC ausschließlich**. Die virtuelle Uhr geht stundenweise vorwärts, feinere News-/Pool-/Quote-/Stop-Zeitpunkte innerhalb der Stunde dürfen ausschließlich nach ihrem tatsächlichen Verfügbarkeitszeitpunkt eingeflossen sein.
- **Nachlauf:** erst nach 13.10.2026 00:00 UTC Referenzliste/Oracle entschlüsseln und Ergebnisse bewerten. Kein rückwirkendes Umetikettieren fehlender Daten oder ausgeführter GPT-Tätigkeiten.

**Langläufer-Simulation:** Der langfristig angesammelte Wissensstand des gedachten 24/7-Bots ist eine aus tatsächlich historischen, damals schon verfügbaren Daten **rekonstruierte Wissensbasis**. Er ist **kein Beweis**, dass der Bot ein Jahr lang existierte, täglich die API wirklich aufrief oder früher echte GPT-Reviews hatte. Der Bericht muss diese Differenz benennen, inklusive Datenlücken, Provider-Quoten und unklaren damaligen News-/Feed-Sichtungszeiten. Ein heute abgerufenes Oktober-OHLCV ist nachträglich; `RETRO_ASOF_RECONSTRUCTION` ist kein ehemaliger Originalcapture und autorisiert keinen echten historischen Paper-Fill.

## 3. Die Referenz und das neutrale Universum

Die Benutzerdatei führt **65 rückblickende Coin-/Pool-Meldungen** (46 vorläufig meme/meme-nahe; 19 unklare Token-Kategorie). Kein Beleg für 65 handelbare Gewinner oder eine vollständige 24h-Marktliste. Laut bestehender Projektanalyse sind lediglich **8/65 Poollinks** und **sechs rückblickend ausgewählte** Single-Source-Kerzentapes vorhanden. **57 ohne gesicherten Poollink und 59 ohne eingefrorene Tape-Reihe müssen explizit fehlend/mehrdeutig markiert werden.**

Für den Blindlauf ausschließlich ein vorher eingefrorenes, aus damals sichtbaren Quellen stammendes **neutrales** Universum verwenden: auch Verlierer, normale Pools, neue, alte und reaktivierte Pools, Nicht-Signale, nicht handelbare Kandidaten. Vollständige `chain+contract+pool(+pool_kind)`-Identität erforderlich; Symbol- oder Namenstreffer begründen **keinen** historischen BUY.

Die 65 Meldungen ausschließlich im **nachträglichen Vergleichsbestand** verwahren; in Blind-Eingaben, Kandidatensuche, Rankings, Vorbereitungs-Prompts und Future-Feature-Engineering verboten. Prozentangaben müssen samt eigenem Messfenster geprüft werden; sie sind keine belegbaren Entry-/Exit-Renditen.

## 4. Rollenauftrag: Jedes Beobachten, Entscheiden und Nicht-Handeln ist protokollpflichtig

### Dot 1 – Tempo
Zu jedem echten Review: Wann? Welche beobachtete Chain-/Pool-Neuaktivität, Volumenänderung, News, Datenlücken, Pending-API-Seiten, Provider-429, Positionsrisiken? Warum aktuell `4/8/12/24` Vollreviews pro Tag, gegebenenfalls schon **beim ersten** Review 24? Welche Alternative wurde verworfen, unter welcher Bedingung wird herabgeregelt? **Unabhängig** von GPT-Vollreviews jede tatsächliche Quelleingangs-/Positionsschutzprüfung mit eigenem Ereignistyp erfassen. Nicht vorhandene Daten bedeuten `COVERAGE_ALARM`, **nicht** „ruhiger Markt“.

### Dot 2 – Discovery
Pro abgefragtem Chain+Endpoint+Page, OHLCV-, Launch-, älterem/trendendem Pool: echter API-Requeststart/HTTP-Status, Retry-After, Source-Datei, Byte-SHA, Source-URL, Paging-Fenster und Dedupe; alle akzeptierten, verworfenen, unauflösbaren, nicht nachgeprüften und zurückgestellten Kandidaten dokumentieren. Exakter Contract/Pool und erstes tatsächlich historisch verfügbares Auftreten; Namensambiguität als `DATA_GAP`. Warum Kandidat priorisiert, Hot/Fair/Repair-Recheck angeordnet oder ausgelassen? Offset-Verschiebung und nicht beobachtete Seiten sind Abdeckungsdefizite, **keine** negativen Coin-Ergebnisse.

### Dot 3 – Risiko
Pro übergebenem exaktem Pool: Quellenidentitäten, event/provider/capture/available UTC, Preisabstand, Liquidität, geschätzte Slippage/Fees, Buy-/Sell-Route, Steuern, Blacklist, Honeypot, mutable Contract/Rechte; `ELIGIBLE/WATCH/REJECTED/DATA_GAP` mit konkret prüfbaren Regelgrenzen, fehlenden Belegen und nächster Prüfmöglichkeit. Ein signierter Issuer-Claim authentifiziert **nicht** automatisch die Providerquote oder echte Chain-Verkaufbarkeit. Bei unbekannter Verkaufbarkeit **kein** `ELIGIBLE`.

### Dot 4 – Strategie
Für jeden qualifizierten oder beobachteten Kandidaten **mit vollem Poolschlüssel**: WATCH/BUY/HOLD/SELL/NO_TRADE plus Erklärung, Alternative, Risiko, 1/3/6h-Forecast soweit belegbar, erwarteter Einfluss von 50 TEST-USDC, Liquiditäts-/Diversifikations- und Positionsregeln. Bei BUY Zeitpunkt der Entscheidungsfindung und getrennt der **nächste danach belegte ausführbare Quote**, Gebühren, Spread, Impact, LOT-ID. Bei SELL Stop/Take-Profit-Schwelle, tatsächlicher Anlass und einmalige LOT-Schließung. Fehlende Sicherheitsbelege als `NO_TRADE_DATA_GAP`; laufender Positionsschutz zwischen Vollreviews muss durch echte damalige Beobachtungen belegt werden. Niemals Kurs-Peak aus der Zukunft als Ausführungspreis wählen.

### Dot 5 – Kontrolle
Alle Quell- und Kausalbelege der anderen Dots nach dem gleichen `as_of` prüfen: zeitlich/fachlich korrekte Entscheidung, unsichere oder übersprungene Pools, Latenzen, API-Fehler, falsche oder fehlende identische Lot-/Order-/Client-Receipt-Paare, widersprüchliche Strategien. Erst den **frühesten** Fehler in der Pipeline identifizieren; keine Gewinn-/Verlustzahlen aus ungeprüften hypothetischen Fills. In einem strukturierten Verbesserungsregister Ursachen, zugehörige exakte Datei, nachprüfbaren Fix und Regressionstest festhalten. `PASS` nur nach echtem Abnahmebeleg.

## 5. Pflichtschema aller fünf Rollen (einheitlicher Audit-Kanal)

Neue **read-only, rein deterministische** Validierung: `src/v19-five-dot-forensic-trace.mjs`.

Jede Beobachtung/jedes Review/jede Entscheidung hat:
- `event_id`, `run_id`, `role`, `phase`, `at_utc` (VIRTUELLE Zeit), `activity`, `action`.
- `scope` (GLOBAL, CHAIN_PAGE, POOL oder POSITION), bei POOL/POSITION eine volle Market-Identität einschließlich Chain+Contract+Pool und optional Pooltyp; bei CHAIN_PAGE Chain+Page.
- `what_was_done` und `why_this_action` als **konkrete Freitextbegründungen**, `alternatives_considered`, `linked_event_ids` (Kausalkette), `missing_evidence`.
- `input_refs`: Quelle, `source_class`, gespeicherter Rohpfad und SHA, `event_at_utc`, `captured_at_utc`, `available_at_utc`. Originaldaten nach der virtuellen Uhr dürfen nicht als live verfügbar angenommen werden; spätere Rekonstruktionen sind research-only.
- `execution_origin` trennt **DETERMINISTIC_MODEL**, **GPT_SELF_REPORTED**, **PROVIDER_HTTP**, **MANUAL_RESEARCH**. Ein behaupteter GPT-Review ist bis zur getrennten Authentifizierung **kein** real verifizierter GPT-Review; Modellereignisse dürfen weder tatsächliche Dot-Ausführung noch Paper-Receipt behaupten.

Bei echten künftig ausgeführten GPT-Reviews müssen zusätzlich **reale** Ausführungszeit, automatisierte Run-/Konversationsreferenz, Snapshot-ID und Original-Git-Commit/Blob als externe Quittung gespeichert werden. Diese Werte dürfen nicht als rückwirkend im Oktober wirklich ausgeführter GPT-Job umbenannt werden. Ein reiner JSON-Claim, ein SHA-String oder eine signierte Selbstbehauptung ist kein unabhängiger Herkunftsnachweis.

**Schreibort (künftige tatsächliche Läufe, keine Backtest-Auslösung):** `research/audits/dot-traces/YYYY-MM-DD/<run-id>/<role>.json` oder ein bestehender append-only Research-Journal-Pfad. Nie `signals/orders`, `signals/index.json`, lokales Windows-Paperkonto oder `main` verändern. GitHub-Dot-Automationen müssen unverändert RESEARCH_ONLY bleiben.

## 6. Forensischer Bericht – verbindliches Ausgabeformat

**A. Executive Audit:** Testfenster, Vorbereitungswissen, zurückgehaltene Gewinnerliste/Oracle, Quellenreife und -ehrlichkeit, Testkonfiguration, echte vs simulierte GPT-Reviews, echte vs simulierte Fills; Gesamtstatus **PASS / PARTIAL / OPEN / BLOCKED** mit Beleglinks.

**B. 29-Stunden-Zeitachse:** fünf Warmup-Stunden und 24 Teststunden ab **00:00 UTC**; je Stunde für Dot1–5 die tatsächlichen Ereignisse, API-Aufrufe, Abdeckungsgrad und Lücken, News-Ein-/Ausgabezeiten, Review-Kadenz, Ursache von Änderungen, offene Positionen, Schutzprüfungen und nächste Aufgaben. **Leere Stunden sichtbar** statt erfundener Dot-Erfolgszahlen.

**C. Pool-Lebenslauf:** Jede *tatsächlich im neutralen Universum beobachtete* Chain+Contract+Pool-ID hat eine Folge aller Ereignisse: wo und warum Dot2 sie fand, warum Dot3 sperrte/freigab, warum Dot4 WATCH/BUY/HOLD/SELL/NO_TRADE wählte, welche Daten Dot5 bestätigte oder zurückwies. Alle Source-URLs/Blob-SHA, News-Veröffentlichungszeiten, Preis-/Liquiditäts- und Ausführungsdetails verlinken. Offen: fehlende Identität, fehlende Quellen, fehlende Verkäuflichkeit.

**D. Alle 65 Referenzmeldungen nach Blind-Ende:** Originalname/-Chain/-Pool falls belegt, tatsächlich zu dem Zeitpunkt existiert?, erster belegter historisch verfügbarer Zeitstempel, schon entdeckt?, Risk-Status?, angestoßene und ausgeführte Paper-Trades?, Verpasster Ausbruch und erste eindeutig rekonstruierbare Fehlerstufe? **UNKNOWN statt 0** bei fehlenden Quellen. Mehrdeutige Pool-/Token-Duplikate nicht als eindeutige Gewinne zählen.

**E. Negative Grundgesamtheit:** Auch nicht gewinnende, falsch positiv erkannte oder ausgeschlossene Pools, Non-Trade/No-Data-Gaps und Fehlversuche; Precision/Recall/FPR nur mit neutral eingefrorenem überprüfbarem Zähler/Nenner.

**F. Drei getrennte Finanzschichten:** Oracle-Ideal (nicht ausführbar), rückblickende Modell-Simulation (mit echten zeitgerechten Kostenregeln), tatsächlich separat bestätigtes lokales PAPER (falls vorhanden). Start 5.000 TEST-USDC, 50 TEST-USDC/Coin, Endcash, offene Lots, Fill-Kette, Netto-PnL, Drawdown, Slippage und Gebühren **je Schicht getrennt**; keine Übertragung erfundener Gewinne.

**G. Fehler- und Umbau-Backlog:** Pro Defekt präzise `role`, `phase`, `chain+contract+pool`, `event_id`, `source_refs`, erster Fehlerpunkt, Schwere, Verantwortlicher (Dot vs Datenquelle vs GitHub vs Windows), nachweisbare Ursache, minimale Reparatur, betroffene exakte GitHub-Dateien, Test/Abnahmekriterium, Vorher-/Nachher-Metrik und Status. Reparaturen niemals an der bekannten Oktober-Gewinnerliste optimieren; neues Blind-Holdout erforderlich.

**H. 100%-Abnahmebeurteilung:** Jeder der 61 ursprünglichen Punkte mit expliziter Relevanz, Testbeleg und verbleibendem Hindernis. Vor QA-04: 60/60 Nicht-Backtest-Kriterien nachgewiesen plus echte unabhängige Quellen-/GPT-/Windows-Provenienz. Ein Code-Test-PASS ist nicht gleich Gesamtsystem-PASS. Keine kosmetische Änderung der Originalzahlen.

## 7. Noch nicht automatisch erfüllte Umsetzung

Das neue Modul validiert die **Form und Kausalität vorgelegter** Protokolle und erzeugt 29h-/Pool-/Rollen-Diagnostik. Es **erzeugt keine echten Dot-Protokolle**, kann keine alten Oktober-GPT-Reviews nachträglich erschaffen und ruft keine APIs oder Windows-Dateien ab. Vor einem akzeptierten Backtest müssen die **fünf realen GPT-Dot-Ausgaben in dieser Struktur authentifiziert**, Datensätze und News-/Quotezeit gereift, neutraler Kandidatennennner geprüft und eine isolierte Paper-Fill-Kette nachgewiesen werden.

**Freigabestufe:** Vorbereitung, Journal-Architektur und Tests ausdrücklich autorisiert; der eigentliche historische 29h-Backtest bleibt bis separatem GO gesperrt.
