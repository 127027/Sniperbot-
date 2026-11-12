# R09 – Wiederholung des Zwei-Monats-Tests mit **zwei getrennten Prüfmaßstäben**

Stand: 12.11.2026. Fenster: 10.09.2024–09.11.2024 (61 UTC-Tage). Fünf Forschungsrollen, keine Trading-Engine.

## Warum R07 gescheitert ist
Alle fünf R07-Ergebnisdateien sind BLOCKED, aber **alle null historisch verifizierte Ereignisse**. Das ist INPUT-DATA-FAILURE, noch kein auswertbarer Fehlversuch der KI-Früherkennung. R07 hatte 0/61 echte Social-/News-Einträge und 61 Wiederholungen von UNAVAILABLE_ASOF für die Onchain-Rolle. Die Aufgaben vermischten Entdeckung, Identitätsprüfung und Trading-Freigabe.

## Zwei Wertungsklassen – nicht vermischen

**A: STRIKT HISTORISCH VERIFIZIERBAR:** Ursprüngliche Quellbytes nachweisbar vor Tag D archiviert, oder unabhängige unveränderliche, echte Chain-Transaktion+Block/Slot mit damals rekonstruierter Pool-/Token-Identität. Nur diese dürfen eine echte historische Entdeckungszeit stützen; für BUY_ADVISORY sind zusätzliche Sicherheits- und damalige größenabhängige Kaufen/Verkaufen-Quotes nötig.

**B: DATIERTER ORIGINALPLATTFORM-HINWEIS (PROVISORISCH):** Originale Reddit-/Social-Posts tragen sichtbare Datumsstempel aus 2024; Inhalt ist heute abrufbar, aber kein verifizierter unveränderter 2024-Quelltext. Sie dürfen für einen **reinen Erkennungstest der Recherche/Extraktion** genutzt werden (Meme-Namen erkennen, Tokenadresse finden, Social-Behauptungen als Werbung einstufen). KEIN bestätigter Früh-Treffer, keine damals nachweisbare Kaufbarkeit und keine rückwirkenden Kursgewinne daraus ableiten.

**C: RÜCKBLICKSQUELLE (NICHT DATENINPUT):** Heute erstellte Rangliste, spätere ATH-Meldung, nachträglich bearbeitete Artikel ohne historische Version, Gewinner-Datei. Diese Quellen sind ausschließlich für spätere Auswertung; als Tages-D-Eingabe verboten.

## Zwei R09-Aufgaben pro Rolle

(1) **Extraktionstest auf derselben neutralen Quell-Stichprobe:** Lies `research/historical/R09/source_corpus.json`. Sie ist absichtlich klein, nicht repräsentativ, wurde 2026 zusammengestellt, enthält auch werbliche bereits etablierte und scheiternde Coins; keine Gewinner-/Zielmarkierung. Lies nur Tag für Tag, keine Quelle vor ihrem Tag. Erfasse NAMEN/SYMBOL als `PROVISIONAL_NARRATIVE_OR_TOKEN_MENTION`, vorhandene Mint-Adresse separat `PROVISIONAL_MINT`. Kein Pool ohne unabhängig prüfbaren Beleg. Je Kandidat: erster Hinweis-Tag, Originalquelle, Risikovorbehalt. Jedes echte Event und jeden unbekannten Coin getrennt.

(2) **Autonome Internetrecherche:** Führe eigene breite nicht-zielgerichtete Suche im selben 61-Tage-Fenster durch; finde zusätzliche ursprüngliche Publikationen und überprüfbare Blockchain-Events mit nachvollziehbaren historischen Zeitpunkten. Dokumentiere alle überprüften Sucharten, Hits, Quelle und Ablehnungsgrund. Keine Rückblicksgewinner als Input. Fehlende Credentials/Providerlimits ausdrücklich dokumentieren. Pro identifiziertem Coin mindestens ein weiteres Gegenbeispiel aus demselben Testfenster suchen.

## Rollen
- Meme Scout: öffentliche virale Events ohne Coin, dann Erstfund von Namen und Mint getrennt, inklusive Klon-Vorsicht
- Social Research: ursprüngliche Autoren, früheste Posts, organisch vs bezahlte/Community-Shill-Aktivität
- Onchain: zuerst vorhandene Mint/Pool-Events (immutable TX/slot); anhand tatsächlicher 2024-Historie, keine aktuellen Pools als Vergangenheit, Quote/Pool optional nur mit 2024-Nachweis
- Security: keine Fake-Sicherheit aus heutigen Berechtigungen, Sellability unbekannt ist nicht Buy
- QA: unabhängige Bewertung der beiden getrennten Klassen; vollständige 61-Tage-Abdeckung nicht ohne echte Tagesquellen behaupten; keine kalibrierten Wahrscheinlichkeiten ohne Holdout

## Rollen-Output
Jede Rolle schreibt bei Zugriff **nur** ihre Datei `research/historical/R09/<role>.json` auf dem isolierten R09-Branch. Status `COMPLETED` wenn echter Bericht geliefert, `BLOCKED` mit konkreten Abdeckungsproblemen, niemals 61 fiktive Tagesauswertungen.
Pflicht: `test_window`, `role`, `source_corpus_items_checked`, `provisional_first_discovers`, `strictly_verified_first_discovers`, `independent_searches`, `qualified_historical_buy_advisories`, `data_gaps`, `summary`, Papiermodus- und Non-Action-Flags.
Der Test enthält **keine** Echtgeld- oder Paper-Orders und greift nicht auf die LIVE-Watchlist, normale Forschungsrollen oder Trading Engine zu. Im nächsten regulären Lauf nur noch normale aktuelle Forschung, sobald R09-Status nicht PENDING.

## Quellen/Provider-Hinweise (nicht als Test-Input!)
Originale datierte Plattformbeiträge stehen in der neutralen Quellenliste. Bitquery dokumentiert ein Solana-`DEXTradeByTokens`-Archiv ab Juni 2024, archivierte Single Trades sind möglicherweise erst teilweise nachgetragen. Endpoint/Datenberechtigung und tatsächlicher Sep-Nov-2024-Zugang sind **nicht** bestätigt: https://docs.bitquery.io/docs/graphql/data-coverage-retention/ und https://docs.bitquery.io/docs/blockchain/Solana/solana-dextrades/ . Ein heute veröffentlichtes 2024-Winner-Ranking ist kein damaliger Input. Bei API-Fehler: COVERAGE_GAP und Quelle dokumentieren, keine historischen 61 Tage erfinden.

## Messung
R07: 0 verified original captures, 0 admissible candidates, 0 Kauf-Advisories; statistisch NICHT TESTBAR.
R09: jetzt zusätzlich PROVISORISCHE *Kandidatenerkennung* messen, strikt historische Kauf-Eignung separat. Nur wenn die fünf Rollen echte eigene Berichte abgeben, dürfen ihre Funde als Arbeit der Dots bezeichnet werden. Ein deterministischer Code-Test beweist nicht die Erfolgsquote der Dots.
