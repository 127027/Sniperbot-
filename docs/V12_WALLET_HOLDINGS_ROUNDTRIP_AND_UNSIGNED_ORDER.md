# Sniperbot V0.12 – lokale Wallet: reale Tokenbestände, Blockchain-Eingänge und Kauf-/Rücktausch-Vorprüfung
Stand 10.11.2026 · Entwicklungsbranch `codex/v12-solana-roundtrip-quote-and-holdings-20261110` · Draft PR #21.

## Fertig implementierte, ausschließlich LESENDE Funktionen
1. **Eigene Wallet:** Die auf diesem Rechner erzeugte, verschlüsselt gespeicherte Solana-Wallet aus V0.11 bleibt erhalten. Alle vorhandenen Paper-Konten bleiben unangetastet.
2. **Echter SOL-Kontostand:** `GET /api/wallet/balance` fragt das Solana-Mainnet finalisiert ab (bestehende Funktion).
3. **SPL-Token und Token-2022:** Neu `GET /api/wallet/tokens`, überprüft über Solana `getTokenAccountsByOwner` das tatsächliche Token-Programm, den öffentlichen Konto-Eigentümer, die Mint-Adresse, Token-Atome, Dezimalstellen sowie `frozen`/ `initialized`. Konten mit Fremdeigentümer werden verworfen; unvollständige RPC-Daten erzeugen Fehlermeldung statt Nullsaldo. Kein Guthaben wird ins Paper-Konto übernommen.
4. **Eingang von Blockchain-Überweisungen:** Neu `GET /api/wallet/activity`, liest bis zu drei finalisierte Transaktionssignaturen, validiert echte Kontostandsänderungen in nativen SOL-Lamports und unterscheidet SOL-Zuwachs, Abfluss, fehlgeschlagene und unverifizierte Transaktionen. **Die Blockchain beweist keine PayPal-/MoonPay-Abrechnung.** Ohne separaten Anbieterbeleg darf der Bot nie „PayPal bezahlt“ behaupten.
5. **Kaufkurs + Rücktauschkurs:** Neu `GET /api/wallet/swap-roundtrip`: Ein Jupiter Swap V2 read-only Kursaufruf SOL→neuer SPL-Token, anschließend ein zweiter read-only Kursaufruf für exakt die prognostizierte Tokenmenge zurück nach SOL. Das zeigt nur zwei **zeitlich aufeinanderfolgende** indikative Marktangebote, nicht tatsächliche Verkaufbarkeit, keinen sicheren Coin, keine garantierte Rendite und keinen ausführbaren Swap. Auch ein positiver Roundtrip darf keine Kaufentscheidung auslösen.
6. **Konkrete vorbereitete Order:** Neu `GET /api/wallet/unsigned-order`, fragt Jupiter Swap V2 mit der öffentlichen lokalen `taker`-Adresse an. Untersucht ausschließlich den unsigned Solana-Legacy-/v0-Transaktionskopf, Signer-/Account-Position und ob der eigene Wallet-Schlüssel als erforderlicher, noch **nicht unterschriebener** Signer vorkommt. Gibt **niemals** die rohe Transaktion zurück, noch signiert/versendet diese Schnittstelle irgendetwas. **Signierbarkeit, gesamte Instruction- und Address-Lookup-Table-Prüfung, Fee-/Empfängerprüfung und Sicherheit sind nicht bewiesen.**
7. **Wallet-Sicherheitsverbesserung:** Der verschlüsselte private Wallet-Backup-Datensatz kann nicht länger via unauthenticated `GET` abgerufen werden. Der Export erfordert in der sichtbaren Oberfläche eine explizite Benutzerhandlung und eine lokal verifizierte Wallet-Passphrase, Same-Origin und Rate Limit. Kein Export über GitHub, Dots oder Netz-RPC.
8. **Sichtbare Windows-Benutzeroberfläche:** Buttons für die echten öffentlichen Blockchain-Guthaben, letzte Blockchain-Aktivität, Jupiter-Hin- und Rücktausch-Kursprüfung und unsignierte Transaktionsprüfung. Das sichtbare Starterfenster bleibt die einzige aktive Laufzeit. `Q` oder Fensterschließen beendet den Bot; kein Autostart.

## Wirklich beobachteter Jupiter-Markt-Vergleich (nur read-only)
GitHub-Liveprobe `runner/solana-roundtrip-live-probe.mjs` ruft SOL→USDC→SOL bei Jupiter in zwei echten, zeitversetzten Kursabfragen ab. Ausgangszeit und Kurse sind Momentaufnahmen. Die Quoten sind keine realisierten Swaps. Beide Legs müssen für einen brauchbaren Quoten-Nachweis beantwortet werden, sonst `BLOCKED`.

## Vor 50 EUR Einzahlen/Tauschen offen
- Benutzerseitige PayPal-Überweisung kann bei dem Anbieter MoonPay je nach Eligibility/KYC/Asset vorhanden sein, es besteht **keine produktive Partnerschnittstelle** und der Bot kann keine echte Zahlung bestätigen. Zahlungen bleiben beim autorisierten Zahlungsanbieter im Browser.
- Auch wenn SOL im eigenen Wallet eingeht, werden weder für Jupiter signierbare Transaktionen sicher auditiert noch lokal signiert. Das ist eine bewusste Geld-Sicherheitsgrenze, keine vergessene Schaltfläche.
- Für sichere tatsächliche Swap-Ausführung fehlen: unabhängige Program-/Instruction-/Lookup-Table-Prüfung, Asset-/Slippage-/Fee-/Spend-Limits, sichere kurzzeitige Schlüsselentschlüsselung mit Windows-Sicherheitsbindung, RPC-Simulation, signiertes Senden nur nach ausdrücklich kontrollierter Zustimmung, Settlement-/Reorg-/Retry-Receipt und Rücktausch/Recovery.
- Danach: Base/Ethereum/BNB-Chain-Wallets, weitere Tokenstandards, Multi-Chain-Swap-Routing, Provider-Autorisierungen. Die fünf Cloud-Dots werden während dieser Bot-Entwicklungsphase **nicht** verändert.

## Referenzen
- Jupiter Swap V2: https://developers.jup.ag/docs/swap/order-and-execute
- Solana Token Accounts: https://solana.com/docs/rpc/http/gettokenaccountsbyowner
- Solana Get Transaction: https://solana.com/docs/rpc/http/gettransaction
- MoonPay PayPal: https://support.moonpay.com/en/articles/381271-paypal-faqs

**Kein Echtgeld bewegt, keine reale PayPal-Zahlung, keine reale Blockchain-Transaktion ausgeführt.** Nur Entwicklungs-/Automatisierungstests im GitHub-Runner. Persönlichen Laptop und Wallet nicht automatisch aktualisiert. Vor tatsächlicher Echtgeldnutzung Sicherheitsreview und unabhängige Wiederherstellungsprüfung erforderlich.
