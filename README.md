# R29 Cleanroom — separate GitHub-only PAPER bot

**New code from scratch. PAPER ONLY. No legacy bot imports, wallets, transactions or existing ledger.** This special Git branch contains its own clean file tree; it is not a rewrite of the original `main` bot.

- Repo: `127027/Sniperbot-`
- Isolated branch: `codex/r29-cleanroom-paper-20261121`
- Windows: Node.js 20+ (standard library only, no packages to install)
- Fresh virtual ledger: **5,000 TEST-USDC**
- Exact BUY amount: **50 TEST-USDC** per coin
- All real-money functionality absent
- Previous 4,999.01 TEST-USDC and all legacy automation/workflows remain untouched

## The full delivery path

The five GPT Dots are responsible for research, candidate discovery, price/risk evidence, GPT strategy and signal publishing/auditing. See [their separate job specification](docs/DOT_ROLES.md).

1. Dot 4 decides BUY/SELL and Dot 5 publishes a new immutable `signals/orders/<id>.json` to this branch.
2. Dot 5 adds `{ "path": "signals/orders/<id>.json", "sha": "<exact Git blob SHA>" }` to `signals/index.json`.
3. Windows polls `signals/index.json` on this cleanroom branch only, checks SHA and local risk policies, then executes a **virtual** trade into its own local ledger.
4. Windows writes `receipts/<id>.json` through GitHub (or retries later if GitHub is unavailable). Only a true `PAPER_FILLED` receipt constitutes completed paper execution.

The `examples/order.sample.json` is deliberately expired and **not listed in the signal index**. The initial index has **zero orders**.

## Windows setup (requires user action)

1. Install Node.js 20+ and Git.
2. Clone this branch into a **brand-new folder**, not the old Sniperbot folder:
   `git clone --branch codex/r29-cleanroom-paper-20261121 --single-branch https://github.com/127027/Sniperbot-.git R29-CleanPaper`
3. `cd R29-CleanPaper`
4. Run `npm test` (eight tests) or `npm run demo` (fully offline synthetic BUY+SELL; no changes to GitHub or the real paper ledger).
5. Create a **fine-grained GitHub PAT**, repository scope `127027/Sniperbot-`, Contents **read/write**. The token is necessary to publish GitHub receipts and avoid anonymous rate limits. Keep it private.
6. In PowerShell start `./scripts/Start-CleanPaper.ps1` and enter that token in its hidden prompt. It sets PAPER mode and runs the cleanroom bot; stop the script to stop polling.

The new ledger is stored only at `%USERPROFILE%\\.r29-cleanpaper\\state.json` unless `R29_STATE_DIR` is explicitly specified. Do not use a legacy state directory.

## Technical protections

- No real trading code, API keys for exchanges or wallet functions; `LIVE` orders rejected.
- SHA-pinned immutable order contents and unique IDs prevent accidental double execution.
- Two pool-identical quote assertions from different named sources, <=90 seconds old, max 3% quoted price divergence.
- Quoted liquidity >=5,000 USD; order size <=1% of quoted liquidity; maximum 30 open positions.
- Fees modeled at 0.75%, 0.40% simulated spread, plus liquidity-dependent price impact.
- Logs and receipts distinguish `PAPER_FILLED`, `PAPER_REJECTED`, failed GitHub requests and pending publication.
- All fills are **paper model output**, never actual historical executable trades.

**Important limitation:** Windows does not obtain an independent market price outside GitHub. The Dots' source evidence is only self-attested and not a cryptographic proof. If web research/GitHub forwarding takes too long, a legitimately blocked trade is preferable to an invented fresh price.

## Status / what is still missing

The cleanroom bot and local offline test suite exist. The five scheduled GPT Dots are **not activated by this commit**. No real Dot-sourced order or successful Windows user-account `PAPER_FILLED` has been verified. Daily monitoring, adaptive timing, complete market coverage, live GitHub inbox/receipt testing and the 21-candidate look-ahead-free replay still need independent validation. The old bot and old schedules are not reconfigured.
