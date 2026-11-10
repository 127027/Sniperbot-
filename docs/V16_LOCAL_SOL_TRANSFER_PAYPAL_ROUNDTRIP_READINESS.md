# V0.16 · Laptop – Selbstverwahrte SOL-Wallet mit lokal signiertem Auszahlungsweg

Stand: 10.11.2026 · Branch `codex/v16-laptop-real-sol-withdrawal-readiness-20261110` · Draft PR #25.

## Ziel und tatsächlicher Entwicklungsstand

**Nutzerziel:** Windows-Bot von GitHub laden, lokal sichtbaren Bot starten, eigene lokale Wallet einrichten, per PayPal 50 € an diese Wallet einzahlen, mit Krypto handeln, später in Euro an PayPal auszahlen.

**Aktuell tatsächlich implementiert:**
- Jede Installation erstellt ihre eigene Ed25519-Solana-Wallet, deren private PKCS8-Schlüsseldaten lokal scrypt/AES-256-GCM-verschlüsselt gespeichert werden; die Wallet-Adresse ist öffentlich. Die Wallet kann aus verschlüsseltem Backup + Passwort auf einer leeren Installation wiederhergestellt werden. Laptop bleibt Sichtbarkeits- und Kontrollinstanz.
- Bereits existierendes öffentliches Lesen von finalisiertem SOL/SPL-Guthaben, einzelner Blockchain-Belege und eines Jupiter SOL↔Token Kurs-/Unsigned-Order-Previews. **Jupiter-Ausführung ist weiterhin GESPERRT.**
- Neu: echte **Native-SOL-Überweisung** direkt aus der lokalen Wallet mittels ausschließlicher SystemProgram-Transfer-Instruktion. Kein universeller Transaktionssignierer, keine beliebigen Programmanweisungen, keine SPL-Auszahlungen und kein Token-Swap.
- Limits: 2 SOL maximal pro Überweisung, mindestens 0,005 SOL als Schutzreserve, 10.000 Lamports Mindesttransfer. Frische Blockchain-Balance und Blockhash, signierte RPC-Simulation vor `sendTransaction`, keine automatischen Retries.
- Nur im Laptop-`MASTER`-Modus und sichtbaren Browser: erst 75 Sekunden gültige Empfänger-/Betragsvorschau, dann explizit `ICH SENDE SOL` eintippen, Wallet-Passwort, abschließende Browserbestätigung. `FOLLOWER`, Offline-Modus und fremde Browser-Origins werden abgewiesen.
- Transaktionsjournal mit Signatur **vor Broadcast auf Platte geschrieben**. Bei unbekanntem RPC-Ausgang ausdrücklich `SUBMISSION_UNKNOWN_DO_NOT_AUTOMATICALLY_RETRY`, niemals automatisch zweites Senden. Einreichung allein ist keine Blockchain-Finalisierung.
- Der Bot kann weiterhin nur seine eigene Wallet kontrollieren und bekommt niemals Benutzer-PayPal-Logindaten, Cloud-Dot-Signaturen oder Seedphrasen zu sehen.

## Nutzerseite – möglicher manueller PayPal-Kauf (noch kein integrierter Checkout)

