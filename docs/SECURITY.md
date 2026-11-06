# Sicherheit / Betriebsregeln

**Ausschließlich Forschung und Paper-Trading.** Jeder Wert in der lokalen Anwendung ist virtuell, auch wenn er als „EUR“ oder „USDC“ beschriftet ist. Der Code enthält keine Schlüssel und darf keine echten Orders oder Zahlungen ausführen.

- Localhost-Server nur `127.0.0.1`; bei Netzwerkfreigabe neu absichern und schriftlich reviewen.
- Fremde öffentliche API-Daten und Agenten-Aussagen als untrusted input behandeln; strikt validieren, Rate-Limits, TTL und Vertrauensstufen.
- Kein Login/OAuth, Wallet-Secret, PayPal-API-Token oder andere Kontodaten in GitHub einchecken. `.local/`, `.env*`, `.pem` und `.key` werden ignoriert. `git status` vor Push prüfen.
- Spend-Controls separat von UX-Schaltern: `entriesEnabled` ist **keine** allgemeine Berechtigung für Ausführung von Echtgeldorders.
- Ungeprüfte Contract-, Liquiditäts- oder Verkaufs-Sicherheitsfelder niemals als positives Ergebnis interpretieren.
- Bei Marktfeed-Ausfall bzw. veralteten Quotes keine neuen riskanten Echtgeldeinstiege; Exit-Fehler dokumentieren und alarmieren.
- Public GitHub Actions erhalten keine Secrets; alle Tests laufen offline.
- Gewünschte reale EUR-Aufladung und Auszahlung: regulatorisch gesondertes Projekt mit Anbieterprüfung, Custody-/Noncustody-Entscheid, KYC/AML, steuerlicher Dokumentation, Gebühren- und Betrugsrisikoanalyse.
- Das Repo darf privat sein; kein automatischer Zugriff anderer Codex-/Dot-Systeme ohne bewusst eingerichtete Berechtigungen.
