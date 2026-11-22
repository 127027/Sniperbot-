# R29 BNBCAT: forensische Fallstudie für Live-Erkennung (12.10.2026)

**Forschungsstand 2026-11-22.** Cleanroom-Branch, ausschließlich Forschung/PAPER. Keine Orderfreigabe, keine Echtgeldaktivität. **Achtung: Das ist kein Beweis, dass R29 am 12.10. die Gewinner vorher kannte oder dass irgendein Kauf zu den gezeigten Preisen ausführbar war.**

## Identität und Quellenqualität

- **Ziel:** BNB Chain, Token-Contract `0xab85afcd4e0493f3700dc6df3ed291db6749d4bd`, PancakeSwap-V2-Pool `0x7cb3b9f0cb6a6af22e8b9c53e2153e2b2d311d7e` (BNBCAT/USDT). Pool-Start laut GeckoTerminal-Rekonstruktion **2026-10-12 07:29:54 UTC**. Weder Erstellung noch Tokenrechte wurden hier per unabhängiger archivierter Chain-RPC-Transaktion validiert.
- **NICHT derselbe Contract:** `0x3efbfff95576e1d23cf6ead0acd2e73f4d6a7777` = älterer Binance-Cat-Token, der schon **August 2026** sichtbar und beworben war. DXT Tools dokumentiert bezahlte DEX-Screener-Boosts August–September für **diesen anderen Contract**. Keine Boost- oder Coin-News der älteren Adresse dem Testtoken zurechnen: https://dxttools.trade/token/bsc/0x3EFBfFf95576e1d23cF6Ead0AcD2E73F4d6A7777 ; https://www.odaily.news/en/newsflash/511979
- **Meme/Narrativ:** Name Binance Cat/BNBCAT + BNB-Chain + Bezug auf einen **alten** CZ-X-Beitrag von **2023**. Dextape übernimmt einen Werbetext mit dieser Geschichte. Der alte Post ist **kein** neues CZ-Statement vom 12.10. und kein Beleg einer Billigung des neuen Contracts: https://dextape.com/launches/2026-10-12 ; die Werbeformulierung ist auch beim älteren Contract dokumentiert https://www.teapawt.org/CTOBNBCAT_x
- **Vorherige News (aber ohne Contract-Nachweis):** AiCoin erfasste am **06.10.2026 21:12** eine BNBCAT-Meldung; Contract fehlt, somit **nicht** dem neuen Token zuschreiben: https://www.aicoin.com/en/news-flash/3120090
- **Keine verifizierte spezifische neue Pressemitteilung oder CZ-Promotion vor 07:50 UTC** für diesen Contract gefunden. Das bedeutet **nicht**, dass keine sozialen Posts existierten; nur deren Zeitpunkt und Identität sind nicht ausreichend belegt.
- **Dextape 12.10.-Archiv:** meldet **+50.327 % rollierend 24h**, **$43,1 Mio. 24h-Volumen**, **$1,5 Mio. Liquidität** als zuletzt dokumentierte Werte des Tages. Der exakte Messzeitpunkt, der Basispreis für +50.327 %, die damals verfügbare Liquidität und ausführbare Quotes fehlen: https://dextape.com/launches/2026-10-12
- **Coinranking:** nennt den 12.10.2026 als ATH-Datum und **$93,77** (nicht dieselbe Quotenquelle): https://coinranking.com/coin/O5QcSsRFUcNk+bnbcat-bnbcat
- **Telegram-Trendwarnung:** Suchindex einer Drittanbieter-Archivseite enthält einen Eintrag `2026-10-12 17:52:27`, Contract exakt `...d4bd`, Preis `58.73489`, Poolwert `649869.14985 USDT`, angegebener Trend `54613.45%`. **Zeitzone und Archivzeit des Posts sind unbestätigt.** Falls chinesische Ortszeit (UTC+8), entspräche dies 09:52 UTC, als der rekonstruierte Preis tatsächlich zwischen ca. 51 und 70 USD lag. Nicht rückwirkend als frühe 07:29-Discovery werten. Quelle: https://telemetr.io/es/channels/1970419348-aveai_hot/posts (Suchindex-Snippet; Originalpost aktuell nicht unabhängig abrufbar)
- **Telegram-Projektkanal:** https://t.me/BNBCAT_BSC – gegenwärtiger Kanal und Mitgliederzahl beweisen **nicht** die Mitgliederzahl oder gepostete Inhalte vom 12.10.

