# Verbindliche Forschungs- und Paper-Trading-Strategie – 5-Agent Meme Sniper

**Freigabe des Product Owners: 2026-11-06.** Dieses Dokument beschreibt den **Zielzustand für Codex**, keine bereits laufende Strategie. **Keine Echtgeldtransaktionen, keine Wallet- oder PayPal-Anbindung. Hixton bleibt unangetastet.**

## 1. Mission und realistische Erwartungen

Der Sniper soll Memecoins **möglichst vor einer ungewöhnlich starken, organischen Nachfragewelle** identifizieren, mit variabler Einsatzhöhe simuliert einsteigen und sich nicht durch einen pauschalen Take-Profit von +10–15 % aus einem weiter intakten Trend herausdrängen lassen. Haltezeiträume reichen von Minuten über Tage bis zu Wochen oder Monaten.

Beispiele wie **50 € → 5.000 € (100×, +9.900 %) oder +1.000 %** sind **hypothetische Extremfälle, keine Renditeprognose, Zielgarantie oder Grundlage für ein 100-%-Sicherheitsurteil**. Ein Memecoin kann binnen Sekunden nahezu wertlos und durch Liquiditätsentzug unverkäuflich werden. Der Bot soll seltene positive Ausreißer erforschen, aber auch die Verlustverteilung und den Wert möglicher fehlgeschlagener Exits messen.

## 2. Fünf spezialisierte, kooperierende Forschungsagenten

Die erste verbindliche Forschungsgruppe besteht aus **fünf logischen Rollen**. Die technische Registry bleibt auf **1..N** skalierbar, sodass später weitere verfügbare Dots/Services unterstützend teilnehmen können. Die fünf Rollen sind **nicht** automatisch fünf derzeit aktive ChatGPT-Dots; ChatGPT-Forschungsautomationen sind derzeit separate, höchstens stündliche Aufgaben. Für echtes 24/7-Sniping braucht es eine dauerhafte Daten-/Entscheidungspipeline.

| Rolle | Verantwortung | Mindestnachweise |
|---|---|---|
| A1 News / Early Discovery | Launches, neue Pool-/Contract-Adressen, frühe Nachrichten und Erwähnungen | Chain, Mint/Contract, Pool, Ursprung, exakte erste Beobachtungszeit |
| A2 Social Acceleration | Erwähnungswachstum, einzigartige Autoren, Ursprung und organische Community-Ausbreitung | Zeitreihe, kanalübergreifende Quellen, Bot-/Spam-/Influencer-Korrektur |
| A3 On-Chain / Liquidity | organische Käuferwallets, Wallet-Cluster, Käufe/Verkäufe, Liquidität, Route | Wallet- und Pool-Snapshots, Kapitalflüsse, Sell-Quote, Datenfrische |
| A4 Contract / Scam Risk | Authorities, Token-Erweiterungen, Holder-Cluster, LP-Rechte, Honeypot, Rug-Risiko | verifizierte On-Chain-/Contract-Prüfungen, ausdrückliches PASS/VETO/UNKNOWN |
| A5 Opportunity / Independent QA | These hinterfragen, Gegenbelege suchen, Prognosequalität und vorgeschlagenen Einstiegszeitpunkt prüfen | unabhängige Quellenprüfung, Gegenhypothese, begründete Stimme |

**Koordination/Kommunikation:** Alle fünf müssen über eine **noch zu implementierende**, persistente, authentifizierte Ereignis-/Belegablage (zunächst lokale Queue/Outbox) dieselbe Coin-Identität und denselben Beobachtungszeitraum beurteilen. Dabei tauschen sie **Belege, Unsicherheiten, Widersprüche und VETOs** aus. Ihr Ergebnis ist ein versioniertes `agent_vote.v1` mit `YES | NO | ABSTAIN | VETO`, Begründung, Beleg-IDs und Zeitstempel. Ein Agent darf nicht mehrfach für denselben Kandidaten stimmen. Fünf identische, auf eine einzige Social-Quelle zurückgehende Meinungen sind **keine fünf unabhängigen Belege**.

