# R29 V0.9: 12. Oktober 2026 – Wiederholter 24-Scan-Backtest und Vergleich

**Status:** GitHub-Action [44930013760](https://github.com/127027/Sniperbot-/actions/runs/44930013760), 96/96 Tests grün; 24 retrospektive MODEL-Scans, kein echter historischer GPT-Dot-Lauf.

## Vorher vs. jetzt (getrennte Messachsen)

| Metrik | Vorher | Jetzt | Veränderung |
|---|---:|---:|---:|
| Stündliche Oktober-Replay-Scans | 24 | 24 | 0 |
| Historisch rekonstruierte Pools | 2 | 2 | 0 |
| Experimentier-BUY | 6 | 6 | 0 |
| Experimentier-SELL | 6 | 6 | 0 |
| Modell-PnL explorativ (TEST-USDC) | −66,01 | −66,01 | keine nachgewiesene Verbesserung |
| Modell-PnL konservativ (TEST-USDC) | −33,52 | −33,52 | keine nachgewiesene Verbesserung |
| Modell-PnL Volatilitätsschutz (TEST-USDC) | 0,00 | 0,00 | keine nachgewiesene Verbesserung |
| Echte Dot2-Kandidaten im November (aktueller Betrieb) | 6 | 23 | +17 / +283,3 % |
| Vollständige Token-Contracts im echten Dot2-Journal | 0 | 21 | +21 (nicht in % berechenbar) |
| Dot3 kaufgeeignet | 0 | 0 | 0 |
| GitHub-Paper-Orders | 0 | 0 | 0 |
| Paper-Client-Fills | 0 | 0 | 0 |

Der ältere Dot2-Bericht ist nachweisbar Commit `02e18866ac76b0bca0ee1bcef9d3f0f5e055df89`, Blob `054723009a0a64809227831564c61edbe4a53058` von 2026-11-21T16:15:31Z. Der aktuelle Dot2-Bericht ist vom 2026-11-21T17:20:09Z. Für Renditevergleiche der nachträglich abgerufenen historischen Kerzen sind die *ursprünglichen Rohdaten nicht bytegleich eingefroren*. Deshalb keine statistisch belastbare PnL-Gewinnsteigerung ableiten.

## Was die Dots nun tatsächlich tun

- **Dot1:** weiterhin eingeschränkte Zeitsteuerung bei fehlenden mehreren verifizierten stündlichen Marktmetriken.
- **Dot2:** hat erstmals den neuen GitHub-Capture `research/feeds/2026-11-21/44929419567/evidence.json` mit vollständigen Contracts selbst übernommen. 23 Pending-Kandidaten, 21 volle Token-Adressen. Eine API-Seite BSC: 17 neue Pools, plus vier ältere durch DEX-Recherche.
- **Dot3:** hat *danach* (2026-11-21T17:25:01Z) den neuen Dot2-Journalstand bewertet: 7 WATCH, 10 REJECTED, 4 DATA_GAP, 0 ELIGIBLE. Genau hier liegt der aktuelle nächste Engpass: keine in derselben Phase ausreichenden unabhängigen Preis-, Liquiditäts- und Sellability-Nachweise.
- **Dot4:** Sein vorheriger Bericht liegt vor dem neuen Dot2-/Dot3-Lauf; kein neues BUY/SELL-End-to-End-Ergebnis nachgewiesen.
- **Dot5:** Letzter Bericht liegt ebenfalls vor dem aktualisierten Dot2-/Dot3-Funnel; noch kein neuer synchroner Audit über diese Verbesserung nachgewiesen.

## Forschungs-Trades auf dem Oktober-Tag

Die exakt gleichen zwei nachträglich ausgewählten Pool-IDs BNBCAT und Smoking Inu SI/WETH lieferten erneut 6 modellierte Käufe und 6 modellierte Verkäufe (exploratory). 0 tatsächlich historische Dot2-Entdeckungen, 0 veröffentlichte historische Paper-Orders, 0 Client-Fills. Diese Resultate gelten nur für diesen bereits entblindeten Trainingstag, **nicht** für eine unbekannte Zukunftsstichprobe.

## Präziser nächster Schritt

Dot3 benötigt bei mehr als einer vollständigen Tokenadresse einen tatsächlich neuen zweiten exakten Poolpreis samt belastbarer Liquidität, Capture-UTC und Sicherheits-/Sellability-Nachweis. Dot4 darf nicht auf die 20 Minuten alten Dot2-Quoten bei :35 kaufen; frische Quellen und Gate-Check unmittelbar vor Order sind Pflicht. Dot5 soll den Funnel ohne Wiederverwendung veralteter früherer Statistiken bestätigen. Eine Gewinnerliste darf nie als Seed eines unabhängigen Blindtests dienen.

Alle 24 Scans stehen zusätzlich als CSV im GitHub-Actions-Artefakt `historical-ohlcv-probe` dieses Laufs.
