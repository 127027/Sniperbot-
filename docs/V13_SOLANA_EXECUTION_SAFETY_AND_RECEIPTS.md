# V0.13 – Windows-Bot: Vollständige Solana-Transaktionsstruktur, Gebührenpuffer, RPC-Simulation und Onchain-Belege

**Stand 10.11.2026 · Branch `codex/v13-solana-wire-audit-execution-safety-20261110` · PR #22 (Draft).**

## Die fertigen lokalen Bausteine (Bot allein; Dots unverändert)

1. **Eigene lokal verschlüsselte Solana-Wallet aus V0.11/V0.12**: Ed25519, scrypt/AES-GCM, öffentlicher Schlüssel im Dashboard, Sicherung und Wiederherstellung, weiterhin *keine* Freigabe zur Signierung und zum Senden.
2. **End-to-End-Wire-Decoder** `runner/solana-wire-audit.mjs`: vollständig eingelesene Legacy-/v0-Pakete mit kanonischer Compact-u16-Kodierung, Konto-Signer, unverändert nichtsignierter Wallet-Slot, blockhash, allen Instruktionen und Kontoindizes, Lookup-Tables (ALTs), Programme, End-of-Buffer- und Längenprüfung. v1 sowie Legacy/v0-Pakete über 1.232 Byte werden abgewiesen. ALTs und sämtliche Programme bleiben ausdrücklich **UNVERIFIED**, nicht allowlisted.
3. **Echte SOL-Kassenprüfung** `runner/solana-wallet-spend-preflight.mjs`: finalisiertes SOL-Guthaben der konkreten lokalen Wallet, abzüglich mindestens 0,005 SOL vorsichtigem Gebühren-/Reservepuffer, vor einem Jupiter-Taker-Order-Request. Ausdrücklich keine TEST-USDC-Anrechnung; bei Unterdeckung kein Orderabruf. Die Reserve ist keine nachgewiesene Maximalgebühr.
4. **Unsigned Simulation** `runner/solana-unsigned-simulation.mjs`: nach der Wire-Strukturprüfung wird die rohe **unsignierte** Jupiter-Transaktion ausschließlich intern im Node-Prozess für `simulateTransaction` an den öffentlichen Solana-RPC gesendet. `sigVerify:false`, `replaceRecentBlockhash:true`. Nur Erfolg/Fehler, Slot, geschätzte Gebühr und Rechenverbrauch verlassen das Modul. Keine private Wallet-Information; keine Unterschrift, keine Orderübermittlung oder Blockchain-Ausführung. Simulationserfolg gibt niemals eine Kauf-/Verkaufsfreigabe.
5. **Finalisierter Einzelbeleg** `runner/solana-finalized-receipt.mjs`: Nutzer kann eine konkrete Solana-Transaktionssignatur eingeben; unabhängiges `getTransaction` bei `commitment:'finalized'` überprüft die darin angegebene Signatur, den Wallet-Kontoindex, Solana-Saldoänderungen, SPL-Token-Rohmengen-Deltas und die dokumentierte Netzwerkgebühr. Es wird nichts ins Paper-Konto gebucht. Aus einer Krypto-Kontoveränderung entsteht **keine** PayPal-/MoonPay-Zahlungsbestätigung.
6. **Windows-Oberfläche**: bestehende SOL-/Token- und Hin-/Rücktausch-Buttons bleiben; die unsigned Order-Vorprüfung zeigt nun RPC-Simulation und geschätzte Gebühr; neuer Button für eine beliebige zu prüfende finalisierte Transaktionssignatur. **Kein Button für Live-Signieren oder Senden**, bis vollständig unabhängig auditiert.
7. **Sichtbarer Start**: Der Bot wird weiterhin ausschließlich über sein sichtbares Windows-Fenster gestartet und durch `Q`/Fenster schließen beendet; Dots bleiben außerhalb dieses Entwicklungsauftrags.

## Drei absolut getrennte Nachweise

- **Kurs**: Jupiter liefert nur eine unverbindliche Momentaufnahme, keine sichere Ausführung.
- **Simulation**: RPC simuliert eine *nicht unterschriebene* Transaktion im aktuellen Zustand. Eine grüne Simulation ist weder Settlement noch Betrugsschutz.
- **Finalisierter Blockchain-Beleg**: Ein bereits tatsächlich bestätigter Vorgang kann die Wallet-Saldoänderung belegen. Er beweist nicht, mit welchem externen Dienst oder welcher Zahlungsmethode der Kauf finanziert wurde.

## Was vor den gewünschten echten 50 € noch fehlt

- **Echter PayPal-Checkout in der App** erfordert die tatsächlich freigegebene MoonPay-Partnerintegration, KYC/KYB sowie unterschriebene MoonPay-URLs und Zahlungsstatus-Callbacks. Die derzeitige Oberfläche öffnet nur die offizielle MoonPay-SOL-Kaufseite. Auch ein unabhängiger PayPal-Kauf muss vom Nutzer selbst dort bestätigt werden.
- **Echter DEX-Tausch** erfordert nach dem Wire-Parser: unabhängige Verifikation aller ALTs/Programme/Instruktions-Semantik, input token source, output owner account, max. SOL-Abfluss, min. Token-Ausgabe und Slippage, tatsächliche Fees und Blockhash-/TTL-Schutz; danach getrennten lokalen Signing-Service, signierten Jupiter `/execute`-Aufruf, Solana-Finalisierung und Ledger-Reconciliation.
- **Erst dann** dürfen echte Coins oder Euro als tatsächliches Vermögen behandelt werden. Das getestete Paper-Guthaben bleibt getrennt.
- Die verwendete Hot-Wallet wurde nicht von unabhängigen Security Engineers auditiert. Schlüsselwiederherstellung ist im isolierten Test bestätigt, aber noch nicht auf dem persönlichen Laptop. Keine Kundenzahlung oder reale Swap-Ausführung getestet.

## Aktuelle API-Dokumente
- Solana Transaktionsformate: https://solana.com/docs/core/transactions/versioned-transactions
- Solana `simulateTransaction`: https://solana.com/docs/rpc/http/simulatetransaction
- Solana `getTransaction`: https://solana.com/docs/rpc/http/gettransaction
- Jupiter `/order` und `/execute`: https://developers.jup.ag/docs/swap/order-and-execute
- MoonPay URL-Integration / verpflichtende signierte URLs: https://dev.moonpay.com/widget/on-ramp/integration-methods/url

**Diese Version ist eine Entwicklungsstufe, keine Echtgeld-/Zahlungsfreigabe.**
