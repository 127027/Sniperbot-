# R29 – Benutzeroberfläche bereinigt und vereinheitlicht
Stand: 15.11.2026 · Branch `codex/r29-chatgpt-github-paper-cycle-20261115` · **PAPER ONLY / kein LIVE-Trading**

## Diagnose: Weshalb zwei Guthaben angezeigt wurden

Die alte Benutzeroberfläche `runner/dashboard.html` zeigte zwei voneinander **getrennte** virtuelle Konten an:

1. **5.028,408 TEST-USDC**: gesondertes, fiktives R29-Kommunikations-/QA-Sandbox-Konto aus dem früheren BUY/SELL-Test. Quelle: `runner/r29-windows-courier.mjs` / `research/r29/channel/windows-status.json`, lokal `r29-isolated-sandbox-ledger.json`. **Kein Handelsguthaben des normalen Bots.**
2. **4.999,005 TEST-USDC** nach einem gemeldeten Ausgangsbetrag von 5.000,00 und einem 50-TEST-USDC-Demo-Kauf/Verkauf mit modelliertem Verlust −0,995. Quelle: **reguläres** `state.cashUsdc + state.cashEur` in `paper-state-v03.json`, gelesen über die lokale Paper-API.

**Behebung:** Die neue Hauptoberfläche zeigt ausschließlich **das reguläre Paper-Konto**. Die alte Sandbox wird nicht als aktives Handelsbudget angezeigt, und ihr automatischer QA-Poll im normalen R29-Start wurde deaktiviert. Vergangene Test-Commits/Quittungen und eine eventuell vorhandene lokale QA-Datei werden **nicht** gelöscht, weil sie für die belegte Abnahme und die Fehlersuche benötigt werden. Sie werden nicht für echte oder neue virtuelle Orders verwendet.

**Keine Guthabenveränderung durch diese UI-Änderung.** Insbesondere kein `RESET`, kein Löschen von `paper-state-v03.json`, keine Wallet-Migration und keine neuen Trades.

## Neue Benutzeroberfläche (Desktop und mobil)

`runner/dashboard.html` wurde durch ein neues, deutlich kleineres Nutzer-Dashboard ersetzt. Ein Umschalter `Paper-Trading` / `Echtgeld` verwendet dieselbe Übersicht:

- Verfügbares Guthaben **nur des ausgewählten Kontos**
- Geschätzter Kontowert, sofern vollständig verifizierbar
- Anzahl offener Positionen
- Geschätztes offenes P&L
- Realisiertes P&L
- Tabelle offener Trades mit Name/Symbol/Chain, Einsatz, Einstiegskurs, letztem Kurs und Kurstimestamp, geschätztem Netto-Verkaufswert (einschließlich 1 % modellierter Ausstiegsgebühr), Geld- und %-P&L sowie Kursstatus
- Letzte Käufe/Verkäufe aus dem bestehenden Paper-Journal
- Bot-An-/Aus-Schalter, Paper-Einsatzgrenzen und ein bewusst getrenntes, einklappbares Testguthaben-Formular

**Wichtig für Kurse:** Wenn für einen Coin ein gültiger frischer Kurs fehlt (älter als drei Minuten, ungültige Werte oder Zukunftstimestamp), werden **keine** erfundenen Positionsgewinne und **kein** fiktiver Gesamtkontowert berechnet. Solche Werte erscheinen als `–`. Simulationen sind als solche markiert; indikative Preise sind keine garantierten DEX-Ausführungskurse.

### Echtgeldansicht

Die Echtgeld-Ansicht ist **read-only** und verwendet ausschließlich `/api/wallet/status` und `/api/wallet/overview`: verifizierte SOL- und USDC-Bestände auf Solana, sofern vorhanden/abfragbar. Echte Bot-Positionen, EUR-Gesamtkontowert und Live-P&L bleiben `–`, weil **keine** unabhängig nachgewiesenen Live-Fills, Einstandskurse oder verifizierte EUR-Bewertung existieren. **Kein** aus Paper-Daten abgeleitetes Echtgeldkonto, kein Aktivierungsschalter für Live-Orders, keine Wallet-Schlüssel an GitHub.