1. Separater Windows-Ordner **außerhalb OneDrive**. Bot aus GitHub-Beta-Branch herunterladen, `Sniperbot_Starten.bat` sichtbar starten und das Gerät als `MASTER` einrichten. Jeder Schritt erfordert praktische Abnahme auf dem Benutzer-Laptop. Die Entwicklung wurde nur in isolierten Linux-/Windows-GitHub-Testumgebungen abgenommen, nicht auf dem persönlichen Gerät.
2. Eigene Wallet erzeugen; verschlüsselte Datei **auf einem externen Offline-Datenträger** sichern; langes Passwort separat. Wiederherstellung unabhängig auf einer frischen lokalen Testinstallation prüfen. Keine privaten Schlüssel in Chat/GitHub/OneDrive.
3. Offizielle Seite `https://www.moonpay.com/buy/sol`: 50 EUR, SOL / **Solana-Mainnet**, PayPal auswählen **falls bei deinem Konto angeboten**, Gebühren/Menge/Minima und KYC prüfen. Die öffentliche Bot-Wallet-Adresse **manuell** eingeben und sorgfältig gegen das lokale Fenster prüfen. MoonPay erfordert für eine voreingestellte Adresse in einer eingebetteten Onramp eine Partnerfreigabe samt signierter URL. Der öffentliche Link ist kein integrierter Zahlungsdienst des Bots.
4. Der Bot kann nach dem realen Eingang nur den Blockchain-Saldo lesen. Das ist noch **kein** offizieller PayPal-/MoonPay-Receipt. Transaktion/Provider-Status separat gegen den eigenen Anbieterbeleg prüfen.
5. Für eine spätere Auszahlung von nativen SOL: auf `https://www.moonpay.com/sell` einen neuen Auftrag eröffnen, SOL/Solana, Betrag und Auszahlungsmethode auswählen. MoonPay gibt für **jeden Sell-Auftrag eine einzigartige Zieladresse** vor. Nur diese Adresse **genau** für die passende Blockchain, Coin und Menge verwenden. Die neue Native-SOL-Sendefunktion des Bots kann den Betrag an die Adresse senden, sofern alle Einschränkungen passen. **Dies ist kein direkter PayPal-Auszahlungsknopf**. MoonPay bestätigt Auszahlung selbst; der Bot hat keine PayPal-Auszahlungs-API.
6. Solana-Token und USDC können noch nicht vom Bot per DEX-Swap erworben oder als SPL-Token transferiert werden. Den heutigen echten `50 € → SOL → USDC`-Automatiktest kann diese Version deshalb **noch nicht** erfüllen.

## Warum noch keine Echtgeld-Freigabe

- Die SOL-Sendestrecke wurde kryptografisch, technisch und mit simulierten RPC-Antworten automatisiert getestet, aber nicht unabhängig sicherheitsauditiert oder auf der echten, mit Geld versehenen Laptop-Wallet erprobt.
- Der auf dem Gerät zu installierende Zahlungs-/Swappfad fehlt weiterhin: MoonPay benötigt Partnerfreigabe für einen integrierten Checkout; Jupiter benötigt vollständig nachvollzogene und sichere Program-/Instruction-/ALT-/Empfänger-/Limit-Prüfungen, lokales Signieren und nachgewiesenes `/execute` mit Finale.
- Solange noch kein vollständiger unabhängiger Key-Recovery-Test mit echtem Kleinstbetrag samt Solana-Transfer vorliegt, **keine 50 EUR in die Beta-Wallet einzahlen**. Der Nutzer soll vor einer echten Zahlung selbst Abgaben, KYC, PayPal-/MoonPay-Limits und Netzwerkbedingungen prüfen.
- Der neue Code liegt in einem Draft-PR, wird nicht automatisch auf die vorhandene Installation übertragen und ändert weder GitHub-`main`, Dots noch Hixton.

## Belege und technische Quellen

- MoonPay PayPal FAQ (10.09.2026): https://support.moonpay.com/en/articles/381271-paypal-faqs
- MoonPay externer Wallet-Verkauf: https://support.moonpay.com/en/articles/559587-how-to-sell-cryptocurrency-stored-in-an-external-wallet-using-moonpay
- MoonPay EU PayPal Auszahlungen: https://support.moonpay.com/en/articles/384613-supported-withdrawal-methods-for-selling-cryptocurrency
- Solana Legacy Wire Format: https://solana.com/docs/core/transactions/transaction-structure
- `sendTransaction` liefert nur Annahme, keine Garantie: https://solana.com/docs/rpc/http/sendtransaction
- `getSignatureStatuses` und finalisierte Blockchain-Receipts: https://solana.com/docs/rpc/http/getsignaturestatuses
- Jupiter order/execution API: https://developers.jup.ag/docs/swap/order-and-execute

**Stand: echter lokal signierter nativer SOL-Transfer technisch implementiert; noch kein echter User-Fiat-Kauf, Token-Swap oder PayPal-Payout. Alle Eingaben und Zahlungen erfolgen erst durch den Nutzer selbst; keine Echtgeldtransaktion wurde durch GitHub-Tests oder Assistenz ausgeführt.**
