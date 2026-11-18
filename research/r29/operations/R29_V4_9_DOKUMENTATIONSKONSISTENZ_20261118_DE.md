# R29 V4.9 – GitHub-Dokumentationsabgleich (18.11.2026)

## Verbindlicher Auftrag

Bereits vorhandene Funktionen, Konten, Wallets, Einstellungen und die Windows-Oberfläche erhalten. Fehlende Cloud-/Echtgeldfunktionen nicht durch Texte zu fertigen Funktionen erklären. Eine GPT-Strategie; perspektivisch zwei vollständig unabhängige Paper-/Echtgeldkonten mit dynamischem Bot-Ist-Zustand und eigenen Sicherheitsgates. Echtgeldhandel bis gesonderter Freigabe gesperrt, keine neue kostenpflichtige API, keine neuen Bots.

## Nachweis und Referenz

- Haupt-Implementierung: [PR #65](https://github.com/127027/Sniperbot-/pull/65) (R29 V4.9).
- Früherer Sicherheits-/Kurier-/UI-Code: PRs #56–#64.
- Maßgebliche fortlaufende Faktenchronik: [R29 V4.5 mit V4.6–V4.9-Nachträgen](R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md).
- Aktueller Checkpoint: [R29_LATEST_CHECKPOINT.json](R29_LATEST_CHECKPOINT.json).
- Diese Bereinigung ist **Dokumentation**, keine Bestätigung eines neuen echten Modellaufrufs oder Paper-/Echtgeldtrades.

## Bereinigte aktive Dokumente

Aktive Kopfabschnitte auf V4.9-IST/SOLL aktualisiert: `AGENTS.md`, `README.md`, `ERSTER_START.txt`, `SNIPERBOT_R29_START_HERE.md`, `docs/ARCHITECTURE.md`, `docs/KNOWN_ISSUES.md`, `docs/ROADMAP.md`, `docs/CODEX_TASKS.md`, `docs/REQUIREMENTS.md`, `docs/R28_VERBINDUNGSTEST_UND_PAPER_AUDIT.md`, `docs/SECURITY.md`, `docs/V18_PAPER_AND_REAL_MONEY_DASHBOARD.md` sowie der Kopf der kanonischen Wissenschronik.

Historische Ziel-/Implementierungsanweisungen explizit als Archiv markiert (ohne ihre originalen Lernbelege zu fälschen): `docs/V06_TOTAL_BUDGET_AND_MULTI_SOURCE_DISCOVERY_20261110.md`, `docs/STRATEGIC_PAPER_CAPITAL_V1.md`, `docs/CENTRAL_PAPER_IMPLEMENTATION.md`, `docs/DISTRIBUTED_INSTANCES.md`, `docs/HOLD_EXIT_POLICY.md`, `docs/WINDOWS_READONLY_MARKET_COLLECTOR.md`.

Die übrigen bereits im V4.5-Audit markierten historischen Berichte bleiben datierte Archivtexte; ihre damaligen Befunde dürfen nicht als aktuell ausführbare Strategie verwendet werden. Diese Prüfung beansprucht keine Aussage, dass ausnahmslos jede historische Textzeile in diesem Repository zeitlos korrekt ist.

## Bereinigte Widersprüche

1. V4.5-Kopfansichten beschrieben den dauerhaften GPT-Exit-Schutz noch als nicht im Code implementiert. PR #61/#63 und nachfolgende Liveness-Gates existieren inzwischen; **persönliche Windows-Ausführung muss weiterhin separat bestätigt werden**.
2. Ältere Verbindungs-/Kurier-Aussagen (acht Replay-IDs, NO_TRADE) waren Momentaufnahmen. Sie sind **keine** Anzahl autonomer GPT-BUYs.
3. Frühere Research-/Multi-Agenten-Zielbilder sind keine Genehmigung für neue Bots, Dots, getrennte Strategiemodelle oder lokale bezahlte OpenAI-API.
4. Im Paper-Dashboard sind bevorzugter Einsatz und Totalbudget dynamische Benutzerwerte. **Zusätzliche bestehende 1-%-Einzel- und 3-%-Gesamtexpositionsgrenzen** können enger wirken. Die Aufhebung wurde von PR #65 weder implementiert noch stillschweigend genehmigt.
5. Das Echtgeld-UI mit realer read-only Solana-Wallet ist weder ein rein virtuelles Testkonto noch ein produktiver Echtgeld-Executor. Eigene persistierte Echtgeldpräferenz, Gesamtexposure und offenes Positionsledger sind noch **nicht nachgewiesen**; Real-Trade-Lock bleibt an.
6. Der private read-only Bot-Ist-Zustand ist lokal verfügbar, aber ChatGPT in der Cloud erhält den vollständigen privaten Paper-/Real-Zustand **nicht automatisch** über localhost oder öffentliches GitHub.
7. Test-BUY/SELL, signierter Testsender, Windows-/Linux-CI und gewöhnlicher GitHub-Heartbeat dürfen niemals als autonomer GPT-Modelltrade ausgegeben werden.

## Offene Arbeiten – nicht durch Dokumentation ersetzt

- Eine verifizierte **private, revisionsgebundene Windows→Cloud-ChatGPT-Zustandszustellung**, die keine vertraulichen Kontodaten offenlegt.
- Unabhängige gespeicherte Echtgeld-Strategieeinstellungen und Echtgeld-Positions-/Reservierungsledger erst nach eigenständiger fachlicher/technischer Freigabe; keinerlei Real-Geldbewegung in diesem Auftrag.
- Tatsächliche prospektive GPT-Entscheidung auf frischem unbekannten Coin mit unabhängigen Markt-/Security-/Sellability-Quellen, authentifiziertem Auftrag, echtem privatem Paper-Receipt und späterem SELL/Netto-PnL.
- Zehn chronologische historische GPT-Blindtests, getrennt vom persönlichen Paper-Konto.

**Betriebsregel:** Immer neuesten Code/Checkpoint/Win-Status prüfen. Wenn die operative Wirklichkeit von einer älteren Anleitung abweicht, die Anleitung mit datiertem Beleg korrigieren, nicht den Bot zurückbauen.
