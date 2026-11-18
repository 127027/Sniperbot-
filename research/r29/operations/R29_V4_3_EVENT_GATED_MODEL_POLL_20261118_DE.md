# R29 V4.3 – Erster gezielter Schritt: event-gated GPT-Scheduling
Stand: 18.11.2026. Nur PAPER_ONLY. Dieses Operator-Dokument darf niemals Input für historische Blindtest-Entscheidungen sein.

## Gesicherter Ausgangsstand aus V4.2
- Paging: 310.540/310.540 Kandidaten-Prüfzeitpunkt-Paare archiviert, 0 Paging-Verlust. Nicht erneut bauen.
- 241.649 Solana-Starts ohne Minutenmerkmal: Ursachenanalyse offen.
- FTR: erste technische Eignung 1,115 Minuten, erste **stündliche** mögliche Recherchequeue 60,526 Minuten nach Start. Kein tatsächlicher historischer GPT-Aufruf.
- 0 belegte historische GPT-BUY-/SELL-Fills. Keine Rendite belegt.
- Live-Laptop-Feed und aktuelle Installation noch nicht durch frische Originalquittungen bestätigt.

## Konkrete V4.3-Änderung
Die **bestehende** lokale `runner/central-ai-coordinator.mjs`-Instanz trennt den 5-Minuten-Quellenpoll von tatsächlichen API-Modellaufrufen. Neue, frische und identifizierbare Solana-Migrationen, neue Token, neue Pools oder Markt-Beschleunigungsereignisse können nach mindestens fünf Minuten seit dem vorigen Modellversuch eine neue strategische Prüfung auslösen. Ereignisse werden gegen die dauerhaft gespeicherte Liste bereits bearbeiteter IDs geprüft und dürfen höchstens 10 Minuten alt sein; inkonsistente/stale Quellen lösen keine Sonderprüfung aus. Normale Kandidaten- und Positions-Reviewintervalle bleiben bestehen, bestehende API-Tagesgrenze von 24 Versuchen bleibt unverändert.

Neue Modelldatensätze/Ergebnisse werden nicht durch diese Programmänderung erfunden: Erst ein tatsächlich gestarteter Windows-Build mit konfigurierter Responses-API und verifizierbarer Provider-ID kann eine echte Modellentscheidung belegen.

Die lokal bestehende Bot-Sicherheit und die PAPER_ONLY-Sperre bleiben unberührt. **Wichtig:** Kontinuierlicher fünfminütiger Quellenpoll ist NICHT gleichbedeutend mit kontinuierlichem Exit-Schutz. Technische, vorab autorisierte und separat belegte Positions-Schutzregeln sind vor einer Live-Paper-Strategie-Abnahme noch zu prüfen. Kein GPT-BUY ist allein durch diesen Scheduler freigegeben.

## Tests und Grenzen
`runner/central-ai-coordinator.test.mjs` testet Event-Frische, Replay/Duplikate, fünfminütige Signaldrosselung, Modellaufruf-Trennung und unveränderten Fake-Provider-Hinweis. GitHub-CI-Abnahme steht bis zum tatsächlichen Workflow-Ergebnis aus.

## Nächste zwingende Arbeiten
1. Quellenqualität mit Originaltimestamp, Empfangsverzögerung, Coverage, Provenienz und Beitrag zur frühen Kandidatenfindung nachweisen; für die 241.649 Fälle fehlende Merkmale aufschlüsseln. Historische Gewinner niemals in Modellinputs.
2. Differenz zwischen event-triggered *möglicher* GPT-Prüfung und tatsächlich erfolgter Provider-Antwort/BUY/SELL samt ausführbaren Quotes messen.
3. Vorab GPT-autorisierte lokale Exit-Regeln inkl. Schutz bei API-Ausfall, Neustart und Quellenalter gesondert testen. Keine lokale neue strategische Coinwahl.
4. Historische isolierte Backtests und prospektives Laptop-Paper-Konto vollständig trennen. Zwei frische Markt-/Laptop-Quittungen, echte Provider-IDs und signierte BUY/SELL-Paper-Receipts für End-to-End-Abnahme benötigen; keines davon wird hier behauptet.

**Ziele weiterhin 10 historische Tests (7 Entwicklung, 3 Holdout) + getrennt vorwärtslaufender Live-Paper-Test. Echtgeld vollständig gesperrt.**
