# V0.7 – Historischer 5-Fälle-Blindreplay (2013–2026)

**Untersuchung:** 10. November 2026 | **Branch:** `codex/research-gateway-v04` | **Nur Paper, keine echten DEX-Trades**

**Der entscheidende Befund:** Es wäre methodisch unzulässig, zu behaupten, dass der heutige Sniperbot die fünf berühmten Gewinner damals rechtzeitig gekauft oder gewinnbringend verkauft hätte. Für die historische Simulation fehlen die vollständigen original archivierten `as-of`-Quellen, exakten damaligen Token/Pool-/Quote-Reihen und gescheiterten Vergleichslaunches. Die sichere V0.7-Teststrecke entdeckt **keine** dieser fünf Chancen *nachweisbar früh* und führt **keine** erfundenen Paper-Käufe oder -Verkäufe aus.

## Wirklich ausgeführter Ablauf

`node runner/historical-blind-five.mjs` lädt **fünf vorab festgelegte öffentliche Fallbeschreibungen** aus `runner/fixtures/historical-public-five-cases-20261110.json` und simuliert **pro Fall 45 aufeinanderfolgende UTC-Tage** (30 Tage vor und 14 Tage nach dem Start-/Auslöserdatum), insgesamt **225 virtuelle Tage**.

Es gibt eine bewusst versiegelte `ground_truth_reserved_for_scoring`-Hülle je Fall, die der Erkennungsfunktion `runDailyBlindReplay` **nicht** übergeben wird. Der Detektor kennt keine spätere ATH, keinen Gewinnernamen, kein Trefferlabel und keine spätere Ausbruchzeit. `scoreSealedReplay` erhält die Hülle erst, nachdem alle Tage abgelaufen sind. Das ist **ein softwaretechnischer Blindheits- und Zeitgate-Test**, aber **kein unvoreingenommener Gewinner/Verlierer-Backtest**, denn die fünf historischen Gewinner wurden selbstverständlich rückblickend ausgesucht.

Der historische „Web-Stand“ ist nur dann als Eingang zulässig, wenn die damalige **erste beobachtete Fassung** der Nachricht (z. B. nachweisbarer Wayback-Capture samt UTC-Zeit und Original-URL), der damals bekannte **exakte Pool-Contract**, damalige **ein-/ausführbare Preis-/Liquiditätsquotes** und unabhängige Sicherheitsinformationen vorliegen. Ein Original-Veröffentlichungsdatum allein ist **kein** Beweis für die nachträglich vorliegende Textfassung, spätere Kursberichte sind tabu. Lediglich behauptete Veröffentlichungsdaten werden separat als **RETROSPEKTIVE DIAGNOSE – NICHT AN DEN DETEKTOR VERFÜTTERT** gespeichert.

### Vergleichsergebnis aller fünf Fälle

| Anonymer Test | Öffentliche Nachprüfung / damals relevante Phase | Frühzeitig erkennbar und handelbar nachgewiesen? | Hauptursache |
|---|---|---|---|
| R01 | **Dogecoin, 2013**. Gründer starteten am **6.12.2013**. Chronik auf offizieller Dogecoin-Seite berichtet dies erst rückblickend. | **NICHT TESTBAR** | Ursprüngliche Dogecoin-PoW-Blockchain **nicht** unter den vier heutigen DEX-Chains; keine aus 2013 archivierten 30+14 Tage Original-Markt-/Communitydaten. Späterer Elon-Musk-Hype 2021 ist ein anderes Ereignis |
| R02 | **PEPE, 2023**. Erste hier gefundene datierte Presse vom **18.4.2023** berichtet bereits **über 266×** innerhalb von rund vier Tagen. Poloniex kündigte PEPE-Listing am selben Tag mit Ethereum-Tokenadresse `0x6982508145454ce325ddbe47a25d4ec3d2311933` an | **NICHT TESTBAR** | Bereits nach großer früher Bewegung; keine im damaligen Zeitfenster unabhängig archivierten Pool- und realistischen Buy/Sell-Quotes; heutige Presse- oder ATH-Seite kann keinen früheren Einstieg begründen |
| R03 | **PNUT, 2024**. Am **3.11.2024** wurde bereits von Solana-Peanut-Coins mit dreistelliger Millionen-Marktkapitalisierung berichtet. Bitget nannte den eindeutigen PNUT-Contract erst in der **7.11.2024** hier belegten Börsenankündigung | **NICHT TESTBAR** | Nachrichtenthema allein identifiziert nicht zuverlässig *den* korrekten PNUT-Pool vor dem ersten Sprung; historische tatsächlich ausführbare Quote und Sicherheitsprüfung fehlen |
| R04 | **Official Trump, 2025**. Originaler Trump-Post am **17.1.2025, 18:00 PST = 18.1.2025, 02:00 UTC**, im UCSB-Presidential-Archive dokumentiert. Das ist ein möglicher Erkennungsanlass, **nicht** ein nachgewiesener profitabler Entry | **NICHT TESTBAR** | Echte originalzeitlich archivierte Nachrichten-/Pool-/Sicherheits-/Sellquote-Timestamps fehlen; mehrere gleichnamige Fake-Tokens möglich. Heutige Kontraktseite nicht als damalige Vorab-Information einschleusen |
| R05 | **Nietzschean Penguin, 2026**. KuCoin-Tokenlisting trägt **23.1.2026, 18:48:02** (Anzeige ohne eindeutig geklärte Zeitzone). Der White-House-X-Post hat die Status-ID `2014819683757678654`, deren X-Snowflake-Zeit **23.1.2026, 21:57:00.804 UTC** ergibt. Cointelegraph meldete den **564-%-Sprung erst am 24.1.2026** | **NICHT TESTBAR** | Eine früh datierte Tokenlistung und der spätere virale Original-Post sind eine vielversprechende **Forschungssequenz**, aber ohne nachgewiesenes intraday-as-of-Poolmatching, damalige Käufer-/Exit-Quotes und überprüfte Sicherheitsbefunde ist weder ein profitabler 50/5.000-Testkauf noch eine Vorabprognose ableitbar |

