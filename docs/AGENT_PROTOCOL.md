# Agentenprotokoll – vorgeschlagene Schnittstelle, NOCH NICHT IMPLEMENTIERT

**Zweck:** Skalierung von 2 Forschungsagenten auf beliebig viele spezialisierte Agenten. Eine ChatGPT-Automation ist weder ein Handelsprozess noch ein funktionierender Echtzeit-Bus zum Windows-Rechner.

## Kandidatenempfehlung `candidate.v1` – Beispiel ohne echten Token

```json
{
  "schema": "candidate.v1",
  "event_id": "unique-id",
  "agent_id": "agent-news-01",
  "agent_role": "news",
  "observed_at_utc": "2026-11-06T15:00:00Z",
  "expires_at_utc": "2026-11-06T15:05:00Z",
  "chain": "solana",
  "token_address": "REPLACE_WITH_VALID_MINT",
  "pool_address": "REPLACE_WITH_VALID_POOL",
  "recommendation": "WATCH",
  "score_0_100": 62,
  "confidence": 0.35,
  "sources": [{"provider":"example", "url":"https://example.org/reference", "observed_at_utc":"2026-11-06T15:00:00Z"}],
  "metrics": {"pool_liquidity_usd":null,"net_organic_buyers_5m":null,"sell_quote_available":false},
  "risk_flags": ["NOT_VERIFIED"],
  "paper_only": true
}
```

Das JSON ist ein **Schema-Beispiel**, kein valider echter Kandidat. Ein fehlender Wert ist `null` und darf niemals als `0` oder als bestandene Prüfung interpretiert werden. Quellen-URLs werden nur nach Allowlist abgerufen; Ereignisse können fremde Eingaben enthalten.

## Zustandsautomat

```text
DETECTED --> ENRICHED --> RISK_CHECKED --> WATCH / REJECT / PAPER_ELIGIBLE
                                          |           |
                                       No buy      candidate.v1
                                                     |
                                          Central Decision Controller
                                                     |
                                 PAPER_ORDER_REQUESTED --> PAPER_FILLED / PAPER_REJECTED
                                                     |
                                             HOLDING / EXIT_PENDING
                                                     |
                                         CLOSED / EXIT_UNAVAILABLE
```

`PAPER_ELIGIBLE` gilt **ausschließlich** für Simulationen. Eine echte Order erfordert eine spätere, neue Autorisierung sowie einen separaten Hard-Risk-Check. Kein automatischer Übergang von Paper zu Live.

## Entscheidungsregel (zu entwickeln)

1. Inputvalidierung, Quelle, Timestamp/TTL, Chain/Contract/Pool-ID und Idempotenz prüfen.
2. Unabhängige Evidenz identifizieren (nicht bloß N identische Social-Scraper).
3. Sicherheits- und Liquiditäts-VETO sowie Sell-Quote-Grenze prüfen. Risk-Flag `UNKNOWN` blockiert echte Käufe.
4. Die verfügbaren freien Mittel und Gesamt-Exposition abzüglich Kosten bestimmen.
5. Eine Positionsgröße innerhalb `minTrade <= amount <= maxTrade` oder **kein Trade** wählen. 50–50 ist ein Fixbetrag; 200–400 ist ein zulässiger Bereich, keine Pflicht 400 auszugeben.
6. Signalquorum, Scoring, Preisqualität und Grund der Entscheidung auditieren.
7. Bei wiederholter Empfehlung desselben Tokens nur bestehende Position prüfen, niemals blind erneut kaufen.

## Eventtypen (Soll)

- `candidate.v1`: Recherchevorschlag, ggf. ablehnend
- `risk_assessment.v1`: Contract-, Holder-, LP-/Sell-Sicherheit, Quellen
- `paper_order_request.v1`: Intent, Positionsgröße, Idempotency-ID
- `paper_order_result.v1`: simuliert ausgeführt oder abgelehnt, Quote, Gebühren, Delay
- `position_mark.v1`: mark-to-market mit Ablaufzeit
- `exit_decision.v1`: Begründung/Strategie, Fill-Status, ggf. Verkaufsblockade
- `agent_health.v1`: Status, letzte Quellenabfrage, Lag, Error-Rate

## Technische Integrationsentscheidung für Codex

In der ersten Iteration **lokale** Queue plus Persistenz testen, statt einen ChatGPT-Dot als On-Chain-Bot zu deklarieren. Geeignetes MVP: strukturierte JSON-Events via localhost API mit HMAC/Token und maximaler Requestgröße; spätere Auswahl aus Redis Streams, Postgres Outbox oder einem abgesicherten Messaging-Provider anhand messbarer Zuverlässigkeit. Sichere Admin-API **nicht** öffentlich ins Internet exponieren. Agenten erzeugen niemals Wallet-Signaturen.

## Forschungs-Dots

`Meme Scout – Forschungsradar` und `Meme Sniper – Techniklabor` sind aktuell getrennte stündliche Forschungsautomationen. Eine Nachrichtenvermittlung, ein persistenter gemeinsamer State und Echtzeit-Orderbefugnisse existieren nicht. Weitere Dots/Agenten werden nur bei unterstützter Plan-/Kontokapazität angelegt; die Anzahl bleibt frei skalierbares Architekturziel.

