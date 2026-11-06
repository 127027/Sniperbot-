# Codex-Arbeitsauftrag: Prioritäten, Teilpakete und Abnahmekriterien

Alle Arbeiten ausschließlich an diesem neuen Projekt, idealerweise mit Review über Pull Requests. **Keine** Abhängigkeit von Hixton, keine Änderungen an bestehenden Hixton-Repositories/Dots/Automationen. **Keine** echten Orders, Wallet-/Payment-Integrationen ohne neue ausdrückliche Freigabe.

## P0 – Vollständige Windows-Verifikation / Codequalität

- Öffne `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/REQUIREMENTS.md`, `docs/KNOWN_ISSUES.md` und teste den aktuellen Runner.
- Windows-11-Test mit Node.js 22+: frisch geklontes Repo, `Windows_Starten.bat`, Browser-Funktionen, Offline-Modus, Defender-/Netzwerkfehler, Neustart, Persistenz.
- Verbessere `Windows_Starten.bat` nur bei nachgewiesenem Problem; keine stille Installation, kein Startup/Registry-Eingriff.
- Sicherer Recovery-Pfad bei beschädigter JSON-Datei: Anwendungsfehler anzeigen, vorhandene Daten nicht überschreiben, Snapshot/Backup.
- **Akzeptanz:** dokumentierte Windows-Schrittfolge und reproduzierbare CI- und End-to-End-Tests ohne Netzwerk.

## P1 – Echte, überprüfbare Marktdaten als Read-only-Feed

- Aktuelle Provider-Schemas für GeckoTerminal/DEX Screener und Solana-RPC anhand eigener Fixtures verifizieren.
- Chain-/Token-/Pool-IDs und Zeitstempel prüfen; Quote-Alter sichtbar machen; Fehler/HTTP-429/Timeout/Rate Limits sauber behandeln.
- Nur mit öffentlich zugänglichen read-only Daten arbeiten; keine Wallet, API-Secrets oder Handelsendpunkte.
- **Akzeptanz:** echte Token-Contract-Daten live lesen, bei Ausfall als `STALE`/`UNAVAILABLE` anzeigen; keine erfundenen Live-Kurse.

## P2 – Dynamische Multi-Agent-Architektur

- Implementiere einen unabhängigen, versionierten Event-Controller nach `docs/AGENT_PROTOCOL.md` mit skalierbarer Registrierung 1..N Agenten.
- Deduplizierung, Agenten-/Quellen-Provenienz, TTL und Signaleinschätzung, kein doppelter Kauf bei derselben Contract-/Pool-ID.
- **Keinen** bereits vorhandenen Dot-zu-Runner-Kanal behaupten; Kommunikationsadapter zuerst synthetisch und lokal testen.
- **Akzeptanz:** mindestens drei verschiedene synthetische Agenten können gegensätzliche Bewertungen abgeben; harte Risiko-VETO bleibt wirksam; Bot AUS blockiert Neueinstiege.

## P3 – Sicherheits- und Sellability-Gate

- Solana: Mint-/Freeze-Authority, Token-2022-Extensions, Holder-/Wallet-Cluster, LP-Rechte und Verkaufspfad.
- EVM: Contract-Owner/Rechte, Token-Tax-/Blacklist-/Honeypot-Tests, Pools und Exit-Quotes.
- Sicherheitsprobleme und unbekannte Prüfungen getrennt darstellen; nie „verified“ auf Basis bloßer DEX-Liquidity.
- **Akzeptanz:** negative Token-Fixtures erzwingen `REJECT` bei Honeypot, fehlender Sell-Route, unverifizierter Authority oder unzureichender Liquidität.

## P4 – Mehrere Paper-Positionen / Risikobudget / langes Halten

- Ersetze das derzeitige Ein-Positionslimit durch eine konfigurierbare Zahl parallel offener Positionen sowie Chain-/Coin-/Portfolio-Limits.
- Flexible Positionsgrößen `minTrade = maxTrade` oder Bereiche; mögliche Einsatzsumme durch freie Mittel, Slippage, Pool-Tiefe und Gesamt-DD limitieren.
- Dauerhafte HOLD-Positionen und Exit-Engine mit Neustart/Recovery; Stop-Loss-/TP-/Trailing-/Liquiditäts-Exit **nur wenn simulierbar ausführbar**.
- **Akzeptanz:** zwei unterschiedliche Coins können nacheinander als Paper-Positionen gekauft werden; Bot AUS verhindert dritten Kauf, überwacht und verkauft berechtigte zwei Positionen weiterhin.

