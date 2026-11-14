# GPT ↔ Codex – abgestimmter Sollvertrag für zentrale Dot-Entscheidungen und getrennte PAPER-Bots

**Stand der Prüfung:** 2026-11-07T22:33:04.167Z UTC  
**Eigentümerklärung:** Zentrale Dots **forschen, bewerten und geben PAPER_BUY/PAPER_SELL-Entscheidungen heraus**; lokale Bots **betreiben keine zusätzliche KI-Forschung und kein zweites Dot-Voting**, sondern prüfen nur technisch, verwalten ihr **eigenes virtuelles Guthaben** und bestimmen bei BUY anhand des zentralen Scores ihre eigene Einsatzhöhe.  
**Status:** **SPEZIFIKATION / KEINE IMPLEMENTIERUNGS- ODER HANDELSFREIGABE.** Bei den **lokalen Schutzverkäufen** handelt es sich um eine fachliche **Empfehlung**, die der Eigentümer noch gesondert bestätigen kann.  
**Umfang:** Nur `127027/Sniperbot-`, Arbeitsbranch `codex/research-gateway-v04`; kein main-Merge, keine Änderung an Automationen, Runner, Handelszustand oder Hixton.

## 1. Geprüfter tatsächlicher Iststand

| Funktion | Überprüfter Ist-Zustand |
|---|---|
| Echte Sniper-Forschungsautomationen | **2 aktiv:** `Meme Scout – Forschungsradar` (New-Pool-/Memecoin-Recherche, stündlich, `condition_watch`) und `Meme Sniper – Techniklabor` (technische Infrastruktur-/Sicherheitsforschung, stündlich). Keine fünf separaten nachgewiesen verbundenen Forschungs-Dots. |
| Fünf logische Rollen | Code `runner/research.mjs`: `news_discovery`, `social_acceleration`, `onchain_liquidity`, `contract_security`, `opportunity_qa`; plus separate `risk_controller`-Identität. Synthetisches Voting und lokale Eventschemas existieren, kein echter fünfköpfiger gemeinsamer Produktionsdienst. |
| Tatsächlich veröffentlichter Scout-Feed | `research/feed/meme-scout-latest.json` mit `research_notice.v1`; im verifizierten Bericht [SCOUT_INBOX_PROOF.md](SCOUT_INBOX_PROOF.md) sind **5 reguläre GitHub-Veröffentlichungen** und deren spätere HTTP-200-Eingänge im Windows-Bot nachgewiesen. Das sind **nicht handelbare** `STATUS`-Nachrichten, keine KAUF-/VERKAUF-Entscheidungen. |
| Techniklabor-Ausgabe | Forschung als Automations-/Chatbericht; **kein verifizierter** gemeinsam konsumierter Coin-/Evidence-/Vote-Feed und keine Bot-Entscheidungsschnittstelle. |
| Local Inbox | `runner/research-inbox.mjs`: ausschließlich `producer='Meme Scout – Forschungsradar'`, `research_notice.v1`, `actionable=false`; keine Verbindung zu `ingest/evaluate/action`. Die JSON-Probe ist auch kein direktes Dot-POST. |
| Lokaler Rollen-Gateway | `runner/research.mjs`: `candidate.v1`, `evidence.v1`, `agent_vote.v1`, `risk_assessment.v1` vorhanden, aber nicht mit den echten Automationen und keinem signierten zentralen Entscheidungs-Publisher verbunden. |
| Bisherige Einsatzformel | `positionSize()` verwendet den minimalen Rollenscore geteilt durch **95**, nicht die neue **80-bis-92**-Skala. Keine automatische Änderung durch dieses Dokument. |
| Echte Contract-/Sellability-Validierung | **Fehlt** für reale externe Coins; `REAL_VALIDATOR_UNAVAILABLE`. Ein Score oder fünf positive Texte darf diesen Blocker nicht umgehen. |
| Mehrgeräteausführung | Auf einem Windows-Rechner wurden drei zusätzliche isolierte Node-Testinstanzen nachgewiesen; **nicht** drei physische Rechner oder native autonome Handys. |
| Echtgeldfunktionen | **Keine:** nur virtuelle EUR/Test-USDC (fiktiver Testkurs 1:1), keine PayPal-/Wallet-/Live-Orders. |

