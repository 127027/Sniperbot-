# Implementation roadmap / gap analysis

## Current version 0.3
- Local Node server + browser dashboard; zero npm dependencies for runtime.
- **Virtual** 50 EUR deposit, auto TEST-EUR to TEST-USDC conversion at fictional 1:1, buy/hold/sell paper positions.
- Entry bot switch separate from exit engine; HOLD default or AUTO TP/SL; adjustable 50–50, 200–400 etc.
- Read-only public GeckoTerminal new-pools discovery for Solana, Base, BNB and Ethereum. DEX Screener price marking and contract lookup. Provider availability and API formats **have not been verified in live deployment**.
- Scoring is an experimental heuristic from pool liquidity, age, 5m volume and trades; it is **not a safety or price prediction model**. No organic-wallet, freeze authority, mint authority, LP audit, honeypot or smart money validation.
- Scanner polls every ~90 s, positions every ~30 s; NOT low-latency sniping, NOT complete market coverage. Ordinary cryptocurrencies not on these four DEX networks cannot be traded in this prototype.
- Balances persist in `.local/paper-state-v03.json`. `.local` is ignored by git.

## Product milestones
- P1: Backfill and genuine market provenance, independent cross-source validation, scan status and error budgets.
- P2: Real risk engine + contract/holder/LP checks + liquidity depth and selling feasibility.
- P3: Event-driven scanner + research agent message queue, deduplication, audit timeline, alerting.
- P4: Paper-trading executable route/quote simulation, realistic fees + market impact, deep backtest with delistings.
- P5: Authenticated wallet and licensed fiat on/off ramp design after **new explicit approval**, never silently enable real transactions.

## Known risks
- Paper 1:1 EUR-to-USDC has **no connection to FX rates**, deposit/withdrawals and swaps are simulated and never transfer funds.
- Public API endpoints may be rate limited or change shape. The app should report provider errors; offline mode still permits simulated test signals.
- Mark-to-market valuations from public DEX price feeds are NOT reliable executable exit prices, especially in low-liquidity tokens.
- Closing laptop/sleep stops service, so 24/7 requires uptime and later Windows autostart/watchdog with explicit user consent.

## Produktanforderungen aus der aktuellen Freigabe (November 2026)
- Freies **1..N-Agentensystem** mit unabhängiger Bewertung und VETO; bestehende ChatGPT-Forschungsautoms sind nicht direkt verbunden.
- Mehrere automatische Paper-Käufe, wenn neue Kandidaten auftauchen; Positionshöhe aus frei wählbarem Min/Max, Kapital- und Sicherheitslimits. Stand V0.3: nur **eine** Position.
- Langfristiges HOLD über Tage, Wochen, Monate und später konfigurierte KI-/Risikostrategien für Ausstieg. Gewinnziele sind keine Renditegarantie.
- Quellcode/Dokumentation für Codex: `AGENTS.md`, `REQUIREMENTS.md`, `ARCHITECTURE.md`, `AGENT_PROTOCOL.md`, `CODEX_TASKS.md`, `KNOWN_ISSUES.md`, `SECURITY.md`.
- Priorität zuerst Windows-Lauffähigkeit und nachweisbare Paper-Funktion statt Echtgeld-Integration.

## Neues verbindliches Ziel – High-Upside-Sniper mit fünf Agenten (06.11.2026)

Siehe [STRATEGY_5_AGENT_BIG_MOVES.md](STRATEGY_5_AGENT_BIG_MOVES.md).

1. P0: Bereits veröffentlichte V0.3 auf dem echten Windows-Laptop installieren, Fehler beheben, Paper-End-to-end absichern.
2. P1: fünf unabhängige logische Agentenrollen, gemeinsamer Evidence-Store, 5/5-Review plus hard Risk-VETO, synthetische Gateway-Integration und Audits.
3. P2: zeitlich korrekte On-Chain-/Social-Daten, Kandidaten früh vor Hype erkennen (keine Social-Bots und kein Backtest-Look-ahead).
4. P3: Min-/Max-Positionsgrößen einschließlich 50–1000 TEST-USDC, Kapitallimits, Pool-Tiefe, mehrere Positionen, keine Pflicht zum Maximaleinsatz.
5. P4: bisherige +15-%-AUTO-TP als Legacy ersetzen durch nachweisbar adaptive Trend-/Risk-/Liquidity-/Trailing-Exitstrategie; Bot AUS sperrt nur Einstieg.
6. P5: historische vollständige Launch-Kohorten, lange HOLDs, Exit-Fails und tatsächliche modellierte Kosten, Out-of-sample-Validierung.
7. Später separat: echter Zahlungs- und Wallet-Betrieb nur nach expliziter neuer Freigabe.

Aktueller Quellcode ist **noch unverändert** und besitzt weiterhin den +15-%-Demo-AUTO-Exit. Zwei stündliche ChatGPT-Forschungsautomationen sind nicht gleich fünf verbundene Agenten; Verbindung und Quorum erst implementieren.