## P5 – Realistischer Paper-Trade / Test von Strategien

- Kauf und Exit an unabhängige, zeitgestempelte **ausführbare** Routen/Quotes mit geschätzter Slippage/Gas/MEV/Price Impact koppeln.
- Fehlgeschlagene oder nicht ausführbare Verkäufe ausdrücklich als `EXIT_UNAVAILABLE` behandeln, nicht als realisierten Profit.
- Kohorten neuer/gescheiterter Tokens ohne Survivorship-/Lookahead-Bias; Walk-forward, Profit-Factor, Drawdown, Sell-Fail-Rate.
- **Akzeptanz:** Backtests mit deterministischen Seeds, gespeicherten historischen Daten und Regressionstests; kein Profitversprechen.

## P6 – Zukunft: separates echtes Geld / UI

- Vereinheitlichte EUR-Anzeige und Fiat on-/off-ramp als **nur entworfene** Schnittstellen; PayPal-Verfügbarkeit, Anbieter-/Länder- und Compliance-Bedingungen gesondert prüfen.
- Echtgeldfreigabe erst durch komplett neuen Sicherheitsreview, Wallet-Architektur, Secrets-Lifecycle und explizite Besitzer-Freigabe. Kein vorhandenes Codeflag darf es unabsichtlich aktivieren.
- Minimalistische Oberfläche beibehalten; keine überladene Dashboard-Umgestaltung als Ersatz für funktionierenden Handel.

## Arbeitsweise und Berichtformat

Für jedes Paket: Problem + Änderung + Tests + Risiken + offene Punkte + Commit/PR. Kein Test wird als „bestanden“ berichtet, wenn er nur entworfen ist. Minimal-invasive Änderungen; stabile Paper-Version vor neuen Features sichern. PRs nicht ohne Freigabe in eine produktive Echtgeldausführungsumgebung deployen.

## CODEx-LAPTOP-UEBERGABE 2026-11-06

**Codex-Job auf dem Nutzer-Laptop (P0, höchste Priorität):**

1. Verbundenes Windows-11-Testsystem bzw. Codex-Work-Computer-Zugriff bestätigen; falls nicht verfügbar, exakte Schritte und PowerShell-Befehle zur Durchführung durch den Nutzer liefern, aber keine Installation als erledigt bezeichnen.
2. Repo `127027/Sniperbot-` auf dem Windows-PC klonen, Node-Version, `Windows_Tests.bat`, `Windows_Starten.bat`, Startport und Browser-Konsole testen. Keine Installation in ein Hixton-Verzeichnis.
3. Standard-Ablauf in frischem Benutzerprofil: 50 virtuelle EUR einzahlen, virtueller Test-USDC-Kauf, Test-Token halten, Bot pausieren, Exit-Regel aktivieren, Kursanstieg simulieren, Test-Exit ausführen, lokalen Zustands-Neustart prüfen. Screenshots/Logs und konkrete Fehler mit Build-ID erfassen.
4. Den Fehler des Nutzers beim ChatGPT-ZIP-Download durch direkten GitHub-Clone umgehen; GUI/Firewall/Defender und Node-Laufzeit bei Bedarf beheben.
5. Fehlende Funktionen gesondert als Issues/PRs entwickeln; Arbeit mit Tests belegen, sicherheitskritische Logik vor Automatisierung reviewen.

**Forschung und Multi-Agenten-Ziel (P2+):** beliebig viele registrierte Agenten; Bewertungsrollen Discovery, News, Social, On-chain, Wallet-Cluster, Pool-Liquidität, Scam, QA und Trade-Entscheidung. Dots sollen intern erst Evidenz/Quellen abgleichen, veraltete Kandidaten verwerfen und Konflikte markieren. Danach darf nur ein technisch authentifiziertes `candidate.v1`-Event an das lokale Paper-Gateway gehen. Zentraler Controller verhindert doppelte oder übergroße Käufe, erzwingt On-Chain-Prüfung und realistische Sell-Quote und dokumentiert jede Annahme. Alle 1..N Dots sind Forschungsinput, nicht Orderautorität. Ein direkter Dot-zu-Bot-Kanal existiert noch NICHT; Implementierungsarbeit nötig.

**Portfolio-Ziel:** wiederholte neue Empfehlungen mit eigener Position (Kapital-/Exposure-Caps), individuell 50 oder maximal zulässiger Betrag, wählbares min/max (inkl. 50–50 und 200–400), Tage-/Wochen-/Monate-HOLD sowie Risiko-/Gewinn-Exit. Beispiel 50→5.000 EUR ist ein hypothetischer Extremfall, nicht zugesicherte Rendite. Bot AUS blockiert ausschließlich Neueinstiege, bestehende Positionen behalten Exit-Überwachung.