**Konflikt mit älteren Soll-Texten:** Die ursprünglichen [DISTRIBUTED_INSTANCES.md](DISTRIBUTED_INSTANCES.md), [SIGNAL_DISTRIBUTION_PROTOCOL.md](SIGNAL_DISTRIBUTION_PROTOCOL.md) und [AGENT_PROTOCOL.md](AGENT_PROTOCOL.md) beschreiben teilweise eine **zweite lokale Research-/Konsensbewertung**. Diese ist durch die neue ausdrückliche Eigentümerpräzisierung für den künftigen Sollzustand **überholt**. Lokale **technische Sicherheitsprüfungen** bleiben zwingend; das ist keine lokale KI-Meinungsbildung.

## 2. Zielarchitektur: ein zentrales Research-Urteil, N unabhängige Konten

```text
     24/7-geeignete Event-Erfassung (eigenständiger dauerhafter Datenservice)
       └── neue Pools, Chain, Kontrakt, Pool, Markt-/Wallet-/News-/Social-Belege
                                |
             Gemeinsamer, versionierter Evidence-/Candidate-Store
                  candidate_id = normalized chain:token:pool
                                |
             5 unabhängig authentifizierte Forschungsrollen
             1 Discovery/News      2 Social Acceleration
             3 On-chain/Liquidity  4 Contract/Security
             5 Independent QA
                                |
              Unabhängiger Contract-/LP-/Sellability-Risk-Controller
                                |
           Zentraler Entscheidungskoordinator mit 5/5-Regel,
            VETO/NO/UNKNOWN-Sperre, Revision und Audit
                                |
         Signiertes PAPER_BUY / PAPER_SELL mit zentralem Score
                                |
         Authentifizierte Broker/Queue und abonnierte Bot-Geräte
               /                   |                     \
            Bot A                 Bot B                  Bot C
        50/200-Limits          eigene Limits          eigene Limits
        eigenes Cash          eigenes Cash           eigenes Cash
           eigener Paper-Fill, eigene Positionen, keine lokale KI
```

**Wichtig:** Die bisherigen ChatGPT-Automationen sind stündlich und bedingt, **kein** nachgewiesenes globales Echtzeit-Sniping. Für weltweit schnelle Pool-Erkennung ist ein unabhängiger, dauerhaft laufender, eventgesteuerter Marktdienst notwendig; Dots prüfen relevante Kandidaten anhand frischer Daten. Abdeckung bleibt von den jeweiligen Datenquellen, RPC-/WebSocket-Kanälen, Providerbedingungen, Netzlatenz und Kosten begrenzt. Keine garantierte Vollständigkeit oder Profit-Wahrscheinlichkeit.

Die Dots kennen **keine** Guthaben, Wallets, persönlichen Investitionsgrenzen oder Kontozugänge. Alle Bot-Instanzen empfangen die **gleiche zentrale Entscheidung** und führen eigene virtuelle Kontobuchungen aus. Kein fremder Bot oder zentraler Dienst kann lokale Konto-/Adminaktionen direkt ausführen. Empfangen ist nicht gleich ausgeführt: fehlende lokale technologische Zulässigkeit führt zu `SKIP/BLOCKED`, niemals zu erzwungenem Kauf.

## 3. Zentrales Score-System und lokale Kapitalformel – verbindlicher Sollzustand

`score` = **zentraler Chancen-/Qualitätsscore 0 bis 100**, **keine belegte statistische Gewinnwahrscheinlichkeit**. Die Bezeichnung **"92 % Wahrscheinlichkeit" ist erst erlaubt, wenn ein unabhängig evaluierter und laufend überprüfter Wahrscheinlichkeitskalibrierungsnachweis existiert**. Bis dahin UI-Beschriftung z. B. `Chancen-Score: 92/100`. Selbst ein sehr hoher Score ersetzt niemals Contract-/Sellability-Risikoprüfung.

Die Dots senden **nur** die zentrale BUY-Entscheidung samt diesem Score; **keinen Eurobetrag und keine Vorgabe für die Höhe**. Jeder Bot kennt seine lokalen `minTrade`, `maxTrade`, freie virtuelle Mittel, Kostenbudget, technische Quote- und Exposuregrenzen.

**Lokale Regel:**

