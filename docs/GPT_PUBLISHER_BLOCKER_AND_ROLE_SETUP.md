# GPT / Codex – Publisher-Blocker und Einrichtungsplan der fünf Forschungsrollen

**Geprüft:** 2026-11-07T22:38:50.436Z UTC  
**Geltungsbereich:** `127027/Sniperbot-`, Arbeitsbranch `codex/research-gateway-v04`; keine Änderungen an `main`, Hixton, Windows-Kapital oder Echtgeld.  
**Ziel:** Echte unabhängige Forschungsautomationen, aber **keine** direkte Orderausgabe, solange der kryptografisch verifizierte Paper-Publisher und unabhängige Markt-/Sellability-Prüfungen fehlen.

## A. Bestätigter Iststand

- Zwei **aktive ChatGPT-Forschungsautomationen** auf dem Sniper-Projekt: `Meme Scout – Forschungsradar` und `Meme Sniper – Techniklabor`; beide haben stündliche Zeitplanregeln und `condition_watch`. Fünf echte, verbundene Dots sind **nicht** nachgewiesen.
- Fünf **logische lokale Research-Rollen** in `runner/research.mjs`: `news_discovery`, `social_acceleration`, `onchain_liquidity`, `contract_security`, `opportunity_qa`; separat `risk_controller`. Dies sind keine authentifizierten Live-Research-Produzenten.
- Bestehender `Meme Scout` veröffentlicht `research_notice.v1` unter `research/feed/meme-scout-latest.json`. Fünf echte, regulär erzeugte STATUS-Nachrichten wurden laut [SCOUT_INBOX_PROOF.md](SCOUT_INBOX_PROOF.md) im Windows-Bot per HTTPS/HTTP200 mit Event-ID/Hash und Persistenz nachgewiesen. **Nur Information**.
- `runner/research-inbox.mjs` akzeptiert `research_notice.v1` mit `actionable=false` vom einzigen Producer `Meme Scout – Forschungsradar`. Er besitzt absichtlich **keinen** Pfad zu lokaler BUY/SELL-Ausführung. Der Github-Inbox-Transport ist weder signiert noch Echtzeit-Broker.
- Im tatsächlichen verfügbaren Connector-/Automations-Werkzeugumfang dieser GPT-Sitzung wurde **kein** privater, sicher gespeicherter Ed25519-Signierdienst, kein separater Publisher-Schlüssel, kein kryptografisch signierter fünfrollenbasierter Audit-Store und kein direkt verifizierter Windows-Laufzugang erkannt. Der `environment_selection=inherited`-Automationsstatus mit nicht ausgewiesenen Umgebungen ist kein Nachweis, dass dort solche Dienste vorhanden wären.
- `runner/research.mjs` sperrt externe Marktkandidaten mit `REAL_VALIDATOR_UNAVAILABLE`. Vertragliche `PASS`-Strings oder fünf YES-Texte ersetzen keine unabhängig verifizierten Contract-, Pool- und ausführbaren Buy-/Sell-Quotes.

**Blocker (Stand dieses Dokuments):**
`BLOCKED_SIGNING_SERVICE_NOT_VERIFIED`; `BLOCKED_INDEPENDENT_CONTRACT_LP_SELLABILITY_VALIDATOR`; `BLOCKED_CENTRAL_FIVE_ROLE_EVIDENCE_QUORUM`; `BLOCKED_SIGNED_PAPER_PUBLISHER_AND_CLIENT_GATE`; `BLOCKED_LOCAL_WINDOWS_EXECUTION_IN_THIS_CHAT`.

Die Blocker bedeuten nicht, dass ein Dienst auf dem privaten Rechner sicher fehlt, sondern dass **keine tatsächliche Zugriffs-/Funktionsprüfung dafür vorliegt**. Niemals Schlüssel/Signaturen/Quotes erfinden oder aus öffentlichem GitHub allein ableiten.

## B. Derzeitige und geplante Rollenbindung

