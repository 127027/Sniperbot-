# Codex / Agent Instructions – Meme Sniper AI

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
- `Windows_Starten.bat` for Windows users

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