```text
Require: gültig signiertes, noch nicht abgelaufenes PAPER_BUY,
         zentrale 5/5-Quorum- und unabhängige Risiko-PASS-Nachweise,
         Paper-Follow vom Nutzer eingeschaltet, Bot AN,
         frischer ausführbarer BUY- und SELL-Quote-/Marktcheck,
         keine doppelte Position und keine bereits verarbeitete Signal-ID.

if not finite(score) or score < 80 or score > 100: amount = 0
else:
  factor = clamp((score - 80) / 12, 0, 1)
  targetGross = floorCent(minTrade + (maxTrade - minTrade) * factor)
  maxGross = min(targetGross, freeUnreservedPaperBalance,
                 localRiskBudget, liquidity/priceImpactCapacity,
                 quoteExecutableGrossLimit, localCostCapacity)
  amount = floorCent(maxGross)
  if amount < minTrade: amount = 0

Reserve `amount` atomically before paper order.
Amount is TOTAL GROSS test capital, INCLUDING entry fees/costs.
```

`freeUnreservedPaperBalance` ist das **verfügbare** virtuelle Guthaben nach bestehenden Reservierungen, nicht der offene Buchwert anderer Positionen. Optionaler TEST-EUR→TEST-USDC-Wechsel (im aktuellen Prototyp absichtlich fiktiv 1:1) darf niemals eine echte Zahlung vortäuschen. Bei fehlenden Vertrags-/Marktdaten oder Gebühren/ausführbarer Verkaufsquote: **0**.

| Score | Min–Max | Frei | Ziel | Lokaler PAPER-BUY |
|---:|---:|---:|---:|---:|
| 79 | 50–200 | 200 | — | **0** |
| 80 | 50–200 | 200 | 50 | **50** |
| 86 | 50–200 | 200 | 125 | **125** |
| 92 | 50–200 | 200 | 200 | **200** |
| 92 (nach einem anderen Kauf für 50) | 50–200 | 150 | 200 | **150** |
| 95 | 50–200 | 200 | 200 | **200** |
| 80 | 200–200 | 200 | 200 | **200** |
| 92 | 200–200 | 150 | 200 | **0** |
| 79 | 200–200 | 200 | — | **0** |
| 92 | 50–200 | 49,99 | 200 | **0** |

**Fester Min=Max-Betrag:** entweder **genau diesen Betrag** oder **kein Kauf**, niemals automatisch kleiner. Dynamische Min/Max-Bereiche dürfen auf das freie Kapital begrenzt werden, aber niemals unter Minimum fallen. Betrag auf Cent **abrunden**, inklusive der gesamten modellierten Einstiegskosten. Aktuell modelliert `runner/core.mjs` 1 % Eingangskosten innerhalb des Einsatzes; künftige Quotes müssen ihre Gebühren in dasselbe Brutto-Budget integrieren. Parallele Signalsendungen dürfen per atomarer Reservierung niemals dieselben 200 TEST-USDC doppelt verwenden.

## 4. Neu vorgeschlagene, versionierte PAPER-Entscheidungsschnittstelle

**Nicht** `research_notice.v1` erweitern oder als Orderinterpretation verwenden: dieses vorhandene Schema bleibt **nicht handelbar** (`actionable:false`). Separates `paper_execution_decision.v1`-Format und **eigenständig authentifizierte, signierte Transportstrecke** implementieren. Die folgenden JSON-Datensätze sind **Schemaentwürfe, keine echten Nachrichten, keine gültigen Signaturen und keine Freigaben**.

### PAPER_BUY (Beispiel)

```json
{
  "schema": "paper_execution_decision.v1",
  "signal_id": "example-unique-buy-001",
  "decision_id": "example-coordinated-decision-001",
  "decision_revision": 1,
  "action": "PAPER_BUY",
  "chain": "solana",
  "token_address": "REPLACE_WITH_VALID_MINT",
  "pool_address": "REPLACE_WITH_VALID_POOL",
  "candidate_id": "solana:REPLACE_WITH_VALID_MINT:REPLACE_WITH_VALID_POOL",
  "decision_at_utc": "2026-11-07T22:00:00Z",
  "expires_at_utc": "2026-11-07T22:01:00Z",
  "score_0_100": 92,
  "research_snapshot_id": "example-research-revision-23",
  "quorum_policy": "FIVE_INDEPENDENT_YES",
  "votes_ref": "example-proof-five-independent-role-reviews",
  "independent_risk_ref": "example-proof-current-contract-lp-sellability-pass",
  "issuer": "central-paper-decision-publisher",
  "key_id": "example-registered-publisher-key-id",
  "signature": "REPLACE_WITH_VALID_DETACHED_SIGNATURE"
}
```

