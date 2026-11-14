# R22: direct five-role historical model replay

R22 connects `createModelAdapter().invokeRole` directly to `runContinuousReplay`.
Four research calls run concurrently; QA receives their validated same-frame
decisions only after all four finish. A frame advances only after five genuine
responses validate and seal. Missing/invalid/auth-failed responses never become
abstentions, synthetic votes or successful frames. Internal empty validator
placeholders are not persisted or counted as agent responses.

Each HTTP attempt uses a new Node worker with an empty environment, one stateless
OpenAI Responses call, no tools, no conversation/previous-response ID and
`store:false`. The model has no filesystem, browser, wallet or account tools.
The worker is trusted application code, not an OS security sandbox for arbitrary
code. Separate calls on one model/account do not prove independent research or
five independently authenticated humans/Dots.

Only the current hash-checked chronological frame is serialized. Raw corpus,
future ticks, outcome labels, source audit and alias maps are never transmitted.
Visible candidate/event/token/pool/reference identifiers are replaced with opaque
stable IDs on the wire and restored before local validation. No future universe
information is needed to create these aliases. Natural language, dates and
pretraining can still reveal identities: **no certified blind result is claimed**.
The bundled PEPE dataset is explicitly KNOWN_WINNER and diagnostic only. R22's
explicit diagnostic opt-in does not weaken the default neutral-session gate or
the BLIND gate. It does not rewrite the existing 7/62 hourly-Dot session.

## Run and configure

Node 22+, no dependencies. Supply environment variables without committing them:

| Variable | Meaning |
|---|---|
| OPENAI_API_KEY | Dedicated API key, never a ChatGPT login/session credential |
| R22_MODEL | Available Responses model supporting strict JSON schema |
| R22_BUDGET_USD | Positive maximum conservative reservation for this invocation |
| R22_INPUT_USD_PER_MILLION | Operator-verified current input price for that model |
| R22_OUTPUT_USD_PER_MILLION | Operator-verified current output price |
| R22_PUBLIC_DATA_APPROVED | `1` after checking input contains only approved public research |
| R22_MAX_OUTPUT_TOKENS | Optional 128–8192; default 2048 |
| R22_TIMEOUT_MS | Optional 10–120000; default 45000 per attempt |
| R22_RETRIES | Optional 0–2; default 1 |

`node research/replay-controller/r22-run.mjs`

Optional positional arguments: dataset JSON, report filename, maximum frames
(default 62). Every invocation creates a fresh isolated session; it never reuses
old unauthenticated role files. A full acceptance requires COMPLETE plus exactly
five distinct provider response IDs per dataset frame (310 for 62 frames).
Exit code 2 means blocked/partial, not passed. Inspect `r22-result.json`.
For a new budgeted invocation, review the prior report first: budgets do not span
separate invocations. No automatic restart or unlimited retry loop exists.

The cost ledger reserves before each concurrent attempt, uses conservative UTF-8
byte count plus overhead for input and the output token cap, and never refunds
ambiguous failed attempts. Reservations are written before network calls. Actual
usage is separately estimated with the supplied prices. This is not an invoice
or a provider-enforced account spending cap; incorrect tariffs undermine the USD
estimate. Configure provider project limits separately. Only HTTP 429/500/502/503/
504 retry with bounded delay. Auth, transport ambiguity, timeout, refusal, invalid
JSON, unknown evidence and truncated output fail closed. The worker is terminated
on deadline/cancellation; provider processing/billing may outlive cancellation.

GitHub workflow `R22 real model acceptance` runs on relevant adapter pushes to
this branch and manual dispatch. In environment `r22-research`, configure secret
`R22_OPENAI_API_KEY` and the five required `R22_*` variables above (model, budget,
input/output prices, public-data approval). No secret is embedded in code or
reports. Missing configuration fails visibly and uploads a BLOCKED report.
The offline CI runs separately on Linux and Windows with mock transport clearly
labelled; passing it is not evidence of real inference. Reports are retained for
7 days. Raw frames and model votes stay in ignored local directories.

`store:false` is not a promise of zero provider retention; abuse-monitoring and
account data controls still apply. Only public approved historical data may be
sent. No private portfolio, credentials, user documents or wallet data belongs
in an intake file. Source bodies are untrusted evidence, never instructions.

## Historical multi-coin intake and gaps

`node research/replay-controller/r22-intake.mjs audit DATASET OUTPUT.json`

`node research/replay-controller/r22-intake.mjs intake CORPUS OUTPUT.private.json`

Intake wraps the existing strict `asof_corpus.v1` compiler and returns dataset,
private source audit, and per-candidate/per-kind coverage. Keep intake output
outside public artifacts: it contains original provenance references. Hash,
publication/capture and ledger/block-state checks still apply. The compiler
cannot independently verify operator-provided attestations or fetch missing data.
Use the returned `dataset` as the runner input, not the entire intake envelope.

Checked-in `reports/r22-source-audit.json`: 62 ticks, one selected candidate,
31 POOL events, **0 MARKET / 0 SOCIAL / 0 SECURITY**. This is not a neutral
multi-coin cohort. Required acquisitions remain:

* A time-selected complete launch cohort including failures, not a winner list;
  document chain, block/time bounds, inclusion policy and missing providers.
* Historical pool reserves, fees/gas and independently verified executable
  quotes at decision and later fill times. A daily price or ATH is insufficient.
* Original contemporaneously captured posts, authors/interaction observations,
  capture hashes and publication/capture times; later retrieval is not as-of proof.
* Historical contract/LP/security state and sellability at the relevant blocks.
* Independent provenance/coverage review, alias/narrative leakage review and
  separate held-out evaluation labels. The 81-case calendar is only a plan.

Missing evidence stays missing; zero trades is not a profitability result.
No provider subscription, archive credentials or new source data was fabricated.

## Validation evidence

Local Windows Node 24: baseline `node runner/test.mjs` and
`node --test runner/integration.test.mjs` passed. Adapter tests use mocked HTTP;
they check fanout, QA ordering, time/label isolation, masking roundtrip, budget,
retry/auth, cancellation, invalid output and intake gaps. Existing replay tests
cover immutable frames/seals, barrier recovery, temporal provenance and fills.
The real entry point was executed and returned `MODEL_AUTH_MISSING`; **real
310-response full acceptance remains blocked** until configured and successful.
No existing paper-account or wallet state was opened or changed.

API contract reviewed against official documentation:
[Responses create](https://developers.openai.com/api/reference/resources/responses/methods/create),
[data controls](https://developers.openai.com/api/docs/guides/your-data).
