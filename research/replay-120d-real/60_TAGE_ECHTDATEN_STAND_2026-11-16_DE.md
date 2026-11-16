# R29 – 60 Tage Real-Backtest: tatsächlicher Abdeckungsstand

**Erfasst am 16. November 2026.** Repo: `127027/Sniperbot-`. **Research / PAPER_ONLY, kein Echtgeld, keine Veränderung am laufenden Paper-Konto.**

## Was ist bisher wirklich vorhanden?

Der gewünschte **eingefrorene 60-Tage-Handelstest** läuft vom **18.09. bis einschließlich 16.11.2026**; die davorliegenden 60 Tage (20.07.–17.09.2026) dienen als **Training / historische Beobachtung**.

| Belegart | Handelstage mit Quelle | Geltungsbereich und Nachweis |
|---|---:|---|
| Tatsächlich erfasste neue Solana-Mints | **49/60** | 18.09.–05.11., tatsächlicher neutraler historischer Tokenstartkatalog (retrospektive Aufzeichnung), kein Kauf |
| Damals im Minutentakt gespeicherte Blockchain-/Risikofeatures | **36/60** | 24.09.–29.10.; **4.702.805** echte Feature-Zeilen, SHA-256-geprüfte Parquet-Quelldateien, **864** stündlich versiegelte Beobachtungsfenster |
| Vorab neutral ausgewählte Coin-Beobachtungen in diesen Frames | **6.912 Beobachtungen** | jeweils die ersten acht unterschiedlichen Mints je Stunde, aus tatsächlich beobachteten Zeilen; wiederholte Mints in verschiedenen Stunden möglich; **keine GPT-Modellaufrufe** |
| Vollständige freie tägliche DEX-Swap-/Fehlversuch-Historie inkl. 48 neutraler Mints | **1/60** | 15.10.2026, **42.230.410** Swap-/Fehlversuchszeilen insgesamt; **28.112** Ereignisse für vorab neutral gewählte 48 Mints |
| Verifizierte Contract-/Sellability-/Historie der eigenen handelbaren USDC-Ein- und Ausstiegsquotes | **0/60 vollständig** | Aktuell keine nachgewiesene 60-Tage-Bewertungsbasis |
| Wirkliche retrospektive GPT-BUY/HOLD/SELL-Paper-Ausführung für alle 60 Tage | **0/60 vollständig** | Null ist eine Aussage über fehlende Ausführungsbeweise, **keine** damalige strategische `NO_TRADE`-Entscheidung |
| Seriöser 60-Tage-Gesamt-Paper-Gewinn aus der GPT-Strategie | **unbekannt** | P&L darf nicht durch erfundene Trades, Kurse oder Slippage ergänzt werden |

**Maschinenlesbare vollständige Tagesliste:** `research/replay-120d-real/results/REAL_60_DAY_EVIDENCE_MATRIX_2026-11-16.csv`. Jede der 60 Zeilen enthält historische Launch- und Feature-Anzahl, SHA-Prüfsummen, unbekannte Tage und den separaten Belegstatus von Transaktionen und GPT-Orders.

## Warum die 36 Tage mit Minute-Features wichtig sind

Die kostenlose rückblickend publizierte `features`-Quelle enthält von einem tatsächlich betriebenen Solana-Capture einst gespeicherte Merkmale zu Uhrzeit `t`, etwa bis dahin gebuchte Käufe, Creator-Historie, Curve-Reserven, vorher bestehende Insider-/Wallet-Verknüpfungen und Markierungen. Diese Eingaben sind zeitlich näher an der damals möglichen Recherche als später erstellte Preischarts.

Die eigens implementierte `real-minute-feature-replay.py` prüft die SHA-256-Prüfsumme **jedes der 36 Roh-Parquets** gegen das **auf denselben Commit gepinnte** README-Manifest, lädt ausschließlich eine explizite Whitelist historisch erklärter Merkmale und gibt acht neutrale Kandidaten pro Stunde nach dem ersten tatsächlichen Auftreten an einer Stunden-Grenze frei. Je Input-Frame steht: `historical_gpt_model_calls=0`, `paper_orders=null`. Kein späteres Rug-Label, Migrations-Zeitpunkt, endgültige Preisspitze, `labels_as_of` oder nachträglich korrigierter `flag_curve_drained` darf GPT-Eingabe werden.

