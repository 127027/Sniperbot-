# R31 – unabhängige Mehrgeräte-Paper-Konten

**Verbindlicher Einstieg für neue Chats: [HANDOVER_2026-11-25.md](HANDOVER_2026-11-25.md).** [Maschinenlesbarer Stand](HANDOVER_STATE.json). Diese Datei ersetzt widersprüchliche frühere Staging-Anweisungen.

R31 ist ausschließlich Paper. Android 0.2 ist gebaut; Desktop und Handy haben eigene lokale Konten. Fünf R30-Dots sind zusätzlich für den R31-Broadcast konfiguriert. Aktuellen Feed und echte Testnachweise bei Wiederaufnahme prüfen. R30 nicht zurücksetzen. Kein Echtgeld, PayPal nicht angeschlossen.

## Start
Desktop: Node.js 22+, Branch `codex/r31-control-center-paper` klonen und `node r31/device-server.mjs` starten; http://127.0.0.1:8787. Eigener lokaler Datenordner je Account (R31_ACCOUNT_DIR), optional R31_PORT. Kein Write-Token nötig.
Android: [APK 0.2 ZIP](https://github.com/127027/Sniperbot-/actions/runs/45568943588/artifacts/15000529800), [Android-Hinweise](android/README.md). Testsignatur kann bei Updates Neuinstallation erforderlich machen; diese löscht lokale Daten. Android-Hintergrundbetrieb nicht garantiert.
Beide: Testgeld einzahlen, Limit und Stake setzen, neue Paper-Käufe erlauben. Neue Geräte übernehmen keine früheren Käufe.

## Verträge und Tests
[MULTI_DEVICE.md](MULTI_DEVICE.md), [R31_DOT_BROADCAST_RUNBOOK.md](R31_DOT_BROADCAST_RUNBOOK.md), [COMPLETION_CHECK.md](COMPLETION_CHECK.md), [Übergabe und priorisierte Restaufgaben](HANDOVER_2026-11-25.md).
Historischer zentraler Staging-Entwurf ist in [README_HISTORY.md](README_HISTORY.md) erhalten; alte server.mjs/controls.json nicht als Mehrgerätebetrieb nutzen.


R40 development: [Updater](R40_UPDATER.md).
