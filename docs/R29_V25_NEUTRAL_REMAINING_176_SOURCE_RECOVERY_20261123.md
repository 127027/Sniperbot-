# R29 V2.5 – Freigegebene Recherche der verbleibenden 176 neutralen Solana-Mints

**Stand der dokumentierten GitHub-Prüfung:** 23.11.2026 ca. 21:06 UTC. **Repository:** `127027/Sniperbot-`, ausschließlich `codex/r29-cleanroom-paper-20261121`. **Nur Research/PAPER, kein Handel.**

## 1. Ziel und Ausgangslage

Der Nutzer hat die Prüfung der verbleibenden neutralen 176 Solana-Mint-Adressen ausdrücklich mit »Ok Mach das« freigegeben. Historischer Forschungstag: 12. Oktober 2026, 00:00–24:00 UTC; vor dem ersten Scan darf das GPT-System sämtliche *damals tatsächlich verfügbaren* älteren Marktdaten verwenden; keine nachträglichen Gewinnernamen, Zukunftspreise oder spätere Anbieter-Captures in historische Entscheidungen.

Die originale, SHA-geprüfte **retrospektive** Solana-Stichprobe umfasst **192 unterschiedliche Mints** in **24 Stundenstichproben à 8**. Sie ist **kein vollständiger Marktuniversumsnachweis**. 02:00 und 18:00 UTC wurden bereits abgearbeitet: **16/16 heute bestätigte exakte Mint-/Pool-Zuordnungen**, dokumentiert in `research/audits/2026-11-23/r29-v24-two-neutral-scan-hours-source-progress.json`; konkrete Quellennachweise GitHub #45261003896, #45261696018, #45261044088 und #45262076422. Die anderen **22 Stunden / 176 Mints** waren bis V2.5 noch nicht durch den Gecko-Hourly-Pfad untersucht.

**Vorherige Fehlerfindung:** DexScreener `tokens/v1` lieferte trotz 7× HTTP200 für alle 192 Mints siebenmal JSON `[]`; zwei bekannte neutrale Pools lieferten auch auf sechs Dex-Single-/Pair-API-Anfragen keine Treffer, wurden jedoch auf vier GeckoTerminal-Token-/Poolabfragen exakt bestätigt. Leere Dex-Antwort beweist nicht, dass ein Coin im Oktober fehlte.

## 2. Implementierung im Branch

- **`src/v25-neutral-remaining-176-research.mjs`**: deterministischer Plan mit exakt **176 eindeutigen Solana-Mints, 22 Stunden**, ausschließliche `[2,18]`-Ausnahme für bereits erledigte Mints; verbietet Oracle-Kandidaten und as-of-Promotion; überprüfbares Fortschritts-/Quellenfehlermodell.
- **`test/v25-neutral-remaining-176-research.test.mjs`**: Regressionen für 176er-Zuordnung, Quellen-SHA/ausgehende Orders, HTTP429, Nachweisstufen und harte zeitliche Sperren.
- **`scripts/v25-recover-remaining-176-neutral-mints.mjs`**: exakter GitHub-Cleanroom-Checkout und genau **ein freigegebener Request-Commit**; prüft originales Oktober-Archiv SHA-256. Führt nur öffentliche **GeckoTerminal-GETs ohne bezahlten API-Key** aus; 16-Sekunden-Pacing, mit maximal 200 Anfragen insgesamt und maximal einer Wiederholung nach 429/503 mit Cooling. Stoppt bei wiederholtem Rate Limit statt aggressiver Wiederholungen. Schreibt je Quellantwort **unveränderte HTTP-Bytes, SHA-256 und Abrufzeit** sowie stündliche **`checkpoint.json`** und einen finalen `final-audit.json` in den Run-Artefaktbereich. Keine Daten werden zu fingierten historischen Quotes.
- **`.github/workflows/cleanroom-v25-explicit-neutral-remaining-176.yml`**: benötigt Request nur unter `research/neutral-remaining-requests/2026-11-23/`, checkout ohne push credentials, Originalarchiv über GitHub Actions, Tests, QA-04-Gate-Kontrolle, source-only 176er-Recherche und Rohdaten-Artefakt. Das GitHub-Checkout hat keine Befugnis, reale Orders oder Signale zu senden. Client-Daten und `signals` werden kontrolliert.

