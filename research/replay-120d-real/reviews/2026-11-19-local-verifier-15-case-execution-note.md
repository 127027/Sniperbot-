# R29 verifier local execution note — 2026-11-19

Mode: BACKTEST-ONLY. No orders, wallets, paid APIs, or model invocations.

Read from GitHub branch `codex/r29-chatgpt-github-paper-cycle-20261115`:
- `r29-pinned-ed25519-receipt-verifier.mjs` (blob SHA `db4603e1418e3389a8a40def0e7c28c7e4b54e03`)
- `r29-actual-verifier-integration-regression-20261119.mjs` (blob SHA `00a01fc4123f7cf48a5699436710989116b09873`)

GitHub was inaccessible to the local shell via DNS. The fetched source text was manually transferred into local temporary files and executed with `node` (not a GitHub Actions execution). Console output:

```
PASS actual verifier: 1 synthetic positive + 14 negative cases. Not evidence of historical provenance, trusted custody, GPT calls, quotes, fills or PnL.
```

This verifies only the transferred source's synthetic cryptographic consistency tests. No independent source attestation, pinned external key custody, actual GPT invocation, 2026-09-18T01:20:00Z blind scan, DEX quote, fill, or 60-day PnL was established. Historical scan remains BLOCKED/UNKNOWN. This document is a posthoc execution note and MUST NOT be supplied to historical model inputs.
