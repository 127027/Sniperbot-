# R29 Gedächtnis – 60-Tage-GPT-Backtest: echte Fehlerbelege V1 → V2

**17. November 2026 · Nur Forschung · VERSIONSSCHUTZ.** Die hier neu entwickelten Regeln stammen **nach** dem historischen 60-Tage-Zeitraum; weder die alte Tageshistorie noch eine frühere GPT-Entscheidung wird rückwirkend geändert. Es gibt **keinen** bestätigten handelbaren Gewinn oder Verlust; Geldbewegungen: **0**.

## 1. Was GPT im neu ausgewerteten 60-Tage-Fenster bisher erkennt

Zeitraum **18.09.–16.11.2026**, mit chronologisch gewählten Zeitpunkten und 5.000 TEST-USDC als virtuellem separatem Forschungskapital, nicht mit verändertem realem Laptop-Paper-Konto.

| Messwert | Erste Version V1 | Frischere Forschungsvariante V2 |
|---|---:|---:|
| Kalendertage | 60 | 60 |
| Tage mit historischen Minutensignalen | 43 | 43 |
| Tage ohne diese Quelle | 17 | 17 |
| Technische Forschungs-Proxy-Scans | 513 | 513 |
| WATCH-Fälle | 9 | 1 |
| Bestätigte eigene BUY-/HOLD-/SELL-Fills | 0 | 0 |
| Tatsächliche individuelle GPT-Modellaufrufe an den damaligen Tagen | 0 belegt | 0 belegt |
| Reale ausführbare GPT-DEX-Handelsrendite | UNBEKANNT | UNBEKANNT |

**Erfolgreiche externe Reproduktionen:**
- V1-Proxys: https://github.com/127027/Sniperbot-/actions/runs/44040656066
- V1-Posthoc nach vorheriger GPT-Entscheidungsfixierung: https://github.com/127027/Sniperbot-/actions/runs/44047869968
- V2 frische historische Frames: https://github.com/127027/Sniperbot-/actions/runs/44048309420
- V2-Proxys aus denselben 43 Tagen: https://github.com/127027/Sniperbot-/actions/runs/44048643351
- V2-Posthoc nach vorheriger GPT-WATCH-Fixierung: https://github.com/127027/Sniperbot-/actions/runs/44049113793
- Tagesweiser Vergleich der gesamten 60 Tage: `research/replay-120d-real/results/R29_60D_V1_V2_FRESH5_INSAMPLE_DAY_BY_DAY_20261117.csv`.
- Dauerhafte Prüfzusammenfassung: `research/replay-120d-real/results/R29_60D_V1_V2_OUTCOME_AUDIT_20261117.json`.

## 2. Konkrete Fehler: Nicht ein hoher Score macht einen Coin sicher

**V1-Fehler: technisch veraltete Auswahl.** V1 zog die **ersten acht** verschiedenen Mints einer Stunde, bewertete sie aber erst am Stundenende. Acht der neun WATCH-Kandidaten ließen sich nach den festgeschriebenen GPT-Nachbewertungen identisch im SHA-geprüften Launch-Archiv wiederfinden; **ein** Kandidat vom 26.09.2026 war dort nicht auffindbar. Dieser bleibt `SOURCE_IDENTITY_GAP`, keine erfundene Erfolgs-/Fehlerklasse.

Von den acht verifizierbar zugeordneten V1-Mints waren in den **später ausgelesenen** Provider-Labels **drei** als Rug-Regelfälle eingeordnet; alle drei Provider-Rug-Ereignisse lagen **schon vor dem stündlichen virtuellen Scan**. **Keines** der acht hatte das Provider-Label `graduated=1`. Das macht den Modell-Score 99,05 vom 02.10./03.10. zu einem **auffälligen falschen Forschungs-Positive**: Die Quelle meldet eine Rug-Regel vor der nachträglichen hohen WATCH-Bewertung. **Nicht:** drei bewiesene verlorene Trades. Es wurden keine Käufe ausgeführt und kein handelbarer Preis gemessen. Ein späteres Graduation-Label ist außerdem kein vollständiger Ersatz für die Prüfung auf 10×-Gewinne.

**Korrekturversuch V2:** Nur tatsächlich in den letzten fünf Minuten vor dem Scan beobachtete Mints, die **auch am Entscheidungstermin höchstens fünf Minuten alt** sind; statt erster acht alter Stundenkandidaten die acht jüngsten aus dem unmittelbaren Fenster. Kein WATCH aus ungeklärtem SOL-Quote-Asset oder Mayhem-/Agentenmodus. Das reduzierte die als Forschungs-Proxy beobachteten WATCH-Scans im **gleichen Datensatz** von neun auf eins. Es beweist keine Verbesserungsrate, da V2 erst **nach Einsicht in die V1-Labels** entwickelt wurde (In-sample/Hindsight-Risiko).

