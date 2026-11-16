# Sniperbot R29 – Beispiel: neuer Memecoin, 41× in vier Wochen

**Hypothetischer Rechenfall, keine reale Coinempfehlung, keine historische GPT-Order.** Ziel nach Nutzerbeispiel vom 16.11.2026: sehr früh bei einem *neuen oder gerade viral werdenden kleinen Memecoin* einsteigen und den Hype idealerweise innerhalb von 1–7 Wochen vor dem starken Rückgang verkaufen. Große Standard-Coins und etablierte Bluechips bleiben keine Sniper-Ziele.

| Kennzahl | Beispiel |
|---|---:|
| Einstiegs-Spotpreis | 0,0000001 TEST-USDC/Token |
| Ausstiegs-Spotpreis vier Wochen später | 0,0000041 TEST-USDC/Token |
| Kursverhältnis | **41×** |
| Rechnerische Preisveränderung | **+4.000 %** |
| Virtueller Einsatz | **5.000 TEST-USDC** |
| Theoretisch kaufbare Menge ohne jeglichen Price Impact, Gebühren und Netzwerkgebühren | **50.000.000.000 Token** |
| Theoretischer Erlös ohne Kosten und Slippage | **205.000 TEST-USDC** |
| Theoretischer Gewinn ohne Kosten und Slippage | **+200.000 TEST-USDC** |

**Diese Werte sind bloße Spotpreis-Multiplikationen.** Sie dürfen **niemals** als historisch erreichter oder vom Bot ausführbarer Gewinn dargestellt werden. Der Börsenpreis eines Tokens mit vielen Nullen sagt allein nichts über seine Marktkapitalisierung aus.

## Liquidität: Aus einem 41×-Kurs wird nicht automatisch ein 41×-Handelserlös

Vereinfachtes Constant-Product-AMM-Stressmodell, jeweils normierter Tokenbestand so festgelegt, dass die Spotpreise *im Modell* zu dem Beispiel passen, und 0,3 % Swapgebühr je Seite:

| Quote-Reserve des Pools beim Kauf | Quote-Reserve beim Verkauf | Modellierter Verkaufserlös | Modellierter Gewinn gegenüber 5.000 |
|---:|---:|---:|---:|
| 10.000 TEST-USDC | 10.000 TEST-USDC | ca. 9.289 | ca. +4.289 |
| 100.000 TEST-USDC | 200.000 TEST-USDC | ca. 98.356 | ca. +93.356 |
| 1.000.000 TEST-USDC | 2.000.000 TEST-USDC | ca. 184.046 | ca. +179.046 |

**Alle drei Liquiditäts-Paare sind künstliche Stresstestszenarien, KEINE echten Poolmessungen.** Das Modell vereinfacht Pump.fun/PumpSwap-Mechanik, berücksichtigt nicht MEV/Sandwiches, Gas, Routenwechsel, Token-/Transfer-Taxes, gebundene Mittel oder Scam-Möglichkeiten. Erster und zweiter Poolstand liegen zu unterschiedlichen hypothetischen Zeitpunkten; die spätere Pooltiefe kann heute **nicht** als sicher vorhergesagt werden.

**Wichtige Handelsregel:** Auch bei 5.000 TEST-USDC möglichem Paper-Einsatz erst Kauf- und Verkaufskapazität unabhängig prüfen, einschließlich Contract-Adresse, Pool, Sellability, Ausstieg zu *dieser Positionsgröße*, Slippage, MEV-Risiko, Walletverteilung, Creator-/Insider-Abverkauf und laufendem Liquiditätsabzug. Bei nicht bestätigter Ausführbarkeit = `WATCH` oder `DATA_GAP`, kein automatischer Kauf. Das gilt auch bei Prognosen von +1.000 %, +4.000 % oder mehr.

## Such-/Backtest-Auftrag

1. **Meme-only**: Neue neutrale Tokenstarts und echte unabhängige Medien-/Social-Hype-Ereignisse statt BTC-/ETH-Kaufstrategien.
2. **Frühindikatoren**: Einzigartige Käufer, Preis-/Volumenbeschleunigung, Creator-/Insider-Historie, echter organischer Social-Trend, Liquidität und unabhängige Quellen.
3. **Ausstieg**: Kein starrer Zwang, vier Wochen zu halten. Hype, Liquidity, Sellability und Risiko stündlich bedarfsgerecht überwachen; Teilverkäufe, Stop und nachlaufender Exit nur mit ausführbaren Preisen testen.
4. **Unvoreingenommener 60-Tage-Replay**: Frühe 1–7-Wochen-Chancen aus damals verfügbaren Belegen auswählen; auch ausgebrochene NO_TRADE-Coins im späteren Outcome-Journal bewerten. Der 60-Tage-Replay kann nur für Eintritte mit **ausreichend verbleibender Zukunft** eine komplette 49-Tage-Haltedauer auswerten; jüngere offene Positionen am Cutoff als `OPEN_CENSORED` statt Gewinn/Verlust erfinden.
5. **Paper-Sensitivität**: 50–5.000 TEST-USDC je nach bestätigter Markt-/Liquiditätslage, Risikobudget und offenen Positionen. Das bereits bestehende lokale Paper-Konto und seine bisherigen Sicherheitslimiten bleiben **unverändert**, bis ein gesondert geprüfter Live-Paper-Risikopatch freigegeben wurde.
6. **Nachprüfbarkeit**: Verifiziere die exakten Coin-/Pooladressen sowie tatsächliche historische Kauf-/Verkaufsquotes, bevor du irgendeine erfolgreiche historische 41×-Ausführung behauptest.

**Testbarer Code:** `research/r29/operations/memecoin-moonshot-execution-check.mjs`, Regression `research/r29/operations/memecoin-moonshot-execution-check.test.mjs`. Die zusätzlich getestete Meme-only-Auswahl liegt in `memecoin-only-candidate-gate.mjs`. Beide sind reine Forschungswerkzeuge, keine Orderpipeline.
