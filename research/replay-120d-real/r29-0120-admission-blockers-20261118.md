# R29 01:20 UTC admission blockers — 2026-11-18

Scope: BACKTEST-ONLY; no GPT trade, wallet operation, live-paper pointer, paid API or historical outcome analysis. This is a technical audit, NOT an isolated model decision or a completed replay scan.

Target virtual timestamp: 2026-09-18T01:20:00Z. The historical model must receive only pre-admitted observations and previously eligible lessons, with a 5000 TEST-USDC starting ledger and only fill-proven positions.

## Direct code inspection (2026-11-18)
- `r29-trust-boundary-required.mjs` (blob a61e59872dabc258d26cb1f215173d889cfbec53): `verifyDetachedEvidence` accepts verifier callbacks passed by the caller. The callbacks can return arbitrary `verified:true` / `trustedVerifier:true` objects; there is no cryptographic binding to an external authority inside this module.
- `r29-forged-callback-adversarial-regression.mjs` (blob 5a5713df9e93199db6ce1b9bdc6288d18afa2cd3): explicitly constructs all three forged callbacks and expects admission. This is an expected vulnerability demonstration, not a passing trust-boundary security test.
- `r29-detached-frame-admission.mjs` (blob 9be65db036bfdcc67f8821472114c4d93a75f50f): structural validation consumes caller-supplied attestations and a model-isolation flag. A matching SHA-256 does not authenticate the party that supplied the bytes.

## Required independent evidence before declaring an isolated historical GPT decision
1. A detached runner whose executable, pinned verification keys and model invocation path cannot be supplied or modified by the untrusted frame/caller.
2. Signed source capture receipts with independent verification of source hash, historical capture timestamp and applicable key validity; unknown or unsigned claims fail closed. A receipt issued today cannot, by itself, prove availability in September.
3. Independently authenticated ledger snapshot and fill-chain, including portfolio state and no phantom positions.
4. An actual isolated GPT request/response receipt binding request hash, response hash, model identifier, invocation timestamp and virtual as-of; an assertion that isolation was performed is not evidence.
5. Append-only commit of the decision before any later outcome retrieval. Verify forward and reverse executable historical quotes and all costs before recording a simulated fill.

## Admission result
BLOCKED / UNKNOWN. No independently attested 01:20 input bundle, isolated GPT invocation receipt, or executable historical quote/fill has been established by this inspection. No BUY/HOLD/SELL/WATCH/NO_TRADE is claimed as an actual GPT strategy decision. No 60-day PnL is known.

## Verification limitations
The cited repository files were read via GitHub connector; their test scripts were not executed in this audit. This report is a contemporaneous diagnostic, not a historical source input, and MUST NOT be exposed to the historical strategy model.
