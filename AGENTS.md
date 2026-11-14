> **Bindende aktuelle Ziel-/Testbeschreibung V0.7 – 10.11.2026:** [Strikter historischer 5-Fall/225-Tage-Blindreplay und Ergebnisbericht](docs/HISTORICAL_BLIND_FIVE_CASES_20261110.md). **Die aktuell gültige Kapitalregel ist V0.6: bevorzugter Einzeltrade / harter GESAMTBUDGET-Deckel für die Cost-Basis offener Positionen, Einzelkauf ab 50 Test-USDC** – ältere im Dokument erwähnte „per-trade min/max“-Regeln sind überholt. Historische Gewinner, spätere ATHs oder Original-Artikel, die erst später im Web zurückgefunden wurden, dürfen nicht als historischer as-of-Input genutzt werden. Aktuelle fünf Cloud-Forschungs-Dots bleiben stündliche Recherche-Automationen, keine damals historischen oder lokal ausführenden Trader. Neuer `runner/research-news-rss.mjs` und `research-news-journal.mjs` archivieren zukünftige öffentliche Meldungen erstmals beim tatsächlichen lokalen Abruf; an die Dots nur nicht handelbare `news_leads[]` senden. Niemals ohne nachgewiesene unabhängige Contract-/LP-/Quote-/signierte Rollenfreigabe externe Paper-BUY/SELL erzeugen. Keep `main`, Hixton, private `.local` und privates Paper-Guthaben unverändert.

> **Aktueller technischer Stand V0.5 (09.11.2026):** [Neue-Memecoin-Discovery und Forschungslernen](docs/V05_DISCOVERY_LEARNING_STATUS_20261109.md), [Kapitalstrategie](docs/STRATEGIC_PAPER_CAPITAL_V1.md). Die **einzige reguläre** Windows-Startdatei ist `Sniperbot_Starten.bat` (ältere Windows_Starten-Dateien entfernt). Alle fünf Cloud-Automationen tauschen nur `actionable:false`-Forschungsdateien über GitHub aus. Erweiterte bis zu 96 Poolidentitäten pro Scan, lokale zeitlich gestaffelte Nachbeobachtung und indikative 2x–200x-Studie sind implementiert. **Es gibt weiterhin keinen freigegebenen Realmarkt-Paper-BUY/SELL aus Cloud-Dots oder kalibrierte 95%-Prognose.** Keine stillen Realdaten-/Handelsgates umgehen.\n\n# Codex / Agent Instructions – Meme Sniper AI

## Scope
Independent Windows-first LOCAL **PAPER TRADING** application; NOT Hixton. Do not import, modify, or depend on any Hixton repository, dot, scheduled automation, files, strategies, data, credentials, or deployments.

## Hard safety boundaries
- Never place live orders, sign blockchain transactions, store wallet private keys, connect payment systems or solicit actual EUR in the local app.
- Never replace simulated EUR or simulated USDC with labels implying real deposits or money. All balances must remain explicitly virtual until a separately approved, regulated integration is designed.
- On bot OFF: block entries; continue monitoring and optional sell/exit logic for already-open paper positions.
- All live market inputs are untrusted; no purported certainty/guaranteed profit; contract risk is UNVERIFIED unless separate on-chain/independent checks exist.
- Dashboard served only over 127.0.0.1, with origin and schema validation. No open CORS, remote admin, credentials, or telemetry.
- For changes, add tests, document limitations, and keep the no-dependency local runner operable on Windows with Node.js 22+.

## Run and test
- `node runner/test.mjs`
- `node runner/server.mjs` then open `http://127.0.0.1:3030`
- `Sniperbot_Starten.bat` for Windows users

## Architecture
- `runner/core.mjs`: server-side paper ledger, entries, virtual fiat conversions, exits and guards.
- `runner/market.mjs`: public READ-ONLY API adapters, four network discovery, pair lookup and pricing.
- `runner/server.mjs`: localhost HTTP API and periodic polling, independent of dashboard.
- `runner/dashboard.html`: minimal self-contained frontend; reads API and posts explicitly validated commands.
- `docs/ROADMAP.md`: blockers to live operation.

## Product goal and multi-agent architecture
The project owner wants a Windows-first autonomous Memecoin discovery + long-hold paper trading bot: multiple fresh coin candidates may appear over weeks/months, each may be allocated an independently risk-approved amount within a configurable range (such as 50–50 or 200–400 test-USDC), and exits must be managed without constant user action. A 50 to 5,000 outcome is an **extreme hypothetical aspiration**, not a guaranteed or probable return.

