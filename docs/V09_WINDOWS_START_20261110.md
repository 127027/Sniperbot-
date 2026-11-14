# Sniperbot V0.9 – Windows-Start und belegte Grenzen
Stand: 10.11.2026 · Branch: `codex/v09-local-wallet-readiness-20261110`.

## Tatsächlich startbar
- Windows-Starter: `Sniperbot_Starten.bat`, startet den vorhandenen PowerShell-Supervisor, lokalen Node HTTP-Paper-Server und read-only Markt-Collector.
- Dashboard: `http://127.0.0.1:3030`.
- Dashboard-Bereich **V0.9 · Systemprüfung**: lokal aus den GitHub-Role-Snapshots gelesene Kennzahlen, Signatur-/Contract-/Quote-Blocker sowie eine **ausschließlich rechnerische** 50-EUR-Testumrechnung zu TEST-USDC mit einem ausdrücklich frei erfundenen Beispielkurs.
- Lokale Schnittstelle `GET /api/v09/status` meldet jederzeit offen `live_enabled:false`, `signing_enabled:false`, `wallet_created:false`, `automated_external_paper_trading_enabled:false`.
- `POST /api/command` mit `PREVIEW_PAPER_FUNDING` führt nur eine Berechnung aus; keine Paper-Kasse wird geändert, keine Zahlung/Wallet/Order ausgelöst.
- Verfügbare, noch nicht produktiv angeschlossene Testmodule: `runner/execution-parity-lab.mjs`, `runner/wallet-readiness.mjs`, `runner/paper-fiat-onramp.mjs`.

## GitHub-Verifikation
- CI-Lauf: https://github.com/127027/Sniperbot-/actions/runs/42816539413 (Linux Node-Tests, Windows Archiv-/AMM-Paper-/Wallet-/Onramp-Tests, isolierter echter V0.9-HTTP-Server-Boot, PowerShell-Supervisor mit Fake-DPAPI-Roundtrip und Windows Job Object).
- **Nicht** auf dem persönlichen Laptop getestet; keine Behauptung einer vollständig autonomen Memecoin-Erkennung oder eines verlässlichen historischen Gewinner-Backtests.

## Sicheres Upgrade auf dem privaten Laptop
1. Bestehenden Bot vollständig mit **Q** beenden. Alte Konsole schließen.
2. Zur Sicherheit **`%LOCALAPPDATA%\MemeSniperPaper` und den alten Projektordner `.local` separat sichern**. Dies erhält den lokalen Paper-Stand samt ggf. eigenen Marktforschungsarchiven.
3. ZIP von `https://github.com/127027/Sniperbot-/archive/refs/heads/codex/v09-local-wallet-readiness-20261110.zip` herunterladen, entpacken in einen **neuen** Ordner außerhalb von OneDrive, z. B. `C:\Sniperbot-V09`.
4. Programmdateien der alten Version **nicht** wahllos überschreiben. Bei Bedarf die alten **Forschungsarchive** aus `.local` separat nach Backup und Ordnervergleich übertragen; keine alte Anmeldedatei unkontrolliert ins Repository kopieren.
5. Node.js 22 LTS muss auf Windows verfügbar sein. Im neuen Ordner **`Sniperbot_Starten.bat`** starten und `http://127.0.0.1:3030` öffnen.
6. Paper-Guthaben und offene Positionen im Dashboard prüfen, bevor du Einstellungen veränderst. Der lokale Hauptdatenordner unter `%LOCALAPPDATA%\MemeSniperPaper` wird vom vorhandenen Server wiederverwendet. Falls die Daten fehlen oder sich unterscheiden: Bot beenden und gesicherte Daten vergleichen, nicht auf RESET klicken.
7. Über `http://127.0.0.1:3030/api/v09/status` den V0.9-Status prüfen. V0.9 soll ehrlich `wallet_created:false` und `automated_external_paper_trading_enabled:false` melden.
8. Keine PayPal-Zahlung durchführen und keine echten Schlüssel hinterlegen: Die echte Krypto-Wallet, selbsttätige PayPal-/Onramp-Finanzierung, Live-Signing und autonome DEX-Ausführung sind **nicht** implementiert.

## Wichtigster verbleibender Blocker vor autonomen Paper-Orders
- Authentisch signierter verifizierter fünf-Dot-Konsens und unabhängiger risk_controller;
- tatsächliche aktuell ausführbare Kauf- UND Verkaufsrouten samt Contract-/Tax-/LP-/Holder-Prüfung, Exit-Liquidität und zeitkorrekten Quellen;
- bestätigte Dot→GitHub→Windows→Receipt-Laufkette unter realen Offline-/Restart-/Retry-Bedingungen;
- Echte-Pool-Paper-Simulator erst nach unabhängiger Quote-Verifikation; keine synthetischen Labor-Quoten als echte Marktbelege deklarieren;
- historische Blind-Holdout-Auswertung mit zeitgenössischer Gewinner- und Verliererkohorte.

## Änderungspolitik
Kein Echtgeld, keine echten Wallets, kein Änderung an `main` oder Hixton, keine automatischen finanziellen Transaktionen. Forschungs-Dots arbeiten unabhängig und schreiben nur nicht-exekutive Forschungsberichte. Wenn echte Validierungsadapter fehlen, wird der Kauf bewusst blockiert.
