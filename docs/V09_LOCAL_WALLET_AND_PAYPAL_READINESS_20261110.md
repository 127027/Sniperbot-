# V0.9 – Sichere lokale Wallet und Fiat-Onramp (Entwurf und implementierte Laborschritte)
Stand: 10.11.2026. **Kein Echtgeld, keine Wallet-Erstellung und keine Live-Orders.**

## 1. Technisch korrekte Trennung von 50 EUR und Wallet-Guthaben
- Eine selbstverwaltete Blockchain-Wallet hält **keine EUR als Bank-/PayPal-Guthaben**. Sie kontrolliert die privaten Schlüssel zu Blockchain-Adressen. 50 EUR müssen vor Chain-Trading mit einem regulierten Onramp-Dienst in einen unterstützten Krypto-Vermögenswert auf einer festgelegten Chain umgewandelt und an die eigene Wallet transferiert werden.
- PayPal kann **Zahlungsmethode** für einen Kauf beim Dienstleister sein. Es ist weder automatisch USDC noch eine allgemeine Wallet-API für eigenständige Bot-Zahlungen.
- Chain-spezifische Gas-/Rent-Reserve bleibt nötig: SOL auf Solana, ETH auf Base/Ethereum, BNB auf BNB Chain. USDC auf einer anderen Chain ist nicht automatisch auf der Zielchain verfügbar. Bridges bergen zusätzliche Risiken und dürfen ohne eigenständige Prüfung nicht automatisch ausgeführt werden.
- Ein späterer autonomer Swap auf DEX benötigt gültige exakte Token-/Pool-Identität, aktuelle routenspezifische **Kauf- und Verkaufsquotes**, lokalen Risk-PASS, Gebühren-/Slippage-/Impact-Limit, Token-Approvals mit Grenzen, lokale Schlüsselautorisierung und Beobachtung der tatsächlich bestätigten Blockchain-Transaktion. Keine private Schlüsselkommunikation mit Dots/GitHub.

## 2. Tatsächlicher aktueller Code
- `runner/wallet-readiness.mjs`: ein enges, nur öffentliche Adressen erlaubendes **lokales Watch-only-Manifest**, das nie Signing, private Keys, Seeds, Passwörter oder PayPal-Zugangsdaten annimmt. Es erzeugt **keine** funktionsfähige Wallet. Die Datei ist lokal; bei Beschädigung kein blindes Überschreiben.
- `runner/paper-fiat-onramp.mjs`: deklarierter **synthetischer** Einmal-50-EUR-zu-Test-USDC-Finanzierungstest mit modelliertem Wechselkurs, Dienstleistergebühr, Spread, Chaingebühr und Minuten-TTL. Keine echten Zahlungen/FX. Nur für explizit pausierte Paper-Testkonten ohne offene Positionen; niemals ein automatischer Einzahlungsmechanismus.
- Noch nicht an den produktiven Bot angeschlossen: beides ist ein bewusst isoliertes Sicherheits-/Labor-Modul. Bestehendes Paper-Guthaben und alte Daten werden nicht verändert.

## 3. Öffentlich geprüfte PayPal-Onramp-Kandidaten
**MoonPay** – der offizielle Support nennt PayPal als Zahlungsmethode in der EU (außer Kroatien, Ungarn, Island); Deutschland fällt damit grundsätzlich in die Region, vorbehaltlich individueller Eligibility, Asset/Chain/Limit/KYC und tatsächlicher Kaufquote. Der dokumentierte Kauf ist ein **interaktiver Nutzer-Checkout**, keine Erlaubnis für einen unbemerkt laufenden Bot, wiederkehrend PayPal abzubuchen.
Quellen: https://support.moonpay.com/en/articles/381271-paypal-faqs und https://support.moonpay.com/en/articles/380823-moonpay-s-supported-payment-methods

