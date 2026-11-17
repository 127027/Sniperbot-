# R29 historical input trust-boundary audit — 2026-11-17 19:43 UTC

Status: BACKTEST_ONLY / DATA_GAP. This is a code-level verification, not a GPT trading decision or market scan. The actual review time is 2026-11-17 UTC; no historical model invocation is claimed.

## Reproducible source inspection

Repository: 127027/Sniperbot-
Branch: codex/r29-chatgpt-github-paper-cycle-20261115
Branch HEAD inspected: be7768185339cc30b2a9f2dd5ffb94a70cdedf5c
- `research/replay-120d-real/blind-neutral-market-gpt-input.mjs`, Git blob `63920fe20059d256e349162c3654a492608be2b7`
- `research/replay-120d-real/gpt-winner-blind-discovery-and-intent-20261117.mjs`, Git blob `71278038d3ce696e52ec23f9ee95930434ab2f83`
- `research/replay-120d-real/reviews/2026-11-17-first-five-minute-gpt-neutral-asof-decision-before-outcomes.json`, Git blob `4ea19150ffa1edb4f6712f98f04465b0bc92c447`

## Independently observable code-level gaps

1. `blind-neutral-market-gpt-input.mjs` checks the shape of `source_sha256` using a 64-character hexadecimal regex, but does not itself fetch the original source bytes and recompute that SHA. A syntactically valid hash does not establish original capture provenance. Independent byte verification is required upstream before a clean model call.
2. The same module checks `opened_fill_id` for a nonempty string but does not cross-verify the identifier against an immutable isolated test-ledger receipt. Therefore the model input gate alone cannot prove that a position was opened by a real historical PAPER_FILLED event.
3. `gpt-winner-blind-discovery-and-intent-20261117.mjs` explicitly returns `independent_clean_model_session_attested:false` and `actual_gpt_model_invocation_completed:false`. Its successful execution is not proof of a detached model call.
4. The first five-minute research review itself declares `independent_clean_context_proven:false` and `orders_verified_filled:0`. It cannot be promoted into a strict independent 60-day holdout performance observation.

## Next bounded work unit

For the next not-yet-archived virtual checkpoint, first persist a source-byte manifest (URL, original event capture time, exact source bytes SHA-256, verified time cutoff), then bind the isolated ledger's immutable PAPER_FILLED receipt hashes to positions, then submit only the sanitized payload to a fresh detached model session. Archive actual model output SHA and call time before reading later outcomes. If these checks are unavailable, record DATA_GAP/NO_TRADE rather than fabricating a trade.

No user winner names, later outcome lists, market rankings, or retrospective price movements are included here. No changes to strategy, live order pointers, risk limits, or paper balances. 60-day executable PnL: UNKNOWN.