## Neue freigegebene Codex-Aufträge: fünf Agenten, variable Konfidenz-Budgets, adaptive Long-Hold-Exits

**Verbindliche Anforderung:** [STRATEGY_5_AGENT_BIG_MOVES.md](STRATEGY_5_AGENT_BIG_MOVES.md). Diese Änderungen sind *noch nicht implementiert*; zuerst P0 Windows-Fehlerprüfung aus Issue #1.

### A. Fünf-Agenten-Review und Kommunikationsadapter – Issue #2

- [ ] Fünf unabhängige logische Rollen: News/Discovery, Social Acceleration, On-Chain/Liquidity, Contract/Scam-Security, Opportunity/QA; 1..N skalierbar.
- [ ] Gemeinsame zeitlich korrekt versionierte Evidence-IDs und Gegenbeweise, deduplizierte positive/negative Stimmen mit TTL, Abstimmungen für denselben Chain+Contract+Pool.
- [ ] Vorläufiges 5/5-YES-Quorum **zusätzlich** zu einer unabhängigen zwingenden Contract-/LP-/Sell-/Portfoliorisiko-Freigabe; `NO/ABSTAIN/VETO/stale` blockieren automatische Paper-Käufe.
- [ ] Sicheren und **nachweislich funktionierenden** Agent-zu-lokal-Paper-Gateway mit synthetischen Agentenereignissen und Tests implementieren; bestehende ChatGPT-Dots sind **nicht** direkt verbunden.
- [ ] Social-Acceleration-Zeitreihen (1 → 15 → 25.000 Erwähnungen nur als Beispiel), Autoren-/Bot-/Quellen-Unabhängigkeit und On-Chain-Gegenprüfung; kein Look-ahead.
- [ ] End-to-end-Test für 5/5 YES und für 4/5, ABSTAIN, VETO, Missing Data und Replay.

### B. Sniper-Positionsgrößen – neues Issue

- [ ] Nutzer-Min/Max 50–1000, 50–50, 200–400 TEST-USDC; 0 = kein Kauf.
- [ ] Größere Position nur, wenn Eigenkapital, Pool-/Sell-Tiefe, erwartete Slippage, Gebühren, individueller und Gesamtverlustrahmen das ermöglichen; kein 100-%-Vertrauensscore.
- [ ] Mehrere unabhängige Positionen; testbare Kapitalreservierung und idempotente Wiederholungen; Bot AUS verhindert jeden neuen Kauf.
- [ ] Test: schwaches/unklares Signal => 0, gutes aber illiquides Signal => 0 bzw. begrenzen; maximaler Einsatz nie über alle Limits.

### C. Entfernen der +15-%-Take-Profit-Pflicht – neues Issue

- [ ] Feststellen und dokumentieren: `runner/core.mjs` verwendet derzeit `takeProfit:15`, AUTO schließt bei +15 %. Das ist **Legacy/Demo**, nicht die gewünschte Default-Strategie.
- [ ] Erweiterbares und testbares Exitmodell für intakte Langfristtrends, volatilitätsabhängiges Trailing, gebrochene Investmentthesen, plötzlichen LP-Abzug, Risikohinweise, optional partielle Gewinnsicherung.
- [ ] Bewertbare, tatsächlich verfügbare simulierte Sell-Quotes unter Gebühren/Slippage statt reinem Preis-High.
- [ ] Tests: +15 % bei weiter intaktem Trend => nicht automatisch vollständig schließen; Ausstieg nach gebrochener These; SELL-FAIL => kein Phantomprofit; Bot AUS => bestehende Exits aktiv; Neuanlauf/Ausfall.
- [ ] Legacy-AUTO-Verhalten sauber migrieren und UI/README anpassen, aber **nicht** stillschweigend Echtgeld-Orders aktivieren.

### D. Forschung & Abnahme

- [ ] Backtests auf vollständigen Launch-Kohorten inklusive Ruggers/Delistings mit Out-of-sample/Walk-forward und ohne Look-ahead/Survivorship.
- [ ] Legacy-Take-Profit gegen adaptive Exits vergleichen: Netto-P&L, DD, Risiko, Fill-/Exit-Failrate, Median/P95, seltene Ausreißergewinne.
- [ ] Jede Änderung in einem eigenen PR mit echten Testergebnissen und noch offenen Grenzen dokumentieren. Keine Hixton-Änderungen; keine Echtgeldtransaktionen.
