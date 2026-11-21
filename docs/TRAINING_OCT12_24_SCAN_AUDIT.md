# R29 Trainings-Backtest 12.10.2026 – 24 stündliche Scans und tatsächliche Dot-Aufgaben

**Keine unabhängige Blindvalidierung; keine echten Paper-Orders.** Quelle: vom Nutzer hochgeladene Excel-Datei mit 65 retrospektiven Kursanstiegen, davon nur 8 direkte Pool-Links. 57 ohne vollständige Pool-ID. Keine Gewinnerliste als Seed eines künftigen unabhängigen Tages.

## Exakte Zeiten

12.10.2026 00:00 UTC–13.10.2026 00:00 UTC = 12.10. 02:00 MESZ–13.10. 02:00 MESZ. Strategie-Scans um jeweils hh:35 UTC (24 insgesamt), Dot1 :05, Dot2 :15, Dot3 :25, Dot4 :35, Dot5 :45. Hier wurden **24 algorithmische Forschungsverifikationen**, nicht 24 historische eigenständige GPT-Dot-Läufe, erzeugt.

## Nachgewiesene historische Kursdaten

- BNBCAT: Pool seit 2026-10-12 07:29:54 UTC, 194 nachträglich über öffentliche GeckoTerminal-API rekonstruierte 5-Minuten-Kerzen.
- Smoking Inu SI/WETH (Robinhood): Pool seit 2026-10-12 03:43:11 UTC, 57 rekonstruierte Kerzen.
- Smoking Inu SI/NVDA: öffentliche API antwortete HTTP 429; danach 5 weitere Pool-Abfragen bewusst nicht ausgeführt. Summe rekonstruierter Kerzen: 251. **Nicht** identisch mit damals archivierten Dot2-Daten.

## Forschungsstrategien (nur modelliert, 50 TEST-USDC/Einstieg)

| Preset | Forschungs-BUY | Forschungs-SELL | Modell-PnL nach angenommenen Kosten | Offene Positionen |
|---|---:|---:|---:|---:|
| exploratory | 6 | 6 | −66,01 TEST-USDC | 0 |
| conservative | 3 | 3 | −33,52 TEST-USDC | 0 |
| volatility_guard | 0 | 0 | 0 TEST-USDC | 0 |

**Der Volatilitätsschutz hat nichts verdient – er hat sämtliche Käufe vermieden.** Die zwei anderen Modelle haben trotz rückblickend starker Gewinner Netto-Modellverluste. Das ist eine wertvolle Gegenprobe gegen wahllose Momentum-Käufe, keine verifizierte Trading-Rendite.

### Exploratory Einzelereignisse (UTC; Deutschland = +2h)

| Coin | Modellsignal | UTC | Modell-PnL TEST-USDC |
|---|---|---|---:|
| Smoking Inu SI/WETH | BUY | 04:35 | – |
| Smoking Inu SI/WETH | SELL | 05:35 | 43.92 |
| Smoking Inu SI/WETH | BUY | 06:35 | – |
| Smoking Inu SI/WETH | SELL | 07:35 | -37.04 |
| BNBCAT | BUY | 13:35 | – |
| BNBCAT | SELL | 14:35 | -40.39 |
| BNBCAT | BUY | 15:35 | – |
| BNBCAT | SELL | 16:35 | -23.10 |
| BNBCAT | BUY | 17:35 | – |
| BNBCAT | SELL | 18:35 | -19.25 |
| BNBCAT | BUY | 19:35 | – |
| BNBCAT | SELL | 20:35 | 9.86 |

## Sind die fünf realen Dots in ihren Aufgaben erfolgreich?

| Rolle | Aktueller Istzustand | Funktionsurteil |
|---|---|---|
| Dot 1 | 4 target GPT reviews, no verified market metrics | DATA_GAP |
| Dot 2 | 6 candidates, 0 full contracts; CI standalone JSON source found 20 separate current Solana full contracts but Dot2 did not ingest them | DATA_GAP |
| Dot 3 | No risk-eligible pool / independent quote pair | DATA_GAP |
| Dot 4 | No published order or real confirmed position | DATA_GAP |
| Dot 5 | Four SHA-verified snapshot objects; no published order or client fills | DIAGNOSTIC_ACTIVE |

**Unterschied:** Dot5 führt sinnvolle technische QA aus; die gesamte End-to-End-Aufgabe ist trotzdem noch nicht bestanden. Kein Originalprotokoll belegt, dass die fünf Cloud-Dots im Oktober an jedem Scanzeitpunkt Coins eigenständig fanden oder handelten. **Tatsächliche historische Dot2-Entdeckungen, GitHub-Orders, Client-Fills = 0 nachgewiesen.**

## Nächste Korrekturschritte nach dem Training

1. Dot2 muss JSON-Contract-Daten der API tatsächlich in seine periodischen GitHub-Journale übernehmen, einschließlich Source-ID, Zeit, vollständiger Pool- und Contract-Adresse. Aktuelle CI-Quelle hat 20/20 Full Contracts auf Solana bewiesen; aktuelle Dot2-Berichte führen 0/6.
2. Unabhängigen DEX-Pair-Abgleich und Originalseiten / JSON SHA für Dot3 protokollieren. Zwei tatsächliche Quellen, sellability, Liquidität und identischer Chain/Pool/Contract bleiben Pflicht; kein künstlicher BUY.
3. HTTP429 als Quoten-/Coverage-Fehler dokumentieren, neue Abfragen später statt stur sofort wiederholen; über Chains rotieren.
4. Dot4 darf nur bei vollständigem Risiko-Freigabesignal Paper-Orders veröffentlichen; Research-BUY/SELL nur im separaten Labor; 24 stündliche Scans und 4/8/12/24 Vollreviews im echten Modus unterscheiden.
5. Dot5 pro Stunde einen nachvollziehbaren Funnel-Bericht verfassen: Pools→full contracts→2 unabhängige Quotes→Risk eligible→Order→Client receipt. TRAINING-Tage 12.10. und 15.11. nie wieder als unabhängige Holdouts verwenden.

Provenienz: [GitHub-Lauf 44926526324](https://github.com/127027/Sniperbot-/actions/runs/44926526324), Beleg-Dateien als Workflow-Artefakt `historical-ohlcv-probe`, 84/84 Softwaretests bestanden.
