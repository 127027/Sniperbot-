# GPT → Codex: tatsächliche Einrichtung der fünf Sniper-Forschungsrollen

**Prüf-/Berichtszeit (UTC):** 2026-11-07T22:45:46.971Z
**Arbeitsbranch:** codex/research-gateway-v04
**Ergebnis:** FÜNF CHATGPT-FORSCHUNGSAUTOMATIONEN ANGELEGT/ERWEITERT UND AKTIV, ABER GEMEINSAMER LIVE-EVIDENZ-AUSTAUSCH NOCH NICHT NACHGEWIESEN.
**Sicherheit:** Es wurden keine Kauf-/Verkaufsereignisse, keine Signaturen/Schlüssel, keine Zahlungen und keine Hixton-Änderungen ausgeführt. Nicht nach main gemergt.

## 1. Tatsächlich in der Automationsverwaltung ausgeführte Änderungen

| Pflichtrolle | Tatsächliche Aufgabe | Operation | Aktivierung | Scheduler-Status | Ziel für den echten Rollenlauf |
|---|---|---|---|---|---|
| news_discovery | Meme Scout – Forschungsradar | bestehende Aufgabe um Rollen-Snapshot ergänzt; alte STATUS-Ausgabe erhalten | aktiv | ursprüngliches HOURLY condition_watch, Minute :29 UTC | research/roles/news_discovery/latest.json |
| contract_security | Meme Sniper – Techniklabor | bestehende Technik-Recherche beibehalten und Contract-/Scam-Forschungsrolle ergänzt | aktiv | ursprüngliches HOURLY condition_watch, Minute :35 UTC | research/roles/contract_security/latest.json |
| social_acceleration | Sniper Social Research | **neu angelegt** | aktiv | HOURLY exact_schedule, Minute :40 UTC | research/roles/social_acceleration/latest.json |
| onchain_liquidity | Sniper Onchain Research | **neu angelegt** | aktiv | HOURLY exact_schedule, Minute :45 UTC | research/roles/onchain_liquidity/latest.json |
| opportunity_qa | Sniper Opportunity QA | **neu angelegt** | aktiv | HOURLY exact_schedule, Minute :50 UTC | research/roles/opportunity_qa/latest.json |

**Nachprüfung:** Alle fünf Aufgaben wurden nach der Einrichtung über die Automationsverwaltung erneut gelesen: jeweils enabled=true, richtige Rollenzuordnung und passende Snapshot-Zielpfade im gespeicherten Prompt. Die beiden vorhandenen Aufgaben behielten ihr ursprüngliches Timing und stündliche Regel; Scout behielt ausdrücklich seinen zuvor funktionierenden nicht handelbaren research_notice.v1-Feed. Alle fünf Rollen weisen neue Research-Snapshots ausdrücklich als paper_only:true und actionable:false aus. Die neuen drei Aufgaben benutzen eine stündliche genaue Zeitregel, auf verschiedene Minuten verteilt, um spätere Rollenberichte lesen zu können. **Diese zeitliche Staffelung ist keine Garantie**, dass alle Berichte vor dem nächsten Lauf der QA-Rolle fertig publiziert werden.

Die beiden ursprünglichen Forschungsaufgaben wurden **nicht** umbenannt oder deaktiviert. Drei zusätzliche Aufgaben sind angelegt worden, also insgesamt **fünf** für das Sniperprojekt. Es wurde kein zusätzlicher sechster Risikocontroller simuliert oder als aktiv behauptet. Hixton bleibt vollständig unverändert.

## 2. Genau implementierter Rollensnapshot-Vertrag in den Aufgabenanweisungen

**Noch kein vollständig implementierter oder real abgenommener Nachrichtendienst!** In den tatsächlichen planmäßigen Research-Läufen sollen die Rollen ausschließlich ihren eigenen GitHub-Pfad auf dem genannten Arbeitsbranch schreiben. Alle sollen andere verfügbare Rollen-Snapshots lesen und unabhängig prüfen, ob sie denselben Kandidaten anhand der eindeutig normalisierten chain:token_address:pool_address-Identität und echter Datengrundlagen belegen.