## Was die rekonstruierte 5-Minuten-Kursreihe zeigt

Quelle im Repository: `research/training/2026-10-12/frozen-v11/oct12-candles-0.json`, Blob-SHA `9f33e1f0be037343182e4b36777d0931be8b8626`; 194 5-Minuten-Kerzen. **Ein Anbieter, nachträglich am 21./22.11. rekonstruiert. Kein originales Oktober-Dot-Capture.**

- Poolstart laut Quelle **07:29:54 UTC**, **erste verfügbare Kerze erst 07:50–07:55**. Damit fehlen die ersten rund **20 Minuten**, möglicherweise die für das frühe Erkennen wichtigsten Beobachtungen.
- **07:50–07:55:** Open **$0.124913**, Close **$0.564089**, Volumen **$63,357**. Der Open-Close-Anstieg allein beträgt **+351.6 %** in der ersten verfügbaren Kerze.
- **07:55–08:00:** Close **$18.687**, 5-Min.-Volumen **$6,595,705**, Change gegenüber vorherigem Close **+3212.8 %**. Sehr schnelle Preisexpansion, aber als BUY-Einstieg möglicherweise bereits extrem spät und riskant.
- **08:05–08:10:** Close **$43.701**, Tagesphase hoher Intrakerzen-Volatilität (High **$63,75** innerhalb der 08:05-Kerze).
- **08:35–08:40:** Close **$6.758**. Gegen das vorherige 08:05-Hoch $63,75 bereits **-89.4 %**; trotz starker Gewinne extrem tiefe Zwischenstürze.
- **12:15–12:20:** Rekonstruiertes **Close-Maximum $94.244**, Wick-Maximum **$95,397** in 12:15-Kerze. Coinranking nennt dagegen ATH $93,77. Werte widersprechen sich leicht; keine eigenständige on-chain Swap-Verifikation.
- **12:35–12:40:** Close **$30.590**, gegenüber 12:20 in nur 20 Minuten **-67.5 %**.
- **18:50–18:55:** Close **$0.503**, gegenüber 12:20-Top **-99.5 %**.
- **07:50–08:50 (ca. erste beobachtete Stunde):** summiertes rekonstru. Volumen **$31.30 Mio.** = **60.8 %** aller **$51.50 Mio.** in den verfügbaren 5-Minuten-Kerzen bis Tagesende. Nicht mit dem anders geschnittenen Dextape-24h-Volumen ($43,1 Mio.) ohne Perioden-/Methodenabgleich gleichsetzen.
- **Bestes retrospektives Close-to-Close-Oracle:** BUY zum $0.564089-Close um **07:55 UTC**, SELL zum $94.243920-Close um **12:20 UTC** = **+16607.3 %**, ausschließlich retrospektiv. Selbst diese beiden Kerzenschlusskurse sind **keine garantiert ausführbaren Trades**. Keine Liquidität, Wallet-, Slippage- oder Sellability-Proofs.
- **Warum Dextape +50.327 %?** Nur eine gemeldete rollierende Quote. Rechenprobe: +50.327 % auf den ersten bekannten Open $0.124913 ergäbe ca. $62.99, ähnlich dem 08:05-Hoch $63,75. **Das ist eine auffällige numerische Nähe, keine Beweiskette zur Quelle der Prozentangabe.**

### Stündlicher Überblick der rekonstruierten Kurse (UTC)

