# R25 – Multi-chain memecoin discovery: evidence first, decisions before outcome

Status 2026-11-14, TRAINING_ONLY / PAPER_ONLY. User authorized continued research, not live trading.

## Scope and label firewall

The user's **private** file \`meme_coins_2013_2026_historische_datenbank(7).xlsx\`
is evaluator data only. It has 89 historical chronology rows, 281 broad current
category rows, and only 13 exact launch-day records. Many launches have year
or month precision only; there are no consistently validated contract addresses.
It is NOT a complete list of all launches, and a present-day category listing
is not contemporaneous evidence. Never load it, filenames, winner names,
later ATHs or outcomes into historical role inputs. Never commit private
evaluator labels into this PUBLIC GitHub repository.

The known-winner R20 62-day PEPE diagnosis remains **DIAGNOSTIC_ONLY**.
Its latest confirmed R20 monitor was frame 9/62, 0 trades, lacking complete
data; a completed blank-frame vote is not evidence of training.
The actual neutral blindtest remains not started.

## New division of responsibilities

- **Scout**: neutral candidate universe across all new launches/pools of
  each available chain and era, including failures. Per batch: source
  coverage, contract identities, launch timestamp, deduplication and what
  could have been known at the simulated cutoff. Never prioritize a known
  ticker or coin from the target list.
- **Social**: historical meme propagation, independent authors,
  virality velocity and media catalysts. Each publication timestamp must
  be supported by contemporaneous immutable capture evidence. Retrospective
  posts or headlines are NOT as-of verified.
- **Onchain**: multi-block liquidity, buy/sell flow, unique counterparties,
  price/volume momentum, creator concentration, fees, executable prices.
  Use pool/contract state at or before the simulated cutoff; remove
  creator/holder stats derived from later snapshots.
- **Security**: verify as-of sellability, mint rights, blacklist, admin,
  holder concentration, LP withdrawal and contract changes. Missing
  historical security evidence remains UNKNOWN; any confirmed
  sellability failure blocks the hypothetical purchase.
- **QA**: challenge hypotheses, aggregate available independent role
  research, publish timestamp-sealed *WOULD_BUY / WOULD_SELL / WATCH /
  REJECT* recommendations with candidate_id, sources, confidence caveat
  and proposed paper stake. Only QA may later produce executable
  hypothetical orders for the isolated R22 engine after all five valid
  frame-bound votes and fresh, historical market/security proof.

An R25 \`BUY_INTENT\` is a specific, reviewable proposal but **not a filled
trade**, and a heuristic score must never be presented as an empirically
calibrated probability. Actual model fills use the separate
constant-product next-tick R22 engine with liquidity participation,
slippage, gas, fees and next-tick security controls. No fabricated orders.

## How to avoid the old idle-hour trap

1. Source acquisition and chronological labeling are independent from the
   R20 single-day five-vote barrier. Workers should research batches of
   dated source records in parallel, not repeatedly inspect empty frames.
2. The current target period is March 14 – May 14, 2023 on Ethereum,
   but the source retrieval must be neutral: all relevant pool creations,
   not a PEPE contract lookup. The original R23 free RPC probes failed
   (HTTP 429 on Blockscout; RPC error 4444 on PublicNode).
3. R25 probes a retrospective Uniswap V2 Factory CSV instead.
   The file is not automatically a complete as-of-attested cohort; audit
   its timestamp coverage and verify against original chain history.
4. R24's Solana June 2026 corpus contains 50 real launch candidates
   across ten days, but NOT 50 independently confirmed memecoins and
   not yet historical BUY/SELL fills. 2026-06-18 is an explicit data gap.
5. A missing-source day is DATA_GAP, not a negative signal.
   No five verbose role acknowledgments are needed for each such day.
6. During research, role ownership is isolated: each role may write its
   own unique new \`research/r25/roles/<role>/<UTC>-<run_id>.json\` only.
   Readbacks must verify content and commit. No changing another role's
   judgment, old votes, target labels or account state.

### Candidate research record contract (not a verified R22 event)

Each unique role-authored record should include:

\`\`\`json
{
  "schema": "r25_role_research.v1",
  "role": "scout",
  "run_id": "nonempty-unique",
  "research_window": {
    "start": "2023-03-14T00:00:00Z",
    "end": "2023-05-14T23:59:59Z"
  },
  "asof_cutoff": "2023-04-15T00:00:00Z",
  "data_status": "OBSERVED",
  "reviewed_candidate_ids": [],
  "evidence": [],
  "unknowns": [],
  "proposed_shadow_intents": [],
  "historical_blind_success": false,
  "wallet_or_paper_account_actions": 0
}
\`\`\`

For any evidence provide \`event_at\`, \`available_at\`,
\`source_uri\`, \`content_sha256\`, \`candidate_id\`, \`kind\`, and
\`verified\` (default false); evidence with \`available_at > asof_cutoff\`
is prohibited. Historical launch identity alone is NOT market liquidity,
social proof, security clearance or a BUY opportunity.
No retroactive external search may be used to assert archived content was
known at its original publication date.

## R25 shadow decision baseline and acceptance

\`r25-shadow-intents.mjs\` produces BUY_INTENT/SELL_INTENT/WATCH/REJECT
from a signed-off, time-locked replay input. A BUY_INTENT requires
independently evidenced recent pool, market and security observations,
a minimum heuristic score and social propagation or rising onchain quote.
Risk scores are hypotheses, not probabilities. All are blocked from actual
order execution, the wallet, the runner, and paper-account mutation.
Synthetic tests show that it CAN express hypothetical buy/sell/reject
decisions; they do not establish any historically executed purchase.

### Independent evaluation after all role decisions are sealed

Privately join sealed candidate identities to the user's original
89-row chronology. Matching ticker alone is not sufficient; require
chain plus contract or historical chain-specific identity and qualified
launch window. Year-only labels cannot support day-level false negatives.
Evaluate detection recall and discovery latency, false positives, entries,
exits, unexecutable exits, opportunity cost, fees/slippage, drawdown and
risk; compare by era, chain, market condition and training/holdout period.
The external 281-row category snapshot is a discovery taxonomy, not a
validated 281-case pass/fail ground truth. No time-travel labels in model
inputs. The blindtest remains a stricter separate gate.

## Monitoring

The repository default branch already has \`r21-replay-watch.yml\` with
a 15-minute cron for read-only diagnostics. GitHub scheduled workflow runs
can be delayed or skipped and are not continuous real-time observability;
no guarantee of an exact wall-clock 15-minute interval.
Add source data and shadow intent blockage checks there; never
auto-fabricate agent votes. ChatGPT task automations can run hourly,
not every 15 minutes. No new paid model/API subscriptions.

Progress milestones: (A) neutral source batch >0 with timestamps,
(B) independent as-of proof, (C) actual 5-role candidate analyses,
(D) timestamp-sealed BUY_INTENT / SELL_INTENT, (E) verified R22 paper
order and next-tick fill, (F) hidden-label evaluation. Publish only
confirmed counts at each stage. Do not call stages A–D executed trades.
