# R20 — Schneller historischer Memecoin-Replay (TRAINING_ONLY)

Stand: 14.11.2026. Ziel des freigegebenen R20-Auftrags: 62 historische UTC-Tage ohne künstliches Warten auf stündliche Dot-Automationen sequenziell freigeben, mit schneller paralleler Rollenbearbeitung pro Tag. Historische Herkunftsnachweise und Sicherheit dürfen nicht wegoptimiert werden.

## Architektur

- continuous-runner.mjs: programmatische Schnittstelle runContinuousReplay für einen temporären, zeitlich gesperrten Replay-Datensatz. Vier unabhängige beobachtende Rollen scout, social, onchain und security werden gleichzeitig aufgerufen. QA wird erst danach mit dem aktuellen Frame und genau deren vier same-frame-Entscheidungen aufgerufen.
- Alle fünf Entscheidungen müssen role, run_id, index, UTC-Zeit und input_hash korrekt tragen. Sie müssen die im aktuellen Frame sichtbaren Ereignisse referenzieren. Jede Rollenentscheidung wird unveränderlich gespeichert. Danach führt der vorhandene isolated controller exakt einen historischen Zeitschritt aus. Der neue Frame wird erst NACH der Versiegelung freigegeben.
- Bei einer fehlenden, ungültigen oder zeitüberschreitenden Rollenentscheidung stoppt der Lauf; er springt weder zum nächsten Tag noch erfindet er Stimmen. Beim nächsten Start werden bereits gespeicherte gültige Rollenentscheidungen wiederverwendet.
- Die vierte Security-Rolle bleibt immer beteiligt, sobald echte Rollenmodelle angebunden sind. Keine Auszahlung, kein Echtgeldhandel, kein Bot-Gateway und keine Änderungen am echten Paper-Konto. BUY/SELL im technischen Controller bleiben historische Testkontobuchungen.
- R20 liefert eine programmatische invokeRole(role, singleFrameTask, {current_peer_votes, signal})-Schnittstelle. Für echte Modelle muss ein entsprechender externer Adapter installiert und die Isolation unabhängig nachgewiesen werden. Diese Version startet selbst keine GPT-Dots und behauptet keine echten KI-Entdeckungen.

## Geschwindigkeitsbenchmark

r20-benchmark.mjs startet ausschließlich eine künstliche 62-Tage-Cohort ohne echte Marktdaten. Für jeden Tag gibt syntheticFixtureRoleProvider fünf ausdrücklich als SYNTHETIC_FIXTURE markierte NO-OP-Entscheidungen zurück. Damit wird der echte Dateisystem-, Hash-, Parallel- und Controller-Mechanismus für 62 Tage getestet; der komplette Durchlauf soll technisch im Minutenbereich möglich sein. Kein einziger der 310 Fixture-Votes ist ein GPT-Research-Ergebnis, kein PEPE-Fund und keine historische Paper-Order.

    node research/replay-controller/r20-benchmark.mjs /tmp/r20-benchmark.json

Die CI speichert einen maschinenlesbaren Bericht mit der tatsächlich gemessenen Dauer. Ein historischer Korpus wird aus Sicherheitsgründen ausdrücklich abgewiesen, wenn der Fixture-Provider verwendet wird.

## Vorhandene echte Rollenentscheidungen schneller weitergeben

r20-diagnostic-bridge.mjs ist ein separater Runner nur für die bisherige KNOWN_WINNER-Diagnose. Er prüft die fünf wirklich gespeicherten Rollen-Dateien und schaltet ohne künstliche Pause alle vollständig vorbereiteten Frames frei. Er generiert keine Forschungsergebnisse. Der neue Workflow .github/workflows/r20-instant-replay.yml wird bei einem GitHub-Push einer Rollenentscheidung ausgelöst und beseitigt die bisherige zusätzliche Wartezeit auf den 15-Minuten-Monitor; dies hängt von GitHub-Actions-Ausführung und GitHub-Ereigniszustellung ab.

Dieses GitHub-Workflow-Protokoll bleibt DIAGNOSTIC. Die Ausführung der fünf bisherigen Cloud-Dots erfolgt weiterhin stündlich. Erst ein angebundener, sicher isolierter Echtmodell-Adapter kann die synchronen historischen Tagesläufe vollständig automatisieren; das ist eine separate Integration und derzeit nicht nachgewiesen.

## Datenlücken nicht durch fiktive Leerlauftage verstecken

r20-coverage.mjs untersucht die tatsächliche historische Source-Abdeckung. Der bisherige gezielt ausgewählte PEPE-Fall enthält 31 verifizierte POOL-Ereignisse, aber keine SOCIAL-, MARKET- oder SECURITY-Ereignisse in der aktuellen Controller-Eingabe. 62 Tages-Frames sind damit als Chronologie abbildbar, aber NICHT als neutraler vollständiger historischer Informationsstand. Ein leerer Tag kann eine echte Quellenlücke sein.

Deshalb ist Fast-Skip bei neutralen historischen Leer-Tagen weiterhin AUS. Ohne unabhängig belegte vollständige Tagesabdeckung darf ein technischer Runner keinen Tag als "kein neues Meme/kein Risiko" deklarieren. Der synthetische Benchmark wird davon getrennt.

## Noch offene fachliche Voraussetzungen

- Neutraler historischer Mehr-Coin-Korpus mit damaligen Kandidaten und Kontrollgruppe inkl. erfolgloser Projekte, unabhängig von der Gewinnerliste ausgewählt.
- Zeitgerecht nachweisbare Social-/News-Beiträge, Block-/Liquiditätszustände, ausführbare BUY-/SELL-Kurse und Kosten.
- Fünf neue isolierte KI-Rollen (vorbestehendes Wissen über PEPE und andere Gewinner darf nicht als blinde Entdeckung durchgehen); neutralisierte Coin-Identitäten und unabhängig überprüfte Herkunft.
- Ein tatsächlicher schnell ausführbarer Rollenadapter an der invokeRole-Schnittstelle, statt der derzeitigen stündlichen ChatGPT-Automationen.
- Getrennte Auswertung erst nach endgültiger Versiegelung aller Entscheidungen.

**Abnahme:** Die CI-Tests und der 62-Tage-SYNTHETIC-Benchmark beweisen die technische Geschwindigkeit, nicht Strategiequalität. Für einen echten Blindtest zählen nur vollständig belegte Agentenentscheidungen und ein später, separat ausgewertetes historisches Portfolio.