**Öffentliche Quellen, nicht aus der privaten Excel hochgeladen:**

- Dogecoin – https://dogecoin.com/dogepedia/articles/history-of-dogecoin/
- PEPE, datierter Artikel vom 18.4.2023 – https://www.theblock.co/news/markets/2023-04-18-pepe-memecoin-rally-226817
- PEPE, Börsenankündigung vom 18.4.2023 – https://www.poloniex.com/announcement/13954528390423
- PNUT, datierte Meldung vom 3.11.2024 – https://cointelegraph.com/news/viral-squirrel-peanut-triggers-solana-memecoin-frenzy
- PNUT, Börsenankündigung – https://www.bitget.com/support/articles/12560603817829
- Official Trump, originale Posts – https://www.presidency.ucsb.edu/documents/truth-social-posts-january-17-2025
- White-House-X-Pinguin – https://x.com/WhiteHouse/status/2014819683757678654
- PENGUIN, KuCoin – https://www.kucoin.com/announcement/in-kucoin-alpha-has-listed-token-nietzschean-penguin-penguin
- PENGUIN, erst nach dem Event erschienener Bericht – https://cointelegraph.com/news/penguin-memecoin-surge-564-white-house

Hinweis zum X-Zeitstempel: Die X-Snowflake-ID verschlüsselt bei Original-Posts den Server-Erstellungszeitpunkt. **Dieser Zeitstempel authentifiziert nicht unabhängig den heutigen Text/Bildinhalt des Posts**; dafür wären damalige Plattform-/Archivbelege nötig. Der angezeigte KuCoin-Zeitwert wurde **nicht** stillschweigend als UTC interpretiert. Keine definitive Reihung von Listing und White-House-Beitrag ohne Klärung der Zeitzone.

## Maschinenlesbarer Replay-Nachweis

`runner/historical-blind-replay.mjs`, `runner/historical-blind-five.mjs` und ihre Tests speichern im CI-Artefakt **alle 225 Tagesstände**. Das Artefakt enthält pro Tag die Anzahl behauptet bereits veröffentlichter Dokumente (**nicht als as-of-Beweise verwendbar**), tatsächlich vor Tagesende unabhängig archivierter Meldungen, damals prüfbar identifizierter Chain+Token+Pool-Paare und die Anzahl freigegebener Paper-Käufe/-Verkäufe.

| Gemessen | Stand |
|---|---|
| Vorausgewählte historische Fälle | 5 (bewusst Gewinnerauswahl; **keine** repräsentative Vollkohorte) |
| Simulierte UTC-Tage | 225 = 5 × 45 |
| Historisch **nachgewiesene** Quellfassungen mit Capture vor virtuellem Tag | **0** in der begrenzten öffentlichen Stichprobe |
| Nachweisbar rechtzeitig identifizierte und sicher verkaufbare Coins | **0 bestätigt**, **nicht gleich 0 tatsächlich möglich** |
| Authentifizierte historische 5-Dot-Kauf-Freigaben | **0** |
| Nachgewiesene historische simulierte Kauf-Fills | **0** |
| Nachgewiesene historische simulierte Exit-Fills | **0** |
| Beweis einer 85-/95-%-Wahrscheinlichkeit oder einer profitablen Strategie | **NEIN** |
| Reproduzierbarkeit | `node --test runner/historical-blind-replay.test.mjs`, `node runner/historical-blind-five.mjs --json`, GitHub Actions mit archiviertem JSON |

