# Zentrales Forschungs-Signalnetz – Zustellungsprotokoll, Entwurf V1

**Status:** Design für Codex. **Nicht implementiert, nicht live verbunden.** Gegenwärtig: `runner/agent-client.mjs` kann nur an den **lokalen** `127.0.0.1`-Gateway senden, sofern ein Prozess auf genau diesem Rechner Zugriff hat. Die echte Test-Event-ID vom Dot fehlt. GitHub Actions, Pull Requests oder stündliche ChatGPT-Automationen sind kein dauerhaft verfügbarer Echtzeit-Signalbus.

## Zuständigkeitsgrenzen

1. **Research Producer:** fünf verpflichtende logische Rollen (News/Discovery, Social Momentum, On-chain/Liquidity, Contract/Scam, Opportunity/QA), geteilter Evidence Store, zeitgültige Bewertungen `YES/NO/ABSTAIN/VETO` und separater Hard-Risk-Bericht.
2. **Coordinator/Publisher:** dedupliziert Quellen, dokumentiert Gegenbeweise, erzeugt nur bei zulässigem Forschungszustand signierte, versionierte **Hinweise**. Er besitzt **keine** User-Konten/Wallets/Anmeldeinformationen/Handelsrechte. Ein positives Signal ist keine Garantie für Kursanstieg oder Sicherheit.
3. **Transport:** authentifiziert, TLS-verschlüsselt, pro abonnierter Instanz widerrufbare Credentials, ausgehende Verbindungen vom Client, begrenzte persistente Queue (Retention/TTL), pro Gerät Leseposition, signierte Audit-IDs.
4. **Independent Client:** empfängt Hinweise, prüft Signatur, Zeit, Herkunft, Chain+Token+Pool, Quorum, Contract/LP/Holder/Sellability, lokale Einstellungen, Kapital, Slippage und Risiko **erneut**. Nur die **eigene** Engine darf Paper-BUY/Paper-SELL auslösen.
5. **Per-user/mobile UI:** zeigt ausschließlich die **eigene** Instanz. Der Signalserver darf niemals private Portfoliostände oder Kontofunktionen fernsteuern.

## Event-Fluss

```text
5 Agent reviews -> immutable evidence + risk review
    -> producer consensus/decision with separate hard veto
    -> signed immutable SignalAdvisory
    -> durable broker subscriptions [A] [B] [C]
    -> verify + dedupe + replay + expiry per client
    -> local WATCH/REJECT/PAPER_BUY or EXIT_REVIEW
```

**Kaufhinweise**: `BUY_CANDIDATE` = Einladung zur lokalen Neubewertung, nie unmittelbarer Orderbefehl. **Verkaufshinweise**: `EXIT_ALERT` = aktualisierte Risiko-/Trendinformationen für die lokale Position. Auch `URGENT_RISK_ALERT` darf nicht mittels Remote-Administrationspfad fremde Konten direkt verkaufen. Ein Client ohne offene Position kann den Hinweis protokollieren und ignorieren.

## Vorschlag: `research_signal.v1` (Beispiel, nicht echt)

```json
{
  "schema": "research_signal.v1",
  "signal_id": "example-unique-uuid",
  "type": "BUY_CANDIDATE",
  "chain": "solana",
  "token_address": "REPLACE_WITH_REAL_MINT",
  "pool_address": "REPLACE_WITH_REAL_POOL",
  "published_at_utc": "2026-11-07T12:00:00Z",
  "expires_at_utc": "2026-11-07T12:03:00Z",
  "research_snapshot_id": "example-review-snapshot",
  "required_roles": 5,
  "review_summary": {"yes":5,"no":0,"abstain":0,"veto":0},
  "risk_status": "REQUIRES_CLIENT_REVALIDATION",
  "evidence_refs": ["evidence-1","evidence-2"],
  "counterevidence_refs": [],
  "issuer": "research-publisher",
  "paper_only": true
}
```

**Nur Schemaidee:** Felder sind nicht automatisch ein Sicherheitsnachweis. Für `EXIT_ALERT` gleiche Contract-/Pool-Identität, aktuelle Gründe, beobachtete Drawdowns/Wallet-Abflüsse/LP-Änderungen und eigene TTL. Keine mitgelieferte `amount`-Vorgabe, kein `wallet_address`-Zwang, keine Zahlungsmetadaten. Der Publisher darf **nicht** lokale `DEPOSIT`, `WITHDRAW`, `SET_RANGE`, `BUY`, `SELL`, `RESET` oder Adminbefehle ausführen.

## Sicherheit / Verlässlichkeit

- Authentifizierter Publisher; digitale Signatur von unverändertem Payload, Key-ID/Rotation; Schutz gegen Replay (Signatur, `signal_id`, monotone Sequenz und TTL), Queue-IDs und Empfangsbestätigung pro Gerät.
- `ACK` bedeutet **empfangen/gespeichert**, nicht **gekauft** oder **ausgezahlt**. Keine Rückübermittlung privater Guthaben oder Positionen an den Publisher.
- Isolierte Registrierungen und Rechte pro Gerät/Mandant; Abonnement nur nach Einwilligung, Abmeldung/Revocation jederzeit. Geräte dürfen nur **ihren** eigenen Empfangsstatus lesen.
- Datenverlust-/Offline-Zustände sichtbar, sichere Reconnect-Backoff-/Backfill-Logik. Abgelaufene Buy-Hinweise verworfen, Exit-Hinweise beim nächsten Check mit frischen lokalen Marktdaten neu bewertet.
- Keine selbstgewählten unsicheren offenen HTTP-Endpunkte, kein Portforward zum Laptop. Self-hosted Broker/cloud-hosted Distributor als getrenntes Projektmodul mit Betriebskosten-/DSGVO-/Verfügbarkeitsentscheid, nicht im Entwickler-GitHub als laufender Dienst.
- Telefon als Fernbedienung des jeweils **eigenen** Windows-Bots mittels eigener Geräteanmeldung; native Android-24/7-Engine erst gesondert prüfen.

## Priorisierte Ende-zu-Ende-Abnahme

1. Echter Scout sendet **eine** harmlose `candidate.v1`-Testnachricht aus autorisierter Windows-Umgebung → Server-Response und identische Event-ID im lokalen Journal; andernfalls **BLOCKED**, keine Verbindung behaupten.
2. Zentrale fünf **synthetische** Rollen erzeugen überprüfbare Hinweise und ein abgelehntes Beispiel.
3. Drei lokale isolierte Bot-Prozesse abonnieren denselben Teststream; alle drei erhalten die **gleiche** `signal_id`, aber nur eigenständige Paperentscheidungen.
4. Ein Client wird offline, ein anderer hat Bot AUS, dritter hat unzureichend Kapital: keine fremde Handelsbeeinflussung, keine erzwungenen Käufe; lokale Exitüberwachung läuft.
5. Verkaufshinweis für Coin X, nur bei A und C gehalten: A/C überprüfen die Positionen lokal, B kann nichts verkaufen; keine falschen Gewinne bei unzureichender Sell-Liquidität.
6. Security-Tests zu Auth/Isolation/Signatur/Replay/Revoke, Datenfehlern, Mehrfachmeldungen, abgelaufenen Signalen und Quellenkorrelation.

**Releases:** zunächst `paper_only: true`, keine Wallet/API-/PayPal-Schlüssel, kein Echtgeld. Siehe [DISTRIBUTED_INSTANCES.md](DISTRIBUTED_INSTANCES.md).
