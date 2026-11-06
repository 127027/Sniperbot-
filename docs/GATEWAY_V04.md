# Lokaler Research-Gateway V0.4

## Was tatsächlich funktioniert

- Fortlaufende neue Pool-Entdeckung über den bestehenden Scanner; keine feste
  Coin-Auswahlliste. Die Radaransicht ist nur eine begrenzte Momentaufnahme.
- Persistente Research-Kandidaten nach Chain + Contract + Pool, Belege, Gegenbelege,
  datierte Rollenstimmen, separate Risikoberichte und Entscheidungsverlauf.
- Fünf Pflichtrollen, getrennte lokale Tokens und Registry mit mehreren Agenten
  pro Rolle. Fremde Identitäten/Rollen, Replay-Konflikte und Orderbefehle werden
  abgewiesen. Identische Events sind idempotent, auch nach Neustart.
- 5/5 aktuelle YES-Rollen, eigene unterschiedliche Quellenhosts und
  Unabhängigkeitskennungen, keine Gegenbelege/Risikoflags, separate Risikofreigabe.
  Jede zusätzliche NO/VETO-Stimme blockiert. Abgelaufene Berichte müssen erneuert
  werden. Ein Agent kann seine Stimme durch ein neues Event ändern; die alte
  Nachricht bleibt im Journal. Zeitfenster maximal fünf Minuten, keine Zukunftsdaten.
- Gemeinsames Lesen über GET ermöglicht den Austausch vor der nächsten Stimme.
- Synthetische End-to-End-Demo: fünf simulierte Rollen → separate Risiko-Fixture →
  Paper-Kauf → Portfolio → HOLD oder Demo-Trailing → Test-USDC. Eine Ablehnung kauft nicht.
- Min/Max gelten pro neuem Coin-Kauf. Bei 50–50 genau 50, bei 200–200 genau 200.
  Bei 50–200 ist ein bewertungsabhängiger Betrag zwischen 50 und 200 möglich.
  Keine zusätzliche Anzahl-, Gesamteinsatz- oder Positionskappe. Freies Guthaben
  und unabhängige technische Verkaufsgrenzen bleiben wirksam. Reicht der mögliche
  Betrag nicht für das Minimum, erfolgt kein Kauf.
- Optionale Rollenbewertung `score_0_100`: vorläufige, nicht validierte Paper-Regel:
  niedrigster Score aller Pflichtrollen; Anteil = min(1, Score/95);
  Zielbetrag = Min + (Max−Min) × Anteil. Fehlende Scores wählen Min. Ab 95 Punkten
  ist Max möglich, etwa 1000 bei 100–1000. Der Score ist keine Gewinnwahrscheinlichkeit.
  Demo-Fixtures verwenden 95 und eine synthetische Verkaufsgrenze von 100000;
  sie belegen nur die Betragsmechanik, nicht eine echte Marktchance.
- TRAILING: verfolgt Höchstkurs, schließt bei eingestelltem Rückgang oder Stop-Loss,
  ohne festen Gewinn-Take-Profit. Nur synthetische Quotes erlauben diesen neuen
  automatischen Exit. HOLD bleibt unverändert; alte AUTO-Regel heißt LEGACY.
- Bot AUS verhindert neue Einstiege; aktive Ausstiege laufen weiter, solange der
  Runner läuft. Stale/ungültige Quotes erzeugen keine erfolgreiche Schließung.

## Was ausdrücklich noch fehlt

Keine echten verbundenen Dots, keine autonome News-/Social-Recherche im Runner,
keine nachgewiesene gemeinsame Dot-Konversation. Keine echte Contract-/LP-/Holder-
oder ausführbare Sell-Route-Prüfung. Daher bleiben **alle externen Kandidaten für
automatische Käufe gesperrt**, auch mit fünf YES und einem behaupteten PASS-Bericht:
`REAL_VALIDATOR_UNAVAILABLE`. Authentifizierung bestätigt den Absender, nicht den
Wahrheitsgehalt. Unterschiedliche Hosts beweisen ebenfalls keine unabhängigen Fakten.