**Methoden-Hinweis:** Der historische Prüfmechanismus ist aktuell eine **abgesicherte, pure Replay-Testumgebung**, **nicht** die früheren ChatGPT-Dots auf virtuellen Computern in 2013–2026. Die heutigen Dots haben keine damals entstandenen Verlaufs-/Original-Snapshots. Die produktive lokale Paper-Engine blockiert echte extern signierte BUY/SELL weiterhin mit `BLOCKED_REAL_VALIDATOR_UNAVAILABLE`. Deren Sperre zu umgehen, nur um im Replay schöne Ergebnisse zu erzeugen, wäre ein schwerer Testfehler.

## Fehlursachen und bereits vorgenommene technische Gegenmaßnahmen

1. **Nachrichten erst nach dem Pump:** Live keine verspätete „+266×“-Meldung als Frühwarn-Signal behandeln. V0.5/V0.6 verarbeiten bereits Neupool-, Momentum-, Token-Profile-/Boost-Daten; V0.7 ergänzt unabhängige News-RSS (Decrypt, BeInCrypto, Cointelegraph) als separate **nicht handelbare** Recherche-Quelle.
2. **Zeitliche Leckage:** `historical-blind-replay.mjs` sperrt nachträglich besorgte Newsseiten selbst dann, wenn eine originale Publikationszeit auf der Seite angezeigt wird, aber kein nachweisbarer Original-Capture aus der Vergangenheit vorliegt. Der Time-Warp-Test führt alle Tage in aufsteigender UTC-Reihenfolge aus.
3. **Nur Charts verfehlen virale Themen:** `runner/research-news-rss.mjs` liest im laufenden Windows-Forschungscollector drei öffentliche RSS-Quellen. `runner/research-news-journal.mjs` archiviert das erste **tatsächliche lokale Beobachtungsdatum** getrennt vom durch Publisher behaupteten Publikationsdatum. Maximal 15-Minuten-Fetchfrequenz; keine willkürliche Rückdatierung. Rolling-60-Minuten-Nachrichten erscheinen als `news_leads[]`/ `news_coverage[]` im GitHub-Marktfeed und können von **allen fünf** stündlichen Dots geprüft werden.
4. **Namen ≠ eindeutig handelbarer Token:** News-RSS-Ereignisse enthalten absichtlich **keine** automatisch erfundene Chain, Mint- oder Pooladresse. Contract, Pool und Sicherheitsfreigabe müssen unabhängig dazukommen. Bei fehlender Verkaufsroute bleibt ein Buy blockiert.
5. **Ungültige Erfolgsquote durch Gewinner-Auswahl:** Für einen echten Backtest braucht das System **alle** im jeweiligen Zeitraum erreichbaren Meme-Launches und Fehlstarts aus denselben Datenprovidern, faire Ein-/Ausstiegsquoten und unabhängige Holdout-Auswertung. Fünf berühmte Gewinner allein erlauben keine Trefferquote.

## Was als nächster echter Leistungsnachweis erforderlich ist

- Historische GitHub-/Wayback-/CommonCrawl-Zeitkapseln oder echte damals unveränderbar archivierte Quelle+Inhaltsdaten für alle fünf Fälle, nicht erst 2026 rekonstruierte Artikel.
- Historische **vollständige** Token-/Pool-Coins inklusive gescheiterter Starts (inklusive Dogecoin-2013-spezifischer Chain-Adapter, falls das als Zielmarkt weiter verfolgt werden soll).
- Sekundengenaue Erstpool-/Market-Snapshot-Kohorten, ausführbare Größe- und Route-spezifische Buy/Sell-Quotes mit damaliger Pooltiefe, Slippage und Gebühren sowie Contract-/Sicherheits-Originalstände.
- Auswertung **absolut derselben** im jeweiligen Zeitfenster bekannten Originaldaten, nicht heutigen Rankings. Anreize, derartige Datenströme für zukünftige Kandidaten proaktiv zu archivieren, sind mit V0.7 nun im Collector eingebaut.

**Fazit:** Ein korrektes Resultat ist bei den fünf berühmten Fällen derzeit **„historische Vorhersage und Ausführung nicht beweisbar“**, nicht „5/5 Gewinner gefunden“. Die Tests beweisen, dass der neue Replay-Prozess *keine Informationen aus der Zukunft verwendet*. Sie beweisen noch **keine** profitable Strategie.