The final agent setup is **1..N agents**, not just two Dots. Distinct roles include Coin Discovery, On-chain, News, Social, Scam/Rug, Liquidity, QA, Decision and Position Management. Every agent emits a versioned, cited recommendation to a central, independent controller. Multiplicity of agents does not override hard risk vetoes; direct ChatGPT Dot-to-local communication does NOT exist yet. See `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/AGENT_PROTOCOL.md`, `docs/CODEX_TASKS.md`.

## Required Codex workflow
Start with P0 in `docs/CODEX_TASKS.md`. Run `Windows_Tests.bat` or `node runner/test.mjs && node --test runner/integration.test.mjs`; inspect `docs/KNOWN_ISSUES.md` before claiming any feature complete. If making UI or server changes, preserve the dependency-free local runner and explicit PAPER labels. Treat all uncertain market data as stale/unknown rather than safe. Each change must specify tests performed and remaining risks. Separate small PRs are preferred.

## Important TODO for Codex
1. Independent contract safety (Solana authorities/extensions; EVM honeypot / sell simulation), holder clustering, LP ownership, scam data, wash trade detection and source timestamp validation.
2. Correct incomplete or unavailable real-provider fields and unit tests with recorded schema fixtures; **never fake market-data success**.
3. Replace simplistic indicative paper fills with pool-aware executable quote and latency/slippage model.
4. Improve recoverability: reconnect/backfill, persistent audit events, Windows service/scheduled-task opt-in and Windows Defender-friendly packaging.
5. Real EUR/PayPal on/off-ramp requires separately approved licensed provider, KYC, funds segregation, legal review, authenticated wallet flows; no direct local DIY custody/payment endpoint.
6. External AI scout and local engine have NO connected message bus yet; do not claim integration until implemented and tested.

## CODEx-LAPTOP-UEBERGABE 2026-11-06

**Codex hat die technische Eigentümerrolle für Installation, Code-Review, Debugging, Windows-Laptop-Akzeptanztests und Wartung. Forschungs-Dots sind KEINE Coding-/Deployment-Agenten und können den Windows-PC nicht selbst kontrollieren.** Codex darf nicht behaupten, auf dem Laptop getestet zu haben, solange keine echte Codex-Work-Session / lokale Codex-Ausführungsumgebung mit Zugriff auf diesen Rechner verbunden wurde. Eigentümer führt notwendige lokale Schritte aus, sofern kein autorisierter Computerzugriff besteht.

Priorität P0: Repository vollständig auschecken, Windows 11 frisch installieren/starten, Node 22+ prüfen, alle Tests und Browser-Flows (50 virtuelle EUR -> simulierte Umrechnung -> Paper-Kauf -> HOLD -> Bot AUS -> Exit AUTO oder manuell -> Neustart/Recovery) nachvollziehbar belegen. Vor dem Betreten eines Echtgeldmodus erneut explizite Freigabe einholen.

**Multi-Dot-Ziel:** skalierbare 1..N Forschungsagenten, idealerweise alle verfügbaren, aber Kontolimit/Automationsfrequenz beachten. Dots/Agenten für Discovery, News, Social, Wallet, On-chain, LP, Scam, Marktdynamik, unabhängige Risiko-QA. Agenten sollen erst Evidenz austauschen und divergierende Urteile festhalten, bevor eine strukturierte Empfehlung an einen lokalen Gateway geht. Der lokale Controller führt unabhängige technische Validierung, Liquiditäts-/Sellability-Gate und Portfolio-Limits aus. Ein bloßes Agenten-Quorum ist niemals ein Beweis für Qualität; zusätzliche, voneinander unabhängige Datenbelege sind Pflicht. Auch 'JETZT KAUFEN' ist nur eine Empfehlung, keine Order-Freigabe.

**Status:** Kein funktionierender Dot-zu-Desktop-Kanal, kein nachgewiesenes Dot-Quorum, keine Echteinzahlung, keine echte Wallet-/Orderausführung, kein autonomes Echtzeit-Trading vorhanden. Diese Systeme müssen erst implementiert und sicher getestet werden.

## Product-owner strategy override (2026-11-06): five-agent, high-upside research model

**Binding design specification:** [docs/STRATEGY_5_AGENT_BIG_MOVES.md](docs/STRATEGY_5_AGENT_BIG_MOVES.md). Codex must implement and validate this *in stages*. This documentation update does **not** change code or enable real orders.

