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
`runner/central-ai-coordinator.test.mjs` testet Event-Frische, Replay/Duplikate, fünfminütige Signaldrosselung, Modellaufruf-Trennung und unveränderten Fake-Provider-Hinweis. GitHub-Actions-PR-Run [44269024075](https://github.com/127027/Sniperbot-/actions/runs/44269024075) mit Windows- und Ubuntu-Jobs **SUCCESS**. PR [#57](https://github.com/127027/Sniperbot-/pull/57) ist in den kanonischen Branch gemergt (Merge-Commit `d0215a0ea75c9a4504e650e66d3b6d16e280e97a`). Diese Offline-CI bestätigt weder Windows-Rollout noch reale GPT-Aufrufe.

## Nächste zwingende Arbeiten
1. Quellenqualität mit Originaltimestamp, Empfangsverzögerung, Coverage, Provenienz und Beitrag zur frühen Kandidatenfindung nachweisen; für die 241.649 Fälle fehlende Merkmale aufschlüsseln. Historische Gewinner niemals in Modellinputs.
2. Differenz zwischen event-triggered *möglicher* GPT-Prüfung und tatsächlich erfolgter Provider-Antwort/BUY/SELL samt ausführbaren Quotes messen.
3. Vorab GPT-autorisierte lokale Exit-Regeln inkl. Schutz bei API-Ausfall, Neustart und Quellenalter gesondert testen. Keine lokale neue strategische Coinwahl.
4. Historische isolierte Backtests und prospektives Laptop-Paper-Konto vollständig trennen. Zwei frische Markt-/Laptop-Quittungen, echte Provider-IDs und signierte BUY/SELL-Paper-Receipts für End-to-End-Abnahme benötigen; keines davon wird hier behauptet.

**Ziele weiterhin 10 historische Tests (7 Entwicklung, 3 Holdout) + getrennt vorwärtslaufender Live-Paper-Test. Echtgeld vollständig gesperrt.**

## 18.11.2026 – Quellenfrische und erste historische Abdeckungskennzahlen
- Originalstarts mit verknüpften Minutenmerkmalen: **580.200 / 821.849 = 70,6 %**; ohne solche Merkmale **241.649 = 29,4 %**. Diese Zahl misst Abdeckung von Mints, nicht automatisch fehlgeschlagene Collector-Joins und nicht zukünftige Erfolgswahrscheinlichkeit.
- Historische ursprüngliche Minutenmerkmalsereignisse, die mit Originalstarts verknüpft sind: **2.295.579 / 2.296.466 = 99,96 %**. Anderer Nenner; kein Widerspruch zur schlechten Start-Abdeckung.
- Neue direkte GitHub-Prüfung: `regular-paper-presence.json` meldet 18.11. 08:33:08 UTC gesund; `gpt-paper-context.json` 08:36:29 UTC. Dagegen kanonischer `research/market/latest.json` nach wie vor 10.11. 11:32:51 UTC. `forward-source-health.json` und `solana-forward-evidence.json` fehlen. `gpt-paper-receipt.json` verzeichnet zuletzt NO_TRADE 17.11. 17:58:45 UTC.
- Diese Befunde beweisen, dass der lokale Statuskanal wieder meldet; sie beweisen NICHT, dass der Marktfeed frisch ist, neuester R29-Code lokal installiert wurde oder frische GPT-BUY-/SELL-Receipts vorliegen.

**Quellenqualitäts-Audit weiterhin offen:** originaler Provider-Erzeugungszeitpunkt vs. lokaler Empfang vs. GitHub-Publikation vs. GPT-Eingabe, einzigartige Quellenabdeckung, Wallet-/Social-Provenienz und tatsächlich erkannte neutrale Ausbrüche. Es ist noch keine unabhängige prädiktive Quelle als erfolgreich qualifiziert.

## Neue überprüfte Root-Cause-Evidenz – Bias des ursprünglichen Datenanbieters
Der zuvor bereits im Repository genannte externe Datensatz ist `loopholetape/pumpfun-launches` in der historisch festgepinten Revision `9b9a04e7e3e85775d614d16105daad2e69ce8544`.
Originaler Anbieterbericht: https://huggingface.co/datasets/loopholetape/pumpfun-launches/blob/main/KNOWN_ISSUES.md
- **KI-01:** Frühmerkmale `f10_*`/`f60_*` entstehen bei Sampling durch einen Shadow-Harness. Die Stichprobe ist *nicht zufällig*: Mints ohne frühe Aktivität werden weniger oft beobachtet. Null ist ein *nicht beprobter Wert*, kein gemessener Nullwert.
- **KI-02:** Vor dem Decoder-Fix am 27.09.2026 sind bestimmte Buy-Instruktionen nicht vollständig erfasst. Für unsere Oktoberperiode kann die vorangegangene Trennung trotzdem wichtig für übergreifende 60-Tage-Trainingsstatistiken sein.
- **KI-03:** Einige Kurven nutzen andere Quote-Assets als SOL; SOL-Reserve-Felder dürfen dafür nicht als aktuelle SOL-Beobachtungen interpretiert werden.
- **KI-06:** Nur ein Recorder/Stream, keine unabhängige Vollzählung aller Starts; Lücken existieren. Eigenständige Live-Belege für retrospektiv veröffentlichte Quellen fehlen.
- **KI-14:** Coin-Namen, Symbole und URIs können Prompt-Injection enthalten. Ausschließlich als nicht vertrauenswürdige Daten, niemals als Modellanweisungen behandeln.

**Folgerung, bewusst nicht als vollständig bestätigte Kausalzerlegung ausgegeben:** Ein Teil der 241.649 historisch fehlenden Minute-Feature-Zuordnungen könnte durch Nichterfassung/Nichtbeprobung beim Anbieter und nicht durch R29 verursacht sein. Die exakte Aufteilung in Anbieter-Lücke vs. Replay-/Join-Fehler verlangt einen quellseitigen Mint-Outer-Join und muss gemessen werden. Keine synthetischen Feature-Nullen und keine Schwächung technischer BUY-Vetos. Ein unvollständig beobachteter Coin darf für weitere Forschung markiert werden, aber ohne unabhängige Handelsfähigkeit nicht gekauft werden.