## CODEx-LAPTOP-UEBERGABE 2026-11-06

**Vorgesehener Consensus-to-Gateway-Ablauf – NICHT IMPLEMENTIERT:**

1. Jeder 1..N-Forschungsagent liefert `candidate.v1` mit Chain, Mint/Contract, Pool, Quellzeit, Liquidität, Prüfbarkeit, Sicherheitsflags, Quellen und eigener Bewertung.
2. Ein Forschungskoordinator dedupliziert Contract+Chain, bündelt unabhängig geprüfte Quellen (nicht nur dasselbe repostete Social-Gerücht), prüft Aktualität und holt Gegenargumente von QA/Scam-/Liquidity-Agent ein. Ein Quorum von Agenten ist ein Indiz, kein Beweis und niemals hinreichend für einen echten Kauf.
3. Nur bei bestandenem Datenqualitäts-Quorum und ohne offene kritische Warnung entsteht ein zeitlich begrenzter `paper_trade_proposal.v1`, inklusive positiver **und** negativer Stimmen, Auditbelegen, Risiko-/Positionsrahmen und eindeutiger Idempotenz-ID. Andernfalls `WATCH`, `REJECT` oder `ABSTAIN`.
4. Ein **lokaler** abgesicherter Message-Gateway validiert Signaturen, Rate-Limits, Payload-Schema, TTL, Quellvielfalt und doppelte Events. Keine direkte Dot-Verbindung oder Nachrichtenzustellung voraussetzen.
5. Ein unabhängiger Risk Controller prüft Contract-Sicherheit, Pool-Tiefe, Verkaufbarkeit, Wallet-Konzentration, verfügbare virtuelle Mittel und Portfolio-/Chain-Limits **erneut**. Nur so können bei Bot AN Paper-Käufe entstehen.
6. Für jeden späteren Kandidaten gilt der gleiche Prozess. Offene Positionen werden unabhängig von neuen Rechercheentscheidungen weiter überwacht; Bot AUS verhindert nur neue Käufe.

**Authentifizierung:** keine öffentlich erreichbare Localhost-Order-API und keine privaten Schlüssel in Events. Eine Queue- oder Dot-Brücke darf auf Windows nicht ohne gesonderte technische Validierung im Netz erreichbar sein. Vor der Live-Phase zusätzliche rechtliche, technische und finanzielle Sicherheitsabnahme.

## Fünf-Rollen-Review und Abstimmungsvertrag – Zielversion v1 (2026-11-06)

Zusätzliche verbindliche Strategie: [STRATEGY_5_AGENT_BIG_MOVES.md](STRATEGY_5_AGENT_BIG_MOVES.md). **Nicht implementiert.** Der koordinierende Review-Prozess basiert auf genau fünf anfänglich erforderlichen Fachrollen und weiterhin auf einer skalierbaren Registry von 1..N Agenten.

Pflichtrollen: `news_discovery`, `social_acceleration`, `onchain_liquidity`, `contract_security`, `opportunity_qa`.

Vor dem finalen Vorschlag wird jedes Signal zu `chain + token_address + pool_address` zusammengeführt und jeder Agent muss dieselbe Candidate-ID, den Zeitbereich, überprüfbare Quellen und Gegenargumente kennen. Die Verbindung läuft künftig über einen authentifizierten, **persistenten** Message-Bus und einen gemeinsamen Evidenzspeicher, nicht durch Chatnachrichten an den Bot.

Schemaentwurf `agent_vote.v1` (exemplarisch, nicht ausgeführt):

```json
{
  "schema": "agent_vote.v1",
  "candidate_id": "solana:mint:pool",
  "agent_id": "independent-agent-04",
  "role": "contract_security",
  "vote": "ABSTAIN",
  "observed_at_utc": "2026-11-06T16:00:00Z",
  "expires_at_utc": "2026-11-06T16:05:00Z",
  "evidence_ids": [],
  "counterevidence_ids": [],
  "risk_flags": ["SELLABILITY_UNKNOWN"],
  "reason": "Insufficient independent verified pool evidence",
  "paper_only": true
}
```

Entscheidung: **5/5 frische YES-Votes** aus fünf verschiedenen Pflichtrollen plus unabhängige positive Contract-/LP-/Sellability- und Portfolio-/Quote-Gates, Bot AN, ausreichend freie Mittel => erst dann `paper_trade_proposal.v1`. `ABSTAIN`, `NO`, `VETO`, unvollständige Stimmen, Duplikate, korrelierte Belege oder abgelaufene Daten => `WATCH/REJECT`. Der lokale Controller prüft alles selbst, führt nie einen direkten Agenten-Kaufbefehl aus und entscheidet über `0` oder einen zulässigen Min-Max-Betrag. Keine Signatur-/Walletrechte für Forschungsagenten.

Der Exit-Manager verarbeitet bestehende Positionen und aktivierte Regeln unabhängig von diesem Konsens und von Bot AUS. Kein garantierter Exit bei fehlender verkäuflicher Quote oder ausgeschaltetem Laptop.