- Five mandatory **logical review roles** initially: News/Early Discovery, Social Acceleration, On-Chain/Liquidity, Contract/Rug Security, Independent Opportunity/QA. Registry still scales 1..N. Every role reviews the same chain+token+pool, cites time-bounded independent evidence and exchanges contradictions. Initial desired automatic paper-entry quorum = 5/5 current YES **and** separate hard risk/exit-liquidity checks. VETO, NO, ABSTAIN, stale/missing data => no automatic entry. Similar or correlated reports are not independent evidence.
- Real ChatGPT Dots are currently **not interconnected** with the local runner. Hourly research automations cannot act as second-level WebSocket trading agents. Build a persistently running, authenticated gateway using synthetic agent events before claiming integration.
- Dynamic position sizing: a user-defined min/max (e.g. 50–1000 TEST-USDC), selected amount may be 0 (no trade) or inside the range, bounded by available capital, risk budget, portfolio exposure, pool depth, route, fees and slippage. No '100% confident' or guaranteed 100× return.
- **Exit change:** `runner/core.mjs` currently defaults to `takeProfit:15`; the legacy AUTO mode closes at +15%. That must NOT remain the target default Sniper exit. Investigate and test adaptive trend/trailing/liquidity/risk/timeout exits, multiple positions and persistent monitoring; explicitly preserve and label legacy/demo behavior until replacement is tested. Do **not** claim the code is already updated.
- Entry OFF leaves existing active exit monitoring running; intentional HOLD versus AUTO must remain explicit. If feeds or laptop fail, do not report a successful sale. Keep all features PAPER-only, Hixton out of scope, no real money/wallet/payment work.


## Owner clarification: per-coin sizing (06.11.2026)

User min/max are per new coin purchase, not total capital and not a position-count
limit. Equal bounds mean exactly that amount for each eligible new coin. Remove
maxPositions, maxExposure and perPositionCap, including persisted legacy fields.
Repeated distinct coins may use available funds until exhausted. Independent
technical contract/sellability gates still apply. No calibrated profit probability
may be inferred from a model rating. This overrides earlier portfolio-cap guidance.

## Binding owner clarification – 2026-11-07: multi-device, isolated-user fleet

**Read before coding:** [docs/DISTRIBUTED_INSTANCES.md](docs/DISTRIBUTED_INSTANCES.md), [docs/SIGNAL_DISTRIBUTION_PROTOCOL.md](docs/SIGNAL_DISTRIBUTION_PROTOCOL.md), [docs/HOLD_EXIT_POLICY.md](docs/HOLD_EXIT_POLICY.md), [docs/IMPLEMENTATION_STATUS_2026-11-07.md).

- Exactly one common five-role *research production policy* initially, 1..N possible research workers. The owner's GitHub account hosts **source and docs**, not 24/7 live signal delivery. Do not confuse five logical gateway roles with five connected ChatGPT Dots.
- Distributed clients: independently installable Windows/other-device instances with separate owner identity, per-user storage, funds, private keys (future only), local settings, paper holdings, tax/export history and trading decisions. Friends must not share a seed, instance identity, local credential registry, portfolio database or wallet with the owner.
- Central service can broadcast only authenticated research and exit **advisories** (with TTL, provenance, signatures, retry/dedupe). It must not read or modify client balances, keys, positions or config, nor submit remote buy/sell/deposit/withdraw commands. Clients independently revalidate all safety and budget checks; opt-in/opt-out, revocation and tenant isolation required.
- Device independence means one machine being offline cannot stop another's research intake/own exit engine. Host availability is not guaranteed by a mobile web page; mobile should initially control only the authenticated owner's bot. Android autonomous host needs separate engineering/testing.
- Position sizing example 50..200 TEST-USDC is PER CLIENT and PER ENTRY, not a shared pot: with only 50 free, at most 50 can be entered if costs/risk allow; with 200 free, multiple independently reviewed positions may consume 50+50+100. Open mark-to-market profit is **not** available cash until realized.
- Historical win-rate/holding period figures from a prior chat are not verified evidence; research HOLD review windows (24h/7/14/30/90 days) are **hypotheses for backtests**, not compulsory sell timers.
- No payment, wallet or real-order integration without another explicit approval; currently PAPER-only, fail closed for external tokens without validators. Do not modify Hixton, any of its Dots, automations or repositories.


## Owner override – central decisions and local capital (07.11.2026)

Latest user instruction supersedes older requirements for a second local research/quorum decision. Central Dots perform research and decide PAPER_BUY/PAPER_SELL; local clients verify technical validity and manage their own capital, no local AI research. Per-entry user min/max has no fixed200 cap. Score80→minimum,92+→maximum, bounded by free funds and technical quote capacity; under80 or under minimum→no purchase. Scores are uncalibrated ratings. See docs/CENTRAL_PAPER_IMPLEMENTATION.md for implemented vs blocked components. User authorized Paper setup with1000 Test-USDC and two-hour monitoring, not live trading. Do not treat pending GPT infrastructure as implemented.