**Quelle (öffentlich, CC BY 4.0):** https://huggingface.co/datasets/loopholetape/pumpfun-launches , Konfiguration `features`, Source-Revision `9b9a04e7e3e85775d614d16105daad2e69ce8544`.

**GitHub-Actions-Evidenz der 36 Tage mit endgültig verschärfter Whitelist:** https://github.com/127027/Sniperbot-/actions/runs/43939827509 ; vollständiges Download-Artefakt https://github.com/127027/Sniperbot-/actions/runs/43939827509/artifacts/14260833554 . Alle 36 SHA- und Zeilenzählungen sowie die fünf Leakage-Regressionstests bestanden. Das vom Provider später nachgebesserte Feld `flag_curve_drained` wurde ebenfalls aus dem historischen Input ausgeschlossen.

## Warum dies noch kein echter 60-Tage-Handelstest ist

Die `features`-Quelldateien enthalten auch **später angehängte** `rugged`, `graduated`, `peak_rs`, `labels_as_of` und weitere Outcomes. Diese Felder dürfen in historische Entscheidungseingaben *nicht hinein*. Die reale Verfügbarkeit der erst später publizierten Quelldateien beweist zudem nicht, dass GPT sie damals tatsächlich abrufen konnte. Ein heute rückblickend erstellter GPT-Entscheid ist ebenfalls **nicht identisch** mit einem damals ausgeführten GPT-Modellaufruf.

Die **6.912** beobachteten Kandidaten sind **keine 6.912 Käufe** und sagen nichts über einen USDC-Gewinn aus. Das Quellsignal `f_rs` (Curve-Reserve) ist nicht dasselbe wie eine zum jeweiligen Zeitpunkt tatsächlich ausführbare individuelle BUY-/SELL-Quote in USDC. Käuferdiversität, Contract-Kontrolle, Liquidity, Slippage, Fees und der tatsächliche lokale `PAPER_FILLED`-Nachweis bleiben separate Pflichtprüfungen.

Der historisch dokumentierte **Binance-Schatten-Preisalgorithmus** hatte in beiden bisherigen Varianten negative indikative Ergebnisse. Das sind **modellierte Preis-Trades rückblickend bekannter Coins**, **keine** echten historischen GPT-DEX-Fills und kein gültiges Ergebnis dieses neuen Testplans.

## Wie geht es technisch weiter?

1. **36-Tage-Signalhistorie** als unabhängige zeitgebundene Vorstufe integrieren: historische Kandidaten aus den Quellen, darunter absichtlich auch nie erfolgreiche Launches. Nicht anhand späterer Sieger auswählen.
2. **Fehlerprüfung und Kandidatenlernen**: Spätere Outcomes erst nach der ursprünglichen Entscheidung in einem separaten Quelljournal anfügen; Fälle `UNKNOWN` von tatsächlich später gestiegenen Kandidaten unterscheiden; Einblicke dürfen nur neue Forward-/Paper-Testperioden beeinflussen.
3. **Echte ausführbare individuelle Swap-Folgen und Sicherheitsbelege beschaffen**: Der kostenlose 15.10.-Tag liefert echte Transaktionen anderer Wallets, keine eigene USDC-Execution; den 60-Tage-Katalog bei belegter weiterer Datenverfügbarkeit erweitern.
4. **GPT wirklich auf isolierten Frames entscheiden lassen**, jeden real durchgeführten Modellaufruf mit aktuellem Ausführungszeitpunkt, virtueller Zeit und Quellhash archivieren; den späteren Verlauf erst **danach** prüfen.
5. **P&L nur nach legitimer Paper-Ausführungsmodellierung** mit dokumentiertem Kapital, Poolpreisen, Gebühren, Gas, Slippage, tatsächlicher Sellability und offenen Positionen ausweisen. Kein Echtgeld.

**Priorität bleibt: erkennbare und dokumentierte Marktentscheidungen, Fehlentscheidungen, unerwartet steigende WATCH/NO_TRADE-Coins, und ein tatsächlicher sicherer Paper-BUY → HOLD → SELL-Receipt-Kreislauf, nicht ein künstlich positives Ergebnis.**
