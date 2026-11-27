# R31 autonomy rebuild independent re-audit — 2026-11-27
RESEARCH_ONLY, non_executable. No live orders, trading signals, deployment or new worker activation. Development branch codex/r31-autonomy-recovery.
## Verified evidence
- Prior integration CI 45958734199, commit 29e2509008f26a729a21578cb39a61daa890086f: all seven offline test groups passed; isolated collector and queue ingestion passed. Prior run 45958538505: 5,631 queue contracts, 32 assignments, 5,599 pending; 73 fresh research quotes at its snapshot. These are isolated artifacts, not operational state.
- Main collector health blob af4be727c00ef1aada57879f3be5c562596518f9: snapshot 2026-11-27T01:08:06.494Z, run 45920764204; remains stale at 08:50 MEZ.
- New independent adversarial audit workflow commit de4a33c38cc265dd34684c7351dddf8c7b7c2885, CI run 45961446215, job 140379960375: 4 PASS / 4 FAIL, from actual logs.
## Original 20-item strict acceptance
1 PARTIAL early termination: state recovery exists, actual worker integration absent.
2 PARTIAL lost work: queue exists; assignment overlap and no-progress rotation fail.
3 PARTIAL stale data: isolated collector works; main still stale, 24h cadence unverified.
4 PASS isolated CI test environment (alternative to blocked local DNS).
5 OPEN discovery expansion.
6 PARTIAL new listing queue ingestion, timely real worker assessment unverified.
7 OPEN new networks.
8 PARTIAL exact chain/contract dedup validated; narrative mapping and live workers unverified.
9 OPEN news-to-contract mapping.
10 PARTIAL source fallback/validation, actual outage coverage unverified.
11 OPEN independent workers shared coordinator and handoff.
12 OPEN throughput benchmark and adequate capacity.
13 PARTIAL safety evidence validation, coverage unverified.
14 PARTIAL cost gate rejects unknowns; sourcing complete costs unverified.
15 OPEN continuous position monitoring.
16 OPEN dynamic exit strategy.
17 PARTIAL reopening on newer observations exists; no live monitoring integration.
18 OPEN durable historical time series.
19 OPEN verified 24h paper outcome.
20 OPEN autonomous tested repair lifecycle.
Summary: 1 accepted, 9 partial, 10 open; not a percentage of implementation effort.
## Adversarial acceptance, observed results
PASS duplicate contract dedup and distinct chains.
PASS expired lease restart and old-worker fencing.
PASS stale and wrong-contract BUY rejected.
PASS incomplete scan retains unresolved contracts.
FAIL parallel inboxes reserve distinct work before claim: two duplicate assignments out of two. Core claim fencing works, but selection ignores jobs reserved in an open scan. Implement atomic reservation/assignment under one coordinator, expiry, distinct worker packets; test concurrent creation and restart.
FAIL zero-claim failed scan rotation: same inbox repeated. Record assignment counts/last assigned and use bounded fair rotation with priority for fresh leads and previously interrupted work. Test repeat no-claim cycles and no starvation. Do not discard unfinished contracts.
FAIL candidate-only discovery with original timestamp and source, absent from registry and no pool: dropped. Ingest genuine identity-bound discovery evidence independently of pool existence; do not convert asset-level quotes into contract evidence. Test new support lead without pool; retain as research-only, not BUY.
FAIL nonexistent diagnosis path plus arbitrary SHA and readback_verified true accepted by reducer. This is a missing end-to-end trusted coordinator/diagnosis adapter, not proof of a bypass in deployed trading. Validate pinned Git blob, schema, scan id, completeness and actual readback before allowing closure. Test fake file/hash, wrong scan, valid pinned diagnosis.
## Next order
Fix the four gaps on development branch, run regression and adversarial audit until both pass; then durable single-writer coordinator with actual worker artifact exchange and repeated interruption test; then 24h collector service; only then add more workers and optimize discovery, paper execution and learning. A PASS here never certifies positive returns.
No runtime fixes were made in this audit; only new isolated tests and this record. Production main unchanged.
