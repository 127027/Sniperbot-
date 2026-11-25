# R31 – lokales Paper Control Center (Phase 1)
Entwicklungsbranch, getrennt vom aktiven R30. R30 bleibt unverändert und führt das echte (virtuelle) Journal weiter. R31 liest dessen letzten SHA-geprüften Finalbericht, zeigt Positionen/Handelsjournal und veröffentlicht **nur vorbereitete Paper-Einstellungen** auf diesem Branch. Keine R31-Dots lesen die Einstellungen bisher; keine automatisierte R31-Ausführung, keine Echtgeld-/PayPal-Funktion. Keine Veröffentlichung privater Guthaben oder Schlüssel (Repository öffentlich).
## Windows
Node.js 22+ installieren. Branch separat klonen:
```powershell
git clone --branch codex/r31-control-center-paper https://github.com/127027/Sniperbot-.git R31
cd R31
node --test r31/policy.test.mjs
node r31/server.mjs
```
Öffne http://127.0.0.1:8787 im Browser. Lesen funktioniert für öffentliche GitHub-Daten ohne Token, unterliegt GitHub-Limits. Schreiben erfordert eigenen auf dieses Repository beschränkten GitHub-Zugriff (Contents read/write), z.B. einen Fine-grained PAT, nur lokal als Umgebungsvariable R31_GITHUB_TOKEN setzen. Niemals Token in Git, HTML, Chat oder Kommandohistorie speichern. Token mit lokaler sicherer Secret-Verwaltung bereitstellen. Kein OpenAI- oder Marktanbieter-API-Key. Keine laufenden Kosten garantiert; GitHub-Limits und Nutzungsbedingungen gelten.
## Vertrag
r31/controls.json ist der versionierte, centgenaue Steuervertrag. max_invest_cents ist maximal offene Anschaffungskosten, nicht Einzahlung oder Gesamtvermögen. stake_cents ist exakter Einsatz je neuem Coin. allow_new_buys pausiert ausschließlich zukünftige Käufe (in R31 noch nicht angebunden); keine Zwangsverkäufe bei niedrigerem Limit. Reduziertes Limit blockiert neue Käufe. Erhöhtes Limit schafft kein neues Cash. GitHub-Blob-SHA und revision verhindern lost update; Readback erforderlich. policy.mjs enthält reine Admission-Guard-Logik, keine Ausführung. R30-Read-only-Ansicht hat keinen Schreibpfad zum R30-Branch. 
## Nächste Phasen
1. Tests CI und Windows lokaler Start; 2. getrenntes R31 Paper-Portfolio mit einmaliger expliziter Übernahme und versionierten Dot-Handoffs; autoritativer Ledger-Executor prüft Limits vor JEDEM Kauf, idempotente Buchungen und Verkauf/Teilverkauf; 3. unabhängige Paper-E2E-Tests inkl. Budgetänderung während Scan, Pause, Sell, Fehler und Wiederanlauf; erst nach expliziter Umschaltung R30-Dots umstellen. 4. Anbieterprüfung für EUR/PayPal, DEX-Zugang, Gebühren, Deutschland, KYC und Auszahlung. Realhandel erst nach separater Freigabe; API-Zugang/Börse und Schlüssel lokal, niemals GitHub. 
