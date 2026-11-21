# R29 V1.5 – Historischer News-/Meme-Backtest 12. Oktober 2026

**Vergleich:** A = sechs eingefrorene historische Pools nur mit Marktdaten; B = identischer Markt-/Kosten-/Risikoforschungsrahmen und *nur damals tatsächlich erfasste und verifizierte* News/Posts. Es sind **24 algorithmische Forschungs-Scans**, **keine** damals ausgeführten fünf autonomen Dot-Sitzungen.

## Ergebnis – kein nachgewiesener News-Handelsvorteil

| Kennzahl | A ohne News | B mit streng nachgewiesenen News |
|---|---:|---:|
| Retrospektive Pools | 6 | 6 |
| Historische Modellscans | 24 | 24 |
| Modell BUY | 6 | 6 |
| Modell SELL | 6 | 6 |
| Gewinntrades | 4 | 4 |
| Verlusttrades | 2 | 2 |
| Offene Positionen | 0 | 0 |
| Realisierter Modell-PnL TEST-USDC | -5,30 | -5,30 |
| Im Okt. nachgewiesen ursprünglich rechtzeitig erfasste, exakte, unabhängige Medienhinweise | 0 | 0 |
| Tatsächlich veröffentlichte historische Paper-Orders | 0 | 0 |
| Echte historische Client-Fills | 0 | 0 |

**Rechenunterschied:** 0,00 TEST-USDC. **Interpretation:** Mit den historischen Quellen kann der News-Zusatz nicht auf seine Wirkung getestet werden. 0 Delta ist **kein** Nachweis, dass News wertlos sind. Die sechs Pooltapes wurden nachträglich anhand bekannter Coins rekonstruiert. Die damalige gesamte Gewinner- und Verlierer-Grundgesamtheit fehlt.

