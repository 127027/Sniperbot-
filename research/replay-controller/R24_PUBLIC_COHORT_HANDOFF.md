# R24 – Evidence-based 50-launch historical research checkpoint

Status: 2026-11-14, TRAINING_ONLY / RESEARCH_ONLY, no real money, no paper-account changes, no model inference.

## What was actually completed

- On branch codex/dots-pepe-replay-20261113, the R24 source adapter was created:
  research/replay-controller/r24-public-launch-cohort.py
- A CI workflow obtained the public historical \`tokens.parquet\` export for
  Slinky21/Pumpfun_Memecoin_Corpus and passed an actual (not mock) 50-candidate check:
  https://github.com/127027/Sniperbot-/actions/runs/43630477474
- Output artifact (retention 14 days):
  https://github.com/127027/Sniperbot-/actions/runs/43630477474/artifacts/14127807641
- Source SHA-256:
  c005d86d424013e5c78701161b025f3d8c3d472afb61466e0ad6fd5afe9e8ea6
- Selection: earliest 6 eligible new launch records per UTC day across 2026-06-12
  through 2026-06-21, capped at 50; 50 distinct candidate mints and no
  future outcome fields exposed to the candidate selection.
- Daily raw candidate row counts:
  2026-06-12 27906; 06-13 22040; 06-14 25333; 06-15 28514;
  06-16 30575; 06-17 14989; 06-18 0; 06-19 7023;
  06-20 17997; 06-21 11015.
- June 18 is a SOURCE GAP until proven otherwise; do not treat as a quiet day.
- Confirmed historical memecoin classifications: **0**.
- Historical executable BUY/SELL signals: **0**.
- Real or simulated trades supported by this result: **0**.

## R24 data restrictions: never allow future knowledge

This is an exploratory, retrospective, third-party export, NOT independently
attested as contemporaneously available at its claimed timestamps. It is
unsuitable as a verified R22 blind-test input without independent timestamp
checks and neutral cohort coverage checks.

The source publishes known data defects; consult
https://huggingface.co/datasets/Slinky21/Pumpfun_Memecoin_Corpus/blob/main/KNOWN_ISSUES.md
before deriving price, holders, graduation, volume, or returns. In particular,
exclude anomalous trade amounts, null prices, bad curve percentages, stale wallet
stats, and the 2026-07-03 collection outage. Do NOT import
\`graduated_at\`, \`postgard_outcomes\`, peak price, ATH, or later labels into
research actors' public frames. Metadata captured only retrospectively must
remain unverified.

## Next useful engineering steps (not yet completed)

1. Preserve the R24 GitHub Actions artifact and source hash. Independently
   validate each token's launch time against the contemporaneous Solana ledger;
   classify meme relevance using launch-time evidence, not later price success.
2. Build a **separate hidden outcome evaluator** from the same fixed source
   snapshot, with future prices and labels accessible ONLY AFTER
   timestamp-sealed role decisions. Do not use future outcomes as a selection
   filter.
3. Obtain timestamp-valid historical SOCIAL, MARKET, and SECURITY evidence.
   If an as-of price, quote, liquidity depth, or sellability check is missing,
   the correct result is UNKNOWN / NO_FILL, never a fabricated trade.
4. Group research tasks by dated source batches rather than having five agents
   review empty R20 diagnostic frames every hour. A missing-source day becomes
   DATA_GAP. The R20 diagnostic can remain isolated as regression evidence.
5. The five existing ChatGPT automation prompts must be updated separately:
   GitHub documentation alone does not update them. Automation service was
   unavailable to this chat; therefore **no claim of updated schedules**.
6. Split development/holdout windows before evaluating strategies. Report
   missed opportunities, false positives, net paper results, drawdown,
   trading frictions, and unexecutable exits separately.

R24 demonstrates the first real 50-source candidate intake; it does not
demonstrate 50 verified memecoins, independent agent inference, a passing
blind test, or profitable trades.
