# R29 V0.7: Lernkreislauf und Ursachenbelege

## Trennung der Ergebnisse
Die Tage 12. Oktober und 15. November sind TRAINING, keine unabhängigen Blindtests.
- Aktuell erfasste LIVE-JSON-Pools sind weder historische Pool-Entdeckungen noch verifizierte Trades.
- Rekonstruierte alte OHLCV-Kerzen sind keine originalen damaligen Agenten-Snapshots.
- BUY_EXPERIMENT und SELL_EXPERIMENT sind rechnerische Forschungsbuchungen, **keine** real über GitHub veröffentlichten Paper-Orders.
- PAPER_FILLED zählt ausschließlich, wenn ein tatsächlicher Client die veröffentlichte Order quittiert.

## Befund Dot 2: vollständige Token-Contracts sind grundsätzlich abrufbar
GitHub-Lauf 44921263461 hat aus einer kostenlosen GeckoTerminal-JSON-New-Pools-Seite für Solana 20 Pools mit 20 vollständigen Base-Token-Adressen zurückgegeben. Der bisherige HTML-Weg endete häufig bei abgekürzten Contracts (0 vollständig identifizierte Pools). Dieser Lauf deckt nur eine aktuelle Stichprobenseite ab. Er ist kein Vollmarkt-Scan.

Die decoder-Referenz ist src/live-pool-discovery.mjs:
1. Pool-Adresse ausschließlich aus data[].attributes.address übernehmen.
2. BaseToken ID aus relationships.base_token.data.id mit included[].id verknüpfen.
3. Nur included[].attributes.address als vollen Contract übernehmen, niemals den Pool selbst oder den Token-Namen.
4. Source-URL, Chain, Zeit, Page, Datenfehler und gesamte Warteschlange übergeben.
5. Zusätzliche Pages verfolgen, soweit verfügbar und rate-limit-konform; nicht still Top-N-Limits als volle Marktabdeckung behaupten.

## Befund Dot 3: eine unabhängige Quelle ist möglich, aber nicht garantiert
Die offizielle DEX-Screener-Pairroute lautet https://api.dexscreener.com/latest/dex/pairs/{chainId}/{pairId}.
Dabei muss exaktes Chain+PairAddress+BaseToken.address matchen. Ein Stichprobenlauf erkannte einen passenden Solana-Pool, jedoch ohne beide erforderlichen Preis-/Liquiditätsfelder. Das ist DATA_GAP, nicht NO_TRADE_DUE_TO_BAD_MARKET. Preis- und Liquiditätswerte müssen im selben tatsächlichen Lauf vorliegen; ein späterer Abruf ist kein früherer Kurs.

## Befund Quotenlimit
GeckoTerminal gab nach dem ersten erfolgreichen öffentlichen JSON-Aufruf HTTP_429 für die nächsten Netzwerke. Das ist eine Quellenabdeckungs-Lücke, kein ruhiger Markt und kein Beweis für 0 Coins. Script scripts/probe-live-discovery.mjs stoppt nach 429 weitere Anfragen, dokumentiert Deferred-Networks und rotiert Netzwerkprioritäten anhand der GitHub-Run-Nummer. Pro laufendem Dot-Turn verfügbare Pages, Providers, HTTP-429 und nicht untersuchte Netzwerke protokollieren. Die CI-Probe ist kein automatischer Vollmarkt-Live-Scanner.

## Befund Strategie: zu frühe Käufe können großen Schaden verursachen
Die nachträglich und ergebnisbehaftet ausgewählten Beispiele DOPE und BLG Champion wurden als 15.11.-Forschungspanel mit echten post-event fünfminütigen GeckoTerminal-Kerzen getestet.
Forschungs-Paper-Lab src/research-paper-lab.mjs führt 24 stündliche Analysen pro Tag durch. Alle genutzten Candles sind mindestens 60 Sekunden abgeschlossen, und ein Pool muss vor dem Dot2-Zeitpunkt :15 existiert haben. Kostenmodell je Seite: 75bp Gebühr + 40bp Spread + 50bp Impact; 50 TEST-USDC je hypothetischem Einstieg. Alle drei Varianten zeigen auch Verlustgeschäfte und verbleibende offene Positionen.

GitHub Run 44921572373, 82/82 Tests erfolgreich:
- exploratory: 7 BUY/6 SELL, realisiertes **hypothetisches** PnL −10,35 TEST-USDC, 1 offene Forschungposition;
- conservative: 4 BUY/3 SELL, **hypothetisches** PnL −19,24 TEST-USDC, 1 offene Forschungsposition;
- volatility_guard: 5 BUY/4 SELL, **hypothetisches** PnL +28,34 TEST-USDC, 1 offene Forschungsposition.

Die dritte Variante nimmt kein neues Experiment-BUY nach extremer, bereits beobachteter 2-Stunden-Close-Preisspanne (>2,5×) vor. Das ist eine nachvollziehbare Risikoheuristik, aber ihr positives Zweicoin-Ergebnis ist **nicht** Evidenz für Profitabilität außerhalb dieser Stichprobe. Keines dieser Ergebnisse ist eine verifizierte historische Rendite oder ein echter GitHub-Paper-Fill.

## Verbindliche Lernschritte für die fünf Dots
- Dot 1: Datenmangel / API 429 gilt als UNBEKANNTE Marktaktivität; 4/8/12/24 dynamisch nur auf echte Aktivitätszahlen stützen. Weiterhin stündlich Discovery und Exit-Kontrolle.
- Dot 2: JSON-first (wo tatsächlich abrufbar), echte vollständige Contracts, Pagination und unbegrenzte Pending-Queue; 6 Netzwerke; Suchbeginn auch im allerersten Scan. Nicht nur bekannte Gewinner.
- Dot 3: exakte unabhängige Paaridentität, zwei tatsächliche Preis-/Liquiditätsbelege, Sicherheits- und Sellability-Prüfung. Momentum allein ist NIE Eignungsbeleg.
- Dot 4: BUY im ersten vollständigen Review möglich, wenn echte Daten und Risk-Gates vorhanden; sonst begründetes WATCH/NO_TRADE. Stündlich bestätigte offene Positionen auf SELL/HOLD prüfen. Forschungs-Preismuster sind keine Befugnis, echte Paper-Orders zu veröffentlichen.
- Dot 5: Diagnosefunnel je Scan: Rohpools → vollständige Contracts → unabhängige Pair-Matches → Liquidität & Security → risk eligible → veröffentlichtes Signal → Client Receipt → Exit. Quellenfehler, unrealistische PnL-Modelle und Stichprobenbias ausweisen.

## Unbekannter nächster 24h-Test
Nach diesem Training Strategie festhalten und einen neuen unbeobachteten Tag mit tatsächlich archivierten Pool-/Candle-Universum inklusive Verlierern testen. Bekanntes Trainingsdatum 15.11. nicht erneut als unabhängig bewerten.
