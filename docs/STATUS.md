# R29 Cleanroom acceptance checklist

## Stage A — Cleanroom technical build
- [x] New independent code tree, no old bot code imported
- [x] Paper-only engine and new 5,000 TEST-USDC ledger
- [x] 50 TEST-USDC per coin, risk checks and idempotency
- [x] SHA-pinned GitHub order files and receipt transport
- [x] Synthetic BUY/SELL in isolated in-memory demo
- [ ] Verified GitHub delivery on actual cleanroom branch
- [ ] Verified Windows machine installation and persistence
- [ ] Verified receipt returned and read by Dot 5
- [ ] Tests run from **exact remote checkout**

## Stage B — Dot research pipeline
- [ ] Inspect existing five Dot configuration and their actual available functions
- [ ] Assign roles and configure *new* cleanroom schedule independently from legacy jobs
- [ ] Prove adaptive 4/8/12/24 scan decisions really affect cleanroom schedule
- [ ] Prove independent timely public quotes for a prospective pool
- [ ] Prove full discovery-to-order-to-Windows chain
- [ ] Daily missed-opportunity and failure audit

## Stage C — Prospective productive-paper acceptance
- [ ] Genuine live Dot research selects coin
- [ ] Dot-4 BUY order reaches Windows, yields PAPER_FILLED
- [ ] Dot-4 or authorized policy SELL order reaches Windows, yields PAPER_FILLED
- [ ] Local paper ledger and public receipts reconcile
- [ ] Historical blind replay uses only time-appropriate data

No artificial fills count for stage C.
