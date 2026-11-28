# SNIPERBOT_STATUS — latest check / 28 Nov 2026
Read docs/SNIPERBOT_MASTER.md first. This file is operational state, not another objective. Update after each verified controller check. Do not reuse stale observations as current.

## Baseline at consolidation (~08:46 MEZ)
- Master f9e9be6495d6b42dd4ecb454ae75d49422055ed2; previous task configuration archived e923b485b552b02a06ee4c678e1add651ec035a2. All four active task prompts replaced and confirmed by peek to reference master. No new task, no deletion. Existing schedules unchanged.
- Market last 08:00:37–08:00:50 MEZ, run 880ba1d6-2048-8330-b285-287acd58c60d: 29 observations, 8 watch, 0 BUY, no saved checkpoint. Discovery 08:13:12–08:14:02, ed645bc3-81e0-8321-9bac-4d8842d221e2: 28 identities saved, 16 additional; handoff unverified. Controller 08:40:35–08:40:49, 2bd1b822-930c-8332-8278-5e02bf58be7a: no repair or saved journal, stale collector claim. Audit 08:05, 0dbc11c3-22ec-832b-bc4c-305fc1c24c54: 0/12 complete hours, 0 confirmed paper buys, partial historical verification.
- Last collector snapshot 07:23:02Z, 78 quotes, cadence unverified (6 gaps >15min). No active collector in latest Actions list; created recovery trigger 8b208db185b616234c5f77c3624f6158563dbf1f, readback blob 773646f2525aae666f141d8f664a918b978cd6bb. Actual new run/snapshot not yet verified at time of writing.
- Broad run 46120635889 completed success (17min); new pool live test 46121636317 still in progress at check. Do not trigger duplicate broad while running. Tests 46121636353/46121636329 passed. Paper control, Android build/device smoke 46120542926/46120542940/46120542913 passed, installed app and live hourly handoff unverified. Feed last observed sequence 8, blob 84be36eca36f5cb340d89b80c65fb67e2db931d1, no assertion of BUY.
- Key patches and old audit references in MASTER. No real orders, production, ledger resets.

## Next check (must be live)
1. Fetch actual collector status on cleanroom-collector-r31-pilot-v1 and Actions runs. Verify recovery trigger run and fresh snapshot; if >15min stale and no running collector, diagnose and retrigger.
2. Fetch four active automation details: actual run IDs, start/end, outcome and saved evidence. Compare with baseline above, not merely status. Verify prompt references MASTER. Check new 09:00 slot actual report and paper feed time/sequence/action counts, no stale replay.
3. Read latest support and main reports, compare exact IDs and source receipts; broad new-pool result actual counts and source errors; no fixture as live. Check fresh entry/exit rationale, ranked top10 or explicit shortfall.
4. Patch first reproducible P0, test, store immutable hourly-control journal and update this file. No claims of autonomy until 24h/7d cadence and actual paper handoff.
5. Manual restart requests/results recorded separately below or in dated journal; never count inline chat run as autonomous.
