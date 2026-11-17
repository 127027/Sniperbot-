# R29 V4.1 – Fortsetzung nach Abschnitt 13: unbekannte zukünftige Memecoins früh erkennen

**Abschluss dieses Entwicklungsschritts am 17.11.2026. Nur PAPER_ONLY. Keine tatsächlich ausgeführten Echtgeldgeschäfte oder nachgewiesenen Gewinne.**

## 1. Herkunft und heutiger tatsächlicher GitHub-Stand

- Nach PR #54 (vollständige Oktober-Quelle, 48h-Nachbeobachtung und postfreeze Referenz-Recall) wurde [PR #55](https://github.com/127027/Sniperbot-/pull/55) in den kanonischen Branch `codex/r29-chatgpt-github-paper-cycle-20261115` zusammengeführt.
- PR-55-Merge-Commit: `67a51e834d67ba1c1291fdec99fc85bf7a32db48`.
- Der endgültige PR-55-Head `44e626ae76f86aae7260a22ebea43c1dfa8e6130` bestand alle Windows- und Linux-Paper-Gesamttests: [GitHub Actions #44189588702](https://github.com/127027/Sniperbot-/actions/runs/44189588702), [#44189575240](https://github.com/127027/Sniperbot-/actions/runs/44189575240).
- Die Ergebnisse beweisen die **Offline-Unit- und Integrations-/Sicherheitsprüfungen der vorhandenen Anwendung**, nicht eine über Stunden live durchgelaufene persönliche Windows-Instanz oder echte Model-Provider-Handelsaufrufe.

## 2. Bestehendes System 1: Windows-Laptop und tatsächliche GPT-API

- **Einzige Startdatei** `Sniperbot_Starten.bat`. Sie ruft `runner/windows-supervisor.ps1 -WithR29 %*` auf. Damit kann die vorhandene, ausdrücklich optionale `-WithCentralAI`-Option verwendet werden; private API-Schlüssel werden einmalig in Windows DPAPI eingegeben und lokal entschlüsselt, niemals ins öffentliche GitHub gestellt. **Ein API-Schlüssel und `-WithCentralAI` sind nicht auf GitHub konfiguriert oder verifiziert. Die separate OpenAI API kann kostenpflichtig sein; eine ChatGPT-Plus-Subskription bezahlt diese API-Aufrufe nicht automatisch.**
- `runner/central-ai-coordinator.mjs` nutzte bereits vor PR55 die wirkliche OpenAI Responses-API `/v1/responses` und konnte mit einer Ed25519-ephemeren lokalen Paper-Signatur auf dieselbe bestehende Test-Guthabenbuchung reagieren. Neu: klare Frühentdeckungs-Promptziele für bislang unbekannte Mints mit gesicherter aktueller Information (Kaufdruck, Liquidität, Wallet-Risiko, Social, Narrative, News). Bekannte historische Siegernamen werden nicht als Favoriten vorgegeben.
- **Adaptive reine Modell-Analysefrequenz**: 1/6/12/24 echte *mögliche* Modellprüfungen/Tag je nach verfügbaren neu gesehenen Kandidaten, Event-Alerts und gehaltenen Positionen. Der vorhandene 24h-Laptop-Collector arbeitet unabhängig weiter. BUDGET MAXIMAL **24 API-Requestversuche pro UTC-Tag**, vor Netzwerkaufruf lokal persistiert, damit ein Neustart den Zähler nicht heimlich zurücksetzt. **Eine erfolgreiche Modellantwort wird nur gezählt, wenn der echte Providerpfad und eine valide `resp_*`-ID/Modellidentität vorliegen; Test-Proxys, Stub-HTTP oder lokale Scores zählen ausdrücklich NICHT.**
- Bei keinen eindeutigen neuen Kandidaten kann ein ausdrücklich aktiviertes GPT einmal am Tag `NO_TRADE`/leere `choices` selbst begründen – keine lokale Verkaufs- oder Kaufverpflichtung.
- **Frühe Forschung trotz geringer Liquidität**: `snapshotForAi` behält zusätzliche bis zu 40 *frische* subthreshold Mints (vorher unter 25.000 USD Liquidität oder 1.000 USD 5-Minuten-Umsatz vom Modell abgeschnitten) als `research_candidates`. GPT darf über sie `WATCH` oder `NO_TRADE` entscheiden. Die lokale `planRecommendations`-BUY-Kontrolle akzeptiert ausschließlich die normale risikoberechtigte `candidates`-Menge und blockiert selbst bei Modellscore 99 jede BUY-Order eines `research_candidates`-Coins. **Technische Quoten bleiben Modell-Forschung, niemals Empfehlung zum ungeprüften Handel**.
- **Nur eine Paper-Strategiequelle**: `runner/windows-supervisor.ps1` setzt bei `-WithCentralAI` und bereits vorhandenem lokalen DPAPI-API-Key `SNIPER_GPT_PAPER_BRIDGE=0` und übergibt dem separaten GitHub-Marktkurier `SNIPER_R29_GPT_SOURCE=LOCAL_OPENAI_API`. `runner/r29-windows-courier.mjs` blockiert daraufhin parallel eintreffende GitHub-GPT-Paper-BUYs/SELLs; er bleibt stattdessen für Marktberichte, Nachrichten und Positionsstatus im Einsatz. Im ursprünglichen GitHub-ChatGPT-Strategiemodus ohne lokale API bleibt die getrennte GitHub-Funktion bestehen. Nie zwei Strategen für ein Paper-Konto.
- Das vorhandene Modell liefert `BUY/HOLD/SELL/WATCH/NO_TRADE`, ein signierter autorisierter `BUY/SELL` muss danach unverändert durch alle bestehenden Live-Paper-Quote-/Pool-/Honeypot-/Risikogates. ***Es wurde in diesem Entwicklungsschritt weder ein echter API-Provider-Aufruf ausgelöst noch ein eigener Laptop-/Wallet-/Paper-Ledger verändert.***

## 3. Historisches System 2 – getrennt von Laptop

- Weiterhin benötigte historische Quellen: zehn voneinander unabhängige Testperioden je **7 Tage Vorbereitung + 10 Tage Handel**, zuerst 7 Entwicklungsperioden, danach 3 unangetastete Holdouts; jede Testperiode 5.000 TEST-USDC, ohne bekannte Gewinner im historischen GPT-Input. Die 67 aufgezeichneten Original-Tage und 43 Minutentage reichen nicht für alle zehn Tests; es fehlen historisch realistische bidirektionale ausführbare Buy/Sell-Quotes und tatsächliche providerbestätigte Modellentscheidungen.
- Neuer ausschließlich **POST-FREEZE**-Audit `research/replay-120d-real/r29-postfreeze-unknown-winner-audit.mjs` erfasst Zeitpunkt erster behaupteter GPT-WATCH-/BUY-/SELL-Reaktion, Zeitverzug zur ersten unabhängigen Quelle, Kursanstieg VOR GPT-BUY, noch beobachtetes Spitzenniveau NACH BUY, Ausstiegs-Timing und unzureichende Fill-Evidence. Dieses Modul darf **nie** nachträgliche Coin-Gewinnerlisten in historische GPT-Entscheidungen zurückspielen. Es setzt `realized_net_pnl_test_usdc` bei bloß eingereichten Quotes/Receipts konsequent `null`; deklarierte Szenarien sind ausdrücklich nicht extern bestätigt.
- Die echten Live-Paper-Order-Risikolimits werden nicht durch Forschung verändert; keine Backtest-Funktionen im Laptop-Dashboard.

## 4. Dauerhafte maschinenlesbare Strategieerfahrungen

- `research/r29/strategy/validated-knowledge.json` ist absichtlich leer (`entries=[]`): **bisher null unabhängig nachgewiesene allgemeine profitable GPT-Früherkennungsregeln**. Historische Sieger wie MAX, AMD, MAMESUKE, PIERRE und FTR gehören ausschließlich in gesperrte Operator-/POSTHOC-Berichte, niemals als trainierte Regel in einen unverbrauchten historischen Blindtest.
- `runner/r29-strategy-knowledge.mjs` lädt aus diesem bestehenden R29-Projektbereich nur `INDEPENDENTLY_VALIDATED` allgemeine Regeln, mindestens zwei getrennte Holdout-IDs und zwei Evidence-Digests, mit `last_training_event_utc` und `validated_at_utc` BEIDE vor dem Simulationszeitpunkt. Direkte Mint-Contracts/URLs/bekannte Gewinnernamen im `general_rule` werden gesperrt. Keine externe kryptographische Authentifizierung von bloß behaupteten Evidenzfeldern – die Evidenz muss vor einer Freigabe zusätzlich unabhängig geprüft werden.
- Hypothesen, Entwicklungsbeobachtungen, widerlegte und nicht belegte Merkmale dürfen als **Operator-Research-Daten** erhalten bleiben, nicht automatisch Modell-Strategie werden. Der echte GPT-Aufruf kann später zulässige allgemeine Regelversionen automatisch laden; im historischen Test gilt ausschließlich dessen virtuelle Uhrzeit.

## 5. Nachweise und Fehlversuche

| Prüfung | Ergebnis |
|---|---|
| PR #54: vollständige historische 821.849 originale Starts + 2.296.466 Minutenereignisse | BESTANDEN, dokumentiert in `R29_V4_1_OCT_REAL_SOURCE_408_FRAMES_VERIFIED_20261117.json` |
| PR #55: zuvor bestehendes Paper-/API-Basissystem | BESTANDEN Windows/Linux auf letztem PR-Head |
| 1/6/12/24 adaptive Modellintervallplanung | BESTANDEN Offline-Test |
| 24 API-Versuche pro UTC-Tag auch nach Modell-Neustart | BESTANDEN Offline-Test |
| Mock/Stub-HTTP darf nicht als echte GPT-Providerantwort zählen | BESTANDEN Offline-Test |
| Nur GPT-Strategie, Paper-Signatur, technische Quote-/Risk-Gates | BESTANDEN vorhandene Tests und neue Trennungsprüfungen |
| Subthreshold-Frühcoin wird WATCH-Recherche, aber kein BUY | BESTANDEN Offline-Test |
| Unabhängige as-of-Knowledge-Regeln ohne spätere Gewinner | BESTANDEN Offline-Test |
| Postfreeze: vor BUY bereits beobachteter Preisanstieg, nach BUY verbliebenes Peak, kein erfundener PnL | BESTANDEN Offline-Test mit künstlichen Fixtures |
| Reale auf dem Nutzer-Laptop laufende stündliche/24h OpenAI API Calls | NICHT GEPRÜFT; lokales Opt-in/geschützter Key fehlt aus dieser GitHub-Sicht |
| 10 reale historische GPT-Handelsbacktests und profitable neue unbekannte Coins | NICHT GEPRÜFT; Daten und Ausführungsbeweise fehlen |

Zwischenzeitliche CI-Fehler wurden **nicht verdeckt**: ein negativer Knowledge-Test nutzte zunächst eine zu kurze Test-ID (`r29_rule_onlyone`), die korrekt vom Namensschema abgewiesen wurde; der Test wurde auf eine gültige ID korrigiert. Eine erste neue Provider-ID-Prüfung erforderte zudem eine passende fiktive Test-Response-ID. Der endgültige PR #55 Stand ist nach Korrektur auf beiden OS grün. Die langfristige Strategie-Learning-Policy wurde dadurch nicht geschwächt.

## 6. Nächster Chat – zuerst diese Dateien lesen

1. `SNIPERBOT_R29_START_HERE.md` – Projekteinstieg, POSTHOC-Warnung.
2. `research/r29/operations/R29_LATEST_CHECKPOINT.json` – finaler aktiver Status, letzte Commits und wichtigste nächste Aufgaben.
3. `research/r29/operations/R29_V4_1_GITHUB_ERFAHRUNGEN_NAECHSTER_CHAT_20261117_DE.md` – alle älteren CI-Root-Cause- und blindtest-bezogenen Erkenntnisse plus Verweis auf dieses Dokument.
4. `research/r29/strategy/R29_V4_1_GPT_UNKNOWN_WINNERS_TWO_SYSTEMS_DE.md` – neue Zweiteilung und reale API-Voraussetzungen.
5. `research/r29/strategy/validated-knowledge.json` – nur tatsächlich unabhängige as-of validierte Regeln; zurzeit leer.

**Unmittelbar nächster wichtiger Schritt:** Auf dem realen Laptop mit Einmal-Opt-in und bewusst akzeptierten API-Kosten den bestehenden `Sniperbot_Starten.bat -WithCentralAI`-Pfad prüfen, indem ein ECHTER Modellaufruf, Request-ID, GPT-WATCH/NO_TRADE und sichere Paper-Replay-/Receipt-Kette über mehrere normale Marktläufe nachgewiesen werden. Dann früh unbekannte mögliche Memecoin-Chancen anhand aktueller lokaler Marktereignisse prospective bewerten, unabhängig zeitgestempelte Kriterien festhalten und erst nach ihrem Ausgang unbekannte Erkennung/Recall/False-Positive/Netto-Performance auswerten. Keine Echtgeld-Swaps.
