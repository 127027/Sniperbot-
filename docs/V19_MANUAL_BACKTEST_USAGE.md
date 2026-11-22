# R29 V1.9 – Manuell angeforderter 29-Stunden-Backtest

Nur Branch `codex/r29-cleanroom-paper-20261121`. **Kein Cron, keine automatische Aktivierung einer Dot-Automation, keine GitHub-Signale/Orders, kein Zugriff auf vorhandene lokale Paper-Wallet.** Der Workflow startet nur durch bewusste Benutzeraktion.

## Benutzung auf GitHub

1. Repository `127027/Sniperbot-` öffnen, Branch `codex/r29-cleanroom-paper-20261121` wählen.
2. Unter **Actions** den Workflow **R29 V1.9 Manual 29h Backtest (Paper Research)** öffnen.
3. **Run workflow** wählen. Branch exakt auf dem Cleanroom-Branch belassen.
4. `test_date` in `YYYY-MM-DD`, z.B. `2026-10-12` eingeben.
5. `manifest_path` leer lassen, falls noch keine neutrale as-of-Eingabe existiert, oder eine bereits im Branch liegende Datei innerhalb `research/backtest-inputs/` auswählen. **Niemals den Gewinner-Oracle-Pfad `research/evaluation/` hier eintragen.**
6. Zuerst muss `npm test` erfolgreich sein. Danach läuft `scripts/v18-backtest-on-demand.mjs` mit derselben `src/unified-decision-v18.mjs`-Logik wie die aktuelle Live-Paper-Vorschau.
7. Das JSON-Ergebnis ist nach Abschluss als Actions-Artefakt `r29-v19-manual-research-<run_id>` abrufbar (Aufbewahrung 30 Tage).

Ohne vorhandenes historisches Contemporaneous-Datenmanifest ergibt das Oktober-Datum nach wie vor `DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE`. Ein 29h-Zeitplan ohne Originaldaten beweist **keine** damalige Discoverability und erzeugt 0 belegte GPT-Trades. Testdaten `SYNTHETIC_TEST` sind Regressionen und bleiben als solche gekennzeichnet.

## Sicherheits- und Abnahmegrenzen

- Kein `workflow_dispatch` außerhalb des Cleanroom-Branches; der Job besitzt nur `contents:read`.
- `test_date` wird auf reales Kalenderdatum geprüft.
- `manifest_path` muss exakt innerhalb `research/backtest-inputs/` liegen und traversal-frei sein.
- `--training-reference` wird im manuellen CI-Workflow absichtlich nicht verwendet.
- Keine `git add`/`commit`/`push`-Stufe; sämtliche Reports liegen ausschließlich als workflow artifact.
- Die fünf ChatGPT-Dots bleiben auch nach manuellem Backtest deaktiviert.
- Erste Validierung: 17/17 isolierte Eingabe-/Workflow-Checks. **Ein echter Node-/GitHub-Workflow-Lauf wurde noch nicht nachgewiesen; QA-06 bleibt offen.**