**Definition:** JSON-Kanonsierung oder signiertes kanonisches Envelope festlegen. Die Felder `issuer`, `key_id` und `signature` sind **Strings, keine Signaturprüfung**. Erst **kryptografische Verifikation** mit lokal vorab vertrautem öffentlichem Schlüssel, korrekter algorithmischer Domänentrennung, Key-Rotation/Revocation, signierter Payload-/Evidence-Digest-/Revision-Bindung und Negativtests machen ein Signal verwendbar. Ein GitHub-Commit liefert keine unabhängige Dot-Signatur.

`candidate_id` wird auf allen Chains aus **standardisierter** `chain:token_address:pool_address`-Identität gebildet (EVM-Adressen normalisiert lowercase, Solana case-sensitive) und gegen den Payload neu berechnet. `decision_id` verknüpft alle Reviews und den gleichen Research-Snapshot. Jede `signal_id` ist einzigartig; jede neue Revision wird versioniert und kann die Vorgängerrevision explizit ersetzen. **Kein direkter Betrag, kein Cash, keine Wallet, keine private Kontoinformation im zentralen Signal.**

### PAPER_SELL (Beispiel)

```json
{
  "schema": "paper_execution_decision.v1",
  "signal_id": "example-unique-sell-001",
  "decision_id": "example-coordinated-exit-014",
  "decision_revision": 1,
  "action": "PAPER_SELL",
  "chain": "solana",
  "token_address": "REPLACE_WITH_VALID_MINT",
  "pool_address": "REPLACE_WITH_VALID_POOL",
  "candidate_id": "solana:REPLACE_WITH_VALID_MINT:REPLACE_WITH_VALID_POOL",
  "decision_at_utc": "2026-11-07T22:30:00Z",
  "expires_at_utc": "2026-11-07T22:31:00Z",
  "close_fraction": 1,
  "reason_code": "CENTRAL_RESEARCH_EXIT",
  "research_snapshot_id": "example-research-exit-revision-41",
  "exit_policy_ref": "example-verified-central-exit-policy",
  "issuer": "central-paper-decision-publisher",
  "key_id": "example-registered-publisher-key-id",
  "signature": "REPLACE_WITH_VALID_DETACHED_SIGNATURE"
}
```

- `PAPER_SELL` referenziert **Chain + Token/Contract + Pool**, **keine globale lokale Position-ID**. Jede lokale Bot-Instanz löst eigenständig die **eigenen** offenen Positionen zu dieser eindeutigen Identität auf. Ohne gehaltene Position: protokollieren, nichts verkaufen.
- `close_fraction=1` bedeutet **gesamten eigenen vorhandenen Coin-Bestand** schließen, wenn ein realistischer lokaler SELL-Quote/Fill modelliert werden kann. Für Teilverkäufe erst separate, geprüfte Version/Policy.
- `PAPER_SELL` erfordert eine zentrale dokumentierte Exit-Policy, signierten Entscheidungsstand, bestätigte Aktualität und lokalen technischen SELL-Abschluss. Wenn der Coin nicht verkäuflich ist, **EXIT_UNAVAILABLE**, keine Phantom-Realisierung. Kein Auftrag an fremde Wallets und kein Echtgeld.
- Verkaufshinweise können bei akutem Contract-/LP-Risiko **ohne erneutes fünfstündiges BUY-Quorum** durch eine separate, zuvor freigegebene zentrale Notfall-/Exit-Policy entstehen; Herkunft und Evidenz müssen trotzdem überprüfbar sein.

## 5. Entscheidung zur Frage: Wer beendet profitable oder riskante Positionen?

**Fachliche Empfehlung, noch nicht als eigenständige Aktivierung freigegeben: HYBRID-EXIT unter zentraler Strategiehoheit.**

