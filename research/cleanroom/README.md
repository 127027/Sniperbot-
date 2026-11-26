# Cleanroom research resource discovery
This is an infrastructure catalog, not a strategy, coin list or trading recommendation. It is written by the project maintainer, not evidence of independent Dot work.
## Discover and validate
Inspect the current repository tree, workflow definitions, code and artifact schemas; this catalog is a starting point, not an exhaustive or permanent source list. Discover new files and external providers yourself. Verify commit, source time, schema, actual content and limitations. Never treat missing evidence in one intermediate artifact as absence throughout the system.
| Artifact | Purpose |
|---|---|
| market-latest.json | Raw bounded market discovery; incomplete coverage |
| evidence-latest.json | Intermediate asset identity and indicative EUR quote join; pool fields may be null |
| targeted-latest.json | Enriched downstream research evidence: targeted pools, source logs, risk provider fields, indicative quotes and alternative quotes where verified |
| watchdog-checkpoints.json | Measured collector runs, not AI research |
| WATCHDOG.md | Runtime and independent runner instructions |
| market-probe.mjs, evidence.mjs, targeted.mjs, watchdog.mjs | Actual implementation; inspect before proposing duplicate adapters |
## Evidence rules
These automatic artifacts are optional tools for independent research, not predefined rankings or BUYs. Never rely solely on the catalog or reuse manually generated shortlists as own decisions. A security field is not a safety certification; validate quote age and identity. If a downstream artifact is missing, stale or inconsistent, inspect the actual code, source logs and history; independently discover alternatives. Keep catalogs versioned as infrastructure evolves. Separate measured facts from assumptions. No live orders.

## Coverage and completion audit
The market probe currently samples only page 1 of a bounded source set. The intermediate evidence file now exposes `discovery.rows` with canonical, deduplicated raw leads and source provenance even if they are not joined to an existing market asset. These are automatically observed addresses, not verified memecoins or BUYs. The `not_joined` count measures the loss at this particular join, not the global market gap. Discover and evaluate more pages, networks, launchpads and other sources independently; respect provider rate limits and keep continuation state. Do not stop merely because ten candidates were listed; finish their concrete evidence checks or record each genuine blocker, alternatives attempted and final disposition. Save and read back your actual report before concluding. A successful collector, a generated shortlist and a completed Dot run are different outcomes.

## Persistent token register
`token-registry/index.json` summarizes cumulative observed contracts and links to two-hex-character SHA-256 shards under `token-registry/`. `token-registry.mjs` merges actual discovery observations and asset joins, preserves older identities through outages, rejects missing discovery input, and treats identical snapshot replays idempotently. It is automatically called by the watchdog and committed with its successful data checkpoint. No static coin lists, no synthetic market data, no BUY flags. Stored observations are historical, not executable quotes. This is a sharded JSON baseline, not yet a globally indexed launchpad/chain universe. The collector still has first-page and source restrictions; the Dot must measure coverage, discover alternatives, validate candidates and independently improve the method. Registry growth must be measured across different live snapshots, not inferred from fixtures.
