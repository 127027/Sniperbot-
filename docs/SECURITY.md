# Sicherheit / Betriebsregeln – aktueller R29 V4.9-Vorrang (18.11.2026)

**R29 V4.9: Aktive automatische Handelsausführung ausschließlich PAPER_ONLY; Echtgeld strikt LIVE_LOCKED.** Der Paper-Bereich verwendet nur virtuelle TEST-Werte. **Der getrennte Echtgeld-/Wallet-Bereich kann verifizierte echte SOL-/USDC-Walletbestände READ-ONLY anzeigen** – diese sind NICHT virtuelles Paper-Guthaben und dürfen weder mit Paper-Zahlen vermischt noch als ausführbare Echtgeld-Trading-Positionen ausgegeben werden. Keine Echtgeldorder, keine Einzahlung oder Auszahlung aus dieser Dokumentation ableiten. Die vorhandenen Wallet-Funktionen und verschlüsselten lokalen Daten bleiben erhalten. [Aktueller R29 V4.5-Wissensstand mit V4.9-Nachtrag](../research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md).

- Localhost-Server nur `127.0.0.1`; bei Netzwerkfreigabe neu absichern und schriftlich reviewen.
- Fremde öffentliche API-Daten und Agenten-Aussagen als untrusted input behandeln; strikt validieren, Rate-Limits, TTL und Vertrauensstufen.
- Kein Login/OAuth, Wallet-Secret, PayPal-API-Token oder andere Kontodaten in GitHub einchecken. `.local/`, `.env*`, `.pem` und `.key` werden ignoriert. `git status` vor Push prüfen.
- Private dynamische Paper-/Real-Zustands-Snapshots sind nur authentifiziert lokal abrufbar; ein sicherer automatischer Cloud-ChatGPT-Rückkanal ist weiterhin nicht bewiesen. Keine privaten Guthaben, Wallet-Adressen, Credentials oder Kontodaten in öffentlichen GitHub-Forschungsdateien speichern.
- Zusätzliche Paper-Risikogates (1 % Einzelposition, 3 % Gesamtexposition) gelten aktuell unabhängig von den gespeicherten Nutzerpräferenzen; ihre fachliche Änderung erfordert getrennte Sicherheitsabnahme.
- Spend-Controls separat von UX-Schaltern: `entriesEnabled` ist **keine** allgemeine Berechtigung für Ausführung von Echtgeldorders.
- Ungeprüfte Contract-, Liquiditäts- oder Verkaufs-Sicherheitsfelder niemals als positives Ergebnis interpretieren.
- Bei Marktfeed-Ausfall bzw. veralteten Quotes keine neuen riskanten Echtgeldeinstiege; Exit-Fehler dokumentieren und alarmieren.
- Public GitHub Actions erhalten keine Secrets; alle Tests laufen offline.
- Gewünschte reale EUR-Aufladung und Auszahlung: regulatorisch gesondertes Projekt mit Anbieterprüfung, Custody-/Noncustody-Entscheid, KYC/AML, steuerlicher Dokumentation, Gebühren- und Betrugsrisikoanalyse.
- Das Repo darf privat sein; kein automatischer Zugriff anderer Codex-/Dot-Systeme ohne bewusst eingerichtete Berechtigungen.

## Zentrales Research-Netz / getrennte Nutzerbots (neue Sollarchitektur 07.11.2026)

Der zentrale Publisher erhält **ausschließlich die Berechtigung, signierte Research-/Exit-Hinweise zu senden**, niemals `BUY/SELL/DEPOSIT/WITHDRAW/RESET` bei fremden Instanzen auszuführen oder Wallet-/Kontostände abzurufen. Jeder Nutzer besitzt eigene Identität, Daten, Credentials, Einstellungen und künftig eine eigene Wallet. Kein gemeinsames Seed-Material oder Datenverzeichnis für Freunde. Client-registrierte Abos per TLS/Signatur/TTL, unabhängige lokale Risiko-/Quote-Gates, Revocation und Geräteisolation sind Pflicht. PWA/App-Remotezugriff darf nur die eigene Instanz autorisieren; ohne Schutzmechanismen kein Internetzugang zur localhost-API. Der Stand ist derzeit nur PAPER; vollständige Spezifikation: [DISTRIBUTED_INSTANCES.md](DISTRIBUTED_INSTANCES.md), [SIGNAL_DISTRIBUTION_PROTOCOL.md](SIGNAL_DISTRIBUTION_PROTOCOL.md).

