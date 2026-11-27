# R31 follow-up: coordinator transport, fairness and cadence — 2026-11-27

RESEARCH_ONLY / non_executable. All changes isolated to the development branch; no production deployment or activation of paused Dots.

## Verified changes

- `e5763dfc42160c1055fff15587dd93b89577542b`: coordinator pre-claims worker-specific leases atomically; remote Git state-ref compare-and-swap, pinned state readback and stale-writer rejection. CI [45964424673](https://github.com/127027/Sniperbot-/actions/runs/45964424673) passed. Five simulated workers, 40 assignments, 40 unique identities and tokens, replay idempotent. The remote was a separate disposable Git repository, NOT the actual GitHub production state or five independent Dots.
- `218c9c78d9514e910c22909ec8b736fd5578d6f3`: capacity reserved for interrupted, fresh and oldest backlog work; synthetic sustained-arrival test with 16 rounds passed. CI [45964504484](https://github.com/127027/Sniperbot-/actions/runs/45964504484) passed, adversarial audit [45964504487](https://github.com/127027/Sniperbot-/actions/runs/45964504487) 10/10, Paper-Runner passed. This measures fairness in fixtures, not real AI throughput.
- `2c53a090d2534b918224835fc531a32526f33971`: compact seven-day cycle ledger, 24h freshness/cadence gate with 15-minute max gap, explicit failed/stale/future samples. CI [45964610354](https://github.com/127027/Sniperbot-/actions/runs/45964610354): cadence fixture success, isolated collector in_progress at inspection. Does not retroactively reconstruct missing history.

## Actual runtime blockers

Main collector health last checked at snapshot 2026-11-27T01:08:06.494Z, run 45920764204. Only one observed scheduled Cleanroom market connectivity run in the returned recent main schedule history. All five R50/R53 Dot tasks are paused, as is the completed Cleanroom Dot 1 pilot. Existing independent research records lack new coordinator schema/scan/worker/lease bindings and cannot be retroactively accepted as new-format receipts. No verified continuous AI execution.

## Strict 20-item acceptance

1/20 fully accepted (isolated CI environment); 9 partial, 10 open under the original operational definition. Items 1, 2, 3, 11 and 12 gained isolated implementation/test evidence, but no operational promotion without real data and actual independent worker exchange. Item 11 now has an isolated implementation; operational status remains OPEN. Keep the original 20-item list as acceptance baseline. No profitability or market completeness claim.

Next gate: deploy only a dedicated non-executable worker protocol pilot, authorized state branch and pinned actual collector inputs; verify actual independent worker checkpoint/final readback, repeated interruption recovery and observed throughput. Then sustained collector cadence, expanded discovery, news linkage, position monitoring and actual paper test. Keep actual hourly report/decision outputs separate from fixtures.