## 3. Tatsächlich durchgeführte technische Tests und GitHub-Läufe

1. Der erste explizite V2.5-Run [**#45265825475**](https://github.com/127027/Sniperbot-/actions/runs/45265825475) scheiterte **vor der ersten eigentlichen Quellenabfrage**, da eine mit einer Ziffer beginnende JavaScript-Objekteigenschaft `65_post_event_winners_never_consulted` einen SyntaxError verursachte. Die übrigen Regressionen hatten bestanden; der Quellenlauf hat **keine** 176 Mints bearbeitet. Dieser Fehlstart darf weder als Datenausfall des Providers noch als erfolgreicher Lauf ausgegeben werden.
2. Konkrete Stelle repariert und **explizite `node --check`-Kontrolle** in die allgemeinen Tests und das neue Forschungsskript-Workflow aufgenommen.
3. [**GitHub Cleanroom CI #45266073615**](https://github.com/127027/Sniperbot-/actions/runs/45266073615) **875/875 Tests bestanden, 0 Fehler, keine Orders**. Originaler Release-Gate: **13/60 Nicht-Backtest-Abnahmen erfolgreich = 21,67%; 8 Beweisblocker**, QA-04 weiterhin blockiert.
4. Neues Benutzer-Request `research/neutral-remaining-requests/2026-11-23/r29-user-go-remaining176-neutral-solana-v25-syntax-fixed-retry.json`, Quellcommit `5340f40cc374f0dac08e0076e2bdaac162457ae5`. **[GitHub Actions #45266204458](https://github.com/127027/Sniperbot-/actions/runs/45266204458)** wurde tatsächlich gestartet; bei Erstellung dieses Dokuments war der Step **»Recover exactly remaining 176 neutral mints« in progress**. **Keine Endzahl behaupten, solange der Quelllauf nicht abgeschlossen und sein `final-audit.json` verifiziert ist.**

Rohdaten-/Checkpoint-Artefakt nach erfolgreicher oder kontrolliert gestoppter Ausführung: `r29-v25-neutral-remaining-176-45266204458`. Bei 429 muss aus `pending` nur der fehlende Anteil nachgeladen werden; **niemals 429 als historisch nicht existierenden Pool oder als 0%-Gewinnererkennung interpretieren**.

## 4. Was damit bewusst noch nicht bewiesen ist

Die 176er-Recherche erzeugt **ausschließlich November-Quellenidentitäten**. Selbst 192/192 heute gefundene Poolzuordnungen würden **nicht** beweisen, dass Dot 2 diese Pools am 12. Oktober über denselben Anbieter empfangen hatte. Für einen historischen, kausal plausiblen GPT-Backtest bleiben zwingend:

- Ursprüngliche, neutrale Marktpopulation über **alle sechs** unterstützten Chains, inkl. nicht erfolgreicher Pools und wirklich bis zum Tick zeitlich verfügbarer Quelle;
- ursprüngliche **Onchain-Event- und Finalitätsbelege** bis zu jedem virtuellen Scan, echte historische Pools, Liquidität und tiefe Preis-/Handelsdaten; heutiges Provider-`pool_created_at` allein reicht nicht;
- unabhängige **50-TEST-USDC-BUY- und -SELL-Ausführbarkeit** inklusive Slippage und Tokensteuer, sellability/Dot3-Sicherheitsprüfung und tatsächlicher Quote-Zeitstempel;
- echte GPT-Dot-Journale, originaler Paper-Ledger/Windows-Client-Receipts und unabhängiger Holdout nach Fertigstellung.

Die schon für zwei neutrale Solana-Pools TANK und ARIANA gesicherten **vier vor den virtuellen Scans liegenden Solana-Transaktionsdetails** und weitere Signaturbelege sind im `docs/R29_OCT12_ORIGINAL_SOLANA_CHAIN_DOT_BACKTEST_READINESS_20261123.md` dokumentiert. Tokenkontobewegungen allein sind **kein** BUY/SELL-Quote-/Gewinnbeleg.

**Kein ursprüngliches Gewinner-Oracle vor der Simulation, keine Echtgeld-Orders, keine Walletänderung, keine Änderungen am Windows-Paper-Guthaben, keine Dot-Aktivierung.**