**Freigabe für die Zielversion:** Alle fünf Rollen müssen einen aktuellen, vollständigen Review für denselben Kandidaten abgegeben haben. Als zunächst konservative Policy soll **5/5 YES** erforderlich sein; `NO`, `ABSTAIN`, unbekannte Sicherheitsprüfungen oder `VETO` bewirken `WATCH/REJECT`, **keinen** Paper-Autokauf. Ergänzend müssen die harten unabhängigen Risikoprüfungen bestehen. Eine spätere andere Quorum-Policy darf erst nach messbarer Validierung eingeführt werden; nie nur aufgrund einer behaupteten „100-%-Sicherheit“.

**Nicht als Ist-Zustand behaupten:** Es existiert gegenwärtig weder ein gemeinsamer ChatGPT-Dot-Bus noch eine verifizierte Dot-zu-Windows-Übertragung. Ein lokaler 24/7-Signal-/Quote-Dienst und ein Research-Gateway sind Codex-Aufgaben. Kein ChatGPT-Dot erhält direkten Order-, Wallet- oder Adminzugriff.

## 3. Frühzeitige Trenddetektion – nicht auf bereits erfolgten Hype warten

Ziel ist **Beschleunigung** der einzigartigen, organischen Aufmerksamkeit, nicht die höchste Zahl der Posts: z. B. 1 → 15 → 25.000 Erwähnungen über mehrere Tage. Das ist ein **illustratives Muster**, kein empirisch belegtes Sniper-Signal und nicht automatisch ein guter Kauf. Es muss gegen Pump-Gruppen, bezahlte Influencer, massenhafte Bot-Posts und koordinierte Täuschung geprüft werden.

Zu erfassende Merkmale: erste Beobachtung; Erwähnungen pro 1/5/15/60 Minuten und pro Tag; einzigartige unabhängige Autoren; Quell-/Community-Verteilung; Beschleunigung und Abkühlung; zeitgleiche organische Wallet-Zunahme; reale Pool-Tiefe; Handelsaktivität und Deployer-/Insider-Abverkäufe. Späteren Erfolg darf der Bot bei einem früheren Kaufzeitpunkt im Backtest nicht schon „wissen“ (kein Look-ahead). Bestehende Quellen nur im Rahmen von API-Nutzungsbedingungen verwenden.

## 4. Dynamische Positionsgrößen (z. B. 50–1.000 Test-USDC)

Im Dashboard konfiguriert der Nutzer `minTrade` und `maxTrade`, einschließlich `50–50`, `200–400` und `50–1000`. Jede Coin-Entscheidung ergibt **0 (kein Kauf)** oder einen Betrag **innerhalb** dieser Grenzen. **1.000 USDC ist eine erlaubte Obergrenze, kein anzustrebender Standard.** Auch bei hoher Modellübereinstimmung bleibt `amount=1000` unmöglich, wenn freie Mittel, Portfolio-Risiko, Pool-Tiefe, erwartete Slippage, Gebühren, Expositionsgrenzen oder Sicherheitschecks nicht ausreichen.

`size = min(userMax, cashAfterCosts, perPositionRiskCap, portfolioRemainingRiskBudget, liquidityImpactCap)`; ist `size < userMin` oder fehlen Pflichtchecks: **kein Kauf**. Die Risikokappen sind zu definieren, zu testen und später vom Nutzer zu genehmigen; keine Sicherheit aus einer KI-Konfidenzzahl ableiten. Mehrere Coins/Positionen benötigen unabhängige IDs, Budgetreservierung, Cooldowns und idempotente Kaufaufträge. `Bot AUS` blockiert sämtliche neuen Einstiege.

## 5. Exit-Strategie ohne obligatorisches +15-%-Limit

**Änderungsanforderung:** `runner/core.mjs` enthält derzeit `takeProfit:15` und AUTO verkauft bei `pct >= takeProfit`. Diese feste +15-%-Take-Profit-Logik darf **nicht** als Standardstrategie des neuen Snipers weitergelten. Codex soll eine **testbare, simulationsrealistische, adaptive Exit-Engine** entwickeln, die positive Ausreißer laufen lassen kann und auch rasche Abverkäufe bzw. Liquiditätsverluste berücksichtigt.