1. **Zentrale Dots/Research-Koordinator:** Entscheiden aufgrund aktueller Markt-/Social-/On-chain-/Security-Daten über reguläre `PAPER_SELL`-Signale, z. B. Nachfragebruch, Wallet-Abverkauf, Liquiditätsabbau, These widerlegt, neue Scam-Risiken. Das zentrale Netzwerk besitzt keine lokale Position und keinen persönlichen Kontozugriff.
2. **Lokaler Bot:** Führt **keine zweite KI-Recherche und keine eigene Coin-Meinungsbildung** durch. Er kann aber **nur nach ausdrücklicher vorheriger Freigabe einer festen mechanischen Exit-Policy** lokal Preis-/Liquidity-/Quote-basierte Schutzregeln ausführen, insbesondere Stop-Loss, dynamisches Trailing oder Notfall-Exit. So kann bei abruptem Preissturz innerhalb weniger Sekunden gehandelt werden, ohne auf einen stündlichen Dot-Lauf zu warten. Ein solches lokales Ausführen ist keine neue Forschungsentscheidung, sondern eine vorab genehmigte **technische Schutzregel**.
3. **Keine pauschale schnelle Gewinnmitnahme** bloß weil der Coin z. B. 50→500 gewachsen ist. Adaptives Trailing kann Trends begleiten und Gewinne bei starker Umkehr absichern; Grenzwerte erst empirisch anhand Paper-/Out-of-sample-Tests bestimmen. Keine behauptete Garantie für rechtzeitigen Verkauf.
4. **Bot AUS:** blockiert neue BUY-Einstiege, aktive lokale Exit-Überwachung bleibt bei laufendem Prozess erhalten; expliziter `HOLD`-Modus und globaler Not-Aus müssen in einer eigenen Safety-Policy eindeutig definiert werden. **Rechner/Prozess AUS oder kein Netz = keine zuverlässige Live-Überwachung/Exit-Ausführung.**
5. SELL im Zustand 0 gehaltene Positionen = NOOP. Fehlende gültige SELL-Quote, LP-Abzug oder Netzwerkversagen = `EXIT_UNAVAILABLE`, kein gebuchter Profit. Zentrale Signalzustellung muss nach Neustart/Offline samt Verfall/Neubewertung sicher wiederhergestellt werden.

**Offene Eigentümerfrage:** Sollen die vorab festgelegten lokalen Schutzverkäufe (Trailing/Stop-Loss/akute LP-Gefahr) **auch ohne neuen zentralen PAPER_SELL-Beschluss** zulässig sein? Technische Empfehlung: **Ja, als begrenzte, transparent konfigurierbare Schutz-Ausnahme**. Bis diese Entscheidung freigegeben und getestet ist, keine automatische Änderung am bestehenden Bot.

## 6. Technische Vertrauens-/Fehlergrenzen – muss Codex umsetzen

- **Authentifizierung:** echte Publisher-Signaturen (etwa Ed25519 mit signierten kanonischen Events), vertrauenswürdige registrierte Public Keys, Revoke/Rotation, keine bloßen `producer`-Strings als Sicherheit.
- **Evidence/Quorum:** zentrales fünfrollenbasiertes signiertes Auditpaket, aktuelle Rollenidentitäten, vollständiger Datennachweis, Quelle/Unabhängigkeit, Gegenargumente, separate unabhängige Contract-/LP-/Sellability-PASS-Quellen. Kein stündliches 5xYES ohne echte Risikodaten.
- **Transportsicherheit:** authenticated Subscriptions/Queue, per-client ACK/Sequence, TTL, Replay- und Revisionsschutz, Backfill; GitHub `latest.json` ist nur eine verzögerte und überschreibbare Informationsdatei, **kein** geeigneter Order-Stream.
- **Client-Safety:** Fail-closed bei Fehlern, getrennte Handels-/Info-Schemas, verifizierte Signal-/Coin-/Zeitdaten, Paper-follow-Opt-in, Bot AN für BUY, technische Quotes samt Slippage, Kosten-/Risikolimits, Cash-Reservierung, getrenntes Ledger, Positions-/Signal-Idempotenz.
- **Märkte:** Kein so-tun-als-ob für Contractprüfungen, Sellability oder simulierte Ausführung. Marktpreise sind keine ausführbare BUY-/SELL-Quote. API-Ausfälle und veraltete Snapshots sperren.
- **Trennung:** 50 virtuelle EUR auf Laptop A sind nicht die 50 virtuellen EUR auf B. Publisher benötigt keinerlei Nutzerkonten/Guthaben. Handys als **Fernoberfläche** vs. autonome 24/7-Hosts getrennt planen.
- **No-live:** Keine Wallet-/PayPal-/Bank-/Echtgeld-Anbindung, keine privaten Tokens im Repository, keine Live-Orders, kein automatischer Betrieb ohne neue ausdrückliche Abnahme.