| Forschungsrolle | Bestehende Nutzung / Ziel |
|---|---|
| R1 `news_discovery` | Bestehende `Meme Scout – Forschungsradar`; neue Coin-/Pool-Nachrichten und zeitgestempelte Quellen |
| R2 `social_acceleration` | Eigene Forschungsautomation für organische Social-Beschleunigung/Bot-Cluster und Gegengründe |
| R3 `onchain_liquidity` | Eigene Forschungsautomation für unabhängige Käuferwallets/LP/Volumes/Quote-Verfügbarkeit **nur bei überprüfbarer Quelle** |
| R4 `contract_security` | Vorhandenes `Meme Sniper – Techniklabor` bleibt technische Forschung und erhält ggf. zusätzlich Contract-/Sellability-/Scam-Quellenprüfung. **Kein** unabhängiger Risk-PASS-Adapter, kein Freigabeveto aus bloßer Textrecherche. |
| R5 `opportunity_qa` | Eigene Forschungsautomation mit unabhängiger Gegenhypothese, Quellkorrelation und Datenqualität |
| Separate Risikoprüfung | **Noch nicht implementierter echter** Validator; nicht mit R4 gleichsetzen. Erfordert Contract-, LP-, tatsächliche Sell-Route-/Quote-Daten. |

Auch nach Einrichtung von fünf Scheduler-Aufgaben müssen echte Ausführung, Quellen, unabhängige Entscheidungen und gemeinsame Kandidaten identifizierbar belegt werden. Fünf Automationstitel sind kein fünfrollenbasierter Konsens.

## C. Gemeinsames, garantiert nicht handelbares Research-Format (nur Forschungsübergabe)

Solange kein zertifizierter Publisher existiert, dürfen tatsächliche geplante Rollenläufe ausschließlich **Forschungs-Snapshots** austauschen; es gibt **kein** `PAPER_BUY`, `PAPER_SELL` oder `risk_assessment.v1` PASS.

**Namespace:** `research/roles/<role>/latest.json` (eigener Pfad je Rolle) auf `codex/research-gateway-v04`, **nicht** `research/feed/meme-scout-latest.json` überschreiben; die separate bestehende Scout-Inbox bleibt unangetastet.

**Struktureller Entwurf:** `research_role_snapshot.v1`; ein Rollen-Snapshot enthält `schema`, `role`, `producer`, `snapshot_id`, `published_at_utc`, `paper_only:true`, `actionable:false`, `status`, `candidates` (Array) und `summary`. `status=NO_VERIFIED_CANDIDATE` mit leerem `candidates`, wenn kein überprüfbarer Kandidat gefunden wurde. Ein Kandidaten-Eintrag enthält nur `chain`, `token_address`, `pool_address`, `candidate_id`, `observed_at_utc`, `source_urls`, `evidence_summary`, `risk_flags`; keine Orderempfehlung und kein Score als statistische Gewinnwahrscheinlichkeit.
- `candidate_id` exakt `chain:token_address:pool_address`, EVM-Adressen lowercase, Solana case-sensitive. Nur nach unabhängig belegter Adresse/Pool-ID berichten; **nicht** ein allgemein kursierendes Symbol zur Identität machen. Nicht bestätigte Angaben als `UNKNOWN`, nicht PASS.
- Quelle mit URL/Datum nennen, Gegenbelege darstellen und fremde Snapshot-Infos als **abgeleitet**, nicht als unabhängig gefunden, markieren. Dieselbe primäre On-chain/Social-Quelle darf nicht fünfmal als unabhängig gewertet werden.
- Vor jeder Aktualisierung Zieldatei lesen; bei vorhandenem Blob nur per SHA aktualisieren; bei Konflikt unverändert lassen und protokollieren. Keine bloßen erfundenen Nachrichten aus interaktiven Chats als geplante Läufe ausgeben. Kein Zugriff auf Guthaben/Wallets/Accounts.
- Die Reihenfolge tatsächlicher bedingter Scheduler-Läufe ist nicht garantiert. Wenn keine gemeinsame aktuelle eindeutige `candidate_id` vorhanden ist, nur Status/Forschung liefern, keine Fake-Kandidatendaten. Für echte Unabhängigkeits-/TTL-/Quorumprüfungen ist ein persistenter Controller und passender sicherer Feed nötig.
- Das neue Research-Format dient **ausschließlich der späteren Diskussion mit Codex** und ist kein bereits implementierter Parser für den lokalen Bot. Es darf nie an `/api/research/events` als `candidate.v1` oder `/api/command` als BUY gesendet werden.

