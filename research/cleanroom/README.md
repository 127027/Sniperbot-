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
