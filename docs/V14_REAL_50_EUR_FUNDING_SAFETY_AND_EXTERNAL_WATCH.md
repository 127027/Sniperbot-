# V0.14: 50-Euro-PayPal-Praxistest und Wallet-Beobachtung ohne Echtgeldrisiko für die Bot-Wallet

Stand: 10.11.2026, Entwicklung `codex/v14-real-funding-readiness-20261110`.

## Was möglich ist
Deutschland ist grundsätzlich eine der Regionen, in denen MoonPay PayPal für Kryptokäufe unterstützt (Verfügbarkeit abhängig von Checkout, Konto und KYC). **Der Bot hat weiterhin keine direkte PayPal-Integration und keine live signierte SOL-Transaktion.**

**Für einen heute separat ausführbaren 50-EUR-Praxistest**, während der eigentliche Bot-Executor sicherheitstechnisch entwickelt wird:
1. Offizielle Wallet `https://phantom.com/download` auf dem eigenen Gerät installieren, separate Wallet für den Test einrichten und die Wiederherstellungsphrase sicher offline aufbewahren (nie im Chat oder GitHub).
2. Über `https://www.moonpay.com/buy/sol` die gewünschte Menge SOL für ca. 50 EUR mit PayPal erwerben, falls MoonPay den Kauf gemäß Land, Konto, AML/KYC und Gebühren zulässt. Nur an die **öffentliche Solana-Empfangsadresse dieser externen Phantom-Testwallet** liefern lassen. Keine privaten Schlüssel eingeben.
3. Nach Bestätigung im Blockchain-Explorer SOL-Bestand dieser Test-Wallet beobachten; anschließend im offiziell bereitgestellten Jupiter-Swap-UI `https://jup.ag/` optional **manuell** den SOL→USDC-Swap bestätigen. Genügend SOL für Gebühren im Wallet zurücklassen. Preise und Gebühren vor dem Anklicken überprüfen; eine Quote ist nicht endgültig.
4. In der neuen **ausdrücklich externen und nur lesenden** Bot-Dashboard-Ansicht die öffentliche Phantom-Solana-Adresse eingeben. Klick auf `Externes Guthaben prüfen` ruft öffentliche finalisierte SOL- und SPL-Tokenkonten ab. Das zeigt realen Bestand, bestätigt aber nicht den PayPal-Zahlungsbeleg und bedeutet **nicht**, dass der lokale Bot gekauft oder verkauft hätte.

Die Bot-Wallet und das Paper-Konto bleiben unverändert. Der Observer speichert keine Wallet-Schlüssel und importiert auch keine. Diese separate Teststrecke **erfüllt die gewünschte automatische Bot-Konvertierung ausdrücklich noch nicht**.

## Warum die Entwicklungs-Wallet nicht mit 50 EUR finanziert werden soll
Der neue lokale Bot besitzt zwar eine auf dem Gerät erzeugte verschlüsselte Solana-Adresse, aber noch keinen fertig geprüften Geldabfluss: Es fehlen vollständiger Instruction-/ALT-/Empfänger-/Slippage-Audit, unabhängig abgenommener Signing-Service sowie `/execute` und Finalisierung. Eine private Entwicklungs-Wallet ohne verifizierten Auszahlungs-/Recovery-Weg mit Echtgeld zu befüllen ist nicht angemessen. Verschlüsselte Datei und Passwort allein reichen noch nicht für eine vollständige End-to-End-Abnahme.

## Neue technische Funktionen
- `runner/external-wallet-observer.mjs`: öffentliche Bestände einer ausdrücklich **separaten externen** Solana-Adresse, SOL (finalized) und Token-2022/SPL, auf zwei RPC-Metadatenquellen geprüft, ohne Keys und ohne automatische Handelsbuchung.
- `GET /api/wallet/external-observe?address=...`: lokaler nur lesender Endpunkt, 127.0.0.1 Host, Netzwerkbedingungen und Rate-Limit; keine Aufnahme ins echte Bot-Guthaben, kein PayPal-Zahlungsstatus und kein PAPER-Credit.
- Dashboard: einklappbarer 50-EUR-Phantom/MoonPay/Jupiter-Praxistest mit **separatem** Observer. Es werden keinerlei Zahlungsaktionen vom Bot gestartet.
- Tests: unbekannte Besitzer, RPC-Ausfall, falsche Adressen, keine gefälschten Payment- oder Swap-Receipts, lokaler Offline-Start.
- Der Bot läuft weiter nur solange seine sichtbare Windows-Konsole geöffnet ist. Schließen oder Q stoppt alles.

## Offizielle Quellen
- https://support.moonpay.com/en/articles/381271-paypal-faqs
- https://support.moonpay.com/en/articles/386612-simplified-buy-for-solana-based-assets (dieser direkte DeFi-Kauf ist für EEA nicht verfügbar)
- https://help.phantom.com/articles/buy-sol-eth-and-other-tokens-in-the-phantom-browser-extension-52630526574227
- https://solana.com/docs/rpc/http/gettokenaccountsbyowner
- https://developers.jup.ag/

**Nicht als echtes PayPal-In-Bot-Funding oder Bot-Swap bezeichnen.** Kein Zahlungskonto oder Wallet-Seed an GitHub/Dots weitergeben; kein Echtgeld-Transfer ausgelöst. Nutzer muss Checkout selbst prüfen und bestätigen.