**Anbindungsphasen:** (1) Forschungsrollen und unabhängige reine Research-Snapshots, (2) zentraler Candidate-/Evidence-/Review-Store mit zeitlich konsistenten IDs, (3) unabhängiger Risk Controller mit echten Contract-/Pool-/Sellability-Daten, (4) signierter zentraler Paper-Publisher, (5) autonomer lokaler Paper-Follower auf N Geräten. Phasen 2–5 sind **BLOCKED**, bis passende Implementierung und Tests existieren.

## D. Exakter vorgeschlagener PAPER-Publisher-Vertrag für Codex-Abgleich (noch nicht aktiv)

Die **neue** vom Eigentümer gewünschte Struktur ist `paper_execution_decision.v1`; `research_notice.v1` bleibt strikt `actionable:false` und **darf niemals** umgedeutet werden. Vor dem ersten aktiven Entscheidungsereignis müssen Codex und GPT die Felder/Signatursemantik **identisch** implementieren und testweise gegeneinander verifizieren.

Erforderlich: `schema='paper_execution_decision.v1'`, `paper_only=true`, `signal_id`, `decision_id`, `decision_revision`, `action='PAPER_BUY'|'PAPER_SELL'`, `chain`, `token_address`, `pool_address`, daraus lokal rekonstruierter `candidate_id`, `decision_at_utc`, `expires_at_utc` **maximal 120 Sekunden** nach Entscheidung, `research_snapshot_id`, `issuer`, `key_id`, `signature`; bei BUY `score_0_100`; bei SELL lokale Position anhand eindeutiger Chain/Contract/Pool-Identität, Standard **gesamte** lokale Position; separate Belegreferenzen für die fünf voneinander unabhängigen Rollen und den eigenen echten Risikocontroller.

**Signaturverfahren:** Ed25519 über die Bytes der exakt festgelegten **kanonisch nach Schlüssel sortierten JSON-Repräsentation ohne das Feld `signature`**, mit vorangestellter Domain-Zeile `MemeSniper/paper_execution_decision.v1\n`. Für Python/Node verschiedene Unicode-/Zahl-/Whitespace-Serialisierungen müssen vor produktivem Einsatz als gemeinsame Testvektoren festgelegt werden. Der Client muss einen **außerhalb des Signals** vertrauenswürdig provisionierten öffentlichen Schlüssel halten, echte Signaturen/Revisionen/TTL/Sequenz prüfen und bei jedem Fehler sperren. Im Repository keine privaten Keys und keine nachträglich erfundenen Signaturen. Kein bloßer `issuer`-/GitHub-Commit-String als Ersatz für eine kryptografische Prüfung.

**Lokale Kapitalregel:** Nutzer-Min/Max aktuell **50–1.000 Test-USDC pro Coin**, keine feste 200-Kappe. `score<80` => kein Kauf. Ab 80: `targetGross = floor_cent(min + (max-min)*clamp((score-80)/12,0,1))`; `amount=floor_cent(min(targetGross, unreservedCash, feeInclusiveExecutableCapacity, localRiskLimit))`; wenn unter `min`: **0**. Nur eigene freie virtuelle Mittel und technische Budgetreservierungen, keine Kapitalverwaltung durch Dots. **Score92 bei 1000 frei ⇒ maximal 1000; bei 50 frei ⇒ maximal 50**, vorausgesetzt alle unabhängigen Prüfungen, Kapital und Kosten passen. **Fixer Bereich 200–200 ⇒ exakt 200 oder 0.** Bruttoeinstieg **inklusive aller Kosten**; Scores sind unkalibrierte Punkte, KEINE empirisch validierte Gewinnwahrscheinlichkeit.

