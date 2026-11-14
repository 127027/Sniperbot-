# R21 - Mehr-Coin-Zeitreise, 81 Zeitfenster, historische Auswertung, Engpassmonitor

Stand: 14.11.2026. Ausschliesslich TRAINING_ONLY: keine Live-, Wallet-, Bot-, signierten Orderfeed- oder bestehenden Paper-Konto-Aktionen.

## Tatsächlicher Ausgangszustand

PEPE ist bisher ein bekannter Gewinner-DIAGNOSEFALL, kein Blindtest. Letzter belegter Stand 3/62 chronologische Tage; 0 belegte simulierte BUY/SELL. Die aktuelle PEPE-Diagnosequelle enthält 31 POOL-Ereignisse, 0 SOCIAL, 0 MARKET und 0 SECURITY in den Replay-Inputs. Ohne historische ausführbare Quotes sind reale Handelsentscheidungen und ihre Gewinne nicht belegbar. Der neutrale Mehr-Coin-Blindtest bleibt NOT_STARTED.

R20 brauchte für 62 SYNTHETIC-Tage mit 310 künstlichen Rollenstimmen auf Linux rund 0,96 Sekunden. Das misst nur die Controller-Technik und weder GPT-Recherche noch Handelsqualität.

## R21-Kalender: 81 tatsächlich definierte Zeitfenster, noch 0 verifizierte Quellenbasen

r21-window-plan.mjs und r21-case-catalog.json planen 81 voneinander getrennte 62-Tage-Intervalle zwischen 2013 und 2026. Sie wurden ausschliesslich anhand des Kalenders festgelegt, niemals anhand einer Gewinnerliste. 48 Entwicklungs-, 16 Validierungs- und 17 Holdout-Fenster. Alle Fenster sind disabled und tragen neutrale IDs case_0001 usw. Die 81 Zeitfenster sind noch keine 81 beschafften Datensätze und keine 81 gelaufenen Tests.

Jeder Kandidat eines echten Tests darf nur auf Grundlage historisch belegter damaliger Informationen erkannt werden. Erfolgreiche Coins, erfolglose Coins, Rug-Pulls und NULL-Ergebnisse müssen in einem neutral und vollständig erfassten damaligen Cohort berücksichtigt werden.

## Technische Bausteine

- continuous-runner.mjs (R20): vier Forschungsrollen parallel, QA nach deren vier Entscheidungen, dann erst naechster historischer Frame. Kein Warten auf Stundenintervall, sofern ein direkter Modelladapter existiert.
- r21-catalog.mjs: Batch-Verarbeitung beliebig vieler neutraler, einzeln isolierter 62-Tage-Fenster, strikte getrennte Zeitfenster und Entwicklungs-/Validierungs-/Holdout-Splits. Externer Modelladapter erforderlich. Labels werden erst NACH vollständiger Versiegelung aller Entscheidungen gelesen.
- r21-evaluate.mjs: pro Coin BUY, ADD, REDUCE, SELL, tatsächliche SIMULIERTE Fill-Zeitpunkte, Gas, Nettogewinne und Nettoverluste, Cash, offene Positionen, PnL, Drawdown sofern alle offenen Positionen markierbar sind, übersehene Gewinner erst nach Evaluation. Eine Position ohne spätere Kursbewertung bleibt UNKNOWN, kein erfundener Verkauf.
- r21-observer.mjs: read-only Monitor der aktuellen fünf Stimmen, Fortschritts-Commits, korrekten Hashes, technischen Stalls und noch nicht bereiten echten neutralen Quellen.
- r21-case-catalog.json ist AUS DRINGENDEM GRUND deaktiviert: Kein neutraler, historisch belegter 81-Fenster-Quellkorpus und kein nachweisbar frischer, direkt aufrufbarer 5-Dot-Modelladapter verfügbar.

Die R21-CI testet eine FIKTIVE 50-Fälle-Kohorte mit kurzen rein synthetischen Daten und 500 Dummy-Rollenentscheiden. Das beweist Schema, Scheduler und Isolation, NICHT dass 50 echte Memecoins erforscht wurden.

## 15-Minuten-Bottleneck-Überwachung

Der geplante read-only GitHub-Workflow r21-replay-watch.yml liegt auf dem Standardbranch, von dem GitHub Scheduled Actions startet. Er checkt den Forschungsbranch aus und liefert pro Lauf eine Job-Zusammenfassung sowie ein herunterladbares JSON. Keine ChatGPT-Antwort oder schriftlicher Auftrag allein gilt als reale automatische Ausführung.

Mögliche Befunde:
- MISSING_ROLE_VOTES: genau die fehlende eigene Dot-Stimme schreiben lassen, nie eine künstliche Entscheidung im historischen Fall erzeugen.
- FIVE_VOTES_READY_CONTROLLER_NOT_ADVANCED: die GitHub Push-Bridge/Logs prüfen, nicht erneut den Dot nach einem bekannten Coin forschen lassen.
- DIAGNOSTIC_PROGRESS_OLDER_THAN_30_MIN: tatsächliche Job-Läufe und Verzögerungen kontrollieren; stündliche Dot-Chats bleiben ein Engpass.
- NEUTRAL_CORPUS_NOT_READY: unabhängige zeitgerechte Social-/Onchain-/Quote-Daten und saubere Modellkontexte fehlen.
- INVALID_ROLE_VOTES oder CORRUPTED_OR_UNREADABLE_REPLAY_RUN: stoppen, Integrität reparieren, nie auf einen späteren Tag springen.

Der Monitor kann Blocker automatisch erkennen und im Protokoll dokumentieren. Er wird NICHT als selbstständiger universeller Code-Reparaturagent ausgegeben. Der R20-Event-Bridge kann bereits vollständig echte Stimmen automatisch zum nächsten historischen Schritt weiterleiten. GitHub-Cron-Läufe können sich verschieben und sind nicht minutengenau garantiert.

## Lokale Befehle mit Node 22

    node research/replay-controller/r21-catalog.mjs research/replay-controller/r21-case-catalog.json
    node research/replay-controller/r21-observer.mjs . /tmp/r21-status.json
    node research/replay-controller/r21-evaluate.mjs SESSION_NAME /tmp/report.json /PRIVATE/outcomes.json

Die unabhängige Label-Datei muss ausserhalb der Rolle-/Dot-Sicht und des öffentlichen Repository liegen. Das Evaluator-Skript verweigert unreife, nicht vollständig versiegelte historische Sessions.

## Noch fehlende Komponenten

1. Mehr-Coin-Quellen für 81 Fenster (oder mindestens 50 ausreichend belegte), unabhängig von PEPE und späteren Gewinnern ausgewählt.
2. Echte, prüfbare historische Social-News/Engagement-Belege, Poolliquidität, Security, ausführbare BUY-/SELL-Quotes, Gebühren und Slippage.
3. Direkt aufrufbarer, frischer, getrennt isolierter Agentenadapter fuer alle fünf Rollen. Bestehende stündliche Dots sind Forschungsläufe, keine bereits verbundene KI-API.
4. Unabhängige Prüfung vortrainierter Gewinnerkenntnis trotz frischer Chats, gegebenenfalls maskierte Token-IDs.
5. Erst danach die reale, neutrale historische BUY/HOLD/SELL-Auswertung im isolierten Testkonto.

Keine der R21-Dateien verändert das vorhandene Paperkonto oder erlaubt Echtgeldhandel.