Der Gateway nimmt reale Recherche als untrusted Daten an, führt sie aber nicht aus.
Der alte manuelle Paper-Kauf bleibt ein ausdrücklich indikativer Test. Keine Wallet,
keine echten Orders, keine privaten Blockchain-Schlüssel, kein Zahlungsverkehr.
Keine volladaptive Momentum-/Liquiditätsstrategie oder Profitvalidierung. Die
Trailing-Prozentwerte und Kapitalgrenzen sind konfigurierbare Testparameter.

## Lokaler Transport

Listener: ausschließlich `127.0.0.1:3030` (oder `SNIPER_PORT`). Kein Tunnel, kein
Portforwarding, keine öffentliche API. Strikter Host/Origin, kein offenes CORS.
Research-Endpunkte akzeptieren keine Browser-Origin. Max. 16 KiB je Event,
120 Requests/Minute je registrierter Identität, 10 Sekunden Request-Timeout.

- `GET /api/research`: gemeinsamer Beleg-/Stimmen-/Entscheidungsstand.
- `POST /api/research/events`: ein JSON-Event, Header `Authorization: Bearer …`.
- `GET /api/state`: lokale Dashboardansicht ohne Tokens.

Credentials entstehen beim ersten Start unter
`%LOCALAPPDATA%/MemeSniperPaper/gateway-credentials.json`. Jede Rolle erhält einen
eigenen zufälligen Token. Die Datei niemals in GitHub, Chat oder Logs kopieren.
Registry erweitern/Token rotieren: Runner stoppen, lokale Datei bearbeiten, neu
starten. IDs und Tokens müssen eindeutig sein; Rollen stammen aus der Pflichtliste
oder `risk_controller`. Getrennte Prozesse erhalten nur ihren eigenen Token.
Die Datei vertraut dem lokalen Windows-Benutzer. Ein Prozess mit Zugriff auf dessen
Dateien oder lokale Adminoberfläche ist nicht durch diesen Gateway isoliert.

`runner/agent-client.mjs` ist der getestete lokale Adapter:

```powershell
# SNIPER_AGENT_TOKEN im lokalen Prozess aus dem Zugang der jeweiligen Rolle setzen.
# Nie als Kommandozeilenargument übergeben oder ausgeben.
node runner/agent-client.mjs get
node runner/agent-client.mjs send event.json
```

## Nachrichtenvertrag

Jedes Event benötigt `schema`, `event_id` (eindeutige UUID empfohlen), `agent_id`,
`candidate_id`, `observed_at_utc`, `expires_at_utc`, `paper_only: true`.
Zusätzliche Felder sind verboten. IDs: `chain:token_address:pool_address`, EVM-Adressen
kleingeschrieben; Solana bleibt case-sensitive. Beispiele für alle Formen befinden
sich in `runner/gateway.test.mjs` und `runner/research.test.mjs`.

| Schema | Weitere Pflichtfelder |
|---|---|
| `candidate.v1` | `chain`, `token_address`, `pool_address`, `symbol` |
| `evidence.v1` | `evidence_id`, `url` (HTTPS), `independence_key`, `summary` |
| `agent_vote.v1` | `role`, `vote` (YES/NO/ABSTAIN/VETO), `reason`, `evidence_ids`, `counterevidence_ids`, `risk_flags`; optional `score_0_100` |
| `risk_assessment.v1` | `contract`, `liquidity`, `sellability` (PASS/FAIL/UNKNOWN), `max_amount_usdc`, `reason`; nur Risiko-Identität |

Erst Kandidat, dann Belege, dann Stimmen. Evidenz-IDs sind unveränderlich; neue
Beobachtungen brauchen neue IDs. Quellen-URLs werden gespeichert, nicht abgerufen.
Gleiche URL ohne Query/Fragment und gleiche Hosts werden nicht als unabhängige
Quellen gezählt. Einmal gefüllte Kandidaten werden nicht automatisch erneut gekauft.