Zu erforschende Exit-Regeln:
1. Trend- und Momentum-Bruch sowie sinkende organische Nachfrage;
2. Volatilitätsangepasstes Trailing und risikobasierter Maximalverlust;
3. optional partielles Sichern von Gewinnen *ohne* pauschales Alles-verkaufen bei +15 %;
4. massiver Liquiditätsabzug, Insiderverkäufe, Contract-Risiko-/Honeypot-Warnung;
5. zeitbasierte Überprüfung einer nicht mehr gültigen Investmentthese;
6. geschätzter tatsächlich **ausführbarer** Sell-Quote nach Slippage, Gebühren und Price Impact (kein Phantomgewinn auf Mid-Price).

Die Exit-Engine und Portfolio-Marks laufen unabhängig von der Freigabe für neue Käufe: **Bot AUS = keine weiteren Käufe; aktive Positionen werden weiter überwacht und nach gültigen Exit-Regeln verkauft.** Eine ausdrücklich manuell auf `HOLD` gesetzte Position ist davon zu unterscheiden. Rechner-Schlafmodus, ausgeschalteter Windows-Dienst, Feedverlust oder unverkaufbare Tokens können einen Exit verhindern; Status `EXIT_UNAVAILABLE`/stale ausdrücklich dokumentieren. Globaler Not-Aus ist separat zu spezifizieren.

**P0/P1 Übergang:** Bis die adaptive Strategie samt Simulation belastbar getestet ist, keine stillschweigende falsche „AI-Exit“-Behauptung; bestehender HOLD-Modus und gegebenenfalls manuelle PAPER-Ausstiege bleiben klar gekennzeichnet. Codex soll das +15-%-AUTO-Modell als **Legacy-/Demo-Regel** markieren bzw. durch ein explizit ausgewähltes, sicher getestetes Exit-Profil ersetzen. Keine ungetestete Echtgeld-Strategie aktivieren.

## 6. Paper-Backtest & Abnahmekriterien

- Vollständige Launch-Kohorten inklusive gescheiterter, illiquider und geruggter Tokens; zeitlich korrekte Daten/Quellen.
- Dokumentierte Daten-Latenz und erneutes `sell_quote`-Sampling; Kosten, Slippage, Fill-Failures, Ausführungsversagen.
- Out-of-sample/Walk-forward; vergleichen: Legacy +15-% Exit vs. adaptive Exits; Netto-P&L, Maximum Drawdown, Profit-Factor, Median, obere Quantile, Gewinne aus Ausreißern, absolute Verluste, maximale offene Exposition, Exit-Fail-Rate.
- Deterministischer Test: fünf eindeutige YES-Votes, unabhängige Belege und bestandene Risk-Checks -> **nur im Paper-Modus** und bei Bot AN ein Kandidat; 4/5, VETO, ABSTAIN, stale data, fehlende Sellability -> keine automatische Order.
- Positionsgrößentests: frei zwischen 50–1000; bei schwachen Kriterien kein Einsatz; 1000 nur innerhalb **aller** Risikogrenzen; mehrere Kandidaten erschöpfen Kapital nicht doppelt.
- Exit-Tests: Trend bleibt bei +15 % intakt -> keine erzwungene Komplettschließung; Trend bricht später -> simulierten Exit mit Quote und Kosten; Bot AUS -> Exit läuft weiter; Feed weg -> keine erfundene erfolgreiche Schließung.

## 7. Entwicklungsreihenfolge für Codex

1. **P0:** Windows-Start/Repository-Tests und belastbarer Paperbetrieb.
2. **P1:** neue Strategie-/Schnittstellenverträge; 5-Agenten-Quorum/Review mit synthetischen Testagenten und authentifiziertem lokalen Gateway.
3. **P2:** unabhängige Contract-/Pool-/Sellability-Prüfungen und echte Read-only-Marktfeeds.
4. **P3:** adaptive Exit-Engine und sichere dynamische Positionsgrößen einschließlich mehrerer Paper-Positionen.
5. **P4:** zeitlich korrekte Backtests/Paper-Validierung einschließlich langer Haltedauern und seltener Extremgewinne.
6. **Später separat:** Wallet-/Euro-/PayPal-Integration erst nach neuem Review und ausdrücklicher Freigabe.

**Geltungsbereich:** Nur `127027/Sniperbot-`. Hixton-Dateien, Repositories, Dots, Zeitpläne, Zugangsdaten, Konten und Infrastruktur weder lesen noch ändern.
