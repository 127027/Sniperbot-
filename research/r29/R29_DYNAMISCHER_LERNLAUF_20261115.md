# Sniperbot R29 – dynamische Forschung, Beobachtungsmonat und 30-Tage-Forward-Test

**Stand: 15. November 2026.** Arbeitsbranch: `codex/r29-chatgpt-github-paper-cycle-20261115`.
**R29 bleibt die App-Version.** Die R30-Dateien sind ausschließlich ein historisches Diagnoseexperiment.

## 1. Was wirklich implementiert wurde

- Beim normalen Start mit **ausschließlich** `Sniperbot_Starten.bat` startet der bestehende `runner/research-market-daemon.mjs` als separater, read-only Prozess. Er untersucht öffentliche DEX-/Pool-Daten ungefähr alle zwei Minuten. Dieses Polling ist **nicht** 720 LLM-Recherchen pro Monat und auch keine signierte Tradingentscheidung.
- `runner/dynamic-research-scheduler.mjs` führt echte **deterministische, dokumentierte Forschungsreviews** nach 1/4/12/24-UTC-Zeitpunkten am Tag durch. Kein OpenAI-API-Key nötig. Review ist eine Beobachtungs-/Priorisierungsentscheidung, **kein vollständiger GPT-/Sicherheits-Scoring-Lauf** und kein Handelsauftrag.
- Jeder ausgeführte Review wird unveränderbar unter `%LOCALAPPDATA%\MemeSniperPaper\dynamic-research\reviews\YYYY-MM-DD\` archiviert. Die lokale `status.json` enthält die Anzahl, Tagesfrequenz, erste Beobachtung, letzte Analyse und Beleg-Hash. Die Reviews enthalten begrenzte, explizit unbestätigte Kandidaten und Kontrollfälle.
- `runner/dynamic-research-outcomes.mjs` beobachtet dieselben Pool-Identitäten nach **1 h, 6 h, 24 h, 7, 14 und 30 Tagen**. Ergebnisse aus öffentlichen Poolpreisen sind **indikative Verhältnisse**, nicht echte oder risikoadjustierte Gewinne. Fehlende spätere Same-Pool-Preise bleiben **UNKNOWN**, nie ein erfundener Verlust oder Gewinn. Die abgeschlossenen 30-Tage-Beobachtungen werden append-only archiviert; aktive Beobachtungen unter `outcomes\tracking.json` gespeichert.
- Der bestehende lokale Collector archiviert über `runner/r27-prospective-capture.mjs` weiterhin erste Beobachtungen von Pool- und News-Ereignissen. Die R27-Dateien unter `%LOCALAPPDATA%\MemeSniperPaper\r27-evidence\captures\` sind ausdrücklich keine unabhängige externe Zeitstempelattestierung.
- Der vorhandene R29-Kurier verwendet denselben DPAPI-geschützten GitHub-Token wie bisher. `runner/r29-adaptive-publisher.mjs` überträgt **nur** die freigegebene, minimierte Forschungstelemetrie zu `research/r29/channel/dynamic-research-status.json` auf dem R29-Branch. Keine privaten Guthaben, Wallets, Rechnungs-/Trade-Daten, Schlüssel, Hostnamen oder auslösbaren Orders.
- Der R29-Kurier veröffentlicht zusätzlich den **letzten zeit- und hashgeprüften öffentlichen Kandidaten-Review** in `research/r29/channel/dynamic-research-review.json`. Daraus kann GPT beobachtete Pool-ID, Preis, Liquidität und Aktivität lesen; keine vollständige Security-Verifikation, kein Auftrag und kein Paper-Kontostand.\n- Die bisherige ChatGPT-Tagesdiagnose ist zusätzlich als eigene **Sniperbot**-Automation angelegt. Sie soll frische GitHub-Belege prüfen und – soweit Zugriff besteht – täglich unter `research/r29/daily-diagnoses/YYYY-MM-DD.md` eine evidenzbasierte Forschungsnotiz hinterlegen. Sie führt keine Paper- oder Echtgeld-Orders aus. Dynamische lokale Reviews und tägliche GPT-Automation sind getrennte Prozesse.

## 2. Adaptive Recherche-Taktung

Dies sind **untrainierte operative Schwellen**, keine bewiesenen Kaufvorteile:

| Marktaktivität, anhand frischer öffentlicher Daten | Reviews/Tag |
|---|---:|
| Keine unabhängige Beschleunigung, wenig neue Pools oder Quelle ausgefallen | 1 |
| Mindestens drei junge unpromotete Pools innerhalb 1 h oder mindestens ein unabhängiges Pool-Beschleunigungssignal | 4 |
| Mindestens zwei unterschiedliche beschleunigende Pools oder eine Beschleunigung und drei junge Pools | 12 |
| Mindestens vier verschiedene beschleunigende Pools **und** drei junge Pools | 24 |

Die Frequenz wird bei jeder Collector-Beobachtung neu für den **nächsten fälligen** Research-Review bestimmt. In jedem UTC-Tag wird, solange der Prozess läuft, mindestens ein Review angestrebt, niemals mehr als 24. Die erste Beobachtung eines neuen UTC-Tages darf sofort einen Review auslösen. Starke Marktsignale werden **nicht** mit verifiziertem organischen Interesse verwechselt. Bezahlte Token-Promotion allein erhöht den Takt nicht.

Wenn der Laptop/Prozess offline ist, gibt es keine historischen automatischen Nachholanalysen; die Lücke bleibt im Journal sichtbar. Die zukünftige ChatGPT-Tagesautomatisierung kann nur die tatsächlich publizierten Daten prüfen und den lokalen Laptop nicht steuern.

## 3. 30 Tage Vorlauf + 30 Tage unabhängiger Test

Der Timer beginnt erst beim **ersten tatsächlichen lokalen Review nach Installation des aktuellen R29-Codes**, nicht bei der Erstellung der GitHub-Dateien.

- **Tag 0–29:** `OBSERVATION_WARMUP_30_DAYS`. Datenerfassung, stichprobenartige Kontrollen, Probleme und Datenqualität bewerten. Keine heimlichen rückwirkenden Gewinnerlisten.
- **Tag 30–59:** `LOCKED_FORWARD_TEST_30_DAYS`. Unangetastete Vergleichsphase; die Auswahlregeln dürfen nicht anhand der Ergebnisse dieses Zeitraums nachjustiert werden.
- **Ab Tag 60:** `ONGOING_FORWARD_EVALUATION`. Erkenntnisse aus volljährigen Ergebnissen und Kontrollgruppen auswerten. Jede spätere Strategieänderung bekommt eine neue Regelversion und einen weiteren neuen Testzeitraum, niemals stille rückwirkende Optimierung.

**Nicht umgesetzt / ausdrücklich nicht behauptet:** Die bestehenden fünf Cloud-Dots sind kein gekoppelter lokal ausführender 24/7-LLM-Cluster. Es gibt keine automatisch trainierte Gewinnwahrscheinlichkeit, keine belastbaren 100-Punkte-Sicherheits-Scores, keine unabhängig bestätigte Sellability aller neuen Pools, keine vollständige Uniswap-/Raydium-Onchain-Launch-Erfassung und keine gewinnbringende automatisch ausführbare BUY-/SELL-Pipeline. Ein GPT-Research-Review soll hier nur eine Empfehlung ausgeben. Die Risk Engine muss vor jeder späteren Paper-Order Sicherheit und Risiken unabhängig prüfen.

## 4. Was wir aus den Outcomes ableiten können

- Erst nach vollständiger Beobachtung werden **Beschleunigungs-Kandidaten** mit **vorab deterministisch ausgewählten Kontrollfällen** verglichen.
- Wir prüfen entdeckte Pool-Identitäten, Datenlücken, später nachweisbare Poolpreisentwicklung, Quotenfehler und fehlende Wiederauffindbarkeit – nicht nur Coins mit positivem Preisverlauf.
- Ein fehlender späterer Pool darf **nicht** zu einer negativen Rendite umetikettiert werden; fehlende eigene Quellenabdeckung darf **nicht** als erfolgreiche NO_TRADE-Entscheidung gewertet werden.
- Bevor echte, profitable Paper-BUY/SELL-Signale möglich sind, fehlen noch unabhängige Sell-Simulation, LP-/Mint-/Freeze-/Wallet-Cluster-Checks, ausführbare Ein- und Ausstiegsquoten sowie eine separate risikolimitierte Execution Engine. Limits aus der Recherche: max. 0,25 % initiales Risiko pro Trade, max. 1 % Nominalgewicht je jungem Coin, max. 3 % gesamte Exposition, täglich 1 %/wöchentlich 2,5 % Portfolioverlust. Die R29-Mindestorder von 50 TEST-USDC darf diese Limits niemals übersteuern.
- Die Langzeitbeobachtung des vorhandenen `memecoin-followups.mjs` liefert zusätzlich **indikative** 14-Tage-Research-Studien. Dieses neue 30-Tage-Modul verwendet ausschließlich denselben Pool in nachfolgend erfassten Snapshots; häufig werden zukünftige Beobachtungen fehlen, wenn ein Pool nicht mehr auf den aktuellen New-Pool-Seiten vorkommt. Deshalb ist die spätere vollständige Point-in-Time-Quoten-Datenerfassung ein zwingender nächster Schritt.

## 5. GitHub-Status lesen

1. `research/r29/channel/regular-paper-presence.json`: lediglich Browser-/Laptop-HTTP-Verbindung; **kein Portfolio**.
2. `research/r29/channel/dynamic-research-status.json`: erster und letzter Forschungslauf, aktuelle Review-Frequenz, Beleg-Hash.\n3. `research/r29/channel/dynamic-research-review.json`: letzter freigegebener, rein öffentlicher Markt-Kandidatenbericht; Status `WAITING_FOR_UPDATED_LOCAL_BOT` bedeutet noch keine Daten.\n4. `research/r29/daily-diagnoses/`: tägliche GPT-Auswertung mit Unterscheidung DATA_GAP/NO_TRADE.\n\nDer anfängliche Status `WAITING_FOR_UPDATED_LOCAL_BOT` ist **kein** Beleg eines laufenden neuen Collectors.
Die Tagesdiagnosen werden nur mit tatsächlich frischen Daten fortgesetzt; die Meldung DATA_GAP bleibt korrekt, wenn der Laptop noch nicht aktualisiert oder die Security-Lage ungeklärt ist.

**Privacy:** Repo-/Branch-Sichtbarkeit nicht als privat voraussetzen. Deswegen veröffentlichen die Statusdateien keine Wallets, Positionen, Guthaben oder Tokens. Diese bleiben auf dem Laptop, bis ein gesicherter Transport ausdrücklich spezifiziert ist.

## 6. Aktualisierung auf dem Laptop (erforderlich)

1. Den **laufenden** R29-Bot mit `Q` beenden.
2. Den bisherigen **gesamten** Bot-Ordner einschließlich versteckter `.local`-Dateien und `%LOCALAPPDATA%\MemeSniperPaper\` sichern. Bestehende Paper-Konten, Wallets und Token nicht überschreiben oder löschen.
3. Den aktuellen R29-Branch von GitHub laden und **nur die Programmdateien** im bestehenden Botordner aktualisieren. Keine neue leere Kopie als vermeintlich dasselbe Paper-Konto starten.
4. **Ausschließlich** `Sniperbot_Starten.bat` öffnen. GitHub-PAT wird lokal aus dem bisherigen DPAPI-Speicher gelesen; kein neuer API-Key nötig.
5. Nach dem Start die reguläre R29-GitHub-Verbindungsanzeige, den lokalen `dynamic-research/status.json` und die öffentliche `dynamic-research-status.json` prüfen. Das Fehlen des ersten lokal gespeicherten Reviews bedeutet: **Start noch nicht erfolgreich bestätigt**.
6. Später gelegentlich die Langzeitarchive sichern. Roh-Daten im Repo-`.local\research-market\history\` werden aus Größen-/Zeitgründen weiterhin nach 45 Tagen und bei Kapazitätsdruck bereinigt; die geschützten neuen Review-/Outcome-Archive sind **davon getrennt**.

## 7. Nachweis & Regression

CI läuft unter `.github/workflows/tests.yml` für Windows und Ubuntu mit `node --test runner/dynamic-research-scheduler.test.mjs runner/dynamic-research-outcomes.test.mjs runner/r29-adaptive-publisher.test.mjs`. Es werden nur synthetische Marktdaten, isolierte Testverzeichnisse und simulierte GitHub-Antworten verwendet. Der CI-Test bestätigt **Code und Sicherheitsgrenzen**, nicht echten Markterfolg, lokale Laptop-Installation oder Profitabilität.

Keine zweite `.bat`-Datei; kein Echtgeldhandel; keine Änderungen am bisherigen Paper-Ledger.
