# R29 – Ereignisradar und historische GPT-Entscheidungseingaben (17.11.2026)

Status: **Implementierter, noch gegen CI/echte Quellen abzunehmender PAPER_ONLY-Baustein.**
Keine Wallets, Echtgeldtransfers, PayPal, GPT-Modellaufrufe oder Paper-Fills durch diese Änderung.

## Bestehende Infrastruktur – geprüft
- Ein Benutzerstarter: `Sniperbot_Starten.bat`; bestehender Windows-Supervisor bleibt unverändert.
- Fünf Forschungsrollen: `research/dot-workflow/roles/{scout,social,onchain,security,qa}/current.json`. Berichte sind nicht automatisch authentifizierte Handelsaufträge.
- `runner/research-market-daemon.mjs`: seit vorher 120-Sekunden-REST-Abfragen und Markt-Beschleunigungswarnungen aus zwei aufeinanderfolgenden Poolsnapshots.
- `runner/gpt-paper-*.mjs` und `runner/paper-agent-pipeline.mjs`: GPT-Intent-/Signatur-/Paper-Ledger-Bausteine. Ein isolierter oder synthetischer Fill beweist **keine** historische DEX-Ausführbarkeit.
- `research/replay-120d-real/blind-neutral-market-gpt-input.mjs`: As-of-Quelleneingang, aber isoliertes echtes GPT und unabhängige historische bidirektionale Quote weiterhin nicht vollständig nachgewiesen.
- Letzter zuvor im Repo dokumentierter Ledgerbeleg im öffentlichen Kanal: `research/r29/channel/gpt-paper-receipt.json` mit `NO_TRADE`; `windows-status.json` ist explizit `WINDOWS_SANDBOX`, nicht das Benutzerkonto.

## Implementierte Änderung
1. `runner/research-hype-triggers.mjs`: neu `detectFirstSeenRecentPoolLeads()`. Beim ersten beobachteten **unbeworbenen** neuen Pool ist kein zweiter Datenpunkt mehr Voraussetzung. Eindeutige Chain/Token/Pool-Identität, frischer Anbieter-Erstellzeitpunkt, stabile Deduplikations-ID. Quellen/Zeit/ungeprüfte Risiken bleiben sichtbar. Kein BUY-Signal.
2. `runner/research-market-daemon.mjs`: bestehender Collector schreibt solche neuen Research-Alerts neben der bisherigen Zweipunkt-Beschleunigung in das bestehende lokale, begrenzte Research-Journal. 120 Sekunden Polling bleiben unverändert; **keine** Behauptung einer Reaktion binnen 22 Sekunden.
3. `research/replay-120d-real/historical-event-radar.mjs`: neutraler chronologischer Event-Adapter für `TOKEN_CREATE`, `POOL_CREATE`, `MIGRATION`, `POOL_LIQUIDITY`, `CONTRACT_AUTHORITY` sowie echte verschiedene Transaktionssignaturen pro 60 Sekunden. Sortierung nach **provider_captured_at_utc** statt spätem Outcome oder allein Blockchain-Zeitstempel. Meldet gemessene Latenz und fehlende Beweise. Transaktionen belegen weder unterschiedliche Wallet-Inhaber noch einen profitablen Einstieg.
4. `blind-neutral-market-gpt-input.mjs`: transportiert diese ausschließlich as-of erzeugten Research-Anlässe im abgeschirmten GPT-Datenobjekt. Der Input-Hash bindet sie mit ein. Die bisherigen Grenzen für spätere Quellenerfassung, Medien und Lessons gelten weiter. Keine Order wird dadurch signiert oder ausgeführt.
5. Neue Offline-Tests und Linux-/Windows-CI-Anbindung.

## Wichtigste offene Aufgaben vor echtem 24/7-Paper-Handel
- **Subsekundenfähiges Live-Event-Streaming** (Websocket/Geyser/RPC) und Reorg-/Finality-Replay. Der bisherige REST-Collector pollt nur alle 120 Sekunden; sein neues Pool-Alert darf nicht als Echtzeit-Sniping dargestellt werden.
- Sichere, unabhängige **Wallet-Clusteranalyse**: Unterschiedliche Transaktionssignaturen sind keine unabhängigen Käufer.
- Zeitgenaue historische, bestands- und größenabhängige, **bidirektional ausführbare** Quotes für 50–5.000 TEST-USDC, inklusive Route, Gebühren, Price Impact, Slippage und LP-Risiko.
- Isolierte echte GPT-Aufrufe mit nur eingefrorenen, neutralen As-of-Frames; 1–24 tatsächliche GPT-Vollscans pro Tag, plus separate schnelle technische Marktereignisse.
- Nachweisbares lokales signiertes GPT-Intent → technische Prüfung → `PAPER_FILLED` → GPT-Teilverkauf/Exit. Teilverkäufe sind noch nicht mit vollständigem Realmarkt-Paritätsnachweis implementiert.
- Chronologischer 60-Tage-Holdout 18.09.2026–16.11.2026 mit einem separaten Konto von 5.000 TEST-USDC, ohne Rückgriff auf rückblickende Gewinnerlisten.
- Die zwölf DexTrading-Fälle **ausschließlich nach** den historischen Entscheidungen vergleichen, nur mit eindeutigen Mint-/Pool-/Tx-Adressen. Quelle: https://dextrading.com/de/academy/who-bought-solana-meme-coins-early-wallets. Nicht unabhängig anhand aller Tx verifiziert.

## Ergebnisstatus
**60-Tage-GPT-PnL: UNKNOWN.** Kein Erfolg und auch keine `0 %`-Rendite aus fehlenden Ausführungsbelegen abzuleiten.
Der Code ist ein **Research-/Evidenz-Fortschritt**, keine Bestätigung der autonomen Handelbarkeit oder Live-Paper-Readiness.
