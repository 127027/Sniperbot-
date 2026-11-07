# Validierter Ist-/Soll-Abgleich – 07.11.2026

Stand: aus dem **GitHub-`main`-Quellcode und Codex-PR #6** gelesen. Keine unabhängige Ausführung auf dem privaten Windows-Laptop in dieser Prüfung. Keine Änderungen an Hixton.

| Bereich | Stand 07.11.2026 |
|---|---|
| Code / gemeinsames Entwicklerkonto | `127027/Sniperbot-`, GitHub-Repository **öffentlich**, Codex PR #6 in `main` gemergt |
| Lokales Paper-Ledger | Vorhanden: virtuelle EUR/Test-USDC, Positionen und eigene manuelle Testaktionen |
| 50–200 / 50–1000 USDC | Vorhandener Min-/Max-Konfigurationspfad; die Risikobewertung ist noch nicht wirtschaftlich validiert |
| Mehrere Positionen | V0.4-Code sieht getrennte Positionen pro Coin vor; laut PR #6 unter Windows mit synthetischen Tests geprüft |
| Fünf **logische** Forschungsrollen | Lokaler, authentifizierter Gateway mit Belegen/Votes + synthetischen Tests |
| Fünf **echte** ChatGPT-Dots | **Nicht bestätigt**: zwei separate stündliche Forschungsautomationen sichtbar, kein überprüfter 5-Dot-24/7-Dienst |
| Echter Dot → Windows-Gateway | **NICHT NACHGEWIESEN**. `docs/DOT_CONNECTIVITY_STATUS.md` nennt `BLOCKED – LOCAL_COMPUTER_ACCESS_UNAVAILABLE`; keine serverbestätigte Dot-Test-Event-ID |
| Echte unabhängige On-Chain-/Sellability-Prüfung | Fehlt; deshalb alle externen Kandidaten für automatischen Kauf gesperrt (`REAL_VALIDATOR_UNAVAILABLE`) |
| Automatischer Long-Hold-/Exit-Research | HOLD und synthetisches TRAILING vorhanden, echte Markt-Exit-Engine offen |
| Mehrnutzer-/Mehrgeräte-Signalnetz | **Reiner Sollzustand**. Kein zentraler Publisher/Broker, keine registrierten Geräte-Abos/Isolationstests |
| Eigene Wallet / echte EUR/PayPal | **Nicht vorhanden**; nur Paper. Bei Echtgeld Einführung gesonderte Freigabe, Anbieter-/Rechts-/Security-Review |
| Mobile Oberfläche | Responsive HTML im Repo; keine verifizierte autonome Android-/iOS-Bot-App oder sichere Fernsteuerungsinstallation |

## Architekturprioritäten

1. Echte Dot-zu-Windows-Nachricht: `GET` + exakt ein `candidate.v1`-Test, Event-ID und identischer unabhängiger Eingangsnachweis. Ohne lokalen Computerzugriff Blocker offenlassen.
2. Dedizierten Forschungs-Publisher/Broker mit **ausschließlich** Research-/Exit-Hinweisen entwerfen. Keine zentralen Gelder, keine Admin-/Handelsremotezugriffe.
3. Drei isolierte Windows-Testbots mit eigener Registry, eigener lokaler Datenbank, eigenen Simulationskonten und separater Entscheidungslogik aufsetzen.
4. End-to-End-Delivery für mehrere unabhängige Empfänger, ACK/TTL/Signatur/Replay/Offline/Revocation und abweichende Handelsentscheidungen testen.
5. Erst nach vertrauenswürdigen unabhängigen Marktdaten-/Onchain-/Exit-Adaptern adaptive Paper-Strategien gegen historische Kohorten validieren.
6. Mobile UI als ausschließlich **eigenen** Instanzclient; Echtgeld/PayPal/Wallet getrennte spätere Freigabe.

**Codex:** [DISTRIBUTED_INSTANCES.md](DISTRIBUTED_INSTANCES.md), [SIGNAL_DISTRIBUTION_PROTOCOL.md](SIGNAL_DISTRIBUTION_PROTOCOL.md), [HOLD_EXIT_POLICY.md](HOLD_EXIT_POLICY.md), [GATEWAY_V04.md](GATEWAY_V04.md), [CODEX_TASKS.md](CODEX_TASKS.md). Alte V0.3-Abschnitte sind im Repo historisch erhalten; für tatsächliche V0.4-Funktionen gelten der neuere Quellcode und diese Statusübersicht.
