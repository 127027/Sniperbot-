# Five GPT Dots: responsibilities and cleanroom contract

**Planned roles — not activated by merely committing these files.**

These are existing ChatGPT research/decision responsibilities to map onto the cleanroom design; they are not five more Windows programs or a second bot.

1. **Dot 1 / Tempo:** Inspect public market activity and select 4, 8, 12 or 24 full GPT reviews/day. A 4->24 jump is allowed immediately. Missing data is **not** a quiet market. The existing legacy automations must never be repointed by accident.
2. **Dot 2 / Discovery:** Find as many new, older and revived pools as free sources allow across supported chains. Record chain, token contract, unique pool ID, earliest detection and discovery gaps; no guarantee of all coins.
3. **Dot 3 / Risk and quotes:** Check identity, contract risks, liquidity, and availability of at least two genuinely independent quote sources (not two pages backed by one backend). Record timestamps; no invented prices.
4. **Dot 4 / Strategy:** Prioritize existing positions, then evaluate new candidates. Decide BUY, WATCH, HOLD, SELL, NO_TRADE with reasons. First scan may BUY; several buys are permitted. Only Dot 4 authorizes speculative entry orders.
5. **Dot 5 / Delivery and audit:** Publish an immutable `signals/orders/<id>.json`, obtain the actual returned Git blob SHA, append the precise `{path,sha}` to `signals/index.json` on cleanroom branch and inspect `receipts/<id>.json` after Windows has polled.

## Order transfer is GitHub only

The Windows bot polls exactly `codex/r29-cleanroom-paper-20261121` of `127027/Sniperbot-`, validates the immutable blob SHA, and writes receipts to that same branch using its own fine-grained GitHub Contents read/write token. Never store a token in repository files or message bodies.

Dot 4's `authority` and the `dots` array are declared fields and are **not cryptographically signed agent identities**. Authorization relies on who can commit to the cleanroom branch. No live exchange or wallet endpoint exists.

## Price limitation

Paper trades require two recent independently sourced quotes matched to the *same chain, contract and pool*, no more than 90 seconds old. The **Dots assert those observations**, while Windows checks formatting, freshness, consistency and liquidity. Windows does not independently fetch market prices, because the user's bot communication constraint is GitHub-only.

Consequently this remains a fail-closed proof-of-concept for source-supplied paper prices; a real-time independent market-data verification layer is not yet present. Authenticated GitHub polling and research overhead can cause valid orders to expire. Never weaken price rules merely to manufacture fills.

## Audit and replay

Track discovered > identified > security-checked > GPT-reviewed > order-published > Windows-received > PAPER_FILLED/PAPER_REJECTED. Every day report all missing, stale, rejected and not-reviewed pools; genuine position risk and missed signals. Use 20–21 November 2026's 21 historical winners/losers only as a **post-decision comparison**, not preselected trades. No future prices in historical trade decisions.
