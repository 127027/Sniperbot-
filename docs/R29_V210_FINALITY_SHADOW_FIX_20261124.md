# R29 V2.10 – finality-shadow fix (24.11.2026)

Base: eb501ac6d7bc770f799c06b84f41804bf189b183, V2.9 baseline 61 research candidates, 24 software ticks, zero authenticated historical executable quotes, zero trades.

New defect: the latest event strictly before a tick may not yet satisfy the 60s finality rule. The previous last-by-mint map overwrote an earlier eligible event, then rejected the entire mint. Maintain independent finalized and observed cursors; choose the latest finalized event within 10 minutes, preserve the strict 60s cutoff, count fallback separately, and never resurrect stale or risk-rejected observations. Added three targeted regression tests. The V2.9 frozen artifacts and trade gates stay unchanged. This is a retrospective candidate-screening fix, not a claim of historical trading profitability or authentic October delivery.

A separate explicitly authorized source retest must compare all 24 hours against the unchanged V2.9 ledger, using the two original pinned parquet files. New results must be read from the actual new workflow artifact; no predicted counts or invented trades. The outstanding 50-USDC quote, historical pool/risk and GPT evidence gates remain open. Do not reuse old hardcoded 61-count integrated runner as proof of the new result. No live trading, no Windows or Dot modifications.
