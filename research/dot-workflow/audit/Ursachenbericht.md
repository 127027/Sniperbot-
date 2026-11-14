# Ursachenprüfung der fünf Sniper-Dots – 13.11.2026

## Ergebnis

Der gewünschte Ablauf „entdecken → gemeinsam prüfen → entscheiden → Paper-Handel“ war im untersuchten Test nicht eingerichtet. Die fünf stündlichen Aufgaben produzierten überwiegend getrennte Forschungsberichte. Änderungen am Zeitplan und ein gemeinsamer lesbarer Datensatz haben diese fehlende Verarbeitungskette nicht ersetzt. Auch die vom Master erteilten Chat-only-Anweisungen haben die Lücke verursacht.

## Nachgewiesene Ursachen

1. **Widersprüchliche Aufträge.** Scout/Social durften laut direkt ausgelesenen Prompts weder aktuelle Kandidaten suchen noch Watchlist/strukturierte Kandidaten/Orders ausgeben. Social sollte „Ergebnisse zunächst nur im zugehörigen Chat; KEINE GitHub-Dateien“ liefern. Historische Testdaten dürfen weiterhin nicht als aktuelle Handelssignale dienen; der Fehler war, diese begrenzte Testkonfiguration als Fortschritt eines operativen Gesamtsystems zu behandeln.
2. **Kein fortgeschriebener Arbeitsstand.** Alle fünf Rollen meldeten keinen belegten eigenen Forschungs-Commit für diesen Test. Scout sollte mit dem „frühesten noch nicht ausreichend geprüften UTC-Tag“ fortsetzen. Weil vollständige Social-Abdeckung fehlt, blieb dies immer wieder14.03.2023. Das ist eine durch die Anweisung erzeugte Wiederholungsschleife.
3. **Keine belegte strukturierte Rollenübergabe.** Alle fünf meldeten KEINE nachgewiesene eigene Kandidatenübergabe. QA konnte Chats prüfen, aber ein gemeinsamer Kandidat mit versionierten Einzelprüfungen und Empfangsbelegen fehlte. Ein von mir bereitgestellter statischer Commit ist noch keine selbstständige Kommunikation der Rollen.
4. **Falsch eingeengtes Entdeckungsziel.** Scout und Social verlangten Hinweise vor Deployment/Poolstart. Der Nutzer verlangt mögliche Gewinner vor dem späteren Ausbruch; eine Entdeckung nach Poolstart kann dafür zulässig sein. Authentische Zeitgrenzen bleiben erforderlich, eine allgemeine Vor-Deployment-Pflicht nicht.
5. **Auswertungsfehler trotz vorhandener Daten.** Das Techniklabor meldete fehlende owner/limited-Werte. GitHub-Blob80058ea9ca10f9de8f251637a9d0d64faaf55c6f enthält sie jedoch in Zeilen678–687: beide null, Tagesendblock17048771. errors=[]; rpc_fallback=true. Der alte Blockscout-Rate-Limit-Fehler ist separat gespeichert. Diese Felder wurden lokal UND mittels gezieltem GitHub-Zeilenabruf bestätigt. Daraus folgt keine Freigabe früherer Zustände, Blacklists oder LP-Rechte.
6. **Ungeeignetes Erfolgskriterium.** Ein Scheduler-Status completed bedeutete lediglich, dass der Lauf beendet wurde. Social bestätigte für einen abgeschlossenen Lauf0Quellenabrufe. Techniklabor wiederholte dieselben3Dateien, ohne verpflichtende neue Prüffrage. Das war kein verifizierter Forschungsfortschritt.
7. **Kein Strategiebacktest.** research/pepe-replay-2023/replay.py setzt decision='NO_BUY' für jede Zeile, ohne einen Kaufentscheider auszuwerten. Die62Tagesstände sind echte Datenrekonstruktion, aber0Käufe sind kein gemessenes Strategieergebnis. Es fehlen Einstiegsregel, hypothetische Positionen, kostenabhängige Ausführung und Exit-Regeln im Test.
8. **Ausführungskette unvollständig.** Der öffentliche signierte Orderfeed ist erreichbar, enthält aber0Signale (published_at2026-11-11T08:00:00Z). In der untersuchten Entwicklungsfassung blockiert paper-agent-pipeline.mjs:98 externe Ausführung ohne unabhängige Validierung. Funktionierende synthetische Transporttests ersetzen diesen fehlenden realdatenbezogenen Teil nicht. Die laufende Laptop-Installation wurde in dieser Untersuchung nicht verändert oder als identisch mit dieser Entwicklungsfassung vorausgesetzt.
9. **Echte verbleibende Datengrenzen.** Eine Gewinnerliste enthält keine vollständigen damaligen Social-Feeds, Interaktionszeitreihen, erfolglosen Vergleichskandidaten oder ausführbaren historischen Quotes. Selbst korrekte Arbeitssteuerung erzeugt diese Informationen nicht. Historische Fallprüfung ist keine kalibrierte85%-Prognose.

## Unmittelbare Reparatur

Auf dem isolierten Forschungsbranch codex/dots-pepe-replay-20261113 existiert jetzt research/dot-workflow/PROTOCOL.md mit eigenen Zustandsdateien pro Rolle, unveränderlichen Ergebnisdateien, Versionsbezügen, konkreter nächster Prüffrage und QA-Empfangsbelegen. Diese dürfen die Rollen tatsächlich schreiben. Vor-Deployment-Pflicht, Chat-only-Speicher und feste3-Datei-Wiederholung werden ersetzt. Erledigte Fragen werden nicht ohne neue Daten erneut begonnen; blockierte Fragen werden mit Wiedervorlage geparkt. Reine Datenlücken bleiben unbestätigt.

Die angelegten Startdateien sind ausdrücklich ASSIGNED_NOT_EXECUTED und vom Master erzeugt. Erst eigene Dot-Schreibvorgänge, unabhängiger Readback und eine QA-Bestätigung der konkreten run_ids zählen als bestandener Übergabetest. Der Ausgang dieses Tests wird separat protokolliert; dieser Bericht behauptet ihn nicht vorab.

Keine Orderfreigabe oder Lockerung der Sicherheitsprüfung, keine Bot-Installation, keine Wallet- oder Echtgeldaktion.

## Belege

diagnoses.json enthält die fünf Antworten nach direktem Lesen der gespeicherten Automationsprompts. local-verification.json enthält unabhängig ausgeführte Feld-/Feed-Prüfungen. Der gemeinsame historische Datensatz steht am GitHub-Commit0713332. Die neue Arbeitssteuerung beginnt mit Commit78e937c. Änderungen nach diesem Commit und deren tatsächliche Prüfung sind separat nachzuweisen.
