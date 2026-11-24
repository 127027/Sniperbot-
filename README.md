# R29 Cleanroom V0.2 — unabhängiger GitHub-Signalhub + eigene Paper-Clients

> **ZUERST LESEN — R29 STOP THE LOOP (24.11.2026):** [Verbindliche Ursachenanalyse und Arbeitsreihenfolge](docs/R29_START_HERE_STOP_THE_LOOP.md) → [zentrales Aufgabenregister](research/state/r29-development-work-register.json) → [AGENTS.md](AGENTS.md). Keine Wiederholung abgeschlossener Aufgaben. Aktuelle Dot-Zustände live prüfen, nicht aus alten README-Texten ableiten. Keine Orders oder Echtgeld durch diese Dokumentation.


**PAPER ONLY.** Vollständig neu geschriebener Bot-Code auf Branch `codex/r29-cleanroom-paper-20261121` im Repo `127027/Sniperbot-`. Der alte Bot, sein Guthaben von 4.999,01 TEST-USDC, main und die alten Workflows bleiben unberührt. Keine Wallet, keine DEX-Trades, keine Echtgeldfunktion, keine externen Markt-/OpenAI-APIs im lokalen Client.

## Wichtige Trennung
Die fünf unabhängigen Cloud-Dots recherchieren und erstellen Signale, **selbst wenn alle Endgeräte ausgeschaltet sind**. Der lokale Windows-/Laptop-Client liest ausschließlich GitHub und führt bei rechtzeitiger Zustellung virtuelle Orders aus. Jedem Client gehören ein eigenes Paper-Konto mit 5.000 TEST-USDC Startkapital, 50 TEST-USDC pro BUY und eine eigene eindeutige Client-ID. Er schreibt Receipts nach `receipts/<client-id>/<order-id>.json`.

**Keine gemeinsame Cloud-Wallet!** Mehrere Rechner führen dieselben Signale in ihren jeweils eigenen getrennten Ledgern aus. Ein später gestartetes Gerät führt abgelaufene Orders nicht nachträglich aus. Android-/iOS-App ist noch nicht gebaut.

Die 5-Dot-Aufgaben, das GitHub-Cloud-Journal, die adaptive 4/8/12/24 Reviewfrequenz und das genaue Order-Format stehen in [docs/DOT_PIPELINE.md](docs/DOT_PIPELINE.md).

## Windows-Installation in einem NEUEN Verzeichnis

1. Node.js 20+ und Git installieren.
2. `git clone --single-branch -b codex/r29-cleanroom-paper-20261121 https://github.com/127027/Sniperbot-.git R29-CleanPaper`
3. `cd R29-CleanPaper`; `npm test`.
4. Für Receipts einen auf das Repo begrenzten Fine-Grained-GitHub-PAT mit Contents read/write erstellen. Niemals öffentlich teilen.
5. PowerShell: `./scripts/Start-CleanPaper.ps1`. Token im verdeckten Prompt eingeben.
6. Dashboard: http://127.0.0.1:8765 . Kontostand und lokale Positionen in `%USERPROFILE%\.r29-cleanpaper\state.json`.

## Handelsschutz
- Nur GitHub-Signale und ausschließlich virtuelle Paper-Fills. Keine echten Käufe/Verkäufe.
- Jede Order: Dot-4-Autorität, Dot-2+Dot-3-Kette, Chain/Contract/Pool, zwei passende Pool-Preisquellen, Risikolimits und Laufzeit.
- `FRESH_WEB`: Quellen höchstens 90 Sekunden alt.
- `INDICATIVE_WEB_ONLY`: zwei unterschiedliche öffentliche HTTPS-Webdomains mit höchstens zehn Minuten alten Daten, ausdrücklich **nur hypothetische Modellpreise**; keine geprüfte DEX-Quote.
- Jede Order muss beim Client spätestens fünf Minuten nach Erzeugung gültig sein. 0.75% Modellgebühr, 0.40% Modellspread plus Liquiditätseinfluss.
- Local `PAPER_FILLED` belegt eine virtuell verbuchte Transaktion, niemals reale Sellability oder Profitabilität.

Optionaler autorisierter Cloud-Publisher: `npm run publish -- <order.json>` (nur mit GitHub Token außerhalb des Codes). Die ChatGPT-Dots können entsprechende Schritte unmittelbar über den GitHub-Connector durchführen. Kein synthetischer Demotrade wird in den echten GitHub-Signalindex aufgenommen.

## Status
Die neuen Code-/Protokolltests prüfen nur den technischen Weg. Eine aktivierte Cloud-Automation ist noch kein Beweis einer tatsächlich abgeschlossenen Analyse. Ein echter BUY und späterer SELL, jeweils mit Client-`PAPER_FILLED`, sind die offene Produktiv-Paper-Abnahme. Siehe [docs/STATUS.md](docs/STATUS.md).
