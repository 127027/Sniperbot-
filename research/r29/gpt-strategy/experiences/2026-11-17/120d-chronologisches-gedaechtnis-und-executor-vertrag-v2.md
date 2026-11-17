# R29 Erfahrungsprotokoll V2: 120 Tage chronologisch, GPT im Zentrum

**Erstellt 17.11.2026 · Research/PAPER_ONLY · keine echte Order.** Der Nutzer hat den Ablauf ausdrücklich erklärt. Diese Akte ist eine **künftige Verfahrensregel**, keine behauptete erfolgreiche KI-Lerngeschichte.

## A. Exakte virtuelle Zeitachse

- Tag **120** = **20.07.2026**. Beginne ohne späteres Wissen. Pro Check alle Belege gegen ihren **Eventzeitpunkt UND damaligen Veröffentlichungs-/Verfügbarkeitszeitpunkt** prüfen.
- Tage **120 bis 61** = **20.07.–17.09.2026**: 60 Tage lernen. Spätere Ergebnisse von Tag 120 dürfen erst verwendet werden, sobald sie an einem nachfolgenden virtuellen Datum beobachtbar geworden wären. Keine künftigen Rug-/Hype-/ATH-Informationen.
- Tag **60** = **18.09.2026**: Beginn des eingefrorenen 60-Tage-Handelstests mit 5.000 TEST-USDC als gesondertem historischen Versuchskonto. Tage **60 bis 1** = **18.09.–16.11.2026**. Offene Positionen müssen an jedem Folgetag weitergeführt werden; ein neues Tagesdatum startet **kein** neues Konto und löscht **keine** Positionen.
- Nach dem historischen **16.11.2026**: Vorbereitung auf den künftigen Echtzeit-Paper-Betrieb; nicht im selben Replay ohne ausdrückliche zusätzliche Prüfung reale Orders oder Echtgeld freischalten.

## B. Die fünf zentralen GPT-Verantwortungen

1. **RESEARCH:** Beim ersten Check des Tages und bei jedem leichten Stunden-Wecklauf selbst entscheiden, ob 1, 4, 12 oder 24 vollständige Analysen am Tag angezeigt sind. Stufe kann *innerhalb desselben Tages* revidiert werden. Ein Beispiel: 00:00, 06:00, 12:00 bei 4/Tag, dann neuen Hype entdecken, auf 24/Tag wechseln → um 13:00 wieder Vollscan möglich. Höchstens ein GPT-Vollscan pro UTC-Stunde und höchstens 24/Tag. Nur tatsächlich durchgeführte GPT-Scans zählen als solche.
2. **BUY:** Neue kleine Memecoins ohne Gewinner-Vorauswahl entdecken. Nur auf der exakten Chain:Token:Pool-Identität und realistisch ausführbarer Quote plus validierter Sicherheitslage nachweisen. GBP/EUR/SOL→USDC Umwandlungen sind technische Arbeit des Bot-Executors, nicht frei erfundene 1:1-Kurse. GPT wählt Notional von 50 bis 5.000 TEST-USDC, aber **nur innerhalb des vom Executor bestätigten privaten aktuellen Limits**.
3. **HOLD:** An allen relevanten späteren virtuellen Zeitpunkten eigene bestätigte offene Positionen erneut prüfen – Käuferentwicklung, LP, Preis, Social, Exit-Möglichkeit, offene Gebühren. Eine fehlende Quote wird als UNKNOWN und blockierter Ausstieg erfasst, nicht als kostenloses HOLD mit garantiertem Schlusskurs.
4. **SELL:** GPT trifft die Exit-Entscheidung, der Bot prüft/führt nur aus, Rückwandlung und tatsächliche Gebühren/Slippage protokollieren. Ein synthetisches Price-Only-Match ist keine erwiesene DEX-Ausführung.
5. **NO_TRADE/WATCH:** Bei Nichtkauf ebenfalls eine überprüfbare Entscheidung mit Beobachtungsgrund sichern. Den späteren +75%- oder 10×-Anstieg separat auditieren; ein späterer Preis-Pump ist ohne damalige Exit-Liquidität kein nachgewiesener verpasster Gewinn. Der Fehler kann **im Nichtkauf** oder **im unnötigen Kauf**, im **zu frühen/späten Verkauf** oder bei **riskantem HOLD** liegen.

## C. Daten, Gedächtnis, Versionierung

Für jedes **echte Modell-Decision-Transcript**: tatsächliches `model_called_at_utc`, virtuelles `virtual_asof_utc`, Prompt-/Source-SHA, neutral beobachtete Kandidaten, alle bisherigen dem Zeitpunkt nach verfügbaren Lessons, Chain/Token/Pool, `BUY/WATCH/HOLD/SELL/NO_TRADE`, Entscheidung/Unsicherheit, Bot-Kapazität, tatsächliche Order-Quittung oder DATA_GAP. Die Hashes und Zeitachsen dürfen nicht rückwirkend überschrieben werden.