| Stunde UTC | Open USD | Letzter Close USD | Low USD | High USD | Summiertes Volumen USD |
|---|---:|---:|---:|---:|---:|
| 07:00–08:00 | 0.1249 | 18.6874 | 0.1249 | 26.2546 | 6,659,062 |
| 08:00–09:00 | 18.6874 | 44.1551 | 4.3466 | 63.7546 | 27,347,245 |
| 09:00–10:00 | 44.1551 | 62.2115 | 15.7595 | 70.6955 | 4,767,344 |
| 10:00–11:00 | 62.2115 | 85.2780 | 58.8414 | 88.6556 | 3,278,933 |
| 11:00–12:00 | 85.2780 | 65.8405 | 46.3571 | 86.3528 | 3,012,527 |
| 12:00–13:00 | 65.8405 | 31.0075 | 15.6464 | 95.3972 | 2,864,785 |
| 13:00–14:00 | 31.0075 | 23.5282 | 14.4239 | 59.8869 | 2,823,276 |
| 14:00–15:00 | 23.5282 | 5.1880 | 4.6898 | 24.9731 | 444,177 |
| 15:00–16:00 | 5.1880 | 8.1700 | 5.1880 | 8.1974 | 57,563 |
| 16:00–17:00 | 8.1700 | 1.9370 | 1.7972 | 9.4913 | 101,852 |
| 17:00–18:00 | 1.9370 | 2.6216 | 1.9370 | 2.6216 | 22,732 |
| 18:00–19:00 | 2.6216 | 0.5054 | 0.4885 | 2.8047 | 71,710 |
| 19:00–20:00 | 0.5054 | 0.6356 | 0.5038 | 0.6357 | 8,454 |
| 20:00–21:00 | 0.6356 | 0.7641 | 0.6356 | 0.7658 | 8,631 |
| 21:00–22:00 | 0.7641 | 0.9098 | 0.7641 | 0.9098 | 8,304 |
| 22:00–23:00 | 0.9098 | 1.0250 | 0.9021 | 1.0252 | 10,038 |
| 23:00–00:00 | 1.0250 | 1.2279 | 1.0250 | 1.2279 | 9,162 |

Die Stunde 07:00 enthält nur zwei 5-Minuten-Kerzen, die übrigen beginnen je um hh:00. Es fehlen Daten VOR 07:50; auch die archivierten fünfminütigen Candle-Wicks sind keine ausführbaren Kursquotes.

## Erklärungshypothesen – strikt getrennt von Beweisen

**Nachweisbar (retrospektiv):** Neuer Pool am 12.10. laut Anbieterdaten; sehr schneller starker Kurs- und Handelsvolumenanstieg; extrem volatile Zwischenstürze; späterer Kurszusammenbruch. Drittanbieter meldet +50.327 % und unabhängiger Preisaggregator ATH am selben Tag. **Kein eindeutiger Nachrichten-Katalysator nachgewiesen.**

**Plausibel, aber NICHT bewiesen:** Meme-/CZ-/Binance-Narrativ könnte Aufmerksamkeit ausgelöst haben; Trending-Bots könnten Bewegung verstärkt haben; wenige große Konten, Wash-Trading, illiquide Kurse oder Contract-Risiken könnten zu den extremen Werten beigetragen haben. Ohne originalen Onchain-Swap-Tape, Holder-Flows, Pool-Reserve-Snapshots und Contractprüfung sind dies nur Hypothesen. Die Berichte über den älteren `0x3ef...7777` gehören nicht als Momentum oder News zum Zieltoken `0xab85...d4bd`.

## Was R29 vor dem Anstieg hätte wissen *können* – und was nicht