**V2-FEHLER: Rug 133 Sekunden nach dem einzigen neuen WATCH.** Der von GPT nachträglich explizit überprüfte V2-Mint `3cpr9EaPmQSf7daf37d7xNRZwbpL3LZRtARkYE3cp6jw` war am **03.10.2026, 03:00 UTC** ungefähr **236 Sekunden alt** und hatte den Forschungs-Score **98,15/100**, 78 erfasste Käufe, geringe gemeldete Insider-/Creator-Konzentration und keinen Mayhem-Modus. GPT hielt ihn ausdrücklich nur auf WATCH, weil echte Pool-/Contract-/Bidirektional-Quotes fehlten. **Erst danach** wurde die SHA-geprüfte, rückblickende Quelle geöffnet: Der Provider meldet einen **DRAIN** um **03:02:13 UTC**, also **133,423 s später**, nicht `graduated`. Das ist ein **falsches Frühwarn-Positiv**, aber **kein eigener Verlusttrade**. Der Provider-Rug-Algorithmus ist eine technische Regel und kein Betrugsnachweis.

**Zusätzliche Quellenkorrektur:** `f_rs` bedeutet *reale SOL-Reserve der Bonding Curve*, **nicht Tokenpreis, Spot-Kurs, PnL oder verlässlich verkaufbare USDC-Liquidität**. Alle früheren Hochrechnungen, die `f_rs` als Preis interpretieren würden, wären unzulässig. Ein Pump.fun-Mayhem-Token kann laut Anbieter ganz andere Migration-/Rug-Statistiken zeigen als ein klassischer Token; beide Kohorten nicht unkommentiert mischen.

## 3. Wie ich die Erfahrungen künftig verwenden muss

Erfahrungen beeinflussen eine strategische Entscheidung **erst ab dem Zeitpunkt, an dem die Erkenntnis nachweisbar vorlag**. Alle obigen V1-/V2-Labels wurden **heute** aus einer später veröffentlichten Quelldatei untersucht. **Sie dürfen NICHT so dargestellt werden, als hätte GPT diese Lektion bereits am 04.10.2026 historisch gewusst.** Für einen echten 60-Tage-Walkforward benötigt jeder Tag ein *zeitgerecht tatsächlich beobachtbares* Ergebnisjournal, nicht die hindsight-veröffentlichte endgültige Rugliste.

Forschungs-Hypothesen **V3 für neue, bis dahin ungesehene Daten**, derzeit nicht aktiv:
1. ***Kauf nur bei unabhängiger beidseitiger Quote*** für die exakte Chain:Mint:Pool-Kombination plus Mint-/Freeze-Authority, realistischer eigener Positionsgröße, ausführbarer Rückverkauf und Liquidität nach Gebühren/Slippage. Ein noch so hoher Score reicht NICHT.
2. ***Quellfrische***: Tokenalter und Zeit seit letzter Beobachtung getrennt messen. Bei historischen Scan-Fenstern nur den tatsächlichen Vorabstand ausweisen. Vor einem positiven neuen BUY nochmals zeitnahe Onchain-Daten prüfen.
3. ***Mayhem-Modus gesondert validieren***. Vorläufige Exklusion in V2 war eine risikoorientierte Modellannahme; nicht als bewiesener PnL-Vorteil ausgeben.
4. ***Minuten-Rugs***: Stündliche GPT-Vollscans können einen innerhalb von 133 Sekunden eintretenden DRAIN nicht erkennen und rechtzeitig per GPT-SELL behandeln. Für einen späteren LIVE-Paper-Betrieb sind vorab genehmigte **rein technische, lokale** Liquiditäts-/Quote-Failsafes erforderlich, die Ausführung blockieren oder einen Sicherheitsstopp melden. Kein autonomer Bot-Coin-Selektor, keine eigenmächtige Strategieänderung.
5. ***Nichtkäufe nachbeobachten***: Auch `NO_TRADE`/WATCH-Entscheidungen sind erst mit späteren **handelbaren** Vergleichspreisen, Risikodaten und zeitgerechtem Outcome vollständig auswertbar. Kein späterer Pump darf rückwirkend einen gegen damalige Safety-Kriterien geblockten BUY erzwingen.
6. ***Wissenschaftliches Testdesign***: V3-Grenzwerte einfrieren, bevor neue Tage betrachtet werden. A/B nur auf unabhängigen neuen Daten, nicht auf denselben bereits gesehenen 43 Tagen. Bei fehlenden historischen Quotes weiter `UNKNOWN`, keine fiktiven BUY-/SELL-Preise.

## 4. Status von GPT, Bot und Geld

GPT bleibt einziger Entscheider für 1/4/12/24, BUY/HOLD/SELL/NO_TRADE und Positionsgröße. Der Bot ist nur technischer Validator, Quoten-/Swap-Ausführer und permanenter Speicher. Der Nachweis eines privaten aktuellen GPT-Zugangs zum freien Bot-Guthaben (z.B. 50–4.999) ist **noch nicht vollständig verbunden**. Der Bot hat hier **kein** Paper-Guthaben verändert. Echtgeld und PayPal-Onramp sind nicht aktiviert.

**Echte Leistung jetzt messbar:** Die bestehende V1-Erkennung hatte gefährlich veraltete Frühkandidaten; V2 nimmt zeitnähere Kandidaten, findet aber trotzdem einen späteren Drain. **Nicht messbar:** tatsächliche Handelsrendite und statistisch robuste 10×-Vorhersage. Dieser Backtest hat bisher nicht bewiesen, dass GPT-gestütztes Memecoin-Sniping zuverlässig profitabel ist.