Ein separater, **nachfolgend veröffentlichter** Outcome-Eintrag enthält echtes späteres Ergebnis, bekannte Fills, fehlende Quotes, warum eine vorherige Entscheidung eventuell schlecht war. Änderungen der Research-Policy erfordern Version, Aktivierungszeitpunkt, Begründung und neue **unberührte** Forward-Testdaten; nicht rückwirkend einen schon gesehenen 60-Tage-Holdout optimieren und dann als unabhängigen Gewinnnachweis bezeichnen.

Der lokale Bot ist **Memory + Executor, kein Trading-Gehirn**. Aktueller öffentlicher Positionskontext `research/r29/channel/gpt-paper-context.json` veröffentlicht bewusst **keine privaten Kontowerte**. Die neue reine lokale Hilfsfunktion `runner/gpt-paper-capacity-report.mjs` kann aus dem lokalen Paper-Zustand eine **private** GPT-Nachricht mit `minimum_approved_buy_test_usdc=50` und tagesaktuellem `maximum_approved_buy_test_usdc` (z.B. 4999) erzeugen. Eine solche private, authentifizierte Transport-/Acknowledgment-Strecke ist noch **NICHT** end-to-end implementiert oder in GitHub veröffentlicht. Keine Wallet-/PayPal-Schlüssel, Kontonummern, Echtgeld-Beträge im öffentlichen Repo.

## D. Gegenwärtiger nachgewiesener Datenstand

Dauerhafte 120-Tage-Datenmatrix: `research/replay-120d-real/results/R29_120D_GPT_WALKFORWARD_SOURCE_READINESS_20261117.csv`, abgeglichen aus zwei vorhandenen SHA-geprüften Quellmatrizen.

- **Training:** 18/60 Tage neutrale historische Solana-Tokenstarts; **42/60 Tage** fehlen bei diesem Anbieter. **0/60 Tage** vollständige nachgewiesene historische Minuten-/DEX-/News-/GPT-Haltezyklen.
- **Holdout:** 49/60 Launch-Tage; 43/60 Minutenfeature-Tage; 1/60 vollständiger Drittwallet-Swap-Tag; **0/60** vollständig nachgewiesene GPT-DEX-BUY/HOLD/SELL-/PnL-Tage.
- Die nachträglich veröffentlichte Originalquelle erfüllt zwar den **Event-Zeitfilter**, aber **nicht** ohne Weiteres die Bedingung, dass dieselbe Datei dem GPT zur damaligen Zeit schon öffentlich zugänglich gewesen wäre. Der aktuelle strenge Controller gibt deshalb `RETROSPECTIVE_CAPTURE_NOT_PROVEN_REALTIME` bzw. `SOURCE_NOT_YET_PUBLISHED_AT_DECISION` zurück.
- Der 513-Scan-Lauf vom 17.11.2026 war nur ein **von GPT formulierter deterministischer Research-Proxy**, keine 513 eigenständigen GPT-Modellaufrufe.

## E. Echtgeld / PayPal ist ein eigener späterer Freigabeschritt

**Dieser Auftrag aktiviert kein Echtgeld.** Der User möchte später selbst via PayPal einzahlen/auszahlen und das echte Guthaben handeln lassen. Dafür braucht es einen explizit ausgewählten und technisch/legal zulässigen Zahlungs-/Onramp-/Offramp-Anbieter, unterstützte Länder/Identitätsprüfungen, bestätigte FX- und Krypto-Swap-Ausführung, sichere Wallet-Verwahrung, Benutzerfreigabe und separate echte Sicherheits-/Risikotests. Aus der Erwähnung „PayPal“ folgt **nicht**, dass der lokale Bot schon eine funktionierende PayPal↔USDC↔Memecoin-Ausführung besitzt. Niemals ohne neue gesonderte Nutzerfreigabe testen oder Geld bewegen.

## F. Nächste Arbeitseinheit (kein neues GO erforderlich)

1. Fehlende 42 Trainingstage mit kostenfreien Quellen untersuchen und Original-Timestamp-/Quote-Qualität prüfen.
2. Den vorhandenen 18 Trainingstagen und 43 Holdout-Minutenframes echte unabhängige Pool-/Security-/Social-/Execution-Daten zuordnen. Quellenkennungen nicht mischen; dieselbe Pooladresse, Quote-Mint und Chain.
3. **GPT selbst** erzeugt und archiviert echte retrospektive Entscheidungsprotokolle auf versiegelten Inputs; eine definierte GPT-Forschungspolitik ohne Modellaufrufe gilt nur als Vergleich.
4. Erst echte verfügbare historische BUY→HOLD→SELL-Daten erlauben überprüfbaren PnL; UNKNOWN bleibt UNKNOWN.
5. Mögliche neue Verlustreduktions-Hypothesen getrennt archivieren und zuerst unabhängig testen, nicht den eingefrorenen 60-Tage-Holdout nachträglich „zum Plus machen“.