| Zeitpunkt UTC (MESZ + 2h) | Retrospektiv verfügbarer Datenstand | Signalkategorie | Zulässige Schlussfolgerung |
|---|---|---|---|
| Vor 07:29:54 | Nur allgemeine Katzen-/BNB-Meme-Stimmung, älterer BNBCAT-Name mit anderem Contract | NARRATIVE_CONTEXT_ONLY | Kein Beleg für den neuen Contract; kein BUY |
| 07:29:54 | Pool-Create-Zeit laut Anbieter | NEW_PAIR_POTENTIAL | Event-basierte Discovery hätte einen neuen Pool *finden können*; tatsächliche damalige Dot-Entdeckung unbelegt |
| 07:29–07:50 | Keine verfügbaren Kerzen im Frozen-Tape | CRITICAL_EARLY_DATA_GAP | Kein Kaufkurs, kein Momentum, keine Liquidität erfinden |
| 07:55 | Erste rekonstruierte Kerze, starkes Momentum, $63k Volumen | EARLY_OBSERVED_MOMENTUM | WATCH/Risk-Recheck; Preis bereits mehrfache Anfangsöffnung |
| 08:00 | +3.200 % gegenüber vorherigem 5-Min.-Close und $6,6 Mio. Volumen | EXTREME_VOLUME_AND_SLIPPAGE_RISK | Alarm, aber nicht blind hinterher kaufen; Daten-/Sellability-Prüfung Pflicht |
| 08:10 | Bereits riesiger 5-Min.-Anstieg und große Wicks | LATE_MOMENTUM | Mögliche überhitzte Phase, keine Renditegarantie |
| 08:40 | Nach stärksten frühen Spitzen bereits großer Drawdown | FLASH_CRASH | Technischer Exit-/Reentry-Schutz wichtiger als nächster GPT-Vollscan |
| 09:52 (nur falls Telegramzeit UTC+8) | Social-Trending-Hinweis samt Preis, nur indirekt via Suchindex | POSSIBLE_LATE_SOCIAL_CONFIRMATION | Kein bewiesenes Frühsignal; keine genaue Originalpost-Zeit bestätigt |
| 12:20 | Rekonstruiertes Tages-Close-Maximum | POST_EVENT_PEAK | Nur nachträgliches Oracle-Label, nicht als Prognoseeingabe |
| Nach 12:20 | Starke Verluste | EXIT_RISK_REALIZED | Positionsüberwachung zwischen GPT-Vollreviews zwingend nötig |

## Forschungsdaten für Dot-Training, strikt separiert

- `research/training/2026-10-12/bnbcat-asof-features.json`: 194 chronologische Feature-Zeilen, je Zeitpunkt NUR vergangene und gerade geschlossene Kerzen. Der Begriff „as-of“ bezeichnet das hypothetische Informationsfenster, **nicht** den damaligen Zeitpunkt einer nachgewiesenen Dot-Sichtung. Enthält keine zukünftigen Rendite-Labels. Quote/Sellability bewusst **UNKNOWN**.
- `research/training/2026-10-12/bnbcat-oracle-labels.json`: separat 194 nachträgliche Zielwert-Zeilen mit späterem Kurs-Hoch/-Tief innerhalb der nächsten 60 Minuten. **Niemals ins Live-Discovery-/Strategie-/Ordermodul importieren.**
- Beide Datensätze sind ausschließlich Single-Provider-Rekonstruktionen und erlauben keine Aussage über historische Profitabilität oder BUY-Sicherheit.

## Konkrete Forschungsfragen/Abnahmekriterien für die 5 Dots