**Lokale technische Kontrollen bleiben:** Paper-Follow ausdrücklich aktiv, Bot ON für neue Käufe; Signatur-/Schema-/Frische-/Replay-/Coin-Identitäts-/Kosten-/Budget-/Einstiegs-/Sell-Quote-Gates; atomare Reservierung; je Konto unabhängige Positionen und PnL. Bot OFF sperrt neue BUY, Prozess AUS verhindert jede Kontrolle/Ausführung. SELL nur eigene gehaltene Positionen; ohne ausführbare Quote `EXIT_UNAVAILABLE`. Für externe Coins ohne aktuelle echte Contract-/Sellability-/Ausführungs-Adapter **kein automatischer Fill**. Keine Konto-/Adminbefehle oder Wallet-/PayPal-Daten im zentralen Signal.

## E. Lokaler Start und zweistündige Kontrolle – bewusst nicht als erledigt behaupten

Die Eigentümeranforderung **1000 Test-USDC Gesamtguthaben** und Beobachtung alle zwei Stunden ist bekannt, aber in diesem Chat **kein Zugriff auf den laufenden Windows-Prozess oder die lokale State-Datei** vorhanden. Deshalb nicht `DEPOSIT` oder `EXCHANGE` auf unbekannten Kontostand aufaddieren, nicht aus 1000 Test-USDC einen Echtgeldbetrag machen, kein UI/Bot-ON erfinden. Erst den echten lokalen Zustand durch Codex lesen, dann **auf exakt insgesamt 1000 TEST-USDC** (nicht zusätzlich 1000) korrigieren und nur mit ausdrücklicher Paper-Konfiguration starten. Die lokale Paper-Portfolio-/Signalüberwachung alle zwei Stunden braucht einen tatsächlich laufenden lokalen Monitor; ChatGPT-Automationen ohne erreichbaren Laptop können keine 2h echten Kontostandschecks belegen.

Bis zur Implementierung/Verifikation des Ed25519-Publishers und echter Marktdaten bleiben Entscheidungen `BLOCKED`, und der bisherige `research_notice.v1`-Feed bleibt Information.

## F. Tests / Codex-Nächste Schritte

1. Verifiziere tatsächliche Rollenausgaben unabhängig, keine fünf identischen kopierten News-Snippets. Prüfe Kontrakt+Pool+Chain, timestamp, Eigenständigkeit von Belegen und Gegenbelegen.
2. Implementiere einen echten zentralen Candidate-/Evidence-/Vote-/Risk-Store, nicht fünf getrennte Chats ohne Synchronisation.
3. Richte getrennten Signierdienst mit nicht exportierbarem bzw. vom Research-/Botcode getrenntem Schlüssel ein, realen Ed25519-Signatur- und Negativtest über Byte-identische Kanonisierung/Domain; kein synthetischer Produktionsschlüssel.
4. Erzeuge nur bei **fünf unabhängigen Reviews + separater objektiv positiver Contract-/Sellability-Prüfung** eine noch nicht produktive `paper_execution_decision.v1`-Fixture; vor Live-Paper-Verwendung Byte-Vektoren und Pflichtfelder zwischen Publisher/Windows-Client abgleichen.
5. Wiederhole Budgettests 50–1000: 79→0, 80→50, 86→525, 92→1000 bei frei1000, 92→50 bei frei50; fixer min=max 200 bei frei150→0. 2h-Monitor nur nach lokalem Ausführungsbeleg.
6. Signierter Broker mit authentifizierten opt-in Clients, TTL/Replay/Revocation, Quote-Ausfälle, 24/7/Offline-Status, separates eigenes Guthaben je Gerät; keine externen automatischen Fills vor echten Adaptern.

**Kein Code- oder Bot-Eingriff durch diese Dokumentation, keine Echtgeldfreigabe, keine Umwidmung von Hixton.**
