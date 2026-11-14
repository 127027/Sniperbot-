# Sniperbot V0.11 – echte lokale Solana-Wallet, 50-EUR-PayPal-Einstieg, Jupiter-Kursauskunft
Stand: 10. November 2026 · Branch `codex/v11-real-local-solana-wallet-onramp-20261110` · **Entwicklungs- und Sicherheitsaudit-Phase**.

## Tatsächlich implementiert
- Der Bot erzeugt **auf dem jeweiligen Gerät** mit Node-Kryptographie ein echtes Solana-Ed25519-Schlüsselpaar. Er speichert den privaten PKCS8-Schlüssel ausschließlich mit `scrypt` (N=32768, r=8, p=1, 16-Byte Salt) + AES-256-GCM (12-Byte IV, Integritäts-Tag) in einem exklusiv erzeugten lokalen Wallet-Datensatz unter `%LOCALAPPDATA%\MemeSniperPaper\wallet\solana-mainnet.v1.json`.
- Im Dashboard: Passwort mind. 16 Zeichen, Wallet-Create, öffentliche Empfangsadresse, Copy, über `getBalance` unmittelbar von Solana **finalisiert gelesenes** SOL-Guthaben. **Keine Buchung** ins virtuelle Paper-Konto und keine PayPal-Zahlungsbestätigung nur aufgrund der Blockchain-Balance.
- User-initiierter verschlüsselter Download der Datei, Test mit Passwort und Wiederherstellung derselben Adresse auf **leerer** Installation. Bestehende Wallet wird niemals ersetzt; korrupte Dateien führen zu einer Sperre statt Reset. Niemals Wallet- oder Backup-Daten zu GitHub, ChatGPT oder Dots übertragen.
- Der Klick auf **MoonPay SOL kaufen** öffnet lediglich die **offizielle Seite** `https://www.moonpay.com/buy/sol`. Dort selbst bei bestehendem MoonPay/PayPal-Konto und erfüllter KYC die **eigenen** Solana-Wallet-Adresse eingeben, 50 EUR und PayPal auswählen, aktuellen Kurs, Gebühren und Netzwerk prüfen, selbst bestätigen. MoonPay unterstützt PayPal grundsätzlich in Deutschland; Einschränkungen je Konto und Produkt gelten. **Keine** API-Schlüssel, keine vollintegrierte MoonPay-Kassenfunktion, keine automatischen PayPal-Abbuchungen und keine Zahlungsbestätigung im Bot.
- Jupiter Swap V2 `/swap/v2/order` ohne `taker`: der Bot kann eine **echte rein informative Kursauskunft** für SOL→beliebige gültige Solana-Token-Mint-Adresse abrufen, ohne signierbare Transaktion. Dies garantiert keine Sicherheit oder Verkaufbarkeit; es gibt keine **Live-Order**, keine Signatur, keinen echten Tausch.
- Das vorhandene sichtbare Windows-Fenster bleibt die einzige Laufzeit-Steuerung: `Q` oder Fensterschließen beendet den Bot. Der Forschungs-Collector/Dots bleiben beim normalen Start deaktiviert.

## Was der Nutzer vor 50 € Echtgeld zwingend testen muss
1. Einen separaten Windows-Ordner verwenden und das normale Paper-Konto sichern.
2. Wallet auf lokalem Rechner anlegen und **verschlüsselten** Backup-Datensatz extern offline speichern, nicht im OneDrive-Ordner.
3. Dateisicherung und Passwort **erfolgreich prüfen** und zusätzlich auf einer getrennten Testinstallation die ursprüngliche Adresse wiederherstellen; keine zwei Geräte mit demselben privaten Schlüssel gleichzeitig unbeaufsichtigt betreiben.
4. Vor dem ersten Echtgeldtransfer unabhängige Sicherheitsüberprüfung des Wallet-Codes inklusive Windows-Dateirechten und UI-Origin-Sicherheit sowie Verifikation mit einem **Kleinstbetrag** auf Solana.
5. Erst anschließend eigenständig entscheiden, ob über MoonPay 50 € SOL erworben werden soll. Immer die eigene externe Solana-Adresse verwenden, NICHT eine neu von MoonPay erzeugte verwahrte Adresse. Solana/SOL nicht an andere Blockchain senden.

## Externe Anforderungen und Einschränkungen
- **MoonPay PayPal Deutschland:** https://support.moonpay.com/en/articles/381271-paypal-faqs und https://www.moonpay.com/buy/sol – Ein- und Auszahlung grundsätzlich möglich, nur falls Konto, KYC, Asset und Limit zugelassen. Echter Gebührenbetrag erst im MoonPay-Checkout.
- **Wichtig:** MoonPay-Wallet-Widget mit voreingestellter `walletAddress` ist **nicht** ohne Partnerintegration nutzbar. Offiziell sind signierte URLs und eine Live-Partnerfreigabe erforderlich: https://dev.moonpay.com/widget/on-ramp/integration-methods/url und https://support.moonpay.com/en/articles/388689-how-to-go-live-with-moonpay-as-a-partner. Deshalb kein erfundener eingebetteter PayPal-Checkout.
- **Jupiter Swap V2:** https://developers.jup.ag/docs/swap/index – Kursaufruf ohne Signatur; echte Ausführung braucht `/order` mit `taker`, lokal sicher geprüftes Signieren und `/execute` sowie abschließende Blockchain-Bestätigung, die **noch nicht implementiert ist**.
- **EEA-Ausnahme:** MoonPays vereinfachter direkter Fiat→beliebiger Solana-Memecoin DeFi-Kauf ist in der EEA derzeit NICHT verfügbar: https://support.moonpay.com/en/articles/386612-simplified-buy-for-solana-based-assets. Erst SOL/USDC erwerben, danach über geeigneten DEX tauschen.
- **Deutschlands MoonPay-Balance-Sonderregeln:** Guthaben ist für Kryptokauf bestimmt, darf nicht mehr als 30 aufeinanderfolgende Tage gehalten werden; weitere Limits siehe https://support.moonpay.com/en/articles/381106-moonpay-balance-explained.

## Nicht fertig / nächste technische Abnahme
- Noch keine vollständige EVM-Wallet (Base/Ethereum/BNB), keine automatisierte Gas-/Chain-Umverteilung.
- Kein sicherer Echtgeld-Signing-/Ausführungsadapter mit Independent Review, Simulation, Zielprogrammen-Whitelist, Slippage-/Spend-Limit, Settlement-Receipts und Retry/Nonce.
- Keine echte PayPal API-Anbindung; der Endkunde muss MoonPay selbst öffnen und seine eigene Zahlung bestätigen.
- Keine echte Anbieter-/PayPal-Zahlung durchgeführt. Keine reale Transaktion und kein echter Swap validiert. Kein Zugriff auf den persönlichen Windows-Rechner durch GitHub-Actions-Test.
- Wallet ist eine Software-Hot-Wallet auf einem Online-Rechner, **keine Cold-Wallet und nicht risikofrei**. Kleine Probebeträge und ein separates enges Risikobudget sind ratsam.

**Erst nach separater Sicherheitsabnahme und einer durch den Nutzer eigenständig bestätigten Transaktion ist die reale Einzahlungsfunktion praktisch bewiesen. Den Bot als 100 % Echtgeld-/DEX-bereit zu bezeichnen wäre falsch.**