1. **Dot 1 (Tempo):** Erkennt Metriken der Aufmerksamkeitsbeschleunigung nur bei genügend breiter Datenabdeckung; 4/8/12/24 GPT-Vollreviews sind keine kontinuierliche Markt-/Stop-Loss-Überwachung.
2. **Dot 2 (Discovery):** Registriert neue BNB-Pools sofort mit Chain+Contract+Pool+Quellenzeit, und unterscheidet `...d4bd` von `...7777` selbst bei gleichem Namen. Misst `first_pool_seen_delay_seconds`. In diesem Replay ist das frühe 07:29–07:50-Fenster **UNBELEGT**.
3. **Dot 3 (Risk):** Prüft onchain Transfer-/Sellability, Tokensteuer, Launch-/Mint-/Blacklist-/Ownerrechte, Liquidität, Reserveänderungen, Wash-Trading-Anzeichen, zwei unabhängige Poolquotes. Wenn nicht belegbar `DATA_GAP`, bei falschem Contract `REJECTED`. **Keine Sicherheitsfreigaben aus diesem Bericht erzeugen.**
4. **Dot 4 (Strategie):** Prognose 1h/3h/6h aus strikt bis T bekannten Features, Volatilitäts- und Drawdown-Warnungen vor BUY. Kein Future Label als Feature. Exits über separates häufiger laufendes System; tatsächliche Ausführung zum darauffolgenden belegbaren Quote mit Kosten, nie retroaktiver Candle-Close-Fill.
5. **Dot 5 (QA):** Berechnet Missed Opportunity unter Kennzeichnung, ob Entdeckung, Quote, Risiko, Entscheidung, Signal oder Client fehlte. Negative Kontrollgruppe mit alter BNBCAT-Adresse; unberührter prospektiver Holdout. Vergleich nicht nur PnL, sondern `coverage`, `false_positives`, `max_adverse_excursion`, `latency` und `quote_source_conflict`.

**Architekturkonsequenz:** Für Ausbrüche innerhalb von 5 Minuten reicht stündliches Dot-Aufwachen nicht. Benötigt wird ein kostengünstiger, technisch tatsächlich laufender kontinuierlicher Pool-/Swap-Collector (z. B. auf dem vorhandenen Windows-Bot) mit 1–5-Minuten-Aggregation und sofortigem Risiko-/Exit-Monitor. GPT kann 4–24 strategische Vollreviews pro Tag durchführen; ohne durchgängigen Datenfeed entsteht keine minutenschnelle Prognose. Kein Beleg, dass die bisherige Cleanroom-Architektur dies bereits vollständig leistet.

## Belegverzeichnis

1. Dextape Tages-Archiv: https://dextape.com/launches/2026-10-12 (rollierender 24h-Provider-Wert, retrospektiv)
2. DexScreener exakter Pool: https://dexscreener.com/bsc/0x7cb3b9f0cb6a6af22e8b9c53e2153e2b2d311d7e
3. GeckoTerminal exakter Pool: https://www.geckoterminal.com/bsc/pools/0x7cb3b9f0cb6a6af22e8b9c53e2153e2b2d311d7e
4. Coinranking Contract und ATH-Tag: https://coinranking.com/coin/O5QcSsRFUcNk+bnbcat-bnbcat
5. Dexonomics-Pooldatum und Contract: https://dexonomics.io/bsc/bnbcat/0x7cb3b9f0cb6a6af22e8b9c53e2153e2b2d311d7e
6. Älterer, anderer BNBCAT + DEX Promotions: https://dxttools.trade/token/bsc/0x3EFBfFf95576e1d23cF6Ead0AcD2E73F4d6A7777
7. AiCoin 06.10. erwähnt Namen, nicht Contract: https://www.aicoin.com/en/news-flash/3120090
8. Telegram-Trend-Suchsnippet, Zeitbasis unklar: https://telemetr.io/es/channels/1970419348-aveai_hot/posts
9. Altes CZ-Meme-Marketing bei anderem Contract: https://www.teapawt.org/CTOBNBCAT_x
10. Original-Rekonstruktion/Repo: https://github.com/127027/Sniperbot-/blob/codex/r29-cleanroom-paper-20261121/research/training/2026-10-12/frozen-v11/oct12-candles-0.json

**Negativ-Nachweis:** Ein fehlender exakter Social-Post, historische Liquiditäts-/Sellability-Quote oder onchain Originalswap kann nicht durch eine andere BNBCAT-Marke, eine Kursspitze oder nachträgliche Presse ersetzt werden.
