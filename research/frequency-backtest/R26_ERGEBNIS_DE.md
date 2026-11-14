# R26 · Memecoin-Frequenzvergleich, 15 Tage

**Status:** Kursbasierter, reproduzierbarer Backtest auf echten Binance-Spot-Stundenkerzen abgeschlossen. **Kein echter 15-Tage-Lauf der ChatGPT-News-KI und keine realen DEX-Trades.**

**Zeitraum:** 30.10.2026, 00:00 UTC, bis 14.11.2026, 00:00 UTC (exklusiv). **Start je Variante:** 5.000 virtuelle Recheneinheiten. Historische Notierung: USDT; vereinfachte 1:1-Betrachtung als virtuelle USDC-Einheit. Höchstens 5.000 Einstandskapital gleichzeitig im Markt.

## Vier Ergebnisse

| KI-/Regel-Auswertungen pro Tag | Zeitpunkte | Käufe | Abgeschlossene Trades | Gewinner / Verlierer | Kontowert* | Gesamt-P&L* | Rendite | Max. Drawdown | Modellkosten** |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 15 | 8 | 6 | 0 / 6 | 4.087,69 | -912,31 | -18,25 % | 18,40 % | 198,48 |
| 4 | 60 | 16 | 13 | 0 / 13 | 3.570,55 | -1.429,45 | -28,59 % | 28,82 % | 479,49 |
| 12 | 180 | 32 | 28 | 1 / 27 | 3.092,55 | -1.907,45 | -38,15 % | 38,45 % | 787,76 |
| 24 | 360 | 33 | 30 | 2 / 28 | 3.171,26 | -1.828,74 | -36,57 % | 36,79 % | 864,49 |

\* **Kontowert und P&L:** Virtuelles Barguthaben plus virtuelle, zu den letzten historischen Kursen bewertete offene Positionen **nach angenommenen Kosten eines theoretischen Verkaufs**. Diese offenen Positionen wurden am Endzeitpunkt nicht real verkauft.

\*\* **Modellkosten:** Bereits simulierte Kauf-/Verkaufskosten; angenommene spätere Liquidationskosten auf offenen Positionen sind im Kontowert berücksichtigt, nicht zusätzlich als bereits angefallene Gebühren verbucht.

**Ergebnis im getesteten Kurs-Regelmodell:** Einmal täglich war mit **-912,31** am wenigsten verlustreich. 24 Analysen pro Tag waren mit **-1.828,74** nicht besser. **Alle Varianten verloren Geld.** Eine profitable Häufigkeit wurde damit nicht nachgewiesen.

## Kapital, Risiko und offene Positionen

| Analysen/Tag | Höchstes gleichzeitig eingesetztes Kapital | Realisiert | Noch offen (Netto-Bewertung) | Offene Positionen |
|---:|---:|---:|---:|---|
| 1 | 4.125,00 | -758,17 | -154,14 | SHIB, PEPE |
| 4 | 4.670,82 | -1.323,17 | -106,28 | PEPE, BONK, BOME |
| 12 | 4.909,79 | -1.797,21 | -110,24 | PEPE, BONK, BOME, DOGE |
| 24 | 4.894,34 | -1.727,55 | -101,19 | PEPE, BONK, BOME |

## Historische Datenqualität

- **12 von 13** vorab festgelegten Memecoin-Handelspaaren haben jeweils 408 lückenlose Stundenkerzen (360 Teststunden plus 48 Stunden Indikatorvorlauf).
- Verfügbare Paare: DOGEUSDT, SHIBUSDT, PEPEUSDT, FLOKIUSDT, BONKUSDT, WIFUSDT, BOMEUSDT, PENGUUSDT, TRUMPUSDT, PNUTUSDT, TURBOUSDT, NEIROUSDT.
- Nicht vollständig verfügbar: MOODENGUSDT.
- Datenquelle: offizielle, frei abrufbare **Binance SPOT `/api/v3/klines`** (1-Stunden-Takt). Exakte Abfrage-URLs, SHA-256-Prüfsummen und Nachweise stehen in `results/sources-manifest.json`; die vollständigen Rohdaten sowie sämtliche Entscheidungen liegen als GitHub-Actions-Artefakt vor.
- Es handelt sich um eine **vorab für diesen Backtest festgelegte Auswahl bekannter Börsen-Memecoins**, nicht um die gesamte historische Menge neuer DEX-Token. Die Rückblick-Auswahl kann Verzerrungen enthalten.

## Strategie und strikte Zeitregel

Jede der vier Varianten benutzt dieselbe, deterministische **Kurs-/Volumen-Strategie** statt echter historischer KI-Recherche. Entscheidungen dürfen nur vollständig abgeschlossene ältere Stundenkerzen sehen. Simuliert wird ein Handel am **Eröffnungskurs der folgenden Stunde**.

- Einstieg: Mindestens Score 80 von 100 anhand bereits abgeschlossener 1h-, 6h- und 24h-Momentum-/Volumenwerte, positiver 24h-Trend, hinreichendes 6h-Volumen. Der Score ist **keine** Ausbruchswahrscheinlichkeit.
- Kaufbeträge dynamisch, mindestens 50, höchstens 5.000, Gesamt-Einstandswert aller offenen Positionen höchstens 5.000; höchstens fünf offene Positionen, maximal zwei neue pro Auswertungszeitpunkt.
- Gebühren: Modelliert **1 % pro Kauf und Verkauf**, zusätzlich **0,2 % Slippage pro Seite**; keine echten Swap-Quotes und keine verifizierte Token-Verkaufbarkeit.
- Alle vier Varianten benutzen unabhängig von ihrer Analysefrequenz die **gleiche stündliche Schutzprüfung** anhand der zuletzt geschlossenen Stundenkerze (Stop-Loss und Trailing). Damit wird lediglich die *Recherchehäufigkeit*, nicht die Sicherheitshäufigkeit variiert.

## Was das Ergebnis NICHT beweist

Die 615 historischen Auswertungszeitpunkte sind **keine 615 tatsächlichen OpenAI-/ChatGPT-Recherchen**. Historische Nachrichten, Telegram-/TikTok-/X-Meldungen und neue DEX-Launches konnten nicht lückenlos in einem strikt zeitkorrekten Quellarchiv nachgewiesen werden. Es wäre irreführend, solche Informationen aus heutigen Rückblickseiten in historische Entscheidungen einzuschleusen.

Ebenso sind die Börsen-Stundenkurse keine echten ausführbaren DEX-Kauf-/Verkaufsangebote. Die Gewinne/Verluste sind ausschließlich **nachgerechnete Modellresultate**, keine historischen realen Orders. Ein einzelner 15-Tage-Zeitraum mit einem schwachen Marktumfeld reicht nicht, um für die neue zentrale KI eine statistisch belastbare optimale Analysefrequenz zu bestimmen.

**Konsequenz:** Den vorhandenen stündlichen KI-Zeitplan des Sniperbots nicht allein aufgrund dieses Proxy-Tests ändern. Für eine Entscheidung über 1/4/12/24 echte KI-Recherchen sind langfristig kontinuierlich archivierte, zeitgestempelte Nachrichten- und Markt-Snapshots sowie echte Paper-Orderbelege erforderlich.

[Ausführung und Rohdaten (GitHub Actions)](https://github.com/127027/Sniperbot-/actions/runs/43650566827) · [Maschinenlesbarer Ergebnisbericht](../results/summary.json)
