# Bot-First: sichtbarer Windows-Bot, Euro-Paper-Konto und Dot-Zwischenspeicher

**10. November 2026 · Branch `codex/v10-local-executor-wallet-payments-20261110`.**

## WICHTIG: sichtbarer Betrieb ist Pflicht
Der Nutzer wünscht **keinen unsichtbaren Hintergrundbetrieb**. Der Sniperbot startet ausschließlich über das sichtbare `Sniperbot_Starten.bat`-Fenster. Solange das Fenster offen ist, dürfen die zwei zugehörigen Prozesse (lokaler Bot + Markt-Daten-Collector) laufen. `Q` beendet beide kontrolliert; beim Schließen des Fensters beendet das Windows Job Object beide. Ein automatisch unsichtbarer Windows-Login-Task wurde ausdrücklich verworfen und alle dafür versuchsweise angelegten Dateien wurden aus diesem Branch wieder entfernt. Es gibt **keinen** automatischen Betrieb bei geschlossenem Fenster.

## Neuer Benutzeroberflächen-Bereich „Euro · PayPal · Wallet“
- Guthaben wird klar getrennt dargestellt: **virtuelle EUR** und **TEST-USDC**, nicht echte PayPal-Salden.
- Virtuelle EUR lassen sich mit den existierenden und jetzt direkt per UI verfügbaren Befehlen `DEPOSIT` und `WITHDRAW` testweise einzahlen/auszahlen.
- `EXCHANGE` und `EXCHANGE_BACK` sind ebenso per UI erreichbar und verwenden **ausdrücklich fiktiven 1:1-Kurs**; dies sind weder tatsächliche Währungswechsel noch realistische Marktquotes.
- Ein Link zur offiziellen MoonPay-Seite und Anbieterinformationen zu PayPal befindet sich im Infofeld. **Es besteht keine echte PayPal-Session, keine automatische Abbuchung, keine echte Einzahlung oder Auszahlung aus dem lokalen Bot.**
- **Eine echte Wallet existiert noch nicht.** Das bereits vorhandene Watch-only-Manifest ist keine funktionsfähige verschlüsselte selbstverwahrte Wallet.

## Lokaler Dot-Speicher – ohne Dot-Entwicklung
- Der Bot stellt einen separat vom Paper- und Wallet-Bereich gespeicherten privaten, lokalen Zwischenspeicher unter `%LOCALAPPDATA%\MemeSniperPaper\research-scratchpad\notes.json` bereit.
- Autorisierte Forschungsrollen können unter `GET/POST /api/agent/scratchpad` über Loopback `127.0.0.1` Informationen lesen und speichern. Die API setzt die bestehenden lokalen Bearer-Tokens der Forschungsrollen voraus.
- `visibility:'shared'` erlaubt allen authentifizierten Forschungsrollen die Lektüre; `visibility:'role_only'` schränkt auf die jeweilige Rolle ein. Daten verfallen nach spätestens 24 Stunden. Maximal 128 Records und 4 KiB je Record.
- Private Schlüssel, Seed-/PayPal-Felder und zu große oder ungültige Nachrichten werden abgewiesen; vollständig absichtlich harmloser Forschungsinhalt kann später trotzdem unzuverlässige Aussagen enthalten und führt **nie selbst zu einer Order**.
- CLI: `node runner/agent-client.mjs notes` bzw. `node runner/agent-client.mjs put-note note.json` mit bereits konfiguriertem `SNIPER_AGENT_TOKEN`.
- **Die Cloud-Dots haben keinen direkten Zugriff auf den Laptop.** Dazu wäre später ein authentifizierter, gepufferter Transport mit signierten Empfangsbelegen erforderlich; die Dot-Strategie selbst wird in dieser Phase nicht bearbeitet.

## Prüfnachweise
Die CI prüft unter Linux und Windows: lokalen Node-Bot-Start, virtuelles 50-EUR-Einzahlen, Währungstestwechsel und Rückwechsel, Testauszahlung, Ablehnung bei unzureichendem virtuellen Guthaben, lokales authentifiziertes Notes-Lesen/Schreiben, Ablehnung von Privatmaterial und unveränderte Positionsdaten. Darüber hinaus laufen weiterhin bestehende Sicherheits-, Windows-Supervisor- und Blockchain-Forschungstests.

## Noch nicht 100 % einsatzbereit für echte Euros oder Kryptowährungen
- Es fehlt eine sicher abgenommene **selbstverwaltete, vollständig lokale Wallet** mit verschlüsseltem Schlüsselmaterial, Recovery, Signatur-Isolation und Unterstützung für Solana/EVM.
- Es fehlt die echte vom Anbieter genehmigte PayPal-/Krypto-On-/Offramp-Abwicklung für Deutschland, KYC, tatsächliche Gebühren, Zahlungsbestätigungen und Auszahlungen.
- Es fehlen ausführbare DEX-Kauf-/Verkaufsadapter, robuste Transaktionsbestätigungen und eine unabhängige technische Ausführungskontrolle.
- Der spätere Dot-Befehlskanal kann erst dann produktiv genutzt werden, wenn signierte Nachrichten einschließlich Replay-Schutz, Rollenprüfung und Empfangsbestätigung zum lokalen Bot zuverlässig transportiert werden.
- Kein Entwicklungstest ist ein Nachweis einer erfolgreichen Echtgeldzahlung. Keine Geldtransaktionen ohne gesonderte Freigabe. `main`, Hixton und vorhandene Guthaben bleiben unberührt.

**Für die Installation ist diese Fassung derzeit ein Entwicklungsbranch, kein vollständiges Echtgeld-Produkt.**
