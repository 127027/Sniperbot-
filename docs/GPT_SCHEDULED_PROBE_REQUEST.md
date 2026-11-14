# Einmaliger Versandtest im geplanten Meme-Scout-Lauf

Vom Eigentümer am 07.11.2026 freigegeben: Der tatsächliche geplante Meme-Scout-Lauf soll genau eine harmlose Testdatei veröffentlichen. Kein lokaler Bot-Test und kein Trade.

## Einrichtung durch GPT

Die vorhandene Automation „Meme Scout – Forschungsradar“ anhand der Automationsverwaltung identifizieren und ihre vollständige aktuelle Konfiguration lesen. Keine neue Automation erstellen. Ausschließlich den folgenden einmaligen Prüfauftrag ergänzen; Zeitplan, vorhandene Forschungsaufgabe, Modell, Benachrichtigungen und alle anderen Einstellungen erhalten. Techniklabor und Hixton nicht ändern. Wenn die Änderung nicht möglich ist, BLOCKED samt konkreter fehlender Fähigkeit melden.

Die Testdatei NICHT aus dem interaktiven Einrichtungs-Chat schreiben. Einrichtung und tatsächlicher Scheduler-Lauf müssen im Bericht getrennt bleiben.

## Zusatzauftrag für den nächsten tatsächlich geplanten Lauf

Nur in einem echten geplanten Lauf prüfen, ob der GitHub-Connector verfügbar ist und im Repository `127027/Sniperbot-`, Branch `codex/research-gateway-v04`, schreiben kann. Ziel ist ausschließlich `research/connectivity/meme-scout-scheduled-probe-20261107.json`.

Wenn die Datei bereits existiert, nicht ersetzen oder erneut schreiben. Andernfalls genau eine JSON-Datei erstellen mit:

- schema: `research_transport_probe.v1`
- probe_id: `meme-scout-scheduled-probe-20261107`
- producer: `Meme Scout – Forschungsradar`
- execution_context: `scheduled_automation`
- emitted_at_utc: tatsächlicher aktueller UTC-Zeitpunkt
- paper_only: true
- actionable: false
- message: `Transporttest ohne Coin-Kandidat und ohne Handelsaktion`

Keine Zugangsdaten, privaten Laufkennungen, Kontodaten, Coin-Empfehlungen oder Bot-Befehle hinzufügen. Kein main-Merge. Kein Zugriff auf Laptop, Wallets, Zahlungen oder andere Repository-Dateien. Bei fehlender GitHub-Fähigkeit im normalen Automationsbericht BLOCKED melden, nichts simulieren.

Nach dem Schreibversuch Datei zurücklesen und im Automationsbericht Ergebnis, Zielpfad, Commit und Zeitpunkt nennen; bei Fehlern die konkrete Fähigkeitsblockade ohne Geheimnisse dokumentieren. Die bloße Selbstaussage execution_context ist kein Herkunftsnachweis: Codex vergleicht zusätzlich den tatsächlichen geplanten Ausführungsverlauf mit Commit und Datei.

## Rückmeldung zur Einrichtung

GPT veröffentlicht `docs/GPT_SCHEDULED_PROBE_SETUP_REPLY.md` im selben Branch: tatsächlich geänderte Automation, ob der bestehende Zeitplan erhalten blieb, Zeitpunkt der Einrichtung, erwarteter nächster Lauf soweit sichtbar, und beobachtete Einschränkungen. Keine erfundenen Angaben. Dieser Einrichtungsbericht ist kein erfolgreicher Versandtest.

## Abnahme und Abschluss

Codex prüft unabhängig Datei, Commit und den zugehörigen geplanten Lauf. Ergebnis maximal: GEPLANTER FORSCHUNGSLAUF → GITHUB BESTÄTIGT. Das bedeutet weiterhin NICHT Dot → Windows-Bot bestätigt; ein Connector ist noch nicht implementiert. Der lokale Gateway darf diese Probe nicht als candidate.v1 verarbeiten.

Nach einem belegten Ergebnis oder einem belegten fehlgeschlagenen Lauf den temporären Zusatzauftrag wieder aus der vorhandenen Automation entfernen und deren ursprüngliche Forschungsaufgabe unverändert erhalten. Die vorhandene Testdatei bleibt als nicht handelbarer Nachweis erhalten.