Für die Rolle ist folgender reine Informationsvertrag in ihren Prompts gespeichert:

- schema = research_role_snapshot.v1
- role = genau eine der fünf Pflichtrollen; producer = konkreter Forschungsagent
- snapshot_id = pro tatsächlichem Lauf neu und eindeutig; published_at_utc = tatsächlicher UTC-Zeitpunkt
- paper_only = true; actionable = false
- status = NO_VERIFIED_CANDIDATE oder CANDIDATE_OBSERVED
- candidates = [] falls keine konkret bestätigte Chain-/Token-/Pool-Identität vorliegt. Sonst je Kandidat: chain, token_address, pool_address, candidate_id, observed_at_utc, source_urls, evidence_summary, risk_flags
- summary = nur echte, nachprüfbare Erkenntnisse und Einschränkungen

EVM-Adressen werden für IDs normalisiert lowercase, Solana-Adressen bleiben case-sensitive. Andere Rollenberichte gelten als **abgeleitet**, nicht als automatisch unabhängiger Quellenbeleg. Jeder Schreibvorgang darf nur die eigene Ziel-Datei über aktuelle GitHub-Datei-SHA ändern; bei fehlenden Werkzeugen/Rechten eine konkrete BLOCKED-Meldung, niemals einen erfundenen Commit. Nach tatsächlichem Schreiben Readback prüfen.

**Was noch offen ist:** die erste tatsächliche Datei-Veröffentlichung jeder der fünf Aufgaben; ein gemeinsamer, versionierter, zeitlich koordinierter Candidate-/Evidence-/Vote-Store; objektive Quellen- und Risiko-Unabhängigkeit; die Nutzung durch einen zentralen Koordinator. Ein aktuell **fehlendes** Snapshot ist kein fehlgeschlagener belegter Lauf. Es wurde bewusst **keine** Forschungsdatei aus diesem interaktiven GPT-Chat erstellt und kein fiktives Resultat einer planmäßigen Automation behauptet. Der GitHub-Snapshot ist ein zeitverzögerter Informationsaustausch und noch kein 24/7-Marktdatendienst.

## 3. Echter Publisher bleibt technisch BLOCKED

Im tatsächlich zugänglichen ChatGPT-Automations-/GitHub-Werkzeugumfang wurde **kein** getrennt betriebener, sicher authentifizierter Ed25519-Signierdienst mit geschütztem Schlüssel gefunden oder nachgewiesen. Ebenfalls keine tatsächlich unabhängig verifizierten Contract-/LP-/ausführbaren Buy-/Sell-Quoten; keine vollständigen zentralen fünf konsistenten Review-Belege und kein signierter Produktions-Broker/Queue-Kanal.

**Blocker:** BLOCKED_SIGNING_SERVICE_NOT_VERIFIED; BLOCKED_CENTRAL_FIVE_ROLE_EVIDENCE_QUORUM; BLOCKED_INDEPENDENT_CONTRACT_LP_SELLABILITY_VALIDATOR; BLOCKED_SIGNED_PAPER_PUBLISHER_AND_CLIENT_GATE.

Ein bloßer GitHub-Commit, ein Feld issuer, fünf YES-Strings oder ein Research-Score sind keine Ed25519-Signatur, kein risikoseitig validierter Coin und keine reale sichere Orderfreigabe. Keine Wallet-/Payment-Funktionen.

**Exakter notwendiger Papier-Vertrag mit Codex:** paper_execution_decision.v1 mit zusätzlichem Pflichtfeld paper_only:true, eindeutiger signal_id, decision_id, Revision, chain/token/pool/candidate_id, UTC-Entscheidungs-/Ablaufzeit maximal 120 Sekunden, BUY-Score, zentralen Rollen-/Risiko-Belegreferenzen und issuer/key_id/signature. Domain-Bytes sind exakt die UTF-8-Zeile MemeSniper/paper_execution_decision.v1 gefolgt von LF und rekursiv nach JSON-Schlüsseln sortierte Darstellung **ohne** signature; Ed25519 nur mit außerhalb des Signals bereits vertrautem öffentlichen Schlüssel. **Kein solcher echter Publisher wurde eingerichtet, kein Schlüssel generiert und kein zentraler BUY/SELL gesendet.**