**Coinbase** – die offizielle EMEA-Payment-Übersicht kennzeichnet PayPal für EU-**direkten Kryptokauf** und **Cash-Auszahlung**, aber nicht für vorherige EUR-Cash-Einzahlung. Die EU-Funktion kann regional ausgerollt oder eingeschränkt sein; Auszahlungswartezeiten sind möglich. Coinbase-Unterstützung für self-hosted Wallet-Transfers kann Wallet-Eigentumsnachweise und zusätzliche personenbezogene Angaben verlangen.
Quellen: https://help.coinbase.com/de/coinbase/getting-started/add-a-payment-method/add-and-verify-pm-emea
https://help.coinbase.com/de/coinbase/getting-started/add-a-payment-method/paypal-faq
https://help.coinbase.com/de/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/send-receive-crypto-eu

**Transak** – dokumentiert externe Wallet-Zieladresse und KYC; konkrete PayPal-EU-Eligibility, Wechselkurs/Fees sowie automatisierte Zahlung nicht nachgewiesen; daher vorläufig kein PayPal-Vorreiter.
Quelle: https://support.transak.com/en/articles/7846055-buying-crypto-at-transak

**Kosten**: Keine erfundenen pauschalen 50-EUR-Gebühren. Erst der regionale **tatsächliche** Checkout/API-Quote liefert EUR-Kurs, Dienstleister-/Netzwerkgebühren und beim Weitertransfer zusätzliche Kosten. Niemals Provider-Checkout mit einer DEX-Quote verwechseln.

## 4. Schlüsselverwaltung: Ziel und Nicht-Ziele
- *Heute*: keine Wallet und keine echten Schlüssel; kein Anfordern, Erzeugen oder Speichern von Seeds/Schlüsseln durch Dots, GitHub oder Chat.
- *Später*: von der Research-/Trading-Engine isolierter lokaler Signing-Service mit Windows-Benutzerbindung (DPAPI/Schutz durch Betriebssystem, ggf. Hardware-Key), entschlüsselten Schlüsseln nur im benötigten Prozessspeicher, klare Spend-Limits, Address-Whitelists und Emergency-Stop. Signierprozess niemals öffentlich über HTTP; kein fremdgesteuertes Dot-Signing.
- Nicht in OneDrive-/Cloud-synchronisierten Ordnern speichern! Eine Datei auf einem Windows-Laptop ist bei aktivierter OneDrive-Synchronisation oder Systembackup möglicherweise **nicht** nur lokal.
- Mehrgerätefähigkeit benötigt je Gerät getrennte Identität und Schlüssel, Backup-/Recovery-Prozess und explizit getestete Import-/Export-Integrität. Ein 24/7 online laufender Software-Signer ist keine Hardware-Cold-Wallet und bleibt angreifbar.
- Ledger-/Cash-Buchungen nur **nach** erfolgreicher Blockbestätigung, Idempotenz, Retry/Nonce-Handling und Reorg-Überprüfung. Der Paper-Fill muss den gleichen rechnerischen Regeln folgen, nicht zwangsläufig demselben tatsächlichen Kurs.

## 5. Weitere zwingende Abnahmetests (NICHT bestanden / noch nicht implementiert)
1. Eindeutiges Event von Dot -> GitHub -> Windows-Collector -> lokaler Signalconsumer -> signierter, quittierter Befund; mehrfache und verspätete Lieferung, Offline/Restart und fehlende Leseberechtigung.
2. Externe Contract-/LP-/Holder-/Honeypot-/Sellability-Checks und reale größenabhängige Buy/Sell-Quotes, synthetische Fixtures strikt getrennt.
3. Realistische Paper-Trades in separatem Testkonto mit Gebühren, fehlgeschlagenen Buy/Sell-Transaktionen, Risiko-/Kauf-/Exit-Policy und Verlustlimit.
4. Historische as-of Blind-Tests mit vollständiger Gewinner- und Verlustkohorte ohne nachträgliche Gewinner-Leaks; probabilistische 17-Tage-Prognosen erst nach Holdout-Kalibrierung.
5. Separat erst nach Freigabe: Wallet-Erstellung, verschlüsselte lokale Keys, Onramp-Checkout, tatsächlicher EUR->Asset Transfer, Echtgeld-Swaps.

**Freigabegrenze:** Vor einer echten Live-Order ist eine neue, ausdrückliche Echtgeldfreigabe und produktive Sicherheitsprüfung erforderlich. Dieser V0.9-Auftrag aktiviert sie nicht.
