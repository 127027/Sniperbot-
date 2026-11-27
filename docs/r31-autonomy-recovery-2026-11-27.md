# R31 autonomy recovery — verified repair checkpoint (2026-11-27)

Scope: development branch `codex/r31-autonomy-recovery`; RESEARCH_ONLY, non-executable. No production merge, wallet access or live order changes.

## Changes

- Assignments are reserved before worker claims; expired leases are recoverable and old owners are fenced.
- Assignment history rotates unclaimed work without dropping unfinished candidates.
- Contract-bound, timestamped discovery leads without pools are retained as research-only. Asset-only quotes are not treated as contract discovery evidence.
- Closing a scan requires actual committed Git bytes, a matching blob SHA, matching scan/revision/timestamps, and a diagnosis whose completion counts match queue history. The coordinator must still obtain the trusted checkout and pinned commit from the authorized GitHub branch; local object validation alone is not proof of remote publication.
- Integration workflow retains millisecond precision when reading fresh snapshots, without relaxing the future-data rejection gate.

## Verified CI

- Prior independent audit: 4/8; after first three fixes: 7/8, run [45962248451](https://github.com/127027/Sniperbot-/actions/runs/45962248451).
- Extended independent audit: **10/10**, run [45962448170](https://github.com/127027/Sniperbot-/actions/runs/45962448170), commit `de28364cb78ca4e0dfe07c7fa5ff3afe3530e2db`.
- Seven offline test groups and Paper-Runner tests passed on timestamp fix commit `88c847b5b27e14748309aef3566be1aecec51f46`.
- Isolated collector integration run [45962522273](https://github.com/127027/Sniperbot-/actions/runs/45962522273), last verified state: completed / success.

2026-11-27T08:02:10.5833189Z {"run":"45962522273","snapshot":"2026-11-27T08:02:10.279Z","fresh":84,"rows":288,"mode":"RESEARCH_ONLY","published":false}
2026-11-27T08:02:10.8583931Z {"queued":5630,"assigned":32,"remaining":5598,"snapshot":"2026-11-27T08:02:10.279Z","non_executable":true}

## Remaining gates

Real multi-worker coordination and persistence, sustained throughput and bounded backlog fairness under continuous arrivals, live evidence freshness, narrative/news-to-contract mapping, continuous position monitoring, dynamic exits, complete historical data and actual paper performance remain unverified. The isolated test suite does not establish 24/7 production operation or profitable trading. Next stage: integrate trusted worker handoff and demonstrate actual concurrent recovery and durable hourly outputs before considering production rollout.