Die vorhandene Scout-Ausgabe research_notice.v1 ist weiterhin ausschließlich actionable:false und hat keinen Pfad zum Handelsmodul. Die neuen fünf Research-Rollen erhalten **keinen** automatischen Orderschreibzugriff und keine Verknüpfung zum lokalen POST /api/decisions/events.

## 4. Desktop-Paper-Follower: Codex-Stand, kein von GPT ausgeführter Start

Die GitHub-Datei [CENTRAL_PAPER_IMPLEMENTATION.md](CENTRAL_PAPER_IMPLEMENTATION.md) dokumentiert die Codex-Implementierung am Windows-Laptop: 36 Node-Tests, lokaler Ed25519-**Verifier** mit zentralem Entscheidungseingang, einem ausdrücklich leeren Publisher-Trust-Status, dem Mechanismus REAL_VALIDATOR_UNAVAILABLE sowie gesondertem 2h-Check. Der Eigentümer/Codex meldete explizit: Desktop läuft mit **insgesamt** 1.000 Test-USDC, minTrade=50, maxTrade=1000, Bot ON, centralPaperFollow=true, LabAuto=false. GPT hat diese lokale Prozess-/Kapitalinformation **nicht selbst über einen Laptop-Zugang gemessen**, kein Konto aufgeladen und keinen Desktopprozess gestartet.

Lokale 80–92-Regel (brutto einschließlich Kosten): score<80 => 0; score80=>lokales Minimum; score>=92=>lokales Maximum, jeweils nur soweit eigenes **freies unreserviertes Guthaben**, gültige Quote und Sicherheitsgrenzen reichen; darunter keine Buchung. Score92 bei frei1000=>1000, bei frei50=>50; fix min=max 200 bei frei150=>0. Scores sind nicht kalibrierte Gewinnwahrscheinlichkeiten. Der Bot rechnet Einsatz selbst; Dots berechnen keine Kontobeträge.

**Keine automatische externe Paper-Ausführung, bevor reale Daten-/Sellability-Adapter und der echte abgesicherte Publisher getestet sind.** Auch die bestehende lokale Ed25519-Verifikation ist nur die Empfängerseite, nicht der zentrale Signierdienst.

## 5. Präzise nächste Abnahme für Codex (keine Doppelarbeit)

1. Nicht die bestehende historische Scout-Inbox erneut entwickeln: Scout → GitHub → Windows mit fünf Nachrichten nachgewiesen, siehe [SCOUT_INBOX_PROOF.md](SCOUT_INBOX_PROOF.md).
2. Pro Rolle echte geplante Automation-Ausführung und GitHub-Readback ihres jeweiligen research/roles/<role>/latest.json prüfen, ohne Ersatz-Dateien zu fälschen; unbestätigte reale Werkzeugrechte als UNBEKANNT markieren.
3. Erst danach einen **gemeinsamen Candidate-/Evidence-/Counterevidence-Store** mit klarer Snapshot-/Zeitfensterbindung, Rollen-Unabhängigkeit, Risiko-Veto, Revisionspolitik aufbauen. GitHub latest.json ist keine persistente Queue.
4. Objektive, datierte Contract-/LP-/Sell-Quotes und unabhängigen Risk-Controller implementieren und tatsächlich validieren.
5. Eigenständigen echten Ed25519-Publisher mit sicheren getrennten Schlüsseln und lokal gepinnten öffentlichen Schlüsseln end-to-end testen. Keine produktive Signatur anhand Teststrings oder unvertrauenswürdiger GitHub-Schlüsseldaten annehmen.
6. Erst nach Sicherheitsfreigabe den signierten Paper-Decision-Stream nutzen; bislang sind Research-Snapshots und alle Research-STATUS-Nachrichten **nicht handelbar**.

**Keine Änderungen an: Hixton, Echtgeld, PayPal, Wallet, main oder lokaler Desktop-Instanz durch GPT.**