## 7. Codex-Abnahmetests (zuerst rein synthetisch, Paper-only)

1. Fünf unabhängig authentifizierte Rollen überprüfen **dieselbe** `chain:contract:pool`-Identität und denselben `research_snapshot_id`; Quellen-/Gegenbeleg-Tests, 5/5 YES **plus** unabhängiges Risiko-PASS → **nur unter vollständig synthetischem Testvertrag** gültige zentrale `PAPER_BUY`-Entscheidung. NO/VETO/ABSTAIN, fehlende Rollen oder UNKNOWN → kein BUY.
2. Signatur/Schema/TTL/Replay/Idempotenz/Revisions-/Quellenkorrelations-Negativfälle; ein beliebiger GitHub-JSON-String darf keinen Kauf auslösen. Keine direkte Verbindung vom existierenden `research_notice.v1` zum Handel.
3. Drei isolierte Paper-Bots mit jeweils eigenem Konto erhalten **dasselbe** signierte BUY-Signal, handeln mechanisch abhängig von eigener Min/Max-Einstellung und freien Mitteln; keine Kontenvermischung.
4. Kapitalregel: Score 79→0; 80→50; 86→125; 92→200; nach vorherigem 50-Trade 92→max 150; `200–200` bei frei 150→0; `200–200` bei frei 200 und Score 80→200; Gebühren inklusive, Centabrundung.
5. BUY bei Bot AUS, abgelaufenem Signal, fehlendem unabhängigen Risk-PASS oder fehlender Quote → 0. Gleichzeitige BUY-Signale teilen nicht dieselbe Kapitalreserve.
6. Zentrales SELL-Signal führt ausschließlich beim jeweiligen Bot zur Schließung **eigener** passender Positionen; fremde/no-position Instanzen NOOP. Nicht ausführbarer Sell → `EXIT_UNAVAILABLE`; keine erfundenen Gewinne.
7. Nach expliziter Eigentümerfreigabe: lokale Stop-/Trailing-Schutzmechanik auch ohne frische zentrale Sell-Nachricht testen, aber nie auf Basis bloßer KI-Scheinsicherheit; `Bot AUS` stoppt neue Käufe, Prozess AUS stoppt sämtliche Überwachung.
8. Ohne nachweisbar aktuelle echte On-chain-/Contract-/Sellability-Prüfadapter bleiben **alle externen automatischen Paper-Käufe deaktiviert**. Keine implizite Freischaltung durch das Bestehen synthetischer Tests.

## 8. Konkrete nächste Arbeitspakete für Codex (nur Planung)

**P0:** Architekturtexte mit der neuen zentralen Entscheidungsgrenze harmonisieren, bestehende zwei Sniper-Automationen weiterhin nicht verändern; neue Rollen erst mit eigenen getrennten Credentials, Quellen-/Score-Policy und gemeinsamen Kandidatenprotokoll planen.

**P1:** Zentraler persistenter Candidate-/Evidence-/Review-/Risk-Store mit `candidate_id` und signierten Revisionen; verifizierte objektive Contract-/LP-/Sellability-Daten und eventgesteuerter Market-Collector, keine Behauptung fünf Dots seien bereits verbunden.

**P2:** Paper-Decision-Publisher mit den oben beschriebenen getrennten BUY-/SELL-Schemas, Signaturschutz und authentifiziertem Broker/Queue für N unabhängige Nutzerbots.

**P3:** Local Paper-Follower: technische Verifikation und die **neue 80–92-Kapitalregel**, getrennt von bestehender Nur-Info-Inbox, ohne lokale KI-Recherche. Keine automatische Live-Handelsfreigabe.

**P4:** Adaptive zentrale Sell-Policies, optionale nach Eigentümerentscheidung lokale Schutz-Exits, langfristige Markt-/Strategieauswertung inklusive gescheiterter Memecoins und realistischen Paper-Fills; Multi-Geräte-/Offline-/Replay-/Security-Tests.

**Entwicklungsgrenze:** Dieses Dokument aktiviert keine neue Funktion, erstellt keine Dot-Automation, sendet kein BUY/SELL, ändert keine lokale Position und führt keinen main-Merge aus.