Der deterministische GitHub-CI-Lauf [44954086431](https://github.com/127027/Sniperbot-/actions/runs/44954086431) hat die strenge A/B-Vergleichsstufe erfolgreich ausgeführt. Quellcode: `scripts/replay-v15-historical-media.mjs`; vollständige Modellentscheidungen in seinem erzeugten `r29-v15-oct12-market-vs-media.json` und CSV im Actions-Artefakt.

## Historische Nachrichtensuche – getrennt von echten Oktober-Captures

| Gefundene öffentliche Quelle | Zugeordneter Berichtstag | Damaliger Original-Capture? |
|---|---|---|
| [MemeFee](https://memefee.com/articles/meme-coin-weekly-news-review-oct-5-11-2026.html) | 2026-10-11 | **Nein** |
| [Memecoin.guru](https://memecoin.guru/news/memecoin-tools-weekly-2026-10-12) | 2026-10-12 | **Nein** |
| [CryptoTicker Archiv](https://cryptoticker.io/en/crypto-news/archiv/2026/10/) | 2026-10-12 | **Nein** |
| [UCSB American Presidency Project](https://www.presidency.ucsb.edu/documents/truth-social-posts-october-12-2026) | nachträgliche Kompilation | **Nein** |

Diese Seiten wurden rückblickend identifiziert. Keine davon liefert in unserem GitHub-Projekt einen belegten ursprünglichen Oktober-Scanzeitpunkt sowie zwei damals unabhängige genaue Contract-/Pool-Meldungen. **Sie werden daher nicht als Vorwissen in den A/B-Replay eingeschleust.** Die aktuelle V1.4-Medienerfassung begann am 21.11.2026; sie beweist nicht, dass R29 diese Oktober-Posts gelesen hätte.

## Vollständige 24-Scan-Tabelle (MESZ)

| Scan | Uhrzeit MESZ | Damals modellbekannte Pools | A BUY | A SELL | B BUY | B SELL | News mit belegtem damaligem Erst-Capture |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | 02:35 | 1 | 0 | 0 | 0 | 0 | 0 |
| 2 | 03:35 | 1 | 1 | 0 | 1 | 0 | 0 |
| 3 | 04:35 | 1 | 0 | 1 | 0 | 1 | 0 |
| 4 | 05:35 | 1 | 0 | 0 | 0 | 0 | 0 |
| 5 | 06:35 | 3 | 0 | 0 | 0 | 0 | 0 |
| 6 | 07:35 | 3 | 0 | 0 | 0 | 0 | 0 |
| 7 | 08:35 | 3 | 1 | 0 | 1 | 0 | 0 |
| 8 | 09:35 | 4 | 0 | 1 | 0 | 1 | 0 |
| 9 | 10:35 | 5 | 0 | 0 | 0 | 0 | 0 |
| 10 | 11:35 | 5 | 1 | 0 | 1 | 0 | 0 |
| 11 | 12:35 | 5 | 0 | 1 | 0 | 1 | 0 |
| 12 | 13:35 | 5 | 0 | 0 | 0 | 0 | 0 |
| 13 | 14:35 | 5 | 0 | 0 | 0 | 0 | 0 |
| 14 | 15:35 | 5 | 1 | 0 | 1 | 0 | 0 |
| 15 | 16:35 | 5 | 0 | 0 | 0 | 0 | 0 |
| 16 | 17:35 | 6 | 0 | 0 | 0 | 0 | 0 |
| 17 | 18:35 | 6 | 1 | 0 | 1 | 0 | 0 |
| 18 | 19:35 | 6 | 1 | 1 | 1 | 1 | 0 |
| 19 | 20:35 | 6 | 0 | 0 | 0 | 0 | 0 |
| 20 | 21:35 | 6 | 0 | 0 | 0 | 0 | 0 |
| 21 | 22:35 | 6 | 0 | 0 | 0 | 0 | 0 |
| 22 | 23:35 | 6 | 0 | 0 | 0 | 0 | 0 |
| 23 | 00:35 | 6 | 0 | 1 | 0 | 1 | 0 |
| 24 | 01:35 | 6 | 0 | 1 | 0 | 1 | 0 |

## Die fünf bestehenden Dots – tatsächliche Grenzen

- **Dot 1 / Tempo:** Soll anhand tatsächlich damaliger Medien-/Marktdeltas adaptive 4/8/12/24 GPT-Reviews wählen. Für den Oktober liegen aber keine originalen historischen 5-Dot-Laufjournale vor. 24 Modell-Ticks sind kein Beleg tatsächlicher autonomer Vollanalysen.
- **Dot 2 / Discovery:** In beiden Varianten dieselben sechs **post hoc ausgewählten** Pools. Der damalige Zugang zu ihnen wurde nicht durch historische Dot2-Belege nachgewiesen. V1.4 erfasst ab November künftig publizierte und erstmals gesehene Posts.
- **Dot 3 / Risiko:** Keine damaligen originalen vollständigen unabhängigen zwei DEX-Provider-Zeitquoten mit Sellability-/Tax-/Honeypot-Prüfung. Deshalb keine rückwirkende echte Kauf-Freigabe.
- **Dot 4 / Strategie:** Beide Varianten wenden dasselbe `guarded_reentry`-Modell auf dieselben Kurstapes an; Medien dürfen nur mit zwei unabhängigen ursprünglich erfassten identischen Chain+Contract+Pool-Quellen die Forschungs-Momentum-Grenze um 1 Prozentpunkt verändern. Keine solchen Belege für die sechs Pools.
- **Dot 5 / Kontrolle:** Prüft Lookahead/Erfassungszeit, gleiche sechs Pools, identische Kosten, alle 24 Modellscans, Kontrollgruppe und echte Paper-Quittungen. Alte Zeitstempel aus Online-Archiven dürfen nicht als damalige Erfassung verkauft werden.

**Alle fünf aktiven Dot-Automationen wurden um ausdrückliche V1.5-Prüfregeln ergänzt.** Diese Änderungen wirken erst in ihren künftigen echten Durchläufen; sie erzeugen keine historischen Oktober-Dot-Läufe.

## Konkrete weitere Datenanforderung

Für einen tatsächlichen News-Vorteil braucht R29 laufende Prospektiv-Captures aus Markt und Medien, eine *vorher* eingefrorene, unbeeinflusste Kandidatenliste mit Gewinnern und Verlierern, zwei unabhängige exakt identifizierte Quellen, überprüfbare Quote-/Sellability-Gates und 24h-Ergebnisse. Erst dann lassen sich Entdeckungs-Recall, Fehlalarme und Rendite A/B statistisch sinnvoll vergleichen. 0 bestätigte echte Paper-Trades bis zu diesem Stand.
