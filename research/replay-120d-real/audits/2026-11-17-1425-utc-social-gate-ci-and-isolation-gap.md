# R29 historical blind replay — CI verification and isolation boundary

Recorded 2026-11-17 14:25 UTC. BACKTEST_ONLY. No live order or paper-ledger mutation.

## Independently checked GitHub evidence

- Branch: `codex/r29-chatgpt-github-paper-cycle-20261115`.
- Commit `f1e5601ba2046a1640d7f3214d9892378eb1767b` contains `.github/workflows/r29-blind-social-provenance-gate.yml`.
- GitHub Actions run [44097422835](https://github.com/127027/Sniperbot-/actions/runs/44097422835): `status=completed`, `conclusion=success`, created 2026-11-17T13:54:26Z, completed/updated 13:54:37Z, head SHA matches commit above.
- The workflow invokes `blind-neutral-social-provenance-wrapper-20261117.mjs` with Node 22. Its synthetic test rejects unverified historical social text and a future onchain event. The underlying `reddit-content-provenance-strict-gate-20261117.mjs` requires content edit history and independent capture attestation.

## Evidence limits / next proof unit

This is a synthetic safety CI success, NOT a verified historical Reddit content capture, NOT a proof that a separate GPT session received only sanitized input, and NOT a genuine 2026-09-18T01:20:00Z historical GPT scan. Source SHA format validation is not independent verification of source authenticity. The proof object for social text is supplied by a caller; its independent attestation must be established outside this module. The wrapper has no real historical market frame or authenticated detached model call.

Next: independently verify the original onchain provider-capture timestamps and SHA of a neutrally sampled 01:20 UTC market frame, and obtain independently attested pre-asof media snapshots if possible. Run the detached clean-context model ONLY on the sanitized payload, archive its decision before opening any later events, then audit historical bidirectional quotes and sellability. If any prerequisite fails, mark DATA_GAP and do not infer BUY/SELL fills.

Persistent simulated starting capital 5000 TEST-USDC (not a newly verified balance); historical executed PnL UNKNOWN. The prior 513 deterministic proxy scans are not GPT calls. No trade signals published.
