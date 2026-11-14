# V0.18 · Sichtbarer Windows-Laptop-Bot: Paper- und Echtgeldoberfläche getrennt

**Stand 10. November 2026 · Branch `codex/v18-paper-live-dashboard-split-20261110` · Draft PR #27.**

## Was das Dashboard jetzt zeigt

Die bisher überfüllte Startansicht wird auf zwei Hauptbereiche aufgeteilt:

**Paper-Trading (Standard beim Start)**

- Virtuelle Euro und TEST-USDC erscheinen ausschließlich im Paper-Bereich. Ein-/Auszahlung und Demo-EUR→TEST-USDC-Umrechnung verändern nur `paper-state-v03.json`, **niemals** die Blockchain-Wallet.
- Der bisherige Paper-Bot-Start-/Stopp-Schalter, das virtuelle Gesamtkapital, offene Paper-Positionen, Paper-Einsatzlimits und Budgeteinstellungen bleiben erhalten. Existing paper-ledger migrations and state are unchanged.
- Ein echter Blockchain-Kontostand wird nie mit den virtuellen Euro zusammengerechnet.

**Echtgeld (separater Tab)**

- Eine ausdrücklich **lokal verschlüsselte** Solana-Mainnet-Wallet mit öffentlicher Empfangsadresse und der bisherigen Wallet-Einrichtung.
- Oben ein eigener Echtgeld-Überblick: **tatsächlich finalisierte** SOL-Bestände und Solana-USDC-Bestände, streng aus öffentlichen Solana-Balance-/Token-Accounts gelesen und ohne Paper-Buchungen. Ein Token-Saldo wird mit seiner tatsächlichen kleinsten Einheit und Dezimalzahl dargestellt, sodass 50.000.000 USDC-Atome exakt 50 USDC ergeben.
- **Euro-Totalwert wird als unbekannt („— €“) angezeigt**, da noch kein unabhängig überprüfter aktueller EUR-Bewertungs-/FX-Dienst im Bot angebunden ist. Es wird weder ein PayPal-Zahlungseingang noch eine reale Position oder ein Gewinn behauptet, wenn nur Wallet-Assets oder Jupiter-Quotes existieren.
- Die Hauptaktionen „Einzahlen – Zahlungsanbieter“ und „Auszahlen – Zahlungsanbieter“ öffnen die offiziellen **externen MoonPay-Seiten**, keine vorgetäuschten direkten PayPal-Zahlungen. Der Nutzer muss dort Netzwerk, KYC, Gebühren, Zahlungsart und Empfänger selbst prüfen. Die neue Wallet ist weiterhin nicht für das Einzahlen von 50 EUR empfohlen, bis der komplette Swap-/Rückweg geprüft ist.
- Ein sichtbarer **Echtgeldhandel AN/AUS**-Schalter erscheint, aber startet bewusst **AUS und ist deaktiviert**. Der neue Backend-Endpunkt `GET /api/trading/live-mode` gibt immer `mode: LOCKED, enabled:false, can_enable:false` zurück. `POST` zum Aktivieren wird stets mit **HTTP 423** abgewiesen – unabhängig von Klicks, Browsermanipulation oder virtueller Kasse. Deaktivieren mit `{enabled:false}` bleibt erlaubt.
- Eine eigene READ-ONLY `/api/wallet/overview`-Abfrage zeigt nur **verifizierte reale SOL-/SPL-USDC-Bestände**. Offline, fehlender Wallet, RPC-Fehler, falscher Kontoinhaber, gefrorene USDC-Konten und ungeprüfte Chain-Zustände führen zu deutlichen Fehlermeldungen, nicht zu fingierten Null- oder Euro-Beträgen.
- `real_open_positions` und `real_pnl_eur` sind ausdrücklich **`null`**, solange keine unabhängig finalisierten Bot-Live-Fills vorliegen. Das Dashboard zeigt „Noch keine unabhängig bestätigten Bot-Live-Käufe/Verkäufe“, nicht die Paper-Positionen.

**Erweitert / Technik**

- Forschung, GitHub-Zentrale und Gerätezuordnung, System- und Forschungsdiagnose werden aus der Hauptansicht in den aufklappbaren Bereich „Erweitert“ verschoben.
- Wallet-Backup, Transaktionsjournal, Einzelbelegkontrolle und technische Coin-Quote-Prüfungen liegen in aufklappbaren Unterbereichen. Der dynamische Token-/Blockchain-Router bleibt vorhanden, aber nicht ständig im Blick.
- Alle bisherigen IDs und Eventhandler werden erhalten. Die Seiten werden beim Laden durch reine DOM-Verschiebung der bestehenden Sections zusammengestellt; keine Löschung, kein Reset und keine Migration der Wallet oder Paper-Daten.
- Windows-Supervisor und sichtbarer Fenster-Stop bleiben unverändert.

## Abnahme und aktuelle Grenzen

- UI-JavaScript-Parser prüft die zwei Tabs, das initial deaktivierte Live-Switch-Element und sämtliche bisherigen Wallet-/Paper-Controls.
- Unit-Tests prüfen reine Blockchain-Bilanz aus echten SOL-/USDC-Atoms, falschen Eigentümer, ungültige Dezimalstellen, fehlende Chain-Verifizierung und fehlende EUR-Kurse.
- Isolierter HTTP-Test startet den **echten** lokalen Node-Server: `GET /api/trading/live-mode`, `POST enabled:true → 423`, `POST enabled:false → 200`, fehlerhafte Werte und Cross-Origin werden blockiert; `GET /api/wallet/overview` bleibt offline gesperrt. Windows- und Linux-CI testen die Einführung.
- Bestehende Wallets, historische Paper-Daten, GitHub-`main`, Forschungs-Dots und Android-App werden nicht verändert.
- **Noch nicht fertig**: produktiver PayPal-On-/Offramp, sichere DEX-/Jupiter-Swap-Signatur-/Ausführungsstrecke, echte verifizierte Gebühren/Slippage-/Fraud-Gates, wiederhergestellte Wallet auf persönlichem Laptop, echte 50-EUR-Zahlung, tatsächliche Live-Positionsbuchung und offizieller EUR-Preisfeed.

**Die Trennung der Oberfläche ist kein Ersatz für Echtgeldhandel. Die Live-Sperre bleibt zwingend.**