### Technisches unterhalb der Oberfläche

Alter Fünf-Agenten-Status, V0.9/R27/R28-Debugkarten, isolierter R29-Testerfolg, Signaturdiagnosen, DEX-Labormodule, manuelle Entwicklungs-Wallet-Transfers und doppelte Paper-Anzeigen wurden aus der **normalen Startoberfläche** entfernt. Ein einziger einklappbarer Statusbereich bleibt für die benötigte Verbindungskontrolle. Die Backend-Sicherheitsprüfungen, Forschungsdaten und die bestätigte ChatGPT-GitHub-Kurier-Pipeline wurden durch die UI-Bereinigung **nicht** gelöscht.

Wichtiger Unterschied: Die UI wurde vereinfacht, aber die Zukunftsfunktion `Echtgeld automatisch kaufen/verkaufen` wurde **nicht** implementiert und bleibt ausgeschaltet. Erweiterte Wallet-/Backup-Abläufe, die bisher in der alten Entwicklungsoberfläche lagen, werden durch diesen UI-Umbau **nicht** als neue vereinfachte Bedienfunktion angeboten; die unveränderten Backenddaten und gesicherten Wallet-Dateien bleiben erhalten.

## Technische Datenquelle

- **NEU:** `GET /api/dashboard/paper`, berechnet durch `runner/dashboard-portfolio.mjs` aus dem *bestehenden* regulären Paper-State.
- **Nicht in der Hauptansicht:** `GET /api/r29/status` (alte isolierte QA-Bilanz).
- **Keine externen OpenAI-API-Aufrufe** für die Benutzeroberfläche.
- **Keine Geldbeträge in öffentlichen GitHub-Statusmeldungen** zusätzlich veröffentlicht.
- Die aktuelle Paper-Engine verlangt **mindestens 50 TEST-USDC pro Kauf**; `minTrade` ist der bevorzugte Trade-Einsatz und `portfolioBudgetUsdc` ein **Gesamtlimit**, nicht das maximale Einzelticket. Die von Nutzer beispielhaft genannten 5 TEST-USDC sind ein gesonderter späterer Funktionswunsch.

## Prüfplan und Abnahme

1. `node runner/dashboard-syntax-check.mjs`: neue UI-Struktur, JS-Parse, saubere Paper/Real-Trennung, keine alte Sandbox-Anzeige.
2. `node --test runner/dashboard-portfolio.test.mjs`: freier Betrag, Equity, Netto-P&L, verschiedene Positionen, Quote-Staleness, keine Wallet-/Token-Ausgabe.
3. `node runner/r29-main-paper-local-http-e2e.mjs`: echte localhost-HTTP-Schnittstelle in **isoliertem Wegwerf-Bot-Prozess**, BUY 50 TEST, offene Position erscheint in `/api/dashboard/paper`, SELL schließt Position, ca. −0,995 TEST-USDC bleibt im Journal. Keine Veränderung an der Windows-Nutzerdatei.
4. Vollständige GitHub-Actions-Regression für **Ubuntu und Windows** inklusive bisheriger Signatur-, Backend- und Kurier-Tests.

Die CI-Ergebnisse belegen die Ausführung **in CI**, nicht das visuelle Öffnen des neuen HTML auf dem Nutzer-Laptop. Der Nutzer muss **den R29-Bot einmal mit den geänderten Dateien neu starten** und die neue Oberfläche im Browser laden. Die bislang laufende Version wird durch GitHub-Commits nicht automatisch aktualisiert.

**Abnahme am Laptop:** vorhandenes Paper-Guthaben kontrollieren, 0 offene Positionen nach letztem Test, reales Wallet nur im eigenen Echtgeld-Tab, keine zweite R29-Testsandbox-Bilanz und keine fünf Agenten-Widgets. Falls etwas abweicht, zuerst prüfen, ob die aktualisierte ZIP/Branch-Version wirklich gestartet wurde; keine Kontodateien löschen.