## Echte Dots anschließen: geprüfte Möglichkeiten und offener Nachweis

Die am 06.11.2026 gelesene [offizielle Dot-Dokumentation](https://learn.chatgpt.com/docs/dots/computers-and-apps)
beschreibt **Computers → Your computer → Allow access** im Dot-Profil. Diese
Berechtigung ist separat vom Codex-Zugang. Der Rechner muss online und die
ChatGPT-App geöffnet sein. Ein verbundener Dot kann lokale Aufgaben nutzen.
Unterstützte Plugins hängen von Konto, Berechtigungen und Ausführungsumgebung ab.

**Noch nicht nachgewiesen:** Ob die konkreten fünf Nutzer-Dots diesen Rechner
freigegeben haben und den Adapter aus einer lokalen Aufgabe aufrufen können.
Es wurde kein privater Dot-Endpunkt erfunden und keine Verbindung behauptet.
Das frühere pauschale „Dots sind nur stündlich“-Bild wird durch diese aktuelle
Dokumentation nicht belegt; für den Bot ist eine gemessene Zustellung maßgeblich.

Abnahme nach Freigabe: einem echten Dot seine Rolle, den Projektpfad und ausschließlich
seinen lokalen Zugang zuordnen; lokalen Adapter `get` ausführen; einen unkritischen
Forschungskandidaten senden; Event-ID im Dashboard und Antwort prüfen; Gegenbeleg
von zweiter Rolle lesen lassen. Keine Tokens in die Chatnachricht einfügen.
Bis dahin lautet der Verbindungsstatus **nicht verbunden / nicht nachgewiesen**.

Alternativ kann eine lokale Anwendung Modelle über die
[OpenAI API mit Function Calling](https://developers.openai.com/api/docs/guides/function-calling)
an den Adapter anbinden. Das wäre ein eigener API-Dienst, kein Anschluss bestehender
Dots. In diesem Update werden keine kostenpflichtigen Modellaufrufe ausgeführt.

## Speicherung und Wiederherstellung

Windows-Standard: `%LOCALAPPDATA%/MemeSniperPaper`, außerhalb OneDrive.
`SNIPER_DATA_DIR` überschreibt dies. Alte `.local/paper-state-v03.json` wird nur bei
fehlendem Ziel kopiert und separat gesichert; das Original bleibt erhalten.
Portfolio und Research werden gemeinsam atomar gespeichert. Vorheriger Stand als
`.bak`; keine erfolgreiche HTTP-Antwort vor dem Speichern. Ein Prozess-Lock verhindert
gleichzeitige Runner auf demselben Datenordner. Defektes JSON stoppt den Start.

Research ist ein lokaler JSON-Prototyp: kein manipulationssicheres Audit, keine
Datenbankindizes oder automatische Archivierung. Der Verlauf wächst und muss vor
großem Dauerbetrieb durch eine getestete Archiv-/Datenbanklösung ersetzt werden.
Ein komplettes `RESET` setzt weiterhin den gesamten Paper-Stand zurück.

## Verifikation

`node runner/test.mjs` und `node --test runner/*.test.mjs` unter Windows/Node 24.
Tests decken positive/negative Rollen, TTL, Quellenkorrelation, Rollenfälschung,
Host/Origin, Replay, reale Kandidaten ohne Validator, Budget, mehrere Positionen,
Trailing, Bot AUS, Persistenz und beschädigtes State-JSON ab. Offline und getrennt
vom Nutzerportfolio. CI führt dieselben Tests mit Node 22 aus.

Bezieht sich auf Issue #2; keine Behauptung, dass alle langfristigen Abnahmepunkte
des Issues oder die gesamte Sniper-Strategie damit erfüllt sind.
