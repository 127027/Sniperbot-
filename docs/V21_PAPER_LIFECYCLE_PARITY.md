# V0.21 – Paper-Lifecycle und Live/Paper-Parität (Entwicklungsanfang)

Stand 12.11.2026. Branch `codex/v21-paper-lifecycle-evidence-20261112` basiert auf V0.20. **Nur neue, isolierte Policy-Funktionen und Tests, nicht auf dem Laptop installiert.** Kein Echtgeld, keine automatischen neuen Orders, keine Veränderung gespeicherter Konten.

## Wichtige Produktkorrektur
Gesucht werden NEUE/kleine virale Memecoins unmittelbar nach originalen öffentlichen Meme-/Promi-/Politik-Ereignissen – nicht DOGE als heutiger Trading-Kandidat. Recherche muss First-Seen-Timestamps, Chain+Mint+Pool, unabhängige Social-/Onchain-/Risikoquellen, mögliche Kauf- UND Verkaufsroute sowie negatives Evidenzmaterial enthalten. Teurer oder billiger Stückpreis allein besagt nichts über das Steigerungspotenzial.

## Erster implementierter Baustein
`runner/paper-lifecycle-policy.mjs` stellt zwei pure, **nicht ausführende** Funktionen bereit:

1. `suggestPaperAllocation()` berechnet den Vorschlag als Prozent des **nach offenen Positionen und Cash freien** TEST-USDC-Budgets; nicht als Sicherheit oder Erfolgswahrscheinlichkeit. Beispiel 500 TEST-USDC maximal gebunden, erste Position 50 und freies Cash 450 → 100 % dieser aktuell freien Reserve schlägt 450 vor, sofern unabhängige Risk-/Sellability-Prüfungen bejaht wurden und Pooltiefe auch eine kleine Positionsquote zulässt. Die Beispiel-Regel 0,5 % der Liquidität ist **nur ein Forschungslimit**, keine ausführbare Quote und keine Empfehlung, alles einzusetzen. Nie ohne die finalen lokalen Limits ausführen.
2. `assessStagnation()` fordert mindestens 48h Haltezeit, überprüfbare Beobachtungen über mindestens 24h, mindestens sechs Stunden Abstand, frische Preise und unabhängig bestätigte Käufer-/SELL-Routen-Belege. Fehlende Daten, neue Käuferdynamik oder steigender Kurs => KEINE Exit-Freigabe. Ergebnis höchstens `EXIT_REVIEW`, **kein automatischer SELL**. Nichts kann sicher beweisen, dass ein Coin nie mehr steigen wird.

Zu beiden Funktionen sind Node-Tests im Repo enthalten. Sie müssen in CI ausgeführt werden; erfolgreiche Tests wurden zum Zeitpunkt dieses Dokumentes nicht bestätigt.

## Paritätsregel: gemeinsamer Entscheidungsweg, unterschiedliche tatsächliche Fills
Paper und Live sollen später denselben Intake, gleichen Signaturprüfer, die gleichen Marktdaten-/Risikogates, identische Positionsidentitäten, Kapitalgrenzen, Orderabsichten und Exit-Policies verwenden. **Ein bloßer Schalter erzeugt niemals Ausführungsparität:** Reale Trades können wegen Gas, Liquidität, Slippage, MEV, Chain-Fehlern, Gebühren, Latenz oder fehlender Gegenpartei scheitern. Für Paper soll ein realitätsnaher Quote-/Fill-Simulator mit Marktsnapshots und Fehler-/No-Fill-Zuständen entwickelt werden. Live braucht einen gesonderten autorisierten Execution-Adapter mit Wallet-/Payment-/Custody-Sicherheit, und ist aktuell LOCKED.

## Noch offene Integrationen (nicht fälschlich als abgeschlossen markieren)
- Die Policy-Funktionen sind **noch nicht in `runner/server.mjs` oder `paper-agent-pipeline.mjs` eingebunden**.
- Quoten-Vorschläge sind noch keine signierten Trade-Aufträge. Die fünf Cloud-Dots liefern Research-Informationen; der reale Signer fehlt.
- Die bestehende V0.20-Budgetkonfiguration (`maxTrade`/`portfolioBudgetUsdc`) ist ein **Gesamt-Exposure-Limit**, während der Nutzer künftig zusätzlich unabhängige **per-Trade-Min-/Max-Grenzen** wünscht (z.B. 50–500). Diese Semantik darf nicht heimlich geändert oder bei alter lokaler Kontodatei uminterpretiert werden. Versionierte Migration und UI-Umstellung sind nötig.
- Für echte frühzeitige Hype-Entdeckungen ist stündliches Dot-Polling zu langsam; ein resilienter 24/7-Collector und robuste, abonnierbare Datenanbieter sind nötig.
- Es gibt bislang keinen historisch belegbaren Early-Hype-Trade-Backtest mit vollständigen Gewinner-/Verliererkohorten; die Excel-Datei ist ausschließlich ein Katalog mit ausgewählten historischen Fällen und Kursdaten, nicht ausreichend für belastbare as-of-Tests.
- Zeit-Exit mit Preissnapshot ohne tatsächlich verkaufbare Quote darf keine fiktiv gesicherte Auszahlung anzeigen.
- Die aktuellen 5.000 TEST-USDC liegen ggf. im privaten lokalen State; **nicht aus GitHub als realen Kontostand behaupten**.
- PayPal- und echte EUR-to-chain-Umtauschsysteme sind nicht verbunden. Echtgeld bleibt backendseitig gesperrt.
- Keine Änderung an `main`, bestehendem V0.20-PR, Cloud-Automationen, privaten Daten und Hixton.

## Nächste Engineering-Schritte
(1) Getrennte, versionierte per-Trade- und Portfolio-Limits, (2) Quote- und Timestamp-Historie mit Liquiditäts- und Verkaufsquoten sowie dauerhaftem Ledger, (3) signierte Entscheidungs-Kette inklusive unabhängiger Risikoprüfung, (4) begrenzte automatische Paper-Exits und realitätsnahe Kauf-/Verkaufsfills mit Fehlerzuständen, (5) vollständiger Blind-Replay/Negative-Kohorten, (6) erst nach Abnahme ein gesonderter Live-Execution-Adapter.